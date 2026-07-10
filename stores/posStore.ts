import { create } from 'zustand';
import type { CartItem } from '../types';

interface POSState {
  cart: CartItem[];
  isCheckoutInProgress: boolean;
  activeTabId: string | null;

  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateCartItem: (id: string, quantity: number) => void;
  clearCart: () => void;
  setCheckoutInProgress: (val: boolean) => void;
  setActiveTabId: (id: string | null) => void;
}

export const usePOSStore = create<POSState>((set) => ({
  cart: [],
  isCheckoutInProgress: false,
  activeTabId: null,

  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((c) => c.id === item.id);
      if (existing) {
        return {
          cart: state.cart.map((c) =>
            c.id === item.id ? { ...c, quantity: c.quantity + item.quantity } : c
          ),
        };
      }
      return { cart: [...state.cart, item] };
    }),

  removeFromCart: (id) => set((state) => ({ cart: state.cart.filter((c) => c.id !== id) })),

  updateCartItem: (id, quantity) =>
    set((state) => ({
      cart: state.cart.map((c) => (c.id === id ? { ...c, quantity } : c)),
    })),

  clearCart: () => set({ cart: [] }),
  setCheckoutInProgress: (val) => set({ isCheckoutInProgress: val }),
  setActiveTabId: (id) => set({ activeTabId: id }),
}));
