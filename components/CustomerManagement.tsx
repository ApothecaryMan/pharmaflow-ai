import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../types';
import { useContextMenu } from './ContextMenu';
import { DataTable, Column } from './DataTable';
import { GOVERNORATES, CITIES, AREAS, getLocationName } from '../data/locations';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  color,
  t,
  language
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const { showMenu } = useContextMenu();

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // Location State
  const [availableCities, setAvailableCities] = useState<typeof CITIES>([]);
  const [availableAreas, setAvailableAreas] = useState<typeof AREAS>([]);

  // Update available cities when governorate changes
  useEffect(() => {
    if (formData.governorate) {
      setAvailableCities(CITIES.filter(c => c.governorate_id === formData.governorate));
    } else {
      setAvailableCities([]);
    }
  }, [formData.governorate]);

  // Update available areas when city changes
  useEffect(() => {
    if (formData.city) {
      setAvailableAreas(AREAS.filter(a => a.city_id === formData.city));
    } else {
      setAvailableAreas([]);
    }
  }, [formData.city]);

  const filteredCustomers = useMemo(() => {
    let result = customers;

    // Filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.phone.includes(query) ||
        (c.email && c.email.toLowerCase().includes(query)) ||
        (c.code && c.code.toLowerCase().includes(query)) ||
        (c.serialId && c.serialId.toString().includes(query))
      );
    }

    // Sort
    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const { key, direction } = sortConfig;
        let aValue: any = a[key as keyof Customer];
        let bValue: any = b[key as keyof Customer];

        // Handle specific keys
        if (key === 'purchases') {
            aValue = a.totalPurchases;
            bValue = b.totalPurchases;
        } else if (key === 'contact') {
            aValue = a.phone;
            bValue = b.phone;
        } else if (key === 'lastVisit') {
            aValue = new Date(a.lastVisit).getTime();
            bValue = new Date(b.lastVisit).getTime();
        } else if (key === 'serialId') {
            aValue = a.serialId || 0;
            bValue = b.serialId || 0;
        }

        if (aValue < bValue) return direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [customers, searchQuery, sortConfig]);

  const handleSort = (key: string, direction: 'asc' | 'desc') => {
    setSortConfig({ key, direction });
  };

  const generateUniqueCode = () => {
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = 'CUST-' + Math.floor(100000 + Math.random() * 900000).toString();
      // eslint-disable-next-line no-loop-func
      if (!customers.find(c => c.code === code)) {
        isUnique = true;
      }
    }
    return code;
  };

  const getNextSerialId = () => {
    if (customers.length === 0) return 1;
    const maxId = Math.max(...customers.map(c => c.serialId || 0));
    return maxId + 1;
  };

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        code: generateUniqueCode(),
        serialId: getNextSerialId(),
        status: 'active',
        points: 0,
        totalPurchases: 0,
        lastVisit: new Date().toISOString(),
        preferredContact: 'phone',
        chronicConditions: []
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({});
    setIsKioskMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.code) return;

    // Check for unique code if changed or new
    const existingCode = customers.find(c => c.code === formData.code && c.id !== editingCustomer?.id);
    if (existingCode) {
      alert('Customer code must be unique!');
      return;
    }

    if (editingCustomer) {
      onUpdateCustomer({ ...editingCustomer, ...formData } as Customer);
    } else {
      onAddCustomer({
        id: Date.now().toString(),
        ...formData,
        serialId: formData.serialId || getNextSerialId()
      } as Customer);
    }
    handleCloseModal();
  };

  const toggleCondition = (condition: string) => {
    const currentConditions = formData.chronicConditions || [];
    if (currentConditions.includes(condition)) {
      setFormData({ ...formData, chronicConditions: currentConditions.filter(c => c !== condition) });
    } else {
      setFormData({ ...formData, chronicConditions: [...currentConditions, condition] });
    }
  };

  const handleContextMenu = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    showMenu(e.clientX, e.clientY, [
        { label: t.modal.edit, icon: 'edit', action: () => handleOpenModal(customer) },
        { label: t.modal.delete || 'Delete', icon: 'delete', action: () => onDeleteCustomer(customer.id), danger: true },
        { separator: true },
        { label: 'Copy Code', icon: 'content_copy', action: () => navigator.clipboard.writeText(customer.code) }
    ]);
  };

  // Define Columns for DataTable
  const columns: Column<Customer>[] = [
    { 
      key: 'serialId', 
      label: '#', 
      sortable: true,
      render: (c) => <span className="font-mono text-slate-500">{c.serialId || '-'}</span>
    },
    { 
      key: 'code', 
      label: 'modal.code', 
      sortable: true,
      render: (c) => <span className="font-mono text-xs text-slate-500">{c.code}</span>
    },
    { 
      key: 'name', 
      label: 'headers.name', 
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full bg-${color}-100 text-${color}-600 flex items-center justify-center font-bold text-xs`}>
                {c.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
                <div>{c.name}</div>
                {(c.governorate || c.city) && (
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[10px]">location_on</span>
                        {getLocationName(c.governorate || '', 'gov', language)}
                        {c.city && `, ${getLocationName(c.city, 'city', language)}`}
                    </div>
                )}
            </div>
        </div>
      )
    },
    { 
      key: 'contact', 
      label: 'headers.contact', 
      sortable: true,
      render: (c) => (
        <div className="flex flex-col">
            <span className="flex items-center gap-1"><span className="material-symbols-rounded text-[14px]">call</span> {c.phone}</span>
            {c.email && <span className="flex items-center gap-1 text-xs text-slate-400"><span className="material-symbols-rounded text-[14px]">mail</span> {c.email}</span>}
        </div>
      )
    },
    { 
      key: 'purchases', 
      label: 'headers.purchases', 
      sortable: true,
      render: (c) => <span className="font-medium text-slate-900 dark:text-white">${c.totalPurchases.toFixed(2)}</span>
    },
    { 
      key: 'points', 
      label: 'headers.points', 
      sortable: true,
      render: (c) => (
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
            {c.points} pts
        </span>
      )
    },
    { 
      key: 'lastVisit', 
      label: 'headers.lastVisit', 
      sortable: true,
      render: (c) => <span className="text-slate-500">{new Date(c.lastVisit).toLocaleDateString()}</span>
    },
    { 
      key: 'status', 
      label: 'headers.status', 
      sortable: true,
      render: (c) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
            c.status === 'active' 
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
        }`}>
            {c.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      key: 'actions', 
      label: 'headers.actions', 
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1">
            <button 
                onClick={() => handleOpenModal(c)}
                className={`p-1.5 rounded-lg hover:bg-${color}-100 dark:hover:bg-${color}-900/50 text-${color}-600 dark:text-${color}-400 transition-colors`}
                title={t.modal.edit}
            >
                <span className="material-symbols-rounded text-[20px]">edit</span>
            </button>
            <button 
                onClick={() => onDeleteCustomer(c.id)}
                className={`p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors`}
                title={t.modal.delete || 'Delete'}
            >
                <span className="material-symbols-rounded text-[20px]">delete</span>
            </button>
        </div>
      )
    }
  ];

  // Address Form Section Component
  const AddressForm = () => (
    <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700 space-y-4">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-blue-500">location_on</span>
            {t.modal.address}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Governorate */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t.modal.governorate}</label>
                <select
                    value={formData.governorate || ''}
                    onChange={e => {
                        setFormData({
                            ...formData, 
                            governorate: e.target.value,
                            city: '', // Reset city and area
                            area: ''
                        });
                    }}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                >
                    <option value="">{t.modal.selectGovernorate}</option>
                    {GOVERNORATES.map(gov => (
                        <option key={gov.id} value={gov.id}>
                            {language === 'AR' ? gov.name_ar : gov.name_en}
                        </option>
                    ))}
                </select>
            </div>

            {/* City */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t.modal.city}</label>
                <select
                    value={formData.city || ''}
                    onChange={e => {
                        setFormData({
                            ...formData, 
                            city: e.target.value,
                            area: '' // Reset area
                        });
                    }}
                    disabled={!formData.governorate}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm disabled:opacity-50"
                >
                    <option value="">{t.modal.selectCity}</option>
                    {availableCities.map(city => (
                        <option key={city.id} value={city.id}>
                            {language === 'AR' ? city.name_ar : city.name_en}
                        </option>
                    ))}
                </select>
            </div>

            {/* Area */}
            <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">{t.modal.area}</label>
                <select
                    value={formData.area || ''}
                    onChange={e => setFormData({...formData, area: e.target.value})}
                    disabled={!formData.city}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm disabled:opacity-50"
                >
                    <option value="">{t.modal.selectArea}</option>
                    {availableAreas.map(area => (
                        <option key={area.id} value={area.id}>
                            {language === 'AR' ? area.name_ar : area.name_en}
                        </option>
                    ))}
                </select>
            </div>
        </div>

        {/* Street Address */}
        <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{t.modal.streetAddress}</label>
            <textarea
                value={formData.streetAddress || ''}
                onChange={e => setFormData({...formData, streetAddress: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                placeholder="123 Main St, Building 4, Apt 5..."
            />
        </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
        </div>
        
        <div className="flex gap-2">
            <button
            onClick={() => {
                handleOpenModal();
                setIsKioskMode(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl transition-all"
            title="Open Patient Self-Entry Mode"
            >
            <span className="material-symbols-rounded">monitor_heart</span>
            <span className="font-medium hidden md:inline">{t.modal.kioskMode}</span>
            </button>
            <button
            onClick={() => handleOpenModal()}
            className={`flex items-center gap-2 px-4 py-2.5 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl transition-all shadow-lg shadow-${color}-500/20`}
            >
            <span className="material-symbols-rounded">add</span>
            <span className="font-medium">{t.addCustomer}</span>
            </button>
        </div>
      </div>

      {/* Search & Content */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="relative group flex-1 w-full">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <span className="material-symbols-rounded text-[20px]">search</span>
            </span>
            <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border-none rounded-full text-sm w-full focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-slate-100 placeholder-slate-400 transition-all"
            />
          </div>
      </div>

      {/* Table Card */}
      <DataTable
        data={filteredCustomers}
        columns={columns}
        onSort={handleSort}
        onRowContextMenu={handleContextMenu}
        color={color}
        t={t}
      />

      {/* Admin Modal */}
      {isModalOpen && !isKioskMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingCustomer ? t.modal.edit : t.modal.add}
              </h3>
              <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Code & Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-1">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.code} *</label>
                    <div className="flex gap-2">
                        <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                        />
                        <button
                            type="button"
                            onClick={() => setFormData({...formData, code: generateUniqueCode()})}
                            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors"
                            title={t.modal.generateCode}
                        >
                            <span className="material-symbols-rounded text-[18px]">autorenew</span>
                        </button>
                    </div>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.name} *</label>
                    <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.phone} *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone || ''}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.email}</label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Address Section (Replaces old address field) */}
              <AddressForm />

              {/* Preferences */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.contact}</label>
                    <select
                        value={formData.preferredContact || 'phone'}
                        onChange={e => setFormData({...formData, preferredContact: e.target.value as any})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    >
                        <option value="phone">Phone Call</option>
                        <option value="sms">SMS / WhatsApp</option>
                        <option value="email">Email</option>
                    </select>
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.location}</label>
                    <input
                        type="text"
                        value={formData.preferredLocation || ''}
                        onChange={e => setFormData({...formData, preferredLocation: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder="e.g. Downtown Branch"
                    />
                 </div>
              </div>

              {/* Insurance */}
              <div className="p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                 <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded text-blue-500">health_and_safety</span>
                    Insurance Details
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">{t.modal.insurance}</label>
                        <input
                            type="text"
                            value={formData.insuranceProvider || ''}
                            onChange={e => setFormData({...formData, insuranceProvider: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">{t.modal.policy}</label>
                        <input
                            type="text"
                            value={formData.policyNumber || ''}
                            onChange={e => setFormData({...formData, policyNumber: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                        />
                    </div>
                 </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">{t.modal.conditions}</label>
                <div className="flex flex-wrap gap-2">
                    {['Diabetes', 'Hypertension', 'Asthma', 'Allergies', 'Heart Disease', 'Arthritis'].map(condition => (
                        <button
                            key={condition}
                            type="button"
                            onClick={() => toggleCondition(condition)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                (formData.chronicConditions || []).includes(condition)
                                    ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                                    : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                            }`}
                        >
                            {condition}
                        </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.notes}</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                >
                  {t.modal.cancel}
                </button>
                <button
                  type="submit"
                  className={`px-6 py-2 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all font-medium`}
                >
                  {t.modal.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Kiosk Mode - Updated with Address Form */}
      {isKioskMode && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-2xl bg-slate-50 dark:bg-slate-800 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-[90vh]">
                <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto bg-${color}-100 text-${color}-600 rounded-full flex items-center justify-center mb-4`}>
                        <span className="material-symbols-rounded text-4xl">person_add</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t.modal.kioskMode}</h1>
                    <p className="text-slate-500 dark:text-slate-400">Please fill in your details to register with us.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.name} *</label>
                            <input
                                type="text"
                                required
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.phone} *</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone || ''}
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="+1 234 567 890"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{t.modal.email}</label>
                                <input
                                    type="email"
                                    value={formData.email || ''}
                                    onChange={e => setFormData({...formData, email: e.target.value})}
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder="john@example.com"
                                />
                            </div>
                        </div>

                        {/* Address Form in Kiosk */}
                        <AddressForm />

                        {/* Medical Info */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                            <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                                <span className="material-symbols-rounded">medical_information</span>
                                Medical Information (Optional)
                            </h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t.modal.conditions}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Diabetes', 'Hypertension', 'Asthma', 'Allergies', 'Heart Disease'].map(condition => (
                                            <button
                                                key={condition}
                                                type="button"
                                                onClick={() => toggleCondition(condition)}
                                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                                    (formData.chronicConditions || []).includes(condition)
                                                        ? `bg-${color}-500 text-white shadow-md`
                                                        : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-blue-400'
                                                }`}
                                            >
                                                {condition}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={() => setIsKioskMode(false)}
                            className="flex-1 px-6 py-3 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
                        >
                            {t.modal.cancel}
                        </button>
                        <button
                            type="submit"
                            className={`flex-[2] px-6 py-3 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all font-bold text-lg`}
                        >
                            Register
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};
