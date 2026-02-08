import { CartsStorage } from '@/utils/carts-storage';
import { Comparison, ComparisonsStorage } from '@/utils/comparisons-storage';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Animated,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

export default function ComparisonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const cartId = params.cartId as string | undefined;

  const [supermarket, setSupermarket] = useState('');
  const [calculatedTotal, setCalculatedTotal] = useState(0);
  const [chargedTotal, setChargedTotal] = useState('');
  const [hasCompared, setHasCompared] = useState(false);
  const [difference, setDifference] = useState(0);
  const [matches, setMatches] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [receiptPhotos, setReceiptPhotos] = useState<string[]>([]);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);

  useEffect(() => {
    if (cartId) {
      loadCart();
      loadExistingComparison();
    } else {
      Alert.alert('Erro', 'Carrinho não encontrado.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    }
  }, [cartId]);

  const loadCart = async () => {
    if (!cartId) return;

    try {
      const cart = await CartsStorage.getCartById(cartId);
      if (cart) {
        setSupermarket(cart.supermarket);
        setCalculatedTotal(cart.total);
      }
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
      Alert.alert('Erro', 'Não foi possível carregar o carrinho.');
    }
  };

  const loadExistingComparison = async () => {
    if (!cartId) return;

    try {
      const comparison = await ComparisonsStorage.getComparisonByCartId(cartId);
      if (comparison) {
        setChargedTotal(comparison.chargedTotal.toString());
        setDifference(comparison.difference);
        setMatches(comparison.matches);
        setHasCompared(true);
        setReceiptPhotos(comparison.receiptPhotos || []);
      }
    } catch (error) {
      console.error('Erro ao carregar comparação:', error);
    }
  };

  const handleCompare = async () => {
    const charged = parseFloat(chargedTotal);

    if (isNaN(charged) || charged < 0) {
      Alert.alert('Atenção', 'Por favor, insira um valor válido.');
      return;
    }

    const diff = charged - calculatedTotal;
    const doesMatch = Math.abs(diff) < 0.01; // Tolerância de 1 cêntimo

    setDifference(diff);
    setMatches(doesMatch);
    setHasCompared(true);

    // Animação de fade in do resultado
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();

    // Salvar comparação
    try {
      const comparison: Comparison = {
        id: Date.now().toString(),
        cartId: cartId!,
        supermarket,
        date: new Date().toISOString(),
        calculatedTotal,
        chargedTotal: charged,
        difference: diff,
        matches: doesMatch,
      };

      await ComparisonsStorage.saveComparison(comparison);
    } catch (error) {
      console.error('Erro ao salvar comparação:', error);
    }
  };

  const handleReset = () => {
    setChargedTotal('');
    setHasCompared(false);
    setDifference(0);
    setMatches(false);
    fadeAnim.setValue(0);
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de permissão para usar a câmera.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...receiptPhotos, result.assets[0].uri];
        setReceiptPhotos(newPhotos);
        await updateComparisonPhotos(newPhotos);
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      Alert.alert('Erro', 'Não foi possível tirar a foto.');
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão negada', 'Precisamos de permissão para acessar a galeria.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const newPhotos = [...receiptPhotos, result.assets[0].uri];
        setReceiptPhotos(newPhotos);
        await updateComparisonPhotos(newPhotos);
      }
    } catch (error) {
      console.error('Erro ao escolher imagem:', error);
      Alert.alert('Erro', 'Não foi possível escolher a imagem.');
    }
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Adicionar Foto do Talão',
      'Escolhe como queres adicionar a foto:',
      [
        { text: 'Câmera', onPress: handleTakePhoto },
        { text: 'Galeria', onPress: handlePickImage },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleDeletePhoto = async (index: number) => {
    Alert.alert(
      'Eliminar Foto',
      'Tens certeza que desejas eliminar esta foto?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            const newPhotos = receiptPhotos.filter((_, i) => i !== index);
            setReceiptPhotos(newPhotos);
            await updateComparisonPhotos(newPhotos);
          },
        },
      ]
    );
  };

  const updateComparisonPhotos = async (photos: string[]) => {
    if (!cartId) return;

    try {
      const comparison = await ComparisonsStorage.getComparisonByCartId(cartId);
      if (comparison) {
        const updatedComparison = { ...comparison, receiptPhotos: photos };
        await ComparisonsStorage.saveComparison(updatedComparison);
      }
    } catch (error) {
      console.error('Erro ao atualizar fotos:', error);
    }
  };

  const handleShare = async () => {
    const charged = parseFloat(chargedTotal);
    const statusEmoji = matches ? '✅' : '⚠️';
    const statusText = matches ? 'CONFERE!' : 'NÃO CONFERE!';
    
    let message = `🛒 CONFERE - Comparação de Compra\n\n`;
    message += `${statusEmoji} ${statusText}\n\n`;
    message += `📍 Supermercado: ${supermarket}\n`;
    message += `📅 Data: ${new Date().toLocaleDateString('pt-PT')}\n\n`;
    message += `💰 Total Calculado: ${formatCurrency(calculatedTotal)}\n`;
    message += `🧾 Total Cobrado: ${formatCurrency(charged)}\n`;
    message += `━━━━━━━━━━━━━━━━\n`;
    
    if (matches) {
      message += `✓ Perfeito! O valor está correto.\n`;
    } else {
      message += `⚠️ Diferença: ${difference > 0 ? '+' : ''}${formatCurrency(Math.abs(difference))}\n\n`;
      if (difference > 0) {
        message += `❌ Estão a cobrar ${formatCurrency(Math.abs(difference))} A MAIS!\n`;
      } else {
        message += `✓ Estão a cobrar ${formatCurrency(Math.abs(difference))} a menos\n`;
      }
    }
    
    message += `\n━━━━━━━━━━━━━━━━\n`;
    message += `📱 Gerado com app CONFERE\n`;
    message += `Controla os teus gastos!`;

    try {
      await Share.share({
        message: message,
        title: 'Comparação de Compra - Confere',
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString('pt-AO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Kz`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </Pressable>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Conferir Compra</Text>
          <Text style={styles.headerSubtitle}>{supermarket}</Text>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Calculated Total Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Total Calculado (App)</Text>
          <Text style={styles.calculatedAmount}>{formatCurrency(calculatedTotal)}</Text>
          <Text style={styles.cardDescription}>
            Baseado nos produtos que adicionaste
          </Text>
        </View>

        {/* Charged Total Input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Valor Cobrado (Caixa)</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            value={chargedTotal}
            onChangeText={setChargedTotal}
            keyboardType="decimal-pad"
            placeholderTextColor="#999"
          />
          <Text style={styles.cardDescription}>
            Insere o valor que apareceu no caixa
          </Text>
        </View>

        {/* Compare Button */}
        {!hasCompared ? (
          <Pressable
            style={[styles.compareButton, !chargedTotal && styles.compareButtonDisabled]}
            onPress={handleCompare}
            disabled={!chargedTotal}>
            <Text style={styles.compareButtonText}>Comparar</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetButtonText}>Nova Comparação</Text>
          </Pressable>
        )}

        {/* Result Card */}
        {hasCompared && (
          <Animated.View style={[styles.resultCard, { opacity: fadeAnim }]}>
            <View
              style={[
                styles.resultHeader,
                matches ? styles.resultHeaderSuccess : styles.resultHeaderWarning,
              ]}>
              <Ionicons 
                name={matches ? 'checkmark-circle' : 'alert-circle'} 
                size={64} 
                color="#FFFFFF" 
              />
              <Text style={styles.resultTitle}>
                {matches ? 'Confere!' : 'Não confere!'}
              </Text>
            </View>

            <View style={styles.resultContent}>
              <View style={styles.resultRow}>
                <Text style={styles.resultLabel}>Diferença:</Text>
                <Text
                  style={[
                    styles.resultValue,
                    difference > 0 ? styles.resultPositive : styles.resultNegative,
                  ]}>
                  {difference > 0 ? '+' : ''}
                  {formatCurrency(Math.abs(difference))}
                </Text>
              </View>

              {!matches && (
                <View style={styles.messageBox}>
                  <Text style={styles.messageText}>
                    {difference > 0
                      ? `O valor cobrado é ${formatCurrency(Math.abs(difference))} a mais do que devia.`
                      : `O valor cobrado é ${formatCurrency(Math.abs(difference))} a menos do que devia.`}
                  </Text>
                </View>
              )}

              {matches && (
                <View style={[styles.messageBox, styles.messageBoxSuccess]}>
                  <Text style={styles.messageTextSuccess}>
                    Perfeito! O valor cobrado está correto.
                  </Text>
                </View>
              )}
            </View>

            {/* Share Button */}
            <Pressable style={styles.shareButton} onPress={handleShare}>
              <Ionicons name="share-social" size={20} color="#FFFFFF" />
              <Text style={styles.shareButtonText}>Compartilhar Comparação</Text>
            </Pressable>

            <View style={styles.proofSection}>
              <View style={styles.proofHeader}>
                <Ionicons name="clipboard" size={20} color="#666666" />
                <Text style={styles.proofTitle}>As tuas provas:</Text>
              </View>
              <Text style={styles.proofItem}>• Supermercado: {supermarket}</Text>
              <Text style={styles.proofItem}>
                • Data: {new Date().toLocaleDateString('pt-PT')}
              </Text>
              <Text style={styles.proofItem}>
                • Total calculado: {formatCurrency(calculatedTotal)}
              </Text>
              <Text style={styles.proofItem}>
                • Total cobrado: {formatCurrency(parseFloat(chargedTotal))}
              </Text>

              {/* Fotos do Talão */}
              <View style={styles.photosSection}>
                <View style={styles.photosSectionHeader}>
                  <Ionicons name="camera" size={18} color="#666666" />
                  <Text style={styles.photosSectionTitle}>Fotos do Talão:</Text>
                </View>
                
                {receiptPhotos.length > 0 && (
                  <View style={styles.photosGrid}>
                    {receiptPhotos.map((uri, index) => (
                      <Pressable
                        key={index}
                        style={styles.photoThumbnail}
                        onPress={() => setSelectedPhotoIndex(index)}
                        onLongPress={() => handleDeletePhoto(index)}>
                        <Image source={{ uri }} style={styles.photoThumbnailImage} />
                        <Pressable
                          style={styles.photoDeleteButton}
                          onPress={() => handleDeletePhoto(index)}>
                          <Ionicons name="close-circle" size={24} color="#F44336" />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}

                <Pressable style={styles.addPhotoButton} onPress={handleAddPhoto}>
                  <Ionicons name="camera-outline" size={20} color="#2196F3" />
                  <Text style={styles.addPhotoButtonText}>
                    {receiptPhotos.length > 0 ? 'Adicionar Outra Foto' : 'Adicionar Foto do Talão'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        )}
      </ScrollView>

      {/* Modal de Visualização de Foto */}
      <Modal
        visible={selectedPhotoIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedPhotoIndex(null)}>
        <View style={styles.photoModalOverlay}>
          <Pressable
            style={styles.photoModalClose}
            onPress={() => setSelectedPhotoIndex(null)}>
            <Ionicons name="close" size={32} color="#FFFFFF" />
          </Pressable>
          {selectedPhotoIndex !== null && (
            <Image
              source={{ uri: receiptPhotos[selectedPhotoIndex] }}
              style={styles.photoModalImage}
              resizeMode="contain"
            />
          )}
        </View>
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
    gap: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  calculatedAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#999999',
  },
  input: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333333',
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
    paddingVertical: 8,
    marginBottom: 8,
  },
  compareButton: {
    backgroundColor: '#2196F3',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  compareButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  compareButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  resetButtonText: {
    color: '#2196F3',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  resultHeader: {
    padding: 24,
    alignItems: 'center',
  },
  resultHeaderSuccess: {
    backgroundColor: '#4CAF50',
  },
  resultHeaderWarning: {
    backgroundColor: '#FF9800',
  },
  resultIcon: {
    fontSize: 64,
    marginBottom: 12,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  resultContent: {
    padding: 20,
  },
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
  },
  resultValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  resultPositive: {
    color: '#F44336',
  },
  resultNegative: {
    color: '#4CAF50',
  },
  messageBox: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    padding: 16,
    borderRadius: 8,
  },
  messageBoxSuccess: {
    backgroundColor: '#E8F5E9',
    borderLeftColor: '#4CAF50',
  },
  messageText: {
    fontSize: 16,
    color: '#E65100',
    lineHeight: 24,
  },
  messageTextSuccess: {
    fontSize: 16,
    color: '#2E7D32',
    lineHeight: 24,
  },
  shareButton: {
    backgroundColor: '#25D366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    marginHorizontal: 20,
    marginVertical: 16,
    borderRadius: 12,
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  proofSection: {
    backgroundColor: '#F5F5F5',
    padding: 20,
    gap: 8,
  },
  proofHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  proofTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  proofItem: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
  },
  photosSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  photosSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  photosSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumbnailImage: {
    width: '100%',
    height: '100%',
  },
  photoDeleteButton: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  addPhotoButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
  photoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoModalClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  photoModalImage: {
    width: '100%',
    height: '100%',
  },
});
