const jwt = require('jsonwebtoken');

/**
 * Socket.io event handler
 * @param {import('socket.io').Server} io
 */
const socketHandler = (io) => {
  // Middleware: authenticate socket connection via JWT
  io.use((socket, next) => {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.split(' ')[1];

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded; // attach decoded user to socket
      next();
    } catch (err) {
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} | User: ${socket.user?.id}`);

    /**
     * Join a booking room to receive real-time updates for that booking
     * Client emits: { bookingId: string }
     */
    socket.on('join:booking', ({ bookingId }) => {
      if (!bookingId) return;
      const room = `booking-${bookingId}`;
      socket.join(room);
      console.log(`Socket ${socket.id} joined room: ${room}`);
      socket.emit('joined:booking', { bookingId, message: `Joined booking room ${room}` });
    });

    /**
     * Leave a booking room
     * Client emits: { bookingId: string }
     */
    socket.on('leave:booking', ({ bookingId }) => {
      if (!bookingId) return;
      const room = `booking-${bookingId}`;
      socket.leave(room);
      console.log(`Socket ${socket.id} left room: ${room}`);
    });

    /**
     * Driver sends location update
     * Client emits: { bookingId: string, driverId: string, ambulanceId: string, lat: number, lng: number }
     * Server broadcasts: ambulance:location to booking-{bookingId} room
     */
    socket.on('driver:location-update', ({ bookingId, driverId, ambulanceId, lat, lng }) => {
      if (!bookingId || lat === undefined || lng === undefined) {
        socket.emit('error', { message: 'bookingId, lat and lng are required' });
        return;
      }

      const room = `booking-${bookingId}`;
      io.to(room).emit('ambulance:location', {
        bookingId,
        driverId,
        ambulanceId,
        location: { lat, lng },
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Booking status change notification (can also be triggered server-side via controller)
     * Client emits: { bookingId: string, status: string }
     * Server broadcasts: booking:status-change to booking-{bookingId} room
     */
    socket.on('booking:status-change', ({ bookingId, status, booking }) => {
      if (!bookingId || !status) {
        socket.emit('error', { message: 'bookingId and status are required' });
        return;
      }

      const room = `booking-${bookingId}`;
      io.to(room).emit('booking:status-change', {
        bookingId,
        status,
        booking: booking || null,
        timestamp: new Date().toISOString(),
      });
    });

    /**
     * Driver comes online — broadcast to a general channel
     */
    socket.on('driver:online', ({ driverId, ambulanceId, location }) => {
      socket.broadcast.emit('driver:online', { driverId, ambulanceId, location });
    });

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} | Reason: ${reason}`);
    });

    socket.on('error', (err) => {
      console.error(`Socket error [${socket.id}]:`, err.message);
    });
  });
};

module.exports = socketHandler;
