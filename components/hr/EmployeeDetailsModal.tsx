import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { permissionsService } from '../../services/auth/permissionsService';
import { getRoleLabel } from '../../config/employeeRoles';
import type { Employee } from '../../types';
import { TRANSLATIONS } from '../../i18n/translations';
import { renderBanner, BANNER_STYLES } from '../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import { useData } from '../../context/DataContext';
import { getEmployeeSalesStats, EmployeeSalesStats } from '../../utils/employeeStats';

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
  const { sales, branches, activeOrg } = useData();

  if (!employee) return null;

  // Calculate actual sales stats from DB sales
  const stats: EmployeeSalesStats = getEmployeeSalesStats(employee.id, sales || []);

  // Map department to a dynamic CSS banner style
  const getBannerStyleByDepartment = (dept: string) => {
    switch (dept) {
      case 'pharmacy': return 'pharma';
      case 'it': return 'cyberhex';
      case 'hr': return 'abstract';
      case 'sales': return 'synthwave';
      case 'logistics': return 'chaos';
      case 'marketing': return 'floral';
      default: return 'pattern';
    }
  };

  const bannerStyle = getBannerStyleByDepartment(employee.department);
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
    }
  ];

  // RBAC checks for financial metrics
  const canViewFinancial = permissionsService.can('reports.view_financial') || permissionsService.can('users.manage');

  // Filter available tabs based on role and documents availability
  const hasDocuments = !!(employee.nationalIdCard || employee.nationalIdCardBack || employee.mainSyndicateCard || employee.subSyndicateCard);

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
    ...(stats ? [
      {
        label: t.tabs.achievements,
        value: 'page4',
        icon: 'emoji_events',
      }
    ] : []),
    {
      label: t.tabs.documents,
      value: 'page6',
      icon: 'description',
    }
  ];

  const handleClose = () => {
    onClose();
    setActiveTab('page1');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="lg"
      style={
        {
          '--bg-card': `color-mix(in srgb, ${bannerAccent} 12%, var(--bg-card-base))`,
          border: '4px solid transparent',
          backgroundImage: `linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, ${bannerAccent}, var(--modal-border-gradient-end))`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
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
      bodyClassName="p-0 bg-(--bg-card)"
    >
      <div className="animate-fade-in min-h-[360px] text-(--text-primary)">
        {activeTab === 'page1' && (
          /* ── Page 1: Overview ── */
          <div className="animate-fade-in">
            {/* Banner Graphics */}
            <div className="relative w-full aspect-[5/2] bg-(--bg-secondary) overflow-hidden select-none">
              {renderBanner(bannerStyle, { x: 0, y: 0 }, 1.2)}
            </div>

            {/* Profile Avatar Overlapping & Content Container */}
            <div className="relative px-6 pb-6 pt-12">
              {/* Overlapping Avatar */}
              <div className="absolute -top-12 start-6">
                <div className="relative">
                  <div className="w-24 h-24 rounded-full border-4 border-(--bg-card) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center">
                    {employee.image ? (
                      <img
                        src={employee.image}
                        alt={employee.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-zinc-900/50 text-gray-500 dark:text-gray-400 text-3xl font-bold">
                        {getInitials(employee.nameArabic || employee.name)}
                      </div>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`absolute bottom-0.5 end-0.5 w-7 h-7 rounded-full border-4 border-(--bg-card) flex items-center justify-center transition-colors duration-300 ${employee.status === 'active'
                      ? 'bg-emerald-500'
                      : employee.status === 'holiday'
                        ? 'bg-amber-500'
                        : 'bg-gray-400 dark:bg-gray-500'
                      }`}
                    title={employee.status}
                  >
                    <span className="material-symbols-rounded text-white text-[12px] font-bold select-none">
                      {employee.status === 'active' ? 'check' : employee.status === 'holiday' ? 'beach_access' : 'close'}
                    </span>
                  </span>
                </div>
              </div>

              {/* Custom Bio Status Badge next to Avatar */}
              <div className="absolute top-2 start-32 flex items-center bg-white/10 dark:bg-black/30 backdrop-blur-md rounded-xl border border-white/10 dark:border-white/5 text-xs text-(--text-secondary) italic px-3 py-1.5 shadow-sm max-w-[calc(100%-9.5rem)] gap-2 z-10">
                <span className="material-symbols-rounded text-(--text-tertiary) text-[16px]">info</span>
                <span className="truncate max-w-[180px]">{employee.position}</span>
              </div>

              {/* Info Details Section */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-xl font-bold text-(--text-primary) flex items-center gap-2 flex-wrap">
                      <span>{language === 'AR' && employee.nameArabic ? employee.nameArabic : employee.name}</span>
                      {employee.username && (
                        <span className="text-xs font-normal text-(--text-secondary) bg-white/10 dark:bg-black/25 px-2 py-0.5 rounded-md border border-white/10 dark:border-white/5 font-mono select-all" dir="ltr">
                          @{employee.username}
                        </span>
                      )}
                    </h3>
                    {employee.biometricCredentialId && (
                      <span
                        className="material-symbols-rounded text-emerald-500"
                        style={{ fontSize: '18px' }}
                        title={t.fingerprintEnabled}
                      >
                        fingerprint
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-primary-600 dark:text-primary-400">
                    {getRoleLabel(employee.role, t.roles)} &bull; {t.departments[employee.department] || employee.department}
                  </p>
                </div>

                {/* Profile Grid */}
                <div className="space-y-3 pt-2">
                  <h4
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: bannerAccent }}
                  >
                    {t.generalInfo}
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
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
                      ...(employee.license ? [{
                        icon: 'health_and_safety',
                        label: t.license,
                        value: employee.license,
                      }] : [])
                    ].map((item) => (
                      <div key={item.label} className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}>
                        <span
                          className="material-symbols-rounded text-[18px]"
                          style={{ color: bannerAccent }}
                        >
                          {item.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[10px] text-(--text-tertiary) font-bold truncate">
                            {item.label}
                          </p>
                          <p className="text-xs font-semibold text-(--text-primary) truncate">
                            {item.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary (Guarded) */}
                {canViewFinancial && employee.salary !== undefined && (
                  <div className="space-y-2 pt-2">
                    <h4
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: bannerAccent }}
                    >
                      {t.salary}
                    </h4>
                    <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}>
                      <span className="material-symbols-rounded text-[18px] text-emerald-600 dark:text-emerald-400">payments</span>
                      <div>
                        <p className="text-[10px] text-(--text-tertiary) font-bold">{t.salary}</p>
                        <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {language === 'AR' ? `${employee.salary.toLocaleString()} ج.م` : `${employee.salary.toLocaleString()} EGP`}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {employee.notes && (
                  <div className="space-y-2 pt-2">
                    <h4
                      className="text-xs font-bold uppercase tracking-wider"
                      style={{ color: bannerAccent }}
                    >
                      {t.notes}
                    </h4>
                    <div className={PROFILE_GLASS_CARD_BASE}>
                      <p className="text-xs text-(--text-secondary) whitespace-pre-wrap leading-relaxed">
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
          <div className="animate-fade-in p-6 space-y-6">
            {/* Contact Details Section */}
            <div className="space-y-3">
              <h4
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: bannerAccent }}
              >
                <span className="material-symbols-rounded text-[18px]">contact_page</span>
                {t.contactInfo}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                  <span className="material-symbols-rounded text-primary-500" style={{ fontSize: '18px' }}>phone</span>
                  <div>
                    <div className="text-[10px] font-bold text-(--text-tertiary) uppercase tracking-wider">{t.phone}</div>
                    <div className="text-xs font-semibold text-(--text-primary) mt-0.5" dir="ltr">{employee.phone}</div>
                  </div>
                </div>
                {employee.email && (
                  <div className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-3`}>
                    <span className="material-symbols-rounded text-primary-500" style={{ fontSize: '18px' }}>mail</span>
                    <div>
                      <div className="text-[10px] font-bold text-(--text-tertiary) uppercase tracking-wider">{t.email}</div>
                      <div className="text-xs font-semibold text-(--text-primary) mt-0.5">{employee.email}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Work History Timeline Section */}
            <div className="space-y-4 pt-2">
              <h4
                className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
                style={{ color: bannerAccent }}
              >
                <span className="material-symbols-rounded text-[18px]">work_history</span>
                {t.tabs.experience}
              </h4>
              <div className="relative before:absolute before:top-2 before:bottom-2 before:start-3.5 before:w-0.5 before:bg-(--border-divider) space-y-4">
                {historyTimeline.map((exp) => (
                  <div key={exp.id} className="relative ps-8 flex items-start gap-3">
                    <div className="absolute start-1.5 top-2 w-4 h-4 rounded-full border-4 border-(--bg-card) bg-primary-500 shadow-sm" />
                    <div className={`${PROFILE_GLASS_CARD_BASE} flex-1`}>
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <h5 className="text-xs font-bold text-(--text-primary)">{exp.pharmacyName}</h5>
                        <span className="badge-neutral">
                          {exp.startDate} - {exp.endDate || (language === 'AR' ? 'حتى الآن' : 'Present')}
                        </span>
                      </div>
                      <p className="text-[11px] text-(--text-secondary) mt-1 font-semibold">{exp.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'page4' && stats && (
          /* ── Page 4: Achievements ── */
          <div className="animate-fade-in p-6 space-y-4">
            <h4
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: bannerAccent }}
            >
              {t.tabs.achievements}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px]`}>
                <span className="material-symbols-rounded text-[20px] text-emerald-500 mb-1">point_of_sale</span>
                <div>
                  <p className="text-base font-bold text-(--text-primary)">{stats.salesCount}</p>
                  <p className="text-[10px] font-bold text-(--text-tertiary) uppercase">{t.stats.transactions}</p>
                </div>
              </div>
              <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px]`}>
                <span className="material-symbols-rounded text-[20px] text-blue-500 mb-1">package_2</span>
                <div>
                  <p className="text-base font-bold text-(--text-primary)">{stats.totalItemsSold}</p>
                  <p className="text-[10px] font-bold text-(--text-tertiary) uppercase">{t.stats.itemsSold}</p>
                </div>
              </div>
              {stats.mostSoldProduct && (
                <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px] col-span-2 sm:col-span-1`}>
                  <span className="material-symbols-rounded text-[20px] text-amber-500 mb-1">workspace_premium</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-(--text-primary) truncate px-1">{stats.mostSoldProduct.name}</p>
                    <p className="text-[10px] font-bold text-(--text-tertiary) uppercase mt-0.5">{t.stats.topProduct}</p>
                  </div>
                </div>
              )}
              {canViewFinancial && (
                <>
                  <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px]`}>
                    <span className="material-symbols-rounded text-[20px] text-emerald-600 mb-1">payments</span>
                    <div>
                      <p className="text-sm font-bold text-(--text-primary)">
                        {language === 'AR' ? `${stats.netSales.toLocaleString()} ج.م` : `${stats.netSales.toLocaleString()} EGP`}
                      </p>
                      <p className="text-[10px] font-bold text-(--text-tertiary) uppercase">{t.stats.totalSales}</p>
                    </div>
                  </div>
                  <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px]`}>
                    <span className="material-symbols-rounded text-[20px] text-purple-500 mb-1">trending_up</span>
                    <div>
                      <p className="text-sm font-bold text-(--text-primary)">
                        {language === 'AR' ? `${stats.totalProfit.toLocaleString()} ج.م` : `${stats.totalProfit.toLocaleString()} EGP`}
                      </p>
                      <p className="text-[10px] font-bold text-(--text-tertiary) uppercase">{t.stats.netProfit}</p>
                    </div>
                  </div>
                  <div className={`${PROFILE_GLASS_CARD_BASE} text-center flex flex-col justify-between min-h-[90px]`}>
                    <span className="material-symbols-rounded text-[20px] text-pink-500 mb-1">percent</span>
                    <div>
                      <p className="text-base font-bold text-(--text-primary)">{stats.profitMargin}%</p>
                      <p className="text-[10px] font-bold text-(--text-tertiary) uppercase">{t.stats.salesAnalytics}</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}


        {activeTab === 'page6' && (
          /* ── Page 6: Documents ── */
          <div className="animate-fade-in p-6 space-y-6">
            {/* National ID Section */}
            <div className="space-y-2">
              <div
                className="text-xs font-semibold uppercase px-1 flex items-center gap-2"
                style={{ color: bannerAccent }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-md)' }}>
                  badge
                </span>
                {t.nationalIdCard}
              </div>
              {employee.nationalIdCard || employee.nationalIdCardBack ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/5 dark:bg-black/10 border border-(--border-divider) rounded-xl">
                  {employee.nationalIdCard && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-(--text-tertiary) uppercase">{t.frontFace}</span>
                      <div className="w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-(--bg-secondary)/30">
                        <img src={employee.nationalIdCard} alt="ID Front" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  {employee.nationalIdCardBack && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-(--text-tertiary) uppercase">{t.backFace}</span>
                      <div className="w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-(--bg-secondary)/30">
                        <img src={employee.nationalIdCardBack} alt="ID Back" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-white/5 dark:bg-black/10 border border-(--border-divider) border-dashed rounded-xl">
                  <p className="text-xs text-(--text-tertiary)">
                    {t.noIdCardImages}
                  </p>
                </div>
              )}
            </div>

            {/* Syndicate Cards Section */}
            <div className="space-y-2">
              <div
                className="text-xs font-semibold uppercase px-1 flex items-center gap-2"
                style={{ color: bannerAccent }}
              >
                <span className="material-symbols-rounded" style={{ fontSize: 'var(--icon-md)' }}>
                  card_membership
                </span>
                {t.syndicateCards}
              </div>
              {employee.mainSyndicateCard || employee.subSyndicateCard ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white/5 dark:bg-black/10 border border-(--border-divider) rounded-xl">
                  {employee.mainSyndicateCard && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-(--text-tertiary) uppercase">{t.mainSyndicateCard}</span>
                      <div className="w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-(--bg-secondary)/30">
                        <img src={employee.mainSyndicateCard} alt="Main Syndicate" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                  {employee.subSyndicateCard && (
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-(--text-tertiary) uppercase">{t.sub}</span>
                      <div className="w-full aspect-[8/5] border border-(--border-divider) rounded-lg overflow-hidden bg-(--bg-secondary)/30">
                        <img src={employee.subSyndicateCard} alt="Sub Syndicate" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 bg-white/5 dark:bg-black/10 border border-(--border-divider) border-dashed rounded-xl">
                  <p className="text-xs text-(--text-tertiary)">
                    {t.noSyndicateImages}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
