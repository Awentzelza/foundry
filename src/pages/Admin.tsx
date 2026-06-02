import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import { useHistory } from 'react-router-dom';

import { supabase } from '@/lib/supabase';
import { useSession, type Role, type DataScope } from '@/lib/session';
import { DISPLAY_OVERRIDES } from '@/lib/appRegistry';

interface MemberRow {
  user_id: string;
  role: Role;
  status: 'invited' | 'active';
  email: string | null;
  display_name: string | null;
  joined_at: string | null;
}
interface AppRow {
  id: string;
  name: string;
  data_scope: DataScope;
}
interface GrantRow {
  app_id: string;
  member_user_id: string | null;
}

type ProvMode = 'none' | 'everyone' | 'specific';

function displayName(id: string, fallback: string): string {
  return DISPLAY_OVERRIDES[id]?.name ?? fallback;
}

export default function Admin() {
  const history = useHistory();
  const { ready, isAdmin, role, householdId, household, userId, session, refresh } = useSession();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [apps, setApps] = useState<AppRow[]>([]);
  const [grants, setGrants] = useState<GrantRow[]>([]);
  const [hhName, setHhName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Owner/admin gate — fail closed. Members are bounced to the dashboard.
  useEffect(() => {
    if (ready && !isAdmin) history.replace('/');
  }, [ready, isAdmin, history]);

  const load = useCallback(async () => {
    if (!supabase || !householdId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [m, a, g] = await Promise.all([
      supabase
        .from('household_members')
        .select('user_id, role, status, email, display_name, joined_at')
        .eq('household_id', householdId),
      supabase.from('foundry_apps').select('id, name, data_scope').eq('status', 'active').order('id'),
      supabase.from('app_grants').select('app_id, member_user_id').eq('household_id', householdId),
    ]);
    setMembers((m.data as MemberRow[]) ?? []);
    setApps((a.data as AppRow[]) ?? []);
    setGrants((g.data as GrantRow[]) ?? []);
    setHhName(household?.name ?? '');
    setLoading(false);
  }, [householdId, household]);

  useEffect(() => {
    if (ready && isAdmin) void load();
  }, [ready, isAdmin, load]);

  const activeMembers = useMemo(() => members.filter((m) => m.status === 'active'), [members]);
  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'invited'), [members]);

  // --- Household name -------------------------------------------------
  const saveHouseholdName = useCallback(async () => {
    if (!supabase || !householdId || role !== 'owner') return;
    const name = hhName.trim();
    if (!name) return;
    setBusy('hh');
    const { error: e } = await supabase.from('households').update({ name }).eq('id', householdId);
    if (e) setError(e.message);
    setBusy(null);
    await refresh();
  }, [hhName, householdId, role, refresh]);

  // --- Invite ---------------------------------------------------------
  const invite = useCallback(async () => {
    const email = inviteEmail.trim();
    if (!email || !session) return;
    setBusy('invite');
    setError(null);
    try {
      const res = await fetch('/api/invite', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ householdId, email }),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? 'Invite failed');
      } else {
        setInviteEmail('');
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invite failed');
    }
    setBusy(null);
  }, [inviteEmail, session, householdId, load]);

  // --- Member role / removal -----------------------------------------
  const changeRole = useCallback(
    async (m: MemberRow, next: Role) => {
      if (!supabase || !householdId || role !== 'owner') return;
      if (m.role === 'owner' || m.user_id === userId) return;
      setBusy(m.user_id);
      const { error: e } = await supabase
        .from('household_members')
        .update({ role: next })
        .eq('household_id', householdId)
        .eq('user_id', m.user_id);
      if (e) setError(e.message);
      setBusy(null);
      await load();
    },
    [householdId, role, userId, load],
  );

  const removeMember = useCallback(
    async (m: MemberRow) => {
      if (!supabase || !householdId) return;
      if (m.role === 'owner' || m.user_id === userId) return;
      setBusy(m.user_id);
      const { error: e } = await supabase
        .from('household_members')
        .delete()
        .eq('household_id', householdId)
        .eq('user_id', m.user_id);
      if (e) setError(e.message);
      setBusy(null);
      await load();
    },
    [householdId, userId, load],
  );

  // --- Provisioning ---------------------------------------------------
  const setProvisioning = useCallback(
    async (appId: string, mode: ProvMode, memberIds: string[]) => {
      if (!supabase || !householdId) return;
      setBusy(`prov:${appId}`);
      setError(null);
      // Clear existing grants for this app, then write the new shape.
      const del = await supabase
        .from('app_grants')
        .delete()
        .eq('household_id', householdId)
        .eq('app_id', appId);
      if (del.error) {
        setError(del.error.message);
        setBusy(null);
        return;
      }
      let rows: GrantRow[] = [];
      if (mode === 'everyone') {
        rows = [{ app_id: appId, member_user_id: null }];
      } else if (mode === 'specific') {
        rows = memberIds.map((id) => ({ app_id: appId, member_user_id: id }));
      }
      if (rows.length) {
        const ins = await supabase
          .from('app_grants')
          .insert(rows.map((r) => ({ ...r, household_id: householdId })));
        if (ins.error) setError(ins.error.message);
      }
      setBusy(null);
      await load();
    },
    [householdId, load],
  );

  if (!ready || (ready && !isAdmin)) {
    return (
      <IonPage>
        <IonContent fullscreen>
          <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="" />
          </IonButtons>
          <IonTitle>
            <span className="foundry-app-toolbar-title">Administration</span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="foundry-admin">
          {error ? <p className="foundry-login__error">{error}</p> : null}

          {/* Household */}
          <section className="foundry-admin__section">
            <p className="foundry-admin__eyebrow">Household</p>
            <h2 className="foundry-admin__h">{household?.name ?? 'Household'}</h2>
            {role === 'owner' ? (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="foundry-input"
                  value={hhName}
                  onChange={(e) => setHhName(e.target.value)}
                  placeholder="Household name"
                />
                <button
                  className="foundry-btn"
                  onClick={() => void saveHouseholdName()}
                  disabled={busy === 'hh' || !hhName.trim()}
                >
                  Save
                </button>
              </div>
            ) : null}
            <p className="foundry-admin__note">
              {activeMembers.length} member{activeMembers.length === 1 ? '' : 's'}.
            </p>
          </section>

          {/* Members */}
          <section className="foundry-admin__section">
            <p className="foundry-admin__eyebrow">Members</p>
            <h2 className="foundry-admin__h">People</h2>

            {activeMembers.map((m) => {
              const isSelf = m.user_id === userId;
              const locked = m.role === 'owner' || isSelf;
              return (
                <div className="foundry-row" key={m.user_id}>
                  <div className="foundry-row__main">
                    <span className="foundry-row__name">
                      {m.display_name || m.email || m.user_id.slice(0, 8)}
                    </span>
                    <span className="foundry-row__sub">
                      {(m.email ?? '').toUpperCase()}
                      {m.joined_at ? ` · JOINED ${m.joined_at.slice(0, 10)}` : ''}
                    </span>
                  </div>
                  <div className="foundry-row__actions">
                    {role === 'owner' && !locked ? (
                      <select
                        className="foundry-select"
                        value={m.role}
                        onChange={(e) => void changeRole(m, e.target.value as Role)}
                        disabled={busy === m.user_id}
                      >
                        <option value="member">member</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className={`foundry-badge${m.role === 'owner' ? ' foundry-badge--accent' : ''}`}>
                        {m.role}
                      </span>
                    )}
                    {!locked ? (
                      <button
                        className="foundry-btn foundry-btn--quiet"
                        onClick={() => void removeMember(m)}
                        disabled={busy === m.user_id}
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}

            {pendingMembers.length ? (
              <>
                <p className="foundry-admin__eyebrow" style={{ marginTop: 18 }}>Pending invites</p>
                {pendingMembers.map((m) => (
                  <div className="foundry-row" key={m.user_id}>
                    <div className="foundry-row__main">
                      <span className="foundry-row__name">{m.email || m.user_id.slice(0, 8)}</span>
                      <span className="foundry-row__sub">INVITED · {m.role.toUpperCase()}</span>
                    </div>
                    <div className="foundry-row__actions">
                      <button
                        className="foundry-btn foundry-btn--quiet"
                        onClick={() => void removeMember(m)}
                        disabled={busy === m.user_id}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
              </>
            ) : null}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input
                className="foundry-input"
                type="email"
                placeholder="invite by email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
              <button
                className="foundry-btn"
                onClick={() => void invite()}
                disabled={busy === 'invite' || !inviteEmail.trim()}
              >
                {busy === 'invite' ? 'Sending' : 'Invite'}
              </button>
            </div>
          </section>

          {/* Apps & provisioning */}
          <section className="foundry-admin__section">
            <p className="foundry-admin__eyebrow">Apps &amp; provisioning</p>
            <h2 className="foundry-admin__h">Who can open what</h2>
            {loading ? (
              <IonSpinner name="crescent" />
            ) : (
              apps.map((app) => (
                <AppProvisioning
                  key={app.id}
                  app={app}
                  members={activeMembers}
                  grants={grants.filter((g) => g.app_id === app.id)}
                  busy={busy === `prov:${app.id}`}
                  onChange={(mode, ids) => void setProvisioning(app.id, mode, ids)}
                />
              ))
            )}
            <p className="foundry-admin__note">
              Revoking a grant hides an app — it never deletes data. Personal rows
              stay in place and reappear if you re-grant.
            </p>
          </section>

          {/* Data scope (read-only) */}
          <section className="foundry-admin__section">
            <p className="foundry-admin__eyebrow">App data scope</p>
            <h2 className="foundry-admin__h">Whose data each app holds</h2>
            {apps.map((app) => (
              <div className="foundry-row" key={app.id}>
                <div className="foundry-row__main">
                  <span className="foundry-row__name">{displayName(app.id, app.name)}</span>
                </div>
                <span className={`foundry-badge${app.data_scope === 'shared' ? ' foundry-badge--accent' : ''}`}>
                  {app.data_scope}
                </span>
              </div>
            ))}
            <p className="foundry-admin__note">
              Scope is fixed when an app is created. Changing it after data exists
              is a real migration (one shared row vs one per member), not a toggle,
              so it is read-only here.
            </p>
          </section>
        </div>
      </IonContent>
    </IonPage>
  );
}

/** Per-app provisioning control. */
function AppProvisioning({
  app,
  members,
  grants,
  busy,
  onChange,
}: {
  app: AppRow;
  members: MemberRow[];
  grants: GrantRow[];
  busy: boolean;
  onChange: (mode: ProvMode, memberIds: string[]) => void;
}) {
  const hasEveryone = grants.some((g) => g.member_user_id == null);
  const specificIds = grants.filter((g) => g.member_user_id != null).map((g) => g.member_user_id as string);
  const mode: ProvMode = hasEveryone ? 'everyone' : specificIds.length ? 'specific' : 'none';

  return (
    <div className="foundry-prov">
      <div className="foundry-prov__head">
        <span className="foundry-row__name">{displayName(app.id, app.name)}</span>
        <span className={`foundry-badge${app.data_scope === 'shared' ? ' foundry-badge--accent' : ''}`}>
          {app.data_scope}
        </span>
      </div>
      <div className="foundry-prov__modes">
        <label className="foundry-prov__mode">
          <input
            type="radio"
            name={`prov-${app.id}`}
            checked={mode === 'none'}
            onChange={() => onChange('none', [])}
            disabled={busy}
          />
          No one
        </label>
        <label className="foundry-prov__mode">
          <input
            type="radio"
            name={`prov-${app.id}`}
            checked={mode === 'everyone'}
            onChange={() => onChange('everyone', [])}
            disabled={busy}
          />
          Everyone in household
        </label>
        <label className="foundry-prov__mode">
          <input
            type="radio"
            name={`prov-${app.id}`}
            checked={mode === 'specific'}
            onChange={() => onChange('specific', specificIds)}
            disabled={busy}
          />
          Specific members
        </label>
      </div>
      {mode === 'specific' ? (
        <div className="foundry-prov__members">
          {members.map((m) => {
            const checked = specificIds.includes(m.user_id);
            return (
              <label className="foundry-check" key={m.user_id}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={busy}
                  onChange={() => {
                    const next = checked
                      ? specificIds.filter((id) => id !== m.user_id)
                      : [...specificIds, m.user_id];
                    onChange('specific', next);
                  }}
                />
                {m.display_name || m.email || m.user_id.slice(0, 8)}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
