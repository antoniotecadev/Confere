import * as StorageService from '@/services/storage';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

// ==================== TYPES ====================

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUri?: string;
}

export interface Cart {
  id: string;
  supermarket: string;
  date: string;
  items: CartItem[];
  total: number;
  isCompleted?: boolean;
}

export interface Product {
  id: string;
  name: string;
  category?: string;
  lastPrice?: number;
  barcode?: string;
  imageUri?: string;
  createdAt: string;
}

interface CartContextData {
  // State
  carts: Cart[];
  products: Product[];
  currentCart: Cart | null;
  isLoading: boolean;

  // Cart operations
  addCart: (cart: Omit<Cart, 'id' | 'date' | 'total'>) => Promise<Cart>;
  updateCart: (cartId: string, updates: Partial<Cart>) => Promise<void>;
  deleteCart: (cartId: string) => Promise<void>;
  setCurrentCart: (cartId: string | null) => void;
  
  // Cart item operations
  addItemToCart: (cartId: string, item: Omit<CartItem, 'id'>) => Promise<void>;
  updateCartItem: (cartId: string, itemId: string, updates: Partial<CartItem>) => Promise<void>;
  removeItemFromCart: (cartId: string, itemId: string) => Promise<void>;
  
  // Product operations
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<Product>;
  updateProduct: (productId: string, updates: Partial<Product>) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  searchProducts: (query: string) => Product[];

  // Utility
  refreshCarts: () => Promise<void>;
  refreshProducts: () => Promise<void>;
  calculateCartTotal: (cartId: string) => number;
}

// ==================== CONTEXT ====================

const CartContext = createContext<CartContextData | undefined>(undefined);

// ==================== PROVIDER ====================

interface CartProviderProps {
  children: ReactNode;
}

