import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe environment guard to skip production scripts and service worker in development/sandbox hosting
const isDev = window.location.hostname === 'localhost' || 
              window.location.hostname === '127.0.0.1' || 
              window.location.hostname.includes('.run.app') || 
              window.location.hostname.includes('webcontainer') || 
              window.location.hostname.includes('stackblitz');

// Handle Service Worker
if ('serviceWorker' in navigator) {
  if (isDev) {
    // Forcefully clean up any stale cached service workers from previous builds in development
    navigator.serviceWorker.getRegistrations().then(registrations => {
      for (const registration of registrations) {
        registration.unregister().then(success => {
          if (success) {
            console.log('Successfully cleared stale service worker registration from sandbox cache.');
          }
        });
      }
    }).catch(err => {
      console.warn('Could not list service worker registrations:', err);
    });
  } else {
    // Only register on production domain
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => console.log('Service Worker registered successfully!', reg.scope))
        .catch(err => console.error('Service Worker registration failed:', err));
    });
  }
}

// Dynamically load Monetag Multitag in production only to avoid sandbox iframe security/block policies
if (!isDev) {
  const monetagScript = document.createElement('script');
  monetagScript.src = 'https://quge5.com/88/tag.min.js';
  monetagScript.setAttribute('data-zone', '245217');
  monetagScript.async = true;
  monetagScript.setAttribute('data-cfasync', 'false');
  monetagScript.onerror = () => {
    console.warn('Monetag multitag failed to load. This is normal if an ad-blocker is active.');
  };
  document.head.appendChild(monetagScript);
}

createRoot(document.getElementById('root')!).render(
  <App />
);
