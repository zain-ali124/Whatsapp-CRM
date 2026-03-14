const mongoose = require('mongoose');
const Agent    = require('../models/Agent');
const Lead     = require('../models/Lead');
const Message  = require('../models/Message');
const crypto   = require('crypto');

const toId = (id) => new mongoose.Types.ObjectId(id);

// ─── Helper: enrich one agent with live stats ─────────────────
async function enrichAgent(agent, userId) {
  const agentId = agent._id;

  const [totalLeads, closedLeads] = await Promise.all([
    Lead.countDocuments({ userId, $or: [{ assignedTo: agentId }, { assignedAgent: agentId }] }),
    Lead.countDocuments({ userId, $or: [{ assignedTo: agentId }, { assignedAgent: agentId }], status: 'closed' }),
  ]);

  const conversionRate = totalLeads > 0 ? closedLeads / totalLeads : 0;

  // 7-day message activity sparkline
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const msgAgg = await Message.aggregate([
    { $match: { userId: toId(userId), sentBy: agentId, createdAt: { $gte: sevenDaysAgo } } },
    { $group: { _id: { $dayOfYear: '$createdAt' }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
    const d   = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
    const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86_400_000);
    return msgAgg.find(x => x._id === doy)?.count || 0;
  });

  return {
    _id:          agent._id,
    name:         agent.name,
    email:        agent.email,
    role:         agent.role,
    isOnline:     agent.isOnline || false,
    totalLeads,
    closedLeads,
    conversionRate,
    weeklyActivity,
    createdAt:    agent.createdAt,
  };
}

// ─── GET /api/agents ──────────────────────────────────────────
exports.getAgents = async (req, res) => {
  try {
    const agentList = await Agent.find({ userId: req.user.id }).select('-password').lean();
    const agents    = await Promise.all(agentList.map(a => enrichAgent(a, req.user.id)));
    res.json({ agents });
  } catch (err) {
    console.error('getAgents error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/agents/:id ──────────────────────────────────────
exports.getAgent = async (req, res) => {
  try {
    const agent = await Agent.findOne({ _id: req.params.id, userId: req.user.id }).select('-password').lean();
    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    const enriched = await enrichAgent(agent, req.user.id);
    res.json({ agent: enriched });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/agents/invite ──────────────────────────────────
// Invite modal sends: { name, email, role }
// We auto-generate a temporary password and return it so admin can share it
exports.inviteAgent = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    // Prevent duplicate email within same business
    const existing = await Agent.findOne({ email: email.toLowerCase(), userId: req.user.id });
    if (existing) {
      return res.status(400).json({ message: 'An agent with this email already exists' });
    }

    // Generate a readable temp password: e.g. "Temp@4f2a"
    const tempPassword = 'Temp@' + crypto.randomBytes(3).toString('hex');

    const agent = await Agent.create({
      userId:   req.user.id,
      name:     name.trim(),
      email:    email.toLowerCase().trim(),
      password: tempPassword,
      role:     role || 'agent',
    });

    res.status(201).json({
      agent: {
        _id:   agent._id,
        name:  agent.name,
        email: agent.email,
        role:  agent.role,
      },
      tempPassword,    // ← frontend shows this to admin so they can share it
      message: `Agent ${agent.name} added. Share their temp password: ${tempPassword}`,
    });
  } catch (err) {
    console.error('inviteAgent error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/agents (direct create with password) ──────────
exports.createAgent = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    const existing = await Agent.findOne({ email: email.toLowerCase(), userId: req.user.id });
    if (existing) return res.status(400).json({ message: 'Agent with this email already exists' });

    const agent = await Agent.create({
      userId: req.user.id,
      name:   name.trim(),
      email:  email.toLowerCase().trim(),
      password,
      role:   role || 'agent',
    });

    res.status(201).json({
      agent: { _id: agent._id, name: agent.name, email: agent.email, role: agent.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/agents/:id ────────────────────────────────────
exports.updateAgent = async (req, res) => {
  try {
    const { name, role } = req.body;
    const agent = await Agent.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { ...(name && { name }), ...(role && { role }) },
      { new: true }
    ).select('-password');

    if (!agent) return res.status(404).json({ message: 'Agent not found' });
    res.json({ agent });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/agents/:id ───────────────────────────────────
exports.deleteAgent = async (req, res) => {
  try {
    const agent = await Agent.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    // Unassign leads
    await Lead.updateMany(
      { $or: [{ assignedTo: req.params.id }, { assignedAgent: req.params.id }] },
      { $unset: { assignedTo: '', assignedAgent: '' } }
    );

    res.json({ message: 'Agent removed successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// ─── POST /api/agents/login ───────────────────────────────────
// Agent-specific login. Returns a JWT with type:'agent' + ownerId.
exports.loginAgent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find agent by email (across all businesses — email should be globally unique or scope per business)
    const agent = await require('../models/Agent')
      .findOne({ email: email.toLowerCase().trim() })
      .select('+password');

    if (!agent) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const bcrypt = require('bcryptjs');
    const match  = await bcrypt.compare(password, agent.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const jwt   = require('jsonwebtoken');
    const token = jwt.sign(
      {
        id:      agent._id,
        type:    'agent',        // ← tells middleware this is an agent token
        ownerId: agent.userId,   // ← the business owner's _id
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      token,
      user: {
        id:      agent._id,
        name:    agent.name,
        email:   agent.email,
        role:    agent.role,
        type:    'agent',
        ownerId: agent.userId,
      },
    });
  } catch (err) {
    console.error('loginAgent error:', err);
    res.status(500).json({ message: err.message });
  }
};