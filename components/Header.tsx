
import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserContext } from '../App';
import { UserCircleIcon, Cog6ToothIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';

const Header: React.FC<{ title: string; onLogout?: () => void }> = ({ title, onLogout }) => {
    const userContext = useContext(UserContext);
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement | null>(null);

    if (!userContext) {
        return null;
    }

    const { user } = userContext;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleMenu = () => setIsMenuOpen(prev => !prev);

    const handleSignOut = () => {
        setIsMenuOpen(false);
        onLogout?.();
    };

    const handleAccountSettings = () => {
        setIsMenuOpen(false);
        navigate('/account-settings');
    };

    return (
        <header className="flex items-center justify-between p-4 bg-glass-panel backdrop-blur-glass border-b border-border-low h-16 relative z-50">
            <h1 className="text-2xl font-bold text-primary font-orbitron tracking-tight-lg">{title}</h1>
            <div className="flex items-center space-x-4">
                <div ref={profileRef} className="relative z-50">
                    <button
                        type="button"
                        onClick={toggleMenu}
                        className="flex items-center space-x-2 focus:outline-none"
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                    >
                        <UserCircleIcon className="h-8 w-8 text-muted" />
                        <div className="text-left">
                            <p className="font-semibold text-primary">{user.name}</p>
                            <p className="text-xs text-muted capitalize">{user.role}</p>
                        </div>
                    </button>
                    {isMenuOpen && onLogout && (
                        <div className="absolute right-0 mt-2 w-52 rounded-xl bg-[#14171b] border border-border-low shadow-2xl z-[9999]">
                            <button
                                onClick={handleAccountSettings}
                                className="w-full px-4 py-2 text-left text-sm font-semibold text-primary hover:bg-white/10 transition rounded-t-xl flex items-center gap-2"
                            >
                                <Cog6ToothIcon className="h-4 w-4" />
                                Account Settings
                            </button>
                            <div className="border-t border-border-low"></div>
                            <button
                                onClick={handleSignOut}
                                className="w-full px-4 py-2 text-left text-sm font-semibold text-primary hover:bg-white/10 transition rounded-b-lg flex items-center gap-2"
                            >
                                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
