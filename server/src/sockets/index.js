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
        // Store on socket object for cleanup during disconnect
        socket.agentId = agentId;
        socket.userId = userId;

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
        socket.agentId = null; // Clear if explicitly going offline
        
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
    socket.on('disconnect', async () => {
      console.log('ℹ️ Socket disconnected:', socket.id);
      
      // If an agent disconnects unexpectedly (refresh/close tab)
      if (socket.agentId && socket.userId) {
        try {
          await Agent.findByIdAndUpdate(socket.agentId, {
            isOnline: false
          });

          io.to(`user_${socket.userId}`).emit('agent_status_changed', {
            agentId: socket.agentId,
            isOnline: false
          });
          
          console.log(`ℹ️ Agent ${socket.agentId} auto-cleaned to offline`);
        } catch (err) {
          // Silent fail on disconnect cleanup
        }
      }
    });
  });

};

module.exports = setupSockets;