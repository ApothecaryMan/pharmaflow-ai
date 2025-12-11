import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThemeColor, ViewState, Drug, Sale, CartItem, Language, Supplier, Purchase, PurchaseReturn, Return, Customer } from './types';
import { Toast } from './components/common/Toast';
import { TRANSLATIONS } from './i18n/translations';
import { PHARMACY_MENU } from './config/menuData';
import { SidebarMenu } from './components/layout/SidebarMenu';
import { SidebarContent } from './components/layout/SidebarContent';
import { Navbar } from './components/layout/Navbar';
import { PAGE_REGISTRY } from './config/pageRegistry';
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

  // Add some real-world examples for testing
  const REAL_DRUGS = [
    { name: 'Panadol Extra', generic: 'Paracetamol', form: 'Tablets', category: 'Painkillers' },
    { name: 'Panadol Advance', generic: 'Paracetamol', form: 'Tablets', category: 'Painkillers' },
    { name: 'Brufen 400', generic: 'Ibuprofen', form: 'Tablets', category: 'Painkillers' },
    { name: 'Amoxil', generic: 'Amoxicillin', form: 'Capsules', category: 'Antibiotics' },
    { name: 'Augmentin', generic: 'Amoxicillin + Clavulanic Acid', form: 'Tablets', category: 'Antibiotics' },
    { name: 'Cataflam', generic: 'Diclofenac Potassium', form: 'Tablets', category: 'Painkillers' },
    { name: 'Zyrtec', generic: 'Cetirizine', form: 'Tablets', category: 'Allergy' },
    { name: 'Claritin', generic: 'Loratadine', form: 'Tablets', category: 'Allergy' },
    { name: 'Ventolin', generic: 'Salbutamol', form: 'Inhaler', category: 'Respiratory' },
    { name: 'Glucophage', generic: 'Metformin', form: 'Tablets', category: 'Diabetes' },
    { name: 'Lipitor', generic: 'Atorvastatin', form: 'Tablets', category: 'Cardiovascular' },
    { name: 'Nexium', generic: 'Esomeprazole', form: 'Tablets', category: 'Digestive' },
    { name: 'Voltaren', generic: 'Diclofenac Sodium', form: 'Gel', category: 'Painkillers' },
    { name: 'Aspirin Protect', generic: 'Acetylsalicylic Acid', form: 'Tablets', category: 'Cardiovascular' },
    { name: 'Roaccutane', generic: 'Isotretinoin', form: 'Capsules', category: 'Skin Care' }
  ];

  REAL_DRUGS.forEach((drug, index) => {
    const cost = parseFloat((Math.random() * 50 + 1).toFixed(2));
    const price = parseFloat((cost * (1.2 + Math.random() * 0.5)).toFixed(2));
    
    inventory.push({
      id: `real-${index}`,
      name: drug.name,
      genericName: drug.generic,
      category: drug.category,
      price: price,
      costPrice: cost,
      stock: Math.floor(Math.random() * 200) + 50,
      expiryDate: new Date(Date.now() + Math.random() * 1000 * 60 * 60 * 24 * 365 * 2).toISOString().split('T')[0],
      description: `Original ${drug.name} (${drug.generic})`,
      barcode: `888${index.toString().padStart(9, '0')}`,
      internalCode: `REAL-${index.toString().padStart(4, '0')}`,
      unitsPerPack: 1,
      dosageForm: drug.form,
      activeIngredients: drug.generic.split(' + ').map(i => i.trim()),
    });
  });
  for (let i = 1; i <= 10000; i++) {
    const typeRoll = Math.random();
    let category = '';
    let name = '';
    let generic = '';
    let desc = '';
    let units = 1;
    let dosageForm: string | undefined;

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
      dosageForm = form;
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
      barcode: Math.floor(Math.random() * 1000000000000).toString(),
      internalCode: `INT-${i.toString().padStart(5, '0')}`,
      unitsPerPack: units,
      dosageForm: dosageForm,
      activeIngredients: [generic], // Use generic name as active ingredient for mock data
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

import { ContextMenuProvider, useContextMenu } from './components/common/ContextMenu';

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

  const [profileImage, setProfileImage] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pharma_profileImage');
    }
    return null;
  });

  const [textTransform, setTextTransform] = useState<'normal' | 'uppercase'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_textTransform');
      return (saved as 'normal' | 'uppercase') || 'normal';
    }
    return 'normal';
  });

  const [sidebarVisible, setSidebarVisible] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_sidebarVisible');
      return saved ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [hideInactiveModules, setHideInactiveModules] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_hideInactiveModules');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [navStyle, setNavStyle] = useState<1 | 2 | 3>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_navStyle');
      return (Number(saved) as 1 | 2 | 3) || 1;
    }
    return 1;
  });

  // Apply theme system - updates CSS variables
  useTheme(theme.primary, darkMode);

  // Apply text transform globally
  useEffect(() => {
    document.documentElement.style.setProperty('--text-transform', textTransform === 'uppercase' ? 'uppercase' : 'none');
    if (textTransform === 'uppercase') {
        document.body.classList.add('uppercase-mode');
    } else {
        document.body.classList.remove('uppercase-mode');
    }
    localStorage.setItem('pharma_textTransform', textTransform);
  }, [textTransform]);

  useEffect(() => {
    localStorage.setItem('pharma_hideInactiveModules', JSON.stringify(hideInactiveModules));
  }, [hideInactiveModules]);

  useEffect(() => {
    localStorage.setItem('pharma_navStyle', navStyle.toString());
  }, [navStyle]);

  const [inventory, setInventory] = useState<Drug[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_inventory');
      // If saved inventory is small (old sample data) or missing new fields, replace with new large generator
      if (saved) {
         const parsed = JSON.parse(saved);
         if (parsed.length > 5000 && parsed[0].dosageForm && parsed[0].activeIngredients) return parsed;
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

  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_purchase_returns');
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

  const [customers, setCustomers] = useState<Customer[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('pharma_customers');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  const [tip, setTip] = useState<string>("Loading tip...");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pharma_activeModule') || 'dashboard';
    }
    return 'dashboard';
  });
  
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
    localStorage.setItem('pharma_activeModule', activeModule);
  }, [activeModule]);

  useEffect(() => {
    localStorage.setItem('pharma_sidebarVisible', JSON.stringify(sidebarVisible));
  }, [sidebarVisible]);

  useEffect(() => {
    localStorage.setItem('pharma_language', language);
    document.documentElement.lang = language.toLowerCase();
    document.documentElement.dir = language === 'AR' ? 'rtl' : 'ltr';
  }, [language]);

  useEffect(() => {
    if (profileImage) {
      localStorage.setItem('pharma_profileImage', profileImage);
    } else {
      localStorage.removeItem('pharma_profileImage');
    }
  }, [profileImage]);

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
    localStorage.setItem('pharma_purchase_returns', JSON.stringify(purchaseReturns));
  }, [purchaseReturns]);

  useEffect(() => {
    localStorage.setItem('pharma_returns', JSON.stringify(returns));
  }, [returns]);

  useEffect(() => {
    localStorage.setItem('pharma_customers', JSON.stringify(customers));
  }, [customers]);

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

  // --- Cross-Tab Synchronization ---
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'pharma_inventory' && e.newValue) {
            setInventory(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_sales' && e.newValue) {
            setSales(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_customers' && e.newValue) {
            setCustomers(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_returns' && e.newValue) {
            setReturns(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_purchases' && e.newValue) {
            setPurchases(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_purchase_returns' && e.newValue) {
            setPurchaseReturns(JSON.parse(e.newValue));
        } else if (e.key === 'pharma_suppliers' && e.newValue) {
            setSuppliers(JSON.parse(e.newValue));
        }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Drug Management
  const handleAddDrug = (drug: Drug) => {
    setInventory(prev => [...prev, drug]);
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

  // Customer Management
  const handleAddCustomer = (customer: Customer) => {
    setCustomers([...customers, customer]);
    setToast({ message: 'Customer added successfully', type: 'success' });
  };

  const handleUpdateCustomer = (customer: Customer) => {
    setCustomers(customers.map(c => c.id === customer.id ? customer : c));
    setToast({ message: 'Customer updated successfully', type: 'success' });
  };

  const handleDeleteCustomer = (id: string) => {
    setCustomers(customers.filter(c => c.id !== id));
    setToast({ message: 'Customer removed successfully', type: 'success' });
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
    
    // Only update inventory if purchase is completed immediately
    if (purchase.status === 'completed') {
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
    } else {
        setToast({ message: 'Purchase Order Saved as Pending', type: 'info' });
    }
  };

  const handleApprovePurchase = (purchaseId: string, approverName: string) => {
      const purchase = purchases.find(p => p.id === purchaseId);
      if (!purchase) return;

      // 1. Update Purchase Status
      setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'completed', approvalDate: new Date().toISOString(), approvedBy: approverName } : p));

      // 2. Update Inventory
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

      setToast({ message: `PO #${purchase.invoiceId} Approved Successfully`, type: 'success' });
  };

  const handleRejectPurchase = (purchaseId: string, reason?: string) => {
      // For now we just mark as rejected. user might want to delete or keep history.
      // Given 'rejected' status exists, we keep it.
      setPurchases(prev => prev.map(p => p.id === purchaseId ? { ...p, status: 'rejected' } : p));
      setToast({ message: 'Purchase Order Rejected', type: 'info' });
  };

  const handleCompleteSale = (saleData: { items: CartItem[], customerName: string, customerCode?: string, paymentMethod: 'cash' | 'visa', saleType?: 'walk-in' | 'delivery', deliveryFee?: number, globalDiscount: number, subtotal: number, total: number }) => {
    // Generate Serial ID (simple increment based on count)
    const serialId = (100001 + sales.length).toString();

    const newSale: Sale = {
      id: serialId,
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

    // Calculate Loyalty Points
    
    // 1. Total Purchase Rewards
    let totalRate = 0;
    if (saleData.total > 20000) totalRate = 0.05;
    else if (saleData.total > 10000) totalRate = 0.04;
    else if (saleData.total > 5000) totalRate = 0.03;
    else if (saleData.total > 1000) totalRate = 0.02;
    else if (saleData.total > 100) totalRate = 0.01;
    
    // Keep decimal precision for total points
    const totalPoints = saleData.total * totalRate;

    // 2. Single-Product Rewards
    let itemPoints = 0;
    saleData.items.forEach(item => {
      let itemRate = 0;
      // Use effective price (considering units)
      let price = item.price;
      if (item.isUnit && item.unitsPerPack) {
         price = item.price / item.unitsPerPack;
      }
      
      // Check thresholds based on Unit Price
      if (price > 20000) itemRate = 0.15;
      else if (price > 10000) itemRate = 0.12;
      else if (price > 5000) itemRate = 0.10;
      else if (price > 1000) itemRate = 0.05;
      else if (price > 500) itemRate = 0.03;
      else if (price > 100) itemRate = 0.02;

      if (itemRate > 0) {
        // Keep decimal precision for item points
        itemPoints += price * item.quantity * itemRate;
      }
    });

    // Round the final result to 1 decimal place or nearest integer as preferred. 
    // User example showed 1972.4, so we'll keep 1 decimal place for accuracy in state, 
    // but maybe display as integer or float. Let's store as float for now.
    const rawPoints = totalPoints + itemPoints;
    const pointsEarned = parseFloat(rawPoints.toFixed(1)); 

    console.log('DEBUG: Points Calculation', { 
      total: saleData.total, 
      totalRate, 
      totalPoints, 
      itemPoints, 
      final: pointsEarned 
    });

    // Update customer points if a customer is associated
    if (saleData.customerCode || saleData.customerName !== 'Guest Customer') {
      setCustomers(prev => prev.map(c => {
        if ((saleData.customerCode && (c.code === saleData.customerCode || c.serialId?.toString() === saleData.customerCode)) || 
            (!saleData.customerCode && c.name === saleData.customerName)) {
          console.log('DEBUG: Updating Customer Points', { name: c.name, oldPoints: c.points, newPoints: (c.points || 0) + pointsEarned });
          return { ...c, points: (c.points || 0) + pointsEarned };
        }
        return c;
      }));
    }

    setSales(prev => [...prev, newSale]);
    
    // Show success notification
    setToast({
      message: `Order #${serialId} completed! ${pointsEarned > 0 ? `Earned ${pointsEarned} points.` : ''}`,
      type: 'success'
    });
  };

  const handleProcessReturn = (returnData: Return) => {
    // Add return record
    setReturns(prev => [returnData, ...prev]);
    
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

  // Enrich customers with sales data (Total Purchases & Last Visit)
  const enrichedCustomers = useMemo(() => {
    return customers.map(customer => {
      const customerSales = sales.filter(s => 
        (s.customerCode && (s.customerCode === customer.code || s.customerCode === customer.serialId?.toString())) ||
        (!s.customerCode && s.customerName === customer.name)
      );

      const totalPurchases = customerSales.reduce((sum, sale) => sum + (sale.netTotal ?? sale.total), 0);
      
      // Find latest sale date
      let lastVisit = customer.lastVisit;
      if (customerSales.length > 0) {
        const sortedSales = [...customerSales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        lastVisit = sortedSales[0].date;
      }

      // console.log('DEBUG: Enriched Customer', { name: customer.name, points: customer.points, totalPurchases });

      return {
        ...customer,
        totalPurchases,
        lastVisit
      };
    });
  }, [customers, sales]);

  const [dashboardSubView, setDashboardSubView] = useState<string>('dashboard');

  const handleViewChange = useCallback((viewId: string) => {
    if (activeModule === 'dashboard') {
      // Check if this viewId exists in PAGE_REGISTRY (meaning it's a real page)
      // If yes, navigate to it. If no, it's a dashboard sub-view.
      if (PAGE_REGISTRY[viewId]) {
        setView(viewId as ViewState);
      } else {
        setDashboardSubView(viewId);
        setView('dashboard');
      }
    } else {
      setView(viewId as ViewState);
    }
    setMobileMenuOpen(false);
  }, [activeModule]);

  const handleNavigate = useCallback((viewId: string) => {
    setView(viewId as ViewState);
    setMobileMenuOpen(false);
  }, []);

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
      className="min-h-screen transition-colors duration-200 select-none"
      style={{ 
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)'
      }}
      dir={language === 'AR' ? 'rtl' : 'ltr'}
    >
      
      {/* Navbar */}
      <Navbar 
        menuItems={useMemo(() => !hideInactiveModules ? PHARMACY_MENU : PHARMACY_MENU.filter(m => m.hasPage !== false), [hideInactiveModules])}
        activeModule={activeModule}
        onModuleChange={React.useCallback((moduleId: string) => {
          setActiveModule(moduleId);
          // Map module IDs to ViewState
          const viewMapping: Record<string, ViewState> = {
            'dashboard': 'dashboard',
            'inventory': 'inventory',
            'sales': 'pos',
            'purchase': 'purchases',
            'customers': 'customers',
            'customer-overview': 'customer-overview',
            'prescriptions': 'dashboard',
            'finance': 'dashboard',
            'reports': 'dashboard',
            'hr': 'dashboard',
            'compliance': 'dashboard',
            'settings': 'dashboard',
            'return-history': 'return-history',
          };
          const newView = viewMapping[moduleId] || 'dashboard';
          setView(newView);
        }, [])}
        theme={theme.primary}
        darkMode={darkMode}
        appTitle={t.appTitle}
        onMobileMenuToggle={() => setMobileMenuOpen(true)}
        language={language}
        setTheme={setTheme}
        setDarkMode={setDarkMode}
        setLanguage={setLanguage}
        availableThemes={THEMES}
        availableLanguages={LANGUAGES}
        currentTheme={theme}
        profileImage={profileImage}
        setProfileImage={setProfileImage}
        textTransform={textTransform}
        setTextTransform={setTextTransform}
        onLogoClick={() => setSidebarVisible(!sidebarVisible)}
        hideInactiveModules={hideInactiveModules}
        setHideInactiveModules={setHideInactiveModules}
        navStyle={navStyle}
        setNavStyle={setNavStyle}
        currentView={activeModule === 'dashboard' && view === 'dashboard' ? dashboardSubView : view}
        onNavigate={handleViewChange}
      />
      {console.log('Current View:', view)}

      {/* Main Layout: Sidebar + Content */}
      <div className="flex h-[calc(100vh-64px)] overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Desktop Sidebar */}
        <aside 
          className={`hidden ${sidebarVisible && navStyle !== 2 ? 'md:flex' : ''} flex-col w-72 backdrop-blur-xl transition-all duration-300 ease-in-out`}
          style={{
            backgroundColor: 'var(--bg-primary)'
          }}
        >
          <SidebarContent 
            menuItems={useMemo(() => !hideInactiveModules ? PHARMACY_MENU : PHARMACY_MENU.filter(m => m.hasPage !== false), [hideInactiveModules])}
            activeModule={activeModule}
            view={view}
            dashboardSubView={dashboardSubView}
            onNavigate={handleNavigate}
            onViewChange={handleViewChange}
            theme={theme}
            t={t}
            language={language}
            tip={tip}
            hideInactiveModules={hideInactiveModules}
          />
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
            <aside className="relative w-80 max-w-[85vw] flex flex-col bg-white dark:bg-gray-900 h-full shadow-2xl overflow-y-auto">
              {/* Mobile Module Selector */}
              <div className="p-4 border-b border-gray-200 dark:border-800">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300">Modules</h3>
                  <button 
                    onClick={() => setMobileMenuOpen(false)} 
                    className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-rounded text-[20px]">close</span>
                  </button>
                </div>
                 <div className="grid grid-cols-2 gap-2">
                  {(hideInactiveModules ? PHARMACY_MENU.filter(m => m.hasPage !== false) : PHARMACY_MENU).map(module => (
                    <button
                      key={module.id}
                      onClick={() => {
                        setActiveModule(module.id);
                      }}
                      className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${
                        activeModule === module.id
                          ? `bg-${theme.primary}-100 dark:bg-${theme.primary}-900/30 text-${theme.primary}-700 dark:text-${theme.primary}-400`
                          : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      <span className="material-symbols-rounded text-[20px]">{module.icon}</span>
                      <span className="text-[10px] font-medium text-center line-clamp-2">{module.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <SidebarContent 
                menuItems={!hideInactiveModules ? PHARMACY_MENU : PHARMACY_MENU.filter(m => m.hasPage !== false)}
                activeModule={activeModule}
                view={view}
                dashboardSubView={dashboardSubView}
                onNavigate={handleNavigate}
                onViewChange={handleViewChange}
                isMobile={true}
                theme={theme}
                t={t}
                language={language}
                tip={tip}
                hideInactiveModules={hideInactiveModules}
              />
            </aside>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 h-full overflow-hidden relative rounded-tl-3xl rounded-tr-3xl border-t border-l border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 shadow-inner">
        <div className={`h-full overflow-y-auto scrollbar-hide ${view === 'pos' || view === 'purchases' ? 'p-2' : 'max-w-7xl mx-auto p-4 md:p-8'}`}>
          {/* Dynamic Page Rendering - Automatically handles all pages from registry */}
          {(() => {
            const pageConfig = PAGE_REGISTRY[view];
            
            if (!pageConfig) {
              return (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <span className="material-symbols-rounded text-6xl text-gray-300 dark:text-gray-600 mb-4 block">error</span>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400">Page not found</p>
                  </div>
                </div>
              );
            }
            
            const PageComponent = pageConfig.component;
            
            // Build props object based on required props
            const props: any = {};
            
            // Always include these common props
            props.color = theme.primary;
            props.t = t;
            props.language = language;
            
            // Conditionally add props based on page requirements
            const requiredProps = pageConfig.requiredProps || [];
            
            if (requiredProps.includes('sales')) props.sales = sales;
            if (requiredProps.includes('inventory')) props.inventory = inventory;
            if (requiredProps.includes('customers')) props.customers = enrichedCustomers;
            if (requiredProps.includes('products')) props.products = inventory;
            if (requiredProps.includes('suppliers')) props.suppliers = suppliers;
            if (requiredProps.includes('purchases')) props.purchases = purchases;
            if (requiredProps.includes('purchaseReturns')) props.purchaseReturns = purchaseReturns;
            if (requiredProps.includes('returns')) props.returns = returns;
            if (requiredProps.includes('drugs')) props.drugs = inventory;
            
            // Handler functions
            if (requiredProps.includes('setInventory')) props.setInventory = setInventory;
            if (requiredProps.includes('setDrugs')) props.setDrugs = setInventory;
            if (requiredProps.includes('setPurchases')) props.setPurchases = setPurchases;
            if (requiredProps.includes('setPurchaseReturns')) props.setPurchaseReturns = setPurchaseReturns;
            if (requiredProps.includes('onAddDrug')) props.onAddDrug = handleAddDrug;
            if (requiredProps.includes('onUpdateDrug')) props.onUpdateDrug = handleUpdateDrug;
            if (requiredProps.includes('onDeleteDrug')) props.onDeleteDrug = handleDeleteDrug;
            if (requiredProps.includes('onCompleteSale')) props.onCompleteSale = handleCompleteSale;
            if (requiredProps.includes('onProcessReturn')) props.onProcessReturn = handleProcessReturn;
            if (requiredProps.includes('onAddCustomer')) props.onAddCustomer = handleAddCustomer;
            if (requiredProps.includes('onUpdateCustomer')) props.onUpdateCustomer = handleUpdateCustomer;
            if (requiredProps.includes('onDeleteCustomer')) props.onDeleteCustomer = handleDeleteCustomer;
            if (requiredProps.includes('setSuppliers')) props.setSuppliers = setSuppliers;
            if (requiredProps.includes('onAddSupplier')) props.onAddSupplier = handleAddSupplier;
            if (requiredProps.includes('onUpdateSupplier')) props.onUpdateSupplier = handleUpdateSupplier;
            if (requiredProps.includes('onDeleteSupplier')) props.onDeleteSupplier = handleDeleteSupplier;
            if (requiredProps.includes('onCompletePurchase')) props.onPurchaseComplete = handlePurchaseComplete;
            if (requiredProps.includes('onApprovePurchase')) props.onApprovePurchase = handleApprovePurchase;
            if (requiredProps.includes('onRejectPurchase')) props.onRejectPurchase = handleRejectPurchase;
            if (requiredProps.includes('onViewChange')) props.onViewChange = handleViewChange;
            if (requiredProps.includes('onAddProduct')) props.onAddProduct = () => setView('add-product');
            if (requiredProps.includes('onRestock')) props.onRestock = handleRestock;
            
            // Special handling for specific pages
            if (view === 'dashboard') {
              props.t = t.dashboard;
            } else if (view === 'inventory') {
              props.t = t.inventory;
            } else if (view === 'pos') {
              props.t = t.pos;
            } else if (view === 'sales-history') {
              props.t = t.salesHistory;
              props.datePickerTranslations = t.global.datePicker;
            } else if (view === 'return-history') {
              props.t = t.returnHistory;
              props.datePickerTranslations = t.global.datePicker;
            } else if (view === 'suppliers') {
              props.t = t.suppliers;
            } else if (view === 'purchases') {
              props.t = t.purchases;
            } else if (view === 'barcode-studio') {
              props.t = t.barcodeStudio;
            } else if (view === 'customers') {
              props.t = t.customers;
            } else if (view === 'customer-overview') {
              props.t = t.customerOverview;
            } else if (view === 'add-product') {
              props.t = t.inventory;
              props.initialMode = 'add';
            }
            
            return <PageComponent {...props} />;
          })()}
          </div>
        </main>

       {/* Mobile Bottom Nav */}
       <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex justify-around p-3 z-50 overflow-x-auto">
          <button onClick={() => setView('dashboard')} className={`p-2 rounded-xl shrink-0 ${view === 'dashboard' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}><span className="material-symbols-rounded">dashboard</span></button>
          <button onClick={() => setView('pos')} className={`p-2 rounded-xl shrink-0 ${view === 'pos' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}><span className="material-symbols-rounded">point_of_sale</span></button>
          <button onClick={() => setView('inventory')} className={`p-2 rounded-xl shrink-0 ${view === 'inventory' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}><span className="material-symbols-rounded">inventory_2</span></button>
          <button onClick={() => setView('purchases')} className={`p-2 rounded-xl shrink-0 ${view === 'purchases' ? `bg-${theme.primary}-100 text-${theme.primary}-700` : 'text-gray-400'}`}><span className="material-symbols-rounded">shopping_cart_checkout</span></button>
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