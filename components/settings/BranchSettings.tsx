import React, { useState, useEffect, useCallback, useRef } from 'react';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/hr/employeeService';
import type { Branch, Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from '../common/Modal';
import { useData } from '../../services/DataContext';
import { useSettings } from '../../context';
import { CARD_BASE } from '../../utils/themeStyles';
import { SegmentedControl } from '../common/SegmentedControl';
import { MaterialTabs } from '../common/MaterialTabs';
import { SmartInput, SmartPhoneInput } from '../common/SmartInputs';
import { FilterDropdown } from '../common/FilterDropdown';

interface BranchSettingsProps {
  language: 'EN' | 'AR';
  color: string;
}

export const BranchSettings: React.FC<BranchSettingsProps> = ({ language, color }) => {
  const t = TRANSLATIONS[language];
  const { refreshAll } = useData();
  const { activeBranchId } = useSettings();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeView, setEmployeeView] = useState<'all' | 'selected'>('all');
  const [modalView, setModalView] = useState<'general' | 'employees'>('general');
  
  // Password Protection State
  const [isUnlocked, setIsUnlocked] = useState(() => 
    sessionStorage.getItem('branch_settings_unlocked') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Inactivity Timeout
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());
  const INACTIVITY_TIMEOUT = 12 * 60 * 1000; // 12 minutes (reduced from 15 for safety margin or per standard)

  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    
    setLastActivityTime(Date.now());
    
    inactivityTimeoutRef.current = setTimeout(() => {
      setIsUnlocked(false);
      sessionStorage.removeItem('branch_settings_unlocked');
      setPasswordInput('');
    }, INACTIVITY_TIMEOUT);
  }, [INACTIVITY_TIMEOUT]);

  const loadData = useCallback(async () => {
    if (!isUnlocked) return;
    const allBranches = branchService.getAll();
    const allEmployees = await employeeService.getAll('ALL');
    setBranches(allBranches);
    setEmployees(allEmployees);
  }, [isUnlocked]);

  const handleUnlock = (e?: React.FormEvent) => {
    e?.preventDefault();
    const correctPass = import.meta.env.VITE_BRANCH_SETTINGS_PASS;
    if (passwordInput === correctPass) {
      setIsUnlocked(true);
      sessionStorage.setItem('branch_settings_unlocked', 'true');
      setPasswordError(false);
      resetInactivityTimer();
    } else {
      setPasswordError(true);
    }
  };

  useEffect(() => {
    if (isUnlocked) {
      loadData();
    }
  }, [loadData, isUnlocked]);

  useEffect(() => {
    if (isUnlocked) {
      resetInactivityTimer();
    }
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      // Lock on Leave: Clear session unlock flag when navigating away
      sessionStorage.removeItem('branch_settings_unlocked');
    };
  }, [isUnlocked, resetInactivityTimer]);
  const handleOpenModal = (branch?: Branch) => {
    resetInactivityTimer();
    if (branch) {
      setEditingBranch(branch);
      // Find employees associated with this branch
      const branchEmployees = employees
        .filter(e => e.branchId === branch.id)
        .map(e => e.id);
      setSelectedEmployees(branchEmployees);
    } else {
      setEditingBranch({ name: '', code: '', status: 'active' });
      setSelectedEmployees([]);
    }
    setModalView('general');
    setEmployeeView('all');
    setEmployeeSearchTerm('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    resetInactivityTimer();
    if (!editingBranch?.name || !editingBranch?.code || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let savedBranch: Branch;
      if (editingBranch.id) {
        // Prevent deactivating the active branch via the edit modal status dropdown
        if (editingBranch.id === activeBranchId && editingBranch.status === 'inactive') {
          alert(language === 'AR' 
            ? 'لا يمكن الغاء تفعيل الفرع الحالي النشط' 
            : 'Cannot deactivate the currently active branch');
          setIsSubmitting(false);
          return;
        }
        savedBranch = branchService.update(editingBranch.id, editingBranch);
      } else {
        savedBranch = branchService.create(editingBranch as Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>);
      }

      // Update employee branch assignments efficiently
      const allEmployees = await employeeService.getAll('ALL');
      const updatedEmployees = allEmployees.map(emp => {
        if (selectedEmployees.includes(emp.id)) {
          return { ...emp, branchId: savedBranch.id };
        } else if (emp.branchId === savedBranch.id) {
          // If they were in this branch but now deselected, clear it
          return { ...emp, branchId: '' };
        }
        return emp;
      }).filter(emp => {
        // Small optimization: only include those that actually changed
        const original = allEmployees.find(e => e.id === emp.id);
        return original?.branchId !== emp.branchId;
      });

      if (updatedEmployees.length > 0) {
        // Use EmployeeService.save to update matching branch employees
        // and keep others as is.
        await employeeService.save(updatedEmployees, 'ALL');
      }
      
      setIsModalOpen(false);
      await loadData();
      await refreshAll(); // Keep global state in sync
    } catch (err) {
      console.error("Failed to save branch:", err);
      alert("Failed to save branch changes. Please check console.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const handleDelete = async (id: string, name: string) => {
    resetInactivityTimer();
    if (id === activeBranchId) {
      alert(language === 'AR' 
        ? 'لا يمكن الغاء تفعيل الفرع الحالي النشط' 
        : 'Cannot deactivate the currently active branch');
      return;
    }

    if (window.confirm(`${t.settings.deleteBranchConfirm || 'Are you sure you want to deactivate this branch?'} (${name})`)) {
      setIsSubmitting(true);
      try {
        // Hardening: Instead of hard deletion, we deactivate (Soft Delete/Archive)
        // because historical records (sales/inventory) might depend on this ID.
        await branchService.update(id, { status: 'inactive' });
        await loadData();
        await refreshAll(); // Keep global state in sync
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  if (!isUnlocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 dark:bg-black/40 backdrop-blur-sm animate-fade-in">
        <div className={`w-full max-w-sm ${CARD_BASE} rounded-[2rem] p-10 flex flex-col items-center text-center`}>
          <div className="mb-8">
            <span className="material-symbols-rounded text-zinc-400 dark:text-zinc-500" style={{ fontSize: 'var(--icon-3xl)' }}>lock</span>
          </div>

          <div className="mb-8">
            <h2 className={`text-2xl font-black mb-2 tracking-tight transition-all text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}>
              {language === 'AR' ? 'منطقة محمية' : 'Protected Area'}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed px-4">
              {language === 'AR' 
                ? 'يرجى إدخال كلمة مرور الفروع للمتابعة' 
                : 'Please enter the branch settings password to continue'}
            </p>
          </div>

          <form onSubmit={handleUnlock} className="w-full space-y-4">
            <div className="relative group">
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setPasswordError(false);
                }}
                placeholder={language === 'AR' ? '••••••••' : 'Password'}
                autoFocus
                className={`w-full px-5 py-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/70 border-2 transition-all outline-none text-center font-mono tracking-widest ${
                  passwordError 
                    ? 'border-red-500 ring-red-500/20' 
                    : 'border-zinc-100 dark:border-zinc-800 focus:border-zinc-300 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-800'
                }`}
              />
              {passwordError && (
                <p className="text-red-500 text-[10px] font-bold uppercase tracking-wider mt-2 bg-red-500/10 py-1 px-3 rounded-full inline-block">
                  {language === 'AR' ? 'كلمة المرور غير صحيحة' : 'Incorrect password'}
                </p>
              )}
            </div>
            
            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-colors active:scale-[0.98] flex items-center justify-center gap-2 group bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 cursor-pointer"
            >
              {language === 'AR' ? 'دخول المنطقة' : 'Unlock Area'}
              <span className="material-symbols-rounded text-base group-hover:translate-x-1 transition-transform rtl:group-hover:-translate-x-1 opacity-60">
                arrow_forward
              </span>
            </button>
          </form>
          
          <p className="mt-8 text-[10px] font-bold text-zinc-400 dark:text-zinc-600 uppercase tracking-[0.2em]">
            Secure Infrastructure
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col h-full animate-fade-in gap-6">
      <div className="flex justify-between items-center mb-2">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 page-title ${language === 'AR' ? 'font-arabic' : ''}`}>
            {t.settings.branchManagement}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {language === 'AR' 
              ? 'إدارة مواقع الصيدلية وتعيينات الموظفين' 
              : 'Manage pharmacy locations and staff assignments'}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-colors bg-zinc-900 text-zinc-50 hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300 cursor-pointer"
        >
          <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>add_circle</span>
          {t.settings.addBranch}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 overflow-y-auto pr-2 custom-scrollbar">
        {branches.map((branch) => (
          <div 
            key={branch.id} 
            className="group relative bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 leading-tight">
                    {branch.name}
                  </h3>
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-1">
                    ID: {branch.code}
                  </span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider ${
                  branch.status === 'active' 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                    : 'bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                }`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {branch.status === 'active' ? (language === 'AR' ? 'نشط' : 'Active') : (language === 'AR' ? 'ملغي' : 'Inactive')}
                </div>
              </div>

              <div className="space-y-3 py-4 border-y border-zinc-100 dark:border-zinc-800/50 my-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex-shrink-0">
                    <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-sm)' }}>location_on</span>
                  </div>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed pt-0.5">
                    {branch.address || (language === 'AR' ? 'لم يتم تحديد عنوان' : 'No address set')}
                  </span>
                </div>
                
                {branch.phone && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 flex-shrink-0">
                      <span className="material-symbols-rounded text-sm">call</span>
                    </div>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed font-mono pt-0.5">
                      {branch.phone}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={() => handleOpenModal(branch)}
                className="flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold rounded-xl bg-zinc-900/5 dark:bg-zinc-100/5 text-zinc-700 dark:text-zinc-300 transition-colors hover:bg-zinc-900/10 dark:hover:bg-zinc-100/10 border border-transparent dark:border-zinc-800/50 cursor-pointer"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>edit_square</span>
                {language === 'AR' ? 'تعديل البيانات' : 'Edit Details'}
              </button>
              <button
                disabled={isSubmitting}
                onClick={() => handleDelete(branch.id, branch.name)}
                className="p-3 text-rose-500 bg-rose-500/5 rounded-xl transition-colors hover:bg-rose-500/10 border border-rose-500/10 disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-lg)' }}>block</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBranch?.id ? t.settings.branchManagement : t.settings.addBranch}
        className="max-w-xl"
        hideCloseButton={true}
        headerActions={
          <SegmentedControl
            size="sm"
            iconSize='var(--icon-md)'
            variant="onPage"
            value={modalView}
            onChange={(val) => setModalView(val as 'general' | 'employees')}
            options={[
              { label: language === 'AR' ? 'البيانات العامة' : 'General', value: 'general', icon: 'settings' },
              { label: language === 'AR' ? 'تعيين الموظفين' : 'Employees', value: 'employees', icon: 'group_add' }
            ]}
          />
        }
      >
        <div className="space-y-6 min-h-[400px]">
          {modalView === 'general' ? (
            <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchName}</label>
                <SmartInput
                  type="text"
                  value={editingBranch?.name || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                  placeholder={t.settings.branchName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchCode}</label>
                <SmartInput
                  type="text"
                  dir="ltr"
                  value={editingBranch?.code || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                  placeholder="CODE-000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchStatus}</label>
                <FilterDropdown<'active' | 'inactive'>
                  variant="input"
                  floating={true}
                  items={['active', 'inactive']}
                  selectedItem={editingBranch?.status || 'active'}
                  onSelect={(status) => setEditingBranch({ ...editingBranch, status })}
                  keyExtractor={(s) => s}
                  renderSelected={(s) => (
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      <span className="text-sm">
                        {s === 'active' 
                          ? (language === 'AR' ? 'نشط' : 'Active') 
                          : (language === 'AR' ? 'غير نشط' : 'Inactive')}
                      </span>
                    </div>
                  )}
                  renderItem={(s) => (
                    <div className="flex items-center gap-2 py-1">
                      <div className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-green-500' : 'bg-zinc-400'}`} />
                      <span className="text-sm">
                        {s === 'active' 
                          ? (language === 'AR' ? 'نشط' : 'Active') 
                          : (language === 'AR' ? 'غير نشط' : 'Inactive')}
                      </span>
                    </div>
                  )}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings?.branchAddress || 'Address'}</label>
                <SmartInput
                  type="text"
                  placeholder={language === 'AR' ? 'العنوان بالتفصيل' : 'Full address'}
                  value={editingBranch?.address || ''}
                  onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings?.branchPhone || 'Phone Number'}</label>
                <SmartPhoneInput
                  placeholder="+20..."
                  value={editingBranch?.phone || ''}
                  onChange={(val) => setEditingBranch({ ...editingBranch, phone: val })}
                />
              </div>
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <span className="material-symbols-rounded text-zinc-400" style={{ fontSize: 'var(--icon-base)' }}>person_add</span>
                  {t.settings.assignEmployees}
                </label>
                
                <SegmentedControl
                  size="xs"
                  variant="onPage"
                  value={employeeView}
                  onChange={(val) => setEmployeeView(val as 'all' | 'selected')}
                  options={[
                    { label: language === 'AR' ? 'الكل' : 'All', value: 'all', count: employees.filter(e => e.id !== 'SUPER-ADMIN' && e.employeeCode !== 'EMP-000').length },
                    { label: language === 'AR' ? 'المختارة' : 'Selected', value: 'selected', count: selectedEmployees.length }
                  ]}
                  className="w-48"
                />
              </div>

              <div className="relative mb-4">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-zinc-400" style={{ fontSize: 'var(--icon-lg)' }}>search</span>
                <SmartInput
                  type="text"
                  value={employeeSearchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployeeSearchTerm(e.target.value)}
                  placeholder={language === 'AR' ? 'ابحث عن موظف...' : 'Search employee...'}
                  className="pl-10"
                />
                {employeeSearchTerm && (
                  <button 
                    onClick={() => setEmployeeSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
                  >
                    <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-base)' }}>cancel</span>
                  </button>
                )}
              </div>

              <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar grid grid-cols-1 gap-1">
                {(() => {
                  const filteredList = employees
                    .filter(emp => emp.id !== 'SUPER-ADMIN' && emp.employeeCode !== 'EMP-000')
                    .filter(emp => employeeView === 'all' || selectedEmployees.includes(emp.id))
                    .filter(emp => {
                      const search = employeeSearchTerm.toLowerCase();
                      return emp.name.toLowerCase().includes(search) || 
                             emp.employeeCode.toLowerCase().includes(search) ||
                             (emp.nameArabic && emp.nameArabic.includes(search));
                    });

                  if (filteredList.length === 0) {
                    return (
                      <div className="py-12 flex flex-col items-center justify-center text-center opacity-50">
                        <span className="material-symbols-rounded text-zinc-300 dark:text-zinc-700" style={{ fontSize: '40px' }}>
                          {employeeView === 'selected' ? 'bookmark_border' : 'person_search'}
                        </span>
                        <p className="text-xs text-zinc-500 mt-2">
                          {employeeView === 'selected' 
                            ? (language === 'AR' ? 'لا يوجد موظفين مختارين' : 'No selected employees')
                            : (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
                        </p>
                      </div>
                    );
                  }

                  return filteredList.map((emp, idx) => {
                    const isSelected = selectedEmployees.includes(emp.id);
                    const currentBranch = branches.find(b => b.id === emp.branchId);
                    
                    return (
                      <MaterialTabs 
                        key={emp.id}
                        index={idx}
                        total={filteredList.length}
                        isSelected={isSelected}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                          } else {
                            setSelectedEmployees([...selectedEmployees, emp.id]);
                          }
                        }}
                        className="!h-[54px] !px-3"
                      >
                        <div className="flex items-center w-full gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all shrink-0 ${
                            isSelected 
                            ? 'bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900' 
                            : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                          }`}>
                            {isSelected ? (
                              <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span>
                            ) : getInitials(emp.name)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className={`text-xs font-bold truncate ${isSelected ? 'text-zinc-900 dark:text-zinc-50' : 'text-zinc-700 dark:text-zinc-400'}`}>
                              {emp.name}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                              <span className="text-[9px] font-bold uppercase tracking-tight">
                                {emp.role.replace('_', ' ')}
                              </span>
                              {currentBranch && (
                                <>
                                  <span className="w-0.5 h-0.5 rounded-full bg-current opacity-30" />
                                  <span className="text-[9px] font-bold opacity-70 truncate max-w-[100px]">
                                    {currentBranch.name}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className={`transition-all ${isSelected ? 'opacity-100 scale-100' : 'opacity-20 scale-90'}`}>
                             <span className="material-symbols-rounded text-zinc-400" style={{ fontSize: '20px' }}>
                               {isSelected ? 'task_alt' : 'circle'}
                             </span>
                          </div>
                        </div>
                      </MaterialTabs>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              {language === 'AR' ? 'إلغاء' : 'Cancel'}
            </button>
            <button
              disabled={isSubmitting}
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-lg font-medium text-white shadow-lg transition-transform active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center"
              style={{ backgroundColor: color }}
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              ) : null}
              {t.settings.saveBranch}
            </button>
          </div>
      </Modal>
    </div>
  );
};
