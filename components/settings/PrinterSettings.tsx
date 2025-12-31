/**
 * PrinterSettings - Printer Management UI Component
 * 
 * Allows users to detect, configure, and test USB printers via WebUSB.
 * Printers can be assigned for barcode or receipt printing.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    PrinterDevice,
    isWebUSBSupported,
    requestPrinter,
    getGrantedPrinters,
    loadPrinterSettings,
    savePrinterSettings,
    loadSavedPrinters,
    removeSavedPrinter,
    printTestPage,
    connectPrinter,
    PrinterType
} from '../../services/PrinterService';
import { TRANSLATIONS } from '../../i18n/translations';

interface PrinterSettingsProps {
    color: string;
    language: 'EN' | 'AR';
}

export const PrinterSettings: React.FC<PrinterSettingsProps> = ({ color, language }) => {
    const t = TRANSLATIONS[language].printerSettings;
    
    // State
    const [printers, setPrinters] = useState<PrinterDevice[]>([]);
    const [barcodePrinterId, setBarcodePrinterId] = useState<string | null>(null);
    const [receiptPrinterId, setReceiptPrinterId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [testingPrinter, setTestingPrinter] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load saved printers and settings on mount
    useEffect(() => {
        const loadData = async () => {
            // Load saved printer IDs
            const settings = loadPrinterSettings();
            setBarcodePrinterId(settings.barcodePrinter?.id || null);
            setReceiptPrinterId(settings.receiptPrinter?.id || null);

            // Load saved printers and try to reconnect to granted ones
            const saved = loadSavedPrinters();
            const granted = await getGrantedPrinters();
            
            // Merge: use granted devices (have USBDevice), fill in names from saved
            const merged = saved.map(s => {
                const g = granted.find(gp => gp.id === s.id);
                return g ? { ...s, ...g, connected: g.connected } : { ...s, connected: false };
            });
            
            // Add any granted devices not in saved
            granted.forEach(g => {
                if (!merged.find(m => m.id === g.id)) {
                    merged.push(g);
                }
            });
            
            setPrinters(merged);
        };

        loadData();
    }, []);

    // Show temporary message
    const showMessage = useCallback((type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    }, []);

    // Handle detecting new printer
    const handleDetectPrinter = async () => {
        if (!isWebUSBSupported()) {
            showMessage('error', t.webUSBNotSupported);
            return;
        }

        setLoading(true);
        try {
            const printer = await requestPrinter();
            if (printer) {
                // Add to list if not already present
                setPrinters(prev => {
                    if (prev.find(p => p.id === printer.id)) {
                        return prev.map(p => p.id === printer.id ? printer : p);
                    }
                    return [...prev, printer];
                });
            }
        } catch (error: any) {
            if (error.name !== 'NotFoundError') {
                showMessage('error', error.message || t.permissionDenied);
            }
        } finally {
            setLoading(false);
        }
    };

    // Handle test print
    const handleTestPrint = async (printer: PrinterDevice) => {
        setTestingPrinter(printer.id);
        try {
            // Get fresh reference from granted devices
            const granted = await getGrantedPrinters();
            const freshPrinter = granted.find(p => p.id === printer.id);
            
            if (!freshPrinter) {
                showMessage('error', 'Printer not available. Please re-add it.');
                return;
            }
            
            await connectPrinter(freshPrinter);
            await printTestPage(freshPrinter);
            showMessage('success', t.printTestSuccess);
            
            // Update connection status
            setPrinters(prev => prev.map(p => 
                p.id === printer.id ? { ...p, connected: true } : p
            ));
        } catch (error: any) {
            showMessage('error', `${t.printTestFailed}: ${error.message}`);
        } finally {
            setTestingPrinter(null);
        }
    };

    // Handle remove printer
    const handleRemovePrinter = (printerId: string) => {
        removeSavedPrinter(printerId);
        setPrinters(prev => prev.filter(p => p.id !== printerId));
        
        if (barcodePrinterId === printerId) setBarcodePrinterId(null);
        if (receiptPrinterId === printerId) setReceiptPrinterId(null);
    };

    // Handle assignment change
    const handleAssign = (type: PrinterType, printerId: string | null) => {
        const printer = printerId ? printers.find(p => p.id === printerId) || null : null;
        const settings = loadPrinterSettings();
        
        if (type === 'barcode') {
            settings.barcodePrinter = printer;
            setBarcodePrinterId(printerId);
        } else {
            settings.receiptPrinter = printer;
            setReceiptPrinterId(printerId);
        }
        
        savePrinterSettings(settings);
        showMessage('success', t.settingsSaved);
    };

    const isRTL = language === 'AR';

    return (
        <div className="p-6 max-w-4xl mx-auto" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                    <span className="material-symbols-rounded text-3xl" style={{ color: `var(--color-${color})` }}>
                        print
                    </span>
                    {t.title}
                </h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t.subtitle}</p>
            </div>

            {/* WebUSB Support Warning */}
            {!isWebUSBSupported() && (
                <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                    <p className="text-yellow-700 dark:text-yellow-400 text-sm flex items-center gap-2">
                        <span className="material-symbols-rounded">warning</span>
                        {t.webUSBNotSupported}
                    </p>
                </div>
            )}

            {/* Message Toast */}
            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm flex items-center gap-2 ${
                    message.type === 'success' 
                        ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
                }`}>
                    <span className="material-symbols-rounded text-lg">
                        {message.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {message.text}
                </div>
            )}

            {/* Detect Printer Button */}
            <button
                onClick={handleDetectPrinter}
                disabled={loading || !isWebUSBSupported()}
                className={`mb-6 flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all
                    ${loading 
                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-wait'
                        : `bg-${color}-500 hover:bg-${color}-600 text-white shadow-lg shadow-${color}-500/25`
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                `}
                style={{ 
                    backgroundColor: loading ? undefined : `var(--color-${color})`,
                    boxShadow: loading ? undefined : `0 10px 25px -5px var(--color-${color}40)`
                }}
            >
                <span className={`material-symbols-rounded ${loading ? 'animate-spin' : ''}`}>
                    {loading ? 'sync' : 'add_circle'}
                </span>
                {loading ? t.connecting : t.detectPrinter}
            </button>

            {/* Connected Printers List */}
            <div className="mb-8">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-gray-400">devices</span>
                    {t.connectedPrinters}
                </h2>

                {printers.length === 0 ? (
                    <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                        <span className="material-symbols-rounded text-4xl text-gray-300 dark:text-gray-600 mb-2">print_disabled</span>
                        <p className="text-gray-500 dark:text-gray-400">{t.noPrinters}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {printers.map(printer => (
                            <div 
                                key={printer.id}
                                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                        printer.connected 
                                            ? 'bg-green-100 dark:bg-green-900/30' 
                                            : 'bg-gray-100 dark:bg-gray-700'
                                    }`}>
                                        <span className={`material-symbols-rounded ${
                                            printer.connected 
                                                ? 'text-green-600 dark:text-green-400' 
                                                : 'text-gray-400'
                                        }`}>print</span>
                                    </div>
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{printer.name}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                            {t.vendorId}: {printer.vendorId.toString(16).toUpperCase()} | {t.productId}: {printer.productId.toString(16).toUpperCase()}
                                        </p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-2">
                                    {/* Connection Status */}
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                        printer.connected 
                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                                    }`}>
                                        {printer.connected ? t.connected : t.disconnected}
                                    </span>
                                    
                                    {/* Test Button */}
                                    <button
                                        onClick={() => handleTestPrint(printer)}
                                        disabled={testingPrinter === printer.id}
                                        className="px-3 py-1.5 text-sm rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors disabled:opacity-50"
                                    >
                                        {testingPrinter === printer.id ? (
                                            <span className="material-symbols-rounded animate-spin text-sm">sync</span>
                                        ) : t.testPrint}
                                    </button>
                                    
                                    {/* Remove Button */}
                                    <button
                                        onClick={() => handleRemovePrinter(printer.id)}
                                        className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                        title={t.remove}
                                    >
                                        <span className="material-symbols-rounded text-lg">delete</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Printer Assignments */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Barcode Printer */}
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <span className="material-symbols-rounded text-purple-500">qr_code_2</span>
                        {t.barcodePrinter}
                    </h3>
                    <select
                        value={barcodePrinterId || ''}
                        onChange={(e) => handleAssign('barcode', e.target.value || null)}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                        <option value="">{t.notAssigned}</option>
                        {printers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                {/* Receipt Printer */}
                <div className="p-5 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3 flex items-center gap-2">
                        <span className="material-symbols-rounded text-orange-500">receipt_long</span>
                        {t.receiptPrinter}
                    </h3>
                    <select
                        value={receiptPrinterId || ''}
                        onChange={(e) => handleAssign('receipt', e.target.value || null)}
                        className="w-full p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    >
                        <option value="">{t.notAssigned}</option>
                        {printers.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Info Note */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-blue-700 dark:text-blue-400 text-sm flex items-start gap-2">
                    <span className="material-symbols-rounded mt-0.5">info</span>
                    <span>
                        {language === 'AR' 
                            ? 'عند اكتشاف طابعة جديدة، سيطلب المتصفح إذنك للاتصال بها. بعد الموافقة، ستتم جميع عمليات الطباعة بشكل صامت بدون نوافذ.'
                            : 'When detecting a new printer, the browser will ask for permission to connect. After approval, all printing will be silent without dialogs.'
                        }
                    </span>
                </p>
            </div>
        </div>
    );
};
