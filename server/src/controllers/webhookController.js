const User    = require('../models/User');
const Lead    = require('../models/Lead');
const Message = require('../models/Message');
const Activity = require('../models/Activity');
const { sendTextMessage, markAsRead } = require('../services/whatsappService');
const { autoAssignLead } = require('../services/autoAssignService');

/* ─────────────────────────────────────────────────────────────
   GET /api/webhook/whatsapp
   Meta calls this to verify your webhook URL.
   Must respond within 5 seconds.
──────────────────────────────────────────────────────────────── */
exports.verifyWebhook = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  console.log('🔔 Webhook verification request received');
  console.log('   mode:', mode, '| token:', token);

  if (mode === 'subscribe' && token === process.env.META_VERIFY_TOKEN) {
    console.log('✅ Webhook verified');
    return res.status(200).send(challenge);
  }

  console.error('❌ Webhook verification failed — token mismatch');
  return res.status(403).json({ error: 'Verification failed' });
};

/* ─────────────────────────────────────────────────────────────
   POST /api/webhook/whatsapp
   Handles all incoming events from Meta:
   - Incoming text/media messages
   - Message status updates (sent, delivered, read, failed)
──────────────────────────────────────────────────────────────── */
exports.handleWebhook = async (req, res) => {
  // Always respond 200 immediately — Meta will retry if you don't
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;

    // Validate structure
    if (body.object !== 'whatsapp_business_account') return;
    const entry    = body.entry?.[0];
    const changes  = entry?.changes?.[0];
    const value    = changes?.value;
    if (!value) return;

    const phoneNumberId = value.metadata?.phone_number_id;
    if (!phoneNumberId) return;

    // ── Find the workspace this phone number belongs to ──────────
    const user = await User.findOne({ waPhoneNumberId: phoneNumberId });
    if (!user) {
      console.warn('⚠️  Received webhook for unknown phone number ID:', phoneNumberId);
      return;
    }

    const io = req.app.get('io');

    // ── Handle incoming messages ─────────────────────────────────
    if (value.messages?.length) {
      for (const msg of value.messages) {
        await handleIncomingMessage(msg, value.contacts?.[0], user, io);
      }
    }

    // ── Handle status updates ────────────────────────────────────
    if (value.statuses?.length) {
      for (const status of value.statuses) {
        await handleStatusUpdate(status, user, io);
      }
    }

  } catch (err) {
    console.error('❌ Webhook processing error:', err);
  }
};

/* ─────────────────────────────────────────────────────────────
   Process a single incoming message
──────────────────────────────────────────────────────────────── */
async function handleIncomingMessage(msg, contact, user, io) {
  const waMessageId = msg.id;
  const fromPhone   = msg.from;           // E.164 without +, e.g. "923001234567"
  const timestamp   = new Date(parseInt(msg.timestamp) * 1000);
  const contactName = contact?.profile?.name || null;

  // Determine message body and type
  let body     = '';
  let type     = 'text';
  let mediaUrl = null;

  if (msg.type === 'text') {
    body = msg.text?.body || '';
  } else if (msg.type === 'image') {
    body    = msg.image?.caption || '📷 Image';
    type    = 'image';
    mediaUrl = msg.image?.id;       // Meta media ID — fetch URL separately if needed
  } else if (msg.type === 'audio') {
    body    = '🎤 Voice message';
    type    = 'audio';
    mediaUrl = msg.audio?.id;
  } else if (msg.type === 'document') {
    body    = `📄 Document: ${msg.document?.filename || ''}`;
    type    = 'document';
    mediaUrl = msg.document?.id;
  } else if (msg.type === 'video') {
    body    = '🎥 Video';
    type    = 'video';
    mediaUrl = msg.video?.id;
  } else if (msg.type === 'location') {
    body = `📍 Location: ${msg.location?.latitude}, ${msg.location?.longitude}`;
    type = 'location';
  } else {
    body = `[${msg.type} message]`;
    type = msg.type;
  }

  // ── Find or create lead ──────────────────────────────────────
  let lead = await Lead.findOne({ userId: user._id, phone: fromPhone });

  if (!lead) {
    // New lead — create it
    lead = await Lead.create({
      userId:       user._id,
      name:         contactName || fromPhone,
      phone:        fromPhone,
      source:       'whatsapp_direct',
      status:       'new',
      leadScore:    0,
      lastMessage:  body,
      lastMessageAt: timestamp,
    });

    console.log(`✅ New lead created: ${lead.name} (${fromPhone})`);

    // Auto-assign to available agent
    await autoAssignLead(lead, user._id);

    // Emit new lead event
    io?.to(`user_${user._id}`).emit('new_lead', {
      leadId:   lead._id.toString(),
      leadName: lead.name,
      phone:    fromPhone,
    });

    // Log activity
    await Activity.create({
      userId:      user._id,
      type:        'new_lead',
      description: `New lead ${lead.name} started a conversation`,
      relatedLead: lead._id,
    });
  } else {
    // Existing lead — update last message preview and timestamp
    await Lead.findByIdAndUpdate(lead._id, {
      lastMessage:   body.slice(0, 100),
      lastMessageAt: timestamp,
      $inc: { unreadCount: 1 },
    });
  }

  // ── Prevent duplicate messages ───────────────────────────────
  const existing = await Message.findOne({ waMessageId });
  if (existing) {
    console.log('⚠️  Duplicate message skipped:', waMessageId);
    return;
  }

  // ── Save message to DB ───────────────────────────────────────
  const message = await Message.create({
    userId:      user._id,
    leadId:      lead._id,
    waMessageId,
    direction:   'inbound',
    type,
    body,
    mediaUrl,
    status:      'received',
    timestamp,
  });

  console.log(`📨 Message saved from ${lead.name}: "${body.slice(0, 60)}"`);

  // ── Mark as read (optional — remove if you want unread count) ─
  // await markAsRead(waMessageId, user);

  // ── Emit real-time event to frontend ────────────────────────
  io?.to(`user_${user._id}`).emit('new_message', {
    leadId:    lead._id.toString(),
    leadName:  lead.name,
    messageId: message._id.toString(),
    body,
    type,
    timestamp: timestamp.toISOString(),
    direction: 'inbound',
  });
}

/* ─────────────────────────────────────────────────────────────
   Process a message status update (sent → delivered → read → failed)
──────────────────────────────────────────────────────────────── */
async function handleStatusUpdate(status, user, io) {
  const { id: waMessageId, status: newStatus, recipient_id: phone } = status;

  // Map Meta status to our status
  const statusMap = {
    sent:      'sent',
    delivered: 'delivered',
    read:      'read',
    failed:    'failed',
  };

  const mappedStatus = statusMap[newStatus];
  if (!mappedStatus) return;

  // Update message status in DB
  const message = await Message.findOneAndUpdate(
    { waMessageId, userId: user._id },
    { status: mappedStatus },
    { new: true }
  );

  if (!message) return;

  console.log(`📋 Message ${waMessageId} → ${mappedStatus}`);

  // Emit to frontend so chat window updates tick marks
  io?.to(`user_${user._id}`).emit('message_status', {
    waMessageId,
    messageId: message._id.toString(),
    status:    mappedStatus,
    phone,
  });
}
