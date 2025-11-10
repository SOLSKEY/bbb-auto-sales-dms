
import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChartPieIcon,
    BuildingStorefrontIcon,
    CurrencyDollarIcon,
    DocumentChartBarIcon,
    CircleStackIcon,
    TableCellsIcon,
    CalendarIcon,
    ChatBubbleLeftRightIcon,
    Cog6ToothIcon,
    UserGroupIcon,
} from '@heroicons/react/24/outline';
import type { AppSectionKey, UserAccessPolicy } from '@/types';
import { GlassButton } from '@/components/ui/glass-button';

type NavItem = {
    name: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    path: string;
    permissionKey?: AppSectionKey;
};

const BASE_NAV_ITEMS: NavItem[] = [
    { name: 'Dashboard', icon: ChartPieIcon, path: '/', permissionKey: 'Dashboard' },
    { name: 'Inventory', icon: BuildingStorefrontIcon, path: '/inventory', permissionKey: 'Inventory' },
    { name: 'Sales', icon: CurrencyDollarIcon, path: '/sales', permissionKey: 'Sales' },
    { name: 'Collections', icon: DocumentChartBarIcon, path: '/collections', permissionKey: 'Collections' },
    { name: 'Reports', icon: CircleStackIcon, path: '/reports', permissionKey: 'Reports' },
    { name: 'Data', icon: TableCellsIcon, path: '/data', permissionKey: 'Data' },
    { name: 'Calendar', icon: CalendarIcon, path: '/calendar', permissionKey: 'Calendar' },
    { name: 'Team Chat', icon: ChatBubbleLeftRightIcon, path: '/team-chat', permissionKey: 'Team Chat' },
];

const BbbLogo = () => (
    <div className="flex items-center justify-center">
        <img
            src="/bbb-logo.png"
            alt="BBB Auto Sales"
            className="w-40 object-contain drop-shadow-lg"
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

        const base = BASE_NAV_ITEMS.filter(item => canView(item.permissionKey));
        if (isAdmin) {
            base.push({ name: 'Admin', icon: UserGroupIcon, path: '/admin' });
        }
        return base;
    }, [isAdmin, permissions, canViewPage]);

    return (
        <nav className="w-64 bg-glass-panel backdrop-blur-glass flex flex-col p-4 border-r border-border-low">
            <div className="flex items-center justify-center p-4 mb-8">
                 <div className="flex flex-col items-center">
                    <BbbLogo />
                </div>
            </div>
            <ul className="flex-1 space-y-2">
                {navItems.map((item) => (
                    <li key={item.name}>
                        <button
                            type="button"
                            onClick={() => navigate(item.path)}
                            className={`flex w-full items-center p-3 text-left rounded-lg transition-smooth group relative ${
                                normalizedPath === item.path || (item.path !== '/' && normalizedPath.startsWith(`${item.path}/`))
                                    ? 'bg-glass-panel text-primary shadow-lava border border-border-high'
                                    : 'text-secondary hover:bg-glass-panel hover:text-primary hover:border hover:border-border-low'
                            }`}
                        >
                            <item.icon className={`h-6 w-6 mr-3 transition-smooth ${
                                normalizedPath === item.path || (item.path !== '/' && normalizedPath.startsWith(`${item.path}/`))
                                    ? 'text-lava-core'
                                    : 'text-muted group-hover:text-secondary'
                            }`} />
                            <span className="font-medium">{item.name}</span>
                             {(
                                normalizedPath === item.path ||
                                (item.path !== '/' && normalizedPath.startsWith(`${item.path}/`))
                            ) && (
                                <div className="absolute left-0 w-1.5 h-8 bg-gradient-to-b from-lava-warm via-lava-core to-lava-cool rounded-r-full" />
                            )}
                        </button>
                    </li>
                ))}
            </ul>
            <div className="mt-auto">
                {(isAdmin || (canViewPage && canViewPage('Settings')) || (permissions && permissions['Settings']?.canView)) && (
                    <GlassButton
                        type="button"
                        size="sm"
                        onClick={() => navigate('/settings')}
                    >
                        <Cog6ToothIcon className="h-6 w-6 mr-3" />
                        <span className="font-medium">Settings</span>
                    </GlassButton>
                )}
            </div>
        </nav>
    );
};

export default Sidebar;
