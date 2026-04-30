import React from 'react';
import { motion } from 'framer-motion';

interface LogoutOverlayProps {
  language: 'EN' | 'AR';
  darkMode: boolean;
  currentEmployeeId: string | null;
  activeBranchId: string | null;
  employees: any[];
  inventory: any[];
  sales: any[];
}

export const LogoutOverlay: React.FC<LogoutOverlayProps> = ({ language, darkMode, currentEmployeeId, activeBranchId, employees, inventory, sales }) => {
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);
  
  // Calculate Best Selling Item & Highest Invoice
  const stats = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let maxInvoice = 0;
    sales.forEach(s => {
      s.items?.forEach((i: any) => { counts[i.drugId] = (counts[i.drugId] || 0) + i.quantity; });
      if (s.total > maxInvoice) maxInvoice = s.total;
    });
    const topId = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bestSeller = inventory.find(i => i.id === topId)?.name || (language === 'AR' ? 'لا يوجد' : 'None');
    return { bestSeller, maxInvoice };
  }, [sales, inventory]);

  const t = { 
    best: language === 'AR' ? 'الأكثر مبيعاً' : 'Best Seller', 
    sales: language === 'AR' ? 'المبيعات' : 'Sales', 
    max: language === 'AR' ? 'أعلى فاتورة' : 'Highest Invoice' 
  };

  return (
    <div className="h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center select-none overflow-hidden relative" style={{ fontFamily: "'GraphicSansFont', sans-serif" }}>
      {/* Background & Particles */}
      <div className="absolute inset-0 opacity-15 dark:opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)', backgroundSize: '32px 32px', maskImage: 'radial-gradient(circle, black, transparent 80%)' }} />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(8)].map((_, i) => (
          <motion.div key={i} initial={{ y: '-20%', opacity: 0 }} animate={{ y: '120vh', opacity: [0, 0.2, 0] }} transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.8, ease: "linear" }} className="absolute w-px h-32 bg-gradient-to-b from-transparent via-zinc-400/20 to-transparent" style={{ left: `${15 + i * 12}%` }} />
        ))}
      </div>

      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative flex flex-col items-center">
        {/* Tech Orbitals */}
        <div className="relative w-72 h-72 mb-14 flex items-center justify-center">
          <div className="absolute inset-0 border border-zinc-300/50 dark:border-zinc-800/40 rounded-full" />
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 25, repeat: Infinity, ease: "linear" }} className="absolute inset-8 border border-zinc-400/40 dark:border-zinc-700/60 rounded-full border-dashed" />
          <motion.div animate={{ rotate: -360 }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute inset-16 border border-zinc-300/30 dark:border-zinc-800/20 rounded-full" />
          
          <div className="relative z-10 w-32 h-32 rounded-[2.5rem] bg-white/[0.03] dark:bg-zinc-900/20 backdrop-blur-3xl border border-zinc-200/30 dark:border-zinc-700/30 flex items-center justify-center overflow-hidden">
            <img src={darkMode ? '/logo_icon_white.svg' : '/logo_icon_black.svg'} alt="Logo" className="w-20 h-20 opacity-95 relative z-10" />
            <motion.div animate={{ top: ['-10%', '110%'] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-x-0 h-px bg-zinc-400 dark:bg-zinc-500 opacity-20" />
          </div>

          <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }} className="absolute inset-0">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-900 dark:bg-zinc-50 shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-white dark:border-zinc-900" />
          </motion.div>
        </div>

        {/* Content & HUD */}
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-4">
              <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
              <h2 className="text-7xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tighter uppercase">ZINC</h2>
              <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <p className="text-[9px] font-bold uppercase tracking-[0.7em] text-zinc-500 dark:text-zinc-400 pl-[0.7em]">
              {language === 'AR' ? 'نظـــــام إدارة الصيدليـــــات' : 'PHARMACY OS'}
            </p>
          </div>

          <div className="flex flex-col items-center gap-5 mt-4">
            <div className="flex items-center gap-6 text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">
              <span>{currentEmployee?.name || (language === 'AR' ? 'مسؤول النظام' : 'System Admin')}</span>
              <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800" />
              <span className="font-mono opacity-80">BRANCH_{activeBranchId?.slice(0, 8) || 'GLOBAL'}</span>
            </div>

            <div className="w-80 h-[1px] bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
              <motion.div animate={{ left: ['-100%', '100%'] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent" />
            </div>

            <div className="flex items-center gap-5 opacity-50 text-[7px] font-bold uppercase tracking-[0.4em] text-zinc-500">
              <div className="flex items-center gap-2"><span>{t.best}</span><span className="text-[8px] font-mono text-zinc-900 dark:text-zinc-100">{stats.bestSeller}</span></div>
              <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center gap-2"><span>{t.sales}</span><span className="text-[8px] font-mono text-zinc-900 dark:text-zinc-100">{sales.length}</span></div>
              <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
              <div className="flex items-center gap-2"><span>{t.max}</span><span className="text-[8px] font-mono text-zinc-900 dark:text-zinc-100">{stats.maxInvoice}</span></div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
