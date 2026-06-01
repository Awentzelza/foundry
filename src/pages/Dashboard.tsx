import { useEffect, useState } from 'react';
import { IonContent, IonIcon, IonPage } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import { refreshOutline } from 'ionicons/icons';

import { loadActiveApps } from '@/lib/appRegistry';
import type { RegisteredApp } from '@/types/app';
import AppTile from '@/components/AppTile';
import EmptyForge from '@/components/EmptyForge';
import { usePwaUpdate } from '@/hooks/usePwaUpdate';

export default function Dashboard() {
  const history = useHistory();
  const [apps, setApps] = useState<RegisteredApp[] | null>(null);
  const { updateAvailable, forceRefresh } = usePwaUpdate();

  useEffect(() => {
    let cancelled = false;
    const reload = () => {
      loadActiveApps().then((list) => {
        if (!cancelled) setApps(list);
      });
    };
    reload();
    // Re-fetch when the tab regains focus so apps archived/pushed elsewhere
    // (e.g. via the Foundry MCP) show up without a hard reload.
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
  }, []);

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
          <button
            type="button"
            className={`foundry-refresh${updateAvailable ? ' foundry-refresh--available' : ''}`}
            onClick={() => void forceRefresh()}
            aria-label={updateAvailable ? 'New version available — tap to update' : 'Refresh'}
            title={updateAvailable ? 'New version available' : 'Check for updates'}
          >
            <IonIcon icon={refreshOutline} />
          </button>
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
