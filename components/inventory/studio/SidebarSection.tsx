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
        <div className="bg-white/50 dark:bg-gray-900/40 rounded-2xl border border-gray-100 dark:border-gray-800/50 shadow-sm transition-all duration-300 group overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between p-3.5 bg-gray-50/30 dark:bg-gray-800/20 hover:bg-gray-100/50 dark:hover:bg-gray-800/40 transition-all relative ${isOpen ? 'border-b border-gray-100 dark:border-gray-800/50' : ''}`}
            >
                {/* Left Accent */}
                <div className={`absolute left-0 top-1/4 bottom-1/4 w-1 rounded-r-full bg-${color}-500/50 dark:bg-${color}-400/30 opacity-0 group-hover:opacity-100 transition-opacity`} />
                
                <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg bg-${color}-50 dark:bg-${color}-900/30 flex items-center justify-center border border-${color}-100/50 dark:border-${color}-800/20`}>
                        <span className={`material-symbols-rounded text-base text-${color}-600 dark:text-${color}-400`}>{icon}</span>
                    </div>
                    <span className="text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-widest">{title}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`material-symbols-rounded text-gray-400 text-sm transform transition-all duration-300 ${isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-blue-400'}`}>
                        expand_more
                    </span>
                </div>
            </button>
            <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-3.5 space-y-4">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};
