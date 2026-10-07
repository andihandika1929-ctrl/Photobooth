'use client';

import * as React from 'react';
import { Session, User } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/client';

interface AdminAuthContextType {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  supabase: ReturnType<typeof createClient>;
}

const AdminAuthContext = React.createContext<AdminAuthContextType | undefined>(undefined);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = React.useMemo(() => createClient(), []);
  const [session, setSession] = React.useState<Session | null>(null);
  const [authLoading, setAuthLoading] = React.useState(true);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const signIn = React.useCallback(
    async (email: string, pass: string) => {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: pass,
        });

        if (error) {
          return { success: false, error: error.message };
        }
        return { success: true };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Authentication failed';
        return { success: false, error: msg };
      }
    },
    [supabase]
  );

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
  }, [supabase]);

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        authLoading,
        signIn,
        signOut,
        supabase,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = React.useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
}
