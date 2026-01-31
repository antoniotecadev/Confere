import { Cart, CartItem, CartsStorage } from '@/utils/carts-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function CartScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [cartId, setCartId] = useState<string | undefined>(params.id as string | undefined);

  const [supermarket, setSupermarket] = useState('');
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState(0);
  const [isNewCart, setIsNewCart] = useState(true);
  const [showSupermarketModal, setShowSupermarketModal] = useState(false);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  // Sincronizar cartId quando params.id mudar (ao vir da Home)
  useEffect(() => {
    if (params.id && params.id !== cartId) {
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

  useEffect(() => {
    // Verificar se há um novo produto nos parâmetros quando a tela recebe foco
    const checkNewProduct = async () => {
      if (params.newProduct) {
        try {
          const newProduct = JSON.parse(params.newProduct as string);
          
          // Buscar os items mais recentes do carrinho para evitar sobrescrever
          let currentItems = items;
          if (cartId) {
            const cart = await CartsStorage.getCartById(cartId);
            if (cart) {
              currentItems = cart.items;
            }
          }
          
          const updatedItems = [...currentItems, newProduct];
          setItems(updatedItems);
          
          // Salvar o carrinho atualizado imediatamente no AsyncStorage
          if (cartId) {
            const updatedCart: Cart = {
              id: cartId,
              supermarket,
              date: new Date().toISOString(),
              items: updatedItems,
              total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
            };
            await CartsStorage.updateCart(updatedCart);
          }
          
          // Limpar o parâmetro
          router.setParams({ newProduct: undefined });
        } catch (error) {
          console.error('Erro ao processar novo produto:', error);
        }
      }
    };

    checkNewProduct();
  }, [params.newProduct]);

  useEffect(() => {
    calculateTotal();
  }, [items]);

  const loadCart = async (id: string) => {
    try {
      const cart = await CartsStorage.getCartById(id);
      if (cart) {
        setSupermarket(cart.supermarket);
        setItems(cart.items);
        setTotal(cart.total);
        setIsNewCart(false);
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

  const handleSaveCart = async () => {
    if (!supermarket.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do supermercado.');
      return;
    }

    if (items.length === 0) {
      Alert.alert('Atenção', 'Adicione pelo menos um produto ao carrinho.');
      return;
    }

    try {
      const cart: Cart = {
        id: cartId || Date.now().toString(),
        supermarket,
        date: new Date().toISOString(),
        items,
        total,
      };

      if (isNewCart) {
        await CartsStorage.saveCart(cart);
      } else {
        await CartsStorage.updateCart(cart);
      }

      Alert.alert('Sucesso', 'Carrinho salvo com sucesso!', [
        { text: 'OK', onPress: () => router.replace('/screens/HomeScreen') },
      ]);
    } catch (error) {
      console.error('Erro ao salvar carrinho:', error);
      Alert.alert('Erro', 'Não foi possível salvar o carrinho.');
    }
  };

  const handleAddProduct = async () => {
    // Se não tem cartId ainda, criar e salvar o carrinho antes de ir para AddProduct
    let currentCartId = cartId;
    
    if (!currentCartId) {
      if (!supermarket.trim()) {
        Alert.alert('Atenção', 'Por favor, informe o nome do supermercado primeiro.');
        setShowSupermarketModal(true);
        return;
      }
      
      // Criar novo carrinho com o nome do supermercado
      currentCartId = Date.now().toString();
      const newCart: Cart = {
        id: currentCartId,
        supermarket,
        date: new Date().toISOString(),
        items: [],
        total: 0,
      };
      
      try {
        await CartsStorage.saveCart(newCart);
        setCartId(currentCartId);
        setIsNewCart(false);
      } catch (error) {
        console.error('Erro ao criar carrinho:', error);
        Alert.alert('Erro', 'Não foi possível criar o carrinho.');
        return;
      }
    }
    
    router.push({
      pathname: '/screens/AddProductScreen',
      params: { id: currentCartId },
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

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Kz`;
  };

  const renderItem = ({ item }: { item: CartItem }) => (
    <View style={styles.productItem}>
      {item.imageUri && (
        <Pressable onPress={() => handleViewImage(item.imageUri!)}>
          <Image source={{ uri: item.imageUri }} style={styles.productImage} />
        </Pressable>
      )}
      <View style={styles.productInfo}>
        <Text style={styles.productName}>{item.name}</Text>
        <Text style={styles.productDetails}>
          {formatCurrency(item.price)} × {item.quantity}
        </Text>
      </View>
      <View style={styles.productActions}>
        <Text style={styles.productTotal}>{formatCurrency(item.price * item.quantity)}</Text>
        <View style={styles.actionButtons}>
          <Pressable
            style={styles.editButton}
            onPress={() => handleEditItem(item)}>
            <Text style={styles.editButtonText}>✎</Text>
          </Pressable>
          <Pressable
            style={styles.deleteButton}
            onPress={() => handleRemoveItem(item.id)}>
            <Text style={styles.deleteButtonText}>×</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );

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
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{supermarket || 'Novo Carrinho'}</Text>
          <Pressable onPress={handleSaveCart}>
            <Text style={styles.saveButton}>Salvar</Text>
          </Pressable>
        </View>
      </View>

      {/* Products List */}
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      {/* Footer with Total and Add Button */}
      <View style={styles.footer}>
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
            <Text style={styles.modalTitle}>Nome do Supermercado</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Ex: Shoprite, Kero, Candando..."
              value={supermarket}
              onChangeText={setSupermarket}
              autoFocus
            />
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
                  
                  // Criar e salvar o carrinho imediatamente
                  const newCartId = Date.now().toString();
                  const newCart: Cart = {
                    id: newCartId,
                    supermarket,
                    date: new Date().toISOString(),
                    items: [],
                    total: 0,
                  };
                  
                  try {
                    await CartsStorage.saveCart(newCart);
                    setCartId(newCartId);
                    setIsNewCart(false);
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
                resizeMode="contain"
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
  },
  backButton: {
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 28,
    color: '#FFFFFF',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  saveButton: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
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
    flexDirection: 'row',
    justifyContent: 'space-between',
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
});
