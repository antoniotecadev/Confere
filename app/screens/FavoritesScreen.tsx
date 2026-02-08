import { FavoriteProduct, FavoritesService } from '@/app/services/FavoritesService';
import { ShoppingListService } from '@/app/services/ShoppingListService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<FavoriteProduct | null>(null);

  useEffect(() => {
    loadFavorites();
  }, []);

  const loadFavorites = async () => {
    setLoading(true);
    const data = await FavoritesService.detectFrequentProducts(2); // Mínimo 2 compras
    setFavorites(data);
    setLoading(false);
  };

  const handleToggleFavorite = async (product: FavoriteProduct) => {
    // Atualizar imediatamente no estado local para resposta instantânea
    setFavorites(prevFavorites =>
      prevFavorites.map(p =>
        p.name === product.name
          ? { ...p, isMarkedFavorite: !p.isMarkedFavorite }
          : p
      )
    );
    
    // Atualizar no storage em background
    await FavoritesService.toggleFavorite(product.name);
  };

  const handleAddToShoppingList = async (product: FavoriteProduct) => {
    try {
      await ShoppingListService.addItem(product.name, 1);
      Alert.alert('Sucesso', `${product.name} adicionado à lista de compras!`);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível adicionar à lista');
    }
  };

  const handleViewEvolution = async (product: FavoriteProduct) => {
    const evolution = await FavoritesService.getPriceEvolution(product.name, 6);
    if (evolution.length === 0) {
      Alert.alert('Sem Dados', 'Não há histórico suficiente para mostrar a evolução de preço.');
      return;
    }
    setSelectedProduct(product);
  };

  const getTrendIcon = (product: FavoriteProduct) => {
    const trend = FavoritesService.calculatePriceTrend(product.priceHistory);
    if (trend === 'up') return '📈';
    if (trend === 'down') return '📉';
    return '➖';
  };

  const getTrendColor = (product: FavoriteProduct) => {
    const trend = FavoritesService.calculatePriceTrend(product.priceHistory);
    if (trend === 'up') return '#f44336';
    if (trend === 'down') return '#4CAF50';
    return '#9E9E9E';
  };

  const getFrequencyColor = (percentage: number) => {
    if (percentage >= 70) return '#4CAF50'; // Verde
    if (percentage >= 40) return '#FF9800'; // Laranja
    return '#2196F3'; // Azul
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Favoritos</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderPriceEvolutionChart = () => {
    if (!selectedProduct) return null;

    const evolution = selectedProduct.priceHistory.slice(-10); // Últimos 10 pontos
    if (evolution.length < 2) {
      return (
        <View style={styles.chartContainer}>
          <Text style={styles.noDataText}>Dados insuficientes para gráfico</Text>
        </View>
      );
    }

    const data = {
      labels: evolution.map((_, index) => 
        index === 0 ? 'Início' : index === evolution.length - 1 ? 'Atual' : ''
      ),
      datasets: [
        {
          data: evolution.map(e => e.price),
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2,
        },
      ],
    };

    return (
      <View style={styles.chartContainer}>
        <View style={styles.chartHeader}>
          <TouchableOpacity onPress={() => setSelectedProduct(null)} style={{ marginRight: 12 }}>
            <Ionicons name="close" size={28} color="#666" />
          </TouchableOpacity>
          <Text style={styles.chartTitle}>{selectedProduct.name}</Text>
        </View>

        <LineChart
          data={data}
          width={Dimensions.get('window').width - 40}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForDots: {
              r: '4',
              strokeWidth: '2',
              stroke: '#2196F3',
            },
          }}
          bezier
          style={styles.chart}
        />

        <View style={styles.chartStats}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Média</Text>
            <Text style={styles.statValue}>{selectedProduct.averagePrice} Kz</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Mínimo</Text>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>
              {selectedProduct.lowestPrice} Kz
            </Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Máximo</Text>
            <Text style={[styles.statValue, { color: '#f44336' }]}>
              {selectedProduct.highestPrice} Kz
            </Text>
          </View>
        </View>

        <Text style={styles.chartFooter}>
          Última compra: {new Date(selectedProduct.lastPurchaseDate).toLocaleDateString('pt-AO')} - {selectedProduct.lastPrice} Kz
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Analisando seu histórico...</Text>
        </View>
      </View>
    );
  }

  if (selectedProduct) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <ScrollView>
          {renderPriceEvolutionChart()}
        </ScrollView>
      </View>
    );
  }

  if (favorites.length === 0) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.emptyContainer}>
          <Ionicons name="cube-outline" size={80} color="#BDBDBD" />
          <Text style={styles.emptyTitle}>Nenhum Produto Frequente</Text>
          <Text style={styles.emptyText}>
            Adicione mais carrinhos para que possamos detectar seus produtos favoritos automaticamente.
          </Text>
          <View style={styles.emptyHintBox}>
            <Ionicons name="bulb-outline" size={16} color="#2196F3" />
            <Text style={styles.emptyHint}>
              Produtos aparecem aqui após serem comprados pelo menos 2 vezes
            </Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Info */}
        <View style={styles.infoCard}>
          <Ionicons name="bulb" size={20} color="#1976D2" style={{ marginRight: 8 }} />
          <Text style={styles.infoText}>
            Produtos detectados automaticamente com base nos seus últimos 10 carrinhos
          </Text>
        </View>

        {/* Lista de Favoritos */}
        {favorites.map((product, index) => (
          <View key={index} style={styles.productCard}>
            {/* Header do Card */}
            <View style={styles.productHeader}>
              <View style={styles.productTitleContainer}>
                <Text style={styles.productName}>{product.name}</Text>
                {product.isMarkedFavorite && (
                  <View style={styles.favoriteBadge}>
                    <Ionicons name="star" size={10} color="#F57C00" />
                    <Text style={styles.favoriteBadgeText}> Favorito</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                onPress={() => handleToggleFavorite(product)}
                style={styles.favoriteButton}
              >
                <Ionicons 
                  name={product.isMarkedFavorite ? 'star' : 'star-outline'} 
                  size={24} 
                  color={product.isMarkedFavorite ? '#FFC107' : '#757575'} 
                />
              </TouchableOpacity>
            </View>

            {/* Frequência */}
            <View style={styles.frequencyContainer}>
              <View
                style={[
                  styles.frequencyBadge,
                  { backgroundColor: getFrequencyColor(product.frequencyPercentage) },
                ]}
              >
                <Text style={styles.frequencyText}>
                  {product.frequency} de {product.totalPurchases} carrinhos ({product.frequencyPercentage}%)
                </Text>
              </View>
            </View>

            {/* Preços */}
            <View style={styles.pricesContainer}>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Último Preço</Text>
                <Text style={styles.priceValue}>{product.lastPrice} Kz</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Preço Médio</Text>
                <Text style={styles.priceValue}>{product.averagePrice} Kz</Text>
              </View>
              <View style={styles.priceItem}>
                <Text style={styles.priceLabel}>Tendência</Text>
                <Text style={[styles.priceValue, { color: getTrendColor(product) }]}>
                  {getTrendIcon(product)}
                </Text>
              </View>
            </View>

            {/* Variação de Preço */}
            {product.lowestPrice !== product.highestPrice && (
              <View style={styles.rangeContainer}>
                <Text style={styles.rangeText}>
                  Variação: {product.lowestPrice} Kz - {product.highestPrice} Kz
                </Text>
              </View>
            )}

            {/* Ações */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.actionButton, styles.evolutionButton]}
                onPress={() => handleViewEvolution(product)}
              >
                <Ionicons name="bar-chart" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>Ver Evolução</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.addButton]}
                onPress={() => handleAddToShoppingList(product)}
              >
                <Ionicons name="add-circle" size={16} color="white" style={{ marginRight: 4 }} />
                <Text style={styles.actionButtonText}>Lista</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#2196F3',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f5f5f5',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  emptyHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#2196F3',
    marginLeft: 8,
    flex: 1,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
  },
  productCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productTitleContainer: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  favoriteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  favoriteBadgeText: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '600',
  },
  favoriteButton: {
    padding: 4,
  },
  frequencyContainer: {
    marginBottom: 12,
  },
  frequencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  frequencyText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '600',
  },
  pricesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  priceItem: {
    flex: 1,
    alignItems: 'center',
  },
  priceLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  rangeContainer: {
    backgroundColor: '#f5f5f5',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  rangeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evolutionButton: {
    backgroundColor: '#2196F3',
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Gráfico
  chartContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  chartTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  chartFooter: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    padding: 20,
  },
});
