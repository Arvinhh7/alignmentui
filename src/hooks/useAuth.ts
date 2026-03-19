/**
 * Authentication hook — Supabase Auth + role from profiles table
 *
 * Design:
 * - A single `processSession` function handles both the initial session
 *   (from getSession) and all subsequent auth events (onAuthStateChange).
 *   This avoids race conditions from two separate code paths.
 * - isAuthenticated is set TRUE immediately after the session is confirmed,
 *   BEFORE the role fetch. The dashboard shows a loading spinner until role
 *   arrives (~1s), but never incorrectly redirects to /login.
 * - Each role query has a 5s timeout so fetchUserRole always resolves.
 */
import { useState, useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase';
import { setAuthFromSession } from '@/lib/api';
import type { User, Session } from '@supabase/supabase-js';

export type UserRole = 'admin' | 'demo' | 'user';

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
}

async function fetchUserRole(userId: string): Promise<UserRole> {
  const supabase = getSupabase();
  if (!supabase) return 'user';

  const withTimeout = <T>(p: Promise<T>, ms = 5000): Promise<T | null> =>
    Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);

  // 1. SECURITY DEFINER RPC (bypasses RLS)
  // Wrap in Promise.resolve() so TypeScript sees a plain Promise, not PostgrestBuilder
  try {
    const result = await withTimeout(Promise.resolve(supabase.rpc('get_my_role')));
    const r = (result as any)?.data as string | undefined;
    if (r === 'admin' || r === 'demo' || r === 'user') return r;
  } catch { /* fall through */ }

  // 2. Direct table query (owner can read own row via RLS)
  try {
    const result = await withTimeout(
      Promise.resolve(supabase.from('profiles').select('role').eq('id', userId).single())
    );
    const r = (result as any)?.data?.role as string | undefined;
    if (r === 'admin' || r === 'demo' || r === 'user') return r;
  } catch { /* fall through */ }

  return 'user';
}

const REMEMBER_KEY = 'alignment_remember_session';

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setAuthState({ user: null, session: null, isLoading: false, isAuthenticated: false, role: null });
      return;
    }

    let mounted = true;

    /**
     * Single handler for any session update — called from both getSession()
     * and onAuthStateChange. React batches the two setState calls naturally.
     */
    const processSession = async (session: Session | null) => {
      if (!mounted) return;

      if (!session) {
        setAuthState({ user: null, session: null, isLoading: false, isAuthenticated: false, role: null });
        setAuthFromSession(null);
        return;
      }

      // Remember-Me housekeeping
      if (typeof window !== 'undefined') {
        const r = localStorage.getItem(REMEMBER_KEY);
        const s = sessionStorage.getItem(REMEMBER_KEY);
        if (!r && !s) sessionStorage.setItem(REMEMBER_KEY, 'session');
      }

      // ★ Mark as authenticated IMMEDIATELY — before the role fetch.
      //   CRITICAL: preserve prev.role instead of resetting to null.
      //   Supabase fires TOKEN_REFRESHED when a tab regains focus, which
      //   re-invokes processSession. Resetting role → null would briefly
      //   set stillResolving=true in the dashboard layout, causing the
      //   visible "flash" / reload effect on every tab switch.
      //   On initial load prev.role is null (shows spinner until role arrives).
      //   On subsequent events prev.role is already set (no flash).
      setAuthState((prev) => ({
        user: session.user,
        session,
        isLoading: false,
        isAuthenticated: true,
        role: prev.role,  // preserve existing role — updated below
      }));
      setAuthFromSession(session);

      // Fetch role (up to 5s per query, 10s total max).
      // Runs on every auth event so role stays fresh, but the UI never
      // sees role=null once it has been set for the first time.
      const role = await fetchUserRole(session.user.id);
      if (mounted) {
        setAuthState((prev) => ({ ...prev, role }));
      }
    };

    // Initial session — handles both normal page loads AND OAuth code exchange
    // (detectSessionInUrl:true causes Supabase to exchange the ?code= param
    //  before getSession() returns, so we always get the fresh session here).
    supabase.auth.getSession().then(({ data: { session } }) => {
      processSession(session);
    });

    // Real-time auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.)
    // onAuthStateChange also fires INITIAL_SESSION on subscription; letting it
    // call processSession is safe — React dedups identical state updates.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { processSession(session); }
    );

    // Safety net: if everything above hangs for 15s, stop the loading spinner.
    // At this point we don't know the auth state, so we leave isAuthenticated
    // as-is (it's been set by processSession if the session was found).
    const safety = setTimeout(() => {
      if (mounted) {
        setAuthState((prev) => prev.isLoading ? { ...prev, isLoading: false } : prev);
      }
    }, 15000);

    return () => {
      mounted = false;
      clearTimeout(safety);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) { setError('Supabase not configured'); return false; }
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { setError(error.message); return false; }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
      return false;
    }
  }, []);

  const signUp = useCallback(async (
    email: string,
    password: string,
    metadata?: { company_name?: string; full_name?: string },
    emailRedirectTo?: string,
  ): Promise<true | false | 'verify' | 'already_registered'> => {
    const supabase = getSupabase();
    if (!supabase) { setError('Supabase not configured'); return false; }
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email, password,
        options: {
          data: metadata,
          emailRedirectTo: emailRedirectTo ?? undefined,
        },
      });
      if (error) { setError(error.message); return false; }
      // Supabase returns an empty identities array for already-registered emails
      if (data.user && data.user.identities?.length === 0) {
        return 'already_registered';
      }
      // Email verification required — session will be null until user clicks link
      if (data.user && !data.session) {
        return 'verify';
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed');
      return false;
    }
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return true;
    setError(null);
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REMEMBER_KEY);
        sessionStorage.removeItem(REMEMBER_KEY);
      }
      const { error } = await supabase.auth.signOut();
      if (error) { setError(error.message); return false; }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign out failed');
      return false;
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = getSupabase();
    if (!supabase) { setError('Supabase not configured'); return false; }
    setError(null);
    try {
      // Call Supabase directly — it handles non-existent emails gracefully
      // (no profiles pre-check: RLS blocks that query for unauthenticated users)
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) { setError(error.message); return false; }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
      return false;
    }
  }, []);

  return { ...authState, error, signIn, signUp, signOut, resetPassword };
}

export function useRequireAuth(redirectUrl: string = '/login') {
  const auth = useAuth();
  useEffect(() => {
    if (!auth.isLoading && !auth.isAuthenticated) {
      window.location.href = redirectUrl;
    }
  }, [auth.isLoading, auth.isAuthenticated, redirectUrl]);
  return auth;
}
