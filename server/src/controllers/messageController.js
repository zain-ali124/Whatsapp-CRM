const Lead    = require('../models/Lead');
const Message = require('../models/Message');
const { sendTextMessage } = require('../services/whatsappService');

/**
 * Safely get scope — works with both new auth.js (req.scope)
 * and old auth.js (req.user only). Prevents crash if auth.js
 * hasn't been updated yet.
 */
function getScope(req) {
  if (req.scope) return req.scope;
  const userId = req.user?.id || req.user?._id?.toString();
  return { businessId: userId, isAgent: false, agentId: null, leadFilter: { userId } };
}

// ─── GET /api/messages/:leadId ─────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { leadFilter, businessId } = getScope(req);
    const { leadId } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 50;

    const lead = await Lead.findOne({ ...leadFilter, _id: leadId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const [messages, total] = await Promise.all([
      Message.find({ leadId, userId: businessId })
        .sort({ timestamp: 1, createdAt: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Message.countDocuments({ leadId, userId: businessId }),
    ]);

    await Lead.findByIdAndUpdate(leadId, { unreadCount: 0 });

    res.json({ messages, total, page, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('getMessages error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/messages/send ───────────────────────────────────
exports.sendMessage = async (req, res) => {
  try {
    const { leadFilter, businessId } = getScope(req);
    const { leadId, body, type = 'text' } = req.body;

    if (!leadId || !body) {
      return res.status(400).json({ message: 'leadId and body are required' });
    }

    const lead = await Lead.findOne({ ...leadFilter, _id: leadId });
    if (!lead) {
      return res.status(404).json({ message: 'Lead not found or not assigned to you' });
    }

    const User = require('../models/User');
    const user = await User.findById(businessId);

    let waMessageId = null;
    let status = 'sent';

    try {
      const metaResponse = await sendTextMessage(lead.phone, body, user);
      waMessageId = metaResponse?.messages?.[0]?.id || null;
    } catch (metaErr) {
      console.error('Meta API failed (saving anyway):', metaErr.message);
      status = 'failed';
    }

    // ✅ CRITICAL FIX: only include waMessageId in the doc when it has a real
    // value. The Message model has { unique: true, sparse: true } on this field.
    // Passing null explicitly causes a duplicate key error after the first message.
    const msgDoc = {
      userId:    businessId,
      leadId:    lead._id,
      direction: 'outbound',
      type,
      body,
      status,
      timestamp: new Date(),
      sentBy:    req.user?.id || null,
    };
    if (waMessageId) msgDoc.waMessageId = waMessageId;

    const message = await Message.create(msgDoc);

    await Lead.findByIdAndUpdate(leadId, {
      lastMessage:   body.slice(0, 100),
      lastMessageAt: new Date(),
      ...(lead.status === 'new' && { status: 'contacted' }),
    });

    const io = req.app.get('io');
    io?.to(`user_${businessId}`).emit('message_sent', {
      leadId:    lead._id.toString(),
      messageId: message._id.toString(),
      body, status,
      timestamp: new Date().toISOString(),
      direction: 'outbound',
    });

    res.status(201).json({ message, waMessageId, status });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: err.message });
  }
};