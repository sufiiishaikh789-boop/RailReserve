// AuthContext — passenger authentication state management
// Railway Reservation System v3.0 — Team 11, CSE 2271
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export interface AuthUser {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  unread_notifications?: number;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'railreserve_token';
const USER_KEY = 'railreserve_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  // Synchronous initialization from localStorage prevents race condition / auth flicker on page refresh
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  });

  const [user, setUser] = useState<AuthUser | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const savedUser = localStorage.getItem(USER_KEY);
      return savedUser ? (JSON.parse(savedUser) as AuthUser) : null;
    } catch {
      return null;
    }
  });

  const [isLoading] = useState(false);

  // Sync state if another tab modifies storage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY || e.key === USER_KEY) {
        try {
          const freshToken = localStorage.getItem(TOKEN_KEY);
          const freshUser = localStorage.getItem(USER_KEY);
          setToken(freshToken);
          setUser(freshUser ? (JSON.parse(freshUser) as AuthUser) : null);
        } catch {
          // ignore corrupted cross-tab payload
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch (e) {
      console.error('[AuthContext] Failed to persist credentials to localStorage', e);
    }
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (e) {
      console.error('[AuthContext] Failed to remove credentials from localStorage', e);
    }
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch (e) {
      console.error('[AuthContext] Failed to update user in localStorage', e);
    }
    setUser(updatedUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
