

require('dotenv').config();   // load .env early
const http    = require('http');
const { Server } = require('socket.io');
const jwt     = require('jsonwebtoken');
const registerSocketHandlers = require("./sockets/handlers");

const app = require('./app');
const env = require('./config/env');

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Make io accessible from routes/services if needed
app.set('io', io);

// ──────────────────────────────────────
// Socket.IO: Handshake Auth
// ──────────────────────────────────────
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication token missing'));

  try {
    const payload = jwt.verify(token, env.JWT_SECRET);
    socket.user = payload;                // attach decoded user for later use
    return next();
  } catch (err) {
    return next(new Error('Invalid token'));
  }
});


io.on("connection", (socket) => {
  console.log(`⚡ socket ${socket.id} connected`);
  registerSocketHandlers(io, socket);

  socket.on("disconnect", () => console.log(`${socket.id} disconnected`));
});


// ──────────────────────────────────────
// Start Listening
// ──────────────────────────────────────
httpServer.listen(env.PORT, () => {
  console.log(`🚀  Server listening on port ${env.PORT}`);
});


module.exports = httpServer;