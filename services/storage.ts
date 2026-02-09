import AsyncStorage from '@react-native-async-storage/async-storage';

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

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  currency: string;
  language: string;
  hasSeenOnboarding: boolean;
}

// ==================== STORAGE KEYS ====================

const STORAGE_KEYS = {
  CARTS: '@confere:carts',
  PRODUCTS: '@confere:products',
  COMPARISONS: '@confere:comparisons',
  SETTINGS: '@confere:settings',
  ONBOARDING: '@confere:hasSeenOnboarding',
} as const;

// ==================== DEFAULT VALUES ====================

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'auto',
  notifications: true,
  currency: 'Kz',
  language: 'pt',
  hasSeenOnboarding: false,
};

// ==================== CARTS ====================

/**
 * Busca todos os carrinhos salvos
 */
export async function getCarts(): Promise<Cart[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CARTS);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erro ao buscar carrinhos:', error);
    return [];
  }
}

/**
 * Busca um carrinho específico por ID
 */
export async function getCartById(id: string): Promise<Cart | null> {
  try {
    const carts = await getCarts();
    return carts.find(cart => cart.id === id) || null;
  } catch (error) {
    console.error('Erro ao buscar carrinho:', error);
    return null;
  }
}

/**
 * Salva um novo carrinho
 */
export async function saveCart(cart: Cart): Promise<void> {
  try {
    const carts = await getCarts();
    carts.push(cart);
    await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
  } catch (error) {
    console.error('Erro ao salvar carrinho:', error);
    throw error;
  }
}

/**
 * Atualiza um carrinho existente
 */
export async function updateCart(updatedCart: Cart): Promise<void> {
  try {
    const carts = await getCarts();
    const index = carts.findIndex(cart => cart.id === updatedCart.id);
    if (index !== -1) {
      carts[index] = updatedCart;
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(carts));
    } else {
      throw new Error('Carrinho não encontrado');
    }
  } catch (error) {
    console.error('Erro ao atualizar carrinho:', error);
    throw error;
  }
}

/**
 * Remove um carrinho
 */
export async function deleteCart(id: string): Promise<void> {
  try {
    const carts = await getCarts();
    const filtered = carts.filter(cart => cart.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao deletar carrinho:', error);
    throw error;
  }
}

// ==================== PRODUCTS ====================

/**
 * Busca todos os produtos salvos
 */
export async function getProducts(): Promise<Product[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erro ao buscar produtos:', error);
    return [];
  }
}

/**
 * Busca um produto específico por ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  try {
    const products = await getProducts();
    return products.find(product => product.id === id) || null;
  } catch (error) {
    console.error('Erro ao buscar produto:', error);
    return null;
  }
}

/**
 * Salva lista completa de produtos (substituindo)
 */
export async function saveProducts(products: Product[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  } catch (error) {
    console.error('Erro ao salvar produtos:', error);
    throw error;
  }
}

/**
 * Adiciona um novo produto
 */
export async function addProduct(product: Product): Promise<void> {
  try {
    const products = await getProducts();
    products.push(product);
    await saveProducts(products);
  } catch (error) {
    console.error('Erro ao adicionar produto:', error);
    throw error;
  }
}

/**
 * Atualiza um produto existente
 */
export async function updateProduct(updatedProduct: Product): Promise<void> {
  try {
    const products = await getProducts();
    const index = products.findIndex(product => product.id === updatedProduct.id);
    if (index !== -1) {
      products[index] = updatedProduct;
      await saveProducts(products);
    } else {
      throw new Error('Produto não encontrado');
    }
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    throw error;
  }
}

/**
 * Remove um produto
 */
export async function deleteProduct(id: string): Promise<void> {
  try {
    const products = await getProducts();
    const filtered = products.filter(product => product.id !== id);
    await saveProducts(filtered);
  } catch (error) {
    console.error('Erro ao deletar produto:', error);
    throw error;
  }
}

/**
 * Busca produtos por nome (pesquisa)
 */
export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const products = await getProducts();
    const lowerQuery = query.toLowerCase();
    return products.filter(product =>
      product.name.toLowerCase().includes(lowerQuery)
    );
  } catch (error) {
    console.error('Erro ao pesquisar produtos:', error);
    return [];
  }
}

// ==================== COMPARISONS ====================

/**
 * Busca todas as comparações salvas
 */
export async function getComparisons(): Promise<Comparison[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.COMPARISONS);
    if (data) {
      return JSON.parse(data);
    }
    return [];
  } catch (error) {
    console.error('Erro ao buscar comparações:', error);
    return [];
  }
}

/**
 * Busca comparação por ID do carrinho
 */
export async function getComparisonByCartId(cartId: string): Promise<Comparison | null> {
  try {
    const comparisons = await getComparisons();
    return comparisons.find(comp => comp.cartId === cartId) || null;
  } catch (error) {
    console.error('Erro ao buscar comparação:', error);
    return null;
  }
}