export function CartProvider({ children }: CartProviderProps) {
  const [carts, setCarts] = useState<Cart[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [currentCart, setCurrentCartState] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ==================== LOAD DATA ====================

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const [loadedCarts, loadedProducts] = await Promise.all([
        StorageService.getCarts(),
        StorageService.getProducts(),
      ]);
      setCarts(loadedCarts);
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Erro ao carregar dados iniciais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCarts = async () => {
    try {
      const loadedCarts = await StorageService.getCarts();
      setCarts(loadedCarts);
    } catch (error) {
      console.error('Erro ao atualizar carrinhos:', error);
    }
  };

  const refreshProducts = async () => {
    try {
      const loadedProducts = await StorageService.getProducts();
      setProducts(loadedProducts);
    } catch (error) {
      console.error('Erro ao atualizar produtos:', error);
    }
  };

  // ==================== CART OPERATIONS ====================

  const calculateTotal = (items: CartItem[]): number => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateCartTotal = (cartId: string): number => {
    const cart = carts.find(c => c.id === cartId);
    if (!cart) return 0;
    return calculateTotal(cart.items);
  };

  const addCart = async (
    cartData: Omit<Cart, 'id' | 'date' | 'total'>
  ): Promise<Cart> => {
    try {
      const newCart: Cart = {
        ...cartData,
        id: Date.now().toString(),
        date: new Date().toISOString(),
        total: calculateTotal(cartData.items),
      };

      await StorageService.saveCart(newCart);
      setCarts(prev => [...prev, newCart]);
      
      return newCart;
    } catch (error) {
      console.error('Erro ao adicionar carrinho:', error);
      throw error;
    }
  };

  const updateCart = async (
    cartId: string,
    updates: Partial<Cart>
  ): Promise<void> => {
    try {
      const cartIndex = carts.findIndex(c => c.id === cartId);
      if (cartIndex === -1) {
        throw new Error('Carrinho não encontrado');
      }

      const updatedCart: Cart = {
        ...carts[cartIndex],
        ...updates,
      };

      // Recalcular total se os items foram atualizados
      if (updates.items) {
        updatedCart.total = calculateTotal(updates.items);
      }

      await StorageService.updateCart(updatedCart);
      
      const newCarts = [...carts];
      newCarts[cartIndex] = updatedCart;
      setCarts(newCarts);

      // Atualizar currentCart se for o mesmo
      if (currentCart?.id === cartId) {
        setCurrentCartState(updatedCart);
      }
    } catch (error) {
      console.error('Erro ao atualizar carrinho:', error);
      throw error;
    }
  };

  const deleteCart = async (cartId: string): Promise<void> => {
    try {
      await StorageService.deleteCart(cartId);
      setCarts(prev => prev.filter(c => c.id !== cartId));
      
      if (currentCart?.id === cartId) {
        setCurrentCartState(null);
      }
    } catch (error) {
      console.error('Erro ao deletar carrinho:', error);
      throw error;
    }
  };

  const setCurrentCart = (cartId: string | null) => {
    if (cartId === null) {
      setCurrentCartState(null);
    } else {
      const cart = carts.find(c => c.id === cartId);
      setCurrentCartState(cart || null);
    }
  };

  // ==================== CART ITEM OPERATIONS ====================

  const addItemToCart = async (
    cartId: string,
    itemData: Omit<CartItem, 'id'>
  ): Promise<void> => {
    try {
      const cart = carts.find(c => c.id === cartId);
      if (!cart) {
        throw new Error('Carrinho não encontrado');
      }

      const newItem: CartItem = {
        ...itemData,
        id: Date.now().toString(),
      };

      const updatedItems = [...cart.items, newItem];
      await updateCart(cartId, { items: updatedItems });
    } catch (error) {
      console.error('Erro ao adicionar item ao carrinho:', error);
      throw error;
    }
  };

  const updateCartItem = async (
    cartId: string,
    itemId: string,
    updates: Partial<CartItem>
  ): Promise<void> => {
    try {
      const cart = carts.find(c => c.id === cartId);
      if (!cart) {
        throw new Error('Carrinho não encontrado');
      }

      const itemIndex = cart.items.findIndex(item => item.id === itemId);
      if (itemIndex === -1) {
        throw new Error('Item não encontrado');
      }

      const updatedItems = [...cart.items];
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        ...updates,
      };

      await updateCart(cartId, { items: updatedItems });
    } catch (error) {
      console.error('Erro ao atualizar item do carrinho:', error);
      throw error;
    }
  };

  const removeItemFromCart = async (
    cartId: string,
    itemId: string
  ): Promise<void> => {
    try {
      const cart = carts.find(c => c.id === cartId);
      if (!cart) {
        throw new Error('Carrinho não encontrado');
      }

      const updatedItems = cart.items.filter(item => item.id !== itemId);
      await updateCart(cartId, { items: updatedItems });
    } catch (error) {
      console.error('Erro ao remover item do carrinho:', error);
      throw error;
    }
  };

  // ==================== PRODUCT OPERATIONS ====================

  const addProduct = async (
    productData: Omit<Product, 'id' | 'createdAt'>
  ): Promise<Product> => {
    try {
      const newProduct: Product = {
        ...productData,
        id: Date.now().toString(),
        createdAt: new Date().toISOString(),
      };

      await StorageService.addProduct(newProduct);
      setProducts(prev => [...prev, newProduct]);
      
      return newProduct;
    } catch (error) {
      console.error('Erro ao adicionar produto:', error);
      throw error;
    }
  };

  const updateProduct = async (
    productId: string,
    updates: Partial<Product>
  ): Promise<void> => {
    try {
      const productIndex = products.findIndex(p => p.id === productId);
      if (productIndex === -1) {
        throw new Error('Produto não encontrado');
      }

      const updatedProduct: Product = {
        ...products[productIndex],
        ...updates,
      };

      await StorageService.updateProduct(updatedProduct);
      
      const newProducts = [...products];
      newProducts[productIndex] = updatedProduct;
      setProducts(newProducts);
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      throw error;
    }
  };

  const removeProduct = async (productId: string): Promise<void> => {
    try {
      await StorageService.deleteProduct(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error('Erro ao remover produto:', error);
      throw error;
    }
  };

  const searchProducts = (query: string): Product[] => {
    if (!query.trim()) return products;
    
    const lowerQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.category?.toLowerCase().includes(lowerQuery) ||
      product.barcode?.includes(query)
    );
  };

  // ==================== CONTEXT VALUE ====================

  const value: CartContextData = {
    // State
    carts,
    products,
    currentCart,
    isLoading,

    // Cart operations
    addCart,
    updateCart,
    deleteCart,
    setCurrentCart,

    // Cart item operations
    addItemToCart,
    updateCartItem,
    removeItemFromCart,

    // Product operations
    addProduct,
    updateProduct,
    removeProduct,
    searchProducts,

    // Utility
    refreshCarts,
    refreshProducts,
    calculateCartTotal,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// ==================== HOOK ====================

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

// ==================== EXPORTS ====================

export default CartContext;
