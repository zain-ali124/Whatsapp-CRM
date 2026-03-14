const jwt = require('jsonwebtoken');
const Agent = require('../models/Agent');

const setupSockets = (io) => {

  io.on('connection', (socket) => {
    console.log('🔌 Client connected:', socket.id);

    // ─── User joins their private room ───────────────────────
    // Frontend calls this after login
    // Only this user will receive their own lead/message events
    socket.on('join', ({ userId, token }) => {
      try {
        // Verify token for security
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.id === userId) {
          socket.join(`user_${userId}`);
          console.log(`✅ User ${userId} joined their room`);

          // Confirm to frontend that join was successful
          socket.emit('joined', { success: true, userId });
        }

      } catch (err) {
        console.log('❌ Socket join failed — invalid token');
        socket.emit('joined', { success: false });
      }
    });

    // ─── Agent comes online ───────────────────────────────────
    socket.on('agent_online', async ({ agentId, userId }) => {
      try {
        await Agent.findByIdAndUpdate(agentId, {
          isOnline: true
        });

        // Tell everyone in this business room that agent is online
        io.to(`user_${userId}`).emit('agent_status_changed', {
          agentId,
          isOnline: true
        });

        console.log(`✅ Agent ${agentId} is online`);

      } catch (err) {
        console.error('❌ Agent online error:', err.message);
      }
    });

    // ─── Agent goes offline ───────────────────────────────────
    socket.on('agent_offline', async ({ agentId, userId }) => {
      try {
        await Agent.findByIdAndUpdate(agentId, {
          isOnline: false
        });

        io.to(`user_${userId}`).emit('agent_status_changed', {
          agentId,
          isOnline: false
        });

        console.log(`❌ Agent ${agentId} is offline`);

      } catch (err) {
        console.error('❌ Agent offline error:', err.message);
      }
    });

    // ─── Agent is typing ──────────────────────────────────────
    socket.on('typing', ({ leadId, userId, agentName }) => {
      socket.to(`user_${userId}`).emit('agent_typing', {
        leadId,
        agentName
      });
    });

    // ─── Disconnect ───────────────────────────────────────────
    socket.on('disconnect', () => {
      console.log('❌ Client disconnected:', socket.id);
    });
  });

};

module.exports = setupSockets;