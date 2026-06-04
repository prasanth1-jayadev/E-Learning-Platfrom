import { Server } from 'socket.io';
import { setupChatHandlers } from '../sockets/chatSocketHandler.js';

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:5000',
      methods: ['GET', 'POST'],
      credentials: true
    },
    serveClient: true,
    path: '/socket.io',
    pingTimeout: 60000,
    pingInterval: 25000
  });

  io.use(async (socket, next) => {
    try {
      const userType = socket.handshake.auth.userType;
      const userId = socket.handshake.auth.userId;
      
      if (!userId || !userType) {
        return next(new Error('Authentication error'));
      }

      socket.userId = userId;
      socket.userType = userType;
      
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`${socket.userType} connected: ${socket.userId}`);
    
    socket.join(`${socket.userType}_${socket.userId}`);
    
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      userType: socket.userType
    });

    socket.on('disconnect', () => {
      console.log(`${socket.userType} disconnected: ${socket.userId}`);
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        userType: socket.userType
      });
    });
  });

  // Setup chatevent
  setupChatHandlers(io);

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};
