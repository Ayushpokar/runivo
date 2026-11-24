import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/client';
import type { PublicUser } from '../types/api';

interface AuthContextValue {
  user: PublicUser | null;
  loading: boolean;
  loginWithToken: (user: PublicUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(() => {
    const saved = localStorage.getItem('runivo_user');
    if (!saved) return null;
    try {
      return JSON.parse(saved) as PublicUser;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('runivo_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .getMe()
      .then((freshUser) => {
        setUser(freshUser);
        localStorage.setItem('runivo_user', JSON.stringify(freshUser));
      })
      .catch(() => {
        localStorage.removeItem('runivo_token');
        localStorage.removeItem('runivo_user');
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loginWithToken = (loggedInUser: PublicUser, token: string) => {
    localStorage.setItem('runivo_token', token);
    localStorage.setItem('runivo_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
  };

  const logout = () => {
    localStorage.removeItem('runivo_token');
    localStorage.removeItem('runivo_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
