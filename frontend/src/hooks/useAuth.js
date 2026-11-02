'use client';
// src/hooks/useAuth.js

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken, removeToken, getUser, setUser, isLoggedIn } from '@/lib/auth';
import { authAPI } from '@/lib/api';

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
      const msg = err.response?.data?.message || 'Login failed. Please try again.';
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
      const msg = err.response?.data?.message || 'Registration failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
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
