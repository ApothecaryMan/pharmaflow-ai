import type { ColumnDef } from '@tanstack/react-table';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useStatusBar } from '../../components/layout/StatusBar';
import { permissionsService } from '../../services/auth/permissions';
import { COUNTRY_CODES } from '../../data/countryCodes';
import { AREAS, CITIES, GOVERNORATES, getLocationName } from '../../data/locations';
import type { Customer } from '../../types';
import { idGenerator } from '../../utils/idGenerator';
import { useData } from '../../services/DataContext';
import { useContextMenu } from '../common/ContextMenu';
import { FilterDropdown } from '../common/FilterDropdown';
import { LocationSelector } from '../common/LocationSelector';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { SmartEmailInput, SmartPhoneInput, SmartInput, SmartTextarea, useSmartDirection } from '../common/SmartInputs';
import { PriceDisplay, TanStackTable } from '../common/TanStackTable';
import { InteractiveCard } from '../common/InteractiveCard';
import { type FilterConfig } from '../common/FilterPill';
import { authService } from '../../services/auth/authService';
import { Switch } from '../common/Switch';
import { useSettings } from '../../context';
import { branchService } from '../../services/branchService';
import { Tooltip } from '../common/Tooltip';
import { PageHeader } from '../common/PageHeader';
import { SearchInput } from '../common/SearchInput';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

