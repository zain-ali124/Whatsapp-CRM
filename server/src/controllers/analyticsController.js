const mongoose = require('mongoose');
const Lead     = require('../models/Lead');
const Message  = require('../models/Message');
const Agent    = require('../models/Agent');
const Activity = require('../models/Activity');

const toId = (id) => new mongoose.Types.ObjectId(id);

// ─── GET /api/analytics/dashboard ────────────────────────────
// Owner  → full business stats
// Agent  → only their assigned leads stats
exports.getDashboardStats = async (req, res) => {
  try {
    const { leadFilter, businessId } = req.scope;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalLeads, hotLeads, closedToday, followUpsDue, newToday] = await Promise.all([
      Lead.countDocuments(leadFilter),
      Lead.countDocuments({ ...leadFilter, leadScore: { $gte: 70 } }),
      Lead.countDocuments({ ...leadFilter, status: 'closed', updatedAt: { $gte: todayStart } }),
      Lead.countDocuments({ ...leadFilter, reminderAt: { $gte: todayStart, $lte: new Date() } }),
      Lead.countDocuments({ ...leadFilter, createdAt: { $gte: todayStart } }),
    ]);

    // Pipeline (owner gets full breakdown, agent gets their own)
    const [newLeads, contacted, interested, closed, lost] = await Promise.all([
      Lead.countDocuments({ ...leadFilter, status: 'new' }),
      Lead.countDocuments({ ...leadFilter, status: 'contacted' }),
      Lead.countDocuments({ ...leadFilter, status: 'interested' }),
      Lead.countDocuments({ ...leadFilter, status: 'closed' }),
      Lead.countDocuments({ ...leadFilter, status: 'lost' }),
    ]);

    // Recent activity — owner sees all, agent sees their leads only
    const activityFilter = req.scope.isAgent
      ? { userId: businessId }   // activity model doesn't have assignedTo, show all for now
      : { userId: businessId };

    const recentActivity = await Activity.find(activityFilter)
      .sort({ createdAt: -1 }).limit(10).lean();

    res.json({
      totalLeads, hotLeads, closedToday, followUpsDue, newToday,
      leadsChange: null, hotChange: null, closedChange: null, followUpChange: null,
      pipeline: { new: newLeads, contacted, interested, closed, lost },
      recentActivity,
    });
  } catch (err) {
    console.error('getDashboardStats error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/analytics/sources ──────────────────────────────
exports.getSourceStats = async (req, res) => {
  try {
    const { leadFilter } = req.scope;

    const matchStage = {};
    Object.entries(leadFilter).forEach(([k, v]) => {
      matchStage[k] = typeof v === 'string' ? toId(v) : v;
    });
    // userId must be ObjectId for aggregation
    if (typeof matchStage.userId === 'string') matchStage.userId = toId(matchStage.userId);
    if (matchStage.assignedTo) matchStage.assignedTo = toId(matchStage.assignedTo.toString());

    const sources = await Lead.aggregate([
      { $match: matchStage },
      { $group: { _id: '$source', count: { $sum: 1 } } },
      { $sort:  { count: -1 } },
    ]);

    res.json({ sources });
  } catch (err) {
    console.error('getSourceStats error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/analytics/agents ───────────────────────────────
// Owner → all agents' performance
// Agent → only their own stats
exports.getAgentPerformance = async (req, res) => {
  try {
    const { businessId, isAgent, agentId } = req.scope;

    // Agent only sees themselves
    const agentFilter = isAgent
      ? { userId: businessId, _id: agentId }
      : { userId: businessId };

    const agentList = await Agent.find(agentFilter).select('-password').lean();

    const agents = await Promise.all(
      agentList.map(async (agent) => {
        const [totalLeads, closedLeads] = await Promise.all([
          Lead.countDocuments({ userId: businessId, assignedTo: agent._id }),
          Lead.countDocuments({ userId: businessId, assignedTo: agent._id, status: 'closed' }),
        ]);

        const conversionRate = totalLeads > 0 ? closedLeads / totalLeads : 0;

        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        const msgAgg = await Message.aggregate([
          { $match: { userId: toId(businessId), sentBy: agent._id, createdAt: { $gte: sevenDaysAgo } } },
          { $group: { _id: { $dayOfYear: '$createdAt' }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ]);

        const weeklyActivity = Array.from({ length: 7 }, (_, i) => {
          const d   = new Date(sevenDaysAgo.getTime() + i * 86_400_000);
          const doy = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 86_400_000);
          return msgAgg.find(x => x._id === doy)?.count || 0;
        });

        return {
          agentId: agent._id, name: agent.name, email: agent.email,
          isOnline: agent.isOnline || false,
          totalLeads, closedLeads, conversionRate, weeklyActivity,
        };
      })
    );

    res.json({ agents });
  } catch (err) {
    console.error('getAgentPerformance error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/analytics/funnel ────────────────────────────────
exports.getConversionFunnel = async (req, res) => {
  try {
    const { leadFilter } = req.scope;
    const total = await Lead.countDocuments(leadFilter);

    const stages = [
      { stage: 'New Leads',  statuses: ['new','contacted','interested','closed','lost'] },
      { stage: 'Contacted',  statuses: ['contacted','interested','closed'] },
      { stage: 'Interested', statuses: ['interested','closed'] },
      { stage: 'Closed Won', statuses: ['closed'] },
    ];

    const funnel = await Promise.all(
      stages.map(async ({ stage, statuses }) => {
        const count      = await Lead.countDocuments({ ...leadFilter, status: { $in: statuses } });
        const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
        return { stage, count, percentage };
      })
    );

    res.json({ funnel });
  } catch (err) {
    console.error('getConversionFunnel error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── GET /api/analytics/leads-over-time?days=7 ───────────────
exports.getLeadsOverTime = async (req, res) => {
  try {
    const { leadFilter } = req.scope;
    const days  = Math.min(parseInt(req.query.days, 10) || 7, 90);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build aggregation match — convert string ids to ObjectId
    const matchBase = {};
    if (leadFilter.userId)     matchBase.userId     = toId(leadFilter.userId.toString());
    if (leadFilter.assignedTo) matchBase.assignedTo = toId(leadFilter.assignedTo.toString());

    const [incoming, closedAgg] = await Promise.all([
      Lead.aggregate([
        { $match: { ...matchBase, createdAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
      Lead.aggregate([
        { $match: { ...matchBase, status: 'closed', updatedAt: { $gte: since } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$updatedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    const data = Array.from({ length: days }, (_, i) => {
      const date   = new Date(since.getTime() + i * 86_400_000).toISOString().split('T')[0];
      return {
        date,
        leads:  incoming.find(x => x._id === date)?.count  || 0,
        closed: closedAgg.find(x => x._id === date)?.count || 0,
      };
    });

    res.json({ data });
  } catch (err) {
    console.error('getLeadsOverTime error:', err);
    res.status(500).json({ message: err.message });
  }
};