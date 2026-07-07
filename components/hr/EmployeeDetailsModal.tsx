import React, { useState } from 'react';
import { getRoleLabel } from '../../config/employeeRoles';
import { useAuthStore } from '../../stores/authStore';
import { useEmployees } from '../../hooks/queries/useEmployeesQuery';
import { useRecentSales } from '../../hooks/queries/useSalesQuery';
import { useEmployeeAllTimeAttendance } from '../../hooks/hr/useEmployeeAllTimeAttendance';
import type { TRANSLATIONS } from '../../i18n/translations';
import { permissionsService } from '../../services/auth/permissionsService';
import type { Employee } from '../../types';
import { BANNER_STYLES, renderBanner } from '../../utils/banners';
import { formatCurrencyParts } from '../../utils/currency';
import { type EmployeeSalesStats, getEmployeeSalesStats } from '../../utils/employeeStats';
import { PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import { Modal } from '../common/Modal';

export interface WorkExperience {
  id: string;
  pharmacyName: string;
  role: string;
  startDate: string;
  endDate?: string;
}

interface EmployeeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  language: string;
  t: typeof TRANSLATIONS.EN.employeeList;
  experience?: WorkExperience[];
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({
  isOpen,
  onClose,
  employee,
  language,
  t,
  experience,
}) => {
  const [activeTab, setActiveTab] = useState<string>('page1');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const branches = useAuthStore(s => s.branches);
  const activeOrg = useAuthStore(s => s.activeOrg);
  const branchId = useAuthStore(s => s.activeBranchId);
  const { data: employeesData } = useEmployees(branchId);
  const employees = employeesData ?? [];
  const { data: sales } = useRecentSales(branchId);

  const relatedEmployees = React.useMemo(() => {
    if (!employee || !employees) return employee ? [employee] : [];
    const related = employees.filter(
      (e) =>
        (employee.userId && e.userId === employee.userId) ||
        (employee.username && e.username === employee.username)
    );
    if (related.length === 0) return [employee];
    return Array.from(new Map(related.map((e) => [e.id, e])).values());
  }, [employee, employees]);

  // Get all-time attendance data across all branches and organizations
  const attendanceStats = useEmployeeAllTimeAttendance(employee?.id, language as 'EN' | 'AR');

  if (!employee) return null;

  // Calculate actual sales stats from DB sales
  const stats: EmployeeSalesStats = getEmployeeSalesStats(employee.id, sales || []);

  const employeeSales = (sales || []).filter((s) => s.soldByEmployeeId === employee.id);
  const returnRate = stats.grossSales > 0 ? (stats.returns / stats.grossSales) * 100 : 0;
  const _dispensingAccuracy =
    stats.salesCount > 0 ? Math.max(95, 100 - returnRate).toFixed(1) : '100';

  const chronicSales = employeeSales.filter(
    (s) =>
      s.customerName && s.customerName.toLowerCase() !== 'walk-in' && s.customerName.trim() !== ''
  ).length;
  const chronicCareRate =
    stats.salesCount > 0 ? Math.min(100, Math.round((chronicSales / stats.salesCount) * 100)) : 0;
  const _finalChronicCareRate = chronicCareRate > 0 ? chronicCareRate : 94;

  const salesWithTime = employeeSales.filter(
    (s) => s.processingTimeMinutes !== undefined && s.processingTimeMinutes > 0
  );
  const _avgTime =
    salesWithTime.length > 0
      ? (
          salesWithTime.reduce((sum, s) => sum + (s.processingTimeMinutes || 0), 0) /
          salesWithTime.length
        ).toFixed(1)
      : '1.5';

  const renderPrice = (val: number, sizeClass = 'text-[0.75em]') => {
    const { amount, symbol } = formatCurrencyParts(val, 'EGP', language);
    return (
      <span className='tabular-nums'>
        {amount}{' '}
        <span className={`${sizeClass} text-gray-400 dark:text-zinc-500 font-normal ms-0.5`}>
          {symbol}
        </span>
      </span>
    );
  };

  const bannerStyle = employee.coverStyle || 'pattern';
  const activeBanner = BANNER_STYLES.find((b) => b.id === bannerStyle);
  const bannerAccent = activeBanner?.accentColor || 'var(--primary-500)';

  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Build the Work History timeline list. Fallback to active contract if empty.
  const getBranchLabel = () => {
    const employeeBranch = branches?.find((b) => b.id === employee.branchId);
    const orgName = activeOrg?.name || '';
    const branchName = employeeBranch?.name || '';

    // If branches length is > 1, it's a chain (multiple branches)
    const isChain = !!(branches && branches.length > 1);

    if (isChain) {
      if (branchName && orgName) {
        return t.workHistory.branchOfOrgCurrent
          .replace('{branchName}', branchName)
          .replace('{orgName}', orgName);
      } else if (branchName) {
        return t.workHistory.branchCurrent.replace('{branchName}', branchName);
      } else if (orgName) {
        return t.workHistory.pharmacyCurrent.replace('{orgName}', orgName);
      }
    } else {
      // Single pharmacy or fallback
      if (orgName) {
        return t.workHistory.pharmacyCurrent.replace('{orgName}', orgName);
      } else if (branchName) {
        return t.workHistory.branchCurrent.replace('{branchName}', branchName);
      }
    }

    return t.workHistory.currentBranch;
  };

  const currentBranchLabel = getBranchLabel();

  const historyTimeline: WorkExperience[] = experience || [
    {
      id: 'current',
      pharmacyName: currentBranchLabel,
      role: getRoleLabel(employee.role, t.roles),
      startDate: employee.startDate,
    },
  ];

  // RBAC checks for financial metrics
  const canViewFinancial =
    permissionsService.can('reports.view_financial') || permissionsService.can('users.manage');

  // Filter available tabs based on role and documents availability

  // Build Modal Tabs matching ProfileCardModal
  const modalTabs = [
    {
      label: t.employeeProfile,
      value: 'page1',
      icon: 'person',
    },
    {
      label: t.tabs.cv,
      value: 'page2',
      icon: 'contact_page',
    },
    ...(stats
      ? [
          {
            label: t.tabs.achievements,
            value: 'page4',
            icon: 'emoji_events',
          },
        ]
      : []),
    {
      label: t.tabs.documents,
      value: 'page6',
      icon: 'description',
    },
  ];

  const handleClose = () => {
    onClose();
    setActiveTab('page1');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size='lg'
      style={
        {
          '--bg-card': `color-mix(in srgb, ${bannerAccent} 12%, var(--bg-card-base))`,
          border: `1.5px solid color-mix(in srgb, ${bannerAccent} 35%, var(--border-divider))`,
          boxShadow: 'none',
          '--primary-500': bannerAccent,
          '--primary-600': `color-mix(in srgb, ${bannerAccent} 85%, black)`,
          '--primary-400': `color-mix(in srgb, ${bannerAccent} 85%, white)`,
          '--primary-300': `color-mix(in srgb, ${bannerAccent} 60%, white)`,
        } as React.CSSProperties
      }
      tabs={modalTabs}
      activeTab={activeTab}
      onTabChange={(val) => setActiveTab(val as string)}
      closeOnBackdropClick={true}
      bodyClassName='p-0 bg-(--bg-card)'
    >
      <div className='animate-fade-in min-h-[360px] text-(--text-primary)'>
        {activeTab === 'page1' && (
          /* ── Page 1: Overview ── */
          <div className='animate-fade-in'>
            {/* Banner Graphics */}
            <div className='relative w-full aspect-[9/3] bg-(--bg-secondary) overflow-hidden select-none'>
              {renderBanner(bannerStyle, { x: 0, y: 0 }, 1.2)}
            </div>

            {/* Profile Avatar & Header Info Row */}
            <div className='relative px-6 pb-6 pt-6'>
              {/* Flex Container for Avatar + Details */}
              <div className='flex flex-col sm:flex-row items-start sm:items-end gap-5 -mt-24 mb-4 relative z-10'>
                {/* Avatar */}
                <div className='relative shrink-0'>
                  <div className='w-32 h-32 rounded-full border-4 border-(--bg-card) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center'>
                    {employee.image ? (
                      <img
                        src={employee.image}
                        alt={employee.name}
                        className='w-full h-full object-cover'
                      />
                    ) : (
                      <div className='w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-900/50 text-gray-500 dark:text-gray-400 text-4xl font-bold'>
                        {getInitials(employee.nameArabic || employee.name)}
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`absolute bottom-1 end-1 w-8 h-8 rounded-full border-4 border-(--bg-card) flex items-center justify-center transition-colors duration-300 ${
                      employee.status === 'active'
                        ? 'bg-emerald-500'
                        : employee.status === 'holiday'
                          ? 'bg-amber-500'
                          : 'bg-gray-400 dark:bg-gray-500'
                    }`}
                    title={employee.status}
                  >
                    <span className='material-symbols-rounded text-white text-[12px] font-bold select-none'>
                      {employee.status === 'active'
                        ? 'check'
                        : employee.status === 'holiday'
                          ? 'beach_access'
                          : 'close'}
                    </span>
                  </span>
                </div>

                {/* Header Text details next to Avatar */}
                <div className='flex-1 min-w-0 pb-2'>
                  <div className='flex items-center gap-3 flex-wrap'>
                    <h3 className='text-xl font-bold text-(--text-primary) flex items-center gap-2 flex-wrap'>
                      <span>
                        {language === 'AR' && employee.nameArabic
                          ? employee.nameArabic
                          : employee.name}
                      </span>
                      {employee.username && (
                        <span
                          className='text-xs font-normal text-(--text-secondary) bg-white/10 dark:bg-black/25 px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 select-all'
                          dir='ltr'
                        >
                          @{employee.username.replace(/^@/, '')}
                        </span>
                      )}
                    </h3>

                    {employee.biometricCredentialId && (
                      <span
                        className='material-symbols-rounded text-emerald-500'
                        style={{ fontSize: '18px' }}
                        title={t.fingerprintEnabled}
                      >
                        fingerprint
                      </span>
                    )}
                  </div>
                  <p className='text-xs font-semibold text-primary-600 dark:text-primary-400 mt-1'>
                    {getRoleLabel(employee.role, t.roles)} &bull;{' '}
                    {t.departments[employee.department] || employee.department}
                  </p>
                </div>
              </div>

              {/* Custom Bio Status Badge next to Avatar styled as a Thinking Bubble */}
              <div className='absolute -top-10 start-40 bg-white/15 dark:bg-black/40 backdrop-blur-md rounded-3xl rounded-es-lg border border-white/20 dark:border-white/10 text-xs text-(--text-primary) px-4 py-2 shadow-md max-w-[calc(100%-11.5rem)] z-10'>
                <span className='truncate block max-w-[180px] font-medium italic'>
                  {employee.position?.trim() ? employee.position : t.emptyBio}
                </span>
              </div>
              {/* Thinking Bubble Dots leading to Avatar */}
              <div className='absolute -top-2 start-36 w-2.5 h-2.5 rounded-full bg-white/15 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10 z-10' />
              <div className='absolute top-0.5 start-32 w-1.5 h-1.5 rounded-full bg-white/15 dark:bg-black/40 backdrop-blur-md border border-white/20 dark:border-white/10 z-10' />

              {/* Info Details Section */}
              <div className='space-y-4'>
                {/* Profile Grid */}
                <div className='space-y-3 pt-2'>
                  <h4
                    className='text-xs font-bold uppercase tracking-wider'
                    style={{ color: bannerAccent }}
                  >
                    {t.generalInfo}
                  </h4>
                  <div className='grid grid-cols-2 gap-2'>
                    {[
                      {
                        icon: 'badge',
                        label: t.employeeId,
                        value: employee.employeeCode,
                      },
                      {
                        icon: 'calendar_month',
                        label: t.joined,
                        value: employee.startDate,
                      },
                      {
                        icon: 'schedule',
                        label: t.shift,
                        value: language === 'AR' ? 'الوردية الافتراضية' : 'Default Shift',
                      },
                      ...(employee.license
                        ? [
                            {
                              icon: 'health_and_safety',
                              label: t.license,
                              value: employee.license,
                            },
                          ]
                        : []),
                      ...(canViewFinancial && employee.salary !== undefined
                        ? [
                            {
                              icon: 'payments',
                              label: t.salary,
                              value: renderPrice(employee.salary),
                            },
                          ]
                        : []),
                    ].map((item) => (
                      <div
                        key={item.label}
                        className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}
                      >
                        <span
                          className='material-symbols-rounded text-[18px]'
                          style={{ color: bannerAccent }}
                        >
                          {item.icon}
                        </span>
                        <div className='min-w-0'>
                          <p className='text-[10px] text-(--text-tertiary) font-bold truncate'>
                            {item.label}
                          </p>
                          <p className='text-xs font-semibold text-(--text-primary) truncate'>
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Login & Fingerprint Credentials (Workspaces) */}
                <div className='space-y-3 pt-2'>
                  <h4
                    className='text-xs font-bold uppercase tracking-wider'
                    style={{ color: bannerAccent }}
                  >
                    {t.employeeProfile.loginAndFingerprint}
                  </h4>
                  <div className='grid grid-cols-1 gap-2'>
                    {relatedEmployees.map((emp) => {
                      const branch = branches?.find((b) => b.id === emp.branchId);
                      const branchName = branch?.name || t.employeeProfile.unknownBranch;

                      return (
                        <div key={emp.id} className={`${PROFILE_GLASS_CARD_BASE} p-3 space-y-2`}>
                          <div className='flex items-center justify-between border-b border-white/10 dark:border-white/5 pb-2 mb-2'>
                            <span className='text-xs font-bold text-(--text-primary)'>
                              {branchName}
                            </span>
                            {emp.biometricCredentialId ? (
                              <div className='flex items-center gap-1 text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md'>
                                <span className='material-symbols-rounded text-[14px]'>
                                  fingerprint
                                </span>
                                <span className='text-[10px] font-bold'>
                                  {t.employeeProfile.fingerprintEnabled}
                                </span>
                              </div>
                            ) : (
                              <div className='flex items-center gap-1 text-(--text-tertiary) bg-white/5 px-2 py-0.5 rounded-md'>
                                <span className='material-symbols-rounded text-[14px]'>
                                  fingerprint
                                </span>
                                <span className='text-[10px] font-bold'>
                                  {t.employeeProfile.noFingerprint}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className='flex items-center gap-2'>
                            <span className='text-[10px] font-bold text-(--text-tertiary) uppercase'>
                              {t.username}
                            </span>
                            <span className='text-xs font-semibold text-(--text-primary)'>
                              {emp.employeeCode ? emp.employeeCode.replace('EMP-', '') : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Notes */}
                {employee.notes && (
                  <div className='space-y-2 pt-2'>
                    <h4
                      className='text-xs font-bold uppercase tracking-wider'
                      style={{ color: bannerAccent }}
                    >
                      {t.notes}
                    </h4>
                    <div className={PROFILE_GLASS_CARD_BASE}>
                      <p className='text-xs text-(--text-secondary) whitespace-pre-wrap leading-relaxed'>
                        {employee.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'page2' && (
          /* ── Page 2: CV (Contact & Experience) ── */
          <div className='animate-fade-in p-6 space-y-6'>
            {/* Contact Details Section */}
            <div className='space-y-3'>
              <h4
                className='text-xs font-bold uppercase tracking-wider flex items-center gap-1.5'
                style={{ color: bannerAccent }}
              >
                <span className='material-symbols-rounded text-[18px]'>contact_page</span>
                {t.contactInfo}
              </h4>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                  <span
                    className='material-symbols-rounded text-primary-500'
                    style={{ fontSize: '18px' }}
                  >
                    phone
                  </span>
                  <div>
                    <div className='text-[10px] font-bold text-(--text-tertiary) uppercase tracking-wider'>
                      {t.phone}
                    </div>
                    <div className='text-xs font-semibold text-(--text-primary) mt-0.5' dir='ltr'>
                      {employee.phone}
                    </div>
                  </div>
                </div>
                {employee.email && (
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                    <span
                      className='material-symbols-rounded text-primary-500'
                      style={{ fontSize: '18px' }}
                    >
                      mail
                    </span>
                    <div>
                      <div className='text-[10px] font-bold text-(--text-tertiary) uppercase tracking-wider'>
                        {t.email}
                      </div>
                      <div className='text-xs font-semibold text-(--text-primary) mt-0.5'>
                        {employee.email}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Work History Timeline Section */}
            <div className='space-y-4 pt-2'>
              <h4
                className='text-xs font-bold uppercase tracking-wider flex items-center gap-1.5'
                style={{ color: bannerAccent }}
              >
                <span className='material-symbols-rounded text-[18px]'>work_history</span>
                {t.tabs.experience}
              </h4>
              <div className='relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4'>
                {historyTimeline.map((exp) => (
                  <div key={exp.id} className='relative ps-8 flex items-start gap-3'>
                    <div className='absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-card) bg-primary-500 shadow-sm' />
                    <div className={`${PROFILE_GLASS_CARD_BASE} flex-1`}>
                      <div className='flex justify-between items-start flex-wrap gap-2'>
                        <h5 className='text-xs font-bold text-(--text-primary)'>
                          {exp.pharmacyName}
                        </h5>
                        <span className='badge-neutral'>
                          {exp.startDate} -{' '}
                          {exp.endDate || (language === 'AR' ? 'حتى الآن' : 'Present')}
                        </span>
                      </div>
                      <p className='text-[11px] text-(--text-secondary) mt-1 font-semibold'>
                        {exp.role}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'page4' && stats && (
          /* ── Page 4: Achievements ── */
          <div className='animate-fade-in p-6 space-y-4'>
            <div className='flex items-center justify-between'>
              <h4
                className='text-xs font-bold uppercase tracking-wider'
                style={{ color: bannerAccent }}
              >
                {t.tabs.achievements}
              </h4>
              {expandedCard && (
                <button
                  type='button'
                  onClick={() => setExpandedCard(null)}
                  className='flex items-center gap-1.5 text-xs font-semibold text-(--text-secondary) hover:text-(--text-primary) transition-colors bg-white/10 dark:bg-black/20 px-2.5 py-1 rounded-lg border border-white/10 dark:border-white/5 shadow-xs'
                >
                  <span className='material-symbols-rounded text-[16px]'>arrow_back</span>
                  <span>{language === 'AR' ? 'العودة' : 'Back'}</span>
                </button>
              )}
            </div>
            <div className='space-y-4'>
              {expandedCard ? (
                // Expanded Card View
                <div className='space-y-4'>
                  {expandedCard === 'transactions' && (
                    <div className={`${PROFILE_GLASS_CARD_BASE} p-6 space-y-4`}>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500'>
                          <span className='material-symbols-rounded text-[28px]'>
                            point_of_sale
                          </span>
                        </div>
                        <div>
                          <p className='text-sm font-bold text-(--text-primary)'>
                            {t.stats.transactions}
                          </p>
                          <p className='text-xs text-(--text-tertiary)'>
                            {language === 'AR' ? 'تفاصيل المبيعات' : 'Sales Details'}
                          </p>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'عدد المعاملات' : 'Transaction Count'}
                          </span>
                          <p className='text-lg font-bold text-emerald-500'>{stats.salesCount}</p>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'إجمالي المبيعات' : 'Total Sales'}
                          </span>
                          <p className='text-lg font-bold text-(--text-primary)'>
                            {renderPrice(stats.netSales)}
                          </p>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'الربح الصافي' : 'Net Profit'}
                          </span>
                          <p className='text-lg font-bold text-(--text-primary)'>
                            {renderPrice(stats.totalProfit)}
                          </p>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'هامش الربح' : 'Profit Margin'}
                          </span>
                          <p className='text-lg font-bold text-(--text-primary)'>
                            {stats.profitMargin}%
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedCard === 'items' && (
                    <div className={`${PROFILE_GLASS_CARD_BASE} p-6 space-y-4`}>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 rounded-lg bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center text-blue-500'>
                          <span className='material-symbols-rounded text-[28px]'>package_2</span>
                        </div>
                        <div>
                          <p className='text-sm font-bold text-(--text-primary)'>
                            {t.stats.itemsSold}
                          </p>
                          <p className='text-xs text-(--text-tertiary)'>
                            {language === 'AR' ? 'تفاصيل المنتجات' : 'Products Details'}
                          </p>
                        </div>
                      </div>
                      <div className='space-y-3'>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'إجمالي المنتجات' : 'Total Items'}
                          </span>
                          <p className='text-lg font-bold text-blue-500'>{stats.totalItemsSold}</p>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'عدد المعاملات' : 'Transactions'}
                          </span>
                          <p className='text-lg font-bold text-(--text-primary)'>
                            {stats.salesCount}
                          </p>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-sm text-(--text-tertiary)'>
                            {language === 'AR' ? 'متوسط المنتجات' : 'Avg per Transaction'}
                          </span>
                          <p className='text-lg font-bold text-(--text-primary)'>
                            {(stats.totalItemsSold / stats.salesCount).toFixed(1)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {expandedCard === 'attendance' && (
                    <div className={`${PROFILE_GLASS_CARD_BASE} p-6 space-y-4`}>
                      <div className='flex items-center gap-3 mb-4'>
                        <div className='w-12 h-12 rounded-lg bg-blue-400/10 dark:bg-blue-400/20 flex items-center justify-center text-blue-400'>
                          <span className='material-symbols-rounded text-[28px]'>schedule</span>
                        </div>
                        <div>
                          <p className='text-sm font-bold text-(--text-primary)'>
                            {language === 'AR' ? 'أيام العمل' : 'Working Days'}
                          </p>
                          <p className='text-xs text-(--text-tertiary)'>
                            {language === 'AR'
                              ? 'إحصائيات الحضور الشاملة'
                              : 'Comprehensive Attendance'}
                          </p>
                        </div>
                      </div>
                      {attendanceStats.isLoading ? (
                        <p className='text-sm text-(--text-tertiary)'>
                          {language === 'AR' ? 'جاري التحميل...' : 'Loading...'}
                        </p>
                      ) : attendanceStats.error ? (
                        <p className='text-sm text-red-500'>{attendanceStats.error}</p>
                      ) : (
                        <div className='space-y-3'>
                          <div className='flex justify-between'>
                            <span className='text-sm text-(--text-tertiary)'>
                              {language === 'AR' ? 'إجمالي الساعات' : 'Total Hours'}
                            </span>
                            <p className='text-lg font-bold text-cyan-500'>
                              {attendanceStats.totalMinutes >= 60
                                ? `${Math.floor(attendanceStats.totalMinutes / 60)}h ${attendanceStats.totalMinutes % 60}m`
                                : `${attendanceStats.totalMinutes}m`}
                            </p>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-sm text-(--text-tertiary)'>
                              {language === 'AR' ? 'أيام العمل' : 'Work Days'}
                            </span>
                            <p className='text-lg font-bold text-indigo-500'>
                              {attendanceStats.totalDays}
                            </p>
                          </div>
                          <div className='flex justify-between'>
                            <span className='text-sm text-(--text-tertiary)'>
                              {language === 'AR' ? 'متوسط يومي' : 'Average/Day'}
                            </span>
                            <p className='text-lg font-bold text-violet-500'>
                              {attendanceStats.averageHoursPerDay.toFixed(1)}h
                            </p>
                          </div>
                          {attendanceStats.lastActiveDate && (
                            <div className='flex justify-between pt-2 border-t border-(--border-divider)'>
                              <span className='text-sm text-(--text-tertiary)'>
                                {language === 'AR' ? 'آخر حضور' : 'Last Active'}
                              </span>
                              <p className='text-sm font-semibold text-(--text-primary)'>
                                {attendanceStats.lastActiveDate}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                // Grid View with Interactive Cards
                <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                  <button
                    type='button'
                    onClick={() => setExpandedCard('transactions')}
                    className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px] cursor-pointer`}
                  >
                    <span className='material-symbols-rounded text-[20px] text-emerald-500 mb-1'>
                      point_of_sale
                    </span>
                    <div>
                      <p className='text-base font-bold text-(--text-primary)'>
                        {stats.salesCount}
                      </p>
                      <p className='text-[10px] font-bold text-(--text-tertiary) uppercase'>
                        {t.stats.transactions}
                      </p>
                    </div>
                  </button>
                  <button
                    type='button'
                    onClick={() => setExpandedCard('items')}
                    className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px] cursor-pointer`}
                  >
                    <span className='material-symbols-rounded text-[20px] text-blue-500 mb-1'>
                      package_2
                    </span>
                    <div>
                      <p className='text-base font-bold text-(--text-primary)'>
                        {stats.totalItemsSold}
                      </p>
                      <p className='text-[10px] font-bold text-(--text-tertiary) uppercase'>
                        {t.stats.itemsSold}
                      </p>
                    </div>
                  </button>
                  <button
                    type='button'
                    onClick={() => setExpandedCard('attendance')}
                    className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px] cursor-pointer`}
                  >
                    <span className='material-symbols-rounded text-[20px] text-blue-400 mb-1'>
                      schedule
                    </span>
                    <div>
                      <p className='text-base font-bold text-(--text-primary)'>
                        {attendanceStats.isLoading ? '...' : `${attendanceStats.totalDays}`}
                      </p>
                      <p className='text-[10px] font-bold text-(--text-tertiary) uppercase'>
                        {language === 'AR' ? 'أيام العمل' : 'Working Days'}
                      </p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'page6' && (
          /* ── Page 6: Documents ── */
          <div className='animate-fade-in p-6 space-y-6'>
            {/* National ID Section */}
            <div className='space-y-2'>
              <div
                className='text-xs font-semibold uppercase px-1 flex items-center gap-2'
                style={{ color: bannerAccent }}
              >
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                  badge
                </span>
                {t.nationalIdCard}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/5 dark:bg-black/10 border border-(--border-divider) rounded-xl'>
                <DocumentImage
                  employeeId={employee.id!}
                  column='national_id_card'
                  label={t.frontFace}
                  language={language}
                />
                <DocumentImage
                  employeeId={employee.id!}
                  column='national_id_card_back'
                  label={t.backFace}
                  language={language}
                />
              </div>
            </div>

            {/* Syndicate Cards Section */}
            <div className='space-y-2'>
              <div
                className='text-xs font-semibold uppercase px-1 flex items-center gap-2'
                style={{ color: bannerAccent }}
              >
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                  card_membership
                </span>
                {t.syndicateCards}
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/5 dark:bg-black/10 border border-(--border-divider) rounded-xl'>
                <DocumentImage
                  employeeId={employee.id!}
                  column='main_syndicate_card'
                  label={t.mainSyndicateCard}
                  language={language}
                />
                <DocumentImage
                  employeeId={employee.id!}
                  column='sub_syndicate_card'
                  label={t.sub}
                  language={language}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

// --- Reusable Component for independent image loading ---
const DocumentImage = ({
  employeeId,
  column,
  label,
  language,
}: {
  employeeId: string;
  column: string;
  label: string;
  language: string;
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    let isMounted = true;
    setLoading(true);
    import('../../services/hr/employeeService').then(({ employeeService }) => {
      employeeService
        .getDocument(employeeId, column)
        .then((data) => {
          if (isMounted) {
            setImage(data);
            setLoading(false);
          }
        })
        .catch(() => {
          if (isMounted) setLoading(false);
        });
    });
    return () => {
      isMounted = false;
    };
  }, [employeeId, column]);

  if (loading) {
    return (
      <div className='space-y-1'>
        <span className='text-[9px] font-bold text-(--text-tertiary) uppercase'>{label}</span>
        <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-white/5 dark:bg-black/20 flex flex-col items-center justify-center'>
          <div className='w-6 h-6 border-2 border-(--text-secondary) border-t-transparent rounded-full animate-spin opacity-50'></div>
        </div>
      </div>
    );
  }

  if (!image) {
    return (
      <div className='space-y-1'>
        <span className='text-[9px] font-bold text-(--text-tertiary) uppercase'>{label}</span>
        <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-white/5 dark:bg-black/20 flex flex-col items-center justify-center text-(--text-tertiary) border-dashed'>
          <span className='material-symbols-rounded mb-1 opacity-50'>image_not_supported</span>
          <span className='text-[10px]'>{language === 'AR' ? 'غير متوفر' : 'Not Available'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-1'>
      <span className='text-[9px] font-bold text-(--text-tertiary) uppercase'>{label}</span>
      <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-black flex items-center justify-center'>
        <img src={image} alt={label} className='w-full h-full object-contain' />
      </div>
    </div>
  );
};
