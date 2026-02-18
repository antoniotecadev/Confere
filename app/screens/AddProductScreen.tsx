import { useAudioFeedback } from '@/context/AudioFeedbackProvider';
import { FavoritesService } from '@/services/FavoritesService';
import { PriceAlertService } from '@/services/PriceAlertService';
import { PriceComparisonService } from '@/services/PriceComparisonService';
import { Cart, CartItem, CartsStorage } from '@/utils/carts-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { Camera, Frame, runAsync, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { Text as TextBlock, useTextRecognition } from 'react-native-vision-camera-ocr-plus';
import { Worklets } from 'react-native-worklets-core';

interface ProductData {
  price: string;
  name: string;
}

export default function AddProductScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { playBeepSound } = useAudioFeedback();


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
  const [isSumMode, setIsSumMode] = useState(false);

  // Estados para OCR
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [detectionSuccess, setDetectionSuccess] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const device = useCameraDevice('back');
  const { scanText } = useTextRecognition();
  const productBufferRef = useRef<ProductData[]>([]);
  const frameCountRef = useRef<number>(0);
  const timeoutsRef = useRef<number[]>([]);

  // Lista de produtos rápidos comuns em Angola
  const quickProducts = [
    { name: '🍚 Arroz', emoji: '🍚', color: '#FFF3E0' },
    { name: '🛢️ Óleo', emoji: '🛢️', color: '#FFF9C4' },
    { name: '🍬 Açúcar', emoji: '🍬', color: '#FCE4EC' },
    { name: '🌾 Farinha de Trigo', emoji: '🌾', color: '#F3E5F5' },
    { name: '🌽 Fuba', emoji: '🌽', color: '#FFF8E1' },
    { name: '🫘 Feijão', emoji: '🫘', color: '#EFEBE9' },
    { name: '🧂 Sal', emoji: '🧂', color: '#ECEFF1' },
    { name: '🥛 Leite', emoji: '🥛', color: '#E3F2FD' },
    { name: '🥚 Ovos', emoji: '🥚', color: '#FFF3E0' },
    { name: '🍞 Pão', emoji: '🍞', color: '#FFEBEE' },
    { name: '☕ Café', emoji: '☕', color: '#EFEBE9' },
    { name: '🍅 Tomate', emoji: '🍅', color: '#FFEBEE' },
    { name: '🧅 Cebola', emoji: '🧅', color: '#FFF3E0' },
    { name: '🧄 Alho', emoji: '🧄', color: '#F3E5F5' },
    { name: '🥔 Batata', emoji: '🥔', color: '#FFF8E1' },
    { name: '🥤 Gasosa', emoji: '🥤', color: '#E8F5E9' },
    { name: '💧 Água', emoji: '💧', color: '#E1F5FE' },
    { name: '🍺 Cerveja', emoji: '🍺', color: '#FFF9C4' },
    { name: '🧼 Sabão', emoji: '🧼', color: '#E0F2F1' },
    { name: '🧴 Detergente', emoji: '🧴', color: '#E8EAF6' },
  ];

  // Valores pré-definidos comuns em Angola (Kz)
  const prePrices = [
    50, 100, 150, 200, 250, 300, 400, 500,
    600, 700, 800, 900, 1000, 1500, 2000, 2500,
    3000, 4000, 5000, 10000
  ];

  useEffect(() => {
    loadFavorites();
    loadCartData();
    requestCameraPermissionOCR();
  }, []);

  const requestCameraPermissionOCR = async () => {
    Camera.requestCameraPermission().then(permission => {
      setHasCameraPermission(permission === 'granted');
    });
  };

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

  const handleSelectQuickProduct = (productName: string) => {
    // Remove o emoji e espaços extras
    const cleanName = productName.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim();
    setName(cleanName);
    setShowSuggestions(false);
    // Foco automático no campo de preço seria ideal aqui
  };

  const handleSelectPrePrice = (value: number) => {
    if (isSumMode) {
      // Modo somatório: adiciona ao valor existente
      const currentPrice = parseFloat(price) || 0;
      const newPrice = currentPrice + value;
      setPrice(newPrice.toString());
    } else {
      // Modo normal: substitui o valor
      setPrice(value.toString());
    }
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

  // Função robusta de análise OCR com blocos espaciais (otimizada para Angola)
  const analyzeProductLabel = (data: TextBlock, frame: Frame): ProductData | null => {
    'worklet';
    const { width, height } = frame;

    const focusSize = 350;
    const focusX = (width - focusSize) / 2;
    const focusY = (height - focusSize) / 2;

    const focusedBlocks = [];
    for (let i = 0; i < data.blocks.length; i++) {
      const block = data.blocks[i];
      const { x, y, width: bWidth, height: bHeight } = block.blockFrame;
      const centerX = x + bWidth / 2;
      const centerY = y + bHeight / 2;

      if (centerX >= focusX && centerX <= focusX + focusSize &&
        centerY >= focusY && centerY <= focusY + focusSize) {
        focusedBlocks.push({
          text: block.blockText.trim(),
          x, y, width: bWidth, height: bHeight,
          centerX, centerY
        });
      }
    }

    if (focusedBlocks.length === 0) return null;

    // PRIORIDADE 1: Blocos que contêm "Kz" ou "AKZ" (mais confiável)
    let priceBlock = null;
    for (let i = 0; i < focusedBlocks.length; i++) {
      const block = focusedBlocks[i];
      const textUpper = block.text.toUpperCase();
      
      if (textUpper.includes('KZ') || textUpper.includes('AKZ')) {
        // Captura preços: "84.900 AKZ", "84.900,00 Kz", "1.500 Kz", "500,50 Kz"
        const priceMatch = block.text.match(/(\d{1,3}(?:[.,]\d{3})*(?:[,]\d{2})?)\s*(?:akz|kz)/i);
        if (priceMatch) {
          // Normaliza: 84.900,50 → 84900.50 (remove pontos, vírgula vira ponto)
          const normalizedPrice = priceMatch[1]
            .replace(/\./g, '') // Remove separadores de milhares
            .replace(',', '.'); // Vírgula decimal vira ponto
          priceBlock = { ...block, price: normalizedPrice };
          break;
        }
      }
    }

    // PRIORIDADE 2: Formato padrão sem "Kz" explícito
    if (!priceBlock) {
      for (let i = 0; i < focusedBlocks.length; i++) {
        const block = focusedBlocks[i];
        // Captura: "84.900", "84.900,00", "1500", "500,50"
        const priceMatch = block.text.match(/\d{1,3}(?:[.,]\d{3})*(?:[,]\d{2})?/);
        if (priceMatch) {
          // Normaliza o preço
          const normalizedPrice = priceMatch[0]
            .replace(/\./g, '')
            .replace(',', '.');
          priceBlock = { ...block, price: normalizedPrice };
          break;
        }
      }
    }

    if (!priceBlock) return null;

    let bestNameBlock = null;
    let minDistance = 99999;

    for (let i = 0; i < focusedBlocks.length; i++) {
      const block = focusedBlocks[i];

      if (/^\d+[.,\s]*\d*$/.test(block.text) || block.text.length < 3) continue;
      if (block.text === priceBlock.text) continue;

      const verticalDist = priceBlock.centerY - block.centerY;
      const horizontalDist = Math.abs(priceBlock.centerX - block.centerX);

      if (verticalDist > 0 && verticalDist < 200 && horizontalDist < 150) {
        const distance = verticalDist + horizontalDist * 0.5;
        const sizeBonus = block.height > 30 ? -50 : 0;
        const totalScore = distance + sizeBonus;

        if (totalScore < minDistance) {
          minDistance = totalScore;
          bestNameBlock = block;
        }
      }
    }

    return {
      price: priceBlock.price,
      name: bestNameBlock ? bestNameBlock.text.toUpperCase() : ''
    };
  };

  const updateProductDataJS = Worklets.createRunOnJS((data: ProductData | null) => {
    if (!data || !data.price) return;

    // Validação de preço razoável (50 Kz a 50.000 Kz)
    const priceValue = parseFloat(data.price.replace(',', '.'));
    if (isNaN(priceValue) || priceValue < 50 || priceValue > 200000) return;

    // Mostra indicador de detecção em progresso
    setIsDetecting(true);

    productBufferRef.current.push(data);

    if (productBufferRef.current.length > 3) {
      productBufferRef.current.shift();
    }

    if (productBufferRef.current.length < 2) return;

    const priceFreq: Record<string, number> = {};
    productBufferRef.current.forEach(p => {
      priceFreq[p.price] = (priceFreq[p.price] || 0) + 1;
    });

    const stablePrice = Object.keys(priceFreq).find(p => priceFreq[p] >= 2);

    if (stablePrice) {
      const namesForPrice = productBufferRef.current
        .filter(p => p.price === stablePrice && p.name.length >= 3)
        .map(p => p.name);

      if (namesForPrice.length > 0) {
        const nameFreq: Record<string, number> = {};
        namesForPrice.forEach(n => {
          nameFreq[n] = (nameFreq[n] || 0) + 1;
        });

        let stableName = '';
        let maxCount = 0;
        for (const nm in nameFreq) {
          if (nameFreq[nm] > maxCount) {
            maxCount = nameFreq[nm];
            stableName = nm;
          }
        }

        // Detecção bem-sucedida!
        if (stablePrice !== price || (stableName && stableName !== name)) {
          playBeepSound();
          // Atualiza campos
          if (stablePrice !== price) setPrice(stablePrice);
          if (stableName && stableName !== name) setName(stableName);

          // Mostra feedback visual
          setIsDetecting(false);
          setDetectionSuccess(true);
          const t1 = setTimeout(() => setDetectionSuccess(false), 2000);
          timeoutsRef.current.push(t1);

          // Auto-fecha câmera após 1.5s
          const t2 = setTimeout(() => {
            setIsCameraActive(false);
            productBufferRef.current = [];
            frameCountRef.current = 0;
          }, 1500);
          timeoutsRef.current.push(t2);
        }
      } else if (stablePrice !== price) {
        playBeepSound();
        setPrice(stablePrice);
        setIsDetecting(false);
        setDetectionSuccess(true);
        const t1 = setTimeout(() => setDetectionSuccess(false), 2000);
        timeoutsRef.current.push(t1);

        const t2 = setTimeout(() => {
          setIsCameraActive(false);
          productBufferRef.current = [];
          frameCountRef.current = 0;
        }, 1500);
        timeoutsRef.current.push(t2);
      }
    } else {
      setIsDetecting(false);
    }
  });

  const frameProcessor = useFrameProcessor((frame) => {
    'worklet';

    // Throttling: processa 1 frame a cada 8 (equilíbrio performance/velocidade)
    // frameCountRef.current++;
    // if (frameCountRef.current % 8 !== 0) {
    //   return;
    // }

    runAsync(frame, () => {
      'worklet';
      const data = scanText(frame);

      if (data && data.blocks && data.blocks.length > 0) {
        const productData = analyzeProductLabel(data, frame);
        updateProductDataJS(productData);
      }
    });
  }, [scanText]);

  const toggleCamera = () => {
    if (!hasCameraPermission) {
      Alert.alert('Permissão necessária', 'Precisamos de permissão para aceder à câmera OCR.');
      return;
    }

    if (isCameraActive) {
      // Fechando câmera - limpa timeouts pendentes
      timeoutsRef.current.forEach(t => clearTimeout(t));
      timeoutsRef.current = [];
      
      setIsCameraActive(false);
      productBufferRef.current = [];
      frameCountRef.current = 0;
      setDetectionSuccess(false);
      setIsDetecting(false);
    } else {
      // Abrindo câmera
      setIsCameraActive(true);
      productBufferRef.current = [];
      frameCountRef.current = 0;
      setIsDetecting(false);
    }
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
      {isCameraActive ? <View style={{ marginTop: 20 }} /> : <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Adicionar Produto</Text>
        <View style={{ width: 40 }} />
      </View>}

      {/* Botão Toggle Câmera OCR */}
      <View style={styles.ocrButtonContainer}>
        <Pressable
          style={[styles.ocrToggleButton, isCameraActive && styles.ocrToggleButtonActive]}
          onPress={toggleCamera}>
          <Text style={styles.ocrToggleIcon}>{isCameraActive ? '✕' : '📷'}</Text>
          <Text style={styles.ocrToggleText}>
            {isCameraActive ? 'Fechar OCR' : 'Escanear Produto'}
          </Text>
        </Pressable>
      </View>

      {/* Câmera OCR (quando ativa) */}
      {isCameraActive && device && (
        <View style={styles.cameraContainer}>
          <Camera
            style={styles.camera}
            device={device}
            isActive={isCameraActive}
            frameProcessor={frameProcessor}
          />
          <View style={styles.focusOverlay}>
            <View style={styles.focusBox}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>
            <Text style={styles.instructionText}>Centralize o rótulo</Text>

            {/* Badge de status */}
            {isDetecting && !detectionSuccess && (
              <View style={styles.detectingBadge}>
                <Text style={styles.detectingBadgeText}>👁️ Detectando...</Text>
              </View>
            )}
            {detectionSuccess && (
              <View style={styles.successBadge}>
                <Text style={styles.successBadgeText}>✓ Detectado!</Text>
              </View>
            )}
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled">
        {/* Quick Products Section */}
        <View style={styles.quickProductsSection}>
          <Text style={styles.quickProductsTitle}>⚡ Produtos Rápidos</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickProductsScroll}>
            {quickProducts.map((product, index) => (
              <Pressable
                key={index}
                style={[styles.quickProductChip, { backgroundColor: product.color }]}
                onPress={() => handleSelectQuickProduct(product.name)}>
                <Text style={styles.quickProductEmoji}>{product.emoji}</Text>
                <Text style={styles.quickProductText}>
                  {product.name.replace(/[\u{1F300}-\u{1F9FF}]/gu, '').trim()}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

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

          {/* Pre-Prices Section */}
          <View style={styles.prePricesSection}>
            <View style={styles.prePricesHeader}>
              <Text style={styles.prePricesTitle}>💰 Preços Rápidos</Text>
              <Pressable
                style={styles.sumModeToggle}
                onPress={() => setIsSumMode(!isSumMode)}>
                <View style={[styles.checkbox, isSumMode && styles.checkboxActive]}>
                  {isSumMode && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.sumModeText}>Modo Somatório</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.prePricesScroll}>
              {prePrices.map((value, index) => (
                <Pressable
                  key={index}
                  style={styles.prePriceChip}
                  onPress={() => handleSelectPrePrice(value)}>
                  <Text style={styles.prePriceValue}>
                    {value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k` : value}
                  </Text>
                  <Text style={styles.prePriceCurrency}>Kz</Text>
                </Pressable>
              ))}
            </ScrollView>
            {isSumMode && (
              <View style={styles.sumModeHint}>
                <Text style={styles.sumModeHintText}>
                  ✨ Toque em vários valores para somar automaticamente
                </Text>
              </View>
            )}
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
  quickProductsSection: {
    marginBottom: 20,
  },
  quickProductsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  quickProductsScroll: {
    gap: 10,
    paddingRight: 20,
  },
  quickProductChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  quickProductEmoji: {
    fontSize: 20,
  },
  quickProductText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#424242',
  },
  imageSection: {
    marginBottom: 24,
  },
  prePricesSection: {
    marginTop: 12,
    marginBottom: 8,
  },
  prePricesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  prePricesTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333333',
  },
  sumModeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  checkmark: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sumModeText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  prePricesScroll: {
    gap: 8,
    paddingRight: 20,
  },
  prePriceChip: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  prePriceValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  prePriceCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  sumModeHint: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  sumModeHintText: {
    fontSize: 12,
    color: '#2E7D32',
    textAlign: 'center',
    fontWeight: '500',
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
  ocrButtonContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: '#F5F5F5',
  },
  ocrToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9800',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  ocrToggleButtonActive: {
    backgroundColor: '#F44336',
  },
  ocrToggleIcon: {
    fontSize: 20,
  },
  ocrToggleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  cameraContainer: {
    height: 280,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000000',
    borderWidth: 3,
    borderColor: '#FF9800',
  },
  camera: {
    flex: 1,
  },
  focusOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none',
  },
  focusBox: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderColor: '#00ff00',
    borderWidth: 3,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  instructionText: {
    position: 'absolute',
    bottom: 20,
    color: '#00ff00',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  detectingBadge: {
    position: 'absolute',
    top: 20,
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  detectingBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  successBadge: {
    position: 'absolute',
    top: 20,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  successBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
