'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { getUser, onAuthStateChange, signIn, signOut, signUp, signInWithOAuth, OAuthProvider } from '@/lib/auth';

interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signInWithOAuth: (provider: OAuthProvider) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial user
    getUser()
      .then((user) => {
        setUser(user);
        setLoading(false);
      })
      .catch((error) => {
        // Handle stale/invalid token errors gracefully
        console.warn('Auth error (clearing session):', error.message);
        // Clear the invalid session
        signOut().catch(() => {});
        setUser(null);
        setLoading(false);
      });

    // Listen for auth changes
    const subscription = onAuthStateChange((user) => {
      setUser(user);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = async (email: string, password: string) => {
    await signIn(email, password);
  };

  const handleSignUp = async (email: string, password: string): Promise<SignUpResult> => {
    const result = await signUp(email, password);
    return { needsEmailConfirmation: result.needsEmailConfirmation };
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleSignInWithOAuth = async (provider: OAuthProvider) => {
    await signInWithOAuth(provider);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn: handleSignIn, signUp: handleSignUp, signInWithOAuth: handleSignInWithOAuth, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
