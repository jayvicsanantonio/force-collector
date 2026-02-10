import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { env } from "../env";
import { clearAuthToken, setAuthToken } from "../api/auth";
import { setActiveUserId } from "../offline/db";
import { signOutAndClearUserData } from "../offline/session";

type AuthStatus = "checking" | "signedOut" | "signedIn";

type AuthContextValue = {
  status: AuthStatus;
  session: Session | null;
  user: User | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function assertAuthConfigured() {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
    throw new Error("Supabase auth is not configured.");
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<AuthStatus>("checking");
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);

  const applySession = useCallback(async (next: Session | null) => {
    setSession(next);
    setUser(next?.user ?? null);
    if (next?.access_token) {
      await setAuthToken(next.access_token);
      setActiveUserId(next.user.id);
      setStatus("signedIn");
    } else {
      await clearAuthToken();
      setActiveUserId(null);
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
      setSession(null);
      setUser(null);
      setStatus("signedOut");
      return () => {
        mounted = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (mounted) {
          void applySession(data.session);
        }
      })
      .catch(() => {
        if (mounted) {
          setStatus("signedOut");
        }
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        if (mounted) {
          void applySession(nextSession);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [applySession]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    assertAuthConfigured();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    assertAuthConfigured();
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) {
      throw error;
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    assertAuthConfigured();
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    await signOutAndClearUserData();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      session,
      user,
      signInWithEmail,
      signUpWithEmail,
      requestPasswordReset,
      signOut,
    }),
    [status, session, user, signInWithEmail, signUpWithEmail, requestPasswordReset, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
