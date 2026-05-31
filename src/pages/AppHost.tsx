import { lazy, Suspense, useMemo } from 'react';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonPage,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/react';
import { useParams } from 'react-router-dom';

import { findApp } from '@/apps/registry';
import NotFound from './NotFound';

interface RouteParams {
  appId: string;
}

export default function AppHost() {
  const { appId } = useParams<RouteParams>();
  const app = findApp(appId);

  // Lazy-load the app component once we know the id.
  const LazyApp = useMemo(() => {
    if (!app) return null;
    return lazy(app.load);
  }, [app]);

  if (!app || !LazyApp) {
    return <NotFound />;
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" text="" />
          </IonButtons>
          <IonTitle>
            <span className="foundry-app-toolbar-title">
              <span aria-hidden style={{ marginRight: 8 }}>{app.meta.icon}</span>
              {app.meta.name}
            </span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <Suspense
          fallback={
            <div style={{ display: 'grid', placeItems: 'center', padding: 64 }}>
              <IonSpinner name="crescent" />
            </div>
          }
        >
          <LazyApp />
        </Suspense>
      </IonContent>
    </IonPage>
  );
}