/**
 * Salva uma comparação
 */
export async function saveComparison(comparison: Comparison): Promise<void> {
  try {
    const comparisons = await getComparisons();
    // Remove comparação antiga do mesmo carrinho se existir
    const filtered = comparisons.filter(comp => comp.cartId !== comparison.cartId);
    filtered.push(comparison);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao salvar comparação:', error);
    throw error;
  }
}

/**
 * Remove uma comparação
 */
export async function deleteComparison(cartId: string): Promise<void> {
  try {
    const comparisons = await getComparisons();
    const filtered = comparisons.filter(comp => comp.cartId !== cartId);
    await AsyncStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(filtered));
  } catch (error) {
    console.error('Erro ao deletar comparação:', error);
    throw error;
  }
}

// ==================== SETTINGS ====================

/**
 * Busca configurações da aplicação
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (data) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Erro ao buscar configurações:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Salva configurações da aplicação
 */
export async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const currentSettings = await getSettings();
    const updatedSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updatedSettings));
  } catch (error) {
    console.error('Erro ao salvar configurações:', error);
    throw error;
  }
}

/**
 * Atualiza uma configuração específica
 */
export async function updateSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K]
): Promise<void> {
  try {
    const settings = await getSettings();
    settings[key] = value;
    await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  } catch (error) {
    console.error('Erro ao atualizar configuração:', error);
    throw error;
  }
}

// ==================== ONBOARDING ====================

/**
 * Verifica se o usuário já viu o onboarding
 */
export async function hasSeenOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
    return value === 'true';
  } catch (error) {
    console.error('Erro ao verificar onboarding:', error);
    return false;
  }
}

/**
 * Marca o onboarding como visto
 */
export async function markOnboardingAsSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
    await updateSetting('hasSeenOnboarding', true);
  } catch (error) {
    console.error('Erro ao marcar onboarding:', error);
    throw error;
  }
}

/**
 * Reseta o status do onboarding (útil para testes)
 */
export async function resetOnboarding(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING);
    await updateSetting('hasSeenOnboarding', false);
  } catch (error) {
    console.error('Erro ao resetar onboarding:', error);
    throw error;
  }
}

// ==================== UTILITIES ====================

/**
 * Limpa todos os dados da aplicação
 */
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CARTS,
      STORAGE_KEYS.PRODUCTS,
      STORAGE_KEYS.COMPARISONS,
      STORAGE_KEYS.SETTINGS,
      STORAGE_KEYS.ONBOARDING,
    ]);
  } catch (error) {
    console.error('Erro ao limpar dados:', error);
    throw error;
  }
}

/**
 * Exporta todos os dados para backup
 */
export async function exportData(): Promise<string> {
  try {
    const carts = await getCarts();
    const products = await getProducts();
    const comparisons = await getComparisons();
    const settings = await getSettings();

    const backup = {
      carts,
      products,
      comparisons,
      settings,
      exportDate: new Date().toISOString(),
      version: '1.0.0',
    };

    return JSON.stringify(backup);
  } catch (error) {
    console.error('Erro ao exportar dados:', error);
    throw error;
  }
}

/**
 * Importa dados de um backup
 */
export async function importData(backupJson: string): Promise<void> {
  try {
    const backup = JSON.parse(backupJson);

    if (backup.carts) {
      await AsyncStorage.setItem(STORAGE_KEYS.CARTS, JSON.stringify(backup.carts));
    }
    if (backup.products) {
      await saveProducts(backup.products);
    }
    if (backup.comparisons) {
      await AsyncStorage.setItem(STORAGE_KEYS.COMPARISONS, JSON.stringify(backup.comparisons));
    }
    if (backup.settings) {
      await saveSettings(backup.settings);
    }
  } catch (error) {
    console.error('Erro ao importar dados:', error);
    throw error;
  }
}

/**
 * Retorna estatísticas gerais dos dados
 */
export async function getDataStats(): Promise<{
  totalCarts: number;
  totalProducts: number;
  totalComparisons: number;
  storageSize: string;
}> {
  try {
    const carts = await getCarts();
    const products = await getProducts();
    const comparisons = await getComparisons();

    // Estimar tamanho do storage
    const allData = await exportData();
    const sizeInBytes = new Blob([allData]).size;
    const sizeInKB = (sizeInBytes / 1024).toFixed(2);

    return {
      totalCarts: carts.length,
      totalProducts: products.length,
      totalComparisons: comparisons.length,
      storageSize: `${sizeInKB} KB`,
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return {
      totalCarts: 0,
      totalProducts: 0,
      totalComparisons: 0,
      storageSize: '0 KB',
    };
  }
}
