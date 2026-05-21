import React, { useState } from 'react';
import { useSettings } from '../../context';
import { permissionsService } from '../../services/auth/permissionsService';
import type { Branch } from '../../types';

interface PendingBranchAssignmentProps {
  branches: Branch[];
  switchBranch: (branchId: string, skipClearEmployee?: boolean) => Promise<void>;
  onSelectEmployee?: (id: string | null) => void;
  onLogout?: () => Promise<void>;
  t: any;
}

export const PendingBranchAssignment: React.FC<PendingBranchAssignmentProps> = ({
  branches,
  switchBranch,
  onSelectEmployee,
  onLogout,
  t,
}) => {
  const { language } = useSettings();
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isAdmin = permissionsService.isOrgAdmin() || permissionsService.isManager();
  const translations = t.pendingBranch || {
    title: 'Branch Assignment Pending',
    subtitle: 'Your profile is active, but you are not assigned to a branch yet.',
    employeeMessage: 'Please ask your system administrator or organization owner to assign your profile to a branch in the HR/Staff settings.',
    switchProfile: 'Switch Profile',
    signOut: 'Sign Out',
    adminTitle: 'Activate a Branch',
    adminSubtitle: 'As an administrator, you can choose a branch to manage or create one if none exist.',
    selectBranch: 'Select Branch',
    selectBranchPlaceholder: 'Choose a branch to activate...',
    noBranches: 'No branches have been created yet.',
    createBranchBtn: 'Go to Branch Configuration',
    loadingBranches: 'Loading organization branches...',
    errorLoading: 'Failed to load branches',
    activateBtn: 'Activate Branch',
  };

  const handleActivate = async () => {
    if (!selectedBranchId) return;
    setIsActivating(true);
    setErrorMsg('');
    try {
      await switchBranch(selectedBranchId, true);
    } catch (err) {
      console.error(err);
      setErrorMsg(translations.errorLoading);
    } finally {
      setIsActivating(false);
    }
  };

  const handleSwitchProfile = () => {
    if (onSelectEmployee) {
      onSelectEmployee(null);
    }
  };

  const handleSignOut = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const isRtl = language === 'AR';

  return (
    <div 
      className="h-full w-full flex flex-col items-center justify-center p-8 select-none relative overflow-hidden bg-(--bg-page-surface)" 
      style={{ fontFamily: "'GraphicSansFont', sans-serif" }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* High-Visibility Grid Pattern */}
      <div 
        className="absolute inset-0 text-zinc-900/30 dark:text-zinc-100/20 pointer-events-none" 
        style={{ 
          backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)', 
          backgroundSize: '32px 32px', 
          maskImage: 'radial-gradient(circle, black, transparent 80%)' 
        }} 
      />

      <div className="flex flex-col items-center text-center max-w-md w-full relative z-10 animate-fade-in">
        <div className="mb-8 p-6 rounded-full bg-zinc-100/80 dark:bg-zinc-800/40 border border-zinc-200/50 dark:border-zinc-700/50 shadow-xs">
          <span className="material-symbols-rounded text-6xl text-primary-500 dark:text-blue-400 animate-pulse">
            domain_disabled
          </span>
        </div>

        <h1 className="text-3xl font-bold text-zinc-955 dark:text-zinc-50 tracking-tight mb-3">
          {isAdmin ? translations.adminTitle : translations.title}
        </h1>

        <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed mb-8 max-w-sm mx-auto">
          {isAdmin ? translations.adminSubtitle : translations.subtitle}
        </p>

        {/* Dynamic Inner Panel */}
        <div className="w-full bg-white/60 dark:bg-zinc-900/40 backdrop-blur-md rounded-2xl border border-zinc-200/60 dark:border-zinc-800/50 p-6 shadow-sm mb-6">
          {isAdmin ? (
            <div className={`space-y-4 ${isRtl ? 'text-right' : 'text-left'}`}>
              <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
                {translations.selectBranch}
              </label>

              {branches.length > 0 ? (
                <div className="space-y-4">
                  <div className="relative">
                    <select
                      value={selectedBranchId}
                      onChange={(e) => setSelectedBranchId(e.target.value)}
                      className={`w-full h-11 px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 appearance-none ${isRtl ? 'pl-10 text-right' : 'pr-10 text-left'}`}
                    >
                      <option value="">{translations.selectBranchPlaceholder}</option>
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                    <span className={`material-symbols-rounded absolute top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none ${isRtl ? 'left-3' : 'right-3'}`}>
                      unfold_more
                    </span>
                  </div>

                  {errorMsg && (
                    <p className="text-xs text-red-500 font-medium">{errorMsg}</p>
                  )}

                  <button
                    onClick={handleActivate}
                    disabled={!selectedBranchId || isActivating}
                    className="w-full h-11 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
                  >
                    {isActivating && (
                      <span className="material-symbols-rounded text-sm animate-spin">
                        progress_activity
                      </span>
                    )}
                    {translations.activateBtn}
                  </button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium mb-4">
                    {translations.noBranches}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                {translations.employeeMessage}
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-center gap-4 w-full">
          <button
            onClick={handleSwitchProfile}
            className="flex-1 min-w-[140px] h-10 px-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/30 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-rounded text-base">switch_account</span>
            {translations.switchProfile}
          </button>
          
          <button
            onClick={handleSignOut}
            className="flex-1 min-w-[140px] h-10 px-5 rounded-xl border border-transparent bg-red-500/10 hover:bg-red-500/20 text-xs font-bold text-red-600 dark:text-red-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-rounded text-base">logout</span>
            {translations.signOut}
          </button>
        </div>
      </div>
    </div>
  );
};
