
import React, { useContext } from 'react';
import { UserContext } from '../App';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import AppSelect from './AppSelect';
import type { Role } from '../types';

const Header: React.FC<{ title: string }> = ({ title }) => {
    const userContext = useContext(UserContext);

    if (!userContext) {
        return null;
    }

    const { user, setUser } = userContext;

    const handleRoleChange = (value: string) => {
        setUser({ ...user, role: value as Role });
    };

    return (
        <header className="flex items-center justify-between p-4 bg-glass-panel backdrop-blur-glass border-b border-border-low h-16">
            <h1 className="text-2xl font-bold text-primary font-orbitron tracking-tight-lg">{title}</h1>
            <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                    <UserCircleIcon className="h-8 w-8 text-muted" />
                    <div>
                        <p className="font-semibold text-primary">{user.name}</p>
                        <p className="text-xs text-muted capitalize">{user.role}</p>
                    </div>
                </div>
                {/* Demo Role Switcher */}
                <div className="w-36">
                    <AppSelect
                        value={user.role}
                        onChange={handleRoleChange}
                        options={[
                            { value: 'admin', label: 'Admin' },
                            { value: 'sales', label: 'Sales' },
                            { value: 'collections', label: 'Collections' },
                            { value: 'viewer', label: 'Viewer' },
                        ]}
                    />
                </div>
            </div>
        </header>
    );
};

export default Header;
