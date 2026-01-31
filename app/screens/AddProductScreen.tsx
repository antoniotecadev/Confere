import { CartItem } from '@/utils/carts-storage';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

  const handleSaveProduct = () => {
    if (!validateForm()) return;

    const newProduct: CartItem = {
      id: Date.now().toString(),
      name: name.trim(),
      price: parseFloat(price),
      quantity: parseInt(quantity),
      imageUri: imageUri || undefined,
    };

    // Passar o produto de volta para CartScreen e voltar
    // Usar replace para garantir que o parâmetro seja passado corretamente
    router.replace({
      pathname: '/screens/CartScreen',
      params: { 
        id: params.id as string,
        newProduct: JSON.stringify(newProduct),
      },
    } as any);
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
            />
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
