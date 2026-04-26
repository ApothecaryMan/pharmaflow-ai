import React from 'react';
import { motion } from 'framer-motion';

interface LogoutOverlayProps {
  language: 'EN' | 'AR';
  currentEmployeeId: string | null;
  activeBranchId: string | null;
  employees: any[];
  inventory: any[];
  sales: any[];
}

export const LogoutOverlay: React.FC<LogoutOverlayProps> = ({
  language,
  currentEmployeeId,
  activeBranchId,
  employees,
  inventory,
  sales,
}) => {
  const currentEmployee = employees.find(e => e.id === currentEmployeeId);

  return (
    <div className='h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center select-none overflow-hidden relative font-sans'>
      {/* Subtle Zinc Mesh Background with Dots */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0"
      >
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full bg-zinc-400/[0.03] dark:bg-zinc-100/[0.02] blur-[120px]" />
        
        <div 
          className='absolute inset-0 opacity-[0.15] dark:opacity-[0.2]' 
          style={{ 
            backgroundImage: `radial-gradient(circle, currentColor 1px, transparent 1px)`,
            backgroundSize: '32px 32px',
            maskImage: 'radial-gradient(circle at center, black, transparent 80%)'
          }} 
        />
      </motion.div>
      
      {/* Floating Tech Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(10)].map((_, i) => (
          <motion.div 
            key={i}
            initial={{ y: '-20%', opacity: 0 }}
            animate={{ 
              y: '120vh', 
              opacity: [0, 0.2, 0.2, 0] 
            }}
            transition={{ 
              duration: 5 + Math.random() * 3, 
              repeat: Infinity, 
              delay: i * 0.6,
              ease: "linear"
            }}
            className="absolute w-px h-32 bg-gradient-to-b from-transparent via-zinc-400/20 dark:via-zinc-500/20 to-transparent"
            style={{ left: `${10 + i * 10}%` }} 
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className='relative flex flex-col items-center'
      >
        {/* DEFINED ZINC Tech Orbitals */}
        <div className='relative w-72 h-72 mb-14 flex items-center justify-center'>
          <div className="absolute inset-0 border border-zinc-200/20 dark:border-zinc-800/40 rounded-full" />
          
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute inset-8 border border-zinc-300/40 dark:border-zinc-700/60 rounded-full border-dashed shadow-[0_0_15px_rgba(255,255,255,0.02)]" 
          />
          
          <div className="absolute inset-16 border border-zinc-200/10 dark:border-zinc-800/20 rounded-full" />
          
          <div className="relative z-10">
            <div className="absolute inset-0 bg-white/[0.02] dark:bg-zinc-100/[0.01] blur-2xl rounded-full scale-110" />
            <motion.div 
              className='relative w-32 h-32 rounded-[2.5rem] bg-white/[0.03] dark:bg-zinc-900/20 backdrop-blur-3xl border border-zinc-200/30 dark:border-zinc-700/30 flex items-center justify-center overflow-hidden shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]'
            >
               <img 
                 src="/icons/icon-512x512.png"
                 alt="PharmaFlow Logo"
                 className="w-20 h-20 object-contain relative z-10 opacity-95"
               />
               <motion.div 
                 animate={{ top: ['-10%', '110%'] }}
                 transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                 className='absolute inset-x-0 h-[1px] bg-zinc-400 dark:bg-zinc-500 blur-[0.5px] opacity-20 z-20' 
               />
            </motion.div>
          </div>

          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-zinc-900 dark:bg-zinc-50 shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-white dark:border-zinc-900 z-30" />
          </motion.div>
        </div>

        <div className='text-center space-y-6'>
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-center gap-4">
               <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
               <h2 className='text-7xl font-black text-zinc-900 dark:text-zinc-50 tracking-[-0.1em] uppercase leading-none'>
                 ZINC
               </h2>
               <div className="h-px w-10 bg-zinc-200 dark:bg-zinc-800" />
            </div>
            <p className='text-[9px] font-black uppercase tracking-[0.7em] text-zinc-500 dark:text-zinc-400 pl-[0.7em]'>
              {language === 'AR' ? 'نظـــــام إدارة الصيدليـــــات' : 'PHARMACY OS'}
            </p>
          </motion.div>

          {/* REAL-DATA FLOATING HUD STATUS */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col items-center gap-5 mt-4"
          >
            <div className="flex items-center gap-6 text-[9px] font-bold uppercase tracking-[0.3em] text-zinc-400 dark:text-zinc-600">
              <div className="flex items-center gap-2">
                {currentEmployee?.name || (language === 'AR' ? 'مسؤول النظام' : 'System Admin')}
              </div>
              <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-800" />
              <div className="flex items-center gap-2 font-mono opacity-80">
                 BRANCH_{activeBranchId?.slice(0, 8) || 'GLOBAL'}
              </div>
            </div>

            <div className="w-80 h-[1px] bg-zinc-200 dark:bg-zinc-800 relative overflow-hidden">
              <motion.div 
                initial={{ left: "-100%" }}
                animate={{ left: "100%" }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-y-0 w-32 bg-gradient-to-r from-transparent via-primary-500/60 to-transparent" 
              />
            </div>

            <div className="flex items-center gap-5 opacity-50">
               <div className="flex items-center gap-2">
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    {language === 'AR' ? 'المخزون' : 'Inventory'}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                    {inventory.length}
                  </span>
               </div>
               <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
               <div className="flex items-center gap-2">
                  <span className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-500">
                    {language === 'AR' ? 'المبيعات' : 'Sales'}
                  </span>
                  <span className="text-[8px] font-mono text-zinc-900 dark:text-zinc-100 font-bold">
                    {sales.length}
                  </span>
               </div>
               <div className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
               <span className="text-[7px] font-black uppercase tracking-[0.4em] text-zinc-500">
                 {language === 'AR' ? 'تشفير آمن' : 'Secure Lock'}
               </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};
