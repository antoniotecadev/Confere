import { CartsStorage } from '@/utils/carts-storage';
import { ComparisonsStorage } from '@/utils/comparisons-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface Statistics {
  totalComparisons: number;
  totalSaved: number;
  errorsFound: number;
  perfectMatches: number;
  totalCarts: number;
  supermarketStats: { name: string; count: number; errors: number }[];
}

export default function StatisticsScreen() {
  const router = useRouter();
  const [stats, setStats] = useState<Statistics>({
    totalComparisons: 0,
    totalSaved: 0,
    errorsFound: 0,
    perfectMatches: 0,
    totalCarts: 0,
    supermarketStats: [],
  });

  useFocusEffect(
    useCallback(() => {
      loadStatistics();
    }, [])
  );

  const loadStatistics = async () => {
    try {
      const comparisons = await ComparisonsStorage.getAllComparisons();
      const carts = await CartsStorage.getAllCarts();

      // Calcular total economizado (diferenças positivas = cobrado a mais)
      const totalSaved = comparisons.reduce((sum, comp) => {
        return sum + (comp.difference > 0 ? comp.difference : 0);
      }, 0);

      // Contar erros encontrados
      const errorsFound = comparisons.filter(comp => !comp.matches).length;

      // Contar matches perfeitos
      const perfectMatches = comparisons.filter(comp => comp.matches).length;

      // Estatísticas por supermercado
      const supermarketMap = new Map<string, { count: number; errors: number }>();
      
      comparisons.forEach(comp => {
        const current = supermarketMap.get(comp.supermarket) || { count: 0, errors: 0 };
        supermarketMap.set(comp.supermarket, {
          count: current.count + 1,
          errors: current.errors + (!comp.matches ? 1 : 0),
        });
      });

      const supermarketStats = Array.from(supermarketMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      setStats({
        totalComparisons: comparisons.length,
        totalSaved,
        errorsFound,
        perfectMatches,
        totalCarts: carts.length,
        supermarketStats,
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
        {/* Main Stats Cards */}
        <View style={styles.mainStatsRow}>
          <View style={[styles.statCard, styles.statCardGreen]}>
            <Ionicons name="cash-outline" size={36} color="#4CAF50" style={styles.statIcon} />
            <Text style={styles.statValue}>{formatCurrency(stats.totalSaved)}</Text>
            <Text style={styles.statLabel}>Economizado</Text>
            <Text style={styles.statSubtext}>Erros evitados</Text>
          </View>

          <View style={[styles.statCard, styles.statCardBlue]}>
            <Ionicons name="bar-chart-outline" size={36} color="#2196F3" style={styles.statIcon} />
            <Text style={styles.statValue}>{stats.totalComparisons}</Text>
            <Text style={styles.statLabel}>Comparações</Text>
            <Text style={styles.statSubtext}>Total feitas</Text>
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
                        {market.count} {market.count === 1 ? 'comparação' : 'comparações'}
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
