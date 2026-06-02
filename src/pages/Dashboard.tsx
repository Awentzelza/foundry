import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { refreshOutline, settingsOutline } from 'ionicons/icons';

import { loadActiveApps } from '@/lib/appRegistry';
import { useSession } from '@/lib/session';
import type { RegisteredApp } from '@/types/app';
import AppTile from '@/components/AppTile';
import EmptyForge from '@/components/EmptyForge';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';

export default function Dashboard() {
  const history = useHistory();
  const [apps, setApps] = useState<RegisteredApp[] | null>(null);
  const { updateAvailable, forceRefresh } = usePwaUpdate();
  const { ready, session, supabaseConfigured, householdId, userId, role, isAdmin } = useSession();

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    const reload = () => {
      loadActiveApps({ signedIn: !!session, householdId, userId, role }).then((list) => {
        if (!cancelled) setApps(list);
      });
    };
    reload();
    // Re-fetch when the tab regains focus so apps archived/pushed/provisioned
    // elsewhere show up without a hard reload.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', reload);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', reload);
    };
  }, [ready, session, householdId, userId, role]);

  return (
    <IonPage>
      <IonContent fullscreen>
        <header className="foundry-header">
          <div className="foundry-header__lockup">
            <span className="foundry-mark" aria-hidden>
              <span className="foundry-mark__f">F</span>
            </span>
            <div className="foundry-header__words">
              <p className="foundry-header__eyebrow">Private · Established 2026</p>
              <h1 className="foundry-header__title">Foundry</h1>
            </div>
          </div>
          <div className="foundry-header__actions">
            {supabaseConfigured && !session ? (
              <button
                type="button"
                className="foundry-btn foundry-btn--quiet"
                onClick={() => history.push('/login')}
              >
                Sign in
              </button>
            ) : null}
            {isAdmin ? (
              <button
                type="button"
                className="foundry-refresh"
                onClick={() => history.push('/admin')}
                aria-label="Administration"
                title="Administration"
              >
                <IonIcon icon={settingsOutline} />
              </button>
            ) : null}
            <button
              type="button"
              className={`foundry-refresh${updateAvailable ? ' foundry-refresh--available' : ''}`}
              onClick={() => void forceRefresh()}
              aria-label={updateAvailable ? 'New version available — tap to update' : 'Refresh'}
              title={updateAvailable ? 'New version available' : 'Check for updates'}
            >
              <IonIcon icon={refreshOutline} />
            </button>
          </div>
        </header>

        {apps === null ? null : apps.length === 0 ? (
          <EmptyForge />
        ) : (
          <div className="foundry-grid">
            {apps.map((app, i) => (
              <AppTile
                key={app.meta.id}
                meta={app.meta}
                index={i + 1}
                onClick={() => history.push(`/app/${app.meta.id}`)}
              />
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
