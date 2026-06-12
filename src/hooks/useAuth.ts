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

export type UserRole = 'admin' | 'demo' | 'user' | 'staff';
export type PermissionsMap = Record<string, boolean>;

interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  role: UserRole | null;
  permissions: PermissionsMap;
}

/**
 * Fetch both role and permissions in a single profile query.
 * Falls back to RPC for role if the direct query fails.
 */
async function fetchUserProfile(userId: string): Promise<{ role: UserRole; permissions: PermissionsMap }> {
  const supabase = getSupabase();
  const defaultResult = { role: 'user' as UserRole, permissions: {} as PermissionsMap };
  if (!supabase) return defaultResult;

  const withTimeout = <T>(p: Promise<T>, ms = 5000): Promise<T | null> =>
    Promise.race([p, new Promise<null>((res) => setTimeout(() => res(null), ms))]);

  const VALID_ROLES: UserRole[] = ['admin', 'demo', 'user', 'staff'];

  // 1. SECURITY DEFINER RPC (bypasses RLS) — fast role fetch
  let rpcRole: UserRole | null = null;
  try {
    const result = await withTimeout(Promise.resolve(supabase.rpc('get_my_role')));
    const r = (result as any)?.data as string | undefined;
    if (r && VALID_ROLES.includes(r as UserRole)) rpcRole = r as UserRole;
  } catch { /* fall through */ }

  // 2. Direct table query — gets both role AND permissions
  try {
    const result = await withTimeout(
      Promise.resolve(
        supabase.from('profiles').select('role, permissions').eq('id', userId).single()
      )
    );
    const data = (result as any)?.data;
    if (data) {
      const r = data.role as string | undefined;
      const role = (r && VALID_ROLES.includes(r as UserRole)) ? (r as UserRole) : (rpcRole ?? 'user');
      const permissions = (data.permissions ?? {}) as PermissionsMap;
      return { role, permissions };
    }
  } catch { /* fall through */ }

  // Fallback: use RPC role with empty permissions
  return { role: rpcRole ?? 'user', permissions: {} };
}

const REMEMBER_KEY = 'alignment_remember_session';

function clearLocalAuthStorage() {
  if (typeof window === 'undefined') return;

  localStorage.removeItem(REMEMBER_KEY);
  sessionStorage.removeItem(REMEMBER_KEY);

  for (const storage of [localStorage, sessionStorage]) {
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (
        key &&
        (key.startsWith('sb-') && key.endsWith('-auth-token'))
      ) {
        storage.removeItem(key);
      }
    }
  }
}

// ── Preview mode: bypass Supabase auth so Claude Preview sandbox can reach the
//    dashboard without making any calls to supabase.co (which is blocked).
//    Enable by adding NEXT_PUBLIC_PREVIEW_MODE=true to .env.local.
//    Never set this in production — the env var is stripped at build time.
const _IS_PREVIEW = process.env.NEXT_PUBLIC_PREVIEW_MODE === 'true';
// Use a REAL owner UUID so owner-scoped APIs (customers, prompts) work in preview.
// Falls back to a non-UUID placeholder if not set (those APIs will then 404).
const _PREVIEW_USER_ID = process.env.NEXT_PUBLIC_PREVIEW_USER_ID || 'preview-user-id';
const _PREVIEW_USER = _IS_PREVIEW ? {
  id: _PREVIEW_USER_ID, email: 'test@alignment.ai',
  app_metadata: {}, user_metadata: {}, aud: 'authenticated',
  created_at: new Date().toISOString(),
} as unknown as import('@supabase/supabase-js').User : null;
const _PREVIEW_SESSION = _IS_PREVIEW ? {
  access_token: 'preview-mode-bypass', refresh_token: '',
  expires_in: 86400, expires_at: 9999999999, token_type: 'bearer',
  user: _PREVIEW_USER!,
} as unknown as import('@supabase/supabase-js').Session : null;

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
    permissions: {},
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ── Preview bypass: skip all Supabase network calls ──
    if (_IS_PREVIEW) {
      setAuthFromSession(_PREVIEW_SESSION);
      setAuthState({ user: _PREVIEW_USER, session: _PREVIEW_SESSION, isLoading: false, isAuthenticated: true, role: 'admin', permissions: {} });
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      setAuthState({ user: null, session: null, isLoading: false, isAuthenticated: false, role: null, permissions: {} });
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
        setAuthState({ user: null, session: null, isLoading: false, isAuthenticated: false, role: null, permissions: {} });
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
        role: prev.role,           // preserve existing role — updated below
        permissions: prev.permissions, // preserve existing permissions — updated below
      }));
      setAuthFromSession(session);

      // Fetch role + permissions.  Runs on every auth event so they stay fresh,
      // but the UI never sees role=null once it has been set for the first time.
      const { role, permissions } = await fetchUserProfile(session.user.id);
      if (mounted) {
        setAuthState((prev) => ({ ...prev, role, permissions }));
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
        setAuthState((prev) => prev.isLoading ? { ...prev, isLoading: false, permissions: prev.permissions } : prev);
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
    setError(null);

    clearLocalAuthStorage();
    setAuthFromSession(null);
    setAuthState({ user: null, session: null, isLoading: false, isAuthenticated: false, role: null, permissions: {} });

    if (!supabase) return true;

    try {
      const remoteSignOut = supabase.auth.signOut({ scope: 'local' });
      const timeout = new Promise<{ error: null }>((resolve) => setTimeout(() => resolve({ error: null }), 1500));
      await Promise.race([remoteSignOut, timeout]);
      return true;
    } catch (err) {
      console.warn('[auth] Remote sign out failed after local cleanup:', err);
      return true;
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
