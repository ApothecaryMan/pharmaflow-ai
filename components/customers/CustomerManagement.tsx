import React, { useState, useMemo, useEffect } from 'react';
import { Customer } from '../../types';
import { useContextMenu } from '../common/ContextMenu';
import { Avatar } from '@mui/material';
import { TanStackTable } from '../common/TanStackTable';
import { ColumnDef } from '@tanstack/react-table';
import { GOVERNORATES, CITIES, AREAS, getLocationName } from '../../data/locations';
import { useSmartDirection, SmartPhoneInput, SmartEmailInput } from '../common/SmartInputs';
import { FilterDropdown } from '../common/FilterDropdown';
import { COUNTRY_CODES } from '../../data/countryCodes';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { useStatusBar } from '../../components/layout/StatusBar';
import { UserRole, canPerformAction } from '../../config/permissions';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
  darkMode?: boolean;
  userRole: UserRole;
}

export const CustomerManagement: React.FC<CustomerManagementProps> = ({
  customers,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  color,
  t,
  language,
  darkMode,
  userRole
}) => {
  const { getVerifiedDate } = useStatusBar();
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { showMenu } = useContextMenu();
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // Location State
  const [availableCities, setAvailableCities] = useState<typeof CITIES>([]);
  const [availableAreas, setAvailableAreas] = useState<typeof AREAS>([]);
  
  // Dropdown States for Address
  const [isGovernorateOpen, setIsGovernorateOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isAreaOpen, setIsAreaOpen] = useState(false);

  // Smart Direction
  const nameDir = useSmartDirection(formData.name, t.modal.placeholders.johnDoe);
  const notesDir = useSmartDirection(formData.notes, t.modal.notes);
  const streetDir = useSmartDirection(formData.streetAddress, t.modal.placeholders.streetAddress);
  const locationDir = useSmartDirection(formData.preferredLocation, t.modal.placeholders.downtownBranch);
  const insuranceDir = useSmartDirection(formData.insuranceProvider);
  const policyDir = useSmartDirection(formData.policyNumber);

  // Preferred Contact Dropdown States
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isModalContactOpen, setIsModalContactOpen] = useState(false);

  // Contact Options
  const CONTACT_OPTIONS = [
    { id: 'phone', label: t.contactOptions.phone, icon: 'call' },
    { id: 'sms', label: t.contactOptions.sms, icon: 'sms' },
    { id: 'email', label: t.contactOptions.email, icon: 'mail' },
  ];

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

  const handleOpenAdd = () => {
      setMode('add');
      setEditingCustomer(null);
      setFormData({
        code: generateUniqueCode(),
        serialId: getNextSerialId(),
        status: 'active',
        points: 0,
        totalPurchases: 0,
        lastVisit: getVerifiedDate().toISOString(),
        preferredContact: 'phone',
        chronicConditions: []
      });
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setIsModalOpen(true);
  };

  const handleOpenProfile = (customer: Customer) => {
    setViewingCustomer(customer);
  };

  const handleCloseProfile = () => {
    setViewingCustomer(null);
  };

  const handleOpenKiosk = () => {
      setEditingCustomer(null);
      setFormData({
        code: generateUniqueCode(),
        serialId: getNextSerialId(),
        status: 'active',
        points: 0,
        totalPurchases: 0,
        lastVisit: getVerifiedDate().toISOString(),
        preferredContact: 'phone',
        chronicConditions: []
      });
      setIsKioskMode(true);
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
      handleCloseModal();
    } else {
      onAddCustomer({
        id: getVerifiedDate().getTime().toString(),
        ...formData,
        serialId: formData.serialId || getNextSerialId()
      } as Customer);
      
      if (isKioskMode) {
          handleCloseModal();
      } else {
          setShowSuccess(true);
          setTimeout(() => setShowSuccess(false), 3000);
          setMode('list');
      }
    }
  };

  const toggleCondition = (condition: string) => {
    const currentConditions = formData.chronicConditions || [];
    if (currentConditions.includes(condition)) {
      setFormData({ ...formData, chronicConditions: currentConditions.filter(c => c !== condition) });
    } else {
      setFormData({ ...formData, chronicConditions: [...currentConditions, condition] });
    }
  };

  // Helper: Get context menu actions for a customer
  const getCustomerActions = (customer: Customer) => [
    { 
      label: t.contextMenu?.showProfile || 'Show Profile Info', 
      icon: 'account_circle', 
      action: () => handleOpenProfile(customer)
    },
    { separator: true },
    { 
      label: t.modal.edit, 
      icon: 'edit', 
      action: () => handleOpenEdit(customer),
      disabled: !canPerformAction(userRole, 'customer.update')
    },
    { 
      label: t.modal.delete || 'Delete', 
      icon: 'delete', 
      action: () => onDeleteCustomer(customer.id),
      danger: true,
      disabled: !canPerformAction(userRole, 'customer.delete')
    }
  ];

  // Context Menu Handler (right-click)
  const handleContextMenu = (e: React.MouseEvent, customer: Customer) => {
    e.preventDefault();
    showMenu(e.clientX, e.clientY, getCustomerActions(customer));
  };

  // Long Press Handler for Touch Screens
  const handleLongPress = (e: React.TouchEvent, customer: Customer) => {
    e.preventDefault();
    const touch = e.touches[0] || e.changedTouches[0];
    showMenu(touch.clientX, touch.clientY, getCustomerActions(customer));
  };



  const getDetectedCountry = (phone: string | undefined) => {
    if (!phone) return null;
    
    // Exceptions: if starts with 01, 00201, or +201 -> return null
    if (phone.startsWith('01') || phone.startsWith('00201') || phone.startsWith('+201')) {
        return null;
    }

    // Check longer codes first to avoid partial matches
    // e.g. checking +1 vs +123 (if existing)
    const codes = [...COUNTRY_CODES].sort((a, b) => b.code.length - a.code.length);
    for (const c of codes) {
        if (phone.startsWith(c.code)) {
            return c;
        }
    }
    return null;
  };


  // Define Columns for TanStackTable
  const columns = useMemo<ColumnDef<Customer>[]>(() => [
    { 
      accessorKey: 'serialId', 
      header: '#', 
      cell: (info) => <span className="font-mono">{info.row.original.serialId || '-'}</span>,
      meta: { width: 60 }
    },
    { 
      accessorKey: 'code', 
      header: t.modal?.code || 'Code', 
      meta: { dir: language === 'AR' ? 'rtl' : 'ltr', width: 100, align: 'start' },
      cell: (info) => {
        const c = info.row.original;
        return (
          <span 
              className="font-mono text-xs cursor-pointer hover:text-blue-500 transition-colors relative group"
              title="Click to copy code"
              onClick={(e) => {
                  e.stopPropagation();
                  if (c.code) {
                       setCopyFeedback(true);
                       setTimeout(() => setCopyFeedback(false), 2000);
                  }
              }}
          >
              {c.code}
          </span>
        );
      }
    },
    { 
      accessorKey: 'name', 
      header: t.headers?.name || 'Name', 
      cell: (info) => {
        const c = info.row.original;
        return (
          <div className="flex items-center gap-3 w-full h-full">
              <Avatar 
                  sx={{ 
                      bgcolor: 'primary.main',
                      width: 32, 
                      height: 32,
                      fontSize: '0.8rem',
                      fontWeight: 'bold',
                      color: '#fff'
                  }}
              >
                  {c.name.substring(0, 2).toUpperCase()}
              </Avatar>
              <div className="flex flex-col min-w-0 overflow-hidden">
                  <div className="font-medium truncate leading-tight">{c.name}</div>
                  {(c.governorate || c.city) && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 truncate leading-tight">
                          <span className="material-symbols-rounded text-[10px]">location_on</span>
                          <span className="truncate">
                              {getLocationName(c.governorate || '', 'gov', language)}
                              {c.city && `, ${getLocationName(c.city, 'city', language)}`}
                          </span>
                      </div>
                  )}
              </div>
          </div>
        );
      },
      meta: { width: 250, align: 'start' }
    },
    { 
      accessorKey: 'phone', // Use phone for sorting 
      header: t.headers?.contact || 'Contact', 
      cell: (info) => {
        const c = info.row.original;
        return (
          <div className="flex flex-col w-full">
              <span className="flex items-center gap-1">
                 <span className="material-symbols-rounded text-[14px]">call</span> 
                 <span dir="ltr">{c.phone}</span>
              </span>
              {c.email && (
                 <span className="flex items-center gap-1 text-xs text-gray-400">
                    <span className="material-symbols-rounded text-[14px]">mail</span> 
                    {c.email}
                 </span>
              )}
          </div>
        );
      },
      meta: { width: 200, dir: 'ltr' }
    },
    { 
      accessorKey: 'totalPurchases', 
      header: t.headers?.purchases || 'Purchases', 
      meta: { width: 120, align: 'start' },
      cell: (info) => <span className="font-medium text-gray-900 dark:text-white" dir="ltr">${info.row.original.totalPurchases.toFixed(2)}</span>,
    },
    { 
      accessorKey: 'points', 
      header: t.headers?.points || 'Points', 
      meta: { align: 'center', width: 100 },
      cell: (info) => (
        <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-transparent border border-amber-200 text-amber-700 dark:border-amber-700 dark:text-amber-400">
            {parseFloat(Number(info.row.original.points || 0).toFixed(2))} pts
        </span>
      ),
    },
    { 
      accessorKey: 'lastVisit', 
      header: t.headers?.lastVisit || 'Last Visit', 
      cell: (info) => <span>{new Date(info.row.original.lastVisit).toLocaleDateString()}</span>,
      meta: { width: 120, align: 'center' }
    },
    { 
      accessorKey: 'status', 
      header: t.headers?.status || 'Status', 
      meta: { align: 'center', width: 100 },
      cell: (info) => {
        const c = info.row.original;
        const isActive = c.status?.toLowerCase() === 'active';
        return (
          <span className={`px-2 py-1 rounded-md text-xs font-medium bg-transparent border ${isActive ? 'border-green-200 text-green-700 dark:border-green-800 dark:text-green-400' : 'border-red-200 text-red-700 dark:border-red-800 dark:text-red-400'}`}>
              {t.status[c.status?.toLowerCase()] || c.status}
          </span>
        );
      },
    },
    { 
      id: 'actions', 
      header: '', 
      meta: { align: 'right', width: 100 },
      enableSorting: false,
      cell: (info) => {
        const c = info.row.original;
        return (
          <div className="flex justify-end gap-2">
              {canPerformAction(userRole, 'customer.update') && (
                <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(c); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-blue-500 transition-colors">
                    <span className="material-symbols-rounded text-[20px]">edit</span>
                </button>
              )}
              {canPerformAction(userRole, 'customer.delete') && (
                <button onClick={(e) => { e.stopPropagation(); onDeleteCustomer(c.id); }} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                    <span className="material-symbols-rounded text-[20px]">delete</span>
                </button>
              )}
          </div>
        );
      },
    }
  ], [language, t, color]);

  // Address Form Section Component
  const renderAddressForm = () => (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4">
        <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <span className="material-symbols-rounded text-blue-500">location_on</span>
            {t.modal.address}
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Governorate */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.modal.governorate}</label>
                <FilterDropdown
                    variant="input"
                    items={GOVERNORATES}
                    selectedItem={GOVERNORATES.find(g => g.id === formData.governorate)}
                    isOpen={isGovernorateOpen}
                    onToggle={() => setIsGovernorateOpen(!isGovernorateOpen)}
                    onSelect={(gov) => {
                        setFormData({
                            ...formData,
                            governorate: gov.id,
                            city: '',
                            area: ''
                        });
                        setIsGovernorateOpen(false);
                    }}
                    keyExtractor={(gov) => gov.id}
                    renderSelected={(gov) => gov ? (language === 'AR' ? gov.name_ar : gov.name_en) : t.modal.selectGovernorate}
                    renderItem={(gov) => language === 'AR' ? gov.name_ar : gov.name_en}
                    className="w-full h-[42px]"
                    color={color}
                />
            </div>

            {/* City */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.modal.city}</label>
                <FilterDropdown
                    variant="input"
                    items={availableCities}
                    selectedItem={availableCities.find(c => c.id === formData.city)}
                    isOpen={isCityOpen && !!formData.governorate}
                    onToggle={() => formData.governorate && setIsCityOpen(!isCityOpen)}
                    onSelect={(city) => {
                        setFormData({
                            ...formData,
                            city: city.id,
                            area: ''
                        });
                        setIsCityOpen(false);
                    }}
                    keyExtractor={(city) => city.id}
                    renderSelected={(city) => city ? (language === 'AR' ? city.name_ar : city.name_en) : t.modal.selectCity}
                    renderItem={(city) => language === 'AR' ? city.name_ar : city.name_en}
                    className="w-full h-[42px]"
                    color={color}
                    transparentIfSingle={false}
                    disabled={!formData.governorate}
                />
            </div>

            {/* Area */}
            <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t.modal.area}</label>
                <FilterDropdown
                    variant="input"
                    items={availableAreas}
                    selectedItem={availableAreas.find(a => a.id === formData.area)}
                    isOpen={isAreaOpen && !!formData.city}
                    onToggle={() => formData.city && setIsAreaOpen(!isAreaOpen)}
                    onSelect={(area) => {
                        setFormData({...formData, area: area.id});
                        setIsAreaOpen(false);
                    }}
                    keyExtractor={(area) => area.id}
                    renderSelected={(area) => area ? (language === 'AR' ? area.name_ar : area.name_en) : t.modal.selectArea}
                    renderItem={(area) => language === 'AR' ? area.name_ar : area.name_en}
                    className="w-full h-[42px]"
                    color={color}
                    transparentIfSingle={false}
                    disabled={!formData.city}
                />
            </div>
        </div>

        {/* Street Address */}
        <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">{t.modal.streetAddress}</label>
            <textarea
                value={formData.streetAddress || ''}
                onChange={e => setFormData({...formData, streetAddress: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                placeholder={t.modal.placeholders.streetAddress}
                dir={streetDir}
            />
        </div>
    </div>
  );

  const renderProfileModal = () => {
      if (!viewingCustomer) return null;
      const c = viewingCustomer;
      
      return (
        <Modal
            isOpen={!!viewingCustomer}
            onClose={handleCloseProfile}
            size="lg"
            zIndex={60}
        >
            <div 
                className="w-full"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 bg-gradient-to-br from-${color}-500 to-${color}-600 text-white relative overflow-hidden`}>
                    <div className="absolute top-0 ltr:right-0 rtl:left-0 p-3 opacity-20">
                        <span className="material-symbols-rounded text-[100px]">account_circle</span>
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-3xl font-bold tracking-wide type-expressive">{c.name}</h3>
                            {/* REMOVED CLOSE BUTTON AS REQUESTED */}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                             <div className="px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-sm border border-white/10 text-xs font-mono flex items-center gap-2">
                                <span className="material-symbols-rounded text-[14px]">qr_code</span>
                                {c.code}
                             </div>
                             <div className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-sm text-white border border-white/10`}>
                                {c.status}
                             </div>
                             {c.vip && (
                                 <div className="px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-400 text-amber-900 border border-amber-300 shadow-sm flex items-center gap-1">
                                    <span className="material-symbols-rounded text-[14px]">stars</span>
                                    VIP
                                 </div>
                             )}
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div 
                            className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center justify-center text-center"
                            style={{ boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px' }}
                        >
                            <span className="material-symbols-rounded text-amber-500 mb-1">loyalty</span>
                            <span className="text-2xl font-bold text-amber-700 dark:text-amber-500" dir="ltr">{parseFloat(Number(c.points || 0).toFixed(2))}</span>
                            <span className="text-xs font-medium text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wide">Points</span>
                        </div>
                        <div 
                            className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center text-center"
                            style={{ boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px' }}
                        >
                            <span className="material-symbols-rounded text-blue-500 mb-1">shopping_bag</span>
                            <span className="text-2xl font-bold text-blue-700 dark:text-blue-500">{c.totalPurchases?.toFixed(0) || 0}</span>
                            <span className="text-xs font-medium text-blue-600/70 dark:text-blue-500/70 uppercase tracking-wide">Total Purchases</span>
                        </div>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <span className="material-symbols-rounded text-[16px]">contact_phone</span>
                            Contact Details
                        </h4>
                        <div className="space-y-3">
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl relative overflow-hidden">
                                <span className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
                                    <span className="material-symbols-rounded text-[18px]">call</span>
                                </span>
                                <div className="w-full">
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between gap-2 w-full">
                                        <span dir="ltr">{c.phone}</span>
                                        {/* Country Badge */}
                                        {getDetectedCountry(c.phone) && (
                                            <span className={`px-1.5 py-0.5 bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300 rounded text-[10px] font-bold ms-auto`}>
                                                {language === 'AR' ? getDetectedCountry(c.phone)?.country_ar : getDetectedCountry(c.phone)?.country_en}
                                            </span>
                                        )}
                                    </p>
                                    <p className="text-xs text-gray-500">Mobile Number</p>
                                </div>
                            </div>
                            {c.email && (
                            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                                <span className={`w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400 flex items-center justify-center`}>
                                    <span className="material-symbols-rounded text-[18px]">mail</span>
                                </span>
                                <div>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{c.email}</p>
                                    <p className="text-xs text-gray-500">Email Address</p>
                                </div>
                            </div>
                            )}
                        </div>
                    </div>

                    {/* Address Info */}
                    {(c.governorate || c.city || c.area || c.streetAddress) && (
                        <div>
                             <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <span className="material-symbols-rounded text-[16px]">home_pin</span>
                                Address
                            </h4>
                            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm text-gray-700 dark:text-gray-300">
                                {c.streetAddress && <div className="mb-1 font-bold text-gray-900 dark:text-gray-100">{c.streetAddress}</div>}
                                <div className="text-gray-500 flex flex-wrap items-center gap-1 text-xs">
                                     {c.area ? getLocationName(c.area, 'area', language) : ''}
                                     {c.area && (c.city || c.governorate) ? ' - ' : ''}
                                     {c.city ? getLocationName(c.city, 'city', language) : ''}
                                     {c.city && c.governorate ? ' - ' : ''}
                                     {c.governorate ? getLocationName(c.governorate, 'gov', language) : ''}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end gap-2">
                    <button 
                         onClick={handleCloseProfile}
                         className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium text-sm transition-colors"
                    >
                        {t.modal.close}
                    </button>
                    <button 
                        onClick={() => {
                            handleCloseProfile();
                            handleOpenEdit(c);
                        }}
                        className={`px-4 py-2 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 font-medium text-sm transition-colors flex items-center gap-2`}
                    >
                        <span className="material-symbols-rounded text-[18px]">edit</span>
                        {t.modal.editProfile}
                    </button>
                </div>
            </div>
        </Modal>
      );
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{mode === 'list' ? t.title : (t.addCustomer || 'Add New Customer')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{mode === 'list' ? t.subtitle : (t.addCustomerSubtitle || 'Register a new customer')}</p>
        </div>
        
        <div className="flex gap-2 items-center">
            <button
            onClick={handleOpenKiosk}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-all text-xs font-bold"
            title="Open Patient Self-Entry Mode"
            >
            <span className="material-symbols-rounded text-[18px]">monitor_heart</span>
            <span className="hidden md:inline">{t.modal.kioskMode}</span>
            </button>

            <SegmentedControl
                value={mode}
                onChange={(val) => {
                    if (val === 'list') setMode('list');
                    else if (val === 'add') handleOpenAdd();
                }}
                color={color}
                shape="pill"
                size="sm"
                options={[
                    { label: t.allCustomers || 'All Customers', value: 'list' },
                    ...(canPerformAction(userRole, 'customer.add') ? [{ label: t.addCustomer || 'Add New Customer', value: 'add' }] : [])
                ]}
            />
        </div>
      </div>

      {/* Success Message */}
      {showSuccess && mode === 'add' && (
        <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800 flex items-center gap-3 animate-fade-in`}>
          <span className={`material-symbols-rounded text-${color}-600 dark:text-${color}-400`}>check_circle</span>
          <span className={`text-sm font-medium text-${color}-700 dark:text-${color}-300`}>{t.customerAddedSuccess || 'Customer added successfully!'}</span>
        </div>
      )}

      {mode === 'list' ? (
        <>


          {/* Table Card */}
          {/* Table Card */}
          <TanStackTable
            data={customers}
            columns={columns}
            onRowContextMenu={handleContextMenu}
            onRowLongPress={handleLongPress}
            tableId="customers_table"
            searchPlaceholder={t.searchPlaceholder}
            defaultHiddenColumns={['serialId']}
            color={color}
            enableTopToolbar={true}
            globalFilter={searchQuery}
            onSearchChange={setSearchQuery}
          />
        </>
      ) : (
        /* ADD CUSTOMER FORM VIEW - INLINE */
        <div className="flex-1 overflow-y-auto">
           <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20">
              
              {/* LEFT COLUMN: Main Info */}
              <div className="xl:col-span-2 space-y-6">
                 {/* Basic Details Card */}
                 <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm card-shadow">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                      <span className="material-symbols-rounded text-blue-500">person</span>
                      {t.basicInfo || 'Basic Information'}
                    </h3>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.code} *</label>
                            <div className="relative">
                                <input
                                type="text"
                                required
                                value={formData.code || ''}
                                onChange={e => setFormData({...formData, code: e.target.value})}
                                className="w-full px-3 py-2 pr-10 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                                dir="ltr"
                                />
                                <button
                                    type="button"
                                    onClick={() => setFormData({...formData, code: generateUniqueCode()})}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-blue-500 transition-colors"
                                    title={t.modal.generateCode}
                                >
                                    <span className="material-symbols-rounded text-[18px]">autorenew</span>
                                </button>
                            </div>
                        </div>
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.name} *</label>
                            <input
                            type="text"
                            required
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            dir={nameDir}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.phone} *</label>
                          <div className="relative">
                            <SmartPhoneInput
                                required
                                value={formData.phone || ''}
                                onChange={(val) => setFormData({...formData, phone: val})}
                                placeholder={t.modal.placeholders.phone}
                                className="w-full px-3 py-2 pr-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            />
                            {getDetectedCountry(formData.phone) && (
                                <div className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300 rounded text-[10px] font-bold`}>
                                    {language === 'AR' ? getDetectedCountry(formData.phone)?.country_ar : getDetectedCountry(formData.phone)?.country_en}
                                </div>
                            )}
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.email}</label>
                          <SmartEmailInput
                            value={formData.email || ''}
                            onChange={(val) => setFormData({...formData, email: val})}
                            className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            placeholder={t.modal.placeholders.email}
                          />
                        </div>
                    </div>

                    <div className="mt-4">
                        {renderAddressForm()}
                    </div>
                 </div>

                 {/* Medical Info Card */}
                  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 card-shadow">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                      <span className="material-symbols-rounded text-blue-500">medical_services</span>
                      {t.modal.conditions}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2">
                        {['diabetes', 'hypertension', 'asthma', 'allergies', 'heartDisease', 'arthritis'].map(condition => (
                            <button
                                key={condition}
                                type="button"
                                onClick={() => toggleCondition(condition)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                    (formData.chronicConditions || []).includes(condition)
                                        ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                }`}
                            >
                                {t.conditions[condition]}
                            </button>
                        ))}
                    </div>

                    <div className="mt-4">
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.notes}</label>
                        <textarea
                          value={formData.notes || ''}
                          onChange={e => setFormData({...formData, notes: e.target.value})}
                          rows={2}
                          className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm resize-none"
                          dir={notesDir}
                        />
                    </div>
                 </div>
              </div>

              {/* RIGHT COLUMN: Additional Info */}
              <div className="xl:col-span-1 space-y-6">
                  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 card-shadow h-full">
                      <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4">
                        <span className="material-symbols-rounded text-blue-500">settings</span>
                        {t.modal.preferences}
                      </h3>

                      <div className="space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.contact}</label>
                            <FilterDropdown
                                variant="input"
                                items={CONTACT_OPTIONS}
                                selectedItem={CONTACT_OPTIONS.find(o => o.id === (formData.preferredContact || 'phone'))}
                                isOpen={isContactOpen}
                                onToggle={() => setIsContactOpen(!isContactOpen)}
                                onSelect={(option) => {
                                    setFormData({...formData, preferredContact: option.id as any});
                                    setIsContactOpen(false);
                                }}
                                keyExtractor={(item) => item.id}
                                renderSelected={(item) => (
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-rounded text-[18px] text-gray-500">{item?.icon}</span>
                                        <span>{item?.label}</span>
                                    </div>
                                )}
                                renderItem={(item) => (
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-rounded text-[18px] text-gray-500">{item.icon}</span>
                                        <span>{item.label}</span>
                                    </div>
                                )}
                                className="w-full h-[42px]"
                             />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.location}</label>
                            <input
                                type="text"
                                value={formData.preferredLocation || ''}
                                onChange={e => setFormData({...formData, preferredLocation: e.target.value})}
                                className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                placeholder={t.modal.placeholders.downtownBranch}
                                dir={locationDir}
                            />
                          </div>

                          <div className="border-t border-gray-100 dark:border-gray-800 my-4"></div>
                          
                          <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">{t.modal.insurance}</h4>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.insurance}</label>
                              <input
                                  type="text"
                                  value={formData.insuranceProvider || ''}
                                  onChange={e => setFormData({...formData, insuranceProvider: e.target.value})}
                                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                  dir={insuranceDir}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.policy}</label>
                              <input
                                  type="text"
                                  value={formData.policyNumber || ''}
                                  onChange={e => setFormData({...formData, policyNumber: e.target.value})}
                                  className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                                  dir="ltr"
                              />
                          </div>
                      </div>

                      <div className="mt-8">
                          <button
                            type="submit"
                            className={`w-full py-3 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all font-bold`}
                          >
                            {t.modal.save || 'Save Customer'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode('list')}
                            className="w-full py-3 mt-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium"
                          >
                            {t.modal.cancel}
                          </button>
                      </div>
                  </div>
              </div>
           </form>
        </div>
      )}

      {/* Admin Modal - ONLY FOR EDITING NOW */}
      <Modal 
        isOpen={isModalOpen && !isKioskMode && !!editingCustomer} 
        onClose={handleCloseModal}
        size="2xl"
        zIndex={50}
      >
        {isModalOpen && !isKioskMode && editingCustomer && (
            <>
            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {t.modal.edit}
              </h3>
              <button 
                  onClick={handleCloseModal} 
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Code & Basic Info */}
              <div className="grid grid-cols-3 gap-4">
                 <div className="col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.code} *</label>
                    <div className="flex gap-2">
                        <input
                        type="text"
                        required
                        value={formData.code || ''}
                        onChange={e => setFormData({...formData, code: e.target.value})}
                        className="w-full px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono text-sm"
                        dir="ltr"
                        />
                    </div>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.name} *</label>
                    <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    dir={nameDir}
                    />
                 </div>
              </div>
              
              <div className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.phone} *</label>
                  <div className="relative">
                    <SmartPhoneInput
                        required
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({...formData, phone: val})}
                        className="w-full px-4 py-2 pr-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                    {getDetectedCountry(formData.phone) && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[10px] font-bold">
                            {language === 'AR' ? getDetectedCountry(formData.phone)?.country_ar : getDetectedCountry(formData.phone)?.country_en}
                        </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.email}</label>
                  <SmartEmailInput
                    value={formData.email || ''}
                    onChange={(val) => setFormData({...formData, email: val})}
                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Address Section */}
              {renderAddressForm()}

              {/* Preferences */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.contact}</label>
                     <FilterDropdown
                        variant="input"
                        items={CONTACT_OPTIONS}
                        selectedItem={CONTACT_OPTIONS.find(o => o.id === (formData.preferredContact || 'phone'))}
                        isOpen={isModalContactOpen}
                        onToggle={() => setIsModalContactOpen(!isModalContactOpen)}
                        onSelect={(option) => {
                            setFormData({...formData, preferredContact: option.id as any});
                            setIsModalContactOpen(false);
                        }}
                        keyExtractor={(item) => item.id}
                        renderSelected={(item) => (
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-[18px] text-gray-500">{item?.icon}</span>
                                <span>{item?.label}</span>
                            </div>
                        )}
                        renderItem={(item) => (
                            <div className="flex items-center gap-2">
                                <span className="material-symbols-rounded text-[18px] text-gray-500">{item.icon}</span>
                                <span>{item.label}</span>
                            </div>
                        )}
                        className="w-full h-[42px]"
                     />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.location}</label>
                    <input
                        type="text"
                        value={formData.preferredLocation || ''}
                        onChange={e => setFormData({...formData, preferredLocation: e.target.value})}
                        className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        placeholder={t.modal.placeholders.downtownBranch}
                        dir={locationDir}
                    />
                 </div>
              </div>

              {/* Insurance */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700">
                 <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <span className="material-symbols-rounded text-blue-500">health_and_safety</span>
                    {t.modal.insuranceDetails}
                 </h4>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.modal.insurance}</label>
                        <input
                            type="text"
                            value={formData.insuranceProvider || ''}
                            onChange={e => setFormData({...formData, insuranceProvider: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            dir={insuranceDir}
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">{t.modal.policy}</label>
                        <input
                            type="text"
                            value={formData.policyNumber || ''}
                            onChange={e => setFormData({...formData, policyNumber: e.target.value})}
                            className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                            dir="ltr"
                        />
                    </div>
                 </div>
              </div>

              {/* Chronic Conditions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t.modal.conditions}</label>
                <div className="flex flex-wrap gap-2">
                    {['diabetes', 'hypertension', 'asthma', 'allergies', 'heartDisease', 'arthritis'].map(condition => (
                        <button
                            key={condition}
                            type="button"
                            onClick={() => toggleCondition(condition)}
                            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                                (formData.chronicConditions || []).includes(condition)
                                    ? `bg-${color}-100 text-${color}-700 border border-${color}-200`
                                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                            }`}
                        >
                            {t.conditions[condition]}
                        </button>
                    ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.notes}</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  dir={notesDir}
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
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
            </>
        )}
      </Modal>

      {/* Kiosk Mode - Updated with Address Form */}
      <Modal 
        isOpen={isKioskMode}
        onClose={() => setIsKioskMode(false)}
        size="2xl"
        zIndex={100}
      >
        <div className="w-full h-full bg-gray-50 dark:bg-gray-800 p-8 overflow-y-auto">
             <div className="text-center mb-8">
                    <div className={`w-16 h-16 mx-auto bg-${color}-100 text-${color}-600 rounded-full flex items-center justify-center mb-4`}>
                        <span className="material-symbols-rounded text-4xl">person_add</span>
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{t.modal.kioskMode}</h1>
                    <p className="text-gray-500 dark:text-gray-400">{t.modal.kioskDesc}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.name} *</label>
                        <input
                            type="text"
                            required
                            value={formData.name || ''}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder={t.modal.placeholders.johnDoe}
                            dir={nameDir}
                        />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.phone} *</label>
                            <div className="relative">
                                <SmartPhoneInput
                                    required
                                    value={formData.phone || ''}
                                    onChange={(val) => setFormData({...formData, phone: val})}
                                    className="w-full px-4 py-3 pr-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    placeholder={t.modal.placeholders.phone}
                                />
                                {getDetectedCountry(formData.phone) && (
                                    <div className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-${color}-100 text-${color}-700 dark:bg-${color}-900/30 dark:text-${color}-300 rounded text-[10px] font-bold`}>
                                        {language === 'AR' ? getDetectedCountry(formData.phone)?.country_ar : getDetectedCountry(formData.phone)?.country_en}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t.modal.email}</label>
                            <SmartEmailInput
                                value={formData.email || ''}
                                onChange={(val) => setFormData({...formData, email: val})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder={t.modal.placeholders.email}
                            />
                        </div>
                    </div>

                    {/* Address Form in Kiosk */}
                    {renderAddressForm()}

                    {/* Medical Info */}
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                        <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2">
                            <span className="material-symbols-rounded">medical_information</span>
                            {t.modal.medicalInfo}
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{t.modal.conditions}</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Diabetes', 'Hypertension', 'Asthma', 'Allergies', 'Heart Disease'].map(condition => (
                                        <button
                                            key={condition}
                                            type="button"
                                            onClick={() => toggleCondition(condition)}
                                            className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                                (formData.chronicConditions || []).includes(condition)
                                                    ? `bg-${color}-500 text-white shadow-md`
                                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:border-blue-400'
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
                        className="flex-1 px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
                    >
                        {t.modal.cancel}
                    </button>
                    <button
                        type="submit"
                        className={`flex-[2] px-6 py-3 bg-${color}-500 hover:bg-${color}-600 text-white rounded-xl shadow-lg shadow-${color}-500/20 transition-all font-bold text-lg`}
                    >
                        {t.modal.register}
                    </button>
                </div>
            </form>
        </div>
      </Modal>
      {renderProfileModal()}

      {/* Copy Feedback Toast */}
      {copyFeedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in">
           <span className="material-symbols-rounded text-[18px] text-green-400">check_circle</span>
           <span className="text-sm font-medium">{t.modal.copied}</span>
        </div>
      )}
    </div>
  );
};
