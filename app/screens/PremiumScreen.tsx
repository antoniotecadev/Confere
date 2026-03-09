import useUtils from '@/hooks/useUtils';
import { PremiumService } from '@/services/PremiumService';
import { UserService } from '@/services/UserService';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

// ─── Pacotes de subscrição ───────────────────────────────────────────────────
const PACKAGES = [
  {
    id: 'monthly',
    label: '1 Mês',
    months: 1,
    durationDays: 30,
    price: 1500,
    originalPrice: 1500,
    discountPercent: 0,
    badge: null as string | null,
    highlight: false,
    pricePerMonth: 1500,
    savingNote: null as string | null,
  },
  {
    id: '3months',
    label: '3 Meses',
    months: 3,
    durationDays: 90,
    price: 3900,
    originalPrice: 4500,
    discountPercent: 13,
    badge: '-13%',
    highlight: false,
    pricePerMonth: 1300,
    savingNote: 'Economiza 600 Kz',
  },
  {
    id: '6months',
    label: '6 Meses',
    months: 6,
    durationDays: 180,
    price: 7500,
    originalPrice: 9000,
    discountPercent: 17,
    badge: 'POPULAR',
    highlight: true,
    pricePerMonth: 1250,
    savingNote: '1 mês GRÁTIS',
  },
  {
    id: 'annual',
    label: '1 Ano',
    months: 12,
    durationDays: 365,
    price: 12000,
    originalPrice: 18000,
    discountPercent: 33,
    badge: 'MELHOR VALOR',
    highlight: false,
    pricePerMonth: 1000,
    savingNote: '4 meses GRÁTIS',
  },
] as const;
// ──────────────────────────────────────────────────────────────────────────────


const BENEFITS = [
  { icon: 'close-circle-outline', text: 'Sem anúncios' },
  { icon: 'infinite-outline', text: 'Comparações e carrinhos ilimitados' },
  { icon: 'notifications-outline', text: 'Alertas de preço personalizados' },
  { icon: 'trending-up-outline', text: 'Histórico e tendências de preço' },
  { icon: 'share-social-outline', text: 'Partilha avançada via WhatsApp' },
  { icon: 'camera-outline', text: 'Armazenamento ilimitado' },
  { icon: 'stats-chart-outline', text: 'Estatísticas e gráficos detalhados' },
  { icon: 'cloud-upload-outline', text: 'Backup local ou na nuvem' },
  { icon: 'calculator-outline', text: 'Calculadora inteligente' },
  { icon: 'download-outline', text: 'Exportação de dados' },
  { icon: 'headset-outline', text: 'Suporte prioritário 24/7' },
  { icon: 'ellipsis-horizontal-outline', text: 'E muito mais...' }
];

