
import React from 'react';
import { CurrencyDollarIcon, BuildingStorefrontIcon, UserGroupIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const StatCard: React.FC<{ title: string; value: string; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <div className="glass-card p-6 relative overflow-hidden glass-card-hover">
        <div className="absolute -top-4 -right-4 w-24 h-24 bg-glass-panel opacity-50 rounded-full blur-xl"></div>
        <div className="relative z-10">
            <div className="flex items-center justify-between">
                <p className="text-secondary font-medium tracking-tight-md">{title}</p>
                <Icon className="h-8 w-8 text-lava-core" />
            </div>
            <p className="text-4xl font-bold text-primary mt-2 font-orbitron tracking-tight-lg">{value}</p>
        </div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-lava-warm via-lava-core to-lava-cool"></div>
    </div>
);

const Dashboard: React.FC = () => {
    return (
        <div className="space-y-8">
            <h2 className="text-3xl font-bold text-primary tracking-tight-lg">Welcome to your Dashboard</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Sales (Month)" value="$450K" icon={CurrencyDollarIcon} />
                <StatCard title="Available Inventory" value="62" icon={BuildingStorefrontIcon} />
                <StatCard title="New Leads" value="12" icon={UserGroupIcon} />
                <StatCard title="Sales Trend" value="+5.2%" icon={ChartBarIcon} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6 glass-card-hover">
                    <h3 className="text-xl font-semibold text-primary mb-4 tracking-tight-md">Sales Overview</h3>
                    <div className="h-80 bg-glass-panel rounded-md flex items-center justify-center text-muted border border-border-low">
                        Sales Chart Placeholder
                    </div>
                </div>
                <div className="glass-card p-6 glass-card-hover">
                    <h3 className="text-xl font-semibold text-primary mb-4 tracking-tight-md">Recent Activity</h3>
                    <ul className="space-y-4">
                        <li className="text-sm text-secondary">
                            <span className="font-bold text-lava-warm">Alice</span> sold a 2022 Lamborghini Huracan.
                        </li>
                        <li className="text-sm text-secondary">
                            New inventory added: 2024 Porsche Taycan.
                        </li>
                        <li className="text-sm text-secondary">
                           <span className="font-bold text-lava-warm">Bob</span> scheduled a test drive for the Audi R8.
                        </li>
                         <li className="text-sm text-secondary">
                           Collections received payment from M. Miller.
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
