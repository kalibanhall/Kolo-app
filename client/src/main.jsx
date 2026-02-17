import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { initGA } from './utils/analytics'

// Initialize Google Analytics
initGA();

// Register Service Worker for PWA — with forced update on new versions
if ('serviceWorker' in navigator) {
  // Listen for messages from SW
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'CACHES_CLEARED') {
      window.location.reload();
    }
  });

  window.addEventListener('load', async () => {
    try {
      // Force clear old caches on every page load
      if (window.caches) {
        const cacheNames = await caches.keys();
        // Keep only the latest cache
        const oldCaches = cacheNames.filter(name => !name.includes('2026-02-17'));
        await Promise.all(oldCaches.map(name => caches.delete(name)));
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        updateViaCache: 'none' // CRITICAL: never use HTTP cache for SW script
      });

      // Check for updates immediately, then every 30 seconds
      registration.update();
      setInterval(() => registration.update(), 30 * 1000);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New version available — activate it immediately
            newWorker.postMessage({ type: 'SKIP_WAITING' });
            // Small delay to let the new SW take over, then reload
            setTimeout(() => window.location.reload(), 300);
          }
        });
      });

      // If there's already a waiting SW, activate it
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        setTimeout(() => window.location.reload(), 300);
      }
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