import React, {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useContextMenu } from "../common/ContextMenu";
import { Drug, CartItem, Customer, Language, Shift } from "../../types";

import { useExpandingDropdown } from "../../hooks/useExpandingDropdown";
import { getCategories, getProductTypes, getLocalizedCategory, getLocalizedProductType } from "../../data/productCategories";
import { getLocationName } from "../../data/locations";
import { usePOSTabs } from "../../hooks/usePOSTabs";

import { useLongPress } from "../../hooks/useLongPress";
import { useSmartDirection } from "../common/SmartInputs";
import { SearchInput } from "../common/SearchInput";
import { SegmentedControl } from "../common/SegmentedControl";
import { TabBar } from "../layout/TabBar";
import { createSearchRegex, parseSearchTerm } from "../../utils/searchUtils";
import {
  generateInvoiceHTML,
  InvoiceTemplateOptions,
} from "../sales/InvoiceTemplate";
import { Sale } from "../../types"; // Ensure Sale is imported
import { ExpandingDropdown, ExpandingDropdownProps } from "../common/ExpandingDropdown";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  createColumnHelper,
  flexRender,
  ColumnDef,
} from "@tanstack/react-table";
import { TanStackTable } from "../common/TanStackTable"; // IMPORTED
import { CARD_MD, CARD_LG } from "../../utils/themeStyles";
import { Modal } from "../common/Modal";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { TRANSLATIONS } from "../../i18n/translations";
import { usePosSounds } from "../../components/common/hooks/usePosSounds";
import { usePosShortcuts } from "../../components/common/hooks/usePosShortcuts";
import { SortableCartItem } from "../sales/SortableCartItem";

// --- Main POS Component ---
interface POSProps {
  inventory: Drug[];
  onCompleteSale: (saleData: {
    items: CartItem[];
    customerName: string;
    customerCode?: string;
    customerPhone?: string;
    customerAddress?: string;
    customerStreetAddress?: string;
    paymentMethod: "cash" | "visa";
    saleType?: "walk-in" | "delivery";
    deliveryFee?: number;
    globalDiscount: number;
    subtotal: number;
    total: number;
  }) => void;
  color: string;
  t: typeof TRANSLATIONS.EN.pos;
  customers: Customer[];
  language?: Language;
  darkMode: boolean; // Added
}

