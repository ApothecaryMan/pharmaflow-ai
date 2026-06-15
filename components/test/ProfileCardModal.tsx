import type React from 'react';
import { useState } from 'react';
import { BANNER_STYLES, renderBanner } from '../../utils/banners';
import { PROFILE_GLASS_CARD_BASE } from '../../utils/themeStyles';
import { Modal } from '../common/Modal';
import { LOCAL_TRANSLATIONS, type ProfileData } from './ModalTests';

interface ProfileCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: 'EN' | 'AR';
  profileData: ProfileData;
  bannerStyle: string;
  bannerOffset: { x: number; y: number };
  bannerZoom: number;
  userStatus: 'online' | 'idle' | 'dnd' | 'offline';
  customBio: string;
  customAccentColor: string | null;
}

export const ProfileCardModal: React.FC<ProfileCardModalProps> = ({
  isOpen,
  onClose,
  language,
  profileData,
  bannerStyle,
  bannerOffset,
  bannerZoom,
  userStatus,
  customBio,
  customAccentColor,
}) => {
  const [activePage, setActivePage] = useState('page1');

  const activeBanner = BANNER_STYLES.find((b) => b.id === bannerStyle);
  const bannerAccent = customAccentColor || activeBanner?.accentColor;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size='lg'
      style={
        {
          '--bg-card': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 12%, var(--bg-card-base))`
            : undefined,
          border: bannerAccent ? '4px solid transparent' : undefined,
          backgroundImage: bannerAccent
            ? `linear-gradient(var(--bg-card), var(--bg-card)), linear-gradient(135deg, ${bannerAccent}, var(--modal-border-gradient-end))`
            : undefined,
          backgroundOrigin: bannerAccent ? 'border-box' : undefined,
          backgroundClip: bannerAccent ? 'content-box, border-box' : undefined,
          boxShadow: 'none',
          '--primary-500': bannerAccent || undefined,
          '--primary-600': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 85%, black)`
            : undefined,
          '--primary-400': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 85%, white)`
            : undefined,
          '--primary-300': bannerAccent
            ? `color-mix(in srgb, ${bannerAccent} 60%, white)`
            : undefined,
        } as React.CSSProperties
      }
      tabs={[
        {
          label: LOCAL_TRANSLATIONS[language].personalProfile,
          value: 'page1',
          icon: 'person',
        },
        {
          label: language === 'AR' ? 'التفاصيل' : 'Details',
          value: 'page2',
          icon: 'info',
        },
        {
          label: LOCAL_TRANSLATIONS[language].achievements,
          value: 'page3',
          icon: 'emoji_events',
        },
        {
          label: language === 'AR' ? 'المستندات' : 'Documents',
          value: 'page4',
          icon: 'description',
        },
      ]}
      activeTab={activePage}
      onTabChange={(val) => setActivePage(val as string)}
      closeOnBackdropClick={true}
      bodyClassName='p-0 bg-(--bg-card)'
    >
      <div className='animate-fade-in'>
        {activePage === 'page1' ? (
          /* ── Page 1: Overview (Discord Style) ── */
          <div className='animate-fade-in'>
            {/* Banner Graphics */}
            <div className='relative w-full h-36 bg-(--bg-secondary) overflow-hidden'>
              {renderBanner(bannerStyle, bannerOffset, bannerZoom)}
              {/* Discord Badge Overlay */}
              <div className='absolute bottom-2 end-3 z-10 flex gap-1.5 bg-black/40 backdrop-blur-md px-2 py-1 rounded-lg text-white text-xs border border-white/10'>
                <span
                  className='material-symbols-rounded text-[14px]'
                  title={LOCAL_TRANSLATIONS[language].staffBadge}
                >
                  shield_person
                </span>
                <span
                  className='material-symbols-rounded text-[14px]'
                  title={LOCAL_TRANSLATIONS[language].devBadge}
                >
                  terminal
                </span>
                <span
                  className='material-symbols-rounded text-[14px]'
                  title={LOCAL_TRANSLATIONS[language].nitroBadge}
                >
                  bolt
                </span>
              </div>
            </div>

            {/* Profile Avatar Overlapping & Content Container */}
            <div className='relative px-6 pb-6 pt-12'>
              {/* Overlapping Avatar */}
              <div className='absolute -top-12 start-6'>
                <div className='relative'>
                  <div className='w-24 h-24 rounded-full border-4 border-(--bg-card) overflow-hidden bg-(--bg-secondary) shadow-md flex items-center justify-center'>
                    <span className='material-symbols-rounded text-(--text-tertiary) text-[56px] select-none'>
                      person
                    </span>
                  </div>

                  {/* Discord Status Indicator */}
                  <span
                    className={`absolute bottom-0.5 end-0.5 w-7 h-7 rounded-full border-4 border-(--bg-card) flex items-center justify-center transition-colors duration-300 ${
                      userStatus === 'online'
                        ? 'bg-emerald-500'
                        : userStatus === 'idle'
                          ? 'bg-amber-500'
                          : userStatus === 'dnd'
                            ? 'bg-rose-500'
                            : 'bg-gray-400 dark:bg-gray-500'
                    }`}
                    title={userStatus}
                  >
                    {userStatus === 'dnd' && (
                      <span className='w-2.5 h-0.5 bg-white dark:bg-gray-900 rounded-full' />
                    )}
                    {userStatus === 'idle' && (
                      <span className='w-3.5 h-3.5 rounded-full bg-(--bg-card) absolute -top-1 -left-1' />
                    )}
                  </span>
                </div>
              </div>

              {/* Custom Bio Status next to Avatar */}
              <div className='absolute top-2 start-32 flex items-center bg-white/5 dark:bg-black/20 backdrop-blur-md rounded-xl border border-white/10 dark:border-white/5 text-xs text-(--text-secondary) italic px-3 py-1.5 shadow-sm max-w-[calc(100%-9.5rem)] gap-2 z-10'>
                <span className='material-symbols-rounded text-(--text-tertiary) text-[16px]'>
                  info
                </span>
                <span>{customBio}</span>
              </div>

              {/* Info Details Section */}
              <div className='space-y-4'>
                {/* Name, Role & Status Text */}
                <div>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <h3 className='text-xl font-bold text-(--text-primary)'>
                      {language === 'AR' ? profileData.nameAR : profileData.nameEN}
                    </h3>
                    <span className='text-xs text-(--text-tertiary) font-medium' dir='ltr'>
                      @ahmed_mohamed
                    </span>
                  </div>
                  <p className='text-sm font-semibold text-primary-600 dark:text-primary-400 mt-0.5'>
                    {language === 'AR' ? profileData.roleAR : profileData.roleEN}
                  </p>
                </div>

                {/* Profile Details */}
                <div className='space-y-3 pt-2'>
                  <h4
                    className='text-xs font-bold uppercase tracking-wider'
                    style={{ color: bannerAccent || 'var(--text-tertiary)' }}
                  >
                    {LOCAL_TRANSLATIONS[language].generalInfo}
                  </h4>
                  <div className='grid grid-cols-2 gap-2'>
                    {[
                      {
                        icon: 'badge',
                        label: LOCAL_TRANSLATIONS[language].employeeId,
                        value: profileData.employeeId,
                      },
                      {
                        icon: 'calendar_month',
                        label: LOCAL_TRANSLATIONS[language].joined,
                        value: profileData.joined,
                      },
                      {
                        icon: 'schedule',
                        label: LOCAL_TRANSLATIONS[language].shift,
                        value: language === 'AR' ? profileData.shiftAR : profileData.shiftEN,
                      },
                      {
                        icon: 'health_and_safety',
                        label: LOCAL_TRANSLATIONS[language].license,
                        value: profileData.license,
                      },
                    ].map((item) => (
                      <div
                        key={item.icon}
                        className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}
                      >
                        <span
                          className='material-symbols-rounded text-[18px]'
                          style={{ color: bannerAccent || 'var(--text-tertiary)' }}
                        >
                          {item.icon}
                        </span>
                        <div className='min-w-0'>
                          <p className='text-[10px] text-(--text-tertiary) font-medium truncate'>
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
              </div>
            </div>
          </div>
        ) : activePage === 'page2' ? (
          /* ── Page 2: Details ── */
          <div className='animate-fade-in p-6 space-y-5'>
            {/* Contact Info */}
            <div>
              <h4
                className='text-xs font-bold uppercase tracking-wider mb-3'
                style={{ color: bannerAccent || 'var(--text-tertiary)' }}
              >
                {LOCAL_TRANSLATIONS[language].contactInfo}
              </h4>
              <div className='space-y-2'>
                {[
                  {
                    icon: 'mail',
                    label: LOCAL_TRANSLATIONS[language].email,
                    value: profileData.email,
                  },
                  {
                    icon: 'phone',
                    label: LOCAL_TRANSLATIONS[language].phone,
                    value: profileData.phone,
                  },
                  {
                    icon: 'location_on',
                    label: LOCAL_TRANSLATIONS[language].address,
                    value: language === 'AR' ? profileData.addressAR : profileData.addressEN,
                  },
                ].map((item) => (
                  <div
                    key={item.icon}
                    className={`${PROFILE_GLASS_CARD_BASE} flex items-center gap-2.5`}
                  >
                    <span
                      className='material-symbols-rounded text-[18px]'
                      style={{ color: bannerAccent || 'var(--text-tertiary)' }}
                    >
                      {item.icon}
                    </span>
                    <div className='min-w-0 flex-1'>
                      <p className='text-[10px] font-medium text-(--text-tertiary) uppercase tracking-wide'>
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

            {/* Permissions Summary */}
            <div>
              <h4
                className='text-xs font-bold uppercase tracking-wider mb-3'
                style={{ color: bannerAccent || 'var(--text-tertiary)' }}
              >
                {LOCAL_TRANSLATIONS[language].permissions}
              </h4>
              <div className='flex flex-wrap gap-2'>
                {[
                  language === 'AR' ? 'إدارة المخزون' : 'Inventory Mgmt',
                  language === 'AR' ? 'نقطة البيع' : 'POS Access',
                  language === 'AR' ? 'إدارة المشتريات' : 'Purchases',
                  language === 'AR' ? 'التقارير' : 'Reports',
                  language === 'AR' ? 'إدارة الموظفين' : 'Staff Mgmt',
                ].map((perm) => (
                  <span
                    key={perm}
                    className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/30 dark:border-emerald-500/20'
                  >
                    <span className='material-symbols-rounded text-[14px]'>check_circle</span>
                    {perm}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : activePage === 'page3' ? (
          /* ── Page 3: Achievements ── */
          <div className='animate-fade-in p-6 space-y-5'>
            {/* Stats */}
            <div>
              <h4
                className='text-xs font-bold uppercase tracking-wider mb-3'
                style={{ color: bannerAccent || 'var(--text-tertiary)' }}
              >
                {LOCAL_TRANSLATIONS[language].achievements}
              </h4>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3'>
                {[
                  {
                    label: LOCAL_TRANSLATIONS[language].sales,
                    value: '1,247',
                    icon: 'point_of_sale',
                    color: '#10b981',
                  },
                  {
                    label: LOCAL_TRANSLATIONS[language].totalSalesAmount,
                    value: language === 'AR' ? '154,250 ج.م' : '154,250 EGP',
                    icon: 'payments',
                    color: '#059669',
                  },
                  {
                    label: LOCAL_TRANSLATIONS[language].workingHours,
                    value: language === 'AR' ? '186 ساعة' : '186 hrs',
                    icon: 'schedule',
                    color: '#3b82f6',
                  },
                  {
                    label: LOCAL_TRANSLATIONS[language].attendance,
                    value: '96%',
                    icon: 'event_available',
                    color: '#6366f1',
                  },
                  {
                    label: LOCAL_TRANSLATIONS[language].rating,
                    value: '4.8',
                    icon: 'star',
                    color: '#f59e0b',
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`text-center ${PROFILE_GLASS_CARD_BASE} flex flex-col justify-between min-h-[90px]`}
                  >
                    <span
                      className='material-symbols-rounded text-[20px] mb-1 block'
                      style={{ color: stat.color }}
                    >
                      {stat.icon}
                    </span>
                    <div>
                      <p className='text-base font-bold text-(--text-primary)'>{stat.value}</p>
                      <p className='text-[10px] font-medium text-(--text-tertiary) uppercase'>
                        {stat.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* ── Page 4: Documents ── */
          <div className='animate-fade-in p-6 space-y-6'>
            {/* National ID Section */}
            <div className='space-y-1'>
              <div
                className='text-xs font-semibold uppercase px-1 flex items-center gap-2'
                style={{ color: bannerAccent || 'var(--text-tertiary)' }}
              >
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                  badge
                </span>
                {LOCAL_TRANSLATIONS[language].nationalIdCard}
              </div>
              {profileData.nationalIdCard || profileData.nationalIdCardBack ? (
                <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {profileData.nationalIdCard && (
                    <div className='space-y-1.5'>
                      <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                        {LOCAL_TRANSLATIONS[language].frontFace}
                      </span>
                      <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                        <img
                          src={profileData.nationalIdCard}
                          alt='National ID Front'
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </div>
                  )}
                  {profileData.nationalIdCardBack && (
                    <div className='space-y-1.5'>
                      <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                        {LOCAL_TRANSLATIONS[language].backFace}
                      </span>
                      <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                        <img
                          src={profileData.nationalIdCardBack}
                          alt='National ID Back'
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 bg-(--bg-secondary)/20 border border-(--border-divider) border-dashed rounded-xl'>
                  <p className='text-sm text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].noIdCardImages}
                  </p>
                </div>
              )}
            </div>

            {/* Syndicate Cards Section */}
            <div className='space-y-1'>
              <div
                className='text-xs font-semibold uppercase px-1 flex items-center gap-2'
                style={{ color: bannerAccent || 'var(--text-tertiary)' }}
              >
                <span className='material-symbols-rounded' style={{ fontSize: 'var(--icon-md)' }}>
                  card_membership
                </span>
                {LOCAL_TRANSLATIONS[language].syndicateCards}
              </div>
              {profileData.mainSyndicateCard || profileData.subSyndicateCard ? (
                <div className='bg-(--bg-secondary)/10 pt-2.5 pb-4 px-4 rounded-xl border border-(--border-divider) grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  {profileData.mainSyndicateCard && (
                    <div className='space-y-1.5'>
                      <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                        {LOCAL_TRANSLATIONS[language].mainSyndicateCard}
                      </span>
                      <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                        <img
                          src={profileData.mainSyndicateCard}
                          alt='Main Syndicate Card'
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </div>
                  )}
                  {profileData.subSyndicateCard && (
                    <div className='space-y-1.5'>
                      <span className='text-[10px] font-semibold text-(--text-tertiary) uppercase px-1'>
                        {LOCAL_TRANSLATIONS[language].sub}
                      </span>
                      <div className='w-full aspect-[8/5] border border-(--border-divider) rounded-xl overflow-hidden bg-(--bg-secondary)/30 shadow-md'>
                        <img
                          src={profileData.subSyndicateCard}
                          alt='Sub Syndicate Card'
                          className='w-full h-full object-cover'
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className='text-center py-8 bg-(--bg-secondary)/20 border border-(--border-divider) border-dashed rounded-xl'>
                  <p className='text-sm text-(--text-tertiary)'>
                    {LOCAL_TRANSLATIONS[language].noSyndicateCardImages}
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
