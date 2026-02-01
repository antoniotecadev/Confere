import { CartsStorage } from '@/utils/carts-storage';

export interface ProductPrice {
  productName: string;
  prices: {
    supermarket: string;
    price: number;
    date: string;
    quantity: number;
  }[];
  lowestPrice: number;
  highestPrice: number;
  bestSupermarket: string;
  totalPurchases: number;
}

export const PriceComparisonService = {
  /**
   * Normaliza nomes de produtos (remove espaços extras, lowercase, etc)
   */
  normalizeProductName(name: string): string {
    let normalized = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');

    // Remover acentos
    normalized = normalized
      .replace(/[áàâãä]/g, 'a')
      .replace(/[éèêë]/g, 'e')
      .replace(/[íìîï]/g, 'i')
      .replace(/[óòôõö]/g, 'o')
      .replace(/[úùûü]/g, 'u')
      .replace(/ç/g, 'c')
      .replace(/ñ/g, 'n');

    // Remover quantidades (1kg, 500g, 2l, 1.5l, 250ml, etc)
    normalized = normalized
      .replace(/\d+[\.,]?\d*\s?(kg|g|l|ml|un|unid|unidade|unidades|pc|pcs|pacote|pacotes)/gi, '')
      .replace(/\d+x/gi, ''); // Remove "2x", "3x"

    // Remover palavras comuns que não identificam o produto
    const wordsToRemove = [
      'pacote', 'caixa', 'garrafa', 'lata', 'fardo',
      'embalagem', 'pack', 'saco', 'vidro', 'plastico',
      'de', 'da', 'do', 'com', 'sem', 'extra', 'super',
      'kg', 'g', 'l', 'ml', 'litro', 'litros', 'grama', 'gramas'
    ];
    
    wordsToRemove.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      normalized = normalized.replace(regex, '');
    });

    // Remover espaços múltiplos e trim final
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
  },

  /**
   * Agrupa produtos similares por nome normalizado
   */
  async getProductPrices(): Promise<ProductPrice[]> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const productMap = new Map<string, ProductPrice>();

      // Processar todos os produtos de todos os carrinhos
      carts.forEach(cart => {
        cart.items.forEach(item => {
          const normalizedName = this.normalizeProductName(item.name);
          
          if (!productMap.has(normalizedName)) {
            productMap.set(normalizedName, {
              productName: item.name, // Usar o nome original do primeiro item
              prices: [],
              lowestPrice: item.price,
              highestPrice: item.price,
              bestSupermarket: cart.supermarket,
              totalPurchases: 0,
            });
          }

          const productData = productMap.get(normalizedName)!;

          // Verificar se já existe preço deste supermercado
          const existingPriceIndex = productData.prices.findIndex(
            p => p.supermarket === cart.supermarket
          );

          if (existingPriceIndex >= 0) {
            // Se o preço atual for mais recente, atualiza
            const existingPrice = productData.prices[existingPriceIndex];
            if (new Date(cart.date) > new Date(existingPrice.date)) {
              productData.prices[existingPriceIndex] = {
                supermarket: cart.supermarket,
                price: item.price,
                date: cart.date,
                quantity: item.quantity,
              };
            }
          } else {
            // Adiciona novo preço de supermercado
            productData.prices.push({
              supermarket: cart.supermarket,
              price: item.price,
              date: cart.date,
              quantity: item.quantity,
            });
          }

          // Atualizar menor e maior preço
          if (item.price < productData.lowestPrice) {
            productData.lowestPrice = item.price;
            productData.bestSupermarket = cart.supermarket;
          }
          if (item.price > productData.highestPrice) {
            productData.highestPrice = item.price;
          }

          // Incrementar total de compras
          productData.totalPurchases += item.quantity;
        });
      });

      // Converter Map para Array e ordenar por total de compras
      const products = Array.from(productMap.values())
        .filter(p => p.prices.length >= 2) // Só produtos com preços em 2+ supermercados
        .sort((a, b) => b.totalPurchases - a.totalPurchases);

      return products;
    } catch (error) {
      console.error('Erro ao obter comparação de preços:', error);
      return [];
    }
  },

  /**
   * Calcula economia potencial comprando no supermercado mais barato
   */
  calculatePotentialSavings(product: ProductPrice): number {
    if (product.prices.length < 2) return 0;
    return product.highestPrice - product.lowestPrice;
  },

  /**
   * Calcula porcentagem de diferença entre o mais caro e o mais barato
   */
  calculatePriceDifference(product: ProductPrice): number {
    if (product.lowestPrice === 0) return 0;
    return ((product.highestPrice - product.lowestPrice) / product.lowestPrice) * 100;
  },

  /**
   * Busca produto específico por nome
   */
  async searchProduct(searchTerm: string): Promise<ProductPrice[]> {
    const allProducts = await this.getProductPrices();
    const normalizedSearch = this.normalizeProductName(searchTerm);
    
    return allProducts.filter(product => 
      this.normalizeProductName(product.productName).includes(normalizedSearch)
    );
  },

  /**
   * Retorna lista de nomes de produtos únicos para autocomplete
   */
  async getAllProductNames(): Promise<string[]> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const productNames = new Set<string>();

      carts.forEach(cart => {
        cart.items.forEach(item => {
          productNames.add(item.name);
        });
      });

      return Array.from(productNames).sort();
    } catch (error) {
      console.error('Erro ao obter nomes de produtos:', error);
      return [];
    }
  },

  /**
   * Sugere produtos baseado no texto digitado
   */
  async suggestProducts(searchTerm: string, limit: number = 5): Promise<string[]> {
    if (!searchTerm || searchTerm.trim().length < 2) return [];

    const allNames = await this.getAllProductNames();
    const normalizedSearch = this.normalizeProductName(searchTerm);

    // Filtrar produtos que correspondem
    const matches = allNames.filter(name => 
      this.normalizeProductName(name).includes(normalizedSearch)
    );

    return matches.slice(0, limit);
  },
};
