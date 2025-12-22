import { ReactNode, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  showCloseButton?: boolean;
}

/**
 * BottomSheet - Mobile-friendly alternative to modals
 * Slides up from the bottom on mobile, centers on desktop
 */
export function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  showCloseButton = true,
}: BottomSheetProps) {
  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'md:max-w-md',
    md: 'md:max-w-2xl',
    lg: 'md:max-w-4xl',
    full: 'md:max-w-full md:m-4',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`
          fixed z-[101]
          bottom-0 left-0 right-0
          md:bottom-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2
          ${sizeClasses[size]}
          max-h-[90vh] md:max-h-[85vh]
          rounded-t-3xl md:rounded-2xl
          glass-card-outline border-t md:border border-white/10
          overflow-hidden
          animate-slide-up md:animate-fade-in
        `}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-black/20">
            {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
            {!title && <div />}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="
                  p-2 rounded-lg
                  hover:bg-white/10 active:bg-white/20
                  transition-colors touch-target
                "
                aria-label="Close"
              >
                <XMarkIcon className="w-6 h-6 text-white/80" />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-80px)] md:max-h-[calc(85vh-80px)]">
          {children}
        </div>

        {/* Safe area padding for bottom */}
        <div className="h-[env(safe-area-inset-bottom)] md:hidden" />
      </div>
    </>
  );
}
