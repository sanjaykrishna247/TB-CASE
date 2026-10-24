import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import 'lenis/dist/lenis.css';
import './index.css';
import App from './App';

// Separate endpoint: /simulation (or #/simulation) opens the clinical simulation
const SimulationApp = lazy(() => import('./sim/SimulationApp'));
const path = window.location.pathname.replace(/\/+$/, '');
const isSim = path.endsWith('/simulation') || window.location.hash === '#/simulation';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {isSim ? (
      <Suspense fallback={<div style={{ background: '#0D0F10', height: '100vh' }} />}>
        <SimulationApp />
      </Suspense>
    ) : (
      <App />
    )}
  </React.StrictMode>
);
