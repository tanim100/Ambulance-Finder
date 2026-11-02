// src/lib/socket.js
// Socket.io client setup

import { io } from 'socket.io-client';
import { getToken } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      auth: {
        token: getToken(),
      },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket && socket.connected) {
    socket.disconnect();
  }
}

export function subscribeToBooking(bookingId, callbacks = {}) {
  const s = getSocket();

  if (callbacks.onLocationUpdate) {
    s.on(`booking:${bookingId}:location`, callbacks.onLocationUpdate);
  }
  if (callbacks.onStatusUpdate) {
    s.on(`booking:${bookingId}:status`, callbacks.onStatusUpdate);
  }

  return () => {
    s.off(`booking:${bookingId}:location`);
    s.off(`booking:${bookingId}:status`);
  };
}

export function emitDriverLocation(lat, lng) {
  const s = getSocket();
  s.emit('driver:location', { lat, lng });
}

export function emitDriverStatus(status) {
  const s = getSocket();
  s.emit('driver:status', { status });
}

export default getSocket;
