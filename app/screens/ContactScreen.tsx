import { ContactService } from '@/services/ContactService';
import { UserService } from '@/services/UserService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

export default function ContactScreen() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  const MAX_LENGTH = ContactService.getMaxMessageLength();

  useEffect(() => {
    loadUserId();
  }, []);

  const loadUserId = async () => {
    const id = await UserService.getUserId();
    setUserId(id);
  };

  const handleSendMessage = async () => {
    // Validações
    if (!whatsappNumber.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, insira o seu número de WhatsApp.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, selecione o assunto.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, escreva a sua mensagem.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await ContactService.sendContactMessage(
        whatsappNumber,
        message,
        subject
      );

      if (result.success) {
        Alert.alert(
          'Mensagem Enviada! ✅',
          'Recebemos a sua mensagem e responderemos em breve através do WhatsApp.\n\nObrigado por entrar em contato!',
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        Alert.alert('Erro', result.message);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar a mensagem. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToWhatsApp = async () => {
    // Validações
    if (!whatsappNumber.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, insira o seu número de WhatsApp.');
      return;
    }

    if (!subject.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, selecione o assunto.');
      return;
    }

    if (!message.trim()) {
      Alert.alert('Campo Obrigatório', 'Por favor, escreva a sua mensagem.');
      return;
    }

    setIsSendingWhatsApp(true);

    try {
      const opened = await ContactService.openWhatsAppSupport(
        whatsappNumber,
        message,
        subject
      );

      if (!opened) {
        Alert.alert(
          'WhatsApp não disponível',
          'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.'
        );
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível abrir o WhatsApp.');
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  const subjects = [
    { value: '🔄 Transferir Premium', label: '🔄 Transferir Premium (Mudei de Telemóvel)' },
    { value: '💎 Dúvida sobre Premium', label: '💎 Dúvida sobre Premium' },
    { value: '💳 Problema com Pagamento', label: '💳 Problema com Pagamento' },
    { value: '🐛 Reportar Bug', label: '🐛 Reportar Bug/Erro' },
    { value: '💡 Sugestão', label: '💡 Sugestão de Melhoria' },
    { value: '❓ Outra Dúvida', label: '❓ Outra Dúvida' },
  ];

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Ionicons name="chatbubbles" size={48} color="#2196F3" />
            <Text style={styles.headerTitle}>Fala Connosco</Text>
            <Text style={styles.headerSubtitle}>
              Estamos aqui para ajudar! Envie a sua mensagem e responderemos em breve.
            </Text>
          </View>
        </View>

        {/* Info Cards */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={24} color="#2196F3" />
          <Text style={styles.infoText}>
            Mudou de telemóvel? Perdeu os dados? Envie-nos o seu ID e número de WhatsApp
            para recuperarmos o seu Premium!
          </Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* User ID (read-only) */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Seu ID <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.idContainer}>
              <TextInput
                style={styles.idInput}
                value={userId}
                editable={false}
                selectTextOnFocus={false}
              />
              <View style={styles.idBadge}>
                <Ionicons name="lock-closed" size={16} color="#666666" />
              </View>
            </View>
            <Text style={styles.hint}>Este ID identifica a sua conta</Text>
          </View>

          {/* WhatsApp Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Seu WhatsApp <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="logo-whatsapp" size={20} color="#25D366" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="244912345678"
                placeholderTextColor="#999999"
                value={whatsappNumber}
                onChangeText={setWhatsappNumber}
                keyboardType="phone-pad"
                maxLength={12}
              />
            </View>
            <Text style={styles.hint}>
              Formato: 244 + 9 dígitos (ex: 244912345678)
            </Text>
          </View>

          {/* Subject */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Assunto <Text style={styles.required}>*</Text>
            </Text>
            <View style={styles.subjectContainer}>
              {subjects.map((item) => (
                <Pressable
                  key={item.value}
                  style={[
                    styles.subjectChip,
                    subject === item.value && styles.subjectChipSelected,
                  ]}
                  onPress={() => setSubject(item.value)}>
                  <Text
                    style={[
                      styles.subjectChipText,
                      subject === item.value && styles.subjectChipTextSelected,
                    ]}>
                    {item.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* Message */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              Mensagem <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Descreva a sua situação ou dúvida..."
              placeholderTextColor="#999999"
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={6}
              maxLength={MAX_LENGTH}
              textAlignVertical="top"
            />
            <View style={styles.characterCount}>
              <Text
                style={[
                  styles.characterCountText,
                  message.length >= MAX_LENGTH && styles.characterCountTextMax,
                ]}>
                {message.length} / {MAX_LENGTH}
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Send to Firebase (Primary) */}
            <Pressable
              style={[styles.primaryButton, isLoading && styles.buttonDisabled]}
              onPress={handleSendMessage}
              disabled={isLoading}>
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="send" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                  <Text style={styles.primaryButtonText}>Enviar Mensagem</Text>
                </>
              )}
            </Pressable>

            {/* Send to WhatsApp (Secondary) */}
            <Pressable
              style={[styles.secondaryButton, isSendingWhatsApp && styles.buttonDisabled]}
              onPress={handleSendToWhatsApp}
              disabled={isSendingWhatsApp}>
              {isSendingWhatsApp ? (
                <ActivityIndicator color="#25D366" />
              ) : (
                <>
                  <Ionicons
                    name="logo-whatsapp"
                    size={20}
                    color="#25D366"
                    style={styles.buttonIcon}
                  />
                  <Text style={styles.secondaryButtonText}>Enviar via WhatsApp</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerContainer}>
            <Ionicons name="shield-checkmark" size={18} color="#4CAF50" />
            <Text style={styles.disclaimer}>
              Os seus dados estão seguros. Usaremos apenas para responder à sua solicitação.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Back Button */}
      <View style={styles.footer}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color="#666666" />
          <Text style={styles.backButtonText}>Voltar</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 60,
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerContent: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333333',
    marginTop: 12,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  required: {
    color: '#F44336',
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: '#666666',
  },
  idBadge: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  hint: {
    fontSize: 12,
    color: '#999999',
    marginTop: 4,
    fontStyle: 'italic',
  },
  subjectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  subjectChip: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  subjectChipSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  subjectChipText: {
    fontSize: 14,
    color: '#666666',
  },
  subjectChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
    minHeight: 120,
  },
  characterCount: {
    alignItems: 'flex-end',
    marginTop: 4,
  },
  characterCountText: {
    fontSize: 12,
    color: '#999999',
  },
  characterCountTextMax: {
    color: '#F44336',
    fontWeight: '600',
  },
  buttonContainer: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#25D366',
    borderRadius: 8,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonIcon: {
    marginRight: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#25D366',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 8,
  },
  disclaimer: {
    flex: 1,
    fontSize: 12,
    color: '#558B2F',
    lineHeight: 18,
  },
  footer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  backButtonText: {
    fontSize: 16,
    color: '#666666',
  },
});
