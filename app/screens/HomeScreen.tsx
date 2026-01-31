import { Cart, CartsStorage } from '@/utils/carts-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    Pressable,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const [carts, setCarts] = useState<Cart[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCarts();
    }, [])
  );

  const loadCarts = async () => {
    try {
      const storedCarts = await CartsStorage.getAllCarts();
      // Ordenar por data mais recente
      const sortedCarts = storedCarts.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setCarts(sortedCarts);
    } catch (error) {
      console.error('Erro ao carregar carrinhos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCarts();
    setRefreshing(false);
  }, []);

  const handleCreateNewCart = () => {
    router.push('/screens/CartScreen');
  };

  const handleOpenCart = (cartId: string) => {
    router.push(`/screens/CartScreen?id=${cartId}`);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const renderCartItem = ({ item }: { item: Cart }) => (
    <Pressable
      style={({ pressed }) => [
        styles.cartItem,
        pressed && styles.cartItemPressed,
      ]}
      onPress={() => handleOpenCart(item.id)}>
      <View style={styles.cartHeader}>
        <Text style={styles.supermarketName}>{item.supermarket}</Text>
        <Text style={styles.cartDate}>{formatDate(item.date)}</Text>
      </View>
      <View style={styles.cartFooter}>
        <Text style={styles.itemCount}>
          {item.items.length} {item.items.length === 1 ? 'item' : 'itens'}
        </Text>
        <Text style={styles.cartTotal}>{formatCurrency(item.total)}</Text>
      </View>
    </Pressable>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyTitle}>Nenhum carrinho ainda</Text>
      <Text style={styles.emptyDescription}>
        Cria o teu primeiro carrinho e começa a conferir as tuas compras.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Confere</Text>
        <Text style={styles.headerSubtitle}>Os meus carrinhos</Text>
      </View>

      {/* Cart List */}
      <FlatList
        data={carts}
        renderItem={renderCartItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          carts.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Floating Action Button */}
      <Pressable
        style={({ pressed }) => [
          styles.fab,
          pressed && styles.fabPressed,
        ]}
        onPress={handleCreateNewCart}>
        <Text style={styles.fabIcon}>+</Text>
      </Pressable>
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
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  cartItem: {
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
  cartItemPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  cartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  supermarketName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333333',
    flex: 1,
  },
  cartDate: {
    fontSize: 14,
    color: '#666666',
  },
  cartFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  itemCount: {
    fontSize: 14,
    color: '#666666',
  },
  cartTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    transform: [{ scale: 0.95 }],
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '300',
  },
});
