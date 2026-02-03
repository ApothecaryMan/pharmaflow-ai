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
  testType?: 'standard' | 'multipage';
}

export const ModalTests: React.FC<ModalTestsProps> = ({ color, t, language }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<ModalConfig>({});
  const [activePage, setActivePage] = useState('page1');

  const openModal = (config: ModalConfig) => {
    setModalConfig(config);
    setIsOpen(true);
    // Reset page on open if it is a multipage modal
    if (config.testType === 'multipage') {
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
            ? `bg-${color}-500 text-white hover:bg-${color}-600 shadow-lg hover:shadow-xl`
            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
        }
      `}
      style={variant === 'primary' ? { backgroundColor: `var(--color-${color}-500, #3b82f6)` } : {}}
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
    <div className='bg-white dark:bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-800'>
      <h3 className='text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2 mb-4'>
        <span
          className='material-symbols-rounded text-[24px]'
          style={{ color: `var(--color-${color}-500, #3b82f6)` }}
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
          style={{ color: `var(--color-${color}-500, #3b82f6)` }}
        >
          dialogs
        </span>
        <div>
          <h1 className='text-2xl font-bold text-gray-800 dark:text-white'>
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
            : undefined
        }
        activeTab={modalConfig.testType === 'multipage' ? activePage : undefined}
        onTabChange={
          modalConfig.testType === 'multipage' ? (val) => setActivePage(val as string) : undefined
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
                  <span className='material-symbols-rounded text-6xl text-blue-500 mb-4'>
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
                style={{ backgroundColor: `var(--color-${color}-500, #3b82f6)` }}
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
