import { PremiumBlockModal } from '@/components/PremiumBlockModal';
import PriceVoiceInput from '@/components/ui/PriceVoiceInput';
import { usePremiumGuard } from '@/hooks/usePremiumGuard';
import { Cart, CartItem, CartsStorage } from '@/utils/carts-storage';
import { getSupermarketLogo, supermarkets } from '@/utils/supermarkets';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function CartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cartId, setCartId] = useState<string | undefined>(params.id as string | undefined);

  // 🛡️ Premium Guard - Bloqueia acesso se não for Premium
  const { hasAccess, loading: premiumLoading, status, showBlockModal, closeModal: closePremiumModal, expiresAt } = usePremiumGuard();

  const closeModal = () => {
    closePremiumModal();
    router.back(); // Volta para a tela anterior
  };

  const [supermarket, setSupermarket] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | undefined>(undefined);
  const [showSupermarketModal, setShowSupermarketModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Definição de preço inline (sem navegação)
  const [pricingItemId, setPricingItemId] = useState<string | null>(null);
  const [inlinePrice, setInlinePrice] = useState('');
  const QUICK_PRICES = [100, 200, 300, 500, 1000, 1500, 2000, 2500, 3000, 5000];

  // Funções auxiliares (devem estar antes dos hooks que as usam)
  const loadCart = async (id: string) => {
    try {
      const cart = await CartsStorage.getCartById(id);
      if (cart) {
        setSupermarket(cart.supermarket);
        setItems(cart.items);
        setTotal(cart.total);
        setDailyBudget(cart.dailyBudget);
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      Alert.alert('Erro', 'Não foi possível carregar o carrinho.');
    }
  };

  const calculateTotal = () => {
    const newTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    setTotal(newTotal);
  };

  // Sincronizar cartId quando params.id mudar (ao vir da Home)
  useEffect(() => {
    if (params?.id && params?.id !== cartId) {
      setCartId(params.id as string);
    }
  }, [params.id]);

  useEffect(() => {
    if (cartId) {
      loadCart(cartId);
      setShowSupermarketModal(false);
    } else {
      // Novo carrinho sem ID - mostrar modal para pedir nome
      setShowSupermarketModal(true);
    }
  }, [cartId]);

  // Recarregar carrinho quando a tela recebe foco (voltando de AddProductScreen)
  useFocusEffect(
    useCallback(() => {
      if (cartId) {
        loadCart(cartId);
      }
    }, [cartId])
  );

  useEffect(() => {
    calculateTotal();
  }, [items]);

  // 🛡️ Verificação de acesso Premium - RENDERIZAÇÃO CONDICIONAL
  if (premiumLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#E65100" />
        <Text style={styles.loadingText}>A verificar acesso...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return <PremiumBlockModal visible={showBlockModal} onClose={closeModal} status={status} expiresAt={expiresAt} />;
  }

  const handleAddProduct = async () => {
    if (!cartId) {
      Alert.alert('Atenção', 'Por favor, informe o nome do supermercado primeiro.');
      setShowSupermarketModal(true);
      return;
    }

    router.push({
      pathname: '/screens/AddProductScreen',
      params: {
        id: cartId,
      },
    } as any);
  };

  const handleEditItem = (item: CartItem) => {
    setEditingItem({ ...item });
    setEditModalVisible(true);
  };

  const handleSaveEditedItem = async () => {
    if (!editingItem) return;

    if (!editingItem.name.trim()) {
      Alert.alert('Atenção', 'O nome do produto não pode estar vazio.');
      return;
    }

    if (editingItem.price <= 0) {
      Alert.alert('Atenção', 'O preço deve ser maior que zero.');
      return;
    }

    if (editingItem.quantity <= 0) {
      Alert.alert('Atenção', 'A quantidade deve ser maior que zero.');
      return;
    }

    const updatedItems = items.map(item => (item.id === editingItem.id ? editingItem : item));
    setItems(updatedItems);

    // Salvar no AsyncStorage
    if (cartId) {
      const updatedCart: Cart = {
        id: cartId,
        supermarket,
        date: new Date().toISOString(),
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        dailyBudget,
      };

      try {
        await CartsStorage.updateCart(updatedCart);
      } catch (error) {
        console.error('Erro ao atualizar carrinho:', error);
        Alert.alert('Erro', 'Não foi possível salvar as alterações.');
      }
    }

    setEditModalVisible(false);
    setEditingItem(null);
  };

  const handleRemoveItem = (itemId: string) => {
    Alert.alert('Remover produto', 'Tens certeza que desejas remover este produto?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Remover',
        style: 'destructive',
        onPress: async () => {
          const itemToRemove = items.find(item => item.id === itemId);
          const updatedItems = items.filter(item => item.id !== itemId);
          setItems(updatedItems);

          // Deletar foto física se existir
          if (itemToRemove?.imageUri) {
            try {
              const FileSystem = require('expo-file-system');
              const fileInfo = await FileSystem.getInfoAsync(itemToRemove.imageUri);
              if (fileInfo.exists) {
                await FileSystem.deleteAsync(itemToRemove.imageUri, { idempotent: true });
              }
            } catch (error) {
              console.warn('Erro ao deletar foto:', error);
            }
          }

          // Salvar no AsyncStorage
          if (cartId) {
            const updatedCart: Cart = {
              id: cartId,
              supermarket,
              date: new Date().toISOString(),
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
              dailyBudget,
            };

            try {
              await CartsStorage.updateCart(updatedCart);
            } catch (error) {
              console.error('Erro ao atualizar carrinho:', error);
              Alert.alert('Erro', 'Não foi possível salvar as alterações.');
            }
          }
        },
      },
    ]);
  };

  const handleViewImage = (imageUri: string) => {
    setSelectedImage(imageUri);
    setImageModalVisible(true);
  };

  // Confirma o preço definido inline directamente no card do produto
  const handleConfirmInlinePrice = async () => {
    if (!pricingItemId) return;
    const val = parseFloat(inlinePrice.replace(',', '.'));
    if (isNaN(val) || val <= 0) {
      Alert.alert('Preço inválido', 'Insere um preço maior que zero.');
      return;
    }
    const updatedItems = items.map(item =>
      item.id === pricingItemId ? { ...item, price: val } : item
    );
    setItems(updatedItems);
    setPricingItemId(null);
    setInlinePrice('');
    if (cartId) {
      const updatedCart: Cart = {
        id: cartId,
        supermarket,
        date: new Date().toISOString(),
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        dailyBudget,
      };
      await CartsStorage.updateCart(updatedCart);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const renderItem = ({ item }: { item: CartItem }) => {
    const isPricing  = pricingItemId === item.id;
    const hasNoPrice = item.price === 0;

    return (
      <View style={[styles.productItem, hasNoPrice && styles.productItemNoPriceCard]}>

        {/* ── Linha principal do card ── */}
        <View style={styles.productItemRow}>
          {item.imageUri && (
            <Pressable onPress={() => handleViewImage(item.imageUri!)}>
              <Image source={{ uri: item.imageUri }} style={styles.productImage} />
            </Pressable>
          )}
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{item.name}</Text>
            {hasNoPrice ? (
              <Pressable
                onPress={() => { setPricingItemId(item.id); setInlinePrice(''); }}
                hitSlop={8}
              >
                <View style={styles.noPriceBadge}>
                  <Ionicons name="pricetag-outline" size={13} color="#E65100" />
                  <Text style={styles.noPriceBadgeText}>Sem preço · Toca para definir</Text>
                </View>
              </Pressable>
            ) : (
              <Text style={styles.productDetails}>
                {formatCurrency(item.price)} × {item.quantity}
              </Text>
            )}
          </View>
          <View style={styles.productActions}>
            {!hasNoPrice && (
              <Text style={styles.productTotal}>{formatCurrency(item.price * item.quantity)}</Text>
            )}
            <View style={styles.actionButtons}>
              <Pressable style={styles.editButton} onPress={() => handleEditItem(item)}>
                <Text style={styles.editButtonText}>✎</Text>
              </Pressable>
              <Pressable style={styles.deleteButton} onPress={() => handleRemoveItem(item.id)}>
                <Text style={styles.deleteButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Painel inline de definição de preço ── */}
        {isPricing && (
            <View style={styles.inlinePricePanel}>
            {/* Input + botões */}
            <View style={styles.inlinePriceInputRow}>
              <PriceVoiceInput
                value={inlinePrice}
                onChange={setInlinePrice}
                placeholder="Inserir preço (Kz)..."
                inputStyle={styles.inlinePriceInput}
                style={{ flex: 1 }}
                autoFocus
                onSubmitEditing={handleConfirmInlinePrice}
              />
              <Pressable style={styles.inlineConfirmBtn} onPress={handleConfirmInlinePrice}>
                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable
                style={styles.inlineCancelBtn}
                onPress={() => { setPricingItemId(null); setInlinePrice(''); }}
              >
                <Ionicons name="close" size={20} color="#888" />
              </Pressable>
            </View>

            {/* Chips de preços rápidos */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.quickPricesRow}
              keyboardShouldPersistTaps="always"
            >
              {QUICK_PRICES.map(p => (
                <Pressable
                  key={p}
                  style={styles.quickPriceChip}
                  onPress={() => setInlinePrice(String(p))}
                >
                  <Text style={styles.quickPriceText}>{p.toLocaleString('pt-AO')} Kz</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🛒</Text>
      <Text style={styles.emptyText}>Nenhum produto adicionado</Text>
      <Text style={styles.emptySubtext}>Toca em "Adicionar Produto" para começar</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.headerTitle}>{supermarket || 'Novo Carrinho'}</Text>
      </View>

      {/* Supermarket Banner */}
      {supermarket && (
        <View style={styles.supermarketBanner}>
          <Image
            source={getSupermarketLogo(supermarket)}
            style={styles.bannerLogo}
            contentFit="contain"
          />
        </View>
      )}

      {/* Products List */}
      <FlatList
        data={[...items].reverse()}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Footer with Total and Add Button */}
      <View style={styles.footer}>
        {/* Aviso de produtos sem preço */}
        {items.filter(i => i.price === 0).length > 0 && (
          <View style={styles.pendingPriceBanner}>
            <Ionicons name="pricetag-outline" size={14} color="#E65100" />
            <Text style={styles.pendingPriceText}>
              {items.filter(i => i.price === 0).length}{' '}
              {items.filter(i => i.price === 0).length === 1
                ? 'produto sem preço'
                : 'produtos sem preço'}{' '}
              · Toca nos produtos para definir
            </Text>
          </View>
        )}
        {/* Daily Budget Progress */}
        {dailyBudget && dailyBudget > 0 && (
          <View style={styles.budgetProgressContainer}>
            <View style={styles.budgetProgressHeader}>
              <Text style={styles.budgetProgressLabel}>
                💰 Orçamento de Hoje
              </Text>
              <Text style={styles.budgetProgressText}>
                {formatCurrency(total)} de {formatCurrency(dailyBudget)}
              </Text>
            </View>
            <View style={styles.budgetProgressBarBg}>
              <View
                style={[
                  styles.budgetProgressBarFill,
                  {
                    width: `${Math.min((total / dailyBudget) * 100, 100)}%`,
                    backgroundColor:
                      total > dailyBudget
                        ? '#f44336'
                        : total >= dailyBudget * 0.8
                          ? '#FF9800'
                          : '#4CAF50',
                  },
                ]}
              />
            </View>
            {total >= dailyBudget * 0.8 && (
              <Text style={[
                styles.budgetWarningText,
                { color: total > dailyBudget ? '#f44336' : '#FF9800' }
              ]}>
                {total > dailyBudget
                  ? `⚠️ Você ultrapassou ${formatCurrency(total - dailyBudget)}`
                  : `💡 Restam ${formatCurrency(dailyBudget - total)}`}
              </Text>
            )}
          </View>
        )}

        <View style={styles.totalContainer}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
        </View>
        <View style={styles.buttonRow}>
          <Pressable style={styles.addButton} onPress={handleAddProduct}>
            <Text style={styles.addButtonText}>+ Adicionar Produto</Text>
          </Pressable>
          {items.length > 0 && cartId && (
            <Pressable
              style={styles.compareButton}
              onPress={() => router.push(`/screens/ComparisonScreen?cartId=${cartId}`)}>
              <Text style={styles.compareButtonText}>✓ Conferir</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Supermarket Name Modal */}
      <Modal
        visible={showSupermarketModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (supermarket.trim()) {
            setShowSupermarketModal(false);
          }
        }}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <Pressable
            style={styles.modalOverlay}
            onPress={() => {
              if (supermarket.trim()) {
                setShowSupermarketModal(false);
              }
            }}>
            <Pressable
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}>
              <Text style={styles.modalTitle}>Novo Carrinho</Text>

              <Text style={styles.inputLabel}>Escolha Rápida (opcional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.supermarketsScrollView}
                contentContainerStyle={styles.supermarketsScrollContent}>
                {supermarkets.map((market) => (
                  <Pressable
                    key={market.id}
                    style={[
                      styles.supermarketChip,
                      supermarket === market.name && styles.supermarketChipSelected
                    ]}
                    onPress={() => setSupermarket(market.name)}>
                    <Image source={market.logo} style={styles.supermarketChipLogo} />
                    {/* <Text style={[
                      styles.supermarketChipText,
                      supermarket === market.name && styles.supermarketChipTextSelected
                    ]}>
                      {market.name}
                    </Text> */}
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>Nome do Supermercado *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: Shoprite, Kero, Candando..."
                value={supermarket}
                onChangeText={setSupermarket}
              />

              <Text style={styles.inputLabel}>Orçamento para hoje (opcional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex: 10000 Kz"
                value={dailyBudget?.toString() || ''}
                onChangeText={(text) => {
                  const value = parseFloat(text);
                  setDailyBudget(isNaN(value) ? undefined : value);
                }}
                keyboardType="decimal-pad"
              />
              <Text style={styles.inputHelper}>
                💡 Defina quanto quer gastar hoje. Vamos alertar se ultrapassar!
              </Text>

              <View style={styles.modalActions}>
                <Pressable
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setShowSupermarketModal(false);
                    router.replace('/screens/HomeScreen');
                  }}>
                  <Text style={styles.modalCancelButtonText}>Cancelar</Text>
                </Pressable>
                <Pressable
                  style={styles.modalButton}
                  onPress={async () => {
                    if (!supermarket.trim()) {
                      Alert.alert('Atenção', 'Por favor, informe o nome do supermercado.');
                      return;
                    }

                    // Criar e salvar o carrinho pela ÚNICA vez aqui
                    const newCartId = Date.now().toString();
                    const newCart: Cart = {
                      id: newCartId,
                      supermarket,
                      date: new Date().toISOString(),
                      items: [],
                      total: 0,
                      dailyBudget,
                    };

                    try {
                      await CartsStorage.saveCart(newCart);
                      setCartId(newCartId);
                      setShowSupermarketModal(false);
                    } catch (error) {
                      console.error('Erro ao criar carrinho:', error);
                      Alert.alert('Erro', 'Não foi possível criar o carrinho.');
                    }
                  }}>
                  <Text style={styles.modalButtonText}>Continuar</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Editar Produto</Text>

            <Text style={styles.inputLabel}>Nome</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Nome do produto"
              value={editingItem?.name || ''}
              onChangeText={text =>
                setEditingItem(prev => (prev ? { ...prev, name: text } : null))
              }
            />

            <Text style={styles.inputLabel}>Preço (Kz)</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              keyboardType="numeric"
              value={editingItem?.price.toString() || ''}
              onChangeText={text =>
                setEditingItem(prev =>
                  prev ? { ...prev, price: parseFloat(text) || 0 } : null
                )
              }
            />

            <Text style={styles.inputLabel}>Quantidade</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="1"
              keyboardType="numeric"
              value={editingItem?.quantity.toString() || ''}
              onChangeText={text =>
                setEditingItem(prev =>
                  prev ? { ...prev, quantity: parseInt(text) || 1 } : null
                )
              }
            />

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setEditModalVisible(false);
                  setEditingItem(null);
                }}>
                <Text style={styles.modalCancelButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalButton} onPress={handleSaveEditedItem}>
                <Text style={styles.modalButtonText}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Image Viewer Modal */}
      <Modal
        visible={imageModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageModalVisible(false)}>
        <Pressable
          style={styles.imageModalOverlay}
          onPress={() => setImageModalVisible(false)}>
          <View style={styles.imageModalContent}>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.fullImage}
                contentFit="contain"
              />
            )}
            <Pressable
              style={styles.closeImageButton}
              onPress={() => setImageModalVisible(false)}>
              <Text style={styles.closeImageButtonText}>×</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
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
    marginBottom: 10,
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
  supermarketBanner: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  bannerLogo: {
    width: 120,
    height: 80,
  },
  listContent: {
    padding: 16,
  },
  listContentEmpty: {
    flex: 1,
    justifyContent: 'center',
  },
  productItem: {
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
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 4,
  },
  productDetails: {
    fontSize: 14,
    color: '#666666',
  },
  productActions: {
    alignItems: 'flex-end',
  },
  productTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#F44336',
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  budgetProgressContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  budgetProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetProgressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  budgetProgressText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  budgetProgressBarBg: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  budgetProgressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  budgetWarningText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
  },
  totalValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  compareButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  compareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  inputHelper: {
    fontSize: 12,
    color: '#999999',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalCancelButton: {
    backgroundColor: '#F5F5F5',
  },
  modalCancelButtonText: {
    color: '#666666',
    fontSize: 16,
    fontWeight: '600',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContent: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: '90%',
    height: '80%',
  },
  closeImageButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '300',
  },
  supermarketsScrollView: {
    maxHeight: 90,
    marginBottom: 8,
  },
  supermarketsScrollContent: {
    gap: 8,
    paddingRight: 8,
  },
  supermarketChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  supermarketChipSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  supermarketChipLogo: {
    width: undefined,
    height: 48,
    aspectRatio: 2,
    flex: 1,
    resizeMode: 'contain',
    borderRadius: 6,
    // marginRight: 6,
  },
  supermarketChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  supermarketChipTextSelected: {
    color: '#2196F3',
  },
  productItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productItemNoPriceCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  noPriceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  noPriceBadgeText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  inlinePricePanel: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 8,
  },
  inlinePriceInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inlinePriceInput: {
    flex: 1,
    backgroundColor: '#FFF8E1',
    borderWidth: 1.5,
    borderColor: '#FF9800',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  inlineConfirmBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineCancelBtn: {
    width: 42,
    height: 42,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickPricesRow: {
    gap: 8,
    paddingRight: 8,
  },
  quickPriceChip: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  quickPriceText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  pendingPriceBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  pendingPriceText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    flex: 1,
  },
});
