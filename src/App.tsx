import { IonApp, IonRouterOutlet, IonSpinner } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';

import { SessionProvider, useSession } from './lib/session';
import Dashboard from './pages/Dashboard';
import AppHost from './pages/AppHost';
import Admin from './pages/Admin';
import Login from './pages/Login';
import NotFound from './pages/NotFound';

/**
 * Auth gate. Enforced only when VITE_REQUIRE_AUTH is on (Phase 2). Until then
 * the app is auth-optional: an unauthenticated visitor falls straight through
 * to the routes, exactly as the single-tenant version behaved — so there's no
 * way to get locked out mid-rollout.
 */
function Gate() {
  const { ready, supabaseConfigured, requireAuth, session } = useSession();

  if (!ready) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}>
        <IonSpinner name="crescent" />
      </div>
    );
  }

  if (requireAuth && supabaseConfigured && !session) {
    return <Login />;
  }

  return (
    <IonRouterOutlet>
      <Route exact path="/" component={Dashboard} />
      <Route exact path="/login" component={Login} />
      <Route exact path="/admin" component={Admin} />
      <Route exact path="/app/:appId" component={AppHost} />
      <Route exact path="/404" component={NotFound} />
      <Redirect to="/404" />
    </IonRouterOutlet>
  );
}

export default function App() {
  return (
    <IonApp>
      <SessionProvider>
        <IonReactRouter>
          <Gate />
        </IonReactRouter>
      </SessionProvider>
    </IonApp>
  );
}