export default function PremiumScreen() {
  const router = useRouter();
  const { copyToClipboard } = useUtils();
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [userId, setUserId] = useState('');
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'expired' | 'inactive' | null>(null);
  const [lastSync, setLastSync] = useState<number>(0);
  const [selectedPackageId, setSelectedPackageId] = useState<string>('monthly');

  // ── Trigger secreto para o admin (7 toques em 4 segundos no ícone) ──────────
  const secretTapCount = React.useRef(0);
  const secretTapTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const SECRET_TAPS = 7;
  const SECRET_WINDOW = 4000; // ms

  const handleSecretTap = () => {
    secretTapCount.current += 1;

    if (secretTapTimer.current) clearTimeout(secretTapTimer.current);
    secretTapTimer.current = setTimeout(() => {
      secretTapCount.current = 0;
    }, SECRET_WINDOW);

    if (secretTapCount.current >= SECRET_TAPS) {
      secretTapCount.current = 0;
      clearTimeout(secretTapTimer.current!);
      router.push('/admin/login' as any);
    }
  };

  const selectedPackage = PACKAGES.find(p => p.id === selectedPackageId) ?? PACKAGES[0];

  // Dados bancários (substitua com os seus)
  const BANK_INFO = {
    bank: 'BAI',
    iban: 'AO06 0055 0000 1234 5678 9012 3',
    accountName: 'Confere Angola, Lda',
    get amount() {
      return `${selectedPackage.price.toLocaleString('pt-AO')},00 Kz`;
    },
  };

  useEffect(() => {
    loadPremiumStatus();
  }, []);

  const loadPremiumStatus = async () => {
    try {

      // 1. Verificar conexão PRIMEIRO (rápido)
      const networkState = await NetInfo.fetch();
      const isOnline = networkState.isConnected && networkState.isInternetReachable;

      const id = await UserService.getUserId();

      const premiumStatus = await PremiumService.getPremiumStatus({ isOnline });
      setIsPremium(premiumStatus.isPremium);
      setExpiresAt(premiumStatus.expiresAt);
      setStatus(premiumStatus.status);
      setLastSync(premiumStatus.lastSync || 0);
      setUserId(id);
      if (!isOnline) {
        Alert.alert('Sem Conexão', 'Carregando status Premium do cache local. \nOs dados podem estar desatualizados. \nConecte-se à internet para verificar o status mais recente.');
      }
    } catch (error) {
      console.error('Erro ao carregar status Premium:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncStatus = async () => {
    setIsSyncing(true);
    try {
      const premiumStatus = await PremiumService.syncStatus();

      setIsPremium(premiumStatus.isPremium);
      setExpiresAt(premiumStatus.expiresAt);
      setStatus(premiumStatus.status);
      setLastSync(premiumStatus.lastSync || Date.now());

      Alert.alert('✅ Sincronizado', 'Estado Premium actualizado com sucesso!');
    } catch (error) {
      Alert.alert('⚠️ Erro', 'Não foi possível sincronizar. Verifica a tua conexão e tenta novamente.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePickReceipt = () => {
    Alert.alert(
      'Comprovativo',
      'Como queres adicionar o comprovativo?',
      [
        {
          text: '📷 Câmara',
          onPress: async () => {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
              Alert.alert('Permissão Negada', 'Precisamos de acesso à câmara para tirar a foto.');
              return;
            }
            const result = await ImagePicker.launchCameraAsync({
              allowsEditing: true,
              quality: 0.8,
            });
            if (!result.canceled) setReceiptUri(result.assets[0].uri);
          },
        },
        {
          text: '🖼️ Galeria',
          onPress: async () => {
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
            if (!result.canceled) setReceiptUri(result.assets[0].uri);
          },
        },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const SUPPORT_WHATSAPP = '244932359808';

  const handleSubmitPayment = async () => {
    if (!receiptUri) {
      Alert.alert('Comprovativo Necessário', 'Por favor, adiciona o comprovativo de pagamento.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Registar no Firebase (sem URL de imagem — entregue via WhatsApp)
      const result = await PremiumService.submitPayment('', selectedPackage.price, selectedPackage.durationDays);

      if (!result.success) {
        Alert.alert('Aviso', result.message || 'Não foi possível registar o pagamento.');
        return;
      }

      // 2. Construir mensagem WhatsApp com detalhes do pagamento
      const planLabel = selectedPackage.label;
      const amount = selectedPackage.price.toLocaleString('pt-AO');
      const dateStr = new Date().toLocaleDateString('pt-AO');
      const waMessage =
        `*Comprovativo de Pagamento — Confere* 🛒\n\n` +
        `💎 Plano: ${planLabel}\n` +
        `💰 Valor: ${amount} Kz\n` +
        `📅 Data: ${dateStr}\n\n` +
        `_(A imagem do comprovativo segue em anexo)_`;

      // 3. Abrir WhatsApp com mensagem pré-preenchida
      const waUrls = [
        `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(waMessage)}`,
        `whatsapp://send?phone=${SUPPORT_WHATSAPP}&text=${encodeURIComponent(waMessage)}`,
      ];

      let whatsappOpened = false;
      for (const url of waUrls) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          whatsappOpened = true;
          break;
        }
      }

      // 4. Partilhar imagem via sheet nativo (utilizador selecciona WhatsApp)
      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await new Promise(res => setTimeout(res, whatsappOpened ? 1200 : 0));
        await Sharing.shareAsync(receiptUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Enviar comprovativo ao Confere',
        });
      }

      Alert.alert(
        'Pagamento Registado! ✅',
        whatsappOpened
          ? 'Os detalhes foram enviados via WhatsApp.\n\nAnexa a imagem do comprovativo na conversa e envia.\n\nVamos validar em até 24 horas.'
          : 'Pagamento registado!\n\nPartilha a imagem do comprovativo via WhatsApp com o nosso suporte.\n\nVamos validar em até 24 horas.',
        [{ text: 'OK', onPress: () => null }]
      );
      setReceiptUri(null);
    } catch (error) {
      Alert.alert('Erro', 'Ocorreu um erro ao enviar o pagamento.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // Formatador de tempo para última sincronização
  const formatLastSync = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} min`;
    if (hours < 24) return `Há ${hours}h`;
    return `Há ${days}d`;
  };

  if (isPremium) {
    const expiryDate = expiresAt ? new Date(expiresAt).toLocaleDateString('pt-AO') : '—';

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
              <Text style={[styles.infoValue, styles.premiumBadge]}>Activo</Text>
            </View>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Expira em:</Text>
            <Text style={styles.infoValue}>{expiryDate}</Text>
          </View>
          {lastSync > 0 && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Última Sincronização:</Text>
              <Text style={styles.infoValue}>{formatLastSync(lastSync)}</Text>
            </View>
          )}
        </View>

        {/* Contact Support Section */}
        <Pressable
          style={styles.contactCard}
          onPress={() => router.push('/screens/ContactScreen')}>
          <View style={styles.contactContent}>
            <Ionicons name="chatbubbles" size={32} color="#2196F3" />
            <View style={styles.contactTextContainer}>
              <Text style={styles.contactTitle}>Precisa de Ajuda?</Text>
              <Text style={styles.contactDescription}>
                Mudou de telemóvel? Dúvidas sobre o Premium?
              </Text>
              <Text style={styles.contactCTA}>👉 Fala Connosco</Text>
            </View>
            <Ionicons name="chevron-forward" size={24} color="#2196F3" />
          </View>
        </Pressable>

        {/* Botão de Sincronização */}
        <Pressable
          style={[styles.syncButton, isSyncing && styles.syncButtonDisabled]}
          onPress={handleSyncStatus}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="sync-outline" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.syncButtonText}>
            {isSyncing ? 'A sincronizar...' : 'Sincronizar Estado'}
          </Text>
        </Pressable>

        <View style={styles.benefitsContainer}>
          <Text style={styles.sectionTitle}>Seus Benefícios:</Text>
          {BENEFITS.map((benefit, index) => (
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
        {/* Toque 7× aqui em 4 segundos para aceder ao painel admin */}
        <Pressable onPress={handleSecretTap} style={styles.headerIconPressable}>
          <Ionicons name="diamond" size={64} color="#9C27B0" />
        </Pressable>
        <Text style={styles.headerTitle}>Confere Premium</Text>
        <Text style={styles.headerSubtitle}>Desbloqueie todos os recursos</Text>
      </View>

      {/* ── Selecção de Pacote ── */}
      <View style={styles.packagesContainer}>
        <Text style={styles.packagesTitle}>Escolha o seu Plano</Text>
        {PACKAGES.map((pkg) => {
          const isSelected = selectedPackageId === pkg.id;
          return (
            <Pressable
              key={pkg.id}
              style={[
                styles.packageCard,
                isSelected && styles.packageCardSelected,
                pkg.highlight && styles.packageCardHighlight,
              ]}
              onPress={() => setSelectedPackageId(pkg.id)}
            >
              {/* Badge no topo */}
              {pkg.badge && (
                <View style={[
                  styles.packageBadge,
                  pkg.highlight ? styles.packageBadgeHighlight : styles.packageBadgeNormal,
                ]}>
                  <Text style={styles.packageBadgeText}>{pkg.badge}</Text>
                </View>
              )}

              <View style={styles.packageRow}>
                {/* Indicador de selecção */}
                <View style={[styles.packageRadio, isSelected && styles.packageRadioSelected]}>
                  {isSelected && <View style={styles.packageRadioDot} />}
                </View>

                {/* Info do pacote */}
                <View style={styles.packageInfo}>
                  <Text style={[styles.packageLabel, isSelected && styles.packageLabelSelected]}>
                    {pkg.label}
                  </Text>
                  {pkg.savingNote && (
                    <Text style={styles.packageSaving}>{pkg.savingNote}</Text>
                  )}
                </View>

                {/* Preço */}
                <View style={styles.packagePricing}>
                  {pkg.originalPrice !== pkg.price && (
                    <Text style={styles.packageOriginalPrice}>
                      {pkg.originalPrice.toLocaleString('pt-AO')} Kz
                    </Text>
                  )}
                  <Text style={[styles.packagePrice, isSelected && styles.packagePriceSelected]}>
                    {pkg.price.toLocaleString('pt-AO')} Kz
                  </Text>
                  <Text style={styles.packagePerMonth}>
                    {pkg.pricePerMonth.toLocaleString('pt-AO')} Kz/mês
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.benefitsContainer}>
        <Text style={styles.sectionTitle}>O que você ganha:</Text>
        {BENEFITS.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <Ionicons name={benefit.icon as any} size={20} color="#4CAF50" style={styles.benefitIcon} />
            <Text style={styles.benefitItem}>{benefit.text}</Text>
          </View>
        ))}
      </View>

      {(
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
                  <View style={{ flex: 1 }}>
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
              <Text style={styles.stepText}>Fotografa ou selecciona o comprovativo:</Text>
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
                <Text style={styles.uploadButtonText}>|</Text>
                <Ionicons name="image-outline" size={24} color="#FFFFFF" style={{ marginLeft: 8 }} />
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

      {/* Contact Support Section (Non-Premium) */}
      <Pressable
        style={styles.contactCard}
        onPress={() => router.push('/screens/ContactScreen')}>
        <View style={styles.contactContent}>
          <Ionicons name="chatbubbles" size={32} color="#2196F3" />
          <View style={styles.contactTextContainer}>
            <Text style={styles.contactTitle}>Dúvidas sobre o Premium?</Text>
            <Text style={styles.contactDescription}>
              Estamos aqui para ajudar! Entre em contato connosco.
            </Text>
            <Text style={styles.contactCTA}>👉 Fala Connosco</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#2196F3" />
        </View>
      </Pressable>

      {/* {Platform.OS === 'ios' && (
        <View style={styles.iosMessage}>
          <Ionicons name="phone-portrait-outline" size={32} color="#1976D2" style={styles.iosIcon} />
          <Text style={styles.iosMessageText}>
            Para pagar via Multicaixa Express, acesse:{'\n\n'}
            <Text style={styles.iosLink} onPress={() => Linking.openURL('https://confere.app/premium')}>
              confere.app/premium
            </Text>
          </Text>
        </View>
      )} */}

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
  headerIconPressable: {
    marginBottom: 16,
    padding: 8, // área de toque maior, mas invisível
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
  // ── Pacotes ──────────────────────────────────────────────────────────────────
  packagesContainer: {
    margin: 16,
    marginTop: 4,
  },
  packagesTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  packageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 10,
    padding: 14,
    paddingTop: 14,
    overflow: 'hidden',
  },
  packageCardSelected: {
    borderColor: '#4CAF50',
    backgroundColor: '#F1F8E9',
  },
  packageCardHighlight: {
    borderColor: '#9C27B0',
  },
  packageBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
  },
  packageBadgeHighlight: {
    backgroundColor: '#9C27B0',
  },
  packageBadgeNormal: {
    backgroundColor: '#FF7043',
  },
  packageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  packageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  packageRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageRadioSelected: {
    borderColor: '#4CAF50',
  },
  packageRadioDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
  },
  packageInfo: {
    flex: 1,
  },
  packageLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333333',
  },
  packageLabelSelected: {
    color: '#2E7D32',
  },
  packageSaving: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
    marginTop: 2,
  },
  packagePricing: {
    alignItems: 'flex-end',
  },
  packageOriginalPrice: {
    fontSize: 12,
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333333',
  },
  packagePriceSelected: {
    color: '#2E7D32',
  },
  packagePerMonth: {
    fontSize: 11,
    color: '#757575',
    marginTop: 1,
  },
  // ─────────────────────────────────────────────────────────────────────────────
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
  syncButton: {
    backgroundColor: '#2196F3',
    margin: 16,
    marginTop: 8,
    padding: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  syncButtonDisabled: {
    backgroundColor: '#B0BEC5',
  },
  syncButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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
  contactCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2196F3',
    overflow: 'hidden',
  },
  contactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  contactTextContainer: {
    flex: 1,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 4,
  },
  contactDescription: {
    fontSize: 14,
    color: '#1976D2',
    marginBottom: 6,
    lineHeight: 20,
  },
  contactCTA: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2196F3',
  },
});
