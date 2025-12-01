import React, { useState, useEffect } from 'react';
import { ThemeColor, ViewState, Drug, Sale, CartItem, Language, Supplier, Purchase } from './types';
import { Inventory } from './components/Inventory';
import { POS } from './components/POS';
import { Dashboard } from './components/Dashboard';
import { SalesHistory } from './components/SalesHistory';
import { Suppliers } from './components/Suppliers';
import { Purchases } from './components/Purchases';
import { BarcodeStudio } from './components/BarcodeStudio';
import { TRANSLATIONS } from './translations';

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

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('dashboard');

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

  const [tip, setTip] = useState<string>("Loading tip...");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const t = TRANSLATIONS[language];

  // Persist & Apply Effects
  useEffect(() => {
    localStorage.setItem('pharma_theme', JSON.stringify(theme));
  }, [theme]);

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

  const NavItem = ({ id, icon, label }: { id: ViewState, icon: string, label: string }) => (
    <button
      onClick={() => {
        setView(id);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center transition-all duration-300 group
        ${isSidebarCollapsed && !mobileMenuOpen
          ? 'w-12 h-12 justify-center rounded-2xl mx-auto' 
          : 'w-full px-6 py-4 gap-4 rounded-full'}
        ${view === id 
        ? `bg-${theme.primary}-100 dark:bg-${theme.primary}-900/40 text-${theme.primary}-900 dark:text-${theme.primary}-100 font-bold` 
        : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
      `}
      title={isSidebarCollapsed && !mobileMenuOpen ? label : ''}
    >
      <span className={`material-symbols-rounded text-2xl group-hover:scale-110 transition-transform ${view === id ? 'icon-filled' : ''}`}>{icon}</span>
      {(!isSidebarCollapsed || mobileMenuOpen) && <span className="text-sm tracking-wide whitespace-nowrap">{label}</span>}
    </button>
  );

  const SidebarContent = ({ isMobile = false }) => {
    const collapsed = isSidebarCollapsed && !isMobile;
    
    return (
    <>
      <div className={`mb-8 flex items-center ${collapsed ? 'justify-center flex-col gap-4' : 'justify-between ps-4 pe-4 md:pe-0'}`}>
        <div className={`flex items-center gap-3 ${collapsed ? 'flex-col' : ''}`}>
          <div className={`w-10 h-10 rounded-xl bg-${theme.primary}-600 flex items-center justify-center shadow-lg shadow-${theme.primary}-500/30 shrink-0`}>
            <span className="material-symbols-rounded text-white">local_pharmacy</span>
          </div>
          {!collapsed && (
             <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-slate-100 animate-fade-in whitespace-nowrap">{t.appTitle}</h1>
          )}
        </div>
        
        {/* Desktop Toggle */}
        {!isMobile && (
             <button 
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                className="hidden md:flex p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 transition-colors"
             >
                <span className="material-symbols-rounded rtl:rotate-180">
                    {isSidebarCollapsed ? 'last_page' : 'first_page'} 
                </span>
             </button>
        )}

        {/* Mobile Close */}
        {isMobile && (
          <button 
            onClick={() => setMobileMenuOpen(false)} 
            className="md:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <span className="material-symbols-rounded">close</span>
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 w-full overflow-y-auto max-h-[calc(100vh-300px)] scrollbar-hide">
        <NavItem id="dashboard" icon="dashboard" label={t.nav.dashboard} />
        <NavItem id="pos" icon="point_of_sale" label={t.nav.pos} />
        <NavItem id="inventory" icon="inventory_2" label={t.nav.inventory} />
        <NavItem id="purchases" icon="shopping_cart_checkout" label={t.nav.purchases} />
        <NavItem id="sales-history" icon="receipt_long" label={t.nav.salesHistory} />
        <NavItem id="suppliers" icon="local_shipping" label={t.nav.suppliers} />
        <NavItem id="barcode-studio" icon="qr_code_2" label={t.nav.barcodeStudio} />
      </nav>

      {/* Dynamic Theme & Dark Mode Controls - Unified Block */}
      <div className={`mt-auto space-y-4 pt-4 ${collapsed ? 'flex flex-col items-center' : ''}`}>
        
        {!collapsed ? (
            <div className="p-4 rounded-3xl bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 shadow-sm">
                <p className="text-xs font-bold text-slate-400 uppercase mb-3 ms-1">{t.settings.appearance}</p>
                
                {/* Theme Colors */}
                <div className="flex justify-between px-1 mb-4">
                    {THEMES.map(themeOption => (
                    <button
                        key={themeOption.name}
                        onClick={() => setTheme(themeOption)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform hover:scale-110 ${theme.name === themeOption.name ? 'border-slate-600 dark:border-white scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: themeOption.hex }}
                        title={themeOption.name}
                    />
                    ))}
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-700 my-3"></div>

                {/* Language & Dark Mode */}
                <div className="flex items-center gap-2">
                     <div className="flex-1 bg-slate-200 dark:bg-slate-900/50 p-1 rounded-xl flex">
                        {LANGUAGES.map(lang => (
                        <button
                            key={lang.code}
                            onClick={() => setLanguage(lang.code)}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            language === lang.code 
                            ? `bg-white dark:bg-slate-700 text-${theme.primary}-600 shadow-sm` 
                            : 'text-slate-500 dark:text-slate-400'
                            }`}
                        >
                            {lang.label}
                        </button>
                        ))}
                    </div>

                    <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-colors ${darkMode ? `bg-${theme.primary}-600 text-white` : 'bg-slate-300 text-slate-600'}`}
                    >
                        <span className="material-symbols-rounded text-[20px]">
                            {darkMode ? 'dark_mode' : 'light_mode'}
                        </span>
                    </button>
                </div>
            </div>
        ) : (
            /* Collapsed Settings */
            <div className="flex flex-col gap-3 items-center w-full pb-4">
                 <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${darkMode ? `bg-${theme.primary}-600 text-white` : 'bg-slate-200 text-slate-600'}`}
                    title={t.settings.darkMode}
                  >
                    <span className="material-symbols-rounded text-[20px]">
                        {darkMode ? 'dark_mode' : 'light_mode'}
                    </span>
                  </button>

                  <button
                    onClick={() => setLanguage(language === 'EN' ? 'AR' : 'EN')}
                    className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    title={t.settings.language}
                  >
                    {language === 'EN' ? 'AR' : 'EN'}
                  </button>
            </div>
        )}
        
        {!collapsed && (
            <div className={`px-4 pb-2 text-center text-[10px] text-slate-400`}>
                <p>{tip}</p>
            </div>
        )}
      </div>
    </>
    );
  };

  return (
    <div className={`flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-500`} dir={language === 'AR' ? 'rtl' : 'ltr'}>
      
      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col p-6 border-e border-slate-200 dark:border-slate-800/50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl z-10 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'w-[88px]' : 'w-80'}`}>
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
          <aside className="relative w-80 max-w-[85vw] flex flex-col p-6 bg-white dark:bg-slate-900 h-full shadow-2xl overflow-y-auto">
             <SidebarContent isMobile={true} />
          </aside>
        </div>
      )}

      {/* Mobile Header (visible only on small screens) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-50">
         <div className="flex items-center gap-2">
            <span className={`material-symbols-rounded text-${theme.primary}-600`}>local_pharmacy</span>
            <span className="font-bold text-slate-900 dark:text-white">{t.appTitle}</span>
         </div>
         <button onClick={() => setMobileMenuOpen(true)} className="p-2 text-slate-600 dark:text-slate-300">
            <span className="material-symbols-rounded">menu</span>
         </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden relative pt-16 md:pt-0">
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
          {view === 'sales-history' && <SalesHistory sales={sales} color={theme.primary} t={t.salesHistory} />}
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
  );
};

export default App;