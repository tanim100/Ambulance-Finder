// src/lib/api.js
// Axios instance with JWT interceptor

import axios from 'axios';
import { getToken, removeToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 20000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 Unauthorized safely without reload loops
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      removeToken();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth endpoints
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// User endpoints
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getHistory: () => api.get('/user/bookings'),
};

// Booking endpoints
export const bookingAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.patch(`/bookings/${id}/cancel`),
  updateStatus: (id, status) => api.patch(`/bookings/${id}/status`, { status }),
};

// Ambulance endpoints
export const ambulanceAPI = {
  getNearby: (lat, lng, radius = 10) =>
    api.get('/ambulances/nearby', { params: { lat, lng, radius } }),
  getAll: (params) => api.get('/ambulances', { params }),
  getById: (id) => api.get(`/ambulances/${id}`),
  create: (data) => api.post('/ambulances', data),
  update: (id, data) => api.put(`/ambulances/${id}`, data),
  delete: (id) => api.delete(`/ambulances/${id}`),
};

// Driver endpoints
export const driverAPI = {
  getAll: (params) => api.get('/drivers', { params }),
  getById: (id) => api.get(`/drivers/${id}`),
  create: (data) => api.post('/drivers', data),
  update: (id, data) => api.put(`/drivers/${id}`, data),
  delete: (id) => api.delete(`/drivers/${id}`),
  toggleOnline: (status) => api.patch('/driver/status', { isOnline: status }),
  getActiveBooking: () => api.get('/driver/active-booking'),
  updateBookingStatus: (id, status) =>
    api.patch(`/driver/booking/${id}/status`, { status }),
};

// Admin endpoints
export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getBookings: (params) => api.get('/admin/bookings', { params }),
  getUsers: (params) => api.get('/admin/users', { params }),
  getReports: () => api.get('/admin/reports'),
};
