const http = require('http');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
require('dotenv').config();

const app = require('./app');
const setupSockets = require('./src/sockets/index');
const { startAllCronJobs } = require('./src/services/cronService');

const PORT = process.env.PORT || 5000;

// Create HTTP server from Express app
const server = http.createServer(app);

// Attach Socket.io to server
const io = new Server(server, {
  cors: { origin: '*' }
});

// Store io on app so controllers can access it
app.set('io', io);

// Setup all socket events from sockets folder
setupSockets(io);

// Connect MongoDB then start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      startAllCronJobs(io);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err.message);
  });