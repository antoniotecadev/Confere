import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const CARTS_STORAGE_KEY = '@confere:carts';

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
  dailyBudget?: number;
}

export const CartsStorage = {
  /**
   * Busca todos os carrinhos salvos
   */
  async getAllCarts(): Promise<Cart[]> {
    try {
      const storedCarts = await AsyncStorage.getItem(CARTS_STORAGE_KEY);
      if (storedCarts) {
        return JSON.parse(storedCarts);
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar carrinhos:', error);
      return [];
    }
  },

  /**
   * Busca um carrinho específico por ID
   */
  async getCartById(id: string): Promise<Cart | null> {
    try {
      const carts = await this.getAllCarts();
      return carts.find(cart => cart.id === id) || null;
    } catch (error) {
      console.error('Erro ao buscar carrinho:', error);
      return null;
    }
  },

  /**
   * Salva um novo carrinho
   */
  async saveCart(cart: Cart): Promise<void> {
    try {
      const carts = await this.getAllCarts();
      carts.push(cart);
      await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(carts));
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
      throw error;
    }
  },

  /**
   * Atualiza um carrinho existente
   */
  async updateCart(updatedCart: Cart): Promise<void> {
    try {
      const carts = await this.getAllCarts();
      const index = carts.findIndex(cart => cart.id === updatedCart.id);
      if (index !== -1) {
        carts[index] = updatedCart;
        await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(carts));
      }
    } catch (error) {
      console.error('Erro ao atualizar carrinho:', error);
      throw error;
    }
  },

  /**
   * Remove um carrinho e suas fotos
   */
  async deleteCart(id: string): Promise<void> {
    try {
      const carts = await this.getAllCarts();
      const cartToDelete = carts.find(cart => cart.id === id);
      
      // Eliminar fotos físicas dos produtos deste carrinho
      if (cartToDelete && cartToDelete.items) {
        for (const item of cartToDelete.items) {
          if (item.imageUri) {
            try {
              // Verificar se o arquivo existe antes de tentar deletar
              const fileInfo = await FileSystem.getInfoAsync(item.imageUri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(item.imageUri, { idempotent: true });
                console.log('Foto eliminada:', item.imageUri);
              }
            } catch (fileError) {
              console.warn('Erro ao eliminar foto:', item.imageUri, fileError);
              // Continuar mesmo se houver erro ao deletar foto individual
            }
          }
        }
      }
      
      // Remover carrinho do AsyncStorage
      const filteredCarts = carts.filter(cart => cart.id !== id);
      await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(filteredCarts));
    } catch (error) {
      console.error('Erro ao deletar carrinho:', error);
      throw error;
    }
  },

  /**
   * Limpa todos os carrinhos (útil para testes)
   */
  async clearAllCarts(): Promise<void> {
    try {
      await AsyncStorage.removeItem(CARTS_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar carrinhos:', error);
      throw error;
    }
  },

  /**
   * Cria carrinhos de exemplo (útil para testes)
   */
  async createSampleCarts(): Promise<void> {
    const sampleCarts: Cart[] = [
      {
        id: '1',
        supermarket: 'Shoprite',
        date: new Date().toISOString(),
        items: [
          { id: '1', name: 'Arroz', price: 1200, quantity: 2 },
          { id: '2', name: 'Óleo', price: 850, quantity: 1 },
        ],
        total: 3250,
      },
      {
        id: '2',
        supermarket: 'Kero',
        date: new Date(Date.now() - 86400000).toISOString(), // 1 dia atrás
        items: [
          { id: '1', name: 'Leite', price: 500, quantity: 3 },
          { id: '2', name: 'Pão', price: 250, quantity: 2 },
        ],
        total: 2000,
      },
    ];

    try {
      await AsyncStorage.setItem(CARTS_STORAGE_KEY, JSON.stringify(sampleCarts));
    } catch (error) {
      console.error('Erro ao criar carrinhos de exemplo:', error);
      throw error;
    }
  },
};
