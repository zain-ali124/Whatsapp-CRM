const Agent = require('../models/Agent');
const Lead = require('../models/Lead');
const Activity = require('../models/Activity');

exports.autoAssign = async (lead, userId) => {
  try {
    // Find agent with least assigned leads for this business
    const agent = await Agent.findOne({ userId, role: 'agent' })
      .sort({ assignedLeadsCount: 1 });

    // No agents yet — skip assignment
    if (!agent) return;

    // Assign lead to this agent
    await Lead.findByIdAndUpdate(lead._id, {
      assignedTo: agent._id
    });

    // Increment agent's lead count
    await Agent.findByIdAndUpdate(agent._id, {
      $inc: { assignedLeadsCount: 1 }
    });

    // Log activity
    await Activity.create({
      leadId: lead._id,
      type: 'assigned',
      description: `Auto assigned to ${agent.name}`
    });

  } catch (err) {
    console.error('❌ Auto assign error:', err.message);
  }
};