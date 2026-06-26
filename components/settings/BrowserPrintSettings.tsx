/**
 * BrowserPrintSettings Component
 *
 * Full-featured settings page for QZ Tray printer configuration in the browser.
 * Allows users to select printers for labels and receipts,
 * configure silent printing mode, and test print.
 */

import type React from 'react';
import { useEffect, useState } from 'react';
import { usePrinter } from '../../hooks/infrastructure/usePrinter';
import { isTauri } from '../../utils/platform';
import type { SilentMode } from '../../utils/qzPrinter';
import { FilterDropdown } from '../common/FilterDropdown';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';

interface BrowserPrintSettingsProps {
  color?: string;
  t: Translations;
  language: 'EN' | 'AR';
  onViewChange?: (view: string) => void;
}

export const BrowserPrintSettings: React.FC<BrowserPrintSettingsProps> = ({
  color = 'emerald',
  t,
  language,
  onViewChange,
}) => {
  const {
    status,
    isConnecting,
    connect,
    printers,
    isLoadingPrinters,
    refreshPrinters,
    settings,
    updateSettings,
    testPrintLabel,
    testPrintReceipt,
  } = usePrinter();

  const [testingLabel, setTestingLabel] = useState(false);
  const [testingReceipt, setTestingReceipt] = useState(false);

  useEffect(() => {
    if (status === 'connected') {
      refreshPrinters();
    }
  }, [status, refreshPrinters]);

  const handleTestLabel = async () => {
    setTestingLabel(true);
    try {
      await testPrintLabel();
    } catch (e) {
      console.error('Test print failed:', e);
    } finally {
      setTestingLabel(false);
    }
  };

  const handleTestReceipt = async () => {
    setTestingReceipt(true);
    try {
      await testPrintReceipt();
    } catch (e) {
      console.error('Test print failed:', e);
    } finally {
      setTestingReceipt(false);
    }
  };

  // Status indicator
  const StatusBadge = () => {
    const statusConfig = {
      connected: {
        color: 'bg-emerald-500',
        text: t.printerSettings?.status?.connected || (language === 'AR' ? 'متصل' : 'Connected'),
        icon: 'check_circle',
      },
      disconnected: {
        color: 'bg-gray-400',
        text: t.printerSettings?.status?.disconnected || (language === 'AR' ? 'غير متصل' : 'Disconnected'),
        icon: 'cancel',
      },
      connecting: {
        color: 'bg-amber-500',
        text: t.printerSettings?.status?.connecting || (language === 'AR' ? 'جاري الاتصال...' : 'Connecting...'),
        icon: 'sync',
      },
      not_installed: {
        color: 'bg-red-500',
        text: t.printerSettings?.status?.notInstalled || (language === 'AR' ? 'غير مثبت' : 'Not Installed'),
        icon: 'error',
      },
    };

    const config = statusConfig[status];

    return (
      <div className='flex items-center gap-2'>
        <span
          className={`w-2.5 h-2.5 rounded-full ${config.color} ${status === 'connecting' ? 'animate-pulse' : ''}`}
        />
        <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>{config.text}</span>
      </div>
    );
  };

  const pt = t.printerSettings || {};
  const pageTitle = pt.title || (language === 'AR' ? 'إعدادات الطباعة' : 'Print Settings');
  const pageSubtitle = pt.subtitle || (language === 'AR' ? 'إعدادات الطباعة الصامتة باستخدام QZ Tray' : 'Configure silent printing with QZ Tray');

  return (
    <div className='space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 p-6 md:p-8 max-w-5xl mx-auto'>
      {/* Header Section */}
      <div>
        <h2 className='text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3'>
          <span className={`material-symbols-rounded text-[28px] text-${color}-500`}>
            print
          </span>
          {pageTitle}
        </h2>
        <p className='text-gray-500 dark:text-gray-400 mt-1'>{pageSubtitle}</p>
      </div>

      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {/* Connection Management */}
        <section className='bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-2xl p-6 space-y-4 shadow-sm'>
          <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
            <span className='material-symbols-rounded text-[18px]'>settings_ethernet</span>
            {pt.connection || (language === 'AR' ? 'الاتصال' : 'Connection')}
          </h3>

          <div className='space-y-4'>
            <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-transparent dark:border-(--border-divider)'>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>
                {pt.enabled || (language === 'AR' ? 'تفعيل QZ Tray' : 'QZ Tray Enabled')}
              </span>
              <Switch
                checked={settings.enabled}
                onChange={(checked) => updateSettings({ enabled: checked })}
                theme={color}
              />
            </div>

            <div className='flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-transparent dark:border-(--border-divider)'>
              <StatusBadge />
              <div className='flex items-center gap-2'>
                {status === 'disconnected' && settings.enabled && (
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className={`px-3 py-1.5 text-sm font-bold rounded-lg transition-colors bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 hover:bg-${color}-200 dark:hover:bg-${color}-900/50`}
                  >
                    {pt.reconnect || (language === 'AR' ? 'إعادة الاتصال' : 'Reconnect')}
                  </button>
                )}
                {status === 'not_installed' && (
                  <a
                    href='https://qz.io/download/'
                    target='_blank'
                    rel='noopener noreferrer'
                    className='px-3 py-1.5 text-sm font-bold rounded-lg transition-colors bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-zinc-700 flex items-center gap-1 border border-transparent dark:border-(--border-divider)'
                  >
                    <span className='material-symbols-rounded text-[16px]'>download</span>
                    {pt.download || (language === 'AR' ? 'تنزيل QZ Tray' : 'Download QZ Tray')}
                  </a>
                )}
              </div>
            </div>

            {/* Silent Mode Section */}
            {settings.enabled && (
              <div className='space-y-3 pt-4 border-t border-(--border-divider)'>
                <label className='text-[11px] font-bold text-gray-400 uppercase tracking-wider block'>
                  {pt.silentMode || (language === 'AR' ? 'الطباعة الصامتة' : 'Silent Mode')}
                </label>
                <SegmentedControl<SilentMode>
                  value={settings.silentMode}
                  onChange={(mode) => updateSettings({ silentMode: mode })}
                  size='sm'
                  options={[
                    { label: pt.silentModes?.on || 'ON', value: 'on' },
                    { label: pt.silentModes?.fallback || 'FALLBACK', value: 'fallback' },
                    { label: pt.silentModes?.off || 'OFF', value: 'off' },
                  ]}
                />
                <p className='text-xs text-gray-500 dark:text-gray-400 leading-relaxed'>
                  {settings.silentMode === 'on' &&
                    (pt.silentHints?.on || (language === 'AR' ? 'طباعة صامتة دائماً (تتطلب QZ Tray)' : 'Always print silently (requires QZ Tray)'))}
                  {settings.silentMode === 'off' && (pt.silentHints?.off || (language === 'AR' ? 'عرض نافذة الطباعة دائماً' : 'Always show print dialog'))}
                  {settings.silentMode === 'fallback' &&
                    (pt.silentHints?.fallback || (language === 'AR' ? 'صامت إذا كان QZ متاحاً، وغير ذلك يعرض النافذة' : 'Silent if QZ available, dialog otherwise'))}
                </p>
              </div>
            )}
            
            {status === 'not_installed' && settings.enabled && (
              <div className='bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4'>
                <div className='flex items-start gap-3'>
                  <span className='material-symbols-rounded text-amber-500 text-[24px]'>warning</span>
                  <div>
                    <p className='text-sm font-bold text-amber-800 dark:text-amber-200'>
                      {pt.alerts?.notInstalled || (language === 'AR' ? 'QZ Tray غير مثبت' : 'QZ Tray is not installed')}
                    </p>
                    <p className='text-xs text-amber-600 dark:text-amber-300 mt-1'>
                      {language === 'AR'
                        ? 'يرجى تحميل وتثبيت QZ Tray للطباعة الصامتة'
                        : 'Please download and install QZ Tray for silent printing'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Printers Management */}
        <section className={`bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-2xl p-6 space-y-4 shadow-sm ${status !== 'connected' ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className='flex items-center justify-between'>
            <h3 className='text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2'>
              <span className='material-symbols-rounded text-[18px]'>print</span>
              {language === 'AR' ? 'الطابعات' : 'Printers'}
            </h3>
            <button
              onClick={refreshPrinters}
              disabled={isLoadingPrinters}
              className='p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400'
            >
              <span
                className={`material-symbols-rounded text-[18px] ${isLoadingPrinters ? 'animate-spin' : ''}`}
              >
                refresh
              </span>
            </button>
          </div>

          <div className='space-y-6'>
            {/* Receipt Printer */}
            <div className='space-y-3'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[18px] text-gray-400'>receipt_long</span>
                  {pt.receiptPrinter || (language === 'AR' ? 'طابعة الفواتير' : 'Receipt Printer')}
                </label>
                <button
                  onClick={handleTestReceipt}
                  disabled={testingReceipt || !settings.receiptPrinter}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    settings.receiptPrinter
                      ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 hover:bg-${color}-100`
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {testingReceipt ? (
                    <span className='material-symbols-rounded text-[14px] animate-spin'>sync</span>
                  ) : (
                    <span className='material-symbols-rounded text-[14px]'>science</span>
                  )}
                  {pt.testPrintReceipt || (language === 'AR' ? 'تجربة' : 'Test')}
                </button>
              </div>
              <div className='relative'>
                <FilterDropdown<string>
                  items={printers}
                  selectedItem={settings.receiptPrinter || undefined}
                  onSelect={(printer) => updateSettings({ receiptPrinter: printer })}
                  keyExtractor={(p) => p}
                  renderSelected={(p) => (
                    <span className='text-sm font-medium text-gray-800 dark:text-white truncate'>
                      {p || pt.selectPrinter || (language === 'AR' ? 'اختر الطابعة...' : 'Select Printer...')}
                    </span>
                  )}
                  renderItem={(p) => (
                    <div className='flex items-center gap-2 py-1'>
                      <span className='material-symbols-rounded text-[16px] text-gray-400'>print</span>
                      <span className='text-sm'>{p}</span>
                    </div>
                  )}
                  variant='input'
                />
              </div>
            </div>

            {/* Label Printer */}
            <div className='space-y-3 pt-4 border-t border-(--border-divider)'>
              <div className='flex items-center justify-between'>
                <label className='text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                  <span className='material-symbols-rounded text-[18px] text-gray-400'>label</span>
                  {pt.labelPrinter || (language === 'AR' ? 'طابعة الملصقات' : 'Label Printer')}
                </label>
                <button
                  onClick={handleTestLabel}
                  disabled={testingLabel || !settings.labelPrinter}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                    settings.labelPrinter
                      ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 hover:bg-${color}-100`
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {testingLabel ? (
                    <span className='material-symbols-rounded text-[14px] animate-spin'>sync</span>
                  ) : (
                    <span className='material-symbols-rounded text-[14px]'>science</span>
                  )}
                  {pt.testPrintLabel || (language === 'AR' ? 'تجربة' : 'Test')}
                </button>
              </div>
              <div className='relative'>
                <FilterDropdown<string>
                  items={printers}
                  selectedItem={settings.labelPrinter || undefined}
                  onSelect={(printer) => updateSettings({ labelPrinter: printer })}
                  keyExtractor={(p) => p}
                  renderSelected={(p) => (
                    <span className='text-sm font-medium text-gray-800 dark:text-white truncate'>
                      {p || pt.selectPrinter || (language === 'AR' ? 'اختر الطابعة...' : 'Select Printer...')}
                    </span>
                  )}
                  renderItem={(p) => (
                    <div className='flex items-center gap-2 py-1'>
                      <span className='material-symbols-rounded text-[16px] text-gray-400'>print</span>
                      <span className='text-sm'>{p}</span>
                    </div>
                  )}
                  variant='input'
                />
              </div>
            </div>
          </div>
        </section>

        {/* Desktop Version Banner */}
        {isTauri() && (
          <div className='md:col-span-2'>
            <div className={`p-5 bg-${color}-50 dark:bg-${color}-900/20 border border-${color}-100 dark:border-${color}-800/30 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4`}>
              <div className='flex items-center gap-4'>
                <div className={`w-12 h-12 rounded-full bg-${color}-100 dark:bg-${color}-800/50 flex items-center justify-center flex-shrink-0`}>
                  <span className={`material-symbols-rounded text-[24px] text-${color}-600 dark:text-${color}-400`}>
                    desktop_windows
                  </span>
                </div>
                <div>
                  <p className='text-sm font-bold text-gray-800 dark:text-gray-200'>
                    {language === 'AR' ? 'استخدم إعدادات سطح المكتب' : 'Use Desktop Settings'}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md leading-relaxed'>
                    {language === 'AR'
                      ? 'للحصول على أفضل أداء مع الطابعات الحرارية بدون الحاجة لـ QZ Tray، يمكنك استخدام التكامل الأصلي الخاص بنسخة سطح المكتب.'
                      : 'For best performance with thermal printers without needing QZ Tray, use the native integration in the desktop app.'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => onViewChange?.('desktop-settings')}
                className={`w-full md:w-auto px-6 py-2.5 bg-white dark:bg-zinc-800 border border-${color}-200 dark:border-${color}-700 rounded-xl text-sm font-bold text-${color}-600 dark:text-${color}-400 hover:bg-${color}-50 transition-colors shadow-sm`}
              >
                {language === 'AR' ? 'الانتقال لإعدادات سطح المكتب' : 'Go to Desktop Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrowserPrintSettings;
