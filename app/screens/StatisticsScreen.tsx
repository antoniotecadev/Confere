import { CartsStorage } from '@/utils/carts-storage';
import { ComparisonsStorage } from '@/utils/comparisons-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Dimensions,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import LineChart from 'react-native-chart-kit/dist/line-chart';

type PeriodType = 'daily' | 'weekly' | 'monthly' | 'yearly';

interface Statistics {
  totalComparisons: number;
  totalSaved: number;
  errorsFound: number;
  perfectMatches: number;
  totalCarts: number;
  totalSpent: number;
  supermarketStats: { name: string; count: number; errors: number; spent: number }[];
  topProducts: { name: string; quantity: number; spent: number }[];
  periodData: { labels: string[]; values: number[] };
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('monthly');
  const [stats, setStats] = useState<Statistics>({
    totalComparisons: 0,
    totalSaved: 0,
    errorsFound: 0,
    perfectMatches: 0,
    totalCarts: 0,
    totalSpent: 0,
    supermarketStats: [],
    topProducts: [],
    periodData: { labels: [], values: [] },
  });

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [selectedPeriod])
  );

  const getPeriodDates = (period: PeriodType) => {
    const now = new Date();
    const dates: Date[] = [];

    switch (period) {
      case 'daily':
        // Últimos 7 dias
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          dates.push(date);
        }
        break;
      case 'weekly':
        // Últimas 8 semanas
        for (let i = 7; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - (i * 7));
          dates.push(date);
        }
        break;
      case 'monthly':
        // Últimos 6 meses
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now);
          date.setMonth(date.getMonth() - i);
          dates.push(date);
        }
        break;
      case 'yearly':
        // Últimos 5 anos
        for (let i = 4; i >= 0; i--) {
          const date = new Date(now);
          date.setFullYear(date.getFullYear() - i);
          dates.push(date);
        }
        break;
    }

    return dates;
  };

  const formatPeriodLabel = (date: Date, period: PeriodType): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    switch (period) {
      case 'daily':
        return `${day}/${month}`;
      case 'weekly':
        // Mostrar a data de início da semana
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekDay = weekStart.getDate().toString().padStart(2, '0');
        const weekMonth = (weekStart.getMonth() + 1).toString().padStart(2, '0');
        return `${weekDay}/${weekMonth}`;
      case 'monthly':
        return `${month}/${year.toString().slice(2)}`;
      case 'yearly':
        return year.toString();
      default:
        return '';
    }
  };

  const isInPeriod = (cartDate: string, targetDate: Date, period: PeriodType): boolean => {
    const cart = new Date(cartDate);
    const target = new Date(targetDate);

    switch (period) {
      case 'daily':
        return cart.toDateString() === target.toDateString();
      case 'weekly':
        // Calcular o início da semana (domingo) para ambas as datas
        const cartWeekStart = new Date(cart);
        cartWeekStart.setDate(cart.getDate() - cart.getDay());
        cartWeekStart.setHours(0, 0, 0, 0);
        
        const targetWeekStart = new Date(target);
        targetWeekStart.setDate(target.getDate() - target.getDay());
        targetWeekStart.setHours(0, 0, 0, 0);
        
        // Comparar se estão na mesma semana
        return cartWeekStart.getTime() === targetWeekStart.getTime();
      case 'monthly':
        return cart.getMonth() === target.getMonth() && cart.getFullYear() === target.getFullYear();
      case 'yearly':
        return cart.getFullYear() === target.getFullYear();
      default:
        return false;
    }
  };

  const loadStatistics = async () => {
    try {
      const comparisons = await ComparisonsStorage.getAllComparisons();
      const carts = await CartsStorage.getAllCarts();

      // Calcular total economizado (diferenças positivas = cobrado a mais)
      const totalSaved = comparisons.reduce((sum, comp) => {
        return sum + (comp.difference > 0 ? comp.difference : 0);
      }, 0);

      // Calcular total gasto
      const totalSpent = carts.reduce((sum, cart) => sum + cart.total, 0);

      // Contar erros encontrados
      const errorsFound = comparisons.filter(comp => !comp.matches).length;

      // Contar matches perfeitos
      const perfectMatches = comparisons.filter(comp => comp.matches).length;

      // Estatísticas por supermercado
      const supermarketMap = new Map<string, { count: number; errors: number; spent: number }>();
      
      comparisons.forEach(comp => {
        const current = supermarketMap.get(comp.supermarket) || { count: 0, errors: 0, spent: 0 };
        const cart = carts.find(c => c.id === comp.cartId);
        supermarketMap.set(comp.supermarket, {
          count: current.count + 1,
          errors: current.errors + (!comp.matches ? 1 : 0),
          spent: current.spent + (cart?.total || 0),
        });
      });

      const supermarketStats = Array.from(supermarketMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      // Top produtos mais comprados
      const productMap = new Map<string, { quantity: number; spent: number }>();
      
      carts.forEach(cart => {
        cart.items.forEach(item => {
          const current = productMap.get(item.name) || { quantity: 0, spent: 0 };
          productMap.set(item.name, {
            quantity: current.quantity + item.quantity,
            spent: current.spent + (item.price * item.quantity),
          });
        });
      });

      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10); // Top 10

      // Dados por período
      const periodDates = getPeriodDates(selectedPeriod);
      const periodData = {
        labels: periodDates.map(date => formatPeriodLabel(date, selectedPeriod)),
        values: periodDates.map(date => {
          const cartsInPeriod = carts.filter(cart => isInPeriod(cart.date, date, selectedPeriod));
          return cartsInPeriod.reduce((sum, cart) => sum + cart.total, 0);
        }),
      };

      setStats({
        totalComparisons: comparisons.length,
        totalSaved,
        errorsFound,
        perfectMatches,
        totalCarts: carts.length,
        totalSpent,
        supermarketStats,
        topProducts,
        periodData,
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const calculateAccuracyRate = () => {
    if (stats.totalComparisons === 0) return 0;
    return Math.round((stats.perfectMatches / stats.totalComparisons) * 100);
  };

  const getPeriodTitle = () => {
    switch (selectedPeriod) {
      case 'daily': return 'Últimos 7 Dias';
      case 'weekly': return 'Últimas 8 Semanas';
      case 'monthly': return 'Últimos 6 Meses';
      case 'yearly': return 'Últimos 5 Anos';
      default: return '';
    }
  };

  const screenWidth = Dimensions.get('window').width;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Estatísticas</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'daily' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('daily')}>
            <Text style={[styles.periodButtonText, selectedPeriod === 'daily' && styles.periodButtonTextActive]}>
              Diário
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'weekly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('weekly')}>
            <Text style={[styles.periodButtonText, selectedPeriod === 'weekly' && styles.periodButtonTextActive]}>
              Semanal
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'monthly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('monthly')}>
            <Text style={[styles.periodButtonText, selectedPeriod === 'monthly' && styles.periodButtonTextActive]}>
              Mensal
            </Text>
          </Pressable>
          <Pressable
            style={[styles.periodButton, selectedPeriod === 'yearly' && styles.periodButtonActive]}
            onPress={() => setSelectedPeriod('yearly')}>
            <Text style={[styles.periodButtonText, selectedPeriod === 'yearly' && styles.periodButtonTextActive]}>
              Anual
            </Text>
          </Pressable>
        </View>

        {/* Main Stats Cards */}
        <View style={styles.mainStatsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Ionicons name="cash-outline" size={36} color="#4CAF50" style={styles.statIcon} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalSaved)}</Text>
            <Text style={styles.statLabel}>Economizado</Text>
            <Text style={styles.statSubtext}>Erros evitados</Text>
          </View>

          <View style={[styles.statCard, styles.statCardBlue]}>
            <Ionicons name="wallet-outline" size={36} color="#2196F3" style={styles.statIcon} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalSpent)}</Text>
            <Text style={styles.statLabel}>Gasto Total</Text>
            <Text style={styles.statSubtext}>Todos carrinhos</Text>
          </View>
        </View>

        <View style={styles.mainStatsRow}>
          <View style={[styles.statCard, styles.statCardRed]}>
            <Ionicons name="alert-circle-outline" size={36} color="#F44336" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.errorsFound}</Text>
            <Text style={styles.statLabel}>Erros</Text>
            <Text style={styles.statSubtext}>Encontrados</Text>
          </View>

          <View style={[styles.statCard, styles.statCardPurple]}>
            <Ionicons name="checkmark-circle-outline" size={36} color="#9C27B0" style={styles.statIcon} />
            <Text style={styles.statValue}>{calculateAccuracyRate()}%</Text>
            <Text style={styles.statLabel}>Acerto</Text>
            <Text style={styles.statSubtext}>Taxa média</Text>
          </View>
        </View>

        {/* Spending Over Time Chart */}
        {stats.totalCarts > 0 && stats.periodData.values.some(v => v > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gastos por Período - {getPeriodTitle()}</Text>
            <View style={styles.chartCard}>
              <LineChart
                data={{
                  labels: stats.periodData.labels,
                  datasets: [{
                    data: stats.periodData.values.length > 0 ? stats.periodData.values : [0],
                  }],
                }}
                width={screenWidth - 64}
                height={220}
                chartConfig={{
                  backgroundColor: '#FFFFFF',
                  backgroundGradientFrom: '#FFFFFF',
                  backgroundGradientTo: '#FFFFFF',
                  decimalPlaces: 0,
                  color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
                  labelColor: (opacity = 1) => `rgba(102, 102, 102, ${opacity})`,
                  style: {
                    borderRadius: 16,
                  },
                  propsForDots: {
                    r: '4',
                    strokeWidth: '2',
                    stroke: '#2196F3',
                  },
                  propsForBackgroundLines: {
                    strokeDasharray: '',
                    stroke: '#F0F0F0',
                  },
                }}
                bezier
                style={styles.chart}
                formatYLabel={(value) => {
                  const num = parseFloat(value);
                  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
                  if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                  return num.toFixed(0);
                }}
              />
            </View>
          </View>
        )}

        {/* Additional Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo Geral</Text>
          
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="cart-outline" size={20} color="#666666" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Total de Carrinhos</Text>
              </View>
              <Text style={styles.infoValue}>{stats.totalCarts}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="checkmark-done-outline" size={20} color="#4CAF50" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Conferências Corretas</Text>
              </View>
              <Text style={styles.infoValue}>{stats.perfectMatches}</Text>
            </View>
            <View style={styles.infoDivider} />
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="close-circle-outline" size={20} color="#F44336" style={styles.infoIcon} />
                <Text style={styles.infoLabel}>Conferências com Erro</Text>
              </View>
              <Text style={styles.infoValue}>{stats.errorsFound}</Text>
            </View>
          </View>
        </View>

        {/* Top Products */}
        {stats.topProducts.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top 10 Produtos Mais Comprados</Text>
            <View style={styles.infoCard}>
              {stats.topProducts.map((product, index) => (
                <React.Fragment key={product.name}>
                  {index > 0 && <View style={styles.infoDivider} />}
                  <View style={styles.productRow}>
                    <View style={styles.productInfo}>
                      <View style={styles.productRankContainer}>
                        <Text style={styles.productRank}>#{index + 1}</Text>
                        <Text style={styles.productName}>{product.name}</Text>
                      </View>
                      <Text style={styles.productSubtext}>
                        {product.quantity} {product.quantity === 1 ? 'unidade' : 'unidades'}
                      </Text>
                    </View>
                    <View style={styles.productStats}>
                      <Text style={styles.productSpent}>{formatCurrency(product.spent)}</Text>
                      <Text style={styles.productLabel}>Total gasto</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Supermarket Stats */}
        {stats.supermarketStats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Supermercados</Text>
            <View style={styles.infoCard}>
              {stats.supermarketStats.map((market, index) => (
                <React.Fragment key={market.name}>
                  {index > 0 && <View style={styles.infoDivider} />}
                  <View style={styles.supermarketRow}>
                    <View style={styles.supermarketInfo}>
                      <View style={styles.supermarketNameContainer}>
                        <Ionicons name="storefront-outline" size={18} color="#333333" style={styles.supermarketIcon} />
                        <Text style={styles.supermarketName}>{market.name}</Text>
                      </View>
                      <Text style={styles.supermarketSubtext}>
                        {market.count} {market.count === 1 ? 'comparação' : 'comparações'} • {formatCurrency(market.spent)}
                      </Text>
                    </View>
                    <View style={styles.supermarketStats}>
                      <Text style={[styles.supermarketAccuracy, market.errors === 0 && styles.supermarketAccuracyGood]}>
                        {market.count > 0 ? Math.round(((market.count - market.errors) / market.count) * 100) : 0}%
                      </Text>
                      <Text style={styles.supermarketLabel}>Acerto</Text>
                    </View>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        )}

        {/* Empty State */}
        {stats.totalComparisons === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="stats-chart-outline" size={80} color="#CCCCCC" style={styles.emptyIcon} />
            <Text style={styles.emptyTitle}>Sem estatísticas ainda</Text>
            <Text style={styles.emptyText}>
              Comece a comparar os teus carrinhos para ver as estatísticas aqui.
            </Text>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
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
  content: {
    flex: 1,
    padding: 16,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: '#2196F3',
  },
  periodButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666666',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  mainStatsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardGreen: {
    borderTopWidth: 4,
    borderTopColor: '#4CAF50',
  },
  statCardBlue: {
    borderTopWidth: 4,
    borderTopColor: '#2196F3',
  },
  statCardRed: {
    borderTopWidth: 4,
    borderTopColor: '#F44336',
  },
  statCardPurple: {
    borderTopWidth: 4,
    borderTopColor: '#9C27B0',
  },
  statIcon: {
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 2,
  },
  statSubtext: {
    fontSize: 12,
    color: '#999999',
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    marginLeft: 4,
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    alignItems: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666666',
  },
  infoValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  productInfo: {
    flex: 1,
  },
  productRankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  productRank: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2196F3',
    marginRight: 8,
    width: 32,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  productSubtext: {
    fontSize: 14,
    color: '#999999',
    marginLeft: 40,
  },
  productStats: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  productSpent: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 2,
  },
  productLabel: {
    fontSize: 12,
    color: '#999999',
  },
  supermarketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  supermarketInfo: {
    flex: 1,
  },
  supermarketNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  supermarketIcon: {
    marginRight: 8,
  },
  supermarketName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  supermarketSubtext: {
    fontSize: 14,
    color: '#999999',
  },
  supermarketStats: {
    alignItems: 'flex-end',
  },
  supermarketAccuracy: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 2,
  },
  supermarketAccuracyGood: {
    color: '#4CAF50',
  },
  supermarketLabel: {
    fontSize: 12,
    color: '#999999',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
});
