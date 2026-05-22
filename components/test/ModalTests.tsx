import type React from 'react';
import { useState } from 'react';
import { Modal } from '../common/Modal';

interface ModalTestsProps {
  color: string;
  t: (key: string) => string;
  language: 'EN' | 'AR';
}

type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl' | 'full';

interface ModalConfig {
  size?: ModalSize;
  title?: string;
  subtitle?: string;
  icon?: string;
  closeOnBackdropClick?: boolean;
  headerActions?: React.ReactNode;
  testType?: 'standard' | 'multipage' | 'profile-card';
}

export const ModalTests: React.FC<ModalTestsProps> = ({ color, t, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});
  const [activePage, setActivePage] = useState('page1');

  const openModal = (config: ModalConfig) => {
    setModalConfig(config);
    setIsOpen(true);
    // Reset page on open if it is a multipage modal
    if (config.testType === 'multipage' || config.testType === 'profile-card') {
      setActivePage('page1');
    }
  };

  const TestButton: React.FC<{
    label: string;
    config: ModalConfig;
    icon?: string;
    variant?: 'primary' | 'secondary';
  }> = ({ label, config, icon = 'open_in_new', variant = 'secondary' }) => (
    <button
      onClick={() => openModal(config)}
      className={`
        flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all
        ${
          variant === 'primary'
            ? `bg-primary-500 text-white hover:bg-primary-600 shadow-lg hover:shadow-xl`
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
      `}
      style={variant === 'primary' ? { backgroundColor: 'var(--color-primary-500, #3b82f6)' } : {}}
    >
      <span className='material-symbols-rounded text-[20px]'>{icon}</span>
      {label}
    </button>
  );

  const SectionCard: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({
    title,
    icon,
    children,
  }) => (
    <div className='bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-xs border border-gray-200 dark:border-gray-800'>
      <h3 className='text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4'>
        <span
          className='material-symbols-rounded text-[24px]'
          style={{ color: 'var(--color-primary-500, #3b82f6)' }}
        >
          {icon}
        </span>
        {title}
      </h3>
      <div className='flex flex-wrap gap-3'>{children}</div>
    </div>
  );

  // Sample header action for testing
  const sampleHeaderAction = (
    <button className='px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors'>
      Action
    </button>
  );

  return (
    <div className='space-y-6'>
      {/* Page Header */}
      <div className='flex items-center gap-3'>
        <span
          className='material-symbols-rounded text-[32px]'
          style={{ color: 'var(--color-primary-500, #3b82f6)' }}
        >
          dialogs
        </span>
        <div>
          <h1 className='text-2xl font-bold text-gray-800 dark:text-white page-title'>
            {language === 'AR' ? 'اختبار النوافذ' : 'Modal Tests'}
          </h1>
          <p className='text-gray-500 dark:text-gray-400 text-sm'>
            {language === 'AR'
              ? 'اختبر أحجام وميزات النوافذ المختلفة'
              : 'Test different modal sizes and features'}
          </p>
        </div>
      </div>

      {/* Size Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار الأحجام' : 'Size Tests'} icon='aspect_ratio'>
        <TestButton
          label='SM'
          config={{ size: 'sm', title: 'Small Modal' }}
          icon='photo_size_select_small'
        />
        <TestButton label='MD' config={{ size: 'md', title: 'Medium Modal' }} icon='crop_square' />
        <TestButton label='LG' config={{ size: 'lg', title: 'Large Modal' }} icon='crop_din' />
        <TestButton
          label='XL'
          config={{ size: 'xl', title: 'Extra Large Modal' }}
          icon='crop_free'
        />
        <TestButton label='2XL' config={{ size: '2xl', title: '2XL Modal' }} icon='fullscreen' />
        <TestButton label='3XL' config={{ size: '3xl', title: '3XL Modal' }} icon='fit_screen' />
        <TestButton label='4XL' config={{ size: '4xl', title: '4XL Modal' }} icon='open_in_full' />
        <TestButton label='5XL' config={{ size: '5xl', title: '5XL Modal' }} icon='zoom_out_map' />
        <TestButton
          label='6XL'
          config={{ size: '6xl', title: '6XL Modal' }}
          icon='fullscreen_exit'
        />
        <TestButton
          label='Full'
          config={{ size: 'full', title: 'Full Width Modal' }}
          icon='aspect_ratio'
          variant='primary'
        />
      </SectionCard>

      {/* Feature Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار الميزات' : 'Feature Tests'} icon='tune'>
        <TestButton
          label={language === 'AR' ? 'مع عنوان' : 'With Title'}
          config={{ title: 'Modal Title' }}
          icon='title'
        />
        <TestButton
          label={language === 'AR' ? 'مع عنوان فرعي' : 'With Subtitle'}
          config={{ title: 'Modal Title', subtitle: 'This is a subtitle description' }}
          icon='subtitles'
        />
        <TestButton
          label={language === 'AR' ? 'مع أيقونة' : 'With Icon'}
          config={{ title: 'Modal with Icon', icon: 'info' }}
          icon='add_reaction'
        />
        <TestButton
          label={language === 'AR' ? 'مع إجراءات' : 'With Header Actions'}
          config={{ title: 'Modal with Actions', headerActions: sampleHeaderAction }}
          icon='smart_button'
        />
        <TestButton
          label={language === 'AR' ? 'متعدد الصفحات' : 'Multi-page Modal'}
          config={{
            title: language === 'AR' ? 'نافذة متعددة الصفحات' : 'Multi-page Modal',
            testType: 'multipage',
            size: 'lg',
          }}
          icon='tab'
          variant='primary'
        />
        <TestButton
          label={language === 'AR' ? 'كامل الميزات' : 'Full Features'}
          config={{
            title: 'Complete Modal',
            subtitle: 'With all features enabled',
            icon: 'star',
            headerActions: sampleHeaderAction,
          }}
          icon='stars'
        />
      </SectionCard>

      {/* Behavior Tests */}
      <SectionCard title={language === 'AR' ? 'اختبار السلوك' : 'Behavior Tests'} icon='psychology'>
        <TestButton
          label={language === 'AR' ? 'إغلاق بالنقر على الخلفية' : 'Backdrop Click Close'}
          config={{ title: 'Click backdrop to close', closeOnBackdropClick: true }}
          icon='touch_app'
        />
        <TestButton
          label={language === 'AR' ? 'تعطيل إغلاق الخلفية' : 'Backdrop Close Disabled'}
          config={{ title: 'Backdrop click disabled', closeOnBackdropClick: false }}
          icon='block'
        />
        <TestButton
          label={language === 'AR' ? 'بدون عنوان' : 'No Title (Raw)'}
          config={{}}
          icon='crop_original'
        />
      </SectionCard>

      {/* Profile Modal Tests */}
      <SectionCard title={language === 'AR' ? 'نافذة الملف الشخصي' : 'Profile Modal'} icon='person'>
        <TestButton
          label={language === 'AR' ? 'بطاقة الملف' : 'Profile Card'}
          config={{
            title: language === 'AR' ? 'الملف الشخصي' : 'Profile',
            subtitle: language === 'AR' ? 'عرض بيانات الملف الشخصي' : 'View profile details',
            icon: 'badge',
            size: 'lg',
            testType: 'profile-card',
          }}
          icon='badge'
          variant='primary'
        />
        <TestButton
          label={language === 'AR' ? 'تعديل الملف' : 'Edit Profile'}
          config={{
            title: language === 'AR' ? 'تعديل الملف الشخصي' : 'Edit Profile',
            subtitle: language === 'AR' ? 'تعديل البيانات الشخصية' : 'Update your personal information',
            icon: 'edit',
            size: 'lg',
          }}
          icon='edit'
        />
        <TestButton
          label={language === 'AR' ? 'الصورة الشخصية' : 'Avatar Upload'}
          config={{
            title: language === 'AR' ? 'تغيير الصورة الشخصية' : 'Change Avatar',
            icon: 'account_circle',
            size: 'sm',
          }}
          icon='account_circle'
        />
        <TestButton
          label={language === 'AR' ? 'ملف كامل' : 'Full Profile'}
          config={{
            title: language === 'AR' ? 'الملف الشخصي الكامل' : 'Full Profile',
            subtitle: language === 'AR' ? 'جميع البيانات والإعدادات' : 'All details and settings',
            icon: 'person',
            size: 'xl',
            headerActions: sampleHeaderAction,
          }}
          icon='person'
          variant='primary'
        />
      </SectionCard>

      {/* The Modal */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        size={modalConfig.size}
        title={modalConfig.title}
        subtitle={modalConfig.subtitle}
        icon={modalConfig.icon}
        tabs={
          modalConfig.testType === 'multipage'
            ? [
                {
                  label: language === 'AR' ? 'الصفحة 1' : 'Page 1',
                  value: 'page1',
                  icon: 'description',
                },
                {
                  label: language === 'AR' ? 'الصفحة 2' : 'Page 2',
                  value: 'page2',
                  icon: 'settings',
                },
              ]
            : modalConfig.testType === 'profile-card'
              ? [
                  {
                    label: language === 'AR' ? 'نظرة عامة' : 'Overview',
                    value: 'page1',
                    icon: 'person',
                  },
                  {
                    label: language === 'AR' ? 'التفاصيل' : 'Details',
                    value: 'page2',
                    icon: 'info',
                  },
                ]
              : undefined
        }
        activeTab={modalConfig.testType === 'multipage' || modalConfig.testType === 'profile-card' ? activePage : undefined}
        onTabChange={
          modalConfig.testType === 'multipage' || modalConfig.testType === 'profile-card' ? (val) => setActivePage(val as string) : undefined
        }
        headerActions={modalConfig.headerActions}
        closeOnBackdropClick={modalConfig.closeOnBackdropClick ?? true}
      >
        {/* Modal Content */}
        {modalConfig.testType === 'multipage' ? (
          <div className='space-y-4 animate-fade-in'>
            <div className='p-6 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl'>
              {activePage === 'page1' ? (
                <div className='animate-fade-in'>
                  <span className='material-symbols-rounded text-6xl text-primary-500 mb-4'>
                    description
                  </span>
                  <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
                    {language === 'AR' ? 'محتوى الصفحة الأولى' : 'Page 1 Content'}
                  </h3>
                  <p className='text-gray-500'>
                    {language === 'AR'
                      ? 'هذا هو المحتوى الخاص بالصفحة الأولى. يمكنك التبديل إلى الصفحة الثانية باستخدام عناصر التحكم في الأعلى.'
                      : 'This is the content for Page 1. You can switch to Page 2 using the controls above.'}
                  </p>
                </div>
              ) : (
                <div className='animate-fade-in'>
                  <span className='material-symbols-rounded text-6xl text-purple-500 mb-4'>
                    settings
                  </span>
                  <h3 className='text-xl font-bold text-gray-800 dark:text-white mb-2'>
                    {language === 'AR' ? 'محتوى الصفحة الثانية' : 'Page 2 Content'}
                  </h3>
                  <p className='text-gray-500'>
                    {language === 'AR'
                      ? 'هذا هو المحتوى الخاص بالصفحة الثانية. لاحظ كيف يتغير المحتوى دون إغلاق النافذة.'
                      : 'This is the content for Page 2. Notice how the content changes without closing the modal.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : modalConfig.testType === 'profile-card' ? (
          <div className='animate-fade-in'>
            {activePage === 'page1' ? (
              /* ── Page 1: Overview ── */
              <div className='animate-fade-in space-y-5'>
                {/* Avatar + Name Hero */}
                <div className='flex flex-col items-center gap-3 py-2'>
                  <div
                    className='w-24 h-24 rounded-full flex items-center justify-center shadow-lg'
                    style={{ background: 'linear-gradient(135deg, var(--color-primary-400, #60a5fa), var(--color-primary-600, #2563eb))' }}
                  >
                    <span className='material-symbols-rounded text-white' style={{ fontSize: '48px' }}>person</span>
                  </div>
                  <div className='text-center'>
                    <h3 className='text-xl font-bold text-gray-900 dark:text-white'>
                      {language === 'AR' ? 'أحمد محمد' : 'Ahmed Mohamed'}
                    </h3>
                    <span
                      className='inline-block mt-1 px-3 py-0.5 rounded-full text-xs font-semibold text-white'
                      style={{ backgroundColor: 'var(--color-primary-500, #3b82f6)' }}
                    >
                      {language === 'AR' ? 'صيدلي مدير' : 'Pharmacist Manager'}
                    </span>
                  </div>
                </div>

                {/* Info Grid */}
                <div className='grid grid-cols-2 gap-3'>
                  {[
                    { icon: 'store', label: language === 'AR' ? 'الفرع' : 'Branch', value: language === 'AR' ? 'الفرع الرئيسي' : 'Main Branch' },
                    { icon: 'calendar_month', label: language === 'AR' ? 'تاريخ الانضمام' : 'Joined', value: '2024-01-15' },
                    { icon: 'badge', label: language === 'AR' ? 'كود الموظف' : 'Employee ID', value: 'EMP-0042' },
                    { icon: 'schedule', label: language === 'AR' ? 'الحالة' : 'Status', value: language === 'AR' ? 'نشط' : 'Active' },
                  ].map((item) => (
                    <div key={item.icon} className='flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60'>
                      <span className='material-symbols-rounded text-[20px] text-gray-400 dark:text-gray-500'>{item.icon}</span>
                      <div className='min-w-0'>
                        <p className='text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'>{item.label}</p>
                        <p className='text-sm font-semibold text-gray-800 dark:text-gray-200 truncate'>{item.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* ── Page 2: Details ── */
              <div className='animate-fade-in space-y-5'>
                {/* Contact Info */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3'>
                    {language === 'AR' ? 'بيانات التواصل' : 'Contact Information'}
                  </h4>
                  <div className='space-y-2'>
                    {[
                      { icon: 'mail', label: language === 'AR' ? 'البريد الإلكتروني' : 'Email', value: 'ahmed@pharmaflow.com' },
                      { icon: 'phone', label: language === 'AR' ? 'الهاتف' : 'Phone', value: '+20 100 123 4567' },
                      { icon: 'location_on', label: language === 'AR' ? 'العنوان' : 'Address', value: language === 'AR' ? 'القاهرة، مصر' : 'Cairo, Egypt' },
                    ].map((item) => (
                      <div key={item.icon} className='flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60'>
                        <span className='material-symbols-rounded text-[20px] text-gray-400 dark:text-gray-500'>{item.icon}</span>
                        <div className='min-w-0 flex-1'>
                          <p className='text-[11px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide'>{item.label}</p>
                          <p className='text-sm font-semibold text-gray-800 dark:text-gray-200 truncate'>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3'>
                    {language === 'AR' ? 'إحصائيات' : 'Activity Stats'}
                  </h4>
                  <div className='grid grid-cols-3 gap-3'>
                    {[
                      { label: language === 'AR' ? 'المبيعات' : 'Sales', value: '1,247', icon: 'point_of_sale', color: '#10b981' },
                      { label: language === 'AR' ? 'أيام الحضور' : 'Attendance', value: '96%', icon: 'event_available', color: '#6366f1' },
                      { label: language === 'AR' ? 'التقييم' : 'Rating', value: '4.8', icon: 'star', color: '#f59e0b' },
                    ].map((stat) => (
                      <div key={stat.icon} className='text-center p-3 rounded-xl bg-gray-50 dark:bg-gray-800/60'>
                        <span className='material-symbols-rounded text-[24px] mb-1 block' style={{ color: stat.color }}>{stat.icon}</span>
                        <p className='text-lg font-bold text-gray-900 dark:text-white'>{stat.value}</p>
                        <p className='text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase'>{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Permissions Summary */}
                <div>
                  <h4 className='text-xs font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3'>
                    {language === 'AR' ? 'الصلاحيات' : 'Permissions'}
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
                        className='inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                      >
                        <span className='material-symbols-rounded text-[14px]'>check_circle</span>
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className='space-y-4'>
            <div className='p-4 bg-gray-50 dark:bg-gray-800 rounded-xl'>
              <h4 className='font-medium text-gray-800 dark:text-white mb-2'>
                {language === 'AR' ? 'تكوين النافذة' : 'Modal Configuration'}
              </h4>
              <pre className='text-sm text-gray-600 dark:text-gray-400 overflow-auto'>
                {JSON.stringify(modalConfig, null, 2)}
              </pre>
            </div>

            <p className='text-gray-600 dark:text-gray-400'>
              {language === 'AR'
                ? 'هذا محتوى تجريبي للنافذة. يمكنك إغلاق النافذة بالضغط على زر الإغلاق أو الضغط على ESC أو النقر على الخلفية (إذا كان مفعلاً).'
                : 'This is sample modal content. You can close this modal by clicking the close button, pressing ESC, or clicking the backdrop (if enabled).'}
            </p>

            <div className='flex gap-3 pt-4'>
              <button
                onClick={() => setIsOpen(false)}
                className='flex-1 px-4 py-2.5 rounded-xl font-medium text-white transition-colors'
                style={{ backgroundColor: 'var(--color-primary-500, #3b82f6)' }}
              >
                {language === 'AR' ? 'إغلاق' : 'Close Modal'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
