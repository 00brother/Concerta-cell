import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, CartItem, ShippingOption } from '../types/index.ts';

interface CartContextType {
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
  shippingOption: ShippingOption | null;
  setShippingOption: (option: ShippingOption | null) => void;
  shippingCep: string;
  setShippingCep: (cep: string) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'consertacell_cart_v1';
const CEP_STORAGE_KEY = 'consertacell_cep_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [shippingCep, setShippingCepState] = useState<string>(() => {
    try {
      return localStorage.getItem(CEP_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [shippingOption, setShippingOption] = useState<ShippingOption | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (e) {
      console.error('Falha ao salvar carrinho no localStorage', e);
    }
  }, [cart]);

  const setShippingCep = (cep: string) => {
    setShippingCepState(cep);
    try {
      localStorage.setItem(CEP_STORAGE_KEY, cep);
    } catch (e) {
      console.error('Falha ao salvar CEP', e);
    }
  };

  const addToCart = (product: Product, quantity = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        const newQty = Math.min(
          product.stock,
          updated[existingIndex].quantity + quantity
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      } else {
        const initialQty = Math.min(product.stock, Math.max(1, quantity));
        return [...prev, { product, quantity: initialQty }];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          const clamped = Math.min(item.product.stock, quantity);
          return { ...item, quantity: clamped };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCart([]);
    setShippingOption(null);
  };

  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cart.reduce((acc, item) => {
    const price =
      item.product.promotionalPrice && item.product.promotionalPrice > 0
        ? item.product.promotionalPrice
        : item.product.price;
    return acc + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
        shippingOption,
        setShippingOption,
        shippingCep,
        setShippingCep,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
