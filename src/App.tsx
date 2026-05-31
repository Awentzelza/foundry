import { IonApp, IonRouterOutlet } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Redirect, Route } from 'react-router-dom';

import Dashboard from './pages/Dashboard';
import AppHost from './pages/AppHost';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <IonApp>
      <IonReactRouter>
        <IonRouterOutlet>
          <Route exact path="/" component={Dashboard} />
          <Route exact path="/app/:appId" component={AppHost} />
          <Route exact path="/404" component={NotFound} />
          <Redirect to="/404" />
        </IonRouterOutlet>
      </IonReactRouter>
    </IonApp>
  );
}
