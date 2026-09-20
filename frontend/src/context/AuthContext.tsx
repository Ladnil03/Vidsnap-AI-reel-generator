'use client';

/**
 * VidSnap.AI Authentication Context & State Management
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { api, getStoredToken } from '../lib/api';
import { User } from '../lib/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isCreator: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateTokenBalance: (tokens: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setUser(null);
        return;
      }
      const userData = await api.auth.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const resp = await api.auth.login(email, password);
      setUser({
        user_id: resp.user_id,
        name: resp.name,
        email: resp.email,
        roles: resp.roles,
        tokens_remaining: resp.tokens_remaining,
      });
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const resp = await api.auth.signup(name, email, password);
      setUser({
        user_id: resp.user_id,
        name: resp.name,
        email: resp.email,
        roles: resp.roles,
        tokens_remaining: resp.tokens_remaining,
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await api.auth.logout();
    setUser(null);
  };

  const updateTokenBalance = (tokens: number) => {
    if (user) {
      setUser({ ...user, tokens_remaining: tokens });
    }
  };

  const isAdmin = Boolean(user?.roles?.includes('admin'));
  const isCreator = Boolean(user?.roles?.includes('creator') || user?.roles?.includes('admin'));

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isCreator,
        login,
        signup,
        logout,
        refreshUser,
        updateTokenBalance,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
