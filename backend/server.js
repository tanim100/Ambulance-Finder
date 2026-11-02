require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');

const app = require('./src/app');
const connectDB = require('./src/config/db');
const socketHandler = require('./src/socket/socketHandler');

const PORT = process.env.PORT || 5000;

// ─── Create HTTP Server ────────────────────────────────────────────────────────
const server = http.createServer(app);

// ─── Attach Socket.io to HTTP Server ──────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60000,
  pingInterval: 25000,
});

// Make io accessible from Express controllers via req.app.get('io')
app.set('io', io);

// Register socket event handlers
socketHandler(io);

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    await connectDB();

    server.listen(PORT, () => {
      console.log(`
╔══════════════════════════════════════════════╗
║      🚑 Ambulance Finder API Server          ║
╠══════════════════════════════════════════════╣
║  Status   : Running                          ║
║  Port     : ${String(PORT).padEnd(30)}║
║  Env      : ${String(process.env.NODE_ENV || 'development').padEnd(30)}║
║  Socket   : Enabled                          ║
╚══════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  server.close(() => process.exit(1));
});

startServer();
