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

import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { findApp } from '@/apps/registry';
import { withDisplay } from '@/lib/appRegistry';
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
            <span className="foundry-app-toolbar-title">{withDisplay(app.meta).name}</span>
          </IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <div className="foundry-app-scope" data-app={app.meta.id}>
          <AppErrorBoundary appId={app.meta.id}>
            <Suspense
              fallback={
                <div style={{ display: 'grid', placeItems: 'center', padding: 64 }}>
                  <IonSpinner name="crescent" />
                </div>
              }
            >
              <LazyApp />
            </Suspense>
          </AppErrorBoundary>
        </div>
      </IonContent>
    </IonPage>
  );
}
