
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    BuildingStorefrontIcon,
    CurrencyDollarIcon,
    DocumentChartBarIcon,
    CircleStackIcon,
    TableCellsIcon,
    CalendarDaysIcon,
    ChatBubbleLeftRightIcon,
    ChatBubbleBottomCenterTextIcon,
    Cog6ToothIcon,
    UserGroupIcon,
    UsersIcon,
    ClipboardDocumentIcon,
} from '@heroicons/react/24/outline';
import type { AppSectionKey, UserAccessPolicy } from '@/types';

type NavItem = {
    name: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    path: string;
    permissionKey?: AppSectionKey;
    disabled?: boolean;
    comingSoon?: boolean;
};

const BASE_NAV_ITEMS: NavItem[] = [
    { name: 'Inventory', icon: BuildingStorefrontIcon, path: '/inventory', permissionKey: 'Inventory' },
    { name: 'Sale Prep', icon: ClipboardDocumentIcon, path: '/sale-prep', permissionKey: 'Sale Prep' },
    { name: 'Sales', icon: CurrencyDollarIcon, path: '/sales', permissionKey: 'Sales' },
    { name: 'Collections', icon: DocumentChartBarIcon, path: '/collections', permissionKey: 'Collections' },
    { name: 'Reports', icon: CircleStackIcon, path: '/reports', permissionKey: 'Reports' },
    { name: 'Data', icon: TableCellsIcon, path: '/data', permissionKey: 'Data' },
    { name: 'Appointments & Leads', icon: CalendarDaysIcon, path: '/appointments-leads', permissionKey: 'Appointments & Leads' },
    { name: 'Team Chat', icon: ChatBubbleLeftRightIcon, path: '/team-chat', permissionKey: 'Team Chat', disabled: true, comingSoon: true },
    { name: 'Chat', icon: ChatBubbleBottomCenterTextIcon, path: '/messaging', permissionKey: 'Team Chat', disabled: true, comingSoon: true },
    { name: 'CRM', icon: UsersIcon, path: '/crm', permissionKey: 'CRM', disabled: true, comingSoon: true },
];

const BbbLogo = () => (
    <div className="flex items-center justify-center">
        <img
            src="/bbb-logo.png"
            alt="BBB Auto Sales"
            className="w-full object-contain drop-shadow-lg"
        />
    </div>
);


interface SidebarProps {
    isAdmin?: boolean;
    permissions?: UserAccessPolicy['permissions'];
    canViewPage?: (page: AppSectionKey) => boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isAdmin = false, permissions, canViewPage }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const normalizedPath = location.pathname.replace(/\/+$/, '') || '/';
    const navItems = useMemo(() => {
        const canView = (key?: AppSectionKey) => {
            if (!key) return true;
            // Admins can view everything
            if (isAdmin) return true;
            // Use canViewPage function if provided (preferred method)
            if (canViewPage) {
                return canViewPage(key);
            }
            // Fallback to permissions object
            if (permissions) {
                return Boolean(permissions[key]?.canView);
            }
            // If no permissions available, deny access for security
            return false;
        };

        // Show all items including disabled ones (they'll be greyed out)
        const base = BASE_NAV_ITEMS.filter(item => {
            // Always show disabled items (they'll be greyed out)
            if (item.disabled) return true;
            // For enabled items, check permissions
            return canView(item.permissionKey);
        });
        
        if (isAdmin) {
            base.push({ name: 'Admin', icon: UserGroupIcon, path: '/admin' });
        }
        return base;
    }, [isAdmin, permissions, canViewPage]);

    return (
        <nav className="floating-sidebar-outline w-64 flex flex-col p-4 h-[calc(100vh-32px)]">
            <div className="flex items-center justify-center p-4 mb-8">
                <div className="flex flex-col items-center">
                    <BbbLogo />
                </div>
            </div>
            <ul className="flex-1 space-y-2">
                {navItems.map((item) => {
                    const isDisabled = item.disabled;
                    const isActive = !isDisabled && (normalizedPath === item.path || (item.path !== '/' && normalizedPath.startsWith(`${item.path}/`)));
                    
                    return (
                        <li key={item.name}>
                            <button
                                type="button"
                                onClick={() => !isDisabled && navigate(item.path)}
                                disabled={isDisabled}
                                className={`flex w-full items-center p-3 text-left rounded-r-xl transition-smooth group relative ${
                                    isDisabled
                                        ? 'opacity-50 cursor-not-allowed text-slate-500'
                                        : isActive
                                        ? 'nav-item-active'
                                        : 'text-secondary-contrast hover:bg-white/5 hover:text-primary-contrast'
                                }`}
                            >
                                <item.icon className={`h-6 w-6 mr-3 transition-smooth ${
                                    isDisabled
                                        ? 'text-slate-600'
                                        : isActive
                                        ? 'icon-neon'
                                        : 'text-slate-500 group-hover:icon-neon'
                                }`} />
                                <span className="font-medium flex-1">{item.name}</span>
                                {item.comingSoon && (
                                    <span className="text-xs text-slate-500 italic ml-2">(coming soon)</span>
                                )}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <div className="mt-auto">
                {(isAdmin || (canViewPage && canViewPage('Settings')) || (permissions && permissions['Settings']?.canView)) && (
                    <button
                        type="button"
                        onClick={() => navigate('/settings')}
                        className="flex w-full items-center p-3 text-left rounded-xl transition-smooth text-secondary-contrast hover:bg-white/5 hover:text-primary-contrast"
                    >
                        <Cog6ToothIcon className="h-6 w-6 mr-3 text-slate-500 hover:icon-neon" />
                        <span className="font-medium">Settings</span>
                    </button>
                )}
            </div>
        </nav>
    );
};

export default Sidebar;
