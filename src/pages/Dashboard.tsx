import { useEffect, useState } from 'react';
import { IonContent, IonPage } from '@ionic/react';
import { useHistory } from 'react-router-dom';

import { loadActiveApps } from '@/lib/appRegistry';
import type { RegisteredApp } from '@/types/app';
import AppTile from '@/components/AppTile';
import EmptyForge from '@/components/EmptyForge';

export default function Dashboard() {
  const history = useHistory();
  const [apps, setApps] = useState<RegisteredApp[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadActiveApps().then((list) => {
      if (!cancelled) setApps(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <IonPage>
      <IonContent fullscreen>
        <header className="foundry-header">
          <div>
            <p className="foundry-header__subtitle">The Foundry</p>
            <h1 className="foundry-header__title">
              Tools, <em>forged</em>.
            </h1>
          </div>
        </header>

        {apps === null ? null : apps.length === 0 ? (
          <EmptyForge />
        ) : (
          <div className="foundry-grid">
            {apps.map((app) => (
              <AppTile
                key={app.meta.id}
                meta={app.meta}
                onClick={() => history.push(`/app/${app.meta.id}`)}
              />
            ))}
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
