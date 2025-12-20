import { useState, ReactNode, useContext, useRef, useEffect } from 'react';
import { MobileTabBar } from './MobileTabBar';
import { OverflowBottomSheet } from './OverflowBottomSheet';
import { useLocation } from 'react-router-dom';
import { DataContext } from '../../App';

interface MobileLayoutProps {
  children: ReactNode;
  onSignOut: () => void;
}

const PATH_TITLE_MAP: Record<string, string> = {
  '/': 'Dashboard',
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory',
  '/sales': 'Sales',
  '/sale-prep': 'Sale Prep',
  '/collections': 'Collections',
  '/reports': 'Reports',
  '/data': 'Data',
  '/calendar': 'Calendar',
  '/appointments-leads': 'Appointments & Leads',
  '/team-chat': 'Team Chat',
  '/messaging': 'Messaging',
  '/dashboard/crm': 'CRM',
  '/crm': 'CRM',
  '/settings': 'Settings',
  '/account-settings': 'Account Settings',
  '/admin': 'Admin Dashboard',
  '/admin/create-user': 'Create User',
  '/admin/users': 'Manage Users',
};

export function MobileLayout({ children, onSignOut }: MobileLayoutProps) {
  const [isMoreSheetOpen, setIsMoreSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const location = useLocation();
  const dataContext = useContext(DataContext);
  const mainRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number>(0);
  const scrollTop = useRef<number>(0);
  const isPulling = useRef<boolean>(false);
  const pullDistanceRef = useRef<number>(0);
  const isRefreshingRef = useRef<boolean>(false);

  // Keep refs in sync with state
  useEffect(() => {
    isRefreshingRef.current = isRefreshing;
  }, [isRefreshing]);

  // Don't show tab bar on login page or print pages
  const hideTabBar = location.pathname === '/login' || location.pathname.startsWith('/print');

  // Get page title from pathname
  const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
  const pageTitle = PATH_TITLE_MAP[normalizedPath] || 'Dashboard';

  // Pull to refresh handlers
  useEffect(() => {
    const mainElement = mainRef.current;
    if (!mainElement || hideTabBar) return;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY.current = e.touches[0].clientY;
      scrollTop.current = mainElement.scrollTop;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentScrollTop = mainElement.scrollTop;
      const touchY = e.touches[0].clientY;
      const deltaY = touchY - touchStartY.current;

      // Only trigger pull-to-refresh if at the top of the scroll and not already refreshing
      if (currentScrollTop <= 5 && deltaY > 0 && !isRefreshingRef.current) {
        isPulling.current = true;
        // Prevent default scroll behavior to prevent native pull-to-refresh
        e.preventDefault();
        // Limit pull distance to a reasonable amount
        const distance = Math.min(deltaY * 0.5, 100);
        pullDistanceRef.current = distance;
        setPullDistance(distance);
      } else if (currentScrollTop > 5) {
        // If we've scrolled down, reset pull state
        if (isPulling.current) {
          isPulling.current = false;
          pullDistanceRef.current = 0;
          setPullDistance(0);
        }
      }
    };

    const handleTouchEnd = async () => {
      const currentPullDistance = pullDistanceRef.current;
      if (isPulling.current && currentPullDistance > 50 && dataContext?.refreshData && !isRefreshingRef.current) {
        setIsRefreshing(true);
        isPulling.current = false;
        try {
          await dataContext.refreshData();
          // Small delay to show the refresh state
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (error) {
          console.error('Error refreshing data:', error);
        } finally {
          setIsRefreshing(false);
          pullDistanceRef.current = 0;
          setPullDistance(0);
          // Ensure scroll position is reset
          requestAnimationFrame(() => {
            if (mainElement) {
              mainElement.scrollTop = 0;
            }
          });
        }
      } else {
        // Animate back to position
        pullDistanceRef.current = 0;
        setPullDistance(0);
        isPulling.current = false;
      }
    };

    mainElement.addEventListener('touchstart', handleTouchStart, { passive: false });
    mainElement.addEventListener('touchmove', handleTouchMove, { passive: false });
    mainElement.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      mainElement.removeEventListener('touchstart', handleTouchStart);
      mainElement.removeEventListener('touchmove', handleTouchMove);
      mainElement.removeEventListener('touchend', handleTouchEnd);
    };
  }, [hideTabBar, dataContext]);

  return (
    <div className="flex flex-col h-screen bg-[#0a0a0a] mobile-layout-container">
      {/* Standard Mobile Top Bar - Matching bottom nav style */}
      <div className="fixed top-0 left-0 right-0 z-[10000] mobile-top-bar-wrapper">
        <div className="glass-card-outline border-b border-white/10 backdrop-blur-lg bg-black/80 mobile-top-bar-container flex items-center px-4">
          <h1 className="text-white text-[32px] font-semibold">{pageTitle}</h1>
        </div>
      </div>

      {/* Pull to Refresh Indicator */}
      {pullDistance > 0 && (
        <div 
          className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center transition-transform duration-200"
          style={{ 
            transform: `translateY(${pullDistance}px)`,
            height: `${pullDistance}px`,
            pointerEvents: 'none'
          }}
        >
          {isRefreshing ? (
            <div className="flex flex-col items-center gap-2">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
              <span className="text-white text-sm">Refreshing...</span>
            </div>
          ) : pullDistance > 50 ? (
            <span className="text-white text-sm">Release to refresh</span>
          ) : (
            <span className="text-white text-sm opacity-50">Pull to refresh</span>
          )}
        </div>
      )}

      {/* Mobile Header - Simplified */}
      {!hideTabBar && (
        <header className="mobile-header-sticky sticky top-0 z-40 glass-card-outline border-b border-white/10 backdrop-blur-lg bg-black/80">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <img src="/bbb-logo.png" alt="BBB Auto Sales" className="h-8 w-8" />
              <h1 className="text-lg font-bold text-white">BBB DMS</h1>
            </div>
            {/* Future: Add notification bell or other header widgets here */}
          </div>
        </header>
      )}

      {/* Main Content Area */}
      <main 
        ref={mainRef}
        className={`flex-1 overflow-y-auto ${!hideTabBar ? 'pb-20' : ''} mobile-main-content`}
        style={{
          transform: pullDistance > 0 ? `translateY(${pullDistance}px)` : 'translateY(0)',
          transition: isRefreshing ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </main>

      {/* Mobile Tab Bar - Fixed Bottom */}
      {!hideTabBar && (
        <MobileTabBar onMoreClick={() => setIsMoreSheetOpen(true)} />
      )}

      {/* Overflow Menu Bottom Sheet */}
      <OverflowBottomSheet
        isOpen={isMoreSheetOpen}
        onClose={() => setIsMoreSheetOpen(false)}
        onSignOut={onSignOut}
      />
    </div>
  );
}
