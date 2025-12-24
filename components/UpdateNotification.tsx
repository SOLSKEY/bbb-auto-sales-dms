import React from 'react';
import { Button } from '@/components/ui/liquid-glass-button';

/**
 * Update Notification Component
 *
 * Displays a toast notification when a new version of the app is available.
 * Shows a "Refresh" button to apply the update.
 */

interface UpdateNotificationProps {
  /** Callback to apply the update and reload */
  onRefresh: () => void;
  /** Callback to dismiss the notification */
  onDismiss?: () => void;
}

export const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  onRefresh,
  onDismiss,
}) => {
  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-4 rounded-xl
                 border border-cyan-500/30 bg-slate-900/95 px-5 py-4
                 shadow-lg shadow-cyan-500/10 backdrop-blur-xl
                 animate-in slide-in-from-bottom-4 duration-300"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-500/20">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="h-5 w-5 text-cyan-400"
          >
            <path
              fillRule="evenodd"
              d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="font-medium text-white">New version available</p>
          <p className="text-sm text-slate-400">Click refresh to update</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {onDismiss && (
          <Button
            onClick={onDismiss}
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white"
          >
            Later
          </Button>
        )}
        <Button
          onClick={onRefresh}
          variant="cool"
          size="sm"
          className="bg-cyan-600 hover:bg-cyan-500"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};
