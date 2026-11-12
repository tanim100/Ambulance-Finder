// src/lib/socket.js
// Socket.io client setup
//
// FIX: socket singleton এ token stale হয়ে যাওয়ার সমস্যা fix করা হয়েছে।
// আগে socket একবার create হলে token আর update হতো না।
// এখন reconnect এর আগে সবসময় latest token নেওয়া হয়।

import { io } from 'socket.io-client';
import { getToken } from './auth';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      // FIX: auth হিসেবে function দেওয়া হয়েছে যাতে প্রতি reconnect এ
      // সর্বশেষ token ব্যবহার হয় (stale token problem solved)
      auth: (cb) => {
        cb({ token: getToken() });
      },
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
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

// FIX: Logout হলে socket destroy করা হয় যাতে পরের user
// আগের user এর socket connection না পায়
export function destroySocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
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
