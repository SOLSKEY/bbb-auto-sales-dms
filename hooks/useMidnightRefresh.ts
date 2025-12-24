import { useEffect, useRef, useCallback } from 'react';
import { useUserActivity, hasAnyUnsavedChanges } from './useUserActivity';

/**
 * Midnight CST Auto-Refresh Hook
 *
 * Automatically refreshes the page when the date changes to the next day
 * in Central Standard Time (America/Chicago timezone).
 *
 * Features:
 * - Handles DST transitions correctly
 * - Uses heartbeat check every 60 seconds (handles laptop sleep drift)
 * - Defers refresh if user has unsaved changes or is actively typing
 * - Only refreshes when user is idle
 */

const CST_TIMEZONE = 'America/Chicago';

/**
 * Get current date string in CST (YYYY-MM-DD format)
 */
function getCurrentDateCST(): string {
  const now = new Date();
  // toLocaleDateString with 'en-CA' locale returns YYYY-MM-DD format
  return now.toLocaleDateString('en-CA', { timeZone: CST_TIMEZONE });
}

/**
 * Get milliseconds until midnight in CST timezone
 * Handles DST transitions correctly using Intl.DateTimeFormat
 */
function getMsUntilMidnightCST(): number {
  const now = new Date();

  // Get current time components in CST
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: CST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  const currentHour = getPart('hour');
  const currentMinute = getPart('minute');
  const currentSecond = getPart('second');

  // Calculate seconds until midnight CST
  const secondsUntilMidnight =
    (24 - currentHour - 1) * 3600 + (60 - currentMinute - 1) * 60 + (60 - currentSecond);

  return secondsUntilMidnight * 1000;
}

interface UseMidnightRefreshOptions {
  /** Callback when day changes (before refresh) */
  onDayChange?: () => void;
  /** Whether to skip refresh if user is busy. Default: true */
  skipRefreshIfBusy?: boolean;
  /** Whether to enable the hook. Default: true */
  enabled?: boolean;
}

/**
 * Hook to automatically refresh the page at midnight CST
 * with protection for unsaved form data
 */
export function useMidnightRefresh(options: UseMidnightRefreshOptions = {}) {
  const { onDayChange, skipRefreshIfBusy = true, enabled = true } = options;

  const { isIdle, isSafeToRefresh } = useUserActivity({ idleThresholdMs: 5 * 60 * 1000 });
  const lastDateRef = useRef<string>(getCurrentDateCST());
  const pendingRefreshRef = useRef<boolean>(false);

  // Check if day has changed
  const checkDayChange = useCallback(() => {
    const currentDate = getCurrentDateCST();

    if (currentDate !== lastDateRef.current) {
      console.log('[MidnightRefresh] Day changed from', lastDateRef.current, 'to', currentDate);
      lastDateRef.current = currentDate;

      // Call optional callback
      onDayChange?.();

      // Check if safe to refresh
      if (skipRefreshIfBusy && !isSafeToRefresh()) {
        console.log(
          '[MidnightRefresh] User is busy or has unsaved changes. Deferring refresh.'
        );
        pendingRefreshRef.current = true;
        return;
      }

      // Perform the refresh
      console.log('[MidnightRefresh] Refreshing page for new day...');
      window.location.reload();
    }
  }, [onDayChange, skipRefreshIfBusy, isSafeToRefresh]);

  // Handle deferred refresh when user becomes idle
  useEffect(() => {
    if (pendingRefreshRef.current && isIdle && !hasAnyUnsavedChanges()) {
      console.log('[MidnightRefresh] User is now idle. Executing deferred refresh.');
      pendingRefreshRef.current = false;
      window.location.reload();
    }
  }, [isIdle]);

  useEffect(() => {
    // Skip if disabled or in export mode
    if (!enabled || (window as any).IS_EXPORT_MODE) return;

    console.log('[MidnightRefresh] Initializing midnight refresh hook');
    console.log('[MidnightRefresh] Current CST date:', getCurrentDateCST());

    const msUntilMidnight = getMsUntilMidnightCST();
    console.log(
      '[MidnightRefresh] Ms until midnight:',
      msUntilMidnight,
      '(',
      Math.round(msUntilMidnight / 1000 / 60),
      'minutes)'
    );

    // Heartbeat check every 60 seconds
    // This handles setTimeout drift from laptop sleep
    const heartbeatInterval = setInterval(() => {
      checkDayChange();
    }, 60 * 1000);

    // Also schedule a check close to midnight
    // Add a small buffer (5 seconds) to ensure we're past midnight
    const checkTime = msUntilMidnight + 5000;
    const midnightTimeout = setTimeout(() => {
      checkDayChange();
    }, checkTime);

    return () => {
      clearInterval(heartbeatInterval);
      clearTimeout(midnightTimeout);
    };
  }, [enabled, checkDayChange]);

  return {
    /** Current date in CST (YYYY-MM-DD) */
    currentDateCST: getCurrentDateCST(),
    /** Whether there's a pending refresh waiting for user to become idle */
    hasPendingRefresh: pendingRefreshRef.current,
  };
}

// Export utility functions for use elsewhere
export { getCurrentDateCST, getMsUntilMidnightCST };
