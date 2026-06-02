/**
 * Session + household context.
 *
 * Resolves the signed-in user's household and role from `household_members`
 * (keyed on auth.uid()), and loads the per-app `data_scope` map so useAppData
 * can build correctly-scoped row ids. Auth is OPTIONAL during the rollout: when
 * there is no session (or Supabase isn't configured), the app behaves exactly
 * as the single-tenant version did (legacy unscoped row ids, all apps visible).
 *
 * Role determination FAILS CLOSED: if a session exists but the role can't be
 * read, role is treated as 'member' (least privilege).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, requireAuth as requireAuthFlag } from './supabase';

export type Role = 'owner' | 'admin' | 'member';
export type DataScope = 'shared' | 'personal';

export interface Household {
  id: string;
  name: string;
}

export interface SessionState {
  /** True once the initial auth + household resolution has settled. */
  ready: boolean;
  /** True if a Supabase client is configured at all. */
  supabaseConfigured: boolean;
  /** Whether the login gate is enforced (VITE_REQUIRE_AUTH). */
  requireAuth: boolean;
  session: Session | null;
  userId: string | null;
  email: string | null;
  household: Household | null;
  householdId: string | null;
  role: Role | null;
  /** appId -> fixed data scope. Empty until resolved. */
  scopes: Record<string, DataScope>;
  /** True iff role is owner or admin. */
  isAdmin: boolean;
  /** Re-resolve household/role/scopes (after provisioning changes, etc.). */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

const EMPTY_SCOPES: Record<string, DataScope> = {};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState<boolean>(!supabase);
  const [session, setSession] = useState<Session | null>(null);
  const [household, setHousehold] = useState<Household | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [scopes, setScopes] = useState<Record<string, DataScope>>(EMPTY_SCOPES);
  const mounted = useRef(true);

  const resolveForUser = useCallback(async (uid: string | null) => {
    if (!supabase || !uid) {
      setHousehold(null);
      setRole(null);
      setScopes(EMPTY_SCOPES);
      return;
    }
    // Membership (household + role). Fail closed to 'member' on any error.
    const { data: member, error: memberErr } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', uid)
      .eq('status', 'active')
      .maybeSingle();

    if (memberErr || !member) {
      setHousehold(null);
      setRole(member ? 'member' : null);
    } else {
      const hhId = member.household_id as string;
      const resolvedRole = (member.role as Role) ?? 'member';
      setRole(resolvedRole === 'owner' || resolvedRole === 'admin' ? resolvedRole : 'member');

      const { data: hh } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', hhId)
        .maybeSingle();
      setHousehold(hh ? { id: hh.id as string, name: (hh.name as string) ?? 'Household' } : { id: hhId, name: 'Household' });
    }

    // Per-app data scopes (best-effort; empty map is a safe default).
    const { data: apps } = await supabase.from('foundry_apps').select('id, data_scope');
    if (apps) {
      const map: Record<string, DataScope> = {};
      for (const a of apps as { id: string; data_scope?: string }[]) {
        map[a.id] = a.data_scope === 'shared' ? 'shared' : 'personal';
      }
      setScopes(map);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    if (!supabase) {
      setReady(true);
      return;
    }
    (async () => {
      const { data } = await supabase!.auth.getSession();
      if (!mounted.current) return;
      setSession(data.session);
      await resolveForUser(data.session?.user?.id ?? null);
      if (mounted.current) setReady(true);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!mounted.current) return;
      setSession(next);
      void resolveForUser(next?.user?.id ?? null);
    });

    return () => {
      mounted.current = false;
      sub.subscription.unsubscribe();
    };
  }, [resolveForUser]);

  const refresh = useCallback(async () => {
    await resolveForUser(session?.user?.id ?? null);
  }, [resolveForUser, session]);

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    setHousehold(null);
    setRole(null);
    setScopes(EMPTY_SCOPES);
  }, []);

  const value = useMemo<SessionState>(() => {
    const r = session ? role ?? 'member' : null;
    return {
      ready,
      supabaseConfigured: !!supabase,
      requireAuth: requireAuthFlag,
      session,
      userId: session?.user?.id ?? null,
      email: session?.user?.email ?? null,
      household,
      householdId: household?.id ?? null,
      role: r,
      scopes,
      isAdmin: r === 'owner' || r === 'admin',
      refresh,
      signOut,
    };
  }, [ready, session, household, role, scopes, refresh, signOut]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useSession must be used within <SessionProvider>');
  }
  return ctx;
}
