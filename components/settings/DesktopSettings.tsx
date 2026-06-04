/**
 * DesktopSettings Component
 *
 * Dedicated interface for managing desktop-specific features in the Tauri environment.
 * Includes printer management, auto-updates, and system information.
 */

import React, { useState, useEffect } from 'react';
import { isTauri } from '../../utils/platform';
import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { list_thermal_printers, test_thermal_printer } from 'tauri-plugin-thermal-printer';
import { Switch } from '../common/Switch';
import { SegmentedControl } from '../common/SegmentedControl';
import { FilterDropdown } from '../common/FilterDropdown';

interface DesktopSettingsProps {
  t: Translations;
  language: 'EN' | 'AR';
  color?: string;
}

export const DesktopSettings: React.FC<DesktopSettingsProps> = ({
  t,
  language,
  color = 'primary',
}) => {
  const dt = t.desktop || {};
  const pt = t.printerSettings || {};

  // Printer State
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string | null>(
    localStorage.getItem('desktop_receipt_printer')
  );
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'testing' | 'error'>('idle');

  // Update State
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'up_to_date' | 'error'>('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  // System Info (Mocked for now as we don't have tauri-plugin-os yet)
  const systemInfo = {
    version: '2.0.23',
    os: navigator.platform,
    arch: 'x64',
    memory: '16GB',
  };

  useEffect(() => {
    if (isTauri()) {
      refreshPrinters();
    }
  }, []);

  const refreshPrinters = async () => {
    if (!isTauri()) return;
    setIsLoadingPrinters(true);
    try {
      const list = await list_thermal_printers();
      setPrinters(list?.map(p => p.name) || []);
    } catch (error) {
      console.error('Failed to list printers:', error);
    } finally {
      setIsLoadingPrinters(false);
    }
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter || !isTauri()) return;
    setPrinterStatus('testing');
    try {
      await test_thermal_printer({ 
        printer_info: {
          printer: selectedPrinter,
          sections: [],
          options: { code_page: 0 },
          paper_size: 'Mm80'
        }
      });
      setPrinterStatus('idle');
    } catch (error) {
      console.error('Test print failed:', error);
      setPrinterStatus('error');
    }
  };

  const checkUpdates = async () => {
    if (!isTauri()) return;
    setUpdateStatus('checking');
    try {
      const update = await check();
      if (update) {
        setUpdateStatus('available');
        setUpdateInfo(update);
      } else {
        setUpdateStatus('up_to_date');
      }
    } catch (error) {
      console.error('Update check failed:', error);
      setUpdateStatus('error');
    }
  };

  const installUpdate = async () => {
    if (!updateInfo || !isTauri()) return;
    setUpdateStatus('downloading');
    try {
      await updateInfo.downloadAndInstall();
      await relaunch();
    } catch (error) {
      console.error('Update installation failed:', error);
      setUpdateStatus('error');
    }
  };

  if (!isTauri()) {
    return (
      <div className="p-8 text-center bg-gray-50 dark:bg-zinc-900/40 rounded-2xl border border-dashed border-(--border-divider)">
        <span className="material-symbols-rounded text-[48px] text-gray-300 mb-4">desktop_windows</span>
        <h3 className="text-lg font-bold text-gray-700 dark:text-gray-300">
          {language === 'AR' ? 'متاح فقط في نسخة سطح المكتب' : 'Only available in Desktop version'}
        </h3>
        <p className="text-sm text-gray-500 mt-2">
          {language === 'AR' 
            ? 'يرجى فتح التطبيق من خلال نسخة ويندوز للوصول إلى إعدادات التكامل المتقدمة.'
            : 'Please open the app via Windows version to access advanced integration settings.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
          <span className={`material-symbols-rounded text-[28px] text-${color}-500`}>desktop_windows</span>
          {dt.title}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{dt.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Printer Management */}
        <section className="bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <span className="material-symbols-rounded text-[18px]">print</span>
              {dt.printer}
            </h3>
            <button 
              onClick={refreshPrinters}
              disabled={isLoadingPrinters}
              className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-gray-400"
            >
              <span className={`material-symbols-rounded text-[18px] ${isLoadingPrinters ? 'animate-spin' : ''}`}>refresh</span>
            </button>
          </div>

          <div className="space-y-4">
            <div className="relative">
              <FilterDropdown<string>
                items={printers}
                selectedItem={selectedPrinter || undefined}
                onSelect={(p) => {
                  setSelectedPrinter(p);
                  localStorage.setItem('desktop_receipt_printer', p);
                }}
                keyExtractor={(p) => p}
                renderSelected={(p) => (
                  <span className="text-sm font-medium">{p || pt.selectPrinter}</span>
                )}
                renderItem={(p) => <span className="text-sm">{p}</span>}
                variant="input"
              />
            </div>

            <button
              onClick={handleTestPrint}
              disabled={!selectedPrinter || printerStatus === 'testing'}
              className={`w-full py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                printerStatus === 'testing'
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 hover:bg-${color}-100`
              }`}
            >
              <span className={`material-symbols-rounded text-[18px] ${printerStatus === 'testing' ? 'animate-spin' : ''}`}>
                {printerStatus === 'testing' ? 'sync' : 'science'}
              </span>
              {pt.testPrintReceipt}
            </button>
          </div>
        </section>

        {/* Updates Management */}
        <section className="bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-2xl p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-rounded text-[18px]">system_update</span>
            {dt.autoUpdate}
          </h3>

          <div className="flex flex-col h-[calc(100%-2rem)] justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{dt.version}</span>
                <span className="text-xs font-bold bg-white dark:bg-zinc-800 px-2 py-1 rounded-lg border border-(--border-divider)">
                  v{systemInfo.version}
                </span>
              </div>

              {updateStatus === 'available' && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl animate-pulse">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">{dt.updateAvailable}</p>
                </div>
              )}
            </div>

            <div className="pt-4">
              {updateStatus === 'available' ? (
                <button
                  onClick={installUpdate}
                  disabled={updateStatus === 'downloading'}
                  className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                >
                  <span className="material-symbols-rounded text-[18px]">download</span>
                  {updateStatus === 'downloading' ? dt.downloading : dt.installNow}
                </button>
              ) : (
                <button
                  onClick={checkUpdates}
                  disabled={updateStatus === 'checking'}
                  className="w-full py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                >
                  <span className={`material-symbols-rounded text-[18px] ${updateStatus === 'checking' ? 'animate-spin' : ''}`}>
                    {updateStatus === 'checking' ? 'sync' : 'update'}
                  </span>
                  {dt.checkUpdates}
                </button>
              )}
            </div>
          </div>
        </section>

        {/* System Info */}
        <section className="bg-white dark:bg-zinc-900 border border-(--border-divider) rounded-2xl p-6 space-y-4 shadow-sm md:col-span-2">
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-rounded text-[18px]">info</span>
            {dt.systemInfo}
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: dt.os, value: systemInfo.os, icon: 'grid_view' },
              { label: dt.arch, value: systemInfo.arch, icon: 'memory' },
              { label: dt.memory, value: systemInfo.memory, icon: 'rebase_edit' },
              { label: dt.version, value: `v${systemInfo.version}`, icon: 'new_releases' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-gray-50 dark:bg-zinc-800/50 rounded-2xl border border-transparent hover:border-(--border-divider) transition-all group">
                <span className={`material-symbols-rounded text-[20px] text-gray-400 group-hover:text-${color}-500 transition-colors mb-2 block`}>
                  {item.icon}
                </span>
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter">{item.label}</p>
                <p className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default DesktopSettings;
