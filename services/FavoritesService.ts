import { CartsStorage } from '@/utils/carts-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FAVORITES_STORAGE_KEY = '@confere_favorites';

export interface FavoriteProduct {
  name: string;
  frequency: number; // Número de carrinhos onde aparece
  totalPurchases: number; // Total de carrinhos analisados
  frequencyPercentage: number; // Porcentagem (ex: 80%)
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  lastPrice: number;
  lastPurchaseDate: string;
  priceHistory: Array<{ date: string; price: number; supermarket: string }>;
  isMarkedFavorite: boolean; // Marcado manualmente pelo usuário
}

class FavoritesServiceClass {
  /**
   * Detecta produtos frequentes automaticamente
   */
  async detectFrequentProducts(minFrequency: number = 3): Promise<FavoriteProduct[]> {
    try {
      const carts = await CartsStorage.getAllCarts();
      
      if (carts.length === 0) {
        return [];
      }

      // Considerar apenas últimos 10 carrinhos (ou todos se tiver menos)
      const recentCarts = carts
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 10);

      const productMap = new Map<string, {
        frequency: number;
        prices: Array<{ date: string; price: number; supermarket: string }>;
      }>();

      // Contar frequência de cada produto
      for (const cart of recentCarts) {
        const productsSeen = new Set<string>();
        
        for (const item of cart.items) {
          const normalizedName = this.normalizeProductName(item.name);
          
          // Contar apenas 1x por carrinho (mesmo se comprou 3 unidades)
          if (!productsSeen.has(normalizedName)) {
            const current = productMap.get(normalizedName) || { frequency: 0, prices: [] };
            productMap.set(normalizedName, {
              frequency: current.frequency + 1,
              prices: [
                ...current.prices,
                { date: cart.date, price: item.price, supermarket: cart.supermarket },
              ],
            });
            productsSeen.add(normalizedName);
          }
        }
      }

      // Filtrar produtos com frequência mínima
      const frequentProducts: FavoriteProduct[] = [];
      const manualFavorites = await this.getManualFavorites();

      for (const [name, data] of productMap.entries()) {
        if (data.frequency >= minFrequency || manualFavorites.includes(name)) {
          const prices = data.prices.map(p => p.price);
          const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
          const lowestPrice = Math.min(...prices);
          const highestPrice = Math.max(...prices);

          // Ordenar por data para pegar o último
          const sortedPrices = [...data.prices].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          const latest = sortedPrices[0];

          frequentProducts.push({
            name,
            frequency: data.frequency,
            totalPurchases: recentCarts.length,
            frequencyPercentage: Math.round((data.frequency / recentCarts.length) * 100),
            averagePrice: Math.round(averagePrice),
            lowestPrice,
            highestPrice,
            lastPrice: latest.price,
            lastPurchaseDate: latest.date,
            priceHistory: sortedPrices,
            isMarkedFavorite: manualFavorites.includes(name),
          });
        }
      }

      // Ordenar por frequência (mais frequente primeiro)
      return frequentProducts.sort((a, b) => b.frequency - a.frequency);
    } catch (error) {
      console.error('Erro ao detectar produtos frequentes:', error);
      return [];
    }
  }

  /**
   * Obter evolução de preço de um produto específico
   */
  async getPriceEvolution(productName: string, months: number = 6): Promise<Array<{
    date: string;
    price: number;
    supermarket: string;
  }>> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const normalizedName = this.normalizeProductName(productName);
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - months);

      const priceHistory: Array<{ date: string; price: number; supermarket: string }> = [];

      for (const cart of carts) {
        if (new Date(cart.date) < cutoffDate) continue;

        for (const item of cart.items) {
          if (this.normalizeProductName(item.name) === normalizedName) {
            priceHistory.push({
              date: cart.date,
              price: item.price,
              supermarket: cart.supermarket,
            });
          }
        }
      }

      // Ordenar por data (mais antigo primeiro para gráfico)
      return priceHistory.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
    } catch (error) {
      console.error('Erro ao obter evolução de preço:', error);
      return [];
    }
  }

  /**
   * Marcar/desmarcar produto como favorito manualmente
   */
  async toggleFavorite(productName: string): Promise<void> {
    try {
      const favorites = await this.getManualFavorites();
      const normalizedName = this.normalizeProductName(productName);
      
      if (favorites.includes(normalizedName)) {
        // Remover
        const filtered = favorites.filter(name => name !== normalizedName);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(filtered));
      } else {
        // Adicionar
        favorites.push(normalizedName);
        await AsyncStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
      }
    } catch (error) {
      console.error('Erro ao marcar favorito:', error);
    }
  }

  /**
   * Obter lista de favoritos marcados manualmente
   */
  async getManualFavorites(): Promise<string[]> {
    try {
      const data = await AsyncStorage.getItem(FAVORITES_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Erro ao carregar favoritos:', error);
      return [];
    }
  }

  /**
   * Verificar se um produto é favorito
   */
  async isFavorite(productName: string): Promise<boolean> {
    const favorites = await this.getManualFavorites();
    return favorites.includes(this.normalizeProductName(productName));
  }

  /**
   * Calcular tendência de preço (subindo, descendo, estável)
   */
  calculatePriceTrend(priceHistory: Array<{ price: number }>): 'up' | 'down' | 'stable' {
    if (priceHistory.length < 2) return 'stable';

    // Comparar últimos 3 preços com os 3 anteriores
    const recentCount = Math.min(3, Math.floor(priceHistory.length / 2));
    const recent = priceHistory.slice(-recentCount);
    const older = priceHistory.slice(-recentCount * 2, -recentCount);

    if (older.length === 0) return 'stable';

    const recentAvg = recent.reduce((sum, p) => sum + p.price, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.price, 0) / older.length;

    const diff = ((recentAvg - olderAvg) / olderAvg) * 100;

    if (diff > 5) return 'up';
    if (diff < -5) return 'down';
    return 'stable';
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
}

export const FavoritesService = new FavoritesServiceClass();