interface CustomerManagementProps {
  customers: Customer[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'serialId' | 'code' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  color: string;
  t: any;
  language: 'EN' | 'AR';
  darkMode?: boolean;
  isLoading?: boolean;
  onViewChange?: (view: string, params?: Record<string, any>) => void;
  currentEmployeeId?: string;
  navigationParams?: Record<string, any> | null;
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
  isLoading,
  onViewChange,
  currentEmployeeId,
  navigationParams,
}) => {
  const { getVerifiedDate } = useStatusBar();
  
  useEffect(() => {
    if (navigationParams?.mode === 'add') {
      setMode('add');
      setEditingCustomer(null);
      setFormData({
        status: 'active',
        points: 0,
        totalPurchases: 0,
        lastVisit: getVerifiedDate().toISOString(),
        preferredContact: 'phone',
        chronicConditions: [],
      });
    } else {
      setMode('list');
    }
  }, [navigationParams]);

  const { activeBranchId, branches } = useData();
  const { theme: currentTheme } = useSettings();
  const [showAllBranches, setShowAllBranches] = useState(false);
  const currentUser = authService.getCurrentUserSync();
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, any[]>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isKioskMode, setIsKioskMode] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { showMenu } = useContextMenu();
  const [showSuccess, setShowSuccess] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'additional'>('basic');
  const [showStats, setShowStats] = useState(() => storage.get<boolean>(StorageKeys.HEADER_STATS_VISIBLE, false));

  useEffect(() => {
    storage.set(StorageKeys.HEADER_STATS_VISIBLE, showStats);
  }, [showStats]);

  const MODAL_TABS = [
    { label: t.modal.basicInfo, value: 'basic', icon: 'person' },
    { label: t.modal.additionalInfo, value: 'more_horiz', icon: 'more_horiz' },
  ];

  // Form State
  const [formData, setFormData] = useState<Partial<Customer>>({});

  // Dropdown States for Address
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Smart Direction
  const nameDir = useSmartDirection(formData.name, t.modal.placeholders.johnDoe);
  const notesDir = useSmartDirection(formData.notes, t.modal.notes);
  const streetDir = useSmartDirection(formData.streetAddress, t.modal.placeholders.streetAddress);
  const locationDir = useSmartDirection(
    formData.preferredLocation,
    t.modal.placeholders.downtownBranch
  );
  const insuranceDir = useSmartDirection(formData.insuranceProvider);
  const policyDir = useSmartDirection(formData.policyNumber);

  // Preferred Contact Dropdown States
  const [isModalContactOpen, setIsModalContactOpen] = useState(false);

  // Contact Options
  const CONTACT_OPTIONS = [
    { id: 'phone', label: t.contactOptions.phone, icon: 'call' },
    { id: 'sms', label: t.contactOptions.sms, icon: 'sms' },
    { id: 'email', label: t.contactOptions.email, icon: 'mail' },
  ];
 
  const statusFilterConfig = useMemo<FilterConfig>(() => ({
    id: 'status',
    label: t.headers?.status || 'Status',
    icon: 'rule',
    mode: 'single',
    options: [
      { label: t.status?.active || 'Active', value: 'active', icon: 'check_circle' },
      { label: t.status?.inactive || 'Inactive', value: 'inactive', icon: 'cancel' },
    ],
  }), [t]);

  // Contact Options



  /**
   * generateUniqueCode - Generates a mnemonic code (e.g., CUST-123456)
   * Centralized in idGenerator.code
   */
  const generateUniqueCode = () => {
    return idGenerator.code('CUST');
  };

  /**
   * getNextSerialId - Finds the highest existing serialId 
   * and returns the next value in the sequence.
   */
  const getNextSerialId = () => {
    return idGenerator.generate('customers-serial', activeBranchId);
  };

  /**
   * Generator Strategy Reference: 
   * - Unique code: 'CUST-' + 6-digit random (e.g., CUST-123456)
   * - Serial ID: Max existing serial + 1
   * Delegated to: useEntityActions.handleAddCustomer for final verification
   */
  const handleOpenAdd = () => {
    setMode('add');
    setEditingCustomer(null);
    setFormData({
      status: 'active',
      points: 0,
      totalPurchases: 0,
      lastVisit: getVerifiedDate().toISOString(),
      preferredContact: 'phone',
      chronicConditions: [],
    });
  };

  const handleOpenEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData(customer);
    setActiveTab('basic');
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
      status: 'active',
      points: 0,
      totalPurchases: 0,
      lastVisit: getVerifiedDate().toISOString(),
      preferredContact: 'phone',
      chronicConditions: [],
    });
    setIsKioskMode(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setFormData({});
    setIsKioskMode(false);
    setActiveTab('basic');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) return;

    if (editingCustomer) {
      onUpdateCustomer({ ...editingCustomer, ...formData } as Customer);
      handleCloseModal();
    } else {
      // Logic for ID, serialId, and code is centralized in the service layer.
      onAddCustomer(formData as any);

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
      setFormData({
        ...formData,
        chronicConditions: currentConditions.filter((c) => c !== condition),
      });
    } else {
      setFormData({ ...formData, chronicConditions: [...currentConditions, condition] });
    }
  };

  // Helper: Get context menu actions for a customer
  const getCustomerActions = (customer: Customer) => [
    {
      label: t.contextMenu.showProfile,
      icon: 'account_circle',
      action: () => handleOpenProfile(customer),
    },
    {
      label: t.contextMenu.viewHistory,
      icon: 'manage_search',
      action: () => onViewChange && onViewChange('customer-history', { customerId: customer.id }),
    },
    { separator: true },
    {
      label: t.modal.edit,
      icon: 'edit',
      action: () => handleOpenEdit(customer),
      disabled: !permissionsService.can('customer.update'),
    },
    {
      label: t.modal.delete,
      icon: 'delete',
      action: () => onDeleteCustomer(customer.id),
      danger: true,
      disabled: !permissionsService.can('customer.delete'),
    },
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

  const filteredCustomers = useMemo(() => {
    if (showAllBranches) return customers;
    return customers.filter((c) => c.branchId === activeBranchId);
  }, [customers, showAllBranches, activeBranchId]);

  // Summary Stats
  const summaryStats = useMemo(() => {
    const now = getVerifiedDate();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Activity thresholds
    const thirtyDaysAgo = now.getTime() - (30 * 24 * 60 * 60 * 1000);
    const oneYearAgo = now.getTime() - (365 * 24 * 60 * 60 * 1000);

    return customers.reduce(
      (acc, c) => {
        const createdTime = c.createdAt ? new Date(c.createdAt).getTime() : 0;
        const lastVisitTime = c.lastVisit ? new Date(c.lastVisit).getTime() : 0;

        // Growth stats
        if (createdTime >= todayStart) acc.newToday += 1;
        if (createdTime >= monthStart) acc.newThisMonth += 1;
        acc.total += 1;

        // Activity stats
        if (lastVisitTime >= thirtyDaysAgo) acc.activeRecently += 1;
        if (lastVisitTime >= oneYearAgo) acc.activeTotal += 1;

        return acc;
      },
      { total: 0, newThisMonth: 0, newToday: 0, activeTotal: 0, activeRecently: 0 }
    );
  }, [customers, getVerifiedDate]);

  // Define Columns for TanStackTable
  const columns = useMemo<ColumnDef<Customer>[]>(
    () => [
      {
        accessorKey: 'branchId',
        header: t.headers?.branch || 'Branch',
        meta: { width: 150, align: 'start' },
        cell: (info) => {
          const branchId = info.getValue() as string;
          const branch = branches.find((b) => b.id === branchId);
          return (
            <div className='flex items-center gap-2'>
              <span className='material-symbols-rounded text-gray-400 text-sm'>store</span>
              <span className='text-xs font-medium text-gray-600 dark:text-gray-400'>
                {branch?.name || branchId}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'serialId',
        header: '#',
        meta: { width: 60, align: 'start' },
      },
      {
        accessorKey: 'code',
        header: t.modal?.code || 'Code',
        meta: { dir: language === 'AR' ? 'rtl' : 'ltr', width: 100, align: 'start' },
      },
      {
        accessorKey: 'name',
        header: t.headers?.name || 'Name',
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className='flex items-center gap-3 w-full h-full'>
              <div
                className="flex items-center justify-center rounded-full text-white font-bold"
                style={{
                  backgroundColor: 'var(--color-primary)',
                  width: '32px',
                  height: '32px',
                  fontSize: '0.8rem',
                }}
              >
                {c.name.substring(0, 2).toUpperCase()}
              </div>
              <div className='flex flex-col min-w-0 overflow-hidden'>
                <div className='font-medium truncate leading-tight'>{c.name}</div>
                {(c.governorate || c.city) && (
                  <div className='text-[10px] text-gray-400 flex items-center gap-1 truncate leading-tight'>
                    <span className='material-symbols-rounded text-[10px]'>location_on</span>
                    <span className='truncate'>
                      {getLocationName(c.governorate || '', 'gov', language)}
                      {c.city && `, ${getLocationName(c.city, 'city', language)}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        },
        meta: { width: 250, align: 'start' },
      },
      {
        accessorKey: 'phone', // Use phone for sorting
        header: t.headers?.contact || 'Contact',
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className='flex flex-col w-full'>
              <span className='flex items-center gap-1'>
                <span className='material-symbols-rounded text-[14px]'>call</span>
                <span dir='ltr'>{c.phone}</span>
              </span>
              {c.email && (
                <span className='flex items-center gap-1 text-xs text-gray-400'>
                  <span className='material-symbols-rounded text-[14px]'>mail</span>
                  {c.email}
                </span>
              )}
            </div>
          );
        },
        meta: { width: 200, dir: 'ltr' },
      },
      {
        accessorKey: 'totalPurchases',
        header: t.headers?.purchases || 'Purchases',
        meta: { width: 120, align: 'start' },
        cell: (info) => <PriceDisplay value={info.row.original.totalPurchases} />,
      },
      {
        accessorKey: 'points',
        header: t.headers?.points || 'Points',
        meta: { align: 'center', width: 100 },
        cell: (info) => (
          <span className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg border border-current text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider bg-transparent'>
            <span className='material-symbols-rounded text-xs'>loyalty</span>
            {parseFloat(Number(info.row.original.points || 0).toFixed(2))} pts
          </span>
        ),
      },
      {
        accessorKey: 'lastVisit',
        header: t.headers?.lastVisit || 'Last Visit',
        meta: { width: 120, align: 'center' },
      },
      {
        accessorKey: 'status',
        header: t.headers?.status || 'Status',
        meta: { align: 'center', width: 100 },
        cell: (info) => {
          const c = info.row.original;
          const isActive = c.status?.toLowerCase() === 'active';
          const color = isActive ? 'emerald' : 'red';
          const icon = isActive ? 'check_circle' : 'cancel';
          return (
            <span
              className={`inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-lg border border-current text-primary-700 dark:text-primary-400 text-xs font-bold uppercase tracking-wider bg-transparent`}
            >
              <span className='material-symbols-rounded text-sm'>{icon}</span>
              {t.status[c.status?.toLowerCase()] || c.status}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: '',
        meta: { align: 'end', width: 100 },
        enableSorting: false,
        cell: (info) => {
          const c = info.row.original;
          return (
            <div className='flex justify-end gap-2'>
              {permissionsService.can('customer.update') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenEdit(c);
                  }}
                  className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-primary-500 transition-colors'
                >
                  <span className='material-symbols-rounded text-[20px]'>edit</span>
                </button>
              )}
              {permissionsService.can('customer.delete') && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteCustomer(c.id);
                  }}
                  className='p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400 hover:text-red-500 transition-colors'
                >
                  <span className='material-symbols-rounded text-[20px]'>delete</span>
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [language, t, color, onDeleteCustomer, handleOpenEdit, branches]
  );

  const tableColumns = useMemo(() => {
    if (showAllBranches) return columns;
    return columns.filter(col => (col as any).accessorKey !== 'branchId');
  }, [columns, showAllBranches]);

  // Address Form Section Component
  const renderAddressForm = () => (
    <div className='p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700 space-y-4'>
      <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
        <span className='material-symbols-rounded text-primary-500'>location_on</span>
        {t.modal.address}
      </h4>

      <LocationSelector
        language={language}
        selectedGovernorate={formData.governorate}
        selectedCity={formData.city}
        selectedArea={formData.area}
        onGovernorateChange={(val) => setFormData(prev => ({ ...prev, governorate: val }))}
        onCityChange={(val) => setFormData(prev => ({ ...prev, city: val }))}
        onAreaChange={(val) => setFormData(prev => ({ ...prev, area: val }))}
        t={t}
        color={color}
      />

      <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>

      {/* Street Address */}
      <div>
        <label className='block text-xs font-medium text-gray-500 mb-1'>
          {t.modal.streetAddress}
        </label>
        <SmartTextarea
          value={formData.streetAddress || ''}
          onChange={(e) => setFormData({ ...formData, streetAddress: e.target.value })}
          rows={2}
          className='resize-none'
          placeholder={t.modal.placeholders.streetAddress}
        />
      </div>
    </div>
  </div>
);

  const renderProfileModal = () => {
    if (!viewingCustomer) return null;
    const c = viewingCustomer;

    return (
      <Modal isOpen={!!viewingCustomer} onClose={handleCloseProfile} size='lg' zIndex={60}>
        <div className='w-full' onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div
            className={`p-6 bg-linear-to-br from-primary-500 to-primary-600 text-white relative overflow-hidden`}
          >
            <div className='absolute top-0 ltr:right-0 rtl:left-0 p-3 opacity-20'>
              <span className='material-symbols-rounded text-[100px]'>account_circle</span>
            </div>
            <div className='relative z-10'>
              <div className='flex justify-between items-start mb-4'>
                <h3 className='text-3xl font-bold tracking-wide'>{c.name}</h3>
                {/* REMOVED CLOSE BUTTON AS REQUESTED */}
              </div>
              <div className='flex gap-2 flex-wrap'>
                <div className='px-2.5 py-1 rounded-lg bg-black/20 backdrop-blur-xs border border-white/10 text-xs font-mono flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[14px]'>qr_code</span>
                  {c.code}
                </div>
                {(() => {
                  const isActive = c.status?.toLowerCase() === 'active';
                  const color = isActive ? 'emerald' : 'red';
                  const icon = isActive ? 'check_circle' : 'cancel';
                  return (
                    <div
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/20`}
                    >
                      <span className='material-symbols-rounded text-sm'>{icon}</span>
                      {t.status[c.status?.toLowerCase()] || c.status}
                    </div>
                  );
                })()}
                {c.vip && (
                  <div className='inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-400 text-amber-900 border border-amber-300 shadow-xs'>
                    <span className='material-symbols-rounded text-sm'>stars</span>
                    VIP
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className='p-6 space-y-6 max-h-[70vh] overflow-y-auto'>
            {/* Stats Grid */}
            <div className='grid grid-cols-2 gap-4'>
              <div
                className='p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex flex-col items-center justify-center text-center'
                style={{
                  boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px',
                }}
              >
                <span className='material-symbols-rounded text-amber-500 mb-1'>loyalty</span>
                <span className='text-2xl font-bold text-amber-700 dark:text-amber-500' dir='ltr'>
                  {parseFloat(Number(c.points || 0).toFixed(2))}
                </span>
                <span className='text-xs font-medium text-amber-600/70 dark:text-amber-500/70 uppercase tracking-wide'>
                  Points
                </span>
              </div>
              <div
                className='p-4 rounded-xl bg-gray-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 flex flex-col items-center justify-center text-center'
                style={{
                  boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 3px, rgba(0, 0, 0, 0.24) 0px 1px 2px',
                }}
              >
                <span className='material-symbols-rounded text-primary-500 mb-1'>shopping_bag</span>
                <PriceDisplay value={c.totalPurchases || 0} size="lg" />
                <span className='text-xs font-medium text-primary-600/70 dark:text-primary-500/70 uppercase tracking-wide'>
                  Total Purchases
                </span>
              </div>
            </div>

            {/* Contact Info */}
            <div>
              <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[16px]'>contact_phone</span>
                Contact Details
              </h4>
              <div className='space-y-3'>
                <div className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl relative overflow-hidden'>
                  <span
                    className={`w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center`}
                  >
                    <span className='material-symbols-rounded text-[18px]'>call</span>
                  </span>
                  <div className='w-full'>
                    <p className='text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center justify-between gap-2 w-full'>
                      <span dir='ltr'>{c.phone}</span>
                      {/* Country Badge */}
                      {getDetectedCountry(c.phone) && (
                        <span
                          className={`px-1.5 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-sm text-[10px] font-bold ms-auto`}
                        >
                          {language === 'AR'
                            ? getDetectedCountry(c.phone)?.country_ar
                            : getDetectedCountry(c.phone)?.country_en}
                        </span>
                      )}
                    </p>
                    <p className='text-xs text-gray-500'>Mobile Number</p>
                  </div>
                </div>
                {c.email && (
                  <div className='flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl'>
                    <span
                      className={`w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 flex items-center justify-center`}
                    >
                      <span className='material-symbols-rounded text-[18px]'>mail</span>
                    </span>
                    <div>
                      <p className='text-sm font-medium text-gray-900 dark:text-gray-100'>
                        {c.email}
                      </p>
                      <p className='text-xs text-gray-500'>Email Address</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Info */}
            {(c.governorate || c.city || c.area || c.streetAddress) && (
              <div>
                <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[16px]'>home_pin</span>
                  Address
                </h4>
                <div className='p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl text-sm text-gray-700 dark:text-gray-300'>
                  {c.streetAddress && (
                    <div className='mb-1 font-bold text-gray-900 dark:text-gray-100'>
                      {c.streetAddress}
                    </div>
                  )}
                  <div className='text-gray-500 flex flex-wrap items-center gap-1 text-xs'>
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
          <div className='p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/30 flex justify-end gap-2'>
            <button
              onClick={handleCloseProfile}
              className='px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-gray-600 dark:text-gray-400 font-medium text-sm transition-colors'
            >
              {t.modal.close}
            </button>
            <button
              onClick={() => {
                handleCloseProfile();
                handleOpenEdit(c);
              }}
              className={`px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 font-medium text-sm transition-colors flex items-center gap-2`}
            >
              <span className='material-symbols-rounded text-[18px]'>edit</span>
              {t.modal.editProfile}
            </button>
          </div>
        </div>
      </Modal>
    );
  };

  return (
    <div className='h-full flex flex-col space-y-6 overflow-hidden'>
      <PageHeader
        leftContent={
          mode === 'list' ? (
            <div className="w-full max-w-md">
              <SearchInput
                value={searchQuery}
                onSearchChange={setSearchQuery}
                placeholder={t.searchPlaceholder || 'Search customers...'}
                color={color}
                filterConfigs={[statusFilterConfig]}
                activeFilters={activeFilters}
                onUpdateFilter={(gid, vals) => setActiveFilters(prev => ({ ...prev, [gid]: vals }))}
              />
            </div>
          ) : null
        }
        centerContent={
          <SegmentedControl
            options={[
              { value: 'customers', label: t.allCustomers || 'List', icon: 'group' },
              { value: 'add-customer', label: t.addCustomer || 'Add', icon: 'person_add' },
              { value: 'customer-history', label: t.customerHistory?.title || 'History', icon: 'history' },
            ]}
            value={mode === 'add' ? 'add-customer' : 'customers'}
            onChange={(val) => {
              if (val === 'add-customer') {
                setMode('add');
              } else if (val === 'customers') {
                setMode('list');
              } else {
                onViewChange?.(val);
              }
            }}
            variant="onPage"
            shape="pill"
            color={color}
            size="md"
            iconSize="--icon-lg"
            useGraphicFont={true}
            className="w-full sm:w-[480px]"
          />
        }
        rightContent={
          mode === 'list' ? (
            <div className='flex gap-2 items-center animate-fade-in'>
              {permissionsService.can('customer.add') && (
                <button
                  onClick={handleOpenKiosk}
                  className='flex items-center gap-2 px-4 py-2 bg-transparent border border-zinc-200 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-500 text-zinc-700 dark:text-zinc-300 transition-all rounded-full text-xs font-bold'
                  title='Open Patient Self-Entry Mode'
                >
                  <span className='material-symbols-rounded text-[18px]'>monitor_heart</span>
                  <span className='hidden md:inline'>{t.modal.kioskMode}</span>
                </button>
              )}
                <label className='flex items-center gap-2 px-3 py-2 rounded-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors'>
                  <span className='text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider select-none'>
                    {t.globalView}
                  </span>
                  <Switch
                    checked={showAllBranches}
                    onChange={setShowAllBranches}
                  />
                </label>

                {/* Stats Toggle Arrow */}
                <Tooltip content={showStats ? t.hideSummary : t.showSummary}>
                  <button
                    onClick={() => setShowStats(!showStats)}
                    className="flex items-center justify-center w-8 h-8 rounded-full transition-all bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                  >
                    <span className={`material-symbols-rounded transition-transform duration-300 ${showStats ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                </Tooltip>
            </div>
          ) : null
        }
        showBottom={showStats && mode === 'list'}
        bottomContent={
          mode === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
              <InteractiveCard
                isLoading={isLoading}
                className={`flex flex-col px-5 py-3.5 rounded-3xl ${language === 'AR' ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-primary-50 dark:bg-primary-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-primary-600 dark:text-primary-400 mb-1">
                          {t.summary?.total || 'Total Customers'}
                        </span>
                        <span className="text-2xl font-bold text-primary-900 dark:text-primary-100">
                          {summaryStats.total}
                        </span>
                      </div>
                    ),
                  },
                  {
                    theme: 'bg-green-50 dark:bg-green-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-green-600 dark:text-green-400 mb-1">
                          {t.summary?.newThisMonth || 'New This Month'}
                        </span>
                        <span className="text-2xl font-bold text-green-900 dark:text-green-100">
                          {summaryStats.newThisMonth}
                        </span>
                      </div>
                    ),
                  },
                  {
                    theme: 'bg-cyan-50 dark:bg-cyan-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-cyan-600 dark:text-cyan-400 mb-1">
                          {t.summary?.newToday || 'New Today'}
                        </span>
                        <span className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                          {summaryStats.newToday}
                        </span>
                      </div>
                    ),
                  }
                ]}
              />

              <InteractiveCard
                isLoading={isLoading}
                className={`flex flex-col px-5 py-3.5 rounded-3xl ${language === 'AR' ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-indigo-50 dark:bg-indigo-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                          {t.summary?.activeTotal || 'Active (Yearly)'}
                        </span>
                        <span className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                          {summaryStats.activeTotal}
                        </span>
                      </div>
                    ),
                  },
                  {
                    theme: 'bg-violet-50 dark:bg-violet-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-violet-600 dark:text-violet-400 mb-1">
                          {t.summary?.activeRecently || 'Active (30 Days)'}
                        </span>
                        <span className="text-2xl font-bold text-violet-900 dark:text-violet-100">
                          {summaryStats.activeRecently}
                        </span>
                      </div>
                    ),
                  }
                ]}
              />

              <InteractiveCard
                isLoading={isLoading}
                className={`flex flex-col px-5 py-3.5 rounded-3xl ${language === 'AR' ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-amber-50 dark:bg-amber-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 mb-1">
                          {language === 'AR' ? 'متوسط النقاط' : 'Avg. Points'}
                        </span>
                        <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                          {(summaryStats.total > 0 ? customers.reduce((acc, c) => acc + (c.points || 0), 0) / summaryStats.total : 0).toFixed(0)}
                        </span>
                      </div>
                    ),
                  }
                ]}
              />

              <InteractiveCard
                isLoading={isLoading}
                className={`flex flex-col px-5 py-3.5 rounded-3xl ${language === 'AR' ? 'items-end' : 'items-start'}`}
                pages={[
                  {
                    theme: 'bg-emerald-50 dark:bg-emerald-900/20',
                    content: (
                      <div className={`flex flex-col w-full ${language === 'AR' ? 'items-end' : 'items-start'}`}>
                        <span className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                          {language === 'AR' ? 'متوسط المشتريات' : 'Avg. Purchases'}
                        </span>
                        <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                          <PriceDisplay value={summaryStats.total > 0 ? customers.reduce((acc, c) => acc + (c.totalPurchases || 0), 0) / summaryStats.total : 0} />
                        </span>
                      </div>
                    ),
                  }
                ]}
              />
            </div>
          ) : null
        }
      />

      <div className="flex-1 min-h-0 flex flex-col space-y-6 animate-fade-in">

      {/* Success Message */}
      {showSuccess && mode === 'add' && (
        <div
          className={`p-4 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 flex items-center gap-3 animate-fade-in`}
        >
          <span className={`material-symbols-rounded text-primary-600 dark:text-primary-400`}>
            check_circle
          </span>
          <span className={`text-sm font-medium text-primary-700 dark:text-primary-300`}>
            {t.customerAddedSuccess}
          </span>
        </div>
      )}

      {mode === 'list' ? (
        <>
          {/* Table Card */}
          <div className="flex-1 min-h-0">
            <TanStackTable
              data={filteredCustomers}
              columns={tableColumns}
              onRowContextMenu={handleContextMenu}
              onRowLongPress={handleLongPress}
              tableId='customers_table'
              searchPlaceholder={t.searchPlaceholder}
              defaultHiddenColumns={['serialId']}
              color={color}
              isLoading={isLoading && filteredCustomers.length === 0}
              globalFilter={searchQuery}
              onSearchChange={setSearchQuery}
              enablePagination={true}
              enableVirtualization={false}
              pageSize='auto'
              enableShowAll={true}
              enableSearch={false}
              enableTopToolbar={false}
              filterableColumns={[statusFilterConfig]}
              initialFilters={activeFilters}
              onFilterChange={setActiveFilters}
              manualFiltering={false}
            />
          </div>
        </>
      ) : (
        /* ADD CUSTOMER FORM VIEW - INLINE */
        <div className='flex-1 overflow-y-auto'>
          <form onSubmit={handleSubmit} className='grid grid-cols-1 xl:grid-cols-3 gap-6 pb-20'>
            {/* LEFT COLUMN: Main Info */}
            <div className='xl:col-span-2 space-y-6'>
              {/* Basic Details Card */}
              <div className='bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 p-6 shadow-xs card-shadow'>
                <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-primary-500'>person</span>
                  {t.basicInfo || 'Basic Information'}
                </h3>

                <div className='grid grid-cols-3 gap-4'>
                  <div className='col-span-1'>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.code} *
                    </label>
                    <div className='relative'>
                      <SmartInput
                        type='text'
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder={t.modal.placeholders.code}
                      />
                      <button
                        type='button'
                        onClick={() => setFormData({ ...formData, code: generateUniqueCode() })}
                        className='absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-primary-500 transition-colors'
                        title={t.modal.generateCode}
                      >
                        <span className='material-symbols-rounded text-[18px]'>autorenew</span>
                      </button>
                    </div>
                  </div>
                  <div className='col-span-2'>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.name} *
                    </label>
                    <SmartInput
                      type='text'
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.modal.placeholders.johnDoe}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-2 gap-4 mt-4'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.phone} *
                    </label>
                    <div className='relative'>
                      <SmartPhoneInput
                        required
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        placeholder={t.modal.placeholders.phone}
                        className='w-full px-3 py-2 pr-24 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 focus:ring-2 focus:ring-blue-500 outline-hidden transition-all text-sm'
                      />
                      {getDetectedCountry(formData.phone) && (
                        <div
                          className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-sm text-[10px] font-bold`}
                        >
                          {language === 'AR'
                            ? getDetectedCountry(formData.phone)?.country_ar
                            : getDetectedCountry(formData.phone)?.country_en}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.email}
                    </label>
                    <SmartEmailInput
                      value={formData.email || ''}
                      onChange={(val) => setFormData({ ...formData, email: val })}
                      placeholder={t.modal.placeholders.email}
                    />
                  </div>
                </div>

                <div className='mt-4'>{renderAddressForm()}</div>
              </div>

              {/* Medical Info Card */}
              <div className='bg-white dark:bg-gray-900 rounded-3xl p-6 card-shadow'>
                <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-primary-500'>medical_services</span>
                  {t.modal.conditions}
                </h3>

                <div className='flex flex-wrap gap-2'>
                  {[
                    'diabetes',
                    'hypertension',
                    'asthma',
                    'allergies',
                    'heartDisease',
                    'arthritis',
                  ].map((condition) => (
                    <button
                      key={condition}
                      type='button'
                      onClick={() => toggleCondition(condition)}
                      className={`inline-flex items-center justify-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                        (formData.chronicConditions || []).includes(condition)
                          ? `border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 bg-transparent ring-1 ring-primary-200 dark:ring-primary-900/10 shadow-xs`
                          : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'
                      }`}
                    >
                      {(formData.chronicConditions || []).includes(condition) && (
                        <span className='material-symbols-rounded text-xs'>check_circle</span>
                      )}
                      {t.conditions[condition]}
                    </button>
                  ))}
                </div>

                <div className='mt-4'>
                  <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.notes}
                  </label>
                  <SmartTextarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className='resize-none'
                    placeholder={t.modal.placeholders.notes}
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Additional Info */}
            <div className='xl:col-span-1 space-y-6'>
              <div className='bg-white dark:bg-gray-900 rounded-3xl p-6 card-shadow h-full'>
                <h3 className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2 mb-4'>
                  <span className='material-symbols-rounded text-primary-500'>settings</span>
                  {t.modal.preferences}
                </h3>

                <div className='space-y-4'>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.contact}
                    </label>
                    <FilterDropdown
                      variant='input'
                      items={CONTACT_OPTIONS}
                      selectedItem={CONTACT_OPTIONS.find(
                        (o) => o.id === (formData.preferredContact || 'phone')
                      )}
                      isOpen={isContactOpen}
                      onToggle={() => setIsContactOpen(!isContactOpen)}
                      onSelect={(option) => {
                        setFormData({ ...formData, preferredContact: option.id as any });
                        setIsContactOpen(false);
                      }}
                      keyExtractor={(item) => item.id}
                      renderSelected={(item) => (
                        <div className='flex items-center gap-2'>
                          <span className='material-symbols-rounded text-[18px] text-gray-500'>
                            {item?.icon}
                          </span>
                          <span>{item?.label}</span>
                        </div>
                      )}
                      renderItem={(item) => (
                        <div className='flex items-center gap-2'>
                          <span className='material-symbols-rounded text-[18px] text-gray-500'>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                      )}
                      className='w-full h-[42px]'
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.location}
                    </label>
                    <SmartInput
                      type='text'
                      value={formData.preferredLocation || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, preferredLocation: e.target.value })
                      }
                      placeholder={t.modal.placeholders.downtownBranch}
                    />
                  </div>

                  <div className='border-t border-gray-100 dark:border-gray-800 my-4'></div>

                  <h4 className='text-xs font-bold text-gray-500 uppercase mb-2'>
                    {t.modal.insurance}
                  </h4>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.insurance}
                    </label>
                    <SmartInput
                      type='text'
                      value={formData.insuranceProvider || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, insuranceProvider: e.target.value })
                      }
                      placeholder={t.modal.placeholders.insurance}
                    />
                  </div>
                  <div>
                    <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.policy}
                    </label>
                    <SmartInput
                      type='text'
                      value={formData.policyNumber || ''}
                      onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                      placeholder={t.modal.placeholders.policy}
                    />
                  </div>
                </div>

                <div className='mt-8'>
                  <button
                    type='submit'
                    className={`w-full py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all font-bold`}
                  >
                    {t.modal.save}
                  </button>
                  <button
                    type='button'
                    onClick={() => setMode('list')}
                    className='w-full py-3 mt-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm font-medium'
                  >
                    {t.modal.cancel}
                  </button>
                  </div>
                </div>
              </div>
            </form>
            </div>
          )}
        </div>

      {/* Admin Modal - ONLY FOR EDITING NOW */}
      <Modal
        isOpen={isModalOpen && !isKioskMode && !!editingCustomer}
        onClose={handleCloseModal}
        size='2xl'
        zIndex={50}
        title={t.modal.edit}
        icon='edit'
        tabs={MODAL_TABS}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        footer={
          <div className='flex justify-end gap-3'>
            <button
              type='button'
              onClick={handleCloseModal}
              className='px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors'
            >
              {t.modal.cancel}
            </button>
            <button
              type='submit'
              form='customer-edit-form'
              className={`px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all font-medium`}
            >
              {t.modal.save}
            </button>
          </div>
        }
      >
        {isModalOpen && !isKioskMode && editingCustomer && (
          <form id='customer-edit-form' onSubmit={handleSubmit} className='p-1 space-y-4'>
            {activeTab === 'basic' ? (
              <div className='space-y-4 animate-fade-in'>
                {/* Code & Basic Info */}
                <div className='grid grid-cols-3 gap-4'>
                  <div className='col-span-1'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.code} *
                    </label>
                    <div className='flex gap-2'>
                      <SmartInput
                        type='text'
                        required
                        value={formData.code || ''}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        placeholder={t.modal.placeholders.code}
                      />
                    </div>
                  </div>
                  <div className='col-span-2'>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.name} *
                    </label>
                    <SmartInput
                      type='text'
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder={t.modal.placeholders.johnDoe}
                    />
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.phone} *
                    </label>
                    <div className='relative'>
                      <SmartPhoneInput
                        required
                        value={formData.phone || ''}
                        onChange={(val) => setFormData({ ...formData, phone: val })}
                        placeholder={t.modal.placeholders.phone}
                      />
                      {getDetectedCountry(formData.phone) && (
                        <div className='absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-sm text-[10px] font-bold'>
                          {language === 'AR'
                            ? getDetectedCountry(formData.phone)?.country_ar
                            : getDetectedCountry(formData.phone)?.country_en}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.email}
                    </label>
                    <SmartEmailInput
                      value={formData.email || ''}
                      onChange={(val) => setFormData({ ...formData, email: val })}
                      placeholder={t.modal.placeholders.email}
                    />
                  </div>
                </div>

                {/* Address Section */}
                {renderAddressForm()}
              </div>
            ) : (
              <div className='space-y-4 animate-fade-in'>
                {/* Preferences */}
                <div className='grid grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.contact}
                    </label>
                    <FilterDropdown
                      variant='input'
                      items={CONTACT_OPTIONS}
                      selectedItem={CONTACT_OPTIONS.find(
                        (o) => o.id === (formData.preferredContact || 'phone')
                      )}
                      isOpen={isModalContactOpen}
                      onToggle={() => setIsModalContactOpen(!isModalContactOpen)}
                      onSelect={(option) => {
                        setFormData({ ...formData, preferredContact: option.id as any });
                        setIsModalContactOpen(false);
                      }}
                      keyExtractor={(item) => item.id}
                      renderSelected={(item) => (
                        <div className='flex items-center gap-2'>
                          <span className='material-symbols-rounded text-[18px] text-gray-500'>
                            {item?.icon}
                          </span>
                          <span>{item?.label}</span>
                        </div>
                      )}
                      renderItem={(item) => (
                        <div className='flex items-center gap-2'>
                          <span className='material-symbols-rounded text-[18px] text-gray-500'>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </div>
                      )}
                      className='w-full h-[42px]'
                    />
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                      {t.modal.location}
                    </label>
                    <SmartInput
                      type='text'
                      value={formData.preferredLocation || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, preferredLocation: e.target.value })
                      }
                      placeholder={t.modal.placeholders.downtownBranch}
                    />
                  </div>
                </div>

                {/* Insurance */}
                <div className='p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-100 dark:border-gray-700'>
                  <h4 className='text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2'>
                    <span className='material-symbols-rounded text-primary-500'>health_and_safety</span>
                    {t.modal.insuranceDetails}
                  </h4>
                  <div className='grid grid-cols-2 gap-4'>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1'>{t.modal.insurance}</label>
                      <SmartInput
                        type='text'
                        value={formData.insuranceProvider || ''}
                        onChange={(e) =>
                          setFormData({ ...formData, insuranceProvider: e.target.value })
                        }
                        placeholder={t.modal.placeholders.insurance}
                      />
                    </div>
                    <div>
                      <label className='block text-xs text-gray-500 mb-1'>{t.modal.policy}</label>
                      <SmartInput
                        type='text'
                        value={formData.policyNumber || ''}
                        onChange={(e) => setFormData({ ...formData, policyNumber: e.target.value })}
                        placeholder={t.modal.placeholders.policy}
                      />
                    </div>
                  </div>
                </div>

                {/* Chronic Conditions */}
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2'>
                    {t.modal.conditions}
                  </label>
                  <div className='flex flex-wrap gap-2'>
                    {[
                      'diabetes',
                      'hypertension',
                      'asthma',
                      'allergies',
                      'heartDisease',
                      'arthritis',
                    ].map((condition) => (
                      <button
                        key={condition}
                        type='button'
                        onClick={() => toggleCondition(condition)}
                        className={`inline-flex items-center justify-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                          (formData.chronicConditions || []).includes(condition)
                            ? `border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 bg-transparent ring-1 ring-primary-200 dark:ring-primary-900/10 shadow-xs`
                            : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'
                        }`}
                      >
                        {(formData.chronicConditions || []).includes(condition) && (
                          <span className='material-symbols-rounded text-xs'>check_circle</span>
                        )}
                        {t.conditions[condition]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.notes}
                  </label>
                  <SmartTextarea
                    value={formData.notes || ''}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={2}
                    className='resize-none'
                    placeholder={t.modal.placeholders.notes}
                  />
                </div>
              </div>
            )}
          </form>
        )}
      </Modal>

      {/* Kiosk Mode - Updated with Address Form */}
      <Modal isOpen={isKioskMode} onClose={() => setIsKioskMode(false)} size='2xl' zIndex={100}>
        <div className='w-full h-full bg-gray-50 dark:bg-gray-800 p-8 overflow-y-auto'>
          <div className='text-center mb-8'>
            <div
              className={`w-16 h-16 mx-auto bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-4`}
            >
              <span className='material-symbols-rounded text-4xl'>person_add</span>
            </div>
            <h1 className='text-3xl font-bold text-gray-900 dark:text-white mb-2'>
              {t.modal.kioskMode}
            </h1>
            <p className='text-gray-500 dark:text-gray-400'>{t.modal.kioskDesc}</p>
          </div>

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                  {t.modal.name} *
                </label>
                <SmartInput
                  type='text'
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t.modal.placeholders.johnDoe}
                />
              </div>

              <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.phone} *
                  </label>
                  <div className='relative'>
                    <SmartPhoneInput
                      required
                      value={formData.phone || ''}
                      onChange={(val) => setFormData({ ...formData, phone: val })}
                      placeholder={t.modal.placeholders.phone}
                    />
                    {getDetectedCountry(formData.phone) && (
                      <div
                        className={`absolute right-2 top-1/2 -translate-y-1/2 px-2 py-0.5 bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 rounded-sm text-[10px] font-bold`}
                      >
                        {language === 'AR'
                          ? getDetectedCountry(formData.phone)?.country_ar
                          : getDetectedCountry(formData.phone)?.country_en}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <label className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1'>
                    {t.modal.email}
                  </label>
                  <SmartEmailInput
                    value={formData.email || ''}
                    onChange={(val) => setFormData({ ...formData, email: val })}
                    placeholder={t.modal.placeholders.email}
                  />
                </div>
              </div>

              {/* Address Form in Kiosk */}
              {renderAddressForm()}

              {/* Medical Info */}
              <div className='p-4 bg-transparent rounded-xl border border-blue-100 dark:border-blue-800/30'>
                <h3 className='font-semibold text-blue-800 dark:text-blue-300 mb-3 flex items-center gap-2'>
                  <span className='material-symbols-rounded'>medical_information</span>
                  {t.modal.medicalInfo}
                </h3>
                <div className='space-y-3'>
                  <div>
                    <label className='block text-xs font-bold text-gray-500 uppercase mb-2'>
                      {t.modal.conditions}
                    </label>
                    <div className='flex flex-wrap gap-2'>
                      {[
                        'diabetes',
                        'hypertension',
                        'asthma',
                        'allergies',
                        'heartDisease',
                        'arthritis',
                      ].map((condition) => (
                        <button
                          key={condition}
                          type='button'
                          onClick={() => toggleCondition(condition)}
                          className={`inline-flex items-center justify-center gap-1.5 px-1.5 py-0.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all ${
                            (formData.chronicConditions || []).includes(condition)
                              ? `border-primary-200 dark:border-primary-900/50 text-primary-700 dark:text-primary-400 bg-transparent ring-1 ring-primary-200 dark:ring-primary-900/10 shadow-xs`
                              : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 bg-transparent hover:bg-gray-50 dark:hover:bg-gray-800/30'
                          }`}
                        >
                          {(formData.chronicConditions || []).includes(condition) && (
                            <span className='material-symbols-rounded text-sm'>check_circle</span>
                          )}
                          {t.conditions?.[condition] || condition}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className='flex gap-4 pt-4'>
              <button
                type='button'
                onClick={() => setIsKioskMode(false)}
                className='flex-1 px-6 py-3 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium'
              >
                {t.modal.cancel}
              </button>
              <button
                type='submit'
                className={`flex-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl shadow-lg shadow-primary-500/20 transition-all font-bold text-lg`}
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
        <div className='fixed bottom-6 left-1/2 -translate-x-1/2 z-70 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-fade-in'>
          <span className='material-symbols-rounded text-[18px] text-green-400'>check_circle</span>
          <span className='text-sm font-medium'>{t.modal.copied}</span>
        </div>
      )}
    </div>
  );
};
