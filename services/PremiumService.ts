import { database } from '@/config/firebaseConfig';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { get, push, ref, serverTimestamp, set } from 'firebase/database';
import { Alert } from 'react-native';
import { UserService } from './UserService';

const PREMIUM_STATUS_KEY = 'confere_premium_status';
const LAST_SYNC_KEY = 'confere_premium_last_sync';

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: number | null;
  paymentMethod: 'google' | 'multicaixa' | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | null;
  lastSync: number;
}

export interface PaymentRequest {
  userId: string;
  amount: number;
  receiptUri: string;
  deviceInfo: any;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: any;
}

class PremiumServiceClass {
  /**
   * 🔥 VERIFICAÇÃO LOCAL PRIMEIRO (offline-first)
   * Verifica se o usuário é Premium sem Firebase
   */
  async isPremium(): Promise<boolean> {
    try {
      // 1. Tentar cache local (rápido, funciona offline)
      const localStatus = await this.getLocalStatus();

      if (localStatus) {
        const now = Date.now();

        // Verificar se não expirou
        if (localStatus.expiresAt && localStatus.expiresAt < now) {
          // Expirado localmente, verificar conexão antes de tentar Firebase
          const networkState = await NetInfo.fetch();
          if (!networkState.isConnected || !networkState.isInternetReachable) {
            Alert.alert('Sem Conexão', 'Não é possível verificar a expiração do Premium sem internet. Tente novamente quando estiver online.');
            console.log('[Premium] Sem conexão - não pode verificar expiração no Firebase');
            return false; // Sem internet, não pode renovar
          }
          // Tem internet, tentar Firebase
          return await this.checkAndUpdateFromFirebase();
        }

        // Status local válido
        if (localStatus.status === 'approved' && localStatus.isPremium) {
          return true;
        }
      }

      // 2. Se não tem local ou está pendente/rejeitado, verificar conexão
      const networkState = await NetInfo.fetch();
      if (!networkState.isConnected || !networkState.isInternetReachable) {
        Alert.alert('Sem Conexão', 'Não é possível verificar o status Premium sem internet. Tente novamente quando estiver online.');
        console.log('[Premium] Sem conexão - não pode verificar status no Firebase');
        return false; // Sem internet, não pode verificar
      }

      // Tem internet, tentar Firebase
      return await this.checkAndUpdateFromFirebase();
    } catch (error) {
      console.error('Erro ao verificar Premium:', error);

      // Fallback: usar status local mesmo que desatualizado
      const localStatus = await this.getLocalStatus();
      return localStatus?.isPremium || false;
    }
  }

  /**
   * 📱 Obtém status armazenado localmente (SecureStore)
   */
  private async getLocalStatus(): Promise<PremiumStatus | null> {
    try {
      const stored = await SecureStore.getItemAsync(PREMIUM_STATUS_KEY);
      if (!stored) return null;

      return JSON.parse(stored) as PremiumStatus;
    } catch (error) {
      console.error('Erro ao ler status local:', error);
      return null;
    }
  }

  /**
   * 💾 Salva status localmente (SecureStore)
   */
  private async saveLocalStatus(status: PremiumStatus): Promise<void> {
    try {
      await SecureStore.setItemAsync(PREMIUM_STATUS_KEY, JSON.stringify(status));
      await SecureStore.setItemAsync(LAST_SYNC_KEY, Date.now().toString());
    } catch (error) {
      console.error('Erro ao salvar status local:', error);
    }
  }

  /**
   * 🔄 Verifica Firebase e actualiza cache local
   */
  private async checkAndUpdateFromFirebase(): Promise<boolean> {
    try {
      const status = await this.getPremiumStatusFromFirebase();
      await this.saveLocalStatus(status);
      return status.isPremium;
    } catch (error) {
      console.error('Erro ao sincronizar com Firebase:', error);
      return false;
    }
  }

  /**
   * 🌐 Obtém status Premium APENAS do Firebase (usado internamente)
   */
  private async getPremiumStatusFromFirebase(): Promise<PremiumStatus> {
    try {
      const userId = await UserService.getUserId();
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      const now = Date.now();

      if (!snapshot.exists()) {
        // Usuário não existe no Firebase
        return {
          isPremium: false,
          expiresAt: null,
          paymentMethod: null,
          status: null,
          lastSync: now,
        };
      }

      const data = snapshot.val();

      // Determinar status baseado nos dados
      let status: PremiumStatus['status'] = null;
      let isPremium = false;

      if (data.status) {
        status = data.status;
      }

      // Verificar expiração
      if (data.expiresAt && data.expiresAt < now) {
        status = 'expired';
        isPremium = false;
      } else if (data.status === 'approved') {
        isPremium = true;
      }

      return {
        isPremium,
        expiresAt: data.expiresAt || null,
        paymentMethod: data.paymentMethod || null,
        status,
        lastSync: now,
      };
    } catch (error) {
      console.error('Erro ao verificar status Premium no Firebase:', error);
      throw error;
    }
  }

