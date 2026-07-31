import React from 'react';
import ReactDOM from 'react-dom/client';
import './styles/tokens.css';
import './styles/components.css';
import './index.css';
import App from './App';
// mobile.css por último: os overrides de iOS precisam vencer o CSS dos módulos
import './styles/mobile.css';
import reportWebVitals from './reportWebVitals';
import { logger } from './utils/logger';
import { registerServiceWorker } from './pwa/serviceWorkerRegistration';
import { setupPlatform } from './pwa/platform';
import PwaExtras from './pwa/PwaExtras';

setupPlatform();

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
    <PwaExtras />
  </React.StrictMode>
);

registerServiceWorker();

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(logger.debug))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
