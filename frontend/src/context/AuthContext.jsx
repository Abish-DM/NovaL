import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const data = await api.get('/auth/me');
      setUser(data);
      setError(null);
    } catch (err) {
      setUser(null);
      // 401 is normal when not logged in yet
      if (err.status !== 401) {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const loginWithGoogle = async () => {
    try {
      const data = await api.get('/auth/google/login');
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err.message || 'Failed to initialize Google Login');
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.error('Logout request error:', err);
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  };

  const value = {
    user,
    loading,
    error,
    isAdmin: user?.role === 'ADMIN',
    loginWithGoogle,
    logout,
    refreshUser: fetchCurrentUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
