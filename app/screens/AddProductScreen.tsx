import { FavoritesService } from '@/app/services/FavoritesService';
import { PriceAlertService } from '@/app/services/PriceAlertService';
import { PriceComparisonService } from '@/app/services/PriceComparisonService';
import { Cart, CartItem, CartsStorage } from '@/utils/carts-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function AddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [favoriteProducts, setFavoriteProducts] = useState<Set<string>>(new Set());
  const [currentTotal, setCurrentTotal] = useState(0);
  const [dailyBudget, setDailyBudget] = useState<number | undefined>(undefined);
  const [supermarketName, setSupermarketName] = useState<string | undefined>(undefined);

  useEffect(() => {
    loadFavorites();
    loadCartData();
  }, []);

  const loadCartData = async () => {
    const cartId = params.id as string;
    try {
      const cart = await CartsStorage.getCartById(cartId);
      if (cart) {
        setCurrentTotal(cart.total);
        setDailyBudget(cart.dailyBudget);
        setSupermarketName(cart.supermarket);
      }
    } catch (error) {
      console.error('Erro ao carregar dados do carrinho:', error);
    }
  };

  useEffect(() => {
    if (name.length >= 2) {
      loadSuggestions();
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [name]);

  const loadFavorites = async () => {
    const favorites = await FavoritesService.detectFrequentProducts(2);
    const favoriteNames = new Set(favorites.map(f => f.name.toLowerCase()));
    setFavoriteProducts(favoriteNames);
  };

  const loadSuggestions = async () => {
    const productSuggestions = await PriceComparisonService.suggestProducts(name);
    setSuggestions(productSuggestions);
    setShowSuggestions(productSuggestions.length > 0);
  };

  const isFavorite = (productName: string): boolean => {
    return favoriteProducts.has(productName.toLowerCase());
  };

  const handleSelectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
  };

  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para aceder à câmera.'
      );
      return false;
    }
    return true;
  };

  const requestGalleryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permissão necessária',
        'Precisamos de permissão para aceder à galeria.'
      );
      return false;
    }
    return true;
  };

  const handleTakePhoto = async () => {
    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const handlePickImage = async () => {
    const hasPermission = await requestGalleryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.7,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem.');
    }
  };

  const handleChoosePhoto = () => {
    Alert.alert('Adicionar foto', 'Escolhe uma opção:', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Tirar foto', onPress: handleTakePhoto },
      { text: 'Escolher da galeria', onPress: handlePickImage },
    ]);
  };

  const handleRemovePhoto = () => {
    setImageUri(null);
  };

  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert('Atenção', 'Por favor, informe o nome do produto.');
      return false;
    }

    const priceValue = parseFloat(price);
    if (isNaN(priceValue) || priceValue <= 0) {
      Alert.alert('Atenção', 'Por favor, informe um preço válido maior que zero.');
      return false;
    }

    const quantityValue = parseInt(quantity);
    if (isNaN(quantityValue) || quantityValue <= 0) {
      Alert.alert('Atenção', 'Por favor, informe uma quantidade válida maior que zero.');
      return false;
    }

    return true;
  };

  const handleSaveProduct = async () => {
    if (!validateForm()) return;

    const priceValue = parseFloat(price);
    const quantityValue = parseInt(quantity);
    const productTotal = priceValue * quantityValue;

    // Verificar orçamento diário primeiro
    if (dailyBudget && dailyBudget > 0) {
      const newTotal = currentTotal + productTotal;
      
      if (newTotal > dailyBudget) {
        const exceeded = newTotal - dailyBudget;
        Alert.alert(
          '⚠️ Orçamento Diário',
          `Você definiu ${dailyBudget.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz para hoje.\n\n` +
          `Carrinho atual: ${currentTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz\n` +
          `Este produto: ${productTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz\n` +
          `Novo total: ${newTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz\n\n` +
          `Você vai ultrapassar em ${exceeded.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz!`,
          [
            {
              text: 'Cancelar',
              style: 'cancel',
            },
            {
              text: 'Adicionar Mesmo Assim',
              onPress: () => checkPriceAlert(priceValue, supermarketName),
            },
          ]
        );
        return;
      } else if (newTotal >= dailyBudget * 0.8) {
        // Alerta aos 80% do orçamento
        const percentage = (newTotal / dailyBudget) * 100;
        Alert.alert(
          '💡 Atenção ao Orçamento',
          `Você já gastou ${percentage.toFixed(0)}% do seu orçamento diário!\n\n` +
          `Orçamento: ${dailyBudget.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz\n` +
          `Novo total: ${newTotal.toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz\n` +
          `Restante: ${(dailyBudget - newTotal).toLocaleString('pt-AO', { minimumFractionDigits: 2 })} Kz`,
          [
            {
              text: 'OK, Entendi',
              onPress: () => checkPriceAlert(priceValue, supermarketName),
            },
          ]
        );
        return;
      }
    }

    // Se passou da verificação de orçamento, verificar alerta de preço
    checkPriceAlert(priceValue, supermarketName);
  };

  const checkPriceAlert = async (priceValue: number, supermarketName: string | undefined) => {
    // Verificar alerta de preço se soubermos o supermercado
    if (supermarketName) {
      const alert = await PriceAlertService.analyzePriceInSupermarket(
        name.trim(),
        priceValue,
        supermarketName
      );

      // Mostrar alert apenas para promoções ou avisos (não para preço normal)
      if (alert && alert.type !== 'normal') {
        Alert.alert(
          alert.title,
          alert.message,
          [
            {
              text: 'Adicionar Produto',
              onPress: () => saveProduct(),
            },
          ],
          { cancelable: false }
        );
        return;
      }
    }

    // Se não houver alert ou for preço normal, salvar direto
    saveProduct();
  };

  const saveProduct = async () => {
    const cartId = params.id as string;
    
    try {
      // Buscar o carrinho atual
      const cart = await CartsStorage.getCartById(cartId);
      if (!cart) {
        Alert.alert('Erro', 'Carrinho não encontrado.');
        return;
      }

      // Criar novo produto
      const newProduct: CartItem = {
        id: Date.now().toString(),
        name: name.trim(),
        price: parseFloat(price),
        quantity: parseInt(quantity),
        imageUri: imageUri || undefined,
      };

      // Adicionar produto ao carrinho
      const updatedItems = [...cart.items, newProduct];
      const updatedCart: Cart = {
        ...cart,
        items: updatedItems,
        total: updatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
        date: new Date().toISOString(),
      };

      // Salvar no AsyncStorage
      await CartsStorage.updateCart(updatedCart);

      // Voltar para CartScreen
      router.back();
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
      Alert.alert('Erro', 'Não foi possível salvar o produto.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Adicionar Produto</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        {/* Image Section */}
        <View style={styles.imageSection}>
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri }} style={styles.productImage} />
              <Pressable style={styles.removeImageButton} onPress={handleRemovePhoto}>
                <Text style={styles.removeImageText}>×</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable style={styles.addImageButton} onPress={handleChoosePhoto}>
              <Text style={styles.addImageIcon}>📷</Text>
              <Text style={styles.addImageText}>Adicionar foto (opcional)</Text>
            </Pressable>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          {/* Product Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Nome do produto *</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Arroz, Óleo, Leite..."
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              onFocus={() => name.length >= 2 && setShowSuggestions(true)}
            />
            {showSuggestions && suggestions.length > 0 && (
              <View style={styles.suggestionsContainer}>
                <FlatList
                  data={suggestions}
                  keyExtractor={(item) => item}
                  renderItem={({ item }) => (
                    <Pressable
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSuggestion(item)}>
                      <View style={styles.suggestionContent}>
                        <Text style={styles.suggestionText}>📦 {item}</Text>
                        {isFavorite(item) && (
                          <View style={styles.favoriteBadge}>
                            <Text style={styles.favoriteBadgeText}>⭐ Frequente</Text>
                          </View>
                        )}
                      </View>
                    </Pressable>
                  )}
                  scrollEnabled={false}
                />
              </View>
            )}
          </View>

          {/* Price */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Preço unitário (Kz) *</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              value={price}
              onChangeText={setPrice}
              keyboardType="decimal-pad"
            />
          </View>

          {/* Quantity */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Quantidade *</Text>
            <View style={styles.quantityContainer}>
              <Pressable
                style={styles.quantityButton}
                onPress={() => {
                  const currentQty = parseInt(quantity) || 1;
                  if (currentQty > 1) {
                    setQuantity((currentQty - 1).toString());
                  }
                }}>
                <Text style={styles.quantityButtonText}>−</Text>
              </Pressable>
              <TextInput
                style={styles.quantityInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="number-pad"
              />
              <Pressable
                style={styles.quantityButton}
                onPress={() => {
                  const currentQty = parseInt(quantity) || 1;
                  setQuantity((currentQty + 1).toString());
                }}>
                <Text style={styles.quantityButtonText}>+</Text>
              </Pressable>
            </View>
          </View>

          {/* Total Preview */}
          {price && quantity && parseFloat(price) > 0 && parseInt(quantity) > 0 && (
            <View style={styles.totalPreview}>
              <Text style={styles.totalPreviewLabel}>Subtotal:</Text>
              <Text style={styles.totalPreviewValue}>
                {(parseFloat(price) * parseInt(quantity)).toLocaleString('pt-AO', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                Kz
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Footer with Save Button */}
      <View style={styles.footer}>
        <Pressable
          style={styles.saveButton}
          onPress={handleSaveProduct}
          disabled={isLoading}>
          <Text style={styles.saveButtonText}>
            {isLoading ? 'Salvando...' : 'Salvar Produto'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  imageSection: {
    marginBottom: 24,
  },
  addImageButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  addImageIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  addImageText: {
    fontSize: 16,
    color: '#666666',
  },
  imageContainer: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(244, 67, 54, 0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '300',
  },
  form: {
    gap: 20,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  suggestionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333333',
    flex: 1,
  },
  favoriteBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  favoriteBadgeText: {
    fontSize: 11,
    color: '#F57C00',
    fontWeight: '600',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quantityButton: {
    backgroundColor: '#2196F3',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '300',
  },
  quantityInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  totalPreview: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalPreviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976D2',
  },
  totalPreviewValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1565C0',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  saveButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
