import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * User Activity & Unsaved Changes Detection Hook
 *
 * Provides:
 * - Idle detection (no activity for X minutes)
 * - Global registry for tracking components with unsaved changes
 * - Helper to determine if it's safe to refresh the page
 */

// Events that indicate user activity
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'keypress',
  'scroll',
  'touchstart',
  'click',
  'input',
  'change',
] as const;

// Global registry for components with unsaved changes
const unsavedChangesRegistry = new Set<string>();

/**
 * Register a component as having unsaved changes
 * Call this when a form becomes "dirty"
 */
export function registerUnsavedChanges(componentId: string): void {
  unsavedChangesRegistry.add(componentId);
  window.dispatchEvent(new CustomEvent('unsavedChangesUpdate'));
}

/**
 * Unregister a component's unsaved changes
 * Call this when a form is saved or closed
 */
export function unregisterUnsavedChanges(componentId: string): void {
  unsavedChangesRegistry.delete(componentId);
  window.dispatchEvent(new CustomEvent('unsavedChangesUpdate'));
}

/**
 * Check if any component has unsaved changes
 */
export function hasAnyUnsavedChanges(): boolean {
  return unsavedChangesRegistry.size > 0;
}

/**
 * Get list of components with unsaved changes (for debugging)
 */
export function getUnsavedChangesComponents(): string[] {
  return Array.from(unsavedChangesRegistry);
}

interface UserActivityState {
  isIdle: boolean;
  lastActivity: number;
  hasUnsavedChanges: boolean;
}

interface UseUserActivityOptions {
  /** Time in milliseconds before user is considered idle. Default: 5 minutes */
  idleThresholdMs?: number;
}

/**
 * Hook to track user activity and unsaved changes
 */
export function useUserActivity(options: UseUserActivityOptions = {}) {
  const { idleThresholdMs = 5 * 60 * 1000 } = options; // 5 minutes default

  const [state, setState] = useState<UserActivityState>({
    isIdle: false,
    lastActivity: Date.now(),
    hasUnsavedChanges: false,
  });

  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update activity timestamp and reset idle timer
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setState((prev) => ({
      ...prev,
      isIdle: false,
      lastActivity: now,
    }));

    // Reset idle timer
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(() => {
      setState((prev) => ({ ...prev, isIdle: true }));
    }, idleThresholdMs);
  }, [idleThresholdMs]);

  // Check for unsaved changes
  const checkUnsavedChanges = useCallback(() => {
    setState((prev) => ({
      ...prev,
      hasUnsavedChanges: hasAnyUnsavedChanges(),
    }));
  }, []);

  useEffect(() => {
    // Initial activity check
    updateActivity();

    // Listen for activity events
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, updateActivity, { passive: true });
    });

    // Listen for unsaved changes updates
    window.addEventListener('unsavedChangesUpdate', checkUnsavedChanges);

    return () => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, updateActivity);
      });
      window.removeEventListener('unsavedChangesUpdate', checkUnsavedChanges);
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [updateActivity, checkUnsavedChanges]);

  // Check if it's safe to refresh the page
  const isSafeToRefresh = useCallback((): boolean => {
    // Not safe if user has unsaved changes
    if (hasAnyUnsavedChanges()) {
      return false;
    }
    // Safe if user is idle (no activity for threshold period)
    return state.isIdle;
  }, [state.isIdle]);

  return {
    /** Whether the user is currently idle (no activity for threshold period) */
    isIdle: state.isIdle,
    /** Timestamp of last user activity */
    lastActivity: state.lastActivity,
    /** Whether any component has unsaved changes */
    hasUnsavedChanges: state.hasUnsavedChanges,
    /** Returns true if it's safe to refresh (user is idle AND no unsaved changes) */
    isSafeToRefresh,
    /** Manually trigger an activity update */
    updateActivity,
  };
}
