

export interface Drug {
  id: string;
  name: string;
  genericName: string;
  category: string;
  price: number;
  costPrice: number; // New: Buying price
  stock: number;
  expiryDate: string;
  description: string;
  barcode?: string;
  internalCode?: string;
  unitsPerPack?: number;
  supplierId?: string; // Preferred supplier
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
}

export interface CartItem extends Drug {
  quantity: number;
  discount?: number;
  isUnit?: boolean;
}

export interface PurchaseItem {
  drugId: string;
  name: string;
  quantity: number; // Packs
  costPrice: number; // Cost per pack at time of purchase
  expiryDate?: string;
}

export interface Sale {
  id: string;
  date: string;
  items: CartItem[];
  total: number;
  subtotal?: number;
  customerName?: string;
  globalDiscount?: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalCost: number;
  status: 'completed' | 'pending';
}

export interface ThemeColor {
  name: string;
  primary: string;
  hex: string;
}

export type ViewState = 'dashboard' | 'inventory' | 'pos' | 'sales-history' | 'suppliers' | 'purchases' | 'barcode-studio';

export type Language = 'EN' | 'AR';