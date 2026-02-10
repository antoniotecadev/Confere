import { CartsStorage } from '@/utils/carts-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@confere_shopping_list';

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
  expectedPrice: number | null;
  suggestedPrice: number | null;
  lastStore: string | null;
  lastPurchaseDate: string | null;
  daysAgo: number | null;
  isOldData: boolean;
  createdAt: string;
}

export interface PriceSuggestion {
  price: number;
  store: string;
  date: string;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  purchaseCount: number;
}

export interface ProductByStore {
  productName: string;
  store: string;
  price: number;
  lastPurchaseDate: string;
  daysAgo: number;
  purchaseCount: number;
}

class ShoppingListServiceClass {
  /**
   * Obter todos os itens da lista
   */
  async getItems(): Promise<ShoppingListItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch (error) {
      console.error('Erro ao carregar lista de compras:', error);
      return [];
    }
  }

  /**
   * Adicionar item à lista
   */
  async addItem(
    name: string,
    quantity: number = 1,
    unit: string = 'un',
    expectedPrice: number | null = null
  ): Promise<ShoppingListItem> {
    const items = await this.getItems();

    // Buscar sugestão de preço no histórico
    const suggestion = await this.getPriceSuggestion(name);

    const newItem: ShoppingListItem = {
      id: Date.now().toString(),
      name: name.trim(),
      quantity,
      unit,
      checked: false,
      expectedPrice,
      suggestedPrice: suggestion?.averagePrice || null,
      lastStore: suggestion?.store || null,
      lastPurchaseDate: suggestion?.date || null,
      daysAgo: suggestion ? this.calculateDaysAgo(suggestion.date) : null,
      isOldData: suggestion ? suggestion.purchaseCount > 0 && this.calculateDaysAgo(suggestion.date) > 30 : false,
      createdAt: new Date().toISOString(),
    };

    items.push(newItem);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    return newItem;
  }

  /**
   * Atualizar item
   */
  async updateItem(itemId: string, updates: Partial<ShoppingListItem>): Promise<void> {
    const items = await this.getItems();
    const index = items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      throw new Error('Item não encontrado');
    }

    items[index] = { ...items[index], ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  /**
   * Marcar/desmarcar item como comprado
   */
  async toggleItem(itemId: string): Promise<void> {
    const items = await this.getItems();
    const item = items.find((i) => i.id === itemId);

    if (item) {
      item.checked = !item.checked;
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }

  /**
   * Remover item da lista
   */
  async removeItem(itemId: string): Promise<void> {
    const items = await this.getItems();
    const filtered = items.filter((item) => item.id !== itemId);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Limpar todos os itens marcados
   */
  async clearCheckedItems(): Promise<void> {
    const items = await this.getItems();
    const unchecked = items.filter((item) => !item.checked);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unchecked));
  }

  /**
   * Limpar toda a lista
   */
  async clearAll(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  }

  /**
   * Buscar sugestão de preço no histórico de carrinhos
   */
  async getPriceSuggestion(productName: string): Promise<PriceSuggestion | null> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const normalizedName = this.normalizeProductName(productName);

      const allMatches: Array<{ price: number; store: string; date: string }> = [];
      const now = new Date().getTime();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      // Buscar em todos os carrinhos
      for (const cart of carts) {
        for (const product of cart.items) {
          if (this.normalizeProductName(product.name) === normalizedName) {
            allMatches.push({
              price: product.price,
              store: cart.supermarket,
              date: cart.date,
            });
          }
        }
      }

      if (allMatches.length === 0) {
        return null;
      }

      // Filtrar apenas últimos 30 dias
      const recentMatches = allMatches.filter((m) => {
        const matchDate = new Date(m.date).getTime();
        return matchDate >= thirtyDaysAgo;
      });

      // Se não houver dados recentes, usar todos os dados (com flag de aviso)
      const matches = recentMatches.length > 0 ? recentMatches : allMatches;

      // Calcular estatísticas
      const prices = matches.map((m) => m.price);
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const lowestPrice = Math.min(...prices);
      const highestPrice = Math.max(...prices);

      // Encontrar a compra mais recente
      const latest = matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

      // Encontrar onde foi mais barato (dentro do período considerado)
      const cheapest = matches.find((m) => m.price === lowestPrice) || latest;

      return {
        price: latest.price,
        store: cheapest.store,
        date: latest.date,
        averagePrice: Math.round(averagePrice),
        lowestPrice,
        highestPrice,
        purchaseCount: matches.length,
      };
    } catch (error) {
      console.error('Erro ao buscar sugestão de preço:', error);
      return null;
    }
  }

  /**
   * Obter total estimado da lista
   */
  async getEstimatedTotal(): Promise<{
    total: number;
    itemsWithPrice: number;
    totalItems: number;
  }> {
    const items = await this.getItems();
    const uncheckedItems = items.filter((item) => !item.checked);

    let total = 0;
    let itemsWithPrice = 0;

    for (const item of uncheckedItems) {
      if (item.suggestedPrice !== null) {
        total += item.suggestedPrice * item.quantity;
        itemsWithPrice++;
      }
    }

    return {
      total: Math.round(total),
      itemsWithPrice,
      totalItems: uncheckedItems.length,
    };
  }

  /**
   * Obter produtos sugeridos (baseado em frequência)
   */
  async getSuggestedProducts(limit: number = 10): Promise<Array<{ name: string; count: number }>> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const productCount: { [key: string]: number } = {};

      // Contar frequência de produtos
      for (const cart of carts) {
        for (const product of cart.items) {
          const normalized = this.normalizeProductName(product.name);
          productCount[normalized] = (productCount[normalized] || 0) + 1;
        }
      }

      // Ordenar por frequência
      const sorted = Object.entries(productCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);

      return sorted;
    } catch (error) {
      console.error('Erro ao buscar produtos sugeridos:', error);
      return [];
    }
  }

  /**
   * Calcular quantos dias atrás foi uma data
   */
  private calculateDaysAgo(dateString: string): number {
    const date = new Date(dateString).getTime();
    const now = new Date().getTime();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  /**
   * Normalizar nome do produto para comparação
   */
  private normalizeProductName(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
  }

  /**
   * Buscar produto em TODOS os supermercados
   * Retorna lista com preço por supermercado
   */
  async getProductByStores(productName: string): Promise<ProductByStore[]> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const normalizedName = this.normalizeProductName(productName);
      const storeMap = new Map<string, { prices: number[]; lastDate: string }>();

      // Agrupar por supermercado
      for (const cart of carts) {
        for (const product of cart.items) {
          if (this.normalizeProductName(product.name) === normalizedName) {
            const store = cart.supermarket;
            
            if (!storeMap.has(store)) {
              storeMap.set(store, { prices: [], lastDate: cart.date });
            }
            
            const data = storeMap.get(store)!;
            data.prices.push(product.price);
            
            // Manter a data mais recente
            if (new Date(cart.date) > new Date(data.lastDate)) {
              data.lastDate = cart.date;
            }
          }
        }
      }

      // Converter para array de resultados
      const results: ProductByStore[] = [];
      
      storeMap.forEach((data, store) => {
        const averagePrice = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
        const daysAgo = this.calculateDaysAgo(data.lastDate);
        
        results.push({
          productName: productName.trim(),
          store,
          price: Math.round(averagePrice),
          lastPurchaseDate: data.lastDate,
          daysAgo,
          purchaseCount: data.prices.length,
        });
      });

      // Ordenar por preço (menor para maior)
      results.sort((a, b) => a.price - b.price);

      return results;
    } catch (error) {
      console.error('Erro ao buscar produto por supermercados:', error);
      return [];
    }
  }
}

export const ShoppingListService = new ShoppingListServiceClass();
