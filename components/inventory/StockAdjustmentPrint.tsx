import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { StockMovement } from '../../services/inventory/stockMovement/types';
import { getDisplayName } from '../../utils/drugDisplayName';

interface StockAdjustmentPrintProps {
    isRTL: boolean;
    t: any;
    pharmacyName: string;
    activeView: 'adjust' | 'history';
    data: StockMovement[];
}

export const StockAdjustmentPrint: React.FC<StockAdjustmentPrintProps> = ({
    isRTL,
    t,
    pharmacyName,
    activeView,
    data
}) => {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        return () => setMounted(false);
    }, []);

    if (!mounted) return null;

    return createPortal(
        <>
            <style type="text/css" media="print">
                {`
                    @media print {
                        /* 1. Hide the entire app */
                        body > *:not(.stock-adjustment-print-portal) {
                            display: none !important;
                        }

                        /* 2. Reset global page constraints */
                        html, body {
                            height: auto !important;
                            overflow: visible !important;
                            margin: 0 !important;
                            padding: 0 !important;
                            background: white !important;
                        }

                        /* 3. Style our portal container */
                        .stock-adjustment-print-portal {
                            display: block !important;
                            position: static !important;
                            width: 100% !important;
                            height: auto !important;
                            visibility: visible !important;
                            background: white !important;
                            z-index: 9999;
                        }

                        /* 4. Ensure internal layout flows correctly */
                        .stock-adjustment-print-content {
                            position: relative;
                            width: 100%;
                            height: auto;
                            margin: 0;
                            padding: 15px;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                        }
                        
                        /* Table handling */
                        thead { display: table-header-group; }
                        tr { page-break-inside: avoid; }
                        .signature-block { page-break-inside: avoid; }
                    }
                `}
            </style>
            
            {/* Unique class for the portal wrapper */}
            <div className="stock-adjustment-print-portal hidden print:block bg-white text-black" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="stock-adjustment-print-content min-h-screen flex flex-col">
                    <div className="flex justify-between items-start mb-4">
                        <div className="text-left">
                            <h1 className="text-xl font-bold text-black mb-1">{pharmacyName} - Inventory Count</h1>
                            <p className="text-[10px] text-black">Generated on {new Date().toLocaleString(isRTL ? 'ar-EG' : 'en-US')}</p>
                        </div>
                        <div className="flex items-center gap-2">
                             <img src="/logo_icon_black.svg" alt="App Logo" className="h-6 w-auto" />
                             <img src="/logo_word_black.svg" alt="Zinc" className="h-4 w-auto mt-0.5" />
                        </div>
                    </div>
                    
                    <table className="w-full text-start border-collapse mb-4 text-[10px]">
                        <thead>
                            <tr className="border-b border-black text-black">
                                <th className="py-1 text-start font-bold w-[30%]">{t.stockAdjustment?.table?.product || "Product"}</th>
                                <th className="py-1 text-center font-bold">{t.barcodePrinter?.tableHeaders?.expiry || "Expiry"}</th>
                                <th className="py-1 text-center font-bold">{t.stockAdjustment?.table?.current || "Current"}</th>
                                <th className="py-1 text-center font-bold">{t.stockAdjustment?.table?.new || "New"}</th>
                                <th className="py-1 text-center font-bold">{t.stockAdjustment?.table?.diff || "Diff"}</th>
                                <th className="py-1 text-start font-bold">{t.stockAdjustment?.table?.reason || "Reason"}</th>
                                <th className="py-1 text-start font-bold">{t.stockAdjustment?.table?.notes || "Notes"}</th>
                                <th className="py-1 text-start font-bold">{t.intelligence?.audit?.columns?.employee || "User"}</th>
                            </tr>
                        </thead>
                        <tbody className="text-black">
                            {data.length > 0 ? (
                                data.map((item) => (
                                    <tr 
                                        key={item.id} 
                                        className={`border-b border-black/5 ${item.newStock === 0 ? 'bg-[#f0f0f0]' : ''}`} 
                                        style={{ pageBreakInside: 'avoid' }}
                                    >
                                        <td className="py-0.5 font-bold text-start leading-tight">
                                            <div className="line-clamp-2 overflow-hidden">
                                                {getDisplayName({ name: item.drugName || item.drugId || 'Unknown Product' })}
                                            </div>
                                        </td>
                                        <td className="py-0.5 text-center font-bold text-black whitespace-nowrap">
                                            {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('en-US', { month: 'numeric', year: 'numeric' }) : '-'}
                                        </td>
                                        <td className="py-0.5 text-center text-black tabular-nums">{item.previousStock}</td>
                                        <td className="py-0.5 text-center text-black tabular-nums">{item.newStock}</td>
                                        <td className="py-0.5 text-center" dir="ltr">
                                            <span className={`inline-block font-bold tabular-nums min-w-[45px] text-center border rounded-md px-1 ${
                                                item.quantity > 0 ? 'text-green-700 border-green-700' : 'text-red-700 border-red-700'
                                            }`}>
                                                {item.quantity >= 0 ? '+' : ''}{item.quantity}
                                            </span>
                                        </td>
                                        <td className="py-0.5 italic text-black text-start truncate max-w-[80px]">{item.reason}</td>
                                        <td className="py-0.5 text-black text-start truncate max-w-[80px]">{item.notes || '-'}</td>
                                        <td className="py-0.5 text-black font-medium text-start whitespace-nowrap">
                                            {item.performedByName || item.performedBy}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={8} className="py-8 text-center text-black italic">
                                        {activeView === 'history' 
                                            ? (t.stockAdjustment?.noHistory || "No history records found for the selected period.")
                                            : (t.stockAdjustment?.noRecent || "No recent transaction to print. Perform an adjustment first.")}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className="signature-block mt-auto pb-4 flex justify-between items-end" style={{ pageBreakInside: 'avoid' }}>
                        <div className="text-center">
                            <div className="w-40 border-b border-gray-400 mb-1"></div>
                            <p className="text-[10px] font-bold text-black">{t.stockAdjustment?.managerSignature || "Manager Signature"}</p>
                        </div>
                        <div className="text-center">
                            <div className="w-40 border-b border-gray-400 mb-1"></div>
                            <p className="text-[10px] font-bold text-black">{t.stockAdjustment?.auditorSignature || "Auditor Signature"}</p>
                        </div>
                    </div>
                </div>
            </div>
        </>,
        document.body
    );
};
