'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Rider, TokenResponse } from '@/types';
import { getRiderId, getPhone, clearAuth, isAuthenticated as checkIsAuth } from '@/lib/auth';
import { getMe } from '@/lib/api';

interface AuthContextType {
  riderId: string | null;
  rider: Rider | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (tokenResponse: TokenResponse) => void;
  logout: () => void;
  refreshRider: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [riderId, setRiderId] = useState<string | null>(null);
  const [rider, setRider] = useState<Rider | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true);
      if (checkIsAuth()) {
        const storedRiderId = getRiderId();
        const storedPhone = getPhone();
        setRiderId(storedRiderId);
        setIsAuthenticated(true);
        if (storedPhone) {
           try {
              const data = await getMe(storedPhone);
              setRider(data);
            } catch (e: any) {
              // Rider not found in DB (404) — stale session, clear silently
              if (e?.message?.includes('Not found') || e?.message?.includes('404')) {
                clearAuth();
                setRiderId(null);
                setIsAuthenticated(false);
              }
            }
        }
      }
      setIsLoading(false);
    };
    initAuth();
  }, []);

  const login = (tokenResponse: TokenResponse) => {
    // Note: LocalStorage is updated in verification API method automatically,
    // but we need to update state here
    setRiderId(tokenResponse.rider_id);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuth();
    setRiderId(null);
    setRider(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  const refreshRider = async () => {
    const storedPhone = getPhone();
    if (storedPhone) {
      try {
        const data = await getMe(storedPhone);
        setRider(data);
      } catch (e) {
        console.error('Failed to refresh rider', e);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      riderId, rider, isAuthenticated, isLoading, login, logout, refreshRider
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
