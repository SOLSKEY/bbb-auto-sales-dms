import React, { useContext, useMemo, useState } from 'react';
import { UserContext } from '../App';
import SubSettingsNav, { SettingsSubSection } from '../components/SubSettingsNav';
import AdminCreateUserForm from '../components/AdminCreateUserForm';
import AccessControlPanel from '../components/AccessControlPanel';

const Settings: React.FC = () => {
    const userContext = useContext(UserContext);
    const [activeSubPage, setActiveSubPage] = useState<SettingsSubSection>('general');

    const isAdmin = useMemo(() => userContext?.user.role === 'admin', [userContext?.user.role]);

    if (!userContext) return null;

    const renderSubPage = () => {
        if (activeSubPage === 'general') {
            return (
                <section className="space-y-4">
                    <h2 className="text-2xl font-bold text-primary">General Preferences</h2>
                    <p className="text-secondary text-sm">
                        Placeholder for company branding, notification preferences, payroll integration, etc.
                    </p>
                </section>
            );
        }

        if (activeSubPage === 'admin') {
            if (!isAdmin) {
                return <p className="text-sm text-red-400">Admin privileges required.</p>;
            }
            return (
                <section className="space-y-6">
                    <header>
                        <h2 className="text-2xl font-bold text-primary">Admin Panel</h2>
                        <p className="text-secondary text-sm">Create new dealership users and define their roles.</p>
                    </header>
                    <AdminCreateUserForm />
                </section>
            );
        }

        if (activeSubPage === 'access') {
            if (!isAdmin) {
                return <p className="text-sm text-red-400">Admin privileges required.</p>;
            }
            return (
                <section className="space-y-6">
                    <header>
                        <h2 className="text-2xl font-bold text-primary">Access Control</h2>
                        <p className="text-secondary text-sm">
                            Grant or remove access to features for each employee.
                        </p>
                    </header>
                    <AccessControlPanel currentUserId={String(userContext.user.id)} />
                </section>
            );
        }

        return null;
    };

    return (
        <div className="flex h-full bg-slate-950 text-primary">
            <div className="flex-1 mx-auto max-w-6xl px-6 py-8">
                <div className="flex gap-8">
                    <SubSettingsNav active={activeSubPage} onChange={setActiveSubPage} />
                    <div className="flex-1 min-h-[70vh] rounded-2xl border border-border-low bg-glass-panel/70 p-8 shadow-xl">
                        {renderSubPage()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
