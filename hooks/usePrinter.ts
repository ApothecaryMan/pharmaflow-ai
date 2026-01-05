/**
 * usePrinter Hook
 * 
 * React hook for managing QZ Tray printer integration.
 * Provides printer status, connection management, and print functions.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  PrinterStatus,
  PrinterSettings,
  SilentMode,
  connect,
  disconnect,
  isConnected,
  getStatus,
  getPrinters,
  getDefaultPrinter,
  getPrinterSettings,
  savePrinterSettings,
  printLabelSilently,
  printReceiptSilently,
  loadQzTray
} from '../utils/qzPrinter';

export interface UsePrinterResult {
  // Connection status
  status: PrinterStatus;
  isConnecting: boolean;
  
  // Connection actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  
  // Printer list
  printers: string[];
  isLoadingPrinters: boolean;
  refreshPrinters: () => Promise<void>;
  
  // Settings
  settings: PrinterSettings;
  updateSettings: (updates: Partial<PrinterSettings>) => void;
  
  // Print functions
  printLabel: (html: string, size: { width: number; height: number }) => Promise<boolean>;
  printReceipt: (html: string) => Promise<boolean>;
  
  // Test print
  testPrintLabel: () => Promise<void>;
  testPrintReceipt: () => Promise<void>;
}

// Default settings fallback
const DEFAULT_SETTINGS: PrinterSettings = {
  enabled: false,
  labelPrinter: null,
  receiptPrinter: null,
  silentMode: 'fallback' as SilentMode
};

/**
 * Hook for managing printer integration
 */
export const usePrinter = (): UsePrinterResult => {
  const [status, setStatus] = useState<PrinterStatus>('disconnected');
  const [isConnecting, setIsConnecting] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [isLoadingPrinters, setIsLoadingPrinters] = useState(false);
  const [settings, setSettings] = useState<PrinterSettings>(DEFAULT_SETTINGS);
  
  // Track if mounted
  const isMounted = useRef(true);
  
  // Load settings on mount
  useEffect(() => {
    const savedSettings = getPrinterSettings();
    setSettings(savedSettings);
    
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Auto-connect if enabled
  useEffect(() => {
    if (settings.enabled) {
      handleConnect();
    }
  }, [settings.enabled]);
  
  // Periodic status check
  useEffect(() => {
    const checkStatus = () => {
      if (isMounted.current) {
        setStatus(getStatus());
      }
    };
    
    // Check immediately
    checkStatus();
    
    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
  /**
   * Connect to QZ Tray
   */
  const handleConnect = useCallback(async () => {
    if (isConnecting || isConnected()) return;
    
    setIsConnecting(true);
    setStatus('connecting');
    
    try {
      await loadQzTray();
      await connect();
      
      if (isMounted.current) {
        setStatus('connected');
        // Refresh printer list on connect
        await handleRefreshPrinters();
      }
    } catch (err) {
      console.error('Failed to connect to QZ Tray:', err);
      if (isMounted.current) {
        setStatus('not_installed');
      }
    } finally {
      if (isMounted.current) {
        setIsConnecting(false);
      }
    }
  }, [isConnecting]);
  
  /**
   * Disconnect from QZ Tray
   */
  const handleDisconnect = useCallback(async () => {
    try {
      await disconnect();
      if (isMounted.current) {
        setStatus('disconnected');
      }
    } catch (err) {
      console.error('Failed to disconnect from QZ Tray:', err);
    }
  }, []);
  
  /**
   * Refresh the list of available printers
   */
  const handleRefreshPrinters = useCallback(async () => {
    if (isLoadingPrinters) return;
    
    setIsLoadingPrinters(true);
    
    try {
      if (!isConnected()) {
        await connect();
      }
      
      const printerList = await getPrinters();
      
      if (isMounted.current) {
        setPrinters(printerList);
        
        // Auto-select default printer if none selected
        if (printerList.length > 0) {
          const current = getPrinterSettings();
          let needsUpdate = false;
          const updates: Partial<PrinterSettings> = {};
          
          if (!current.labelPrinter || !printerList.includes(current.labelPrinter)) {
            const defaultPrinter = await getDefaultPrinter();
            updates.labelPrinter = defaultPrinter || printerList[0];
            needsUpdate = true;
          }
          
          if (!current.receiptPrinter || !printerList.includes(current.receiptPrinter)) {
            const defaultPrinter = await getDefaultPrinter();
            updates.receiptPrinter = defaultPrinter || printerList[0];
            needsUpdate = true;
          }
          
          if (needsUpdate) {
            handleUpdateSettings(updates);
          }
        }
      }
    } catch (err) {
      console.error('Failed to get printers:', err);
      if (isMounted.current) {
        setPrinters([]);
      }
    } finally {
      if (isMounted.current) {
        setIsLoadingPrinters(false);
      }
    }
  }, [isLoadingPrinters]);
  
  /**
   * Update printer settings
   */
  const handleUpdateSettings = useCallback((updates: Partial<PrinterSettings>) => {
    const updated = savePrinterSettings(updates);
    setSettings(updated);
  }, []);
  
  /**
   * Print label (with fallback to browser)
   * @returns true if printed via QZ, false if should use browser fallback
   */
  const handlePrintLabel = useCallback(async (
    html: string,
    size: { width: number; height: number }
  ): Promise<boolean> => {
    return await printLabelSilently(html, size);
  }, []);
  
  /**
   * Print receipt (with fallback to browser)
   * @returns true if printed via QZ, false if should use browser fallback
   */
  const handlePrintReceipt = useCallback(async (html: string): Promise<boolean> => {
    return await printReceiptSilently(html);
  }, []);
  
  /**
   * Test print a sample label
   */
  const handleTestPrintLabel = useCallback(async () => {
    const testHtml = `
      <div style="width: 38mm; height: 12mm; font-family: sans-serif; padding: 2mm;">
        <div style="font-size: 8px; font-weight: bold;">PharmaFlow Test</div>
        <div style="font-size: 6px;">Label Printer OK ✓</div>
        <div style="font-size: 5px; color: gray;">${new Date().toLocaleString()}</div>
      </div>
    `;
    
    await printLabelSilently(testHtml, { width: 38, height: 12 });
  }, []);
  
  /**
   * Test print a sample receipt
   */
  const handleTestPrintReceipt = useCallback(async () => {
    const testHtml = `
      <div style="width: 72mm; font-family: monospace; padding: 4mm;">
        <div style="text-align: center; font-size: 14px; font-weight: bold;">PharmaFlow</div>
        <div style="text-align: center; font-size: 10px; margin-bottom: 8px;">Receipt Printer Test</div>
        <hr style="border: 1px dashed #000;" />
        <div style="font-size: 10px; margin: 4px 0;">
          <div>Status: Connected ✓</div>
          <div>Date: ${new Date().toLocaleString()}</div>
        </div>
        <hr style="border: 1px dashed #000;" />
        <div style="text-align: center; font-size: 8px; color: gray; margin-top: 8px;">
          This is a test print
        </div>
      </div>
    `;
    
    await printReceiptSilently(testHtml);
  }, []);
  
  return {
    status,
    isConnecting,
    connect: handleConnect,
    disconnect: handleDisconnect,
    printers,
    isLoadingPrinters,
    refreshPrinters: handleRefreshPrinters,
    settings,
    updateSettings: handleUpdateSettings,
    printLabel: handlePrintLabel,
    printReceipt: handlePrintReceipt,
    testPrintLabel: handleTestPrintLabel,
    testPrintReceipt: handleTestPrintReceipt
  };
};

export default usePrinter;
