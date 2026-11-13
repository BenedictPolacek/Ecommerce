import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { initSentry, reactErrorHandler } from './lib/sentry';
import './index.css';

// Before the first render, so errors during start-up are reported too
initSentry();

createRoot(document.getElementById('root')!, {
  // Route errors are reported by RouteErrorPage; this catches errors outside the router
  onUncaughtError: reactErrorHandler(),
}).render(
  <StrictMode>
    <App />
  </StrictMode>
);
