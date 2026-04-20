import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePrinter } from './usePrinter';
import * as qzPrinterUtils from '../utils/qzPrinter';

// Clean mock setup using vi.mock with factory that returns spies
vi.mock('../utils/qzPrinter', () => {
  return {
    getStatus: vi.fn(),
    isConnected: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getPrinters: vi.fn(),
    getPrinterSettings: vi.fn().mockReturnValue({ 
        enabled: false, 
        labelPrinter: null, 
        receiptPrinter: null, 
        silentMode: 'fallback' 
    }),
    savePrinterSettings: vi.fn(),
    loadQzTray: vi.fn(),
    printLabelSilently: vi.fn(),
    printReceiptSilently: vi.fn(),
    getDefaultPrinter: vi.fn()
  };
});

describe('usePrinter Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (qzPrinterUtils.getPrinterSettings as any).mockImplementation(() => ({ 
        enabled: false, 
        labelPrinter: null, 
        receiptPrinter: null, 
        silentMode: 'fallback' 
    }));
    (qzPrinterUtils.getStatus as any).mockReturnValue('disconnected');
    (qzPrinterUtils.isConnected as any).mockReturnValue(false); 
    (qzPrinterUtils.getPrinters as any).mockResolvedValue(['Printer1']);
  });

  it('should initialize with disconnected status', () => {
    const { result } = renderHook(() => usePrinter());
    expect(result.current.status).toBe('disconnected');
  });

  it.skip('connect should call util connect', async () => {
    (qzPrinterUtils.connect as any).mockResolvedValue(undefined);
    
    const { result } = renderHook(() => usePrinter());
    
    await act(async () => {
      await result.current.connect();
    });
    
    expect(qzPrinterUtils.connect).toHaveBeenCalled();
  });

  it.skip('auto-connects if enabled in settings', async () => {
    (qzPrinterUtils.getPrinterSettings as any).mockReturnValue({ 
        enabled: true, 
        labelPrinter: null, 
        receiptPrinter: null, 
        silentMode: 'fallback'
    });
    
    renderHook(() => usePrinter());
    
    await waitFor(() => {
        expect(qzPrinterUtils.connect).toHaveBeenCalled();
    });
  });

  it('updates settings', () => {
    const { result } = renderHook(() => usePrinter());
    const newSettings = { enabled: true };
    (qzPrinterUtils.savePrinterSettings as any).mockReturnValue(newSettings);
    
    act(() => {
        result.current.updateSettings(newSettings); // This calls savePrinterSettings
    });
    
    expect(qzPrinterUtils.savePrinterSettings).toHaveBeenCalledWith(newSettings);
  });
});
