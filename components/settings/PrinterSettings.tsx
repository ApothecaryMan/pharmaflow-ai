/**
 * PrinterSettings Component
 * 
 * Full-featured settings panel for QZ Tray printer configuration.
 * Allows users to select printers for labels and receipts,
 * configure silent printing mode, and test print.
 */

import React, { useEffect, useState } from 'react';
import { Modal } from '../common/Modal';
import { SegmentedControl } from '../common/SegmentedControl';
import { Switch } from '../common/Switch';
import { ExpandingDropdown } from '../common/ExpandingDropdown';
import { usePrinter } from '../../hooks/usePrinter';
import { SilentMode } from '../../utils/qzPrinter';

interface PrinterSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  color?: string;
  t: any;
  language: 'EN' | 'AR';
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({
  isOpen,
  onClose,
  color = 'emerald',
  t,
  language
}) => {
  const {
    status,
    isConnecting,
    connect,
    disconnect,
    printers,
    isLoadingPrinters,
    refreshPrinters,
    settings,
    updateSettings,
    testPrintLabel,
    testPrintReceipt
  } = usePrinter();

  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  const [receiptDropdownOpen, setReceiptDropdownOpen] = useState(false);
  const [testingLabel, setTestingLabel] = useState(false);
  const [testingReceipt, setTestingReceipt] = useState(false);

  // Refresh printers when modal opens and QZ is connected
  useEffect(() => {
    if (isOpen && status === 'connected') {
      refreshPrinters();
    }
  }, [isOpen, status]);

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
      connected: { color: 'bg-emerald-500', text: t.printerSettings?.status?.connected || 'Connected', icon: 'check_circle' },
      disconnected: { color: 'bg-gray-400', text: t.printerSettings?.status?.disconnected || 'Disconnected', icon: 'cancel' },
      connecting: { color: 'bg-amber-500', text: t.printerSettings?.status?.connecting || 'Connecting...', icon: 'sync' },
      not_installed: { color: 'bg-red-500', text: t.printerSettings?.status?.notInstalled || 'Not Installed', icon: 'error' }
    };

    const config = statusConfig[status];

    return (
      <div className="flex items-center gap-2">
        <span className={`w-2.5 h-2.5 rounded-full ${config.color} ${status === 'connecting' ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{config.text}</span>
      </div>
    );
  };

  // Translations fallback
  const pt = t.printerSettings || {};

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="lg"
      title={pt.title || 'Printer Settings'}
      subtitle={pt.subtitle || 'Configure silent printing with QZ Tray'}
      icon="print"
    >
      <div className="space-y-6">
        {/* Connection Section */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-4">
          <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-3 block">
            {pt.connection || 'Connection'}
          </label>

          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {pt.enabled || 'QZ Tray Enabled'}
              </span>
            </div>
            <Switch
              checked={settings.enabled}
              onChange={(checked) => updateSettings({ enabled: checked })}
              theme={color}
            />
          </div>

            <div className="flex items-center justify-between">
              <StatusBadge />
              <div className="flex items-center gap-2">
                {status === 'disconnected' && settings.enabled && (
                  <button
                    onClick={connect}
                    disabled={isConnecting}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 hover:bg-${color}-200 dark:hover:bg-${color}-900/50`}
                  >
                    {pt.reconnect || 'Reconnect'}
                  </button>
                )}
                {status === 'not_installed' && (
                  <a
                    href="https://qz.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 text-sm font-medium rounded-lg transition-colors bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 hover:bg-blue-200 flex items-center gap-1"
                  >
                    <span className="material-symbols-rounded text-[16px]">download</span>
                    {pt.download || 'Download QZ Tray'}
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Printers Section - Only show if connected */}
          {status === 'connected' && (
            <>
              {/* Label Printer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[18px]">label</span>
                    {pt.labelPrinter || 'Label Printer'}
                  </label>
                  <button
                    onClick={handleTestLabel}
                    disabled={testingLabel || !settings.labelPrinter}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                      settings.labelPrinter
                        ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 hover:bg-${color}-100`
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {testingLabel ? (
                      <span className="material-symbols-rounded text-[14px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-rounded text-[14px]">science</span>
                    )}
                    {pt.testPrintLabel || 'Test'}
                  </button>
                </div>
                <div className="relative h-10">
                  <ExpandingDropdown<string>
                    items={printers}
                    selectedItem={settings.labelPrinter || undefined}
                    isOpen={labelDropdownOpen}
                    onToggle={() => setLabelDropdownOpen(!labelDropdownOpen)}
                    onSelect={(printer) => {
                      updateSettings({ labelPrinter: printer });
                      setLabelDropdownOpen(false);
                    }}
                    keyExtractor={(p) => p}
                    renderSelected={(p) => (
                      <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {p || pt.selectPrinter || 'Select Printer...'}
                      </span>
                    )}
                    renderItem={(p, isSelected) => (
                      <div className="flex items-center gap-2 py-1">
                        <span className="material-symbols-rounded text-[16px] text-gray-400">print</span>
                        <span className={`text-sm ${isSelected ? 'font-bold text-blue-600' : ''}`}>{p}</span>
                      </div>
                    )}
                    minHeight={38}
                    variant="input"
                    className="absolute top-0 left-0 w-full z-20"
                  />
                </div>
              </div>

              {/* Receipt Printer */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <span className="material-symbols-rounded text-[18px]">receipt_long</span>
                    {pt.receiptPrinter || 'Receipt Printer'}
                  </label>
                  <button
                    onClick={handleTestReceipt}
                    disabled={testingReceipt || !settings.receiptPrinter}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors flex items-center gap-1 ${
                      settings.receiptPrinter
                        ? `bg-${color}-50 dark:bg-${color}-900/20 text-${color}-600 hover:bg-${color}-100`
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {testingReceipt ? (
                      <span className="material-symbols-rounded text-[14px] animate-spin">sync</span>
                    ) : (
                      <span className="material-symbols-rounded text-[14px]">science</span>
                    )}
                    {pt.testPrintReceipt || 'Test'}
                  </button>
                </div>
                <div className="relative h-10">
                  <ExpandingDropdown<string>
                    items={printers}
                    selectedItem={settings.receiptPrinter || undefined}
                    isOpen={receiptDropdownOpen}
                    onToggle={() => setReceiptDropdownOpen(!receiptDropdownOpen)}
                    onSelect={(printer) => {
                      updateSettings({ receiptPrinter: printer });
                      setReceiptDropdownOpen(false);
                    }}
                    keyExtractor={(p) => p}
                    renderSelected={(p) => (
                      <span className="text-sm font-medium text-gray-800 dark:text-white truncate">
                        {p || pt.selectPrinter || 'Select Printer...'}
                      </span>
                    )}
                    renderItem={(p, isSelected) => (
                      <div className="flex items-center gap-2 py-1">
                        <span className="material-symbols-rounded text-[16px] text-gray-400">print</span>
                        <span className={`text-sm ${isSelected ? 'font-bold text-blue-600' : ''}`}>{p}</span>
                      </div>
                    )}
                    minHeight={38}
                    variant="input"
                    className="absolute top-0 left-0 w-full z-10"
                  />
                </div>
              </div>

              {/* Refresh Printers */}
              <button
                onClick={refreshPrinters}
                disabled={isLoadingPrinters}
                className="w-full py-2 text-sm font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center justify-center gap-2 transition-colors"
              >
                <span className={`material-symbols-rounded text-[18px] ${isLoadingPrinters ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {pt.refreshList || 'Refresh Printer List'}
              </button>
            </>
          )}

          {/* Silent Mode Section */}
          {settings.enabled && (
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                {pt.silentMode || 'Silent Mode'}
              </label>
              <SegmentedControl<SilentMode>
                value={settings.silentMode}
                onChange={(mode) => updateSettings({ silentMode: mode })}
                color={color}
                size="sm"
                options={[
                  { label: pt.silentModes?.on || 'ON', value: 'on' },
                  { label: pt.silentModes?.fallback || 'FALLBACK', value: 'fallback' },
                  { label: pt.silentModes?.off || 'OFF', value: 'off' }
                ]}
              />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {settings.silentMode === 'on' && (pt.silentHints?.on || 'Always print silently (requires QZ Tray)')}
                {settings.silentMode === 'off' && (pt.silentHints?.off || 'Always show print dialog')}
                {settings.silentMode === 'fallback' && (pt.silentHints?.fallback || 'Silent if QZ available, dialog otherwise')}
              </p>
            </div>
          )}

          {/* Not Installed Message */}
          {status === 'not_installed' && settings.enabled && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="material-symbols-rounded text-amber-500 text-[24px]">warning</span>
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {pt.alerts?.notInstalled || 'QZ Tray is not installed'}
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-300 mt-1">
                    {language === 'AR' 
                      ? 'يرجى تحميل وتثبيت QZ Tray للطباعة الصامتة' 
                      : 'Please download and install QZ Tray for silent printing'}
                  </p>
                </div>
              </div>
            </div>
          )}
      </div>
    </Modal>
  );
};

export default PrinterSettings;
