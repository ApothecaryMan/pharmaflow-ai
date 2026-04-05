import React, { useState, useEffect, useCallback } from 'react';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/hr/employeeService';
import type { Branch, Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from '../common/Modal';
import { useData } from '../../services/DataContext';
import { useSettings } from '../../context';
import { SegmentedControl } from '../common/SegmentedControl';
import { MaterialTabs } from '../common/MaterialTabs';
import { SmartInput, SmartPhoneInput } from '../common/SmartInputs';
import { FilterDropdown } from '../common/FilterDropdown';

interface BranchSettingsProps {
  language: 'EN' | 'AR';
  color: string;
}

// --- Internal Helper Components ---

interface FormFieldProps {
  label: string;
  children: React.ReactNode;
  className?: string;
}

const FormField: React.FC<FormFieldProps> = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="block text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{label}</label>
    {children}
  </div>
);

interface BranchCardProps {
  branch: Branch;
  language: 'EN' | 'AR';
  onEdit: (branch: Branch) => void;
  onDelete: (id: string, name: string) => void;
  isSubmitting: boolean;
}

const BranchCard: React.FC<BranchCardProps> = ({ branch, language, onEdit, onDelete, isSubmitting }) => (
  <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col justify-between shadow-sm">
    <div>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col min-w-0">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 leading-tight truncate">
            {branch.name}
          </h3>
          <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mt-0.5">
            CODE: {branch.code}
          </span>
        </div>
        <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-tight shrink-0 ${
          branch.status === 'active' 
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
            : 'bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/20'
        }`}>
          <span className={`w-1 h-1 rounded-full ${branch.status === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
          {branch.status === 'active' ? (language === 'AR' ? 'نشط' : 'Active') : (language === 'AR' ? 'ملغي' : 'Inactive')}
        </div>
      </div>

      <div className="space-y-1.5 py-3 border-t border-zinc-100 dark:border-zinc-800/50 mt-1">
        <div className="flex items-start gap-2">
          <span className="material-symbols-rounded text-zinc-400 shrink-0" style={{ fontSize: '16px' }}>location_on</span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal pt-0.5 truncate">
            {branch.address || (language === 'AR' ? 'لم يتم تحديد عنوان' : 'No address set')}
          </span>
        </div>
        
        {branch.phone && (
          <div className="flex items-start gap-2">
            <span className="material-symbols-rounded text-zinc-400 shrink-0" style={{ fontSize: '16px' }}>call</span>
            <span className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-normal font-mono pt-0.5">
              {branch.phone}
            </span>
          </div>
        )}
      </div>
    </div>

    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-50 dark:border-zinc-800/30">
      <button
        onClick={() => onEdit(branch)}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer transition-none"
      >
        <span className="material-symbols-rounded" style={{ fontSize: '16px' }}>edit</span>
        {language === 'AR' ? 'تعديل' : 'Edit'}
      </button>
      <button
        disabled={isSubmitting}
        onClick={() => onDelete(branch.id, branch.name)}
        className="p-1.5 text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 disabled:opacity-50 cursor-pointer flex items-center justify-center transition-none"
        aria-label="Delete branch"
      >
        <span className="material-symbols-rounded" style={{ fontSize: '22px' }}>delete</span>
      </button>
    </div>
  </div>
);

export const BranchSettings: React.FC<BranchSettingsProps> = ({ language, color }) => {
  const t = TRANSLATIONS[language];
  const { refreshAll } = useData();
  const { activeBranchId } = useSettings();
  
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeView, setEmployeeView] = useState<'all' | 'selected'>('all');
  const [modalView, setModalView] = useState<'general' | 'employees'>('general');

  const loadData = useCallback(async () => {
    try {
      const bData = await branchService.getAll();
      setBranches(bData);
      const eData = await employeeService.getAll('ALL');
      setEmployees(eData);
    } catch (error) {
      console.error('Failed to load branch data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
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
    if (!editingBranch?.name || !editingBranch?.code || isSubmitting) return;

    setIsSubmitting(true);
    try {
      let savedBranch: Branch;
      if (editingBranch.id) {
        if (editingBranch.id === activeBranchId && editingBranch.status === 'inactive') {
          alert(language === 'AR' 
            ? 'لا يمكن الغاء تفعيل الفرع الحالي النشط' 
            : 'Cannot deactivate the currently active branch');
          setIsSubmitting(false);
          return;
        }
        savedBranch = await branchService.update(editingBranch.id, editingBranch);
      } else {
        savedBranch = await branchService.create(editingBranch as Omit<Branch, 'id' | 'createdAt' | 'updatedAt'>);
      }

      const allEmployees = await employeeService.getAll('ALL');
      const updatedEmployees = allEmployees.map(emp => {
        if (selectedEmployees.includes(emp.id)) {
          // If the employee is selected for this branch, update branchId
          return { ...emp, branchId: savedBranch.id };
        } else if (emp.branchId === savedBranch.id) {
          // If they WERE in this branch but are NO LONGER selected, 
          // we need to set them to some default or leave them unassigned.
          // However, we shouldn't completely orphan them if they only have 1 branchId limit.
          // Actually, unassigning them by removing their branchId IS correct for a 1-to-M relationship 
          // if they are removed from the UI checkbox. But setting it to '' causes bugs. 
          // Let's set it to 'UNASSIGNED' or keep logic as is but handle it gracefully elsewhere.
          return { ...emp, branchId: 'UNASSIGNED' };
        }
        return emp;
      }).filter(emp => {
        const original = allEmployees.find(e => e.id === emp.id);
        return original?.branchId !== emp.branchId;
      });

      if (updatedEmployees.length > 0) {
        await employeeService.save(updatedEmployees, 'ALL');
      }
      
      setIsModalOpen(false);
      await loadData();
      await refreshAll();
    } catch (err) {
      console.error("Failed to save branch:", err);
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
    if (id === activeBranchId) {
      alert(language === 'AR' ? 'لا يمكن الغاء تفعيل الفرع الحالي النشط' : 'Cannot deactivate the currently active branch');
      return;
    }

    if (window.confirm(`${t.settings.deleteBranchConfirm || 'Are you sure?'} (${name})`)) {
      setIsSubmitting(true);
      try {
        await branchService.update(id, { status: 'inactive' });
        await loadData();
        await refreshAll();
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  // --- Modal View Components ---

  const renderGeneralView = () => (
    <div className="grid grid-cols-2 gap-5">
      <FormField label={t.settings.branchName} className="col-span-2">
        <SmartInput
          type="text"
          value={editingBranch?.name || ''}
          onChange={(e) => setEditingBranch({ ...editingBranch!, name: e.target.value })}
          placeholder={t.settings.branchName}
        />
      </FormField>
      
      <FormField label={t.settings.branchCode}>
        <SmartInput
          type="text"
          dir="ltr"
          value={editingBranch?.code || ''}
          onChange={(e) => setEditingBranch({ ...editingBranch!, code: e.target.value })}
          placeholder="CODE-000"
        />
      </FormField>
      
      <FormField label={t.settings.branchStatus}>
        <FilterDropdown<'active' | 'inactive'>
          variant="input"
          floating={true}
          items={['active', 'inactive']}
          selectedItem={editingBranch?.status || 'active'}
          onSelect={(status) => setEditingBranch({ ...editingBranch!, status })}
          keyExtractor={(s) => s}
          renderSelected={(s) => (
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span className="text-sm font-medium">
                {s === 'active' ? (language === 'AR' ? 'نشط' : 'Active') : (language === 'AR' ? 'غير نشط' : 'Inactive')}
              </span>
            </div>
          )}
          renderItem={(s) => (
            <div className="flex items-center gap-2 py-1">
              <div className={`w-2 h-2 rounded-full ${s === 'active' ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span className="text-sm font-medium">
                {s === 'active' ? (language === 'AR' ? 'نشط' : 'Active') : (language === 'AR' ? 'غير نشط' : 'Inactive')}
              </span>
            </div>
          )}
        />
      </FormField>

      <FormField label={t.settings?.branchAddress || 'Address'} className="col-span-2">
        <SmartInput
          type="text"
          placeholder={language === 'AR' ? 'العنوان بالتفصيل' : 'Full address'}
          value={editingBranch?.address || ''}
          onChange={(e) => setEditingBranch({ ...editingBranch!, address: e.target.value })}
        />
      </FormField>
      
      <FormField label={t.settings?.branchPhone || 'Phone Number'} className="col-span-2">
        <SmartPhoneInput
          placeholder="+20..."
          value={editingBranch?.phone || ''}
          onChange={(val) => setEditingBranch({ ...editingBranch!, phone: val })}
        />
      </FormField>
    </div>
  );

  const renderEmployeesView = () => {
    const filteredList = employees
      .filter(emp => emp.id !== 'SUPER-ADMIN' && emp.employeeCode !== 'EMP-000')
      .filter(emp => employeeView === 'all' || selectedEmployees.includes(emp.id))
      .filter(emp => {
        const search = employeeSearchTerm.toLowerCase();
        return emp.name.toLowerCase().includes(search) || 
               emp.employeeCode.toLowerCase().includes(search) ||
               (emp.nameArabic && emp.nameArabic.includes(search));
      });

    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
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
            className="w-44"
          />
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-rounded text-zinc-400" style={{ fontSize: '20px' }}>search</span>
          <SmartInput
            type="text"
            value={employeeSearchTerm}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmployeeSearchTerm(e.target.value)}
            placeholder={language === 'AR' ? 'ابحث عن موظف...' : 'Search employee...'}
            className="pl-10"
          />
        </div>

        <div className="max-h-[350px] overflow-y-auto pr-1 custom-scrollbar grid grid-cols-1 gap-1">
          {filteredList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center opacity-40">
              <span className="material-symbols-rounded text-zinc-400" style={{ fontSize: '40px' }}>
                {employeeView === 'selected' ? 'bookmark_outline' : 'person_search'}
              </span>
              <p className="text-xs text-zinc-500 mt-2 font-medium">
                {employeeView === 'selected' 
                  ? (language === 'AR' ? 'لا يوجد موظفين مختارين' : 'No selected employees')
                  : (language === 'AR' ? 'لا توجد نتائج' : 'No results found')}
              </p>
            </div>
          ) : (
            filteredList.map((emp, idx) => {
              const isSelected = selectedEmployees.includes(emp.id);
              const currentBranch = branches.find(b => b.id === emp.branchId);
              return (
                <MaterialTabs 
                  key={emp.id} index={idx} total={filteredList.length} isSelected={isSelected}
                  onClick={() => isSelected ? setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id)) : setSelectedEmployees([...selectedEmployees, emp.id])}
                  className="!h-[54px] !px-3 border border-transparent"
                >
                  <div className="flex items-center w-full gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-none shrink-0 ${isSelected ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-950' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>
                      {isSelected ? <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>check</span> : getInitials(emp.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate text-zinc-900 dark:text-zinc-100">{emp.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5 opacity-60">
                        <span className="text-[9px] font-bold uppercase tracking-tight text-zinc-500 dark:text-zinc-400">{emp.role.replace('_', ' ')}</span>
                        {currentBranch && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-current opacity-30" />
                            <span className="text-[9px] font-bold opacity-70 truncate max-w-[100px] text-zinc-500 dark:text-zinc-400">{currentBranch.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={isSelected ? 'opacity-100' : 'opacity-20'}>
                       <span className="material-symbols-rounded text-zinc-400" style={{ fontSize: '20px' }}>{isSelected ? 'task_alt' : 'circle'}</span>
                    </div>
                  </div>
                </MaterialTabs>
              );
            })
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 flex flex-col h-full gap-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className={`text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 ${language === 'AR' ? 'font-arabic' : ''}`}>
            {t.settings.branchManagement}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
            {language === 'AR' ? 'إدارة مواقع الصيدلية وتعيينات الموظفين' : 'Manage pharmacy locations and staff assignments'}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-none bg-zinc-900 text-zinc-50 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-rounded" style={{ fontSize: '18px' }}>add</span>
          {t.settings.addBranch}
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 overflow-y-auto pr-2 custom-scrollbar">
        {branches.map((branch) => (
          <BranchCard
            key={branch.id} branch={branch} language={language}
            onEdit={handleOpenModal} onDelete={handleDelete}
            isSubmitting={isSubmitting}
          />
        ))}
      </div>

      <Modal
        isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}
        title={editingBranch?.id ? t.settings.branchManagement : t.settings.addBranch}
        className="max-w-xl" hideCloseButton={true}
        headerActions={
          <SegmentedControl
            size="sm" iconSize="18px" variant="onPage"
            value={modalView} onChange={(val) => setModalView(val as 'general' | 'employees')}
            options={[
              { label: language === 'AR' ? 'البيانات العامة' : 'General', value: 'general', icon: 'settings' },
              { label: language === 'AR' ? 'تعيين الموظفين' : 'Employees', value: 'employees', icon: 'group_add' }
            ]}
          />
        }
      >
        <div className="space-y-6 min-h-[400px] py-2">
          {modalView === 'general' ? renderGeneralView() : renderEmployeesView()}
        </div>

        <div className="flex gap-3 pt-6 border-t border-zinc-100 dark:border-zinc-800/50 mt-6">
          <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-none">
            {language === 'AR' ? 'إلغاء' : 'Cancel'}
          </button>
          <button
            disabled={isSubmitting} onClick={handleSave}
            className="flex-1 py-2.5 rounded-lg font-bold text-xs uppercase tracking-widest text-white shadow-sm disabled:opacity-50 flex items-center justify-center transition-none"
            style={{ backgroundColor: color }}
          >
            {isSubmitting ? (
              <span className="text-[10px] font-bold">{language === 'AR' ? 'جاري الحفظ...' : 'SAVING...'}</span>
            ) : (
              t.settings.saveBranch
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
};

