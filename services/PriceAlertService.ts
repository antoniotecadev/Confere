import { CartsStorage } from '@/utils/carts-storage';

export interface PriceAlert {
  type: 'great-deal' | 'good-deal' | 'warning' | 'normal';
  title: string;
  message: string;
  percentage: number;
  savings: number;
  averagePrice: number;
  currentPrice: number;
  icon: string;
}

class PriceAlertServiceClass {
  /**
   * Analisa o preço de um produto no contexto de um supermercado específico
   */
  async analyzePriceInSupermarket(
    productName: string,
    currentPrice: number,
    supermarketName: string
  ): Promise<PriceAlert | null> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);

      // Filtrar apenas carrinhos deste supermercado
      const supermarketCarts = carts.filter(
        (cart) => cart.supermarket === supermarketName
      );

      if (supermarketCarts.length === 0) {
        return null; // Primeiro carrinho deste supermercado
      }

      // Normalizar nome do produto
      const normalizedName = this.normalizeProductName(productName);

      // Buscar histórico deste produto neste supermercado
      const priceHistory: number[] = [];

      for (const cart of supermarketCarts) {
        const cartDate = new Date(cart.date).getTime();
        
        // Considerar apenas últimos 30 dias
        if (cartDate >= thirtyDaysAgo) {
          for (const item of cart.items) {
            if (this.normalizeProductName(item.name) === normalizedName) {
              priceHistory.push(item.price);
            }
          }
        }
      }

      // Se não houver histórico deste produto neste supermercado
      if (priceHistory.length === 0) {
        return null;
      }

      // Calcular estatísticas
      const averagePrice = priceHistory.reduce((a, b) => a + b, 0) / priceHistory.length;
      const lowestPrice = Math.min(...priceHistory);
      const highestPrice = Math.max(...priceHistory);

      // Calcular diferença percentual
      const priceDiff = currentPrice - averagePrice;
      const percentage = (priceDiff / averagePrice) * 100;

      // Determinar tipo de alert
      return this.createAlert(
        currentPrice,
        averagePrice,
        percentage,
        supermarketName,
        lowestPrice,
        highestPrice
      );
    } catch (error) {
      console.error('Erro ao analisar preço:', error);
      return null;
    }
  }

  /**
   * Cria o alert apropriado baseado na análise de preço
   */
  private createAlert(
    currentPrice: number,
    averagePrice: number,
    percentage: number,
    supermarketName: string,
    lowestPrice: number,
    highestPrice: number
  ): PriceAlert | null {
    const savings = Math.round(averagePrice - currentPrice);
    const absPercentage = Math.abs(Math.round(percentage));

    // Super promoção (≥20% desconto)
    if (percentage <= -20) {
      return {
        type: 'great-deal',
        title: `💎 SUPER PROMOÇÃO no ${supermarketName}!`,
        message: `Este produto está ${absPercentage}% mais barato que o normal!\n\nPreço normal: ${Math.round(averagePrice).toLocaleString('pt-AO')} Kz\nVocê economiza: ${savings.toLocaleString('pt-AO')} Kz\n\n💡 Ótimo momento para comprar mais unidades!`,
        percentage: absPercentage,
        savings,
        averagePrice: Math.round(averagePrice),
        currentPrice,
        icon: '💎',
      };
    }

    // Boa promoção (10-19% desconto)
    if (percentage <= -10) {
      return {
        type: 'good-deal',
        title: `🔥 Ótimo Preço no ${supermarketName}!`,
        message: `Este produto está ${absPercentage}% mais barato que sua média.\n\nPreço normal: ${Math.round(averagePrice).toLocaleString('pt-AO')} Kz\nVocê economiza: ${savings.toLocaleString('pt-AO')} Kz\n\n💡 Bom momento para comprar!`,
        percentage: absPercentage,
        savings,
        averagePrice: Math.round(averagePrice),
        currentPrice,
        icon: '🔥',
      };
    }

    // Preço alto (≥15% acima)
    if (percentage >= 15) {
      return {
        type: 'warning',
        title: `⚠️ Preço Acima da Média`,
        message: `Este produto está ${absPercentage}% mais caro que o normal no ${supermarketName}.\n\nSua média: ${Math.round(averagePrice).toLocaleString('pt-AO')} Kz\nMenor preço já pago: ${lowestPrice.toLocaleString('pt-AO')} Kz\n\n💡 Considere aguardar uma promoção.`,
        percentage: absPercentage,
        savings: -savings,
        averagePrice: Math.round(averagePrice),
        currentPrice,
        icon: '⚠️',
      };
    }

    // Preço normal (-10% a +15%)
    return {
      type: 'normal',
      title: 'Preço Normal',
      message: `Preço dentro da média no ${supermarketName}.`,
      percentage: absPercentage,
      savings: 0,
      averagePrice: Math.round(averagePrice),
      currentPrice,
      icon: '✓',
    };
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

export const PriceAlertService = new PriceAlertServiceClass();
