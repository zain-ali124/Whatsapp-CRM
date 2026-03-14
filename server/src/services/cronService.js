const cron = require('node-cron');
const Lead = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');

// ─── Helper: Calculate Lead Score ────────────────────────────────
const calculateLeadScore = async (lead) => {
  let score = 0;

  // Check messages in last 24 hours
  const recentMessages = await Message.countDocuments({
    leadId:    lead._id,
    direction: 'inbound',
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  });

  if (recentMessages > 3) score += 30;
  else if (recentMessages > 0) score += 15;

  // Check buying keywords in messages
  const allMessages = await Message.find({
    leadId:    lead._id,
    direction: 'inbound'
  }).select('body').limit(20);

  const buyingKeywords = [
    'price', 'buy', 'visit', 'confirm', 'interested',
    'book', 'payment', 'deal', 'qeemat', 'lena',
    'purchase', 'order', 'ready', 'proceed'
  ];

  const hasKeyword = allMessages.some(m =>
    buyingKeywords.some(k => m.body?.toLowerCase().includes(k))
  );

  if (hasKeyword) score += 25;

  // Status bonus
  if (lead.status === 'interested') score += 15;
  if (lead.status === 'contacted')  score += 5;

  // Inactivity penalty
  if (lead.lastMessageAt) {
    const daysSince = (Date.now() - lead.lastMessageAt) / (1000 * 60 * 60 * 24);
    if (daysSince > 7) score -= 40;
    else if (daysSince > 3) score -= 20;
  }

  // Keep score between 0 and 100
  return Math.max(0, Math.min(100, score));
};

// ─── Helper: Get Score Label ─────────────────────────────────────
exports.getScoreLabel = (score) => {
  if (score >= 70) return '🔥 Hot';
  if (score >= 40) return '🟡 Warm';
  return '❄️ Cold';
};

// ─── Job 1: Check Reminders (configurable schedule; default every minute) ─────
const startReminderJob = (io) => {
  const schedule = process.env.REMINDER_CRON || '*/1 * * * *';
  cron.schedule(schedule, async () => {
    try {
      const now = new Date();

      const leads = await Lead.find({
        reminderAt: { $lte: now, $ne: null }
      }).populate('userId').populate('assignedTo');

      for (const lead of leads) {
        // Notify dashboard via socket
        if (io && lead.userId) {
          io.to(`user_${lead.userId._id}`).emit('reminder_due', {
            leadId:   lead._id,
            leadName: lead.name,
            phone:    lead.phone,
            message:  `Follow up reminder for ${lead.name} (${lead.phone})`
          });
        }

        // Clear the reminder
        await Lead.findByIdAndUpdate(lead._id, { reminderAt: null });

        console.log(`🔔 Reminder fired for lead: ${lead.name}`);
      }

    } catch (err) {
      console.error('❌ Reminder job error:', err.message);
    }
  });

  console.log(`✅ Reminder cron job started (schedule: ${process.env.REMINDER_CRON || '*/1 * * * *'})`);
};

// ─── Job 2: Recalculate Lead Scores Every 30 Minutes ─────────────
const startScoringJob = () => {
  cron.schedule('*/30 * * * *', async () => {
    try {
      const leads = await Lead.find({
        status: { $nin: ['closed', 'lost'] }
      });

      for (const lead of leads) {
        const score = await calculateLeadScore(lead);
        await Lead.findByIdAndUpdate(lead._id, { leadScore: score });
      }

      console.log(`✅ Lead scores updated for ${leads.length} leads`);

    } catch (err) {
      console.error('❌ Scoring job error:', err.message);
    }
  });

  console.log('✅ Scoring cron job started');
};

// ─── Job 3: Detect Inactive Leads Every Day at 9AM ───────────────
const startInactiveLeadsJob = (io) => {
  cron.schedule('0 9 * * *', async () => {
    try {
      const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      const inactiveLeads = await Lead.find({
        lastMessageAt: { $lt: twoDaysAgo },
        status: { $in: ['new', 'contacted', 'interested'] }
      }).populate('userId');

      for (const lead of inactiveLeads) {
        // Notify dashboard
        if (io && lead.userId) {
          io.to(`user_${lead.userId._id}`).emit('lead_inactive', {
            leadId:   lead._id,
            leadName: lead.name,
            phone:    lead.phone,
            message:  `${lead.name} has been inactive for 2+ days`
          });
        }

        // Log activity
        await Activity.create({
          leadId:      lead._id,
          type:        'status_changed',
          description: `Lead marked inactive — no message for 2+ days`
        });
      }

      console.log(`✅ Inactive leads check done — ${inactiveLeads.length} found`);

    } catch (err) {
      console.error('❌ Inactive leads job error:', err.message);
    }
  });

  console.log('✅ Inactive leads cron job started');
};

// ─── Start All Jobs ───────────────────────────────────────────────
exports.startAllCronJobs = (io) => {
  startReminderJob(io);
  startScoringJob();
  startInactiveLeadsJob(io);
};