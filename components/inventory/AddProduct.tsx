import React, { useState } from 'react';
import { useSmartDirection } from '../../hooks/useSmartDirection';
import { Drug } from '../../types';
import { PosDropdown } from '../common/PosDropdown';

interface AddProductProps {
  inventory: Drug[];
  onAddDrug: (drug: Drug) => void;
  color: string;
  t: any;
  onNavigate?: (view: string) => void;
}

export const AddProduct: React.FC<AddProductProps> = ({ inventory, onAddDrug, color, t, onNavigate }) => {
  const [formData, setFormData] = useState<Partial<Drug>>({
    name: '',
    genericName: '',
    category: 'General',
    price: 0,
    costPrice: 0,
    stock: 0,
    expiryDate: '',
    description: '',
    barcode: '',
    internalCode: '',
    unitsPerPack: 1,
    maxDiscount: 10
  });

  const nameDir = useSmartDirection(formData.name || '', t.addProduct.placeholders.brandName);
  const genericNameDir = useSmartDirection(formData.genericName || '', t.addProduct.placeholders.genericName);
  const descriptionDir = useSmartDirection(formData.description || '', t.addProduct.placeholders.description);
  const internalCodeDir = useSmartDirection(formData.internalCode || '', t.addProduct.placeholders.internalCode);
  const barcodeDir = useSmartDirection(formData.barcode || '', t.addProduct.placeholders.barcode);

  const [showSuccess, setShowSuccess] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);

  // Extract unique categories from existing inventory
  const categories = Array.from(new Set(inventory.map(drug => drug.category))).sort();
  const defaultCategories = ['Antibiotics', 'Painkillers', 'Supplements', 'First Aid', 'Cardiovascular', 'Skin Care', 'Personal Care', 'Respiratory', 'Medical Equipment', 'Medical Supplies', 'Baby Care', 'General'];
  const allCategories = Array.from(new Set([...defaultCategories, ...categories])).sort();

  const generateInternalCode = () => {
    const prefix = formData.category?.substring(0, 2).toUpperCase() || 'GN';
    const nextId = inventory.length + 1;
    const code = `${prefix}-${String(nextId).padStart(4, '0')}`;
    setFormData({ ...formData, internalCode: code });
  };

  const handleSubmit = (e: React.FormEvent, addAnother: boolean = false) => {
    e.preventDefault();
    
    const newDrug: Drug = {
      id: Date.now().toString(),
      name: formData.name || '',
      genericName: formData.genericName || '',
      category: formData.category || 'General',
      price: formData.price || 0,
      costPrice: formData.costPrice || 0,
      stock: formData.stock || 0,
      expiryDate: formData.expiryDate || '',
      description: formData.description || '',
      barcode: formData.barcode,
      internalCode: formData.internalCode,
      unitsPerPack: formData.unitsPerPack || 1,
      maxDiscount: formData.maxDiscount
    };

    onAddDrug(newDrug);
    
    // Show success message
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    if (addAnother) {
      // Clear form but keep category
      const currentCategory = formData.category;
      setFormData({
        name: '',
        genericName: '',
        category: currentCategory,
        price: 0,
        costPrice: 0,
        stock: 0,
        expiryDate: '',
        description: '',
        barcode: '',
        internalCode: '',
        unitsPerPack: 1,
        maxDiscount: 10
      });
    } else {
      // Navigate to inventory
      if (onNavigate) {
        onNavigate('inventory');
      }
    }
  };

  const handleClear = () => {
    setFormData({
      name: '',
      genericName: '',
      category: 'General',
      price: 0,
      costPrice: 0,
      stock: 0,
      expiryDate: '',
      description: '',
      barcode: '',
      internalCode: '',
      unitsPerPack: 1,
      maxDiscount: 10
    });
  };

  return (
    <div className="h-full flex flex-col space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">{t.addProduct.title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t.addProduct.subtitle}</p>
        </div>
        <button
          onClick={() => onNavigate && onNavigate('inventory')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span className="material-symbols-rounded text-lg">arrow_back</span>
          {t.addProduct.actions.cancel}
        </button>
      </div>

      {/* Success Message */}
      {showSuccess && (
        <div className={`p-4 rounded-2xl bg-${color}-50 dark:bg-${color}-950/30 border border-${color}-200 dark:border-${color}-800 flex items-center gap-3 animate-fade-in`}>
          <span className={`material-symbols-rounded text-${color}-600 dark:text-${color}-400`}>check_circle</span>
          <span className={`text-sm font-medium text-${color}-700 dark:text-${color}-300`}>{t.addProduct.messages.success}</span>
        </div>
      )}

      {/* Form Card */}
      <div className="flex-1 bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-800 overflow-hidden shadow-sm">
        <form onSubmit={(e) => handleSubmit(e, false)} className="p-6 md:p-8 space-y-8">
          
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">info</span>
              {t.addProduct.sections.basicInfo}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.brandName} *</label>
                <input
                  required
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder={t.addProduct.placeholders.brandName}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  dir={nameDir}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.genericName} *</label>
                <input
                  required
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder={t.addProduct.placeholders.genericName}
                  value={formData.genericName}
                  onChange={e => setFormData({ ...formData, genericName: e.target.value })}
                  dir={genericNameDir}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.category} *</label>
                <PosDropdown
                  variant="input"
                  items={allCategories}
                  selectedItem={formData.category}
                  isOpen={isCategoryOpen}
                  onToggle={() => setIsCategoryOpen(!isCategoryOpen)}
                  onSelect={(cat) => {
                      setFormData({ ...formData, category: cat });
                      setIsCategoryOpen(false);
                  }}
                  keyExtractor={(cat) => cat}
                  renderItem={(cat, isSelected) => cat}
                  renderSelected={(cat) => cat || t.addProduct.fields.category}
                  className="w-full h-[50px]"
                  color={color}
                />
              </div>
            </div>
          </div>

          {/* Product Codes */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">qr_code_2</span>
              {t.addProduct.sections.codes}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.barcode}</label>
                <input
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder={t.addProduct.placeholders.barcode}
                  value={formData.barcode || ''}
                  onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                  dir={barcodeDir}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase flex items-center justify-between">
                  <span>{t.addProduct.fields.internalCode}</span>
                  <button
                    type="button"
                    onClick={generateInternalCode}
                    className={`text-xs px-2 py-1 rounded-lg bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-400 hover:bg-${color}-200 dark:hover:bg-${color}-900/50 transition-colors`}
                  >
                    {t.addProduct.actions.generateCode}
                  </button>
                </label>
                <input
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder={t.addProduct.placeholders.internalCode}
                  value={formData.internalCode || ''}
                  onChange={e => setFormData({ ...formData, internalCode: e.target.value })}
                  dir={internalCodeDir}
                />
              </div>
            </div>
          </div>

          {/* Stock Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">inventory_2</span>
              {t.addProduct.sections.stock}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.stock} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.stock}
                  onChange={e => setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.unitsPerPack}</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.unitsPerPack || 1}
                  onChange={e => setFormData({ ...formData, unitsPerPack: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.expiryDate} *</label>
                <input
                  type="date"
                  required
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all text-gray-500"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.expiryDate}
                  onChange={e => setFormData({ ...formData, expiryDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">payments</span>
              {t.addProduct.sections.pricing}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.sellingPrice} *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all font-bold text-green-600 dark:text-green-400"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.price}
                  onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.costPrice}</label>
                <input
                  type="number"
                  step="0.01"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all text-gray-500"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  value={formData.costPrice || 0}
                  onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.maxDiscount}</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all text-red-500"
                  style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                  placeholder="No Limit"
                  value={formData.maxDiscount || ''}
                  onChange={e => setFormData({ ...formData, maxDiscount: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded text-xl">description</span>
              {t.addProduct.sections.additional}
            </h3>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">{t.addProduct.fields.description}</label>
              <textarea
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border-none focus:ring-2 focus:ring-inset transition-all"
                style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                rows={4}
                placeholder={t.addProduct.placeholders.description}
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                dir={descriptionDir}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="flex-1 py-3 rounded-full font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-rounded text-lg">refresh</span>
              {t.addProduct.actions.clear}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              className={`flex-1 py-3 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95 flex items-center justify-center gap-2`}
            >
              <span className="material-symbols-rounded text-lg">add_circle</span>
              {t.addProduct.actions.saveAndNew}
            </button>
            <button
              type="submit"
              className={`flex-1 py-3 rounded-full font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-lg shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-2`}
            >
              <span className="material-symbols-rounded text-lg">save</span>
              {t.addProduct.actions.save}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