export const POSTest: React.FC<POSProps> = ({
  inventory,
  onCompleteSale,
  color,
  t,
  customers,
  language = "EN",
  darkMode,
}) => {
  const { showMenu } = useContextMenu();
  const isRTL = (t as any).direction === 'rtl' || language === 'AR' || (language as any) === 'ar';
  const currentLang = isRTL ? 'ar' : 'en';

  // Multi-tab system
  const {
    tabs,
    activeTab,
    activeTabId,
    addTab,
    removeTab,
    switchTab,
    updateTab,
    renameTab,
    togglePin,
    reorderTabs,
    maxTabs,
  } = usePOSTabs();

  // Use active tab's state
  const cart = activeTab?.cart || [];
  const setCart = useCallback(
    (newCart: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
      const updatedCart =
        typeof newCart === "function" ? newCart(cart) : newCart;
      updateTab(activeTabId, { cart: updatedCart });
    },
    [cart, activeTabId, updateTab]
  );

  // Derived state: Group cart items by Drug ID (Visual Merging)
  const mergedCartItems = useMemo(() => {
    const map = new Map<
      string,
      { pack?: CartItem; unit?: CartItem; order: number }
    >();
    cart.forEach((item, index) => {
      if (!map.has(item.id)) {
        map.set(item.id, { order: index });
      }
      const entry = map.get(item.id)!;
      if (item.isUnit) entry.unit = item;
      else entry.pack = item;
    });
    return Array.from(map.values()).map((entry) => ({
      id: (entry.pack || entry.unit)!.id,
      pack: entry.pack,
      unit: entry.unit,
      common: (entry.pack || entry.unit)!,
    }));
  }, [cart]);

  const customerName = activeTab?.customerName || "";
  const setCustomerName = useCallback(
    (name: string) => {
      updateTab(activeTabId, { customerName: name });
    },
    [activeTabId, updateTab]
  );

  const globalDiscount = activeTab?.discount || 0;
  const setGlobalDiscount = useCallback(
    (discount: number) => {
      updateTab(activeTabId, { discount });
    },
    [activeTabId, updateTab]
  );

  // Rest of the state remains the same
  // Use active tab's search query
  const search = activeTab?.searchQuery || "";
  const setSearch = useCallback(
    (query: string | ((prev: string) => string)) => {
      const newQuery = typeof query === "function" ? query(search) : query;
      updateTab(activeTabId, { searchQuery: newQuery });
    },
    [search, activeTabId, updateTab]
  );
  // Customer Search State
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);

  // Hook for Customer Search Navigation
  const customerDropdownHook = useExpandingDropdown<Customer>({
    items: filteredCustomers,
    selectedItem: filteredCustomers[highlightedCustomerIndex],
    isOpen: showCustomerDropdown,
    onToggle: () => setShowCustomerDropdown((prev) => !prev),
    onSelect: (customer) => {
      const idx = filteredCustomers.indexOf(customer);
      if (idx !== -1) setHighlightedCustomerIndex(idx);
    },
    keyExtractor: (c) => c.id,
    onEnter: () => {
      if (showCustomerDropdown && filteredCustomers.length > 0) {
        handleCustomerSelect(filteredCustomers[highlightedCustomerIndex]);
      }
    },
    preventDefaultOnSpace: false,
    onEscape: () => setShowCustomerDropdown(false),
  });

  // Enhanced Customer UX State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null
  );
  const [showCodeDropdown, setShowCodeDropdown] = useState(false);
  const [filteredByCode, setFilteredByCode] = useState<Customer[]>([]);
  // Selected category state key: 'All', 'Medicine', 'Cosmetics', 'Non-Medicine'

  const customerCode = activeTab?.customerCode || "";
  const setCustomerCode = useCallback(
    (code: string) => {
      updateTab(activeTabId, { customerCode: code });
    },
    [activeTabId, updateTab]
  );
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "visa">("cash");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [viewingDrug, setViewingDrug] = useState<Drug | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );
  const [selectedUnits, setSelectedUnits] = useState<
    Record<string, "pack" | "unit">
  >({});
  const [openUnitDropdown, setOpenUnitDropdown] = useState<string | null>(null);
  const [selectedBatches, setSelectedBatches] = useState<
    Record<string, string>
  >({}); // drugId -> batchId
  const [openBatchDropdown, setOpenBatchDropdown] = useState<string | null>(
    null
  );
  const [activeIndex, setActiveIndex] = useState(0); // For grid navigation
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Global Keydown Listener for Scanner
  // Keyboard Shortcuts & Sounds
  const { playBeep, playError, playSuccess, playClick } = usePosSounds();
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Reset highlight when items change
  useEffect(() => {
    if (mergedCartItems.length > 0 && highlightedIndex === -1) {
      setHighlightedIndex(0);
    } else if (mergedCartItems.length === 0) {
      setHighlightedIndex(-1);
    } else if (highlightedIndex >= mergedCartItems.length) {
      setHighlightedIndex(mergedCartItems.length - 1);
    }
  }, [mergedCartItems.length]);



  // Global Keydown (Simple Alphanumeric for Scanner / Search Focus)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" ||
        document.activeElement?.tagName === "TEXTAREA"
      ) {
        return;
      }
      // Capture simple alphanumeric for search focus
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "out_of_stock"
  >("in_stock");

  // Shift validation - check if there's an open shift
  const [hasOpenShift, setHasOpenShift] = useState<boolean>(true);

  useEffect(() => {
    const checkShiftStatus = () => {
      try {
        const savedShifts = localStorage.getItem("pharma_shifts");
        if (!savedShifts) {
          setHasOpenShift(false);
          return;
        }
        const allShifts: Shift[] = JSON.parse(savedShifts);
        const openShift = allShifts.find((s) => s.status === "open");
        setHasOpenShift(!!openShift);
      } catch {
        setHasOpenShift(false);
      }
    };

    // Check on mount
    checkShiftStatus();

    // Listen for storage changes (when shift is opened/closed from CashRegister)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "pharma_shifts") {
        checkShiftStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);
  const [activeFilterDropdown, setActiveFilterDropdown] = useState<
    "category" | "stock" | null
  >(null);

  // Sidebar Resize Logic
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("pos_sidebar_width");
      return saved ? parseInt(saved) : 350;
    }
    return 350;
  });

  useEffect(() => {
    localStorage.setItem("pos_sidebar_width", sidebarWidth.toString());
  }, [sidebarWidth]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const startResizing = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      isResizing.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    []
  );

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const resize = useCallback((e: MouseEvent | TouchEvent) => {
    if (isResizing.current && sidebarRef.current) {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const rect = sidebarRef.current.getBoundingClientRect();
      const isRTL =
        document.documentElement.dir === "rtl" ||
        document.documentElement.getAttribute("dir") === "rtl";

      let newWidth;
      if (isRTL) {
        // In RTL, Sidebar is on the Left. Width expands to the Right.
        // Width = Current Mouse X - Left Edge of Sidebar
        newWidth = clientX - rect.left;
      } else {
        // In LTR, Sidebar is on the Right. Width expands to the Left.
        // Width = Right Edge of Sidebar - Current Mouse X
        newWidth = rect.right - clientX;
      }

      if (newWidth > 290 && newWidth < 800) {
        setSidebarWidth(newWidth);
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    window.addEventListener("touchmove", resize);
    window.addEventListener("touchend", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
      window.removeEventListener("touchmove", resize);
      window.removeEventListener("touchend", stopResizing);
    };
  }, [resize, stopResizing]);

  const categories = [
    { id: "All", label: t.categories.all },
    { id: "Medicine", label: t.categories.medicine },
    { id: "Cosmetics", label: t.categories.cosmetics },
    { id: "General", label: t.categories.general },
  ];

  // Helper to map specific categories to broad groups
  const getBroadCategory = (category: string): string => {
    const cosmetics = ["Skin Care", "Personal Care"];
    const general = ["Medical Equipment", "Medical Supplies", "Baby Care"];

    if (cosmetics.includes(category)) return "Cosmetics";
    if (general.includes(category)) return "General";
    return "Medicine";
  };

  // --- Nested/Future Functions for Item Actions ---
  const handleViewProductDetails = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Prevent adding to cart
    const drug = inventory.find((d) => d.id === id);
    if (drug) {
      setViewingDrug(drug);
    }
  };

  const toggleBatchList = (e: React.MouseEvent, drugName: string) => {
    e.stopPropagation();
    setExpandedGroups((prev) => ({ ...prev, [drugName]: !prev[drugName] }));
  };

  // Helper to get short form label
  const getFormLabel = (drug: Drug): string => {
    const text = (
      drug.name +
      " " +
      drug.description +
      " " +
      drug.genericName
    ).toLowerCase();

    // Equipment
    if (
      text.includes("monitor") ||
      text.includes("meter") ||
      text.includes("thermometer")
    )
      return "Device";

    // Baby
    if (text.includes("diaper")) return "Pack";
    if (text.includes("formula")) return "Tin";

    // Supplies
    if (
      text.includes("mask") ||
      text.includes("glove") ||
      text.includes("syringe") ||
      text.includes("gauze")
    )
      return "Box";

    // Cosmetics
    if (text.includes("shampoo")) return "Shampoo";
    if (text.includes("cleanser")) return "Cleanser";
    if (text.includes("wash")) return "Wash";
    if (text.includes("cream")) return "Cream";
    if (text.includes("gel")) return "Gel";
    if (text.includes("ointment")) return "Ointment";
    if (text.includes("lotion")) return "Lotion";
    if (text.includes("balm")) return "Balm";

    // Medications
    if (text.includes("syrup")) return "Syrup";
    if (text.includes("suspension")) return "Suspension";
    if (text.includes("solution") || text.includes("liquid")) return "Liquid";
    if (text.includes("drops") || text.includes("drop")) return "Drops";
    if (
      text.includes("injection") ||
      text.includes("ampoule") ||
      text.includes("vial") ||
      text.includes("syringe")
    )
      return "Injection";
    if (text.includes("inhaler")) return "Inhaler";
    if (text.includes("spray")) return "Spray";
    if (text.includes("suppository")) return "Suppository";
    if (text.includes("capsule")) return "Capsule";
    if (text.includes("tablet") || text.includes("pill")) return "Tablet";

    return "";
  };

  const addToCart = (
    drug: Drug,
    isUnitMode: boolean = false,
    initialQuantity: number = 1
  ) => {
    if (drug.stock <= 0) return;
    setCart((prev) => {
      // Find existing item with same ID AND same unit mode
      const existingIndex = prev.findIndex(
        (item) => item.id === drug.id && !!item.isUnit === isUnitMode
      );

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];

        // Check limits for the specific mode
        if (isUnitMode && existing.unitsPerPack) {
          // Unit mode stock check logic could go here if strict
        } else {
          if (existing.quantity >= drug.stock) return prev;
        }

        const updated = [...prev];
        updated[existingIndex] = {
          ...existing,
          quantity: existing.quantity + initialQuantity,
        };
        return updated;
      }

      return [
        ...prev,
        { ...drug, quantity: initialQuantity, discount: 0, isUnit: isUnitMode },
      ];
    });
  };

  const addGroupToCart = (group: Drug[]) => {
    const firstDrug = group[0];
    const selectedBatchId = selectedBatches[firstDrug.id];

    let targetBatch: Drug | undefined;

    if (selectedBatchId) {
      targetBatch = group.find((d) => d.id === selectedBatchId);
    }

    // If no manual selection or selected batch invalid/empty, use FEFO
    if (!targetBatch || targetBatch.stock <= 0) {
      targetBatch = group.find((d) => {
        const inCart = cart
          .filter((c) => c.id === d.id) // Get all entries for this batch (unit + pack)
          .reduce(
            (sum, c) =>
              sum +
              (c.isUnit && c.unitsPerPack
                ? c.quantity / c.unitsPerPack
                : c.quantity),
            0
          );
        return d.stock - inCart > 0;
      });
    }

    if (targetBatch) {
      const unitMode = selectedUnits[firstDrug.id] === "unit";
      addToCart(targetBatch, unitMode);
    }
  };

  const removeFromCart = (id: string, isUnit: boolean) => {
    setCart((prev) =>
      prev.filter((item) => !(item.id === id && !!item.isUnit === isUnit))
    );
  };

  const removeDrugFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // Switch batch and auto-split quantity across batches if needed
  const switchBatchWithAutoSplit = (
    currentItem: CartItem,
    newBatch: Drug,
    packQty: number,
    unitQty: number
  ) => {
    // Get all batches for this drug sorted by expiry (FEFO)
    const allBatches = inventory
      .filter((d) => d.name === currentItem.name && d.dosageForm === currentItem.dosageForm)
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    // Remove old entries for this drug
    setCart((prev) => {
      // Find insertion index (first occurrence)
      const insertionIndex = prev.findIndex((item) => item.name === currentItem.name && item.dosageForm === currentItem.dosageForm);
      
      const filtered = prev.filter((item) => !(item.name === currentItem.name && item.dosageForm === currentItem.dosageForm));
      
      // Calculate what we need to add
      const newItems: CartItem[] = [];
      let remainingPacks = packQty;
      let remainingUnits = unitQty;
      
      // Start from the selected batch, then continue with others
      const orderedBatches = [
        newBatch,
        ...allBatches.filter((b) => b.id !== newBatch.id)
      ];
      
      for (const batch of orderedBatches) {
        if (remainingPacks <= 0 && remainingUnits <= 0) break;
        
        const unitsPerPack = batch.unitsPerPack || 1;
        const stockInPacks = batch.stock;
        
        // Calculate how much we can take from this batch
        if (remainingPacks > 0) {
          const packsTake = Math.min(remainingPacks, stockInPacks);
          if (packsTake > 0) {
            newItems.push({
              ...batch,
              quantity: packsTake,
              discount: currentItem.discount || 0,
              isUnit: false,
            });
            remainingPacks -= packsTake;
          }
        }
        
        // Calculate remaining stock after packs for units
        const usedPacks = newItems.filter(i => i.id === batch.id && !i.isUnit).reduce((s, i) => s + i.quantity, 0);
        const remainingStockForUnits = (stockInPacks - usedPacks) * unitsPerPack;
        
        if (remainingUnits > 0 && unitsPerPack > 1) {
          const unitsTake = Math.min(remainingUnits, remainingStockForUnits);
          if (unitsTake > 0) {
            newItems.push({
              ...batch,
              quantity: unitsTake,
              discount: currentItem.discount || 0,
              isUnit: true,
            });
            remainingUnits -= unitsTake;
          }
        }
      }
      
      if (insertionIndex !== -1) {
        const result = [...filtered];
        result.splice(insertionIndex, 0, ...newItems);
        return result;
      }
      return [...filtered, ...newItems];
    });
  };

  const updateQuantity = (id: string, isUnit: boolean, delta: number) => {
    setCart((prev) => {
      // Find current pack and unit items for this drug in cart
      const packItem = prev.find((i) => i.id === id && !i.isUnit);
      const unitItem = prev.find((i) => i.id === id && i.isUnit);
      const drug = inventory.find((d) => d.id === id);
      const stock = drug?.stock || 0;
      const unitsPerPack = drug?.unitsPerPack || 1;
      const hasDualMode = unitsPerPack > 1;

      // Calculate current combined usage
      const currentPackQty = packItem?.quantity || 0;
      const currentUnitQty = unitItem?.quantity || 0;

      // Calculate new quantity for the target item
      const targetItem = prev.find((i) => i.id === id && !!i.isUnit === isUnit);
      if (!targetItem) return prev;

      const newQty = targetItem.quantity + delta;

      // Calculate new combined usage in pack-equivalents
      let newPackQty = currentPackQty;
      let newUnitQty = currentUnitQty;
      if (isUnit) {
        newUnitQty = newQty;
      } else {
        newPackQty = newQty;
      }

      const totalPacksUsed =
        newPackQty + (hasDualMode ? newUnitQty / unitsPerPack : 0);
      const isStockValid = totalPacksUsed <= stock;

      // Min qty validation
      // If ONLY pack mode (no dual), pack must be >= 1
      // If dual mode, either can be 0 as long as the other has value (handled by UI delete)
      const minQtyValid = hasDualMode
        ? newQty >= 0
        : isUnit
        ? newQty >= 0
        : newQty >= 1;

      if (minQtyValid && isStockValid) {
        return prev.map((item) => {
          if (item.id === id && !!item.isUnit === isUnit) {
            return { ...item, quantity: newQty };
          }
          return item;
        });
      }
      return prev;
    });
  };

  const toggleUnitMode = (id: string, currentIsUnit: boolean) => {
    setCart((prev) => {
      const itemIndex = prev.findIndex(
        (i) => i.id === id && !!i.isUnit === currentIsUnit
      );
      if (itemIndex === -1) return prev;

      const item = prev[itemIndex];
      const unitsPerPack = item.unitsPerPack || 1;

      if (!currentIsUnit) {
        // Pack -> Unit (Only if qty is 1, convert to 1 unit)
        // Also prevent if units already exist (merged row logic)
        const existingUnit = prev.find((i) => i.id === id && i.isUnit);
        if (item.quantity !== 1 || (existingUnit && existingUnit.quantity > 0))
          return prev;

        let updated = prev.filter((_, idx) => idx !== itemIndex);
        const unitIndex = updated.findIndex((i) => i.id === id && i.isUnit);
        if (unitIndex >= 0) {
          updated[unitIndex] = {
            ...updated[unitIndex],
            quantity: updated[unitIndex].quantity + 1,
          };
        } else {
          updated.push({ ...item, isUnit: true, quantity: 1 });
        }
        return updated;
      }

      // Unit -> Pack (Smart Conversion)
      if (unitsPerPack <= 1) return prev;

      const packsToAdd = Math.floor(item.quantity / unitsPerPack);
      if (packsToAdd <= 0) return prev;

      const unitsToRemove = packsToAdd * unitsPerPack;

      let updated = [...prev];
      const updatedUnitItem = {
        ...item,
        quantity: item.quantity - unitsToRemove,
      };

      if (updatedUnitItem.quantity === 0) {
        updated = updated.filter((_, idx) => idx !== itemIndex);
      } else {
        updated[itemIndex] = updatedUnitItem;
      }

      const packIndex = updated.findIndex((i) => i.id === id && !i.isUnit);
      if (packIndex >= 0) {
        updated[packIndex] = {
          ...updated[packIndex],
          quantity: updated[packIndex].quantity + packsToAdd,
        };
      } else {
        updated.push({ ...item, isUnit: false, quantity: packsToAdd });
      }

      return updated;
    });
  };

  const updateItemDiscount = (
    id: string,
    isUnit: boolean,
    discount: number
  ) => {
    const validDiscount = Math.min(100, Math.max(0, discount));
    setCart((prev) =>
      prev.map((item) =>
        item.id === id && !!item.isUnit === isUnit
          ? { ...item, discount: validDiscount }
          : item
      )
    );
  };

  const getCartItemActions = (item: CartItem) => {
    const actions: any[] = [
      {
        label: t.removeItem,
        icon: "delete",
        action: () => removeFromCart(item.id, !!item.isUnit),
        danger: true,
      },
    ];

    const unitsPerPack = item.unitsPerPack || 1;
    const hasDualMode = unitsPerPack > 1;

    // Resolve full drug state from cart to correctly determine actions for merged row
    const packItem = cart.find((i) => i.id === item.id && !i.isUnit);
    const unitItem = cart.find((i) => i.id === item.id && i.isUnit);
    const packQty = packItem?.quantity || 0;
    const unitQty = unitItem?.quantity || 0;

    const canSwitchToUnit = hasDualMode && packQty === 1 && unitQty === 0;
    const canSwitchToPack = hasDualMode && unitQty >= unitsPerPack;

    if (canSwitchToUnit) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToUnit,
        icon: "swap_horiz",
        action: () => toggleUnitMode(item.id, false), // false = currently is Pack
        danger: false,
      });
    }

    if (canSwitchToPack) {
      actions.push({ separator: true });
      actions.push({
        label: t.switchToPack,
        icon: "swap_horiz",
        action: () => toggleUnitMode(item.id, true), // true = currently is Unit
        danger: false,
      });
    }

    actions.push({ separator: true });
    actions.push({
      label: t.actions.discount,
      icon: "percent",
      action: () => {
        const disc = prompt(
          "Enter discount percentage (0-100):",
          item.discount?.toString() || "0"
        );
        if (disc !== null) {
          const val = parseFloat(disc);
          if (!isNaN(val) && val >= 0 && val <= 100) {
            const maxDisc = item.maxDiscount ?? 10;
            if (val > maxDisc) {
              alert(`Discount cannot exceed ${maxDisc}%`);
            } else {
              updateItemDiscount(item.id, !!item.isUnit, val);
              if (val > 0) setGlobalDiscount(0);
            }
          }
        }
      },
      danger: false,
    });
    return actions;
  };

  // Cart Drag and Drop Sensors
  const cartSensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms delay before drag starts (to allow scrolling/tapping)
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Cart Drag End Handler
  const handleCartDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      setCart((prev) => {
        // We need to reorder the *groups* but store as *items*.
        // 1. Group the current items map-like
        const groups = new Map<string, CartItem[]>();
        const order: string[] = []; // Track Order of IDs

        prev.forEach((item) => {
          if (!groups.has(item.id)) {
            groups.set(item.id, []);
            order.push(item.id);
          }
          groups.get(item.id)!.push(item);
        });

        // 2. Perform ArrayMove on the Order array
        const oldIndex = order.indexOf(active.id as string);
        const newIndex = order.indexOf(over!.id as string);

        const newOrder = arrayMove(order, oldIndex, newIndex);

        // 3. Reconstruct Flat Cart based on new Order
        const newCart: CartItem[] = [];
        newOrder.forEach((id) => {
          if (groups.has(id)) {
            newCart.push(...groups.get(id)!);
          }
        });
        return newCart;
      });
    }
  };

  // Long-press support for cart items (touch devices)
  const currentTouchCartItem = useRef<CartItem | null>(null);
  const {
    onTouchStart: onCartItemTouchStart,
    onTouchEnd: onCartItemTouchEnd,
    onTouchMove: onCartItemTouchMove,
  } = useLongPress({
    onLongPress: (e) => {
      if (currentTouchCartItem.current) {
        const touch = e.touches[0];
        showMenu(
          touch.clientX,
          touch.clientY,
          getCartItemActions(currentTouchCartItem.current)
        );
      }
    },
  });

  // Calculations
  const calculateItemTotal = (item: CartItem) => {
    let unitPrice = item.price;
    if (item.isUnit && item.unitsPerPack) {
      unitPrice = item.price / item.unitsPerPack;
    }
    const baseTotal = unitPrice * item.quantity;
    const discountAmount = baseTotal * ((item.discount || 0) / 100);
    return baseTotal - discountAmount;
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + calculateItemTotal(item),
    0
  );
  const cartTotal = subtotal * (1 - globalDiscount / 100);
  const isValidOrder =
    cart.length > 0 &&
    mergedCartItems.every(
      (item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0
    );
  const totalItems = mergedCartItems.filter(
    (item) => (item.pack?.quantity || 0) + (item.unit?.quantity || 0) > 0
  ).length;

  const handleCheckout = (saleType: "walk-in" | "delivery" = "walk-in") => {
    if (!isValidOrder) return;

    let deliveryFee = 0;
    if (saleType === "delivery") {
      deliveryFee = 5;
    }

    onCompleteSale({
      items: cart,
      customerName: customerName || "Guest Customer",
      customerCode,
      customerPhone: selectedCustomer?.phone,
      customerAddress: selectedCustomer
        ? [
            selectedCustomer.area
              ? getLocationName(
                  selectedCustomer.area,
                  "area",
                  language as "EN" | "AR"
                )
              : "",
            selectedCustomer.city
              ? getLocationName(
                  selectedCustomer.city,
                  "city",
                  language as "EN" | "AR"
                )
              : "",
            selectedCustomer.governorate
              ? getLocationName(
                  selectedCustomer.governorate,
                  "gov",
                  language as "EN" | "AR"
                )
              : "",
          ]
            .filter(Boolean)
            .join(", ")
        : undefined,
      customerStreetAddress: selectedCustomer?.streetAddress,
      paymentMethod,
      saleType,
      deliveryFee,
      globalDiscount,
      subtotal,
      total: cartTotal + deliveryFee,
    });

    // Auto-Print Receipt Logic
    try {
      const activeId = localStorage.getItem("receipt_active_template_id");
      const templatesStr = localStorage.getItem("receipt_templates");

      if (activeId && templatesStr) {
        const templates = JSON.parse(templatesStr);
        const activeTemplate = templates.find((t: any) => t.id === activeId);

        if (activeTemplate) {
          const opts = activeTemplate.options as InvoiceTemplateOptions;
          const isDelivery = saleType === "delivery";
          // If delivery, check distinct flag. Else check general complete flag.
          // Usually, 'autoPrintOnComplete' implies ANY complete unless delivery overrides?
          // Interpreting user request: "Option for delivery order" AND "Option for any order".
          // If Any Order is checked, it prints for everything.
          // If Delivery is checked, it prints for delivery.
          // So: (isDelivery && opts.autoPrintOnDelivery) || opts.autoPrintOnComplete

          const shouldPrint =
            (isDelivery && opts.autoPrintOnDelivery) ||
            opts.autoPrintOnComplete;

          if (shouldPrint) {
            // Construct a temporary Sale object for printing
            // Since onCompleteSale is an event, we don't have the final DB ID yet.
            // We'll use a placeholder or handle it gracefully.
            const mockSale: Sale = {
              id: "TRX-" + Date.now().toString().slice(-6),
              date: new Date().toISOString(),
              dailyOrderNumber: 0, // Placeholder
              items: cart,
              subtotal,
              globalDiscount: globalDiscount, // global discount amount? No, Sale interface says globalDiscount is number.
              // In POS state, globalDiscount is number (percent).
              // In Sale interface: globalDiscount is number.
              // But wait, cartTotal calculation uses it as percent: subtotal * (1 - (globalDiscount / 100))
              // So we pass it as is.
              total: cartTotal + deliveryFee,
              paymentMethod,
              saleType,
              deliveryFee,
              status: "completed",
              customerName: customerName || "Guest Customer",
              customerCode,
              customerPhone: selectedCustomer?.phone,
              customerAddress: selectedCustomer
                ? [
                    selectedCustomer.area
                      ? getLocationName(
                          selectedCustomer.area,
                          "area",
                          language as "EN" | "AR"
                        )
                      : "",
                    selectedCustomer.city
                      ? getLocationName(
                          selectedCustomer.city,
                          "city",
                          language as "EN" | "AR"
                        )
                      : "",
                    selectedCustomer.governorate
                      ? getLocationName(
                          selectedCustomer.governorate,
                          "gov",
                          language as "EN" | "AR"
                        )
                      : "",
                  ]
                    .filter(Boolean)
                    .join(", ")
                : undefined,
              customerStreetAddress: selectedCustomer?.streetAddress,
            };

            const html = generateInvoiceHTML(mockSale, opts);

            // Open print window
            const printWindow = window.open(
              "",
              "_blank",
              "width=400,height=600"
            );
            if (printWindow) {
              printWindow.document.write(html);
              printWindow.document.close();
              // printWindow.print(); // Optional: trigger print dialog immediately
            }
          }
        }
      }
    } catch (e) {
      console.error("Auto-print failed:", e);
    }

    // Close the current tab after successful checkout
    removeTab(activeTabId);
  };

  // Filter customers when name changes
  useEffect(() => {
    if (customerName && showCustomerDropdown && !selectedCustomer) {
      const term = customerName.toLowerCase();
      const results = customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.phone.includes(term) ||
            (c.code && c.code.toLowerCase().includes(term)) ||
            (c.serialId && c.serialId.toString().includes(term))
        )
        .slice(0, 5);
      setFilteredCustomers(results);
    } else {
      setFilteredCustomers([]);
    }
  }, [customerName, customers, showCustomerDropdown, selectedCustomer]);

  // Sync selectedCustomer with activeTab.customerCode (for persistence)
  useEffect(() => {
    if (
      customerCode &&
      (!selectedCustomer ||
        (selectedCustomer.code !== customerCode &&
          selectedCustomer.serialId?.toString() !== customerCode))
    ) {
      const found = customers.find(
        (c) =>
          c.code === customerCode || c.serialId?.toString() === customerCode
      );
      if (found) {
        setSelectedCustomer(found);
      }
    } else if (!customerCode && selectedCustomer) {
      setSelectedCustomer(null);
    }
  }, [customerCode, customers, selectedCustomer]);

  const handleCustomerSelect = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerCode(customer.code || customer.serialId?.toString() || "");
    setSelectedCustomer(customer);
    setShowCustomerDropdown(false);
    setShowCodeDropdown(false);
  };

  const clearCustomerSelection = () => {
    setCustomerName("");
    setCustomerCode("");
    setSelectedCustomer(null);
  };

  // Auto-scroll active item into view
  useEffect(() => {
    const activeRow = document.getElementById(`drug-row-${activeIndex}`);
    if (activeRow) {
      activeRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [activeIndex]);

  // Auto-scroll active CART item into view
  useEffect(() => {
    if (highlightedIndex !== -1) {
      const activeCartRow = document.getElementById(`cart-item-${highlightedIndex}`);
      if (activeCartRow) {
        activeCartRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
  }, [highlightedIndex]);

  // Auto-highlight last item when added
  const prevCartLengthRef = useRef(cart.length);
  useEffect(() => {
    if (cart.length > prevCartLengthRef.current) {
        // Item added - highlight the last one (which is usually at the bottom or top depending on sort? assumption: bottom/end of merged list)
        // mergedCartItems syncs with cart? Yes.
        // Wait, mergedCartItems might not be updated immediately in this render cycle if it depends on cart state which just updated?
        // mergedCartItems is a useMemo on [cart]. So it updates when cart updates.
        // So safe to set index to length - 1.
        if (mergedCartItems.length > 0) {
            setHighlightedIndex(mergedCartItems.length - 1);
        }
    }
    prevCartLengthRef.current = cart.length;
  }, [cart.length, mergedCartItems.length]);



  const filteredDrugs = useMemo(() => {
    const { mode, regex } = parseSearchTerm(search);

    return inventory.filter((d) => {
      const drugBroadCat = getBroadCategory(d.category);
      const matchesCategory =
        selectedCategory === "All" || drugBroadCat === selectedCategory;

      let matchesSearch = false;

      if (mode === "ingredient") {
        matchesSearch =
          !!d.activeIngredients &&
          d.activeIngredients.some((ing) => regex.test(ing));
      } else {
        const searchableText = [
          d.name,
          d.genericName,
          d.dosageForm,
          d.category,
          d.description,
          ...(Array.isArray(d.activeIngredients) ? d.activeIngredients : []),
        ]
          .filter(Boolean)
          .join(" ");

        matchesSearch =
          regex.test(searchableText) ||
          (d.barcode && regex.test(d.barcode)) ||
          (d.internalCode && regex.test(d.internalCode));
      }

      const matchesStock =
        stockFilter === "all" ||
        (stockFilter === "in_stock" && d.stock > 0) ||
        (stockFilter === "out_of_stock" && d.stock <= 0);

      return matchesCategory && matchesSearch && matchesStock;
    });
  }, [inventory, search, selectedCategory, stockFilter]);

  // Group drugs by name and sort batches by expiry
  const groupedDrugs = useMemo(() => {
    const groups: Record<string, Drug[]> = {};
    filteredDrugs.forEach((d) => {
      // Group by Name AND DosageForm to separate different forms
      const key = `${d.name}|${d.dosageForm || ''}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(d);
    });

    // Sort batches by expiry date (asc)
    Object.values(groups).forEach((group) => {
      group.sort(
        (a, b) =>
          new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
    });

    return Object.values(groups);
  }, [filteredDrugs]);

  // Long Press Logic for Touch Devices

  // --- DataTable Configuration ---
  const tableData = useMemo(() => {
    return groupedDrugs.map((group) => {
      const first = group[0];
      return {
        id: first.id,
        ...first,
        group: group,
        totalStock: group.reduce((sum, d) => sum + d.stock, 0),
        inCartCount: group.reduce(
          (sum, d) => sum + (cart.find((c) => c.id === d.id)?.quantity || 0),
          0
        ),
      };
    });
  }, [groupedDrugs, cart]);

  // --- Keyboard Shortcuts & Navigation ---
  const isTableFocused = search.trim().length > 0 && tableData.length > 0;

  // Auto-focus Cart when Table focus is lost (transition from table to cart)
  const prevIsTableFocusedRef = useRef(isTableFocused);
  useEffect(() => {
    // Transition: was table focused, now not focused -> move to cart
    if (prevIsTableFocusedRef.current && !isTableFocused && mergedCartItems.length > 0) {
        setHighlightedIndex(0);
    }
    // Also handle initial case: table never focused and cart has items
    if (!isTableFocused && mergedCartItems.length > 0 && highlightedIndex === -1) {
        setHighlightedIndex(0);
    }
    prevIsTableFocusedRef.current = isTableFocused;
  }, [isTableFocused, mergedCartItems.length, highlightedIndex]);

  usePosShortcuts({
    enabled: true,
    focusMode: isTableFocused ? 'table' : 'cart',
    onTableNavigate: (direction) => {
        setActiveIndex((prev) => {
            const next = direction === "up" ? prev - 1 : prev + 1;
            const clamped = Math.max(0, Math.min(next, tableData.length - 1));
            return clamped;
        });
    },
    onAddFromTable: () => {
        if (tableData[activeIndex]) {
            addGroupToCart(tableData[activeIndex].group);
            // Replicate existing behavior on selection: clear search and reset focus
            setSearch("");
            setActiveIndex(0);
            searchInputRef.current?.focus();
        }
    },
    onTab: () => {
        // Find the active cart item row and focus its first input
        if (highlightedIndex !== -1) {
            const row = document.getElementById(`cart-item-${highlightedIndex}`);
            if (row) {
                const firstInput = row.querySelector('input, button');
                if (firstInput) {
                    (firstInput as HTMLElement).focus();
                }
            }
        }
    },
    onNavigate: (direction) => {
      if (mergedCartItems.length === 0) return;
      setHighlightedIndex((prev) => {
        const next = direction === "up" ? prev - 1 : prev + 1;
        const clamped = Math.max(0, Math.min(next, mergedCartItems.length - 1));
        if (clamped !== prev) {
          playClick();
        }
        return clamped;
      });
    },
    onQuantityChange: (delta) => {
      if (highlightedIndex === -1 || !mergedCartItems[highlightedIndex]) {
        playError();
        return;
      }
      const item = mergedCartItems[highlightedIndex];
      const targetId = item.common.id;
      const useUnit = !item.pack;

      playBeep();
      updateQuantity(targetId, useUnit, delta);
    },
    onDelete: () => {
      if (highlightedIndex === -1 || !mergedCartItems[highlightedIndex]) return;
      const item = mergedCartItems[highlightedIndex];
      if (item.pack) removeFromCart(item.pack.id, false);
      if (item.unit) removeFromCart(item.unit.id, true);
      playClick();
    },
    onCheckout: () => {
      if (cart.length > 0) {
        playSuccess();
        handleCheckout("walk-in");
      } else {
        playError();
      }
    },
    onFocusSearch: () => {
      searchInputRef.current?.focus();
    },
  });

  // --- TanStack Table Configuration ---
  const columnHelper = createColumnHelper<(typeof tableData)[0]>();

  const tableColumns = useMemo<ColumnDef<(typeof tableData)[0], any>[]>(
    () => [

      columnHelper.accessor("barcode", {
        header: t.code,
        size: 140,
        cell: (info) => (
          <span
            className="text-xs font-mono text-gray-600 dark:text-gray-400"
            dir={language === "AR" ? "rtl" : "ltr"}
          >
            {info.row.original.internalCode || info.row.original.barcode}
          </span>
        ),
      }),
      columnHelper.accessor("name", {
        header: t.name,
        size: 250,
        cell: (info) => (
          <div
            className="flex flex-col w-full"
            dir={language === "AR" ? "rtl" : "ltr"}
          >
            <span className="font-bold text-sm text-gray-900 dark:text-gray-100 drug-name truncate">
              {info.row.original.name}{" "}
              {info.row.original.dosageForm ? (
                <span className="text-gray-500 font-normal">
                  ({info.row.original.dosageForm})
                </span>
              ) : (
                ""
              )}
            </span>
            <span className="text-xs text-gray-500 truncate">
              {info.row.original.genericName}
            </span>
          </div>
        ),
      }),
      columnHelper.accessor("category", {
        header: t.category,
        size: 120,
        cell: (info) => (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            {info.getValue()}
          </span>
        ),
      }),
      columnHelper.accessor("price", {
        header: t.price,
        size: 100,
        cell: (info) => (
          <span
            className="font-bold text-sm text-gray-700 dark:text-gray-300"
            dir="ltr"
          >
            ${info.getValue().toFixed(2)}
          </span>
        ),
      }),
      columnHelper.accessor("totalStock", {
        id: "stock",
        header: t.stock,
        size: 100,
        cell: (info) =>
          info.getValue() === 0 ? (
            <span className="text-xs font-bold text-red-500">
              {t.outOfStock}
            </span>
          ) : (
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
              {parseFloat(info.getValue().toFixed(2))}
            </span>
          ),
      }),
      columnHelper.display({
        id: "unit",
        header: t.unit,
        size: 120,
        cell: (info) => {
          const row = info.row.original;
          return (
            <div className="w-full h-full overflow-visible">
              {row.unitsPerPack && row.unitsPerPack > 1 ? (
                <ExpandingDropdown
                  items={["pack", "unit"]}
                  selectedItem={selectedUnits[row.id] || "pack"}
                  isOpen={openUnitDropdown === row.id}
                  onToggle={() => {
                    setOpenUnitDropdown(
                      openUnitDropdown === row.id ? null : row.id
                    );
                    setOpenBatchDropdown(null);
                  }}
                  onSelect={(item) =>
                    setSelectedUnits((prev) => ({
                      ...prev,
                      [row.id]: item as "pack" | "unit",
                    }))
                  }
                  keyExtractor={(item) => item as string}
                  renderItem={(item) => (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center text-gray-700 dark:text-gray-300">
                      {item === "pack" ? t.pack : t.unit}
                    </div>
                  )}
                  renderSelected={(item) => (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center truncate text-gray-700 dark:text-gray-300">
                      {item === "pack" ? t.pack : t.unit}
                    </div>
                  )}
                  color={color}
                  className="h-9 w-20"
                />
              ) : (
                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {t.pack}
                </span>
              )}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "batches",
        header: t.batches,
        size: 150,
        cell: (info) => {
          const row = info.row.original;
          if (!row.group || row.group.length === 0)
            return <span className="text-xs text-gray-400">-</span>;

          const selectedBatchId = selectedBatches[row.id];
          const defaultBatch =
            row.group.find((d: Drug) => d.stock > 0) || row.group[0];
          const displayBatch = selectedBatchId
            ? row.group.find((d: Drug) => d.id === selectedBatchId)
            : defaultBatch;

          if (row.group.length === 1) {
            const i = displayBatch;
            return (
              <div className="w-full h-full">
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">
                  {i
                    ? (i.expiryDate
                        ? new Date(i.expiryDate).toLocaleDateString("en-US", {
                            month: "2-digit",
                            year: "2-digit",
                          })
                        : "-") + ` • ${i.stock}`
                    : t.noStock}
                </div>
              </div>
            );
          }

          return (
            <div className="w-full h-full overflow-visible">
              <ExpandingDropdown
                items={row.group}
                selectedItem={displayBatch}
                isOpen={openBatchDropdown === row.id}
                onToggle={() => {
                  setOpenBatchDropdown(
                    openBatchDropdown === row.id ? null : row.id
                  );
                  setOpenUnitDropdown(null);
                }}
                onSelect={(item) =>
                  setSelectedBatches((prev) => ({
                    ...prev,
                    [row.id]: (item as Drug).id,
                  }))
                }
                keyExtractor={(item) => (item as Drug).id}
                renderSelected={(item) => {
                  const i = item as Drug | undefined;
                  return (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center truncate text-gray-700 dark:text-gray-300">
                      {i
                        ? (i.expiryDate
                            ? new Date(i.expiryDate).toLocaleDateString(
                                "en-US",
                                { month: "2-digit", year: "2-digit" }
                              )
                            : "-") + ` • ${i.stock}`
                        : t.noStock}
                    </div>
                  );
                }}
                renderItem={(item) => {
                  const i = item as Drug;
                  return (
                    <div className="w-full px-2 py-1 text-sm font-bold text-center text-gray-700 dark:text-gray-300">
                      {(i.expiryDate
                        ? new Date(i.expiryDate).toLocaleDateString("en-US", {
                            month: "2-digit",
                            year: "2-digit",
                          })
                        : "-") + ` • ${i.stock}`}
                    </div>
                  );
                }}
                onEnter={() => {
                  addGroupToCart(row.group);
                  setSearch("");
                  setActiveIndex(0);
                  searchInputRef.current?.focus();
                }}
                className="h-10 w-30"
                color={color}
              />
            </div>
          );
        },
      }),
      columnHelper.display({
        id: "inCart",
        header: t.inCart,
        size: 80,
        cell: (info) => (
          <div className="text-center w-full flex justify-center">
            {info.row.original.inCartCount > 0 && (
              <div
                className={`inline-block bg-${color}-600 text-white text-xs font-bold px-2 py-1 rounded-md`}
              >
                {info.row.original.inCartCount}
              </div>
            )}
          </div>
        ),
      }),
    ],
    [
      color,
      t,
      language,
      selectedUnits,
      openUnitDropdown,
      selectedBatches,
      openBatchDropdown,
    ]
  );

  return (
    <div className="h-full flex flex-col gap-2">
      <div className="flex items-center gap-4 px-2">
        {/* Header - Compact */}
        <h2 className="text-xl font-bold tracking-tight type-expressive shrink-0">
          {t.posTitle}
        </h2>

        {/* Tab Bar - Takes remaining space */}
        <div className="flex-1 min-w-0">
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onTabClick={switchTab}
            onTabClose={removeTab}
            onTabAdd={addTab}
            onTabRename={renameTab}
            onTogglePin={togglePin}
            onTabReorder={reorderTabs}
            maxTabs={maxTabs}
            color={color}
            t={t}
          />
        </div>
      </div>

      {/* Main POS Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-3 animate-fade-in relative overflow-hidden">
        {/* Product Grid - Hidden on Mobile if Cart Tab is active */}
        <div
          className={`flex-1 flex flex-col gap-2 h-full overflow-hidden ${
            mobileTab === "cart" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Customer Details */}
          <div
            className={`${CARD_MD} p-3 border border-gray-200 dark:border-gray-800`}
          >
            {selectedCustomer ? (
              // Locked Customer Card
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between animate-fade-in">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-full bg-${color}-100 dark:bg-${color}-900/30 flex items-center justify-center text-${color}-600 dark:text-${color}-400`}
                  >
                    <span className="material-symbols-rounded text-[24px]">
                      person
                    </span>
                  </div>
                  <div className="flex flex-col gap-0">
                    <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg leading-none mb-0.5">
                      {selectedCustomer.name}
                    </h3>
                    <div className="leading-none">
                      <span className="text-xs font-bold font-mono text-gray-500 dark:text-gray-400">
                        {selectedCustomer.code ||
                          `#${selectedCustomer.serialId}`}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 leading-tight mt-0.5">
                      <span dir="ltr">{selectedCustomer.phone}</span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 border-s-2 border-gray-100 dark:border-gray-700 ps-6 ms-2 hidden sm:block">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                    <span className="material-symbols-rounded text-[14px]">
                      location_on
                    </span>
                    {t.address}
                  </p>
                  <div className="flex flex-col leading-snug">
                    {selectedCustomer.streetAddress && (
                      <span className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                        {selectedCustomer.streetAddress}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {selectedCustomer.area
                        ? getLocationName(
                            selectedCustomer.area,
                            "area",
                            language as Language
                          )
                        : ""}
                      {selectedCustomer.area && selectedCustomer.city
                        ? " - "
                        : ""}
                      {selectedCustomer.city
                        ? getLocationName(
                            selectedCustomer.city,
                            "city",
                            language as Language
                          )
                        : ""}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 min-w-[140px]">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {t.paymentMethod}
                  </label>
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as "cash" | "visa")}
                    color={color}
                    size="xs"
                    options={[
                      {
                        label: t.cash || "Cash",
                        value: "cash",
                        icon: "payments",
                        activeColor: "green",
                      },
                      {
                        label: t.visa || "Visa",
                        value: "visa",
                        icon: "credit_card",
                        activeColor: "blue",
                      },
                    ]}
                  />
                  <button
                    onClick={clearCustomerSelection}
                    className="w-full py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-rounded text-[16px]">
                      close
                    </span>
                    {t.changeCustomer}
                  </button>
                </div>
              </div>
            ) : (
              // Search Inputs
              <div className="flex flex-col sm:flex-row gap-3">
                <div
                  className="flex-1 relative"
                  onBlur={customerDropdownHook.handleBlur}
                >
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {t.customerInfo}
                  </label>
                  <SearchInput
                    value={customerName}
                    onSearchChange={(val) => {
                      setCustomerName(val);
                      setShowCustomerDropdown(true);
                      setHighlightedCustomerIndex(0);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    onKeyDown={customerDropdownHook.handleKeyDown}
                    placeholder={t.customerSearchPlaceholder}
                    icon="person"
                    className="border-gray-200 dark:border-gray-700"
                  />
                  {/* Customer Dropdown */}
                  {showCustomerDropdown && filteredCustomers.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 z-50 max-h-48 overflow-y-auto">
                      {filteredCustomers.map((customer, index) => (
                        <div
                          key={customer.id}
                          className={`px-3 py-2 cursor-pointer border-b border-gray-50 dark:border-gray-700 last:border-0 flex flex-col ${
                            index === highlightedCustomerIndex
                              ? "bg-blue-50 dark:bg-blue-900/30"
                              : "hover:bg-gray-50 dark:hover:bg-gray-700"
                          }`}
                          onMouseDown={(e) => {
                            e.preventDefault(); // Prevent input blur which would close dropdown
                            handleCustomerSelect(customer);
                          }}
                          onMouseEnter={() =>
                            setHighlightedCustomerIndex(index)
                          }
                        >
                          <span
                            className={`text-sm font-bold ${
                              index === highlightedCustomerIndex
                                ? "text-blue-700 dark:text-blue-300"
                                : "text-gray-800 dark:text-gray-200"
                            }`}
                          >
                            {customer.name}
                          </span>
                          <div
                            className="flex gap-2 text-xs text-gray-500"
                            dir="ltr"
                          >
                            <span>{customer.phone}</span>
                            {customer.code && <span>• {customer.code}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-none">
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">
                    {t.paymentMethod}
                  </label>
                  <SegmentedControl
                    value={paymentMethod}
                    onChange={(val) => setPaymentMethod(val as "cash" | "visa")}
                    color={color}
                    size="sm"
                    options={[
                      {
                        label: t.cash || "Cash",
                        value: "cash",
                        icon: "payments",
                        activeColor: "green",
                      },
                      {
                        label: t.visa || "Visa",
                        value: "visa",
                        icon: "credit_card",
                        activeColor: "blue",
                      },
                    ]}
                  />
                </div>
              </div>
            )}
          </div>
          {/* Search & Filter - No Card Container */}
          <div className="w-full flex flex-col sm:flex-row gap-1 shrink-0">
            <div className="relative flex-1">
              <SearchInput
                ref={searchInputRef}
                value={search}
                onSearchChange={(val) => {
                  setSearch(val);
                  setActiveIndex(0);
                }}
                placeholder={t.searchPlaceholder}
                badge={
                  groupedDrugs.length > 0 && (
                    <span
                      className={`inline-flex items-center justify-center h-5 px-2 text-[10px] font-bold rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600 dark:text-${color}-400`}
                    >
                      {groupedDrugs.length}
                    </span>
                  )
                }
                className="border-gray-200 dark:border-gray-800"
                style={
                  { "--tw-ring-color": `var(--color-${color}-500)` } as any
                }
                onKeyDown={(e) => {
                  const term = search.trim();

                  // --- Grid Navigation ---
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    if (groupedDrugs.length > 0) {
                      setActiveIndex(
                        (prev) => (prev + 1) % groupedDrugs.length
                      );
                    }
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    if (groupedDrugs.length > 0) {
                      setActiveIndex(
                        (prev) =>
                          (prev - 1 + groupedDrugs.length) % groupedDrugs.length
                      );
                    }
                    return;
                  }

                  // --- Execution (Enter) ---
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (!term) return;

                    // 1. Smart Barcode Detection
                    const isBarcodeLike = /^\d+$/.test(term) && term.length > 3;

                    if (isBarcodeLike) {
                      const match = inventory.find(
                        (d) =>
                          d.barcode === term ||
                          (d.internalCode && d.internalCode === term)
                      );
                      if (match) {
                        addToCart(match);
                        setSearch("");
                        return;
                      }
                    }

                    // 2. Add Active Item
                    if (groupedDrugs.length > 0) {
                      const activeGroup = groupedDrugs[activeIndex];
                      addGroupToCart(activeGroup);
                      setSearch("");
                      setActiveIndex(0);
                      // Ensure focus remains/returns to search (though it's already there)
                    }
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const selection = window.getSelection()?.toString();
                  showMenu(e.clientX, e.clientY, [
                    ...(selection
                      ? [
                          {
                            label: t.copy,
                            icon: "content_copy",
                            action: () =>
                              navigator.clipboard.writeText(selection),
                            danger: false,
                          },
                        ]
                      : []),
                    {
                      label: t.paste,
                      icon: "content_paste",
                      action: async () => {
                        try {
                          const text = await navigator.clipboard.readText();
                          setSearch((prev) => prev + text);
                        } catch (err) {
                          console.error("Failed to read clipboard", err);
                        }
                      },
                      danger: false,
                    },
                    { separator: true } as any,
                    {
                      label: t.clear,
                      icon: "backspace",
                      action: () => setSearch(""),
                      danger: false,
                    },
                  ]);
                }}
              />
            </div>
            <div className="relative min-w-[110px] h-[42px]">
              <ExpandingDropdown
                variant="input"
                items={categories}
                selectedItem={categories.find((c) => c.id === selectedCategory)}
                isOpen={activeFilterDropdown === "category"}
                onToggle={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "category" ? null : "category"
                  )
                }
                onSelect={(item) => setSelectedCategory(item.id)}
                keyExtractor={(item) => item.id}
                renderSelected={(item) => item?.label || selectedCategory}
                renderItem={(item) => item.label}
                color={color}
              />
            </div>
            <div className="relative min-w-[110px] h-[42px]">
              <ExpandingDropdown
                variant="input"
                items={["all", "in_stock", "out_of_stock"]}
                selectedItem={stockFilter}
                isOpen={activeFilterDropdown === "stock"}
                onToggle={() =>
                  setActiveFilterDropdown(
                    activeFilterDropdown === "stock" ? null : "stock"
                  )
                }
                onSelect={(item) => setStockFilter(item as any)}
                keyExtractor={(item) => item as string}
                renderSelected={(item) => {
                  if (item === "all") return t.allStock || "All Stock";
                  if (item === "in_stock") return t.inStock || "In Stock";
                  if (item === "out_of_stock")
                    return t.outOfStock || "Out of Stock";
                  return item as string;
                }}
                renderItem={(item) => {
                  if (item === "all") return t.allStock || "All Stock";
                  if (item === "in_stock") return t.inStock || "In Stock";
                  if (item === "out_of_stock")
                    return t.outOfStock || "Out of Stock";
                  return item as string;
                }}
                color={color}
              />
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 flex flex-col overflow-hidden pe-1 pb-24 lg:pb-0">
            {search.trim() === "" ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">
                  search
                </span>
                <h2 className="text-2xl font-bold tracking-tight type-expressive">
                  {t.searchPlaceholder}
                </h2>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.startSearching ||
                    "Start searching for products to add them to cart"}
                </p>
              </div>
            ) : groupedDrugs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3 p-8">
                <span className="material-symbols-rounded text-6xl opacity-20">
                  search_off
                </span>
                <p className="text-sm font-medium">
                  {t.noResults || "No results found"}
                </p>
                <p className="text-xs text-center max-w-xs opacity-70">
                  {t.tryDifferentKeywords ||
                    "Try searching with different keywords"}
                </p>
              </div>
            ) : (
              <TanStackTable
                data={tableData}
                columns={tableColumns}
                color={color}
                onRowClick={(item) => addGroupToCart(item.group)}
                onRowLongPress={(e, item) => {
                  showMenu(e.touches[0].clientX, e.touches[0].clientY, [
                    {
                      label: t.addToCart,
                      icon: "add_shopping_cart",
                      action: () => addGroupToCart(item.group),
                      danger: false,
                    },
                    {
                      label: t.viewDetails,
                      icon: "info",
                      action: () => setViewingDrug(item.group[0]),
                      danger: false,
                    },
                    { separator: true } as any,
                    {
                      label: t.actions?.showSimilar || "Show Similar",
                      icon: "category",
                      action: () => setSelectedCategory(item.category),
                      danger: false,
                    },
                  ]);
                }}
                onRowContextMenu={(e, item) => {
                  showMenu(e.clientX, e.clientY, [
                    {
                      label: t.addToCart,
                      icon: "add_shopping_cart",
                      action: () => addGroupToCart(item.group),
                      danger: false,
                    },
                    {
                      label: t.viewDetails,
                      icon: "info",
                      action: () => setViewingDrug(item.group[0]),
                      danger: false,
                    },
                    { separator: true } as any,
                    {
                      label: t.actions?.showSimilar || "Show Similar",
                      icon: "category",
                      action: () => setSelectedCategory(item.category),
                      danger: false,
                    },
                  ]);
                }}
                searchPlaceholder={t.searchPlaceholder}
                emptyMessage={t.noResults}
                defaultHiddenColumns={["category"]}
                activeIndex={activeIndex}
                enableTopToolbar={false}
              />
            )}
          </div>
        </div>

        {/* Mobile Floating Cart Summary (Only in Products View) */}
        <div
          className={`lg:hidden fixed bottom-20 left-4 right-4 z-20 ${
            mobileTab === "products" && cart.length > 0 ? "block" : "hidden"
          }`}
        >
          <button
            onClick={() => setMobileTab("cart")}
            className={`w-full p-3 rounded-2xl bg-${color}-600 text-white shadow-xl shadow-${color}-200 dark:shadow-none flex items-center justify-between animate-slide-up active:scale-95 transition-transform`}
          >
            <div className="flex items-center gap-3">
              <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-bold">
                {totalItems}
              </span>
              <span className="font-medium text-sm">{t.viewCart}</span>
            </div>
            <span className="font-bold text-base">${cartTotal.toFixed(2)}</span>
          </button>
        </div>

        {/* Resize Handle (Desktop Only) */}
        <div
          className="hidden lg:flex w-4 h-full items-center justify-center cursor-col-resize group z-10 -mx-2"
          onMouseDown={startResizing}
          onTouchStart={startResizing}
        >
          <div className="w-1 h-16 rounded-full bg-gray-200 dark:bg-gray-700 group-hover:bg-blue-500 transition-colors"></div>
        </div>

        {/* Cart Sidebar - Hidden on Mobile if Products Tab is active */}
        <div
          ref={sidebarRef}
          style={
            { "--sidebar-width": `${sidebarWidth}px` } as React.CSSProperties
          }
          className={`w-full lg:w-[var(--sidebar-width)] ${CARD_MD} border border-gray-200 dark:border-gray-800 flex flex-col overflow-hidden h-full ${
            mobileTab === "products" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="p-3 space-y-2 shrink-0">
            <div className="flex items-center justify-between">
              <h2
                className={`text-sm font-bold text-${color}-900 dark:text-${color}-100 flex items-center gap-2`}
              >
                <span className="material-symbols-rounded text-[18px]">
                  shopping_cart
                </span>
                {t.cartTitle}
                {totalItems > 0 && (
                  <span
                    className={`bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 text-[10px] font-bold px-2 py-0.5 rounded-full`}
                  >
                    {totalItems}
                  </span>
                )}
              </h2>

              {/* Mobile Back Button */}
              <button
                onClick={() => setMobileTab("products")}
                className="lg:hidden p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"
              >
                <span className="material-symbols-rounded text-[18px]">
                  close
                </span>
              </button>
            </div>
          </div>

          <div 
            className="flex-1 overflow-y-auto p-2 space-y-2 cart-scroll" 
            dir="ltr"
            style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(156, 163, 175, 0.6) transparent',
            }}
          >
            <style>{`
                .cart-scroll::-webkit-scrollbar {
                    width: 2px;
                    background: transparent;
                }
                .cart-scroll::-webkit-scrollbar-track {
                    background: transparent;
                    border: none;
                    box-shadow: none;
                }
                .cart-scroll::-webkit-scrollbar-thumb {
                    background: rgba(156, 163, 175, 0.6);
                    border-radius: 9999px;
                }
                .cart-scroll::-webkit-scrollbar-corner {
                    background: transparent;
                }
            `}</style>
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-2">
                <span className="material-symbols-rounded text-4xl opacity-20">
                  remove_shopping_cart
                </span>
                <p className="text-xs">{t.emptyCart}</p>
                <button
                  onClick={() => setMobileTab("products")}
                  className={`lg:hidden px-3 py-1.5 rounded-full bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 font-medium text-xs`}
                >
                  {t.backToProducts}
                </button>
              </div>
            ) : (
              <DndContext
                sensors={cartSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCartDragEnd}
              >
                <SortableContext
                  items={mergedCartItems.map((group) => group.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {mergedCartItems.map((group, index) => {
                    // Using Drug ID as the sortable ID logic, assuming unique per drug
                    const itemId = group.id; // Or simple 'group.id' if unique
                    return (
                      <div 
                        key={itemId} 
                        id={`cart-item-${index}`} 
                        className="w-full"
                        onClick={() => setHighlightedIndex(index)}
                        onMouseDown={() => setHighlightedIndex(index)}
                      >
                        <SortableCartItem
                          packItem={group.pack}
                          unitItem={group.unit}
                          commonItem={group.common}
                          itemId={itemId}
                          color={color}
                          t={t}
                          showMenu={showMenu}
                          getCartItemActions={getCartItemActions}
                          currentTouchCartItem={currentTouchCartItem}
                          onCartItemTouchStart={onCartItemTouchStart}
                          onCartItemTouchEnd={onCartItemTouchEnd}
                          onCartItemTouchMove={onCartItemTouchMove}
                          removeFromCart={removeFromCart}
                          toggleUnitMode={toggleUnitMode}
                          updateItemDiscount={updateItemDiscount}
                          setGlobalDiscount={setGlobalDiscount}
                          updateQuantity={updateQuantity}
                          calculateItemTotal={calculateItemTotal}
                          addToCart={addToCart}
                          removeDrugFromCart={removeDrugFromCart}
                          allBatches={inventory
                            .filter(
                              (d) =>
                                d.name === group.common.name &&
                                d.dosageForm === group.common.dosageForm
                            )
                            .sort(
                              (a, b) =>
                                new Date(a.expiryDate).getTime() -
                                new Date(b.expiryDate).getTime()
                            )}
                          onSelectBatch={switchBatchWithAutoSplit}
                          isHighlighted={index === highlightedIndex}
                          currentLang={currentLang}
                        />
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div className="p-3 border-t border-gray-200 dark:border-gray-800 space-y-2 shrink-0">
            {/* Totals Section */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-gray-400">
                <span>{t.subtotal}</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-[10px]">
                <span className="text-gray-500 dark:text-gray-400">
                  {t.orderDiscount}
                </span>
                <div className="flex items-center gap-1">
                  <span className="material-symbols-rounded text-[14px] text-gray-400">
                    percent
                  </span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={globalDiscount || ""}
                    placeholder="0"
                    onChange={(e) => {
                      const val = Math.min(
                        100,
                        Math.max(0, parseFloat(e.target.value) || 0)
                      );
                      setGlobalDiscount(val);
                      if (val > 0) {
                        setCart((prev) =>
                          prev.map((item) => ({ ...item, discount: 0 }))
                        );
                      }
                    }}
                    className="w-10 px-1 py-0.5 text-end rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-1 text-gray-700 dark:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    style={
                      { "--tw-ring-color": `var(--color-${color}-500)` } as any
                    }
                  />
                </div>
              </div>

              <div className="flex justify-between items-center text-sm font-medium pt-2 border-t border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                <span>{t.total}</span>
                <span
                  className={`text-xl font-bold text-${color}-700 dark:text-${color}-300`}
                >
                  ${cartTotal.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Action Buttons or Warning */}
            {!hasOpenShift ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 flex items-center justify-center text-center">
                <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                  <span className="material-symbols-rounded text-[20px]">
                    warning
                  </span>
                  <p className="font-bold text-sm">
                    {t.noOpenShift || "Open a shift before completing sales"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => handleCheckout("walk-in")}
                  disabled={!isValidOrder}
                  className={`flex-1 py-2.5 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2`}
                >
                  <span className="material-symbols-rounded text-[18px]">
                    payments
                  </span>
                  {t.completeOrder}
                </button>
                <button
                  onClick={() => handleCheckout("delivery")}
                  disabled={!isValidOrder}
                  className={`w-12 py-2.5 rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex justify-center items-center`}
                  title={t.deliveryOrder}
                >
                  <span className="material-symbols-rounded text-[20px]">
                    local_shipping
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Product Details Modal */}
        {viewingDrug && (
          <Modal
            isOpen={true}
            onClose={() => setViewingDrug(null)}
            size="md"
            zIndex={50}
          >
            <div
              className={`p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 flex items-center justify-center rounded-xl bg-${color}-100 dark:bg-${color}-900/30 text-${color}-600`}
                >
                  <span className="material-symbols-rounded">info</span>
                </div>
                <h3
                  className={`text-lg font-bold type-expressive text-${color}-900 dark:text-${color}-100`}
                >
                  {t.productDetails}
                </h3>
              </div>
              <button
                onClick={() => setViewingDrug(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title={t.close}
              >
                <span className="material-symbols-rounded">close</span>
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {viewingDrug.name}{" "}
                  {viewingDrug.dosageForm ? (
                    <span className="text-lg text-gray-500 font-normal">
                      ({viewingDrug.dosageForm})
                    </span>
                  ) : (
                    ""
                  )}
                </h2>
                <p className="text-gray-500 font-medium">
                  {viewingDrug.genericName}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    {t.modal?.stock || "Stock"}
                  </label>
                  <p
                    className={`text-xl font-bold ${
                      viewingDrug.stock === 0
                        ? "text-red-500"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {viewingDrug.stock}
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800">
                  <label className="text-[10px] font-bold text-gray-400 uppercase">
                    {t.modal?.price || "Price"}
                  </label>
                  <p className="text-xl font-bold text-gray-700 dark:text-gray-300">
                    ${viewingDrug.price.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-sm border-t border-gray-100 dark:border-gray-800 pt-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t.modal?.category || "Category"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {viewingDrug.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t.modal?.expiry || "Expiry"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {new Date(viewingDrug.expiryDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">
                    {t.modal?.location || "Location"}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {t.modal?.shelf || "Shelf"} A-2
                  </span>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
                  {t.modal?.description || "Description"}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-3 rounded-xl">
                  {viewingDrug.description ||
                    t.modal?.noDescription ||
                    "No description available."}
                </p>
              </div>
            </div>

            <div className="p-4 bg-gray-50 dark:bg-gray-950/50 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => setViewingDrug(null)}
                className={`w-full py-3 rounded-xl font-bold text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all`}
              >
                {t.close}
              </button>
            </div>
          </Modal>
        )}

        {/* Close Main POS Content div */}
      </div>
    </div>
  );
};

// --- Local Component for Dropdown ---
// Inlined to avoid extra files, reusing the generic hook efficiently.