  /**
   * 📊 Obtém status Premium completo (com informações de sincronização)
   * Usado na tela PremiumScreen
   */
  async getPremiumStatus({ isOnline = false }: { isOnline: boolean | null }): Promise<PremiumStatus> {
    try {
      if (isOnline) {
        // Tentar Firebase primeiro (tela premium tem internet geralmente)
        const status = await this.getPremiumStatusFromFirebase();
        await this.saveLocalStatus(status);
        return status;
      }
      throw new Error('Offline - não pode acessar Firebase');
    } catch (error) {
      console.log('[PremiumService] Offline - usando apenas cache local');
      // Fallback para status local
      const localStatus = await this.getLocalStatus();
      return localStatus || {
        isPremium: false,
        expiresAt: null,
        paymentMethod: null,
        status: null,
        lastSync: 0,
      };
    }
  }

  /**
   * 🔄 Força sincronização com Firebase (botão manual)
   */
  async syncStatus(): Promise<PremiumStatus> {
    const status = await this.getPremiumStatusFromFirebase();
    await this.saveLocalStatus(status);
    return status;
  }

  /**
   * Verifica se o usuário tem pagamento pendente
   * ✅ OTIMIZADO: Lê apenas a pasta do próprio usuário (sem query, direto!)
   */
  async hasPendingPayment(): Promise<boolean> {
    try {
      const userId = await UserService.getUserId();

      // Lê apenas os pagamentos DESTE usuário (estrutura: payments/userId/...)
      const userPaymentsRef = ref(database, `payments/${userId}`);
      const snapshot = await get(userPaymentsRef);

      if (!snapshot.exists()) {
        return false;
      }

      const payments = snapshot.val();

      // Verificar se algum está pending
      for (const paymentId in payments) {
        const payment = payments[paymentId];
        if (payment.status === 'pending') {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Erro ao verificar pagamentos pendentes:', error);
      return false;
    }
  }

  /**
   * Envia comprovativo de pagamento Multicaixa
   */
  async submitPayment(receiptUri: string, amount: number = 1500): Promise<{ success: boolean; message?: string }> {
    try {
      const userId = await UserService.getUserId();

      // Verificar se já tem pagamento pendente
      const hasPending = await this.hasPendingPayment();
      if (hasPending) {
        return {
          success: false,
          message: 'Você já tem um pagamento pendente. Aguarde a validação antes de enviar outro.'
        };
      }

      const deviceInfo = await UserService.getDeviceInfo();

      // Criar pagamento na pasta do usuário (estrutura: payments/userId/paymentId)
      const userPaymentsRef = ref(database, `payments/${userId}`);
      const newPaymentRef = push(userPaymentsRef);

      const payment = {
        amount,
        receiptUri,
        deviceInfo,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await set(newPaymentRef, payment);

      return { success: true };
    } catch (error) {
      console.error('Erro ao enviar pagamento:', error);
      return {
        success: false,
        message: 'Erro ao enviar pagamento. Verifique sua conexão.'
      };
    }
  }

  /**
   * Ativa Premium manualmente (usado pelo admin)
   * ⚠️ Esta função é executada pelo ADMIN (outro dispositivo)
   * O USUÁRIO vai sincronizar automaticamente quando abrir o app
   */
  async activatePremium(userId: string, durationDays: number = 30): Promise<void> {
    const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    const expiryDate = new Date(expiresAt).toLocaleString('pt-AO');

    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      isPremium: true,
      status: 'approved',
      expiresAt,
      paymentMethod: 'multicaixa',
      updatedAt: serverTimestamp(),
    });

    console.log(`[Premium Admin] ✅ Usuário ${userId} ativado até: ${expiryDate}`);
    // Nota: Não sincroniza localmente porque admin está noutro dispositivo
    // O usuário vai sincronizar automaticamente quando abrir o app
  }

  /**
   * Força atualização do cache
   */
  async refreshStatus(): Promise<PremiumStatus> {
    return this.syncStatus();
  }
}

export const PremiumService = new PremiumServiceClass();
