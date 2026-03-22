const Lead    = require('../models/Lead');
const Message = require('../models/Message');
const { sendTextMessage, sendAudioMessage, uploadMedia } = require('../services/whatsappService');

function resolveScope(req) {
  if (req.scope) return req.scope;
  const userId = req.user?.id || req.user?._id?.toString();
  return { businessId: userId, isAgent: false, agentId: null, leadFilter: { userId } };
}

// ─── GET /api/messages/:leadId ─────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { leadFilter, businessId } = resolveScope(req);
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
    const { leadFilter, businessId } = resolveScope(req);
    const { leadId, body, type = 'text' } = req.body;

    if (!leadId || !body) {
      return res.status(400).json({ message: 'leadId and body are required' });
    }

    const lead = await Lead.findOne({ ...leadFilter, _id: leadId });
    if (!lead) return res.status(404).json({ message: 'Lead not found or not assigned to you' });

    const User = require('../models/User');
    const user = await User.findById(businessId);

    let waMessageId = null;
    let status = 'sent';

    try {
      const metaResponse = await sendTextMessage(lead.phone, body, user);
      waMessageId = metaResponse?.messages?.[0]?.id || null;
      console.log(`✅ Message sent to ${lead.phone} | waId: ${waMessageId}`);
    } catch (metaErr) {
      console.error('Meta API failed (saving anyway):', metaErr.message);
      status = 'failed';
    }

    const msgDoc = {
      userId: businessId, leadId: lead._id,
      direction: 'outbound', type, body, status,
      timestamp: new Date(), sentBy: req.user.id,
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
      leadId: lead._id.toString(), messageId: message._id.toString(),
      body, status, timestamp: new Date().toISOString(), direction: 'outbound',
    });

    res.status(201).json({ message, waMessageId, status });
  } catch (err) {
    console.error('sendMessage error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ─── POST /api/messages/send-audio ────────────────────────────
// Accepts multipart/form-data with: leadId + audio file
exports.sendAudio = async (req, res) => {
  try {
    const { leadFilter, businessId } = resolveScope(req);
    const { leadId } = req.body;

    if (!leadId) return res.status(400).json({ message: 'leadId is required' });
    if (!req.file) return res.status(400).json({ message: 'Audio file is required' });

    const lead = await Lead.findOne({ ...leadFilter, _id: leadId });
    if (!lead) return res.status(404).json({ message: 'Lead not found' });

    const User = require('../models/User');
    const user = await User.findById(businessId);

    let waMessageId = null;
    let status = 'sent';
    let mediaId = null;

    try {
      // Step 1: Upload audio buffer to Meta
      mediaId = await uploadMedia(
        req.file.buffer,
        req.file.mimetype,
        req.file.originalname || 'voice.ogg',
        user
      );
      console.log(`✅ Audio uploaded to Meta | mediaId: ${mediaId}`);

      // Step 2: Send audio message using media_id
      const metaResponse = await sendAudioMessage(lead.phone, mediaId, user);
      waMessageId = metaResponse?.messages?.[0]?.id || null;
      console.log(`✅ Audio message sent | waId: ${waMessageId}`);
    } catch (metaErr) {
      console.error('Meta audio send failed:', metaErr.message);
      status = 'failed';
    }

    // Save message — store the audio as base64 data URL for playback in CRM
    const audioDataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

    const msgDoc = {
      userId:    businessId,
      leadId:    lead._id,
      direction: 'outbound',
      type:      'audio',
      body:      '🎤 Voice message',
      mediaUrl:  audioDataUrl,   // base64 for CRM playback
      status,
      timestamp: new Date(),
      sentBy:    req.user.id,
    };
    if (waMessageId) msgDoc.waMessageId = waMessageId;

    const message = await Message.create(msgDoc);

    await Lead.findByIdAndUpdate(leadId, {
      lastMessage:   '🎤 Voice message',
      lastMessageAt: new Date(),
      ...(lead.status === 'new' && { status: 'contacted' }),
    });

    const io = req.app.get('io');
    io?.to(`user_${businessId}`).emit('message_sent', {
      leadId: lead._id.toString(), messageId: message._id.toString(),
      body: '🎤 Voice message', status,
      timestamp: new Date().toISOString(), direction: 'outbound',
    });

    res.status(201).json({ message, status });
  } catch (err) {
    console.error('sendAudio error:', err);
    res.status(500).json({ message: err.message });
  }
};