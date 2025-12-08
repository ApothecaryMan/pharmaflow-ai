import React, { useState } from 'react';
import { Purchase, PurchaseItem } from '../types';

import { useSmartDirection } from '../hooks/useSmartDirection';

interface PendingApprovalProps {
  color: string;
  t: any;
  purchases: Purchase[];
  onApprovePurchase: (id: string, approverName: string) => void;
  onRejectPurchase: (id: string, reason?: string) => void;
}

export const PendingApproval: React.FC<PendingApprovalProps> = ({ 
  color, 
  t, 
  purchases, 
  onApprovePurchase, 
  onRejectPurchase 
}) => {
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  
  // Reject State
  const [rejectReason, setRejectReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [purchaseToReject, setPurchaseToReject] = useState<string | null>(null);
  
  const rejectReasonDir = useSmartDirection(rejectReason, 'E.g., Incorrect pricing, wrong items...');

  // Approve State
  const [approverName, setApproverName] = useState('');
  const direction = useSmartDirection(approverName, 'Enter Name'); // Call useSmartDirection
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [purchaseToApprove, setPurchaseToApprove] = useState<string | null>(null);

  const pendingPurchases = purchases.filter(p => p.status === 'pending');

  // Reject Logic
  const handleOpenReject = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPurchaseToReject(id);
    setIsRejectModalOpen(true);
  };

  const confirmReject = () => {
    if (purchaseToReject) {
      onRejectPurchase(purchaseToReject, rejectReason);
      setIsRejectModalOpen(false);
      setPurchaseToReject(null);
      setRejectReason('');
    }
  };

  // Approve Logic
  const handleOpenApprove = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPurchaseToApprove(id);
    setIsApproveModalOpen(true);
  };

  const confirmApprove = () => {
    if (purchaseToApprove && approverName.trim()) {
      onApprovePurchase(purchaseToApprove, approverName);
      setIsApproveModalOpen(false);
      setPurchaseToApprove(null);
      setApproverName('');
      if (selectedPurchase) setSelectedPurchase(null);
    } else {
        alert("Please enter the approver's name.");
    }
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in p-2 md:p-6 lg:p-8 overflow-hidden">
        {/* Header */}
        <div className="flex flex-col space-y-1">
            <h2 className="text-3xl font-bold tracking-tight text-gray-800 dark:text-gray-100 flex items-center gap-3">
                <span className="p-2 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400">
                    <span className="material-symbols-rounded text-2xl">pending_actions</span>
                </span>
                {t.menuLabel || 'Pending Approvals'}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-2xl">
                Review and approve incoming purchase orders. Orders must be approved before inventory is updated.
            </p>
        </div>

        {/* Content */}
        {pendingPurchases.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-4 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800 m-4">
                <div className="w-24 h-24 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center">
                    <span className="material-symbols-rounded text-5xl opacity-20">assignment_turned_in</span>
                </div>
                <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-300">All caught up!</h3>
                    <p className="text-sm opacity-60">No pending purchase orders requiring approval.</p>
                </div>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 flex-1 overflow-y-auto p-1">
                {pendingPurchases.map(purchase => (
                    <div 
                        key={purchase.id} 
                        className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col relative overflow-hidden group cursor-pointer hover:border-blue-200 dark:hover:border-blue-800 transition-colors"
                        onClick={() => setSelectedPurchase(purchase)}
                    >
                        {/* Status Badge */}
                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                            Pending Review
                        </div>

                        {/* Top Section */}
                        <div className="mb-6">
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Supplier</p>
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-1">{purchase.supplierName}</h3>
                            <p className="text-xs text-gray-500 font-mono">INV: {purchase.externalInvoiceId || purchase.invoiceId}</p>
                        </div>

                        {/* Grid Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Date</p>
                                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    {new Date(purchase.date).toLocaleDateString()}
                                </p>
                                <p className="text-[10px] text-gray-400">
                                    {new Date(purchase.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}
                                </p>
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-gray-400 mb-1">Total Cost</p>
                                <p className={`text-lg font-bold text-${color}-600 dark:text-${color}-400`}>
                                    ${purchase.totalCost.toFixed(2)}
                                </p>
                            </div>
                            <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                <span className="material-symbols-rounded text-gray-400 text-sm">shopping_basket</span>
                                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                    {purchase.items.reduce((acc, item) => acc + item.quantity, 0)} Items
                                </span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto grid grid-cols-2 gap-3" onClick={(e) => e.stopPropagation()}>
                             <button 
                                onClick={(e) => handleOpenReject(purchase.id, e)}
                                className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 font-bold text-sm transition-colors flex items-center justify-center gap-2"
                             >
                                <span className="material-symbols-rounded text-lg">close</span>
                                Reject
                             </button>
                             <button 
                                onClick={(e) => handleOpenApprove(purchase.id, e)}
                                className="py-2.5 rounded-xl bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-600 dark:text-green-400 font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                             >
                                <span className="material-symbols-rounded text-lg">check</span>
                                Approve
                             </button>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Purchase Details Modal - Redesigned to match History */}
        {selectedPurchase && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}>
                                <span className="material-symbols-rounded">receipt_long</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Purchase Order Details</h3>
                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                    <span className="font-mono">{selectedPurchase.invoiceId}</span>
                                    <span>•</span>
                                    <span>{new Date(selectedPurchase.date).toLocaleDateString()} {new Date(selectedPurchase.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: true})}</span>
                                </p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setSelectedPurchase(null)}
                            className="p-2 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 transition-colors"
                        >
                            <span className="material-symbols-rounded">close</span>
                        </button>
                    </div>

                    {/* Info Bar */}
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4 bg-white dark:bg-gray-900 text-sm border-b border-gray-100 dark:border-gray-800">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Supplier</p>
                            <p className="font-bold text-gray-800 dark:text-gray-100">{selectedPurchase.supplierName}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Inv #</p>
                            <p className="font-mono text-gray-800 dark:text-gray-100">{selectedPurchase.externalInvoiceId || '-'}</p>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Payment</p>
                                 <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white ${selectedPurchase.paymentType === 'cash' ? 'bg-green-600' : 'bg-blue-600'}`}>
                                {selectedPurchase.paymentType || 'credit'}
                            </span>
                        </div>
                         <div>
                            <p className="text-xs text-gray-500 uppercase font-bold mb-1">Total Cost</p>
                            <p className={`font-bold text-lg text-${color}-600`}>${selectedPurchase.totalCost.toFixed(2)}</p>
                        </div>
                    </div>

                    {/* Items Table Header & Input */}
                    <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <h4 className="font-bold text-gray-700 dark:text-gray-300 text-sm flex items-center gap-2">
                            <span className="material-symbols-rounded text-gray-400 text-sm">list_alt</span>
                            Items List
                        </h4>
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Approved By:</label>
                            <div className="relative group">
                                <input 
                                    type="text" 
                                    value={approverName}
                                    dir={direction}
                                    onChange={(e) => setApproverName(e.target.value)}
                                    placeholder="Enter Name"
                                    className="w-64 px-3 py-1 rounded-md bg-transparent border border-transparent hover:border-gray-300 outline-none text-sm font-medium transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="flex-1 overflow-y-auto p-0 bg-gray-50 dark:bg-black/20">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900 shadow-sm">
                                <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 uppercase">
                                    <th className="p-3 font-bold bg-gray-50 dark:bg-gray-900">Item</th>
                                    <th className="p-3 font-bold text-center bg-gray-50 dark:bg-gray-900">Expiry</th>
                                    <th className="p-3 font-bold text-center bg-gray-50 dark:bg-gray-900">Qty</th>
                                    <th className="p-3 font-bold text-right bg-gray-50 dark:bg-gray-900">Cost</th>
                                    <th className="p-3 font-bold text-center bg-gray-50 dark:bg-gray-900">Disc %</th>
                                    <th className="p-3 font-bold text-right bg-gray-50 dark:bg-gray-900">Sale Price</th>
                                    <th className="p-3 font-bold text-right bg-gray-50 dark:bg-gray-900">Total</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300">
                                {selectedPurchase.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                        <td className="p-3 font-medium text-gray-800 dark:text-gray-200">
                                            {item.name}
                                            {item.dosageForm && <span className="text-xs text-gray-400 ml-1 font-normal">({item.dosageForm})</span>}
                                        </td>
                                        <td className="p-3 text-center">
                                            {item.expiryDate ? (item.expiryDate.length === 4 && !item.expiryDate.includes('/') 
                                                ? `${item.expiryDate.slice(0, 2)}/20${item.expiryDate.slice(2)}` 
                                                : item.expiryDate) : '-'}
                                        </td>
                                        <td className="p-3 text-center font-bold bg-gray-50/50 dark:bg-gray-800/30">{item.quantity}</td>
                                        <td className="p-3 text-right">${item.costPrice.toFixed(2)}</td>
                                        <td className="p-3 text-center text-gray-500">{item.discount || 0}%</td>
                                        <td className="p-3 text-right">${(item.salePrice || 0).toFixed(2)}</td>
                                        <td className="p-3 text-right font-bold text-gray-800 dark:text-gray-200">${(item.quantity * item.costPrice).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Modal Footer */}
                    <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex justify-end gap-3 z-20">
                        <button 
                            onClick={() => {
                                if (approverName.trim()) {
                                    onApprovePurchase(selectedPurchase.id, approverName);
                                    setSelectedPurchase(null);
                                    setApproverName('');
                                } else {
                                    alert("Please enter the approver's name.");
                                }
                            }}
                            disabled={!approverName.trim()}
                            className={`px-8 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                approverName.trim() 
                                ? `bg-${color}-600 text-white hover:bg-${color}-700 shadow-lg shadow-${color}-200 dark:shadow-none active:scale-95` 
                                : `bg-gray-100 text-gray-400 cursor-not-allowed shadow-none dark:bg-gray-800 dark:text-gray-600`
                            }`}
                        >
                            <span className="material-symbols-rounded">check_circle</span>
                            Approve Order
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Reject Confirmation Modal */}
         {isRejectModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsRejectModalOpen(false)}></div>
                <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-3xl shadow-2xl relative overflow-hidden flex flex-col animate-bounce-in">
                    <div className="p-6 text-center">
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <span className="material-symbols-rounded text-3xl">warning</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Reject Purchase Order?</h3>
                        <p className="text-sm text-gray-500 mb-6">Are you sure you want to reject this order? This action cannot be undone.</p>
                        
                        <div className="text-left mb-4">
                            <label className="text-xs font-bold text-gray-400 uppercase ml-1 mb-1 block">Reason (Optional)</label>
                            <input 
                                type="text" 
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="E.g., Incorrect pricing, wrong items..."
                                className="w-full px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:ring-2 focus:ring-red-500/50"
                                dir={rejectReasonDir}
                            />
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsRejectModalOpen(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmReject}
                                className="flex-1 py-3 rounded-xl font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
