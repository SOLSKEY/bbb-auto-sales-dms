
import React from 'react';
import { ChartPieIcon, BuildingStorefrontIcon, CurrencyDollarIcon, DocumentChartBarIcon, CircleStackIcon, TableCellsIcon, CalendarIcon, ChatBubbleLeftRightIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface SidebarProps {
    activePage: string;
    setActivePage: (page: string) => void;
}

const navItems = [
    { name: 'Dashboard', icon: ChartPieIcon },
    { name: 'Inventory', icon: BuildingStorefrontIcon },
    { name: 'Sales', icon: CurrencyDollarIcon },
    { name: 'Collections', icon: DocumentChartBarIcon },
    { name: 'Reports', icon: CircleStackIcon },
    { name: 'Data', icon: TableCellsIcon },
    { name: 'Calendar', icon: CalendarIcon },
    { name: 'Team Chat', icon: ChatBubbleLeftRightIcon },
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


const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage }) => {
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
                        <a
                            href="#"
                            onClick={(e) => { e.preventDefault(); setActivePage(item.name); }}
                            className={`flex items-center p-3 rounded-lg transition-smooth group relative ${
                                activePage === item.name
                                    ? 'bg-glass-panel text-primary shadow-lava border border-border-high'
                                    : 'text-secondary hover:bg-glass-panel hover:text-primary hover:border hover:border-border-low'
                            }`}
                        >
                            <item.icon className={`h-6 w-6 mr-3 transition-smooth ${
                                activePage === item.name ? 'text-lava-core' : 'text-muted group-hover:text-secondary'
                            }`} />
                            <span className="font-medium">{item.name}</span>
                             {activePage === item.name && (
                                <div className="absolute left-0 w-1.5 h-8 bg-gradient-to-b from-lava-warm via-lava-core to-lava-cool rounded-r-full" />
                            )}
                        </a>
                    </li>
                ))}
            </ul>
            <div className="mt-auto">
                <button
                    type="button"
                    onClick={() => setActivePage('Settings')}
                    className={`w-full flex items-center p-3 rounded-lg transition-smooth group relative ${
                        activePage === 'Settings'
                            ? 'bg-glass-panel text-primary shadow-lava border border-border-high'
                            : 'text-secondary hover:bg-glass-panel hover:text-primary hover:border hover:border-border-low'
                    }`}
                >
                    <Cog6ToothIcon
                        className={`h-6 w-6 mr-3 transition-smooth ${
                            activePage === 'Settings'
                                ? 'text-lava-core'
                                : 'text-muted group-hover:text-secondary'
                        }`}
                    />
                    <span className="font-medium">Settings</span>
                    {activePage === 'Settings' && (
                        <div className="absolute left-0 w-1.5 h-8 bg-gradient-to-b from-lava-warm via-lava-core to-lava-cool rounded-r-full" />
                    )}
                </button>
            </div>
        </nav>
    );
};

export default Sidebar;
