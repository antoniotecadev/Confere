/**
 * 🔐 Admin Login Screen
 *
 * - Email + Password via Firebase Auth
 * - Sem botão "Criar Conta" (segurança)
 * - Bloqueio com contagem regressiva visível
 * - Feedback de tentativas restantes
 * - Ocultação de password
 */

import { AdminAuthService, LockoutInfo } from '@/services/AdminAuthService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
import { useAdmin } from './_layout';

export default function AdminLoginScreen() {
  const { setAdminUser } = useAdmin();

  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);
  const [lockout,      setLockout]      = useState<LockoutInfo | null>(null);

  // Temporizador de contagem regressiva
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkLockout();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const checkLockout = async () => {
    const info = await AdminAuthService.getLockoutInfo();
    setLockout(info);

    if (info.isLocked) startCountdown();
  };

  const startCountdown = () => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      const info = await AdminAuthService.getLockoutInfo();
      setLockout(info);
      if (!info.isLocked) {
        clearInterval(timerRef.current!);
      }
    }, 1000);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Campos Obrigatórios', 'Preencha o email e a palavra-passe.');
      return;
    }

    setIsLoading(true);

    const result = await AdminAuthService.login(email, password);
    setIsLoading(false);

    if (result.success && result.user) {
      setAdminUser(result.user);
      router.replace('/admin');
      return;
    }

    // Recarregar estado de bloqueio
    const info = await AdminAuthService.getLockoutInfo();
    setLockout(info);

    if (result.error === 'locked_out' || info.isLocked) {
      startCountdown();
      return; // O UI já mostra o bloqueio
    }

    if (result.error === 'invalid_credentials') {
      const remaining = info.maxAttempts - info.failedAttempts;
      if (remaining > 0) {
        Alert.alert(
          'Credenciais Inválidas',
          `Email ou palavra-passe incorrectos.\n\n⚠️ Restam ${remaining} tentativa${remaining !== 1 ? 's' : ''} antes do bloqueio.`
        );
      }
      return;
    }

    if (result.error === 'network_error') {
      Alert.alert('Sem Ligação', 'Não foi possível contactar o servidor. Verifica a tua conexão.');
      return;
    }

    Alert.alert('Erro', 'Ocorreu um erro inesperado. Tenta novamente.');
  };

  // ── Renderização no estado de bloqueio ──────────────────────────────────────
  if (lockout?.isLocked) {
    return (
      <View style={styles.lockedContainer}>
        <Ionicons name="lock-closed" size={72} color="#C62828" />
        <Text style={styles.lockedTitle}>Acesso Bloqueado</Text>
        <Text style={styles.lockedMessage}>
          Demasiadas tentativas falhadas.{'\n'}Tente novamente em:
        </Text>
        <View style={styles.countdownBox}>
          <Text style={styles.countdownText}>{lockout.remainingLabel}</Text>
        </View>
        <Text style={styles.lockedHint}>
          Cada novo bloqueio aumenta o tempo de espera.
        </Text>
      </View>
    );
  }

  // ── Formulário normal ───────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <View style={styles.shieldWrapper}>
            <Ionicons name="shield-checkmark" size={64} color="#1A237E" />
          </View>
          <Text style={styles.title}>Painel Administrativo</Text>
          <Text style={styles.subtitle}>Confere Angola — Acesso Restrito</Text>
        </View>

        {/* Alerta de tentativas */}
        {lockout && lockout.failedAttempts > 0 && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={18} color="#E65100" />
            <Text style={styles.warningText}>
              {lockout.failedAttempts} tentativa{lockout.failedAttempts !== 1 ? 's' : ''} falhada
              {lockout.failedAttempts !== 1 ? 's' : ''}.{' '}
              {lockout.maxAttempts - lockout.failedAttempts} restante
              {lockout.maxAttempts - lockout.failedAttempts !== 1 ? 's' : ''} antes do bloqueio.
            </Text>
          </View>
        )}

        {/* Formulário */}
        <View style={styles.form}>
          {/* Email */}
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="admin@confere.ao"
              placeholderTextColor="#AAAAAA"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
          </View>

          {/* Palavra-passe */}
          <Text style={styles.label}>Palavra-passe</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, styles.inputPassword]}
              placeholder="••••••••"
              placeholderTextColor="#AAAAAA"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />
            <Pressable onPress={() => setShowPassword(v => !v)} style={styles.eyeButton}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#666"
              />
            </Pressable>
          </View>

          {/* Botão Entrar */}
          <Pressable
            style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="log-in-outline" size={22} color="#FFFFFF" />
                <Text style={styles.loginButtonText}>Entrar</Text>
              </>
            )}
          </Pressable>

          {/* Nota de segurança */}
          <View style={styles.securityNote}>
            <Ionicons name="information-circle-outline" size={16} color="#888" />
            <Text style={styles.securityNoteText}>
              {/* Contas criadas exclusivamente via Firebase Console.{'\n'} */}
              Todas as sessões são registadas para auditoria.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: '#F5F5F5' },

  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },

  // ── Header
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  shieldWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8EAF6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1A237E',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Aviso de tentativas
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#E65100',
    lineHeight: 18,
  },

  // ── Formulário
  form: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 12,
  },
  inputIcon: { marginRight: 8 },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    color: '#333',
  },
  inputPassword: { paddingRight: 40 },
  eyeButton: {
    position: 'absolute',
    right: 12,
    padding: 4,
  },

  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A237E',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    gap: 8,
  },
  loginButtonDisabled: { backgroundColor: '#9FA8DA' },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  securityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  securityNoteText: {
    flex: 1,
    fontSize: 12,
    color: '#999',
    lineHeight: 18,
  },

  // ── Estado bloqueado
  lockedContainer: {
    flex: 1,
    backgroundColor: '#FFEBEE',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
  },
  lockedTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#C62828',
  },
  lockedMessage: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 24,
  },
  countdownBox: {
    backgroundColor: '#C62828',
    borderRadius: 12,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  countdownText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  lockedHint: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
  },
});
