'use client';
// src/hooks/useAuth.js
//
// FIX: logout এ socket destroy করা হয়েছে।
// FIX: network error এর জন্য better error message যোগ করা হয়েছে।

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, removeToken, getUser, setUser, isLoggedIn } from '@/lib/auth';
import { authAPI } from '@/lib/api';
import { destroySocket } from '@/lib/socket';

export function useAuth() {
  const router = useRouter();
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUser = getUser();
    if (storedUser && isLoggedIn()) {
      setUserState(storedUser);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email, password) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.login({ email, password });
      const { token, user: userData } = res.data;
      setToken(token);
      setUser(userData);
      setUserState(userData);
      return userData;
    } catch (err) {
      // FIX: Network error (backend বন্ধ থাকলে) সুনির্দিষ্ট message দেখাবে
      let msg;
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        msg = 'Cannot connect to server. Please make sure the backend is running on port 5000.';
      } else {
        msg = err.response?.data?.message || 'Login failed. Please try again.';
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (data) => {
    setLoading(true);
    setError(null);
    try {
      const res = await authAPI.register(data);
      const { token, user: userData } = res.data;
      setToken(token);
      setUser(userData);
      setUserState(userData);
      return userData;
    } catch (err) {
      // FIX: Network error এর জন্য better message
      let msg;
      if (err.code === 'ERR_NETWORK' || err.code === 'ECONNREFUSED') {
        msg = 'Cannot connect to server. Please make sure the backend is running on port 5000.';
      } else {
        msg = err.response?.data?.message || 'Registration failed. Please try again.';
      }
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // FIX: logout এ socket ও destroy করা হচ্ছে
    // যাতে নতুন user পুরানো socket connection না পায়
    destroySocket();
    removeToken();
    setUserState(null);
    router.push('/login');
  }, [router]);

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user && isLoggedIn(),
    login,
    register,
    logout,
  };
}
