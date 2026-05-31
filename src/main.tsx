import React from 'react';
import { createRoot } from 'react-dom/client';
import { setupIonicReact } from '@ionic/react';

import App from './App';

// Ionic core CSS
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

// Optional Ionic utility CSS
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

// Foundry theme overrides — load after Ionic so our tokens win.
import './theme/variables.css';
import './theme/global.css';

setupIonicReact({
  mode: 'ios',
  rippleEffect: false,
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Foundry: #root element missing from index.html');

createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
