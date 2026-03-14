const mongoose = require('mongoose');
const Lead     = require('../models/Lead');
const Activity = require('../models/Activity');

// ─── GET /api/leads ───────────────────────────────────────────
exports.getLeads = async (req, res) => {
  try {
    const { leadFilter } = req.scope;
    const { page = 1, limit = 10, status, search, source, agentId } = req.query;

    const filter = { ...leadFilter };
    if (status)  filter.status = status;
    if (source)  filter.source = source;
    // agentId filter only for owner (agent always gets their own via leadFilter)
    if (agentId && !req.scope.isAgent) filter.assignedTo = agentId;
    if (search) {
      filter.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [leads, total] = await Promise.all([
      Lead.find(filter)
        .sort({ lastMessageAt: -1, createdAt: -1 })
        .skip(skip).limit(parseInt(limit))
        .populate('assignedTo', 'name email')
        .lean(),
      Lead.countDocuments(filter),
    ]);

    res.json({ leads, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) {
    console.error('getLeads:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/leads/:id ───────────────────────────────────────
exports.getLead = async (req, res) => {
  try {
    const { leadFilter } = req.scope;
    const lead = await Lead.findOne({ ...leadFilter, _id: req.params.id })
      .populate('assignedTo', 'name email role');
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/leads ──────────────────────────────────────────
exports.createLead = async (req, res) => {
  try {
    const { businessId, agentId } = req.scope;
    const { name, phone, email, source, notes, status } = req.body;
    if (!name || !phone) return res.status(400).json({ message: 'Name and phone are required' });

    const lead = await Lead.create({
      userId:     businessId,
      name, phone, email, source,
      status:     status || 'new',
      assignedTo: agentId || null,
    });

    if (notes) {
      await Lead.findByIdAndUpdate(lead._id, { $push: { notes: { text: notes } } });
    }

    await Activity.create({
      userId: businessId, leadId: lead._id,
      type: 'created', description: `Lead ${lead.name} added manually`,
    });

    res.status(201).json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/leads/:id ─────────────────────────────────────
exports.updateLead = async (req, res) => {
  try {
    const { leadFilter, businessId } = req.scope;

    // Normalize incoming fields:
    // - if frontend sends `assignedAgent`, map it to `assignedTo`.
    // - if frontend sends a single note string in `notes`, push it into the notes array.
    const { notes, assignedAgent, ...otherFields } = req.body || {};

    const updateOps = {};
    if (Object.keys(otherFields).length) updateOps.$set = { ...otherFields };
    if (assignedAgent !== undefined) {
      updateOps.$set = { ...(updateOps.$set || {}), assignedTo: assignedAgent || null };
    }
    if (notes && typeof notes === 'string') {
      updateOps.$push = { notes: { text: notes, agentId: req.scope.agentId || null } };
    }

    // If no valid update operations provided, return bad request
    if (!updateOps.$set && !updateOps.$push) {
      return res.status(400).json({ message: 'No valid fields to update' });
    }

    const lead = await Lead.findOneAndUpdate(
      { ...leadFilter, _id: req.params.id },
      updateOps,
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    // Log status change to activity
    if (req.body.status) {
      await Activity.create({
        userId: businessId, leadId: lead._id,
        type: 'status_changed',
        description: `Status changed to ${req.body.status}`,
        metadata: { newStatus: req.body.status },
      });
    }

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/leads/:id/assign ─────────────────────────────
// Assign a single lead to an agent (owner only)
exports.assignLead = async (req, res) => {
  try {
    const { businessId } = req.scope;
    const { agentId } = req.body;

    const lead = await Lead.findOneAndUpdate(
      { _id: req.params.id, userId: businessId },
      { assignedTo: agentId || null },
      { new: true }
    ).populate('assignedTo', 'name email');

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await Activity.create({
      userId: businessId, leadId: lead._id,
      type: 'assigned',
      description: lead.assignedTo
        ? `Assigned to ${lead.assignedTo.name}`
        : 'Unassigned from agent',
      metadata: { agentId },
    });

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── PATCH /api/leads/:id/reminder ───────────────────────────
// Set or clear a reminder on a lead
exports.setReminder = async (req, res) => {
  try {
    const { leadFilter, businessId } = req.scope;
    const { reminderAt } = req.body;   // ISO date string or null to clear

    const lead = await Lead.findOneAndUpdate(
      { ...leadFilter, _id: req.params.id },
      { reminderAt: reminderAt ? new Date(reminderAt) : null },
      { new: true }
    );

    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    await Activity.create({
      userId: businessId, leadId: lead._id,
      type: 'reminder_set',
      description: reminderAt
        ? `Reminder set for ${new Date(reminderAt).toLocaleString()}`
        : 'Reminder cleared',
      metadata: { reminderAt },
    });

    res.json({ lead });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── DELETE /api/leads/:id ────────────────────────────────────
exports.deleteLead = async (req, res) => {
  try {
    const { businessId } = req.scope;
    const lead = await Lead.findOneAndDelete({ _id: req.params.id, userId: businessId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });
    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/leads/bulk-assign ─────────────────────────────
exports.bulkAssign = async (req, res) => {
  try {
    const { businessId } = req.scope;
    const { leadIds, agentId } = req.body;
    if (!leadIds?.length || !agentId) {
      return res.status(400).json({ message: 'leadIds and agentId required' });
    }
    const result = await Lead.updateMany(
      { _id: { $in: leadIds }, userId: businessId },
      { assignedTo: agentId }
    );
    res.json({ updated: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};