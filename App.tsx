import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ThemeColor, ViewState, Drug, Sale, CartItem, Language, Supplier, Purchase, Return } from './types';
import { Dashboard } from './components/Dashboard';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { SalesHistory } from './components/SalesHistory';
import { Suppliers } from './components/Suppliers';
import { Purchases } from './components/Purchases';
import { BarcodeStudio } from './components/BarcodeStudio';
import { Toast } from './components/Toast';
import { TRANSLATIONS } from './translations';
import { PHARMACY_MENU } from './menuData';
import { SidebarMenu } from './components/SidebarMenu';
import { Navbar } from './components/Navbar';
import { useTheme } from './hooks/useTheme';

// Inventory Generator
const generateInventory = (): Drug[] => {
  const medPrefixes = ['Amox', 'Cipro', 'Pana', 'Bru', 'Volta', 'Zyr', 'Clar', 'Augmen', 'Lipi', 'Gluco', 'Metfor', 'Omepra', 'Lorata', 'Ibu', 'Para', 'Aspi', 'Venta', 'Corti', 'Derm', 'Hist', 'Neur', 'Beta', 'Cefa', 'Azith'];
  const medSuffixes = ['il', 'fen', 'dol', 'ren', 'tec', 'tin', 'tor', 'phage', 'zole', 'dine', 'rin', 'lin', 'zone', 'vate', 'mine', 'bion', 'dine', 'max', 'pro'];
  const strengths = ['250mg', '500mg', '1000mg', '10mg', '20mg', '50mg', '100mg', '5ml', '10ml', '100ml', '150ml'];
  const forms = ['Tablets', 'Capsules', 'Syrup', 'Injection', 'Cream', 'Gel', 'Drops', 'Spray', 'Suspension', 'Vial'];

  const cosmeticBrands = ['Nivea', 'Dove', 'L\'Oreal', 'Garnier', 'Neutrogena', 'CeraVe', 'Vichy', 'La Roche-Posay', 'Bioderma', 'Eucerin', 'Cetaphil', 'Pantene', 'Head & Shoulders', 'Rexona', 'Axe'];
  const cosmeticTypes = ['Face Wash', 'Moisturizer', 'Sunscreen', 'Shampoo', 'Conditioner', 'Body Lotion', 'Serum', 'Toner', 'Cleanser', 'Night Cream', 'Deodorant', 'Lip Balm', 'Hand Cream'];

  const supplyTypes = ['Syringe', 'Bandage', 'Gauze', 'Cannula', 'Gloves', 'Mask', 'Tape', 'Cotton', 'Thermometer', 'Test Strip', 'Catheter', 'Pulse Oximeter', 'BP Monitor', 'Nebulizer'];
  const supplySpecs = ['Small', 'Medium', 'Large', 'Sterile', 'Box of 50', 'Box of 100', '1ml', '5ml', '10ml', 'Digital', 'Latex Free'];

  const babyBrands = ['Pampers', 'Huggies', 'Johnson\'s', 'Sudocrem', 'Similac', 'NAN', 'Cerelac', 'Aptamil'];
  const babyTypes = ['Diapers Size 1', 'Diapers Size 3', 'Diapers Size 5', 'Baby Powder', 'Baby Oil', 'Shampoo', 'Wipes', 'Formula Stage 1', 'Formula Stage 2'];

  const inventory: Drug[] = [];

  // Generate 10000 items
  for (let i = 1; i <= 10000; i++) {
    const typeRoll = Math.random();
    let category = '';
    let name = '';
    let generic = '';
    let desc = '';
    let units = 1;

    if (typeRoll < 0.6) {
      // Medicine (60%)
      const pre = medPrefixes[Math.floor(Math.random() * medPrefixes.length)];
      const suf = medSuffixes[Math.floor(Math.random() * medSuffixes.length)];
      const str = strengths[Math.floor(Math.random() * strengths.length)];
      const form = forms[Math.floor(Math.random() * forms.length)];
      
      name = `${pre}${suf} ${str}`;
      generic = `${pre}${suf}cin`; // Fake generic
      category = ['Antibiotics', 'Painkillers', 'Cardiovascular', 'Respiratory', 'Digestive', 'Allergy', 'Vitamins', 'General'][Math.floor(Math.random() * 8)];
      desc = `${category} ${form.toLowerCase()} for treatment`;
      units = (form === 'Tablets' || form === 'Capsules' || form === 'Injection') ? Math.floor(Math.random() * 3) + 1 : 1;
    } else if (typeRoll < 0.8) {
      // Cosmetics (20%)
      const brand = cosmeticBrands[Math.floor(Math.random() * cosmeticBrands.length)];
      const type = cosmeticTypes[Math.floor(Math.random() * cosmeticTypes.length)];
      name = `${brand} ${type}`;
      generic = type;
      category = ['Skin Care', 'Personal Care'][Math.floor(Math.random() * 2)];
      desc = `Premium ${type.toLowerCase()} by ${brand}`;
      units = 1;
    } else if (typeRoll < 0.9) {
      // Baby Care (10%)
      const brand = babyBrands[Math.floor(Math.random() * babyBrands.length)];
      const type = babyTypes[Math.floor(Math.random() * babyTypes.length)];
      name = `${brand} ${type}`;
      generic = type;
      category = 'Baby Care';
      desc = `Essential ${type.toLowerCase()} for babies`;
      units = type.includes('Diapers') ? 40 : 1;
    } else {
      // Supplies/Equipment (10%)
      const type = supplyTypes[Math.floor(Math.random() * supplyTypes.length)];
      const spec = supplySpecs[Math.floor(Math.random() * supplySpecs.length)];
      name = `${type} ${spec}`;
      generic = type;
      category = ['Medical Supplies', 'Medical Equipment', 'First Aid'][Math.floor(Math.random() * 3)];
      desc = `High quality ${type.toLowerCase()}`;
      units = (type === 'Gloves' || type === 'Mask' || type === 'Test Strip') ? 50 : 1;
    }

    const cost = parseFloat((Math.random() * 50 + 1).toFixed(2));
    const price = parseFloat((cost * (1.2 + Math.random() * 0.5)).toFixed(2)); // 20-70% margin

    inventory.push({
      id: i.toString(),
      name: name,
      genericName: generic,
      category: category,
      price: price,
      costPrice: cost,
      stock: Math.floor(Math.random() * 150),
      expiryDate: new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24 * 365 * 2).toISOString().split('T')[0], // Next 2 years
      description: desc,
      barcode: `629${Math.floor(Math.random() * 10000000000)}`,
      internalCode: `${category.substring(0, 2).toUpperCase()}-${String(i).padStart(4, '0')}`,
      unitsPerPack: units
    });
  }

  return inventory;
};

