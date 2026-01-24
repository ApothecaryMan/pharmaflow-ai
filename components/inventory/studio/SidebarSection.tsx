import React, { useState } from 'react';

interface SidebarSectionProps {
    title: string;
    icon: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    color?: string;
}

export const SidebarSection: React.FC<SidebarSectionProps> = ({ title, icon, children, defaultOpen = true, color = 'emerald' }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700/50 overflow-hidden shadow-sm transition-all duration-300">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-gray-50/50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl bg-${color}-100 dark:bg-${color}-900/40 flex items-center justify-center`}>
                        <span className={`material-symbols-rounded text-lg text-${color}-600 dark:text-${color}-400`}>{icon}</span>
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase">{title}</span>
                </div>
                <span className={`material-symbols-rounded text-gray-400 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>
            <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-4 space-y-4 border-t border-gray-100 dark:border-gray-700/50">
                    {children}
                </div>
            </div>
        </div>
    );
};
