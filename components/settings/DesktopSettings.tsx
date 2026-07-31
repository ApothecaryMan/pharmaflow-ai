import type React from 'react';
import { useDesktopSettings } from '../../hooks/infrastructure/useDesktopSettings';
import { isTauri } from '../../utils/platform';
import { FilterDropdown } from '../common/FilterDropdown';

interface DesktopSettingsProps {
  t: Translations;
  language: 'EN' | 'AR';
  color?: string;
  onViewChange?: (view: string) => void;
}

interface OsBannerInfo {
  icon: string;
  title: string;
  description: string;
  variant: 'warning' | 'info';
}

function getOsBanner(os: string, dt: Record<string, any>): OsBannerInfo | null {
  const lower = os.toLowerCase();
  if (lower.startsWith('linux')) {
    return {
      icon: 'warning',
      title: 'Linux',
      description: dt.linuxWarning,
      variant: 'warning',
    };
  }
  if (lower.startsWith('windows')) {
    return {
      icon: 'check_circle',
      title: 'Windows',
      description: dt.windowsInfo,
      variant: 'info',
    };
  }
  return null;
}

export const DesktopSettings: React.FC<DesktopSettingsProps> = ({
  t,
  language,
  color = 'emerald',
  onViewChange,
}) => {
  const dt = t.desktop || {};
  const pt = t.printerSettings || {};

  const {
    printers,
    isLoadingPrinters,
    refreshPrinters,
    selectedReceiptPrinter,
    selectedLabelPrinter,
    setReceiptPrinter,
    setLabelPrinter,
    printerStatus,
    testPrint,
    preferredInterface,
    setPreferredInterface,
    systemInfo,
    isLoadingSystemInfo,
    updateStatus,
    checkUpdates,
    installUpdate,
  } = useDesktopSettings();

  if (!isTauri()) {
    return (
      <div className='p-8 text-center bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-(--border-divider)'>
        <span className='material-symbols-rounded text-[48px] text-gray-300 mb-4'>
          desktop_windows
        </span>
        <h3 className='text-lg font-bold text-gray-700 dark:text-gray-300'>
          {language === 'AR' ? 'متاح فقط في نسخة سطح المكتب' : 'Only available in Desktop version'}
        </h3>
        <p className='text-sm text-gray-500 mt-2'>
          {language === 'AR'
            ? 'يرجى فتح التطبيق من خلال نسخة ويندوز للوصول إلى إعدادات التكامل المتقدمة.'
            : 'Please open the app via Windows version to access advanced integration settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className='min-h-screen p-6 md:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500'>
      {/* Header Section */}
      <div className='mb-6'>
        <h2 className='text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3'>
          <span className={`material-symbols-rounded text-[28px] text-${color}-500`}>
            desktop_windows
          </span>
          {dt.title}
        </h2>
        <p className='text-gray-500 dark:text-gray-400 mt-1'>{dt.subtitle}</p>
      </div>

      {(() => {
        const banner = systemInfo?.os ? getOsBanner(systemInfo.os, dt) : null;
        if (!banner) return null;
        const isWarning = banner.variant === 'warning';
        return (
          <div
            className={`flex items-start gap-4 p-4 rounded-xl border mb-6 ${
              isWarning
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/30'
                : 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800/30'
            }`}
          >
            <span
              className={`material-symbols-rounded text-[24px] flex-shrink-0 ${
                isWarning ? 'text-amber-500' : 'text-sky-500'
              }`}
            >
              {banner.icon}
            </span>
            <div>
              <p
                className={`text-sm font-bold ${
                  isWarning ? 'text-amber-800 dark:text-amber-300' : 'text-sky-800 dark:text-sky-300'
                }`}
              >
                {banner.title}
              </p>
              <p
                className={`text-xs mt-1 ${
                  isWarning
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-sky-700 dark:text-sky-400'
                }`}
              >
                {banner.description}
              </p>
            </div>
          </div>
        );
      })()}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column — Printer Management */}
        <section className='lg:col-span-2 bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-xl p-5 md:p-6 space-y-5 shadow-sm'>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
              <span className='material-symbols-rounded text-[18px]'>print</span>
              {dt.printer}
            </h3>
            <button
              onClick={refreshPrinters}
              disabled={isLoadingPrinters}
              className='p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400'
              type='button'
            >
              <span
                className={`material-symbols-rounded text-[18px] ${isLoadingPrinters ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-5'>
            <div className='space-y-2'>
              <span className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[16px] text-gray-400'>receipt_long</span>
                {language === 'AR' ? 'طابعة الفواتير' : 'Receipt Printer'}
              </span>
              <FilterDropdown<string>
                items={printers}
                selectedItem={selectedReceiptPrinter || undefined}
                onSelect={(p) => setReceiptPrinter(p)}
                keyExtractor={(p) => p}
                minHeight={40}
                className='w-full'
                renderSelected={(p) => (
                  <span className='text-sm font-medium text-gray-800 dark:text-white truncate'>
                    {p ||
                      pt.selectPrinter ||
                      (language === 'AR' ? 'اختر طابعة الفواتير...' : 'Select Receipt Printer...')}
                  </span>
                )}
                renderItem={(p) => (
                  <div className='flex items-center gap-2 py-1'>
                    <span className='material-symbols-rounded text-[16px] text-gray-400'>
                      receipt_long
                    </span>
                    <span className='text-sm'>{p}</span>
                  </div>
                )}
                variant='input'
              />
              <p className='text-xs text-gray-400 dark:text-gray-500 leading-relaxed'>
                {dt.receiptPrinterHelper}
              </p>
            </div>

            <div className='space-y-2'>
              <span className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                <span className='material-symbols-rounded text-[16px] text-gray-400'>label</span>
                {language === 'AR' ? 'طابعة الملصقات' : 'Label Printer'}
              </span>
              <FilterDropdown<string>
                items={printers}
                selectedItem={selectedLabelPrinter || undefined}
                onSelect={(p) => setLabelPrinter(p)}
                keyExtractor={(p) => p}
                minHeight={40}
                className='w-full'
                renderSelected={(p) => (
                  <span className='text-sm font-medium text-gray-800 dark:text-white truncate'>
                    {p ||
                      pt.selectPrinter ||
                      (language === 'AR' ? 'اختر طابعة الملصقات...' : 'Select Label Printer...')}
                  </span>
                )}
                renderItem={(p) => (
                  <div className='flex items-center gap-2 py-1'>
                    <span className='material-symbols-rounded text-[16px] text-gray-400'>label</span>
                    <span className='text-sm'>{p}</span>
                  </div>
                )}
                variant='input'
              />
              <p className='text-xs text-gray-400 dark:text-gray-500 leading-relaxed'>
                {dt.labelPrinterHelper}
              </p>
            </div>
          </div>

          <div className='flex gap-2'>
            <button
              onClick={testPrint}
              disabled={!selectedReceiptPrinter || printerStatus === 'testing'}
              className={`h-[40px] flex-1 px-4 text-xs font-bold rounded-xl transition-colors ${
                selectedReceiptPrinter && printerStatus !== 'testing'
                  ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-gray-100'
                  : 'bg-[var(--bg-skeleton)] text-gray-400 cursor-not-allowed'
              }`}
              type='button'
            >
              {printerStatus === 'testing' ? (
                <span className='flex items-center justify-center gap-2'>
                  <span className='material-symbols-rounded text-[16px] animate-spin'>sync</span>
                  {language === 'AR' ? 'جاري...' : 'Testing...'}
                </span>
              ) : (
                pt.testPrintReceipt || (language === 'AR' ? 'طباعة تجريبية' : 'Test Print')
              )}
            </button>
            {selectedLabelPrinter && (
              <button
                onClick={testPrint}
                disabled={printerStatus === 'testing'}
                className='h-[40px] px-4 text-xs font-bold rounded-xl transition-colors bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-gray-100'
                type='button'
              >
                {language === 'AR' ? 'تجربة الملصق' : 'Test Label'}
              </button>
            )}
          </div>

          {/* Preferred Interface inside Printer Management */}
          <div className='pt-4 border-t border-(--border-divider) space-y-3'>
            <h4 className='text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
              <span className='material-symbols-rounded text-[16px]'>settings_ethernet</span>
              {dt.preferredInterface}
            </h4>
            <div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
              {([
                { value: 'auto' as const, label: language === 'AR' ? 'تلقائي' : 'Auto', key: 'interfaceAuto' },
                { value: 'tauri' as const, label: 'Tauri Native', key: 'interfaceTauri' },
                { value: 'qz' as const, label: 'QZ Tray', key: 'interfaceQz' },
              ] as const).map((opt) => {
                const isSelected = preferredInterface === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setPreferredInterface(opt.value)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border text-center transition-all ${
                      isSelected
                        ? 'border-zinc-300 dark:border-zinc-600 bg-[var(--bg-skeleton)]'
                        : 'border-transparent bg-[var(--bg-skeleton)] opacity-60 hover:bg-gray-100 dark:hover:bg-zinc-800'
                    }`}
                    type='button'
                  >
                    <span
                      className={`material-symbols-rounded text-[20px] ${
                        isSelected ? 'text-zinc-700 dark:text-zinc-300' : 'text-gray-400'
                      }`}
                    >
                      {isSelected ? 'radio_button_checked' : 'radio_button_unchecked'}
                    </span>
                    <span
                      className={`text-sm font-bold ${
                        isSelected
                          ? 'text-zinc-800 dark:text-zinc-200'
                          : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {opt.label}
                    </span>
                    <p className='text-[11px] text-gray-400 dark:text-gray-500 leading-relaxed'>
                      {dt[opt.key]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column — Updates + System Info */}
        <div className='space-y-5'>
          {/* Updates Management */}
          <section className='bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-xl p-5 md:p-6 space-y-4 shadow-sm'>
            <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
              <span className='material-symbols-rounded text-[18px]'>system_update</span>
              {dt.autoUpdate}
            </h3>

            <div className='space-y-3'>
              <div className='flex items-center justify-between p-3 bg-[var(--bg-skeleton)] opacity-60 rounded-xl border border-transparent dark:border-(--border-divider)'>
                <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                  {dt.version}
                </span>
                <span className='text-xs font-bold bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-(--border-divider)'>
                  {isLoadingSystemInfo ? '...' : `v${systemInfo?.version || '—'}`}
                </span>
              </div>

              {updateStatus === 'available' && (
                <div className='p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl animate-pulse'>
                  <p className='text-xs font-bold text-emerald-700 dark:text-emerald-400'>
                    {dt.updateAvailable}
                  </p>
                </div>
              )}

              {updateStatus === 'available' && (
                <button
                  onClick={installUpdate}
                  className='w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20'
                  type='button'
                >
                  <span className='material-symbols-rounded text-[18px]'>download</span>
                  {dt.installNow}
                </button>
              )}
              {updateStatus === 'downloading' && (
                <button
                  disabled
                  className='w-full py-2.5 bg-emerald-400 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed'
                  type='button'
                >
                  <span className='material-symbols-rounded text-[18px] animate-spin'>sync</span>
                  {dt.downloading}
                </button>
              )}
              {(updateStatus === 'idle' || updateStatus === 'up_to_date' || updateStatus === 'error') && (
                <button
                  onClick={checkUpdates}
                  className='w-full py-2.5 bg-[var(--bg-skeleton)] hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all'
                  type='button'
                >
                  <span className='material-symbols-rounded text-[18px]'>update</span>
                  {dt.checkUpdates}
                </button>
              )}
              {updateStatus === 'checking' && (
                <button
                  disabled
                  className='w-full py-2.5 bg-[var(--bg-skeleton)] text-gray-400 rounded-xl font-bold text-sm flex items-center justify-center gap-2 cursor-not-allowed'
                  type='button'
                >
                  <span className='material-symbols-rounded text-[18px] animate-spin'>sync</span>
                  {dt.checkUpdates}
                </button>
              )}
            </div>
          </section>

          {/* System Info */}
          <section className='bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-xl p-5 md:p-6 space-y-4 shadow-sm'>
            <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
              <span className='material-symbols-rounded text-[18px]'>info</span>
              {dt.systemInfo}
            </h3>

            {isLoadingSystemInfo ? (
              <div className='flex items-center justify-center py-6'>
                <span className='material-symbols-rounded text-[28px] text-gray-300 animate-spin'>
                  sync
                </span>
              </div>
            ) : systemInfo ? (
              <div className='grid grid-cols-2 gap-3'>
                {[
                  { label: dt.os, value: systemInfo.os, icon: 'grid_view' },
                  { label: dt.osVersion, value: systemInfo.osVersion, icon: 'tag' },
                  { label: dt.arch, value: systemInfo.arch, icon: 'memory' },
                  { label: dt.memory, value: systemInfo.memory, icon: 'rebase_edit' },
                  { label: dt.version, value: `v${systemInfo.version}`, icon: 'new_releases' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className='p-3 bg-[var(--bg-skeleton)] opacity-60 rounded-xl border border-transparent hover:border-(--border-divider) transition-all group'
                  >
                    <span className={`material-symbols-rounded text-[18px] text-gray-400 group-hover:text-${color}-500 transition-colors mb-1 block`}>
                      {item.icon}
                    </span>
                    <p className='text-[10px] font-bold text-gray-400 uppercase tracking-tighter'>
                      {item.label}
                    </p>
                    <p className='text-xs font-bold text-gray-700 dark:text-gray-200 truncate'>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className='text-sm text-gray-400 text-center py-4'>
                {language === 'AR' ? 'تعذر تحميل معلومات النظام' : 'Failed to load system information'}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* Browser Version Banner */}
      <div className='mt-6'>
        <div className='p-5 bg-[var(--bg-skeleton)] opacity-60 border border-gray-200 dark:border-zinc-700/50 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='flex items-center gap-4'>
            <div className='w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 flex items-center justify-center flex-shrink-0'>
              <span className='material-symbols-rounded text-[24px] text-gray-500 dark:text-gray-400'>
                public
              </span>
            </div>
            <div>
              <p className='text-sm font-bold text-gray-800 dark:text-gray-200'>
                {language === 'AR' ? 'إعدادات الطباعة للمتصفح' : 'Browser Print Settings'}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md leading-relaxed'>
                {language === 'AR'
                  ? 'لإدارة طابعات QZ Tray والطباعة الصامتة عبر الشبكة.'
                  : 'Manage QZ Tray printers and network silent printing.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onViewChange?.('browser-settings')}
            className='w-full md:w-auto px-6 py-2.5 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors shadow-sm'
            type='button'
          >
            {language === 'AR' ? 'الانتقال للإعدادات' : 'Go to Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DesktopSettings;
