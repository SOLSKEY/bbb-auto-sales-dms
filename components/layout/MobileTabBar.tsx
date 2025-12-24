import { useNavigate, useLocation } from 'react-router-dom';
import {
  TruckIcon,
  CurrencyDollarIcon,
  CreditCardIcon,
  CalendarDaysIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline';

interface MobileTabBarProps {
  onMoreClick: () => void;
}

interface TabItem {
  id: string;
  label: string;
  icon: typeof TruckIcon;
  path: string;
}

const tabs: TabItem[] = [
  { id: 'inventory', label: 'Inventory', icon: TruckIcon, path: '/inventory' },
  { id: 'sales', label: 'Sales', icon: CurrencyDollarIcon, path: '/sales' },
  { id: 'collections', label: 'Collections', icon: CreditCardIcon, path: '/collections' },
  { id: 'appointments', label: 'Appointments', icon: CalendarDaysIcon, path: '/appointments-leads' },
];

export function MobileTabBar({ onMoreClick }: MobileTabBarProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/appointments-leads') {
      return location.pathname === '/appointments-leads' || location.pathname === '/appointments';
    }
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom mobile-tab-bar-wrapper">
      <div className="glass-card-outline border-t border-white/10 backdrop-blur-lg bg-black/80 mobile-tab-bar-container">
        <nav className="flex justify-around items-center px-2 py-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = isActive(tab.path);

            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`
                  flex flex-col items-center justify-center
                  min-w-[60px] min-h-[56px] px-3 py-2
                  rounded-xl transition-all duration-200
                  touch-target
                  ${
                    active
                      ? 'text-cyan-400 bg-cyan-500/10'
                      : 'text-white/60 hover:text-white/80 active:text-white'
                  }
                `}
              >
                <Icon className={`w-6 h-6 mb-1 ${active ? 'stroke-2' : 'stroke-[1.5]'}`} />
                <span className={`text-xs ${active ? 'font-semibold' : 'font-medium'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* More button */}
          <button
            onClick={onMoreClick}
            className="
              flex flex-col items-center justify-center
              min-w-[60px] min-h-[56px] px-3 py-2
              rounded-xl transition-all duration-200
              text-white/60 hover:text-white/80 active:text-white
              touch-target
            "
          >
            <Bars3Icon className="w-6 h-6 mb-1 stroke-[1.5]" />
            <span className="text-xs font-medium">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
