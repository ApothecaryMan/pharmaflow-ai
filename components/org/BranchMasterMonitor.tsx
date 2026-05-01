import React from 'react';
import type { Branch } from '../../types';
import { CARD_BASE } from '../../utils/themeStyles';
import { formatDistanceToNow } from 'date-fns';
import { arEG, enUS } from 'date-fns/locale';

interface BranchMasterMonitorProps {
  branches: Branch[];
  color?: string;
  language: 'en' | 'ar';
  isLoading?: boolean;
}


const BranchRow: React.FC<{ 
  branch?: Branch; 
  language: 'en' | 'ar'; 
  color: string;
  isLoading?: boolean;
}> = ({ branch, language, color, isLoading }) => {
  const isActive = branch?.status === 'active';
  const [copied, setCopied] = React.useState(false);

  const handleCopy = (text?: string) => {
    if (!text) return;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.style.top = "0";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        const successful = document.execCommand('copy');
        if (successful) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }
  };
  
  return (
    <div className={`flex items-center justify-between py-2.5 px-4 border-b border-border last:border-0 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors ${isLoading ? 'animate-pulse' : ''}`}>
      <div className="flex items-center gap-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0"
        >
          {isLoading ? null : <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>store</span>}
        </div>
        <div className="space-y-0.5">
          {isLoading ? (
            <>
              <div className="h-4 w-24 bg-zinc-100 dark:bg-zinc-800 rounded" />
              <div className="h-3 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{branch?.name}</h4>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wider bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                  {branch?.code}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-zinc-400">
                <span className="text-[10px] font-mono opacity-80">{branch?.id}</span>
                <button 
                  onClick={() => handleCopy(branch?.id)}
                  className="w-6 h-6 flex items-center justify-center hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors group shrink-0"
                  title={language === 'ar' ? 'نسخ المعرف' : 'Copy ID'}
                >
                  <span className="material-symbols-rounded opacity-50 group-hover:opacity-100" style={{ fontSize: '16px' }}>
                    {copied ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {isLoading ? (
          <>
            <div className="h-4 w-16 bg-zinc-50 dark:bg-zinc-800/50 rounded-full" />
            <div className="h-4 w-12 bg-zinc-50 dark:bg-zinc-800/50 rounded" />
          </>
        ) : (
          <>
            {/* Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-red-400'}`} />
              <span className={`text-xs font-bold uppercase ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}`}>
                {isActive ? (language === 'ar' ? 'نشط' : 'Active') : (language === 'ar' ? 'غير نشط' : 'Inactive')}
              </span>
            </div>
            
            {/* Creation Time */}
            <div className="flex items-center gap-2 text-zinc-400">
              <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-base)' }}>calendar_today</span>
              <span className="text-xs font-medium whitespace-nowrap">
                {branch?.createdAt ? formatDistanceToNow(new Date(branch.createdAt), { 
                  addSuffix: true, 
                  locale: language === 'ar' ? arEG : enUS 
                }) : (language === 'ar' ? 'غير متوفر' : 'N/A')}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export const BranchMasterMonitor: React.FC<BranchMasterMonitorProps> = ({ branches, color = 'primary', language, isLoading }) => {
  return (
    <div className={`p-5 rounded-3xl ${CARD_BASE} flex flex-col group h-full`}>
      <div className="flex justify-between items-center mb-4 shrink-0">
        <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
          <span className="material-symbols-rounded text-primary-500" style={{ fontSize: 'var(--icon-lg)' }}>
            monitoring
          </span>
          {language === 'ar' ? 'مراقبة الفروع' : 'Branch Monitor'}
        </h3>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 rounded-lg">
          {branches.length} {language === 'ar' ? 'فروع' : 'Branches'}
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto scrollbar-hide space-y-0 divide-y divide-zinc-100 dark:divide-zinc-800">
        {isLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => <BranchRow key={i} language={language} color={color} isLoading={true} />)}
          </>
        ) : branches.length === 0 ? (
          <div className="h-full flex items-center justify-center text-zinc-400 text-sm italic py-8">
            {language === 'ar' ? 'لا توجد فروع مضافة' : 'No branches added'}
          </div>
        ) : (
          branches.map((branch) => (
            <BranchRow 
              key={branch.id} 
              branch={branch} 
              language={language} 
              color={color} 
            />
          ))
        )}
      </div>
    </div>
  );
};
