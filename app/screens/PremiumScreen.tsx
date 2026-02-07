import { PremiumService } from '@/app/services/PremiumService';
import { UserService } from '@/app/services/UserService';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function PremiumScreen() {
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [userId, setUserId] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dados bancários (substitua com os seus)
  const BANK_INFO = {
    bank: 'BAI',
    iban: 'AO06 0055 0000 1234 5678 9012 3',
    accountName: 'Confere Angola, Lda',
    amount: '1.500,00 Kz',
  };

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {
      const status = await PremiumService.getPremiumStatus();
      const id = await UserService.getUserId();
      
      setIsPremium(status.isPremium);
      setExpiresAt(status.expiresAt);
      setUserId(id);
    } catch (error) {
      console.error('Erro ao carregar status Premium:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePickReceipt = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permissão Negada', 'Precisamos de acesso à galeria para anexar o comprovativo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setReceiptUri(result.assets[0].uri);
    }
  };

  const handleSubmitPayment = async () => {
    if (!receiptUri) {
      Alert.alert('Comprovativo Necessário', 'Por favor, anexe o comprovativo de pagamento.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await PremiumService.submitPayment(receiptUri, 1500);
      
      if (result.success) {
        Alert.alert(
          'Pagamento Enviado! ✅',
          'Seu comprovativo foi enviado com sucesso.\n\nVamos validar o pagamento em até 24 horas e activar seu Premium automaticamente.',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Aviso', result.message || 'Não foi possível enviar o pagamento.');
      }
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao enviar o pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copiado!', `${label} copiado para a área de transferência.`);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  if (isPremium) {
    const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-AO') : 'Ilimitado';
    
    return (
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="trophy" size={64} color="#FFD700" style={styles.headerIcon} />
          <Text style={styles.headerTitle}>Você é Premium!</Text>
          <Text style={styles.headerSubtitle}>Obrigado por apoiar o Confere</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status:</Text>
            <View style={styles.badgeContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.badgeIcon} />
              <Text style={[styles.infoValue, styles.premiumBadge]}>Ativo</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expira em:</Text>
            <Text style={styles.infoValue}>{expiryDate}</Text>
          </View>
        </View>

        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionTitle}>Seus Benefícios:</Text>
          {[
            { icon: 'close-circle-outline', text: 'Sem anúncios' },
            { icon: 'cloud-upload-outline', text: 'Backup e restauro de dados' },
            { icon: 'infinite-outline', text: 'Comparações ilimitadas' },
            { icon: 'stats-chart-outline', text: 'Relatórios avançados' },
            { icon: 'headset-outline', text: 'Suporte prioritário' },
          ].map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <Ionicons name={benefit.icon as any} size={20} color="#4CAF50" style={styles.benefitIcon} />
              <Text style={styles.benefitItem}>{benefit.text}</Text>
            </View>
          ))}
        </View>

        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="diamond" size={64} color="#9C27B0" style={styles.headerIcon} />
        <Text style={styles.headerTitle}>Confere Premium</Text>
        <Text style={styles.headerSubtitle}>Desbloqueie todos os recursos</Text>
      </View>

      <View style={styles.priceCard}>
        <Text style={styles.priceAmount}>1.500 Kz</Text>
        <Text style={styles.pricePeriod}>por mês</Text>
      </View>

      <View style={styles.benefitsContainer}>
        <Text style={styles.sectionTitle}>O que você ganha:</Text>
        {[
          { icon: 'close-circle-outline', text: 'Sem anúncios' },
          { icon: 'cloud-upload-outline', text: 'Backup e restauro de dados' },
          { icon: 'infinite-outline', text: 'Comparações ilimitadas' },
          { icon: 'stats-chart-outline', text: 'Relatórios avançados' },
          { icon: 'headset-outline', text: 'Suporte prioritário' },
        ].map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <Ionicons name={benefit.icon as any} size={20} color="#4CAF50" style={styles.benefitIcon} />
            <Text style={styles.benefitItem}>{benefit.text}</Text>
          </View>
        ))}
      </View>

      {Platform.OS === 'android' && (
        <>
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Ionicons name="card-outline" size={18} color="#666666" style={styles.dividerIcon} />
              <Text style={styles.dividerText}>Pagar via Multicaixa Express</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.paymentCard}>
            <View style={styles.paymentTitleContainer}>
              <Ionicons name="phone-portrait-outline" size={24} color="#333333" style={styles.paymentIcon} />
              <Text style={styles.paymentTitle}>Instruções de Pagamento</Text>
            </View>
            
            <View style={styles.step}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <Text style={styles.stepText}>Abra o Multicaixa Express</Text>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <Text style={styles.stepText}>Faça uma transferência para:</Text>
            </View>

            <View style={styles.bankInfo}>
              <Pressable onPress={() => copyToClipboard(BANK_INFO.iban, 'IBAN')}>
                <Text style={styles.bankLabel}>Banco:</Text>
                <Text style={styles.bankValue}>{BANK_INFO.bank}</Text>
                
                <View style={styles.ibanRow}>
                  <View style={{flex: 1}}>
                    <Text style={styles.bankLabel}>IBAN:</Text>
                    <Text style={styles.bankValue}>{BANK_INFO.iban}</Text>
                  </View>
                  <Ionicons name="copy-outline" size={20} color="#2196F3" />
                </View>
                
                <Text style={styles.bankLabel}>Titular:</Text>
                <Text style={styles.bankValue}>{BANK_INFO.accountName}</Text>
                
                <Text style={styles.bankLabel}>Valor:</Text>
                <Text style={[styles.bankValue, styles.amountHighlight]}>{BANK_INFO.amount}</Text>
              </Pressable>
            </View>

            <View style={styles.step}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <Text style={styles.stepText}>Use esta referência no pagamento:</Text>
            </View>

            <Pressable 
              style={styles.userIdCard} 
              onPress={() => copyToClipboard(userId, 'ID')}
            >
              <View style={styles.userIdHeader}>
                <Text style={styles.userIdLabel}>Seu ID Único:</Text>
                <Ionicons name="copy-outline" size={18} color="#E65100" />
              </View>
              <Text style={styles.userIdValue}>{userId.substring(0, 8)}...</Text>
            </Pressable>

            <View style={styles.step}>
              <View style={styles.stepNumberContainer}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <Text style={styles.stepText}>Anexe o comprovativo abaixo:</Text>
            </View>

            {receiptUri ? (
              <View style={styles.receiptPreview}>
                <Image source={{ uri: receiptUri }} style={styles.receiptImage} />
                <Pressable style={styles.changeReceiptButton} onPress={handlePickReceipt}>
                  <Text style={styles.changeReceiptText}>Trocar Foto</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable style={styles.uploadButton} onPress={handlePickReceipt}>
                <Ionicons name="camera-outline" size={24} color="#FFFFFF" style={styles.uploadIcon} />
                <Text style={styles.uploadButtonText}>Anexar Comprovativo</Text>
              </Pressable>
            )}

            <Pressable 
              style={[styles.submitButton, (!receiptUri || isSubmitting) && styles.submitButtonDisabled]} 
              onPress={handleSubmitPayment}
              disabled={!receiptUri || isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={24} color="#FFFFFF" style={styles.submitIcon} />
                  <Text style={styles.submitButtonText}>Enviar Pagamento</Text>
                </>
              )}
            </Pressable>

            <View style={styles.disclaimerContainer}>
              <Ionicons name="time-outline" size={16} color="#666666" style={styles.disclaimerIcon} />
              <Text style={styles.disclaimer}>
                Validamos pagamentos em até 24 horas.{'\n'}
                Você receberá uma notificação quando o Premium for activado.
              </Text>
            </View>
          </View>
        </>
      )}

      {Platform.OS === 'ios' && (
        <View style={styles.iosMessage}>
          <Ionicons name="phone-portrait-outline" size={32} color="#1976D2" style={styles.iosIcon} />
          <Text style={styles.iosMessageText}>
            Para pagar via Multicaixa Express, acesse:{'\n\n'}
            <Text style={styles.iosLink} onPress={() => Linking.openURL('https://confere.app/premium')}>
              confere.app/premium
            </Text>
          </Text>
        </View>
      )}

      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>Voltar</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFFFFF',
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
  },
  priceCard: {
    backgroundColor: '#4CAF50',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  priceAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  pricePeriod: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  benefitsContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 16,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  benefitIcon: {
    marginRight: 12,
  },
  benefitItem: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    lineHeight: 24,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  dividerIcon: {
    marginRight: 6,
  },
  dividerText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '600',
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  paymentTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  paymentIcon: {
    marginRight: 8,
  },
  paymentTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: 16,
    color: '#333333',
    flex: 1,
    lineHeight: 24,
  },
  bankInfo: {
    backgroundColor: '#F9F9F9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  bankLabel: {
    fontSize: 12,
    color: '#666666',
    marginTop: 8,
  },
  ibanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
    marginBottom: 4,
  },
  amountHighlight: {
    fontSize: 20,
    color: '#4CAF50',
  },
  userIdCard: {
    backgroundColor: '#FFF3E0',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FF9800',
  },
  userIdHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userIdLabel: {
    fontSize: 12,
    color: '#E65100',
  },
  userIdValue: {
    fontSize: 16,
    color: '#E65100',
    fontWeight: 'bold',
  },
  uploadButton: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadIcon: {
    marginRight: 8,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  receiptPreview: {
    marginBottom: 16,
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 12,
  },
  changeReceiptButton: {
    padding: 8,
  },
  changeReceiptText: {
    color: '#2196F3',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  submitIcon: {
    marginRight: 8,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  disclaimerIcon: {
    marginRight: 6,
    marginTop: 2,
  },
  disclaimer: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 18,
    flex: 1,
  },
  iosMessage: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    alignItems: 'center',
  },
  iosIcon: {
    marginBottom: 12,
  },
  iosMessageText: {
    fontSize: 16,
    color: '#1976D2',
    textAlign: 'center',
    lineHeight: 24,
  },
  iosLink: {
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
  card: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 16,
    color: '#666666',
  },
  infoValue: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '600',
  },
  badgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIcon: {
    marginRight: 4,
  },
  premiumBadge: {
    color: '#4CAF50',
    fontSize: 18,
  },
  backButton: {
    backgroundColor: '#666666',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
