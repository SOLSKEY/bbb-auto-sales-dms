import { useState, useEffect, useCallback } from 'react';

/**
 * Service Worker Hook
 *
 * Provides:
 * - Service worker registration
 * - Update detection
 * - Method to apply updates
 * - Offline detection
 */

interface ServiceWorkerState {
  isUpdateAvailable: boolean;
  isOffline: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Hook to manage service worker registration and updates
 */
export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isUpdateAvailable: false,
    isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    registration: null,
  });

  // Apply the pending update and reload
  const applyUpdate = useCallback(() => {
    if (state.registration?.waiting) {
      // Send message to SW to skip waiting
      state.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    // Reload the page to get new version
    window.location.reload();
  }, [state.registration]);

  // Dismiss the update notification without applying
  const dismissUpdate = useCallback(() => {
    setState((prev) => ({ ...prev, isUpdateAvailable: false }));
  }, []);

  useEffect(() => {
    // Skip if service workers not supported or in SSR
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('[SW] Service workers not supported');
      return;
    }

    // Skip in development mode (Vite HMR handles updates)
    const isProduction = (import.meta as any).env?.PROD || window.location.hostname !== 'localhost';
    if (!isProduction) {
      console.log('[SW] Skipping service worker in development mode');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[SW] Service worker registered:', registration.scope);

        setState((prev) => ({ ...prev, registration }));

        // Check for updates on registration
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New version available
              console.log('[SW] New version available');
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });

        // Check if there's already a waiting worker
        if (registration.waiting && navigator.serviceWorker.controller) {
          setState((prev) => ({ ...prev, isUpdateAvailable: true }));
        }

        // Listen for controllerchange to reload when SW takes over
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          // Only reload if we explicitly triggered the update
          // (prevents reload on initial SW install)
          if (state.isUpdateAvailable) {
            window.location.reload();
          }
        });

        // Periodically check for updates (every 60 seconds)
        const checkInterval = setInterval(() => {
          registration.update().catch(console.error);
        }, 60 * 1000);

        return () => clearInterval(checkInterval);
      } catch (error) {
        console.error('[SW] Registration failed:', error);
      }
    };

    registerSW();

    // Online/offline detection
    const handleOnline = () => setState((prev) => ({ ...prev, isOffline: false }));
    const handleOffline = () => setState((prev) => ({ ...prev, isOffline: true }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    /** Whether a new version is available */
    isUpdateAvailable: state.isUpdateAvailable,
    /** Whether the browser is offline */
    isOffline: state.isOffline,
    /** Apply the pending update and reload the page */
    applyUpdate,
    /** Dismiss the update notification */
    dismissUpdate,
  };
}
