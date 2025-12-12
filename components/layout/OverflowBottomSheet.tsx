import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  WrenchScrewdriverIcon,
  ChartBarIcon,
  TableCellsIcon,
  Cog6ToothIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ArrowRightOnRectangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { UserContext } from '../../App';

interface OverflowBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSignOut: () => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: typeof HomeIcon;
  path: string;
  adminOnly?: boolean;
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: HomeIcon, path: '/dashboard' },
  { id: 'sale-prep', label: 'Sale Prep', icon: WrenchScrewdriverIcon, path: '/sale-prep' },
  { id: 'reports', label: 'Reports', icon: ChartBarIcon, path: '/reports', adminOnly: true },
  { id: 'data', label: 'Data', icon: TableCellsIcon, path: '/data', adminOnly: true },
  { id: 'settings', label: 'Settings', icon: Cog6ToothIcon, path: '/settings' },
  { id: 'account', label: 'Account Settings', icon: UserCircleIcon, path: '/account-settings' },
  { id: 'admin', label: 'Admin', icon: ShieldCheckIcon, path: '/admin', adminOnly: true },
];

export function OverflowBottomSheet({ isOpen, onClose, onSignOut }: OverflowBottomSheetProps) {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);

  const handleNavigate = (path: string) => {
    navigate(path);
    onClose();
  };

  const handleSignOut = () => {
    onSignOut();
    onClose();
  };

  if (!isOpen) return null;

  // Filter menu items based on user permissions
  const filteredMenuItems = menuItems.filter((item) => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] animate-fade-in"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] animate-slide-up">
        <div className="glass-card-outline rounded-t-3xl border-t border-white/10 max-h-[80vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Menu</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors touch-target"
            >
              <XMarkIcon className="w-6 h-6 text-white/80" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="p-4">
            <div className="space-y-2">
              {filteredMenuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.path)}
                    className="
                      w-full flex items-center gap-4 p-4
                      rounded-xl bg-white/5 border border-white/10
                      hover:bg-white/10 active:bg-white/20
                      transition-all duration-200
                      touch-target
                    "
                  >
                    <Icon className="w-6 h-6 text-cyan-400" />
                    <span className="text-white font-medium">{item.label}</span>
                    {item.adminOnly && (
                      <span className="ml-auto text-xs px-2 py-1 rounded-full bg-cyan-500/20 text-cyan-400">
                        Admin
                      </span>
                    )}
                  </button>
                );
              })}

              {/* Sign Out Button */}
              <button
                onClick={handleSignOut}
                className="
                  w-full flex items-center gap-4 p-4
                  rounded-xl bg-red-500/10 border border-red-500/20
                  hover:bg-red-500/20 active:bg-red-500/30
                  transition-all duration-200
                  touch-target
                  mt-4
                "
              >
                <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-400" />
                <span className="text-red-400 font-medium">Sign Out</span>
              </button>
            </div>
          </div>

          {/* Safe area padding for bottom */}
          <div className="h-4 safe-area-bottom" />
        </div>
      </div>
    </>
  );
}
