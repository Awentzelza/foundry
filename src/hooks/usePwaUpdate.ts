/**
 * Foundry PWA update lifecycle.
 *
 * - Detects when a new service worker has installed in the background.
 * - Re-checks for updates every time the tab becomes visible (so opening the
 *   PWA from the home screen always sees the freshest version after a push).
 * - Exposes `forceRefresh()` for a manual button: kicks the waiting SW to
 *   skipWaiting, clears all caches, then hard-reloads.
 * - When a new SW takes control via `controllerchange`, reloads once
 *   automatically so the UI catches up without the user noticing.
 *
 * Plays nicely with vite-plugin-pwa's `registerType: 'autoUpdate'`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

type UpdateState = 'idle' | 'available' | 'updating';

interface UsePwaUpdate {
  state: UpdateState;
  /** True if there's a waiting service worker ready to take over. */
  updateAvailable: boolean;
  /** Manually trigger an update: clear caches + reload. */
  forceRefresh: () => Promise<void>;
}

export function usePwaUpdate(): UsePwaUpdate {
  const [state, setState] = useState<UpdateState>('idle');
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }
    let cancelled = false;
    let reg: ServiceWorkerRegistration | null = null;

    const onUpdateFound = () => {
      if (!reg) return;
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener('statechange', () => {
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          if (!cancelled) setState('available');
        }
      });
    };

    void navigator.serviceWorker.getRegistration().then((r) => {
      if (cancelled || !r) return;
      reg = r;
      r.addEventListener('updatefound', onUpdateFound);
      // Edge case: there's already a waiting SW from a previous session.
      if (r.waiting && navigator.serviceWorker.controller) {
        setState('available');
      }
    });

    // When the active SW changes, the new bundle is in control. Reload once
    // so the UI matches.
    const onControllerChange = () => {
      if (reloadingRef.current) return;
      reloadingRef.current = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

    // Re-check for updates whenever the tab becomes visible — covers the
    // "open from home screen" case where SW caches may be days old.
    const onVisibility = () => {
      if (document.visibilityState !== 'visible') return;
      void navigator.serviceWorker.getRegistration().then((r) => r?.update());
    };
    document.addEventListener('visibilitychange', onVisibility);

    // Initial nudge.
    void navigator.serviceWorker.getRegistration().then((r) => r?.update());

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibility);
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      if (reg) reg.removeEventListener('updatefound', onUpdateFound);
    };
  }, []);

  const forceRefresh = useCallback(async () => {
    setState('updating');
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg?.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
        // Ask the SW to check immediately as well.
        await reg?.update();
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
    } finally {
      // Hard reload — even if no SW was waiting, this fetches fresh HTML.
      window.location.reload();
    }
  }, []);

  return {
    state,
    updateAvailable: state === 'available',
    forceRefresh,
  };
}