const INITIAL_INVENTORY = generateInventory();

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: '1', name: 'PharmaDist Co', contactPerson: 'John Smith', phone: '+1234567890', email: 'john@pharmadist.com', address: '123 Supply St, Medical City' },
  { id: '2', name: 'Global Health', contactPerson: 'Sarah Connor', phone: '+0987654321', email: 'sarah@globalhealth.com', address: '456 Wellness Blvd, Tech Park' },
  { id: '3', name: 'MediCare Supplies', contactPerson: 'Dr. House', phone: '+1122334455', email: 'house@medicare.com', address: '789 Clinic Rd, Hospital Area' },
];

const THEMES: ThemeColor[] = [
  { name: 'Ocean', primary: 'cyan', hex: '#06b6d4' },
  { name: 'Royal', primary: 'violet', hex: '#8b5cf6' },
  { name: 'Emerald', primary: 'emerald', hex: '#10b981' },
  { name: 'Rose', primary: 'rose', hex: '#f43f5e' },
  { name: 'Amber', primary: 'amber', hex: '#f59e0b' },
];

const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'EN', label: 'English' },
  { code: 'AR', label: 'Arabic' },
];

import { ContextMenuProvider, useContextMenu } from './components/ContextMenu';

const GlobalContextMenuWrapper: React.FC<{ children: React.ReactNode, t: any, toggleTheme: () => void, toggleFullscreen: () => void }> = ({ children, t, toggleTheme, toggleFullscreen }) => {
    const { showMenu } = useContextMenu();
    
    return (
        <div 
            className="w-full h-full"
            onContextMenu={(e) => {
                if (e.defaultPrevented) return;
                e.preventDefault();
                showMenu(e.clientX, e.clientY, [
                    { label: t.global.actions.theme, icon: 'palette', action: toggleTheme },
                    { label: t.global.actions.fullscreen, icon: 'fullscreen', action: toggleFullscreen },
                    { separator: true },
                    { label: t.global.actions.reload, icon: 'refresh', action: () => window.location.reload() },
                    { label: t.global.actions.help, icon: 'help', action: () => alert('Help & Support\n\nContact support@pharmaflow.ai for assistance.') }
                ]);
            }}
        >
            {children}
        </div>
    );
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_view');
      return (saved as ViewState) || 'dashboard';
    }
    return 'dashboard';
  });

  // Initialize State from LocalStorage
  const [theme, setTheme] = useState<ThemeColor>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_theme');
      return saved ? JSON.parse(saved) : THEMES[0];
    }
    return THEMES[0];
  });

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_darkMode');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_language');
      return (saved as Language) || 'EN';
    }
    return 'EN';
  });

  // Apply theme system - updates CSS variables
  useTheme(theme.primary, darkMode);

  const [inventory, setInventory] = useState<Drug[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_inventory');
      // If saved inventory is small (old sample data), replace with new large generator
      if (saved) {
         const parsed = JSON.parse(saved);
         if (parsed.length > 5000) return parsed;
      }
      return INITIAL_INVENTORY;
    }
    return INITIAL_INVENTORY;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_sales');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_suppliers');
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    }
    return INITIAL_SUPPLIERS;
  });

  const [purchases, setPurchases] = useState<Purchase[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_purchases');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [returns, setReturns] = useState<Return[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_returns');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [tip, setTip] = useState<string>("Loading tip...");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string>('dashboard');
  
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

  const t = TRANSLATIONS[language];

  // Persist & Apply Effects
  useEffect(() => {
    localStorage.setItem('pharma_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('pharma_view', view);
  }, [view]);

  useEffect(() => {
    localStorage.setItem('pharma_darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('pharma_language', language);
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    localStorage.setItem('pharma_inventory', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('pharma_sales', JSON.stringify(sales));
  }, [sales]);

  useEffect(() => {
    localStorage.setItem('pharma_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('pharma_purchases', JSON.stringify(purchases));
  }, [purchases]);

  useEffect(() => {
    localStorage.setItem('pharma_returns', JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    // Static tips generator
    const tips = [
      "Hydration is key to health.",
      "Check expiry dates regularly.",
      "Organize stock by frequency.",
      "Monitor temperature for meds.",
      "Update software regularly.",
      "Double check prescriptions.",
      "Maintain a clean workspace.",
      "Review sales trends weekly."
    ];
    setTip(tips[Math.floor(Math.random() * tips.length)]);
  }, []);

  // Drug Management
  const handleAddDrug = (drug: Drug) => {
    setInventory([...inventory, drug]);
  };

  const handleUpdateDrug = (drug: Drug) => {
    setInventory(inventory.map(d => d.id === drug.id ? drug : d));
  };

  const handleDeleteDrug = (id: string) => {
    setInventory(inventory.filter(d => d.id !== id));
  };

  // Supplier Management
  const handleAddSupplier = (supplier: Supplier) => {
    setSuppliers([...suppliers, supplier]);
  };

  const handleUpdateSupplier = (supplier: Supplier) => {
    setSuppliers(suppliers.map(s => s.id === supplier.id ? supplier : s));
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(suppliers.filter(s => s.id !== id));
  };

  // Stock Management
  const handleRestock = (id: string, qty: number) => {
    setInventory(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, stock: d.stock + qty };
      }
      return d;
    }));
  };

  const handlePurchaseComplete = (purchase: Purchase) => {
    setPurchases([purchase, ...purchases]);
    
    // Update inventory stock and cost price
    setInventory(prev => prev.map(drug => {
      const purchasedItem = purchase.items.find(i => i.drugId === drug.id);
      if (purchasedItem) {
        return {
          ...drug,
          stock: drug.stock + purchasedItem.quantity,
          costPrice: purchasedItem.costPrice // Update latest cost price
        };
      }
      return drug;
    }));
  };

  const handleCompleteSale = (saleData: { items: CartItem[], customerName: string, globalDiscount: number, subtotal: number, total: number }) => {
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...saleData
    };
    
    // Update inventory with pack/unit logic
    setInventory(prev => prev.map(drug => {
      const soldItem = saleData.items.find(i => i.id === drug.id);
      if (soldItem) {
        let quantityToDeduct = soldItem.quantity;
        if (soldItem.isUnit && drug.unitsPerPack && drug.unitsPerPack > 0) {
           quantityToDeduct = soldItem.quantity / drug.unitsPerPack;
        }
        return { ...drug, stock: Math.max(0, drug.stock - quantityToDeduct) };
      }
      return drug;
    }));

    setSales([...sales, newSale]);
  };

  const handleProcessReturn = (returnData: Return) => {
    // Add return record
    setReturns([returnData, ...returns]);
    
    // Update sale record
    setSales(prev => prev.map(sale => {
      if (sale.id === returnData.saleId) {
        const existingReturns = sale.returnIds || [];
        const totalReturned = returns
          .filter(r => r.saleId === sale.id)
          .reduce((sum, r) => sum + r.totalRefund, 0) + returnData.totalRefund;
        
        // Track returned quantities per item
        const itemReturnedQuantities = { ...(sale.itemReturnedQuantities || {}) };
        returnData.items.forEach(item => {
          itemReturnedQuantities[item.drugId] = 
            (itemReturnedQuantities[item.drugId] || 0) + item.quantityReturned;
        });
        
        return {
          ...sale,
          hasReturns: true,
          returnIds: [...existingReturns, returnData.id],
          netTotal: sale.total - totalReturned,
          itemReturnedQuantities
        };
      }
      return sale;
    }));
    
    // Restore inventory
    setInventory(prev => prev.map(drug => {
      const returnedItem = returnData.items.find(i => i.drugId === drug.id);
      if (returnedItem) {
        let quantityToRestore = returnedItem.quantityReturned;
        
        // Convert units back to packs if necessary
        if (returnedItem.isUnit && drug.unitsPerPack && drug.unitsPerPack > 0) {
          quantityToRestore = returnedItem.quantityReturned / drug.unitsPerPack;
        }
        
        return {
          ...drug,
          stock: drug.stock + quantityToRestore
        };
      }
      return drug;
    }));
    
    // Show success notification
    setToast({
      message: `Return processed successfully. Refund: $${returnData.totalRefund.toFixed(2)}`,
      type: 'success'
    });
  };

  const SidebarContent = ({ isMobile = false }) => {
    return (
    <>

      <SidebarMenu 
        menuItems={PHARMACY_MENU}
        activeModule={activeModule}
        currentView={view}
        onNavigate={(viewId) => {
          setView(viewId as ViewState);
          setMobileMenuOpen(false);
        }}
        onViewChange={(viewId) => {
          setView(viewId as ViewState);
          setMobileMenuOpen(false);
        }}
        isMobile={isMobile}
        theme={theme.primary}
        translations={t}
        language={language}
      />


      {/* Dynamic Theme & Dark Mode Controls - Unified Block */}
      <div className="mt-auto space-y-4 pt-4">
        <div className="mx-2 mb-2 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Theme Selection */}
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.settings.theme}</span>
            <div className="flex gap-1.5">
              {THEMES.map(themeOption => (
                <button
                  key={themeOption.name}
                  onClick={() => setTheme(themeOption)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${theme.name === themeOption.name ? 'ring-2 ring-offset-1 ring-slate-300 dark:ring-slate-600 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'}`}
                  style={{ backgroundColor: themeOption.hex }}
                  title={themeOption.name}
                />
              ))}
            </div>
          </div>

          {/* Controls Row */}
          <div className="flex items-center gap-2">
            {/* Language Toggle */}
            <div className="flex-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg flex relative">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition-all z-10 ${
                    language === lang.code 
                      ? `text-${theme.primary}-600 bg-white dark:bg-slate-700 shadow-sm` 
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Dark Mode Toggle */}
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center transition-all ${darkMode ? `bg-slate-800 text-${theme.primary}-400 border border-slate-700` : `bg-slate-100 text-slate-500 hover:bg-slate-200`}`}
              title={t.settings.darkMode}
            >
              <span className="material-symbols-rounded text-[18px] transition-transform duration-500 rotate-0 dark:-rotate-180">
                {darkMode ? 'dark_mode' : 'light_mode'}
              </span>
            </button>
          </div>
        </div>
        
        <div className="px-4 pb-2 text-center text-[10px] text-slate-400">
          <p>{tip}</p>
        </div>
      </div>
    </>
    );
  };

  return (
    <ContextMenuProvider>
    <GlobalContextMenuWrapper 
        t={t} 
        toggleTheme={() => {
            const currentIndex = THEMES.findIndex(th => th.name === theme.name);
            const nextIndex = (currentIndex + 1) % THEMES.length;
            setTheme(THEMES[nextIndex]);
        }}
        toggleFullscreen={() => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen();
            } else {
                if (document.exitFullscreen) {
                    document.exitFullscreen();
                }
            }
        }}
    >
    <div 
      className="min-h-screen transition-colors duration-200"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      
      {/* Navbar */}
      <Navbar 
        menuItems={PHARMACY_MENU}
        activeModule={activeModule}
        onModuleChange={React.useCallback((moduleId: string) => {
          setActiveModule(moduleId);
          // Map module IDs to ViewState
          const viewMapping: Record<string, ViewState> = {
            'dashboard': 'dashboard',
            'inventory': 'inventory',
            'sales': 'pos',
            'purchase': 'purchases',
            'customers': 'dashboard',
            'prescriptions': 'dashboard',
            'finance': 'dashboard',
            'reports': 'dashboard',
            'hr': 'dashboard',
            'compliance': 'dashboard',
            'settings': 'dashboard',
          };
          const newView = viewMapping[moduleId] || 'dashboard';
          setView(newView);
        }, [])}
        theme={theme.primary}
        darkMode={darkMode}
        appTitle={t.appTitle}
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
        language={language}
      />

      {/* Main Layout: Sidebar + Content */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        {/* Desktop Sidebar */}
        <aside 
          className="hidden md:flex flex-col w-72 backdrop-blur-xl transition-all duration-300 ease-in-out"
          style={{
            borderRight: '1px solid var(--border-primary)',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60] flex md:hidden">
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
              onClick={() => setMobileMenuOpen(false)}
            ></div>
            {/* Panel */}
            <aside className="relative w-80 max-w-[85vw] flex flex-col bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto">
              {/* Mobile Module Selector */}
              <div className="p-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Modules</h3>
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">close</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {PHARMACY_MENU.map(module => (
                    <button
                      key={module.id}
                      onClick={() => {
                        setActiveModule(module.id);
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                        activeModule === module.id
                          ? `bg-${theme.primary}-100 dark:bg-${theme.primary}-900/30 text-${theme.primary}-700 dark:text-${theme.primary}-400`
                          : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <span className="material-symbols-rounded text-[20px]">{module.icon}</span>
                      <span className="text-[10px] font-medium text-center line-clamp-2">{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <SidebarContent isMobile={true} />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 h-full overflow-hidden relative">
        <div className="h-full max-w-7xl mx-auto p-4 md:p-8 overflow-y-auto scrollbar-hide">
          {view === 'dashboard' && (
             <Dashboard 
                inventory={inventory} 
                sales={sales}
                purchases={purchases} 
                color={theme.primary} 
                t={t.dashboard} 
                onRestock={handleRestock}
             />
          )}
          {view === 'inventory' && (
            <Inventory 
              inventory={inventory} 
              onAddDrug={handleAddDrug} 
              onUpdateDrug={handleUpdateDrug} 
              onDeleteDrug={handleDeleteDrug} 
              color={theme.primary}
              t={t.inventory}
            />
          )}
          {view === 'pos' && <POS inventory={inventory} onCompleteSale={handleCompleteSale} color={theme.primary} t={t.pos} />}
          {view === 'sales-history' && <SalesHistory sales={sales} returns={returns} onProcessReturn={handleProcessReturn} color={theme.primary} t={t.salesHistory} />}
          {view === 'suppliers' && (
             <Suppliers 
               suppliers={suppliers}
               onAddSupplier={handleAddSupplier}
               onUpdateSupplier={handleUpdateSupplier}
               onDeleteSupplier={handleDeleteSupplier}
               color={theme.primary}
               t={t.suppliers}
             />
          )}
          {view === 'purchases' && (
            <Purchases 
               inventory={inventory}
               suppliers={suppliers}
               purchases={purchases}
               onPurchaseComplete={handlePurchaseComplete}
               color={theme.primary}
               t={t.purchases}
            />
          )}
          {view === 'barcode-studio' && (
            <BarcodeStudio 
               inventory={inventory}
               color={theme.primary}
               t={t.barcodeStudio}
            />
          )}
          </div>
        </main>

       {/* Mobile Bottom Nav */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex justify-around p-3 z-50 overflow-x-auto">
          <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl shrink-0 ${view === 'dashboard' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-slate-400'}`}><span className="material-symbols-rounded">dashboard</span></button>
          <button onClick={() => setView('pos')} className={`p-2 rounded-xl shrink-0 ${view === 'pos' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-slate-400'}`}><span className="material-symbols-rounded">point_of_sale</span></button>
          <button onClick={() => setView('inventory')} className={`p-2 rounded-xl shrink-0 ${view === 'inventory' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-slate-400'}`}><span className="material-symbols-rounded">inventory_2</span></button>
          <button onClick={() => setView('purchases')} className={`p-2 rounded-xl shrink-0 ${view === 'purchases' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-slate-400'}`}><span className="material-symbols-rounded">shopping_cart_checkout</span></button>
        </div>
      </div>
    </div>

    {/* Toast Notifications */}
    {toast && (
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast(null)}
      />
    )}
    </GlobalContextMenuWrapper>
    </ContextMenuProvider>
    
  );
};

export default App;