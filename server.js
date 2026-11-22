require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const mongoose = require('mongoose');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const noteRoutes = require('./routes/noteRoutes');
const appEmitter = require('./utils/eventEmitter');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/notes', noteRoutes);

// Real-Time Chat via Socket.IO
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join room event
  socket.on('joinRoom', ({ room = 'general' } = {}) => {
    socket.join(room);
    console.log(`${socket.id} joined room ${room}`);
    socket.to(room).emit('systemMessage', `${socket.id} joined room ${room}`);
  });

  // Chat message event
  socket.on('chatMessage', ({ room = 'general', username = 'Anonymous', message }) => {
    if (!message) return;
    console.log(`[${room}] ${username}: ${message}`);
    appEmitter.emit('chatMessageSent', { room, username, message });
    io.to(room).emit('chatMessage', { username, message });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[server] listening on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });