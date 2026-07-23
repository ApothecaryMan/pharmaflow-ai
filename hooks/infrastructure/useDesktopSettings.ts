import { invoke } from '@tauri-apps/api/core';
import { arch, type as osType, version as osVersion } from '@tauri-apps/plugin-os';
import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';
import { useCallback, useEffect, useRef, useState } from 'react';
import { list_thermal_printers, test_thermal_printer } from 'tauri-plugin-thermal-printer';
import { printerService } from '../../services/infrastructure/printerService';
import { isTauri } from '../../utils/platform';

export type PrinterInterface = 'auto' | 'tauri' | 'qz';

export interface SystemInfo {
  os: string;
  osVersion: string;
  arch: string;
  memory: string;
  version: string;
}

export interface UseDesktopSettingsResult {
  printers: string[];
  isLoadingPrinters: boolean;
  refreshPrinters: () => Promise<void>;
  selectedReceiptPrinter: string | null;
  selectedLabelPrinter: string | null;
  setReceiptPrinter: (name: string) => void;
  setLabelPrinter: (name: string) => void;
  printerStatus: 'idle' | 'testing' | 'error';
  testPrint: () => Promise<void>;
  preferredInterface: PrinterInterface;
  setPreferredInterface: (val: PrinterInterface) => void;
  systemInfo: SystemInfo | null;
  isLoadingSystemInfo: boolean;
  updateStatus: 'idle' | 'checking' | 'available' | 'downloading' | 'up_to_date' | 'error';
  updateInfo: any;
  checkUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
}

function formatMemory(mb: number): string {
  if (mb < 1024) return `${mb.toFixed(0)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function loadReceiptPrinter(): string | null {
  return localStorage.getItem('desktop_receipt_printer');
}

function loadLabelPrinter(): string | null {
  return localStorage.getItem('desktop_label_printer');
}

function loadPreferredInterface(): PrinterInterface {
  const stored = localStorage.getItem('preferred_printer_interface');
  if (stored === 'tauri' || stored === 'qz') return stored;
  return 'auto';
}

export const useDesktopSettings = (): UseDesktopSettingsResult => {
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [selectedReceiptPrinter, setSelectedReceiptPrinter] = useState<string | null>(
    loadReceiptPrinter()
  );
  const [selectedLabelPrinter, setSelectedLabelPrinter] = useState<string | null>(
    loadLabelPrinter()
  );
  const [printerStatus, setPrinterStatus] = useState<'idle' | 'testing' | 'error'>('idle');
  const [preferredInterface, setPreferredInterfaceState] = useState<PrinterInterface>(
    loadPreferredInterface()
  );
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [isLoadingSystemInfo, setIsLoadingSystemInfo] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<
    'idle' | 'checking' | 'available' | 'downloading' | 'up_to_date' | 'error'
  >('idle');
  const [updateInfo, setUpdateInfo] = useState<any>(null);

  const isLoadingRef = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSetReceiptPrinter = useCallback((name: string) => {
    setSelectedReceiptPrinter(name);
    localStorage.setItem('desktop_receipt_printer', name);
  }, []);

  const handleSetLabelPrinter = useCallback((name: string) => {
    setSelectedLabelPrinter(name);
    localStorage.setItem('desktop_label_printer', name);
  }, []);

  const handleSetPreferredInterface = useCallback((val: PrinterInterface) => {
    setPreferredInterfaceState(val);
    localStorage.setItem('preferred_printer_interface', val);
    printerService.setPreferredInterface(val);
  }, []);

  const handleRefreshPrinters = useCallback(async () => {
    if (!isTauri() || isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsLoadingPrinters(true);
    try {
      const list = await list_thermal_printers();
      if (isMounted.current) {
        setPrinters(list?.map((p) => p.name) || []);
      }
    } catch {
      if (isMounted.current) {
        setPrinters([]);
      }
    } finally {
      if (isMounted.current) {
        isLoadingRef.current = false;
        setIsLoadingPrinters(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isTauri()) {
      handleRefreshPrinters();
    }
  }, [handleRefreshPrinters]);

  const handleTestPrint = useCallback(async () => {
    if (!selectedReceiptPrinter || !isTauri()) return;
    setPrinterStatus('testing');
    try {
      await test_thermal_printer({
        printer_info: {
          printer: selectedReceiptPrinter,
          sections: [],
          options: { code_page: 0 },
          paper_size: 'Mm80',
        },
      });
      if (isMounted.current) {
        setPrinterStatus('idle');
      }
    } catch {
      if (isMounted.current) {
        setPrinterStatus('error');
      }
    }
  }, [selectedReceiptPrinter]);

  const loadSystemInfo = useCallback(async () => {
    if (!isTauri()) return;
    setIsLoadingSystemInfo(true);
    try {
      const [osName, osVer, archName, memoryBytes, appVersion] = await Promise.all([
        osType(),
        osVersion(),
        arch(),
        invoke<number>('get_system_memory'),
        invoke<string>('get_app_version'),
      ]);
      if (isMounted.current) {
        const memoryMb = Math.round(memoryBytes / (1024 * 1024));
        setSystemInfo({
          os: osName.charAt(0).toUpperCase() + osName.slice(1),
          osVersion: osVer,
          arch: archName,
          memory: formatMemory(memoryMb),
          version: appVersion,
        });
      }
    } catch {
      if (isMounted.current) {
        setSystemInfo(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingSystemInfo(false);
      }
    }
  }, []);

  useEffect(() => {
    loadSystemInfo();
  }, [loadSystemInfo]);

  const handleCheckUpdates = useCallback(async () => {
    if (!isTauri()) return;
    setUpdateStatus('checking');
    try {
      const update = await check();
      if (isMounted.current) {
        if (update) {
          setUpdateStatus('available');
          setUpdateInfo(update);
        } else {
          setUpdateStatus('up_to_date');
        }
      }
    } catch {
      if (isMounted.current) {
        setUpdateStatus('error');
      }
    }
  }, []);

  const handleInstallUpdate = useCallback(async () => {
    if (!updateInfo || !isTauri()) return;
    setUpdateStatus('downloading');
    try {
      await updateInfo.downloadAndInstall();
      await relaunch();
    } catch {
      if (isMounted.current) {
        setUpdateStatus('error');
      }
    }
  }, [updateInfo]);

  return {
    printers,
    isLoadingPrinters,
    refreshPrinters: handleRefreshPrinters,
    selectedReceiptPrinter,
    selectedLabelPrinter,
    setReceiptPrinter: handleSetReceiptPrinter,
    setLabelPrinter: handleSetLabelPrinter,
    printerStatus,
    testPrint: handleTestPrint,
    preferredInterface,
    setPreferredInterface: handleSetPreferredInterface,
    systemInfo,
    isLoadingSystemInfo,
    updateStatus,
    updateInfo,
    checkUpdates: handleCheckUpdates,
    installUpdate: handleInstallUpdate,
  };
};

export default useDesktopSettings;
