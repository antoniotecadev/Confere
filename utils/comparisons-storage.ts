import AsyncStorage from '@react-native-async-storage/async-storage';

const COMPARISONS_STORAGE_KEY = '@confere:comparisons';

export interface Comparison {
  id: string;
  cartId: string;
  supermarket: string;
  date: string;
  calculatedTotal: number;
  chargedTotal: number;
  difference: number;
  matches: boolean;
}

export const ComparisonsStorage = {
  /**
   * Busca todas as comparações salvas
   */
  async getAllComparisons(): Promise<Comparison[]> {
    try {
      const stored = await AsyncStorage.getItem(COMPARISONS_STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Erro ao buscar comparações:', error);
      return [];
    }
  },

  /**
   * Busca comparação por ID do carrinho
   */
  async getComparisonByCartId(cartId: string): Promise<Comparison | null> {
    try {
      const comparisons = await this.getAllComparisons();
      return comparisons.find(comp => comp.cartId === cartId) || null;
    } catch (error) {
      console.error('Erro ao buscar comparação:', error);
      return null;
    }
  },

  /**
   * Salva uma nova comparação
   */
  async saveComparison(comparison: Comparison): Promise<void> {
    try {
      const comparisons = await this.getAllComparisons();
      // Remove comparação antiga do mesmo carrinho se existir
      const filtered = comparisons.filter(comp => comp.cartId !== comparison.cartId);
      filtered.push(comparison);
      await AsyncStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao salvar comparação:', error);
      throw error;
    }
  },

  /**
   * Remove uma comparação
   */
  async deleteComparison(cartId: string): Promise<void> {
    try {
      const comparisons = await this.getAllComparisons();
      const filtered = comparisons.filter(comp => comp.cartId !== cartId);
      await AsyncStorage.setItem(COMPARISONS_STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Erro ao deletar comparação:', error);
      throw error;
    }
  },

  /**
   * Limpa todas as comparações
   */
  async clearAllComparisons(): Promise<void> {
    try {
      await AsyncStorage.removeItem(COMPARISONS_STORAGE_KEY);
    } catch (error) {
      console.error('Erro ao limpar comparações:', error);
      throw error;
    }
  },
};
