import React, { useState, useEffect } from 'react';
import { branchService } from '../../services/branchService';
import { employeeService } from '../../services/hr/employeeService';
import type { Branch, Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { Modal } from '../common/Modal';
import { useData } from '../../services/DataContext';

interface BranchSettingsProps {
  language: 'EN' | 'AR';
  color: string;
}

export const BranchSettings: React.FC<BranchSettingsProps> = ({ language, color }) => {
  const t = TRANSLATIONS[language];
  const { refreshAll } = useData();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Partial<Branch> | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allBranches = branchService.getAll();
    const allEmployees = await employeeService.getAll('ALL');
    setBranches(allBranches);
    setEmployees(allEmployees);
  };
  const handleOpenModal = (branch?: Branch) => {
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
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingBranch?.name || !editingBranch?.code) return;

    let savedBranch: Branch;
    if (editingBranch.id) {
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
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`${t.settings.deleteBranchConfirm || 'Are you sure you want to deactivate this branch?'} (${name})`)) {
      // Hardening: Instead of hard deletion, we deactivate (Soft Delete/Archive)
      // because historical records (sales/inventory) might depend on this ID.
      await branchService.update(id, { status: 'inactive' });
      await loadData();
      await refreshAll(); // Keep global state in sync
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className={`text-2xl font-bold ${language === 'AR' ? 'font-arabic' : ''}`} style={{ color }}>
            {t.settings.branchManagement}
          </h2>
          <p className="text-zinc-500">Manage pharmacy locations and staff assignments</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-4 py-2 rounded-lg text-white font-medium transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: color }}
        >
          {t.settings.addBranch}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {branches.map((branch) => (
          <div 
            key={branch.id} 
            className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{branch.name}</h3>
                <span className="text-sm text-zinc-500 font-mono">#{branch.code}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                branch.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {branch.status.toUpperCase()}
              </span>
            </div>

            <div className="space-y-2 mb-6">
              <div className="flex items-center text-sm text-zinc-600 dark:text-zinc-400">
                <span className="material-symbols-rounded text-base mr-2">location_on</span>
                {branch.address || 'No address set'}
              </div>
            </div>

            {branch.phone && (
              <div className="flex items-center text-xs text-zinc-500 mb-4 px-2 py-1 bg-zinc-50 dark:bg-zinc-800/50 rounded-md w-fit">
                <span className="material-symbols-rounded text-sm mr-1">call</span>
                {branch.phone}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(branch)}
                className="flex-1 py-2 text-sm font-medium rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                style={{ color }}
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(branch.id, branch.name)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
              >
                <span className="material-symbols-rounded">block</span>
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
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchName}</label>
              <input
                type="text"
                value={editingBranch?.name || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, name: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:outline-none focus:ring-2"
                style={{ '--tw-ring-color': color } as any}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchCode}</label>
              <input
                type="text"
                value={editingBranch?.code || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, code: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings.branchStatus}</label>
              <select
                value={editingBranch?.status || 'active'}
                onChange={(e) => setEditingBranch({ ...editingBranch, status: e.target.value as 'active' | 'inactive' })}
                className="w-full px-4 py-3 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings?.branchAddress || 'Address'}</label>
              <input
                type="text"
                placeholder="Full address"
                value={editingBranch?.address || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, address: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-zinc-500 mb-1">{t.settings?.branchPhone || 'Phone Number'}</label>
              <input
                type="text"
                placeholder="+20..."
                value={editingBranch?.phone || ''}
                onChange={(e) => setEditingBranch({ ...editingBranch, phone: e.target.value })}
                className="w-full px-4 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-500 mb-2">{t.settings.assignEmployees}</label>
            <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-lg p-2 space-y-1">
              {employees
                .filter(emp => emp.id !== 'SUPER-ADMIN' && emp.employeeCode !== 'EMP-000')
                .map((emp) => (
                <label 
                  key={emp.id} 
                  className="flex items-center p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedEmployees.includes(emp.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedEmployees([...selectedEmployees, emp.id]);
                      } else {
                        setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                      }
                    }}
                    className="rounded border-zinc-300 mr-3"
                    style={{ accentColor: color }}
                  />
                  <div className="flex-1">
                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{emp.name}</div>
                    <div className="text-xs text-zinc-500">{emp.role} {emp.branchId ? `(${branches.find(b => b.id === emp.branchId)?.name || 'Unknown'})` : ''}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={() => setIsModalOpen(false)}
              className="flex-1 py-2.5 rounded-lg font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-2.5 rounded-lg font-medium text-white shadow-lg transition-transform active:scale-95"
              style={{ backgroundColor: color }}
            >
              {t.settings.saveBranch}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
