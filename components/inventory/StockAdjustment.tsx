import React, { useState, useMemo } from 'react';
import { SmartInput, useSmartDirection } from '../common/SmartInputs';
import { SearchInput } from '../common/SearchInput';
import { ExpandingDropdown } from '../common/ExpandingDropdown';
import { Drug } from '../../types';
import { parseSearchTerm } from '../../utils/searchUtils';
import { CARD_BASE } from '../../utils/themeStyles';

interface StockAdjustmentProps {
  inventory: Drug[];
  onUpdateInventory: (drugs: Drug[]) => void;
  color?: string;
  t: any;
}

interface AdjustmentItem {
  drugId: string;
  drugName: string;
  currentStock: number;
  newStock: number;
  difference: number;
  reason: string;
  notes: string;
}

export const StockAdjustment: React.FC<StockAdjustmentProps> = ({ inventory, onUpdateInventory, color = 'blue', t }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [openDropdownIndex, setOpenDropdownIndex] = useState<number | null>(null);


  // Filter inventory for search
  const searchResults = useMemo(() => {
    if (!searchTerm || searchTerm.length < 1) return [];
    const { regex } = parseSearchTerm(searchTerm);
    return inventory.filter(d => 
      regex.test(d.name) || 
      (d.barcode && regex.test(d.barcode)) || 
      (d.internalCode && regex.test(d.internalCode))
    ).slice(0, 10); // Limit results
  }, [inventory, searchTerm]);

  const handleAddItem = (drug: Drug) => {
    // Check if already added
    if (adjustments.some(a => a.drugId === drug.id)) {
        // Maybe scroll to it or highlight?
        setSearchTerm('');
        return;
    }

    const newItem: AdjustmentItem = {
      drugId: drug.id,
      drugName: drug.name,
      currentStock: drug.stock,
      newStock: drug.stock,
      difference: 0,
      reason: 'inventory_count', // Default reason
      notes: ''
    };

    setAdjustments([newItem, ...adjustments]);
    setSearchTerm('');
  };

  const updateAdjustment = (index: number, field: keyof AdjustmentItem, value: any) => {
    const newAdjustments = [...adjustments];
    const item = newAdjustments[index];

    if (field === 'newStock') {
        const newStock = parseFloat(value) || 0;
        item.newStock = newStock;
        item.difference = newStock - item.currentStock;
    } else if (field === 'difference') {
        const diff = parseFloat(value) || 0;
        item.difference = diff;
        item.newStock = item.currentStock + diff;
    } else {
        (item as any)[field] = value;
    }

    setAdjustments(newAdjustments);
  };

  const removeAdjustment = (index: number) => {
    const newAdjustments = [...adjustments];
    newAdjustments.splice(index, 1);
    setAdjustments(newAdjustments);
  };

  const handleSave = () => {
    if (adjustments.length === 0) return;

    // In a real app, this would call an API with the transaction details
    // Here we duplicate the inventory and update local state stocks
    // NOTE: This logic assumes we are passing a full inventory update handler, or maybe we should just call updateStock for each?
    // Since props.onUpdateInventory expects Drug[], let's assume we update the specific drugs.

    // Calculate updated drugs
    /* 
       Optimization: If specific update function exists, use it. 
       Otherwise we might need to update the whole inventory array which is expensive.
       For this mock implementation, we'll assume we can just pass the updated inventory.
    */
    
    // Create map of changes
    const updates = new Map(adjustments.map(a => [a.drugId, a.newStock]));

    const updatedInventory = inventory.map(drug => {
        if (updates.has(drug.id)) {
            return { ...drug, stock: updates.get(drug.id)! };
        }
        return drug;
    });

    onUpdateInventory(updatedInventory);

    setAdjustments([]);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const reasons = [
    'damaged',
    'expired',
    'theft',
    'inventory_count',
    'correction',
    'other'
  ];

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight type-expressive">{t.stockAdjustment.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.stockAdjustment.subtitle}</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
            <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800 flex items-center gap-3 animate-fade-in`}>
                <span className={`material-symbols-rounded text-${color}-600 dark:text-${color}-400`}>check_circle</span>
                <span className={`text-sm font-medium text-${color}-700 dark:text-${color}-300`}>{t.stockAdjustment.success}</span>
            </div>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Left Panel: Search & History (Placeholder for now, mainly search) */}
            <div className="lg:col-span-1 flex flex-col gap-4">
                <div className={`${CARD_BASE} p-4 rounded-3xl`}>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-blue-500">search</span>
                        {t.inventory.addDrug}
                    </h3>
                    
                    <div className="relative">
                        <SearchInput
                            value={searchTerm}
                            onSearchChange={setSearchTerm}
                            placeholder={t.stockAdjustment.searchPlaceholder}
                            className={`rounded-xl border-${color}-200 dark:border-${color}-800`}
                        />
                        
                        {/* Search Results Dropdown */}
                        {searchTerm && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 max-h-[300px] overflow-y-auto">
                                {searchResults.map(drug => (
                                    <button
                                        key={drug.id}
                                        onClick={() => handleAddItem(drug)}
                                        className="w-full text-start p-3 hover:bg-gray-50 dark:hover:bg-gray-800 border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-sm text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                    {drug.name}
                                                </div>
                                                <div className="text-xs text-gray-500">{drug.genericName}</div>
                                            </div>
                                            <div className="text-xs font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-lg">
                                                Stock: {drug.stock}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                         {searchTerm && searchResults.length === 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-100 dark:border-gray-800 z-50 p-4 text-center text-gray-500 text-sm">
                                {t.inventory.noResults}
                            </div>
                        )}
                    </div>
                </div>

                {/* History placeholder or Summary */}
                 <div className={`${CARD_BASE} p-4 rounded-3xl flex-1`}>
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                        <span className="material-symbols-rounded text-gray-400">history</span>
                        {t.stockAdjustment.history}
                    </h3>
                    <div className="text-center text-gray-400 text-xs py-8 italic">
                        No recent adjustments
                    </div>
                 </div>
            </div>

            {/* Right Panel: Adjustment Table */}
            <div className={`lg:col-span-2 ${CARD_BASE} rounded-3xl flex flex-col overflow-hidden`}>
                <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900/50">
                    <h3 className="font-bold text-gray-800 dark:text-gray-200">{t.stockAdjustment.title}</h3>
                    <div className="flex gap-2">
                         <button 
                            onClick={() => setAdjustments([])}
                            disabled={adjustments.length === 0}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition-colors"
                        >
                            {t.stockAdjustment.clear}
                        </button>
                        <button 
                            onClick={handleSave}
                            disabled={adjustments.length === 0}
                            className={`px-6 py-2 rounded-xl text-sm font-bold text-white shadow-lg shadow-${color}-500/20 bg-${color}-600 hover:bg-${color}-700 disabled:opacity-50 disabled:shadow-none transition-all transform active:scale-95`}
                        >
                            {t.stockAdjustment.save}
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto">
                    {adjustments.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                            <span className="material-symbols-rounded text-6xl mb-4 opacity-20">inventory_2</span>
                            <p>{t.stockAdjustment.empty}</p>
                        </div>
                    ) : (
                        <table className="w-full text-start">
                             <thead className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase text-gray-500 font-medium sticky top-0 z-10">
                                <tr>
                                    <th className="px-4 py-3 text-start">{t.stockAdjustment.table.product}</th>
                                    <th className="px-4 py-3 text-center w-24">{t.stockAdjustment.table.current}</th>
                                    <th className="px-4 py-3 text-center w-28">{t.stockAdjustment.table.new}</th>
                                    <th className="px-4 py-3 text-center w-24">{t.stockAdjustment.table.diff}</th>
                                    <th className="px-4 py-3 text-start w-40">{t.stockAdjustment.table.reason}</th>
                                    <th className="px-4 py-3 text-start">{t.stockAdjustment.table.notes}</th>
                                    <th className="px-4 py-3 text-end w-16">{t.stockAdjustment.table.action}</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                {adjustments.map((item, idx) => (
                                    <tr key={`${item.drugId}-${idx}`} className="group hover:bg-gray-50 dark:hover:bg-gray-900/20 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="font-bold text-sm text-gray-800 dark:text-gray-200">{item.drugName}</div>
                                            <div className="text-[10px] text-gray-400 font-mono">{item.drugId}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
                                                {item.currentStock}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <input
                                                type="number"
                                                className={`w-full text-center p-1.5 rounded-lg border-2 ${item.newStock !== item.currentStock ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'} text-sm font-bold outline-none focus:border-blue-500 transition-colors`}
                                                value={item.newStock}
                                                onChange={(e) => updateAdjustment(idx, 'newStock', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                             <span className={`font-mono font-bold text-sm ${item.difference > 0 ? 'text-green-500' : item.difference < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                                                {item.difference > 0 ? '+' : ''}{item.difference}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ExpandingDropdown
                                                items={reasons}
                                                selectedItem={item.reason}
                                                isOpen={openDropdownIndex === idx}
                                                onToggle={() => setOpenDropdownIndex(openDropdownIndex === idx ? null : idx)}
                                                onSelect={(val) => { updateAdjustment(idx, 'reason', val); setOpenDropdownIndex(null); }}
                                                renderSelected={(val) => t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons]}
                                                renderItem={(val) => t.stockAdjustment.reasons[val as keyof typeof t.stockAdjustment.reasons]}
                                                className="w-full text-xs"
                                                color={color}
                                                keyExtractor={(item) => item}
                                            />
                                        </td>
                                        <td className="px-4 py-3">
                                            <SmartInput
                                                value={item.notes}
                                                onChange={(e) => updateAdjustment(idx, 'notes', e.target.value)}
                                                placeholder={t.stockAdjustment.notes}
                                                className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent outline-none focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-end">
                                            <button 
                                                onClick={() => removeAdjustment(idx)}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <span className="material-symbols-rounded text-lg">delete</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    </div>
  );
};
