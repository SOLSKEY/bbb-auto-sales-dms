import React from 'react';
import type { AppSectionKey } from '../types';

const SUB_SECTIONS = [
    { id: 'general', label: 'General' },
    { id: 'admin', label: 'Admin Panel' },
    { id: 'access', label: 'Access Control' },
] as const;

type SubSection = typeof SUB_SECTIONS[number]['id'];

interface SubSettingsNavProps {
    active: SubSection;
    onChange: (section: SubSection) => void;
}

const SubSettingsNav: React.FC<SubSettingsNavProps> = ({ active, onChange }) => {
    return (
        <aside className="w-56 border-r border-border-low pr-4">
            <div className="space-y-1">
                {SUB_SECTIONS.map(section => (
                    <button
                        key={section.id}
                        onClick={() => onChange(section.id)}
                        className={`w-full rounded-lg px-4 py-2 text-left text-sm font-semibold transition ${
                            active === section.id
                                ? 'bg-lava-core text-white shadow-lg'
                                : 'text-secondary hover:bg-glass-panel'
                        }`}
                    >
                        {section.label}
                    </button>
                ))}
            </div>
        </aside>
    );
};

export type SettingsSubSection = typeof SUB_SECTIONS[number]['id'];
export default SubSettingsNav;
