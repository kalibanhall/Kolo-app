import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initGA } from './utils/analytics'

// Initialize Google Analytics
initGA();

// Register Service Worker for PWA — with forced update on new versions
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // CRITICAL: never use HTTP cache for SW script
      });

      // Check for updates immediately, then every 60 seconds
      registration.update();
      setInterval(() => registration.update(), 60 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate it immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            // Reload to get fresh assets
            window.location.reload();
          }
        });
      });
    } catch (error) {
      console.error('SW registration failed:', error);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)