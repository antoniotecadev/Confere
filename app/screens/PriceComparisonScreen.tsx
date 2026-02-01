import { PriceComparisonService, ProductPrice } from '@/app/services/PriceComparisonService';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function PriceComparisonScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductPrice[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductPrice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [])
  );

  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const productPrices = await PriceComparisonService.getProductPrices();
      setProducts(productPrices);
      setFilteredProducts(productPrices);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    if (text.trim() === '') {
      setFilteredProducts(products);
    } else {
      const results = await PriceComparisonService.searchProduct(text);
      setFilteredProducts(results);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const renderProductItem = ({ item }: { item: ProductPrice }) => {
    const savings = PriceComparisonService.calculatePotentialSavings(item);
    const difference = PriceComparisonService.calculatePriceDifference(item);
    
    // Ordenar preços do menor para o maior
    const sortedPrices = [...item.prices].sort((a, b) => a.price - b.price);

    return (
      <View style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productTitleContainer}>
            <Ionicons name="pricetag" size={20} color="#2196F3" />
            <Text style={styles.productName}>{item.productName}</Text>
          </View>
          <View style={styles.purchaseBadge}>
            <Text style={styles.purchaseBadgeText}>
              {item.totalPurchases}x comprado
            </Text>
          </View>
        </View>

        {savings > 0 && (
          <View style={styles.savingsContainer}>
            <Ionicons name="trending-down" size={16} color="#4CAF50" />
            <Text style={styles.savingsText}>
              Economiza até {formatCurrency(savings)} ({difference.toFixed(0)}%)
            </Text>
          </View>
        )}

        <View style={styles.pricesContainer}>
          {sortedPrices.map((priceData, index) => (
            <View
              key={priceData.supermarket}
              style={[
                styles.priceRow,
                index === 0 && styles.priceRowBest,
                index === sortedPrices.length - 1 && styles.priceRowWorst,
              ]}>
              <View style={styles.priceInfo}>
                {index === 0 && (
                  <Ionicons name="trophy" size={16} color="#4CAF50" style={styles.priceIcon} />
                )}
                {index === sortedPrices.length - 1 && sortedPrices.length > 1 && (
                  <Ionicons name="alert-circle" size={16} color="#F44336" style={styles.priceIcon} />
                )}
                <View style={styles.priceTextContainer}>
                  <Text style={[
                    styles.supermarketText,
                    index === 0 && styles.supermarketTextBest,
                  ]}>
                    {priceData.supermarket}
                  </Text>
                  <Text style={styles.dateText}>Última compra: {formatDate(priceData.date)}</Text>
                </View>
              </View>
              <Text style={[
                styles.priceText,
                index === 0 && styles.priceTextBest,
                index === sortedPrices.length - 1 && styles.priceTextWorst,
              ]}>
                {formatCurrency(priceData.price)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cart-outline" size={80} color="#CCCCCC" />
      <Text style={styles.emptyTitle}>
        {searchQuery ? 'Produto não encontrado' : 'Sem dados para comparar'}
      </Text>
      <Text style={styles.emptyDescription}>
        {searchQuery
          ? 'Tenta buscar com outro nome'
          : 'Compra produtos em pelo menos 2 supermercados diferentes para ver a comparação de preços'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Comparar Preços</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar produto..."
          value={searchQuery}
          onChangeText={handleSearch}
          placeholderTextColor="#999999"
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => handleSearch('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999999" />
          </Pressable>
        )}
      </View>

      {/* Info Banner */}
      {!searchQuery && products.length > 0 && (
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle" size={20} color="#2196F3" />
          <Text style={styles.infoBannerText}>
            {products.length} {products.length === 1 ? 'produto disponível' : 'produtos disponíveis'} para comparação
          </Text>
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProductItem}
        keyExtractor={item => item.productName}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333333',
  },
  clearButton: {
    padding: 4,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 14,
    color: '#1976D2',
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    flex: 1,
  },
  purchaseBadge: {
    backgroundColor: '#E3F2FD',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  purchaseBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  savingsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    gap: 8,
  },
  savingsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
    flex: 1,
  },
  pricesContainer: {
    gap: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  priceRowBest: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  priceRowWorst: {
    backgroundColor: '#FFEBEE',
  },
  priceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  priceIcon: {
    marginRight: 8,
  },
  priceTextContainer: {
    flex: 1,
  },
  supermarketText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 2,
  },
  supermarketTextBest: {
    color: '#4CAF50',
  },
  dateText: {
    fontSize: 12,
    color: '#999999',
  },
  priceText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  priceTextBest: {
    color: '#4CAF50',
    fontSize: 18,
  },
  priceTextWorst: {
    color: '#F44336',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
