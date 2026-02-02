import { database } from '@/app/config/firebaseConfig';
import { get, push, ref, serverTimestamp, set } from 'firebase/database';
import { UserService } from './UserService';

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt: number | null;
  paymentMethod: 'google' | 'multicaixa' | null;
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
  private cachedStatus: PremiumStatus | null = null;
  private lastCheck: number = 0;
  private CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se o usuário é Premium (com cache)
   */
  async isPremium(): Promise<boolean> {
    const now = Date.now();
    
    // Usar cache se ainda válido
    if (this.cachedStatus && (now - this.lastCheck) < this.CACHE_DURATION) {
      return this.cachedStatus.isPremium;
    }

    // Buscar do Firebase
    const status = await this.getPremiumStatus();
    return status.isPremium;
  }

  /**
   * Obtém status Premium completo do Firebase
   */
  async getPremiumStatus(): Promise<PremiumStatus> {
    try {
      const userId = await UserService.getUserId();
      const userRef = ref(database, `users/${userId}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        // Usuário não existe no Firebase
        const defaultStatus: PremiumStatus = {
          isPremium: false,
          expiresAt: null,
          paymentMethod: null,
        };
        this.cachedStatus = defaultStatus;
        this.lastCheck = Date.now();
        return defaultStatus;
      }

      const data = snapshot.val();
      const status: PremiumStatus = {
        isPremium: data.isPremium || false,
        expiresAt: data.expiresAt || null,
        paymentMethod: data.paymentMethod || null,
      };

      // Verificar se a assinatura expirou
      if (status.expiresAt && status.expiresAt < Date.now()) {
        status.isPremium = false;
      }

      this.cachedStatus = status;
      this.lastCheck = Date.now();
      return status;
    } catch (error) {
      console.error('Erro ao verificar status Premium:', error);
      
      // Em caso de erro, retornar false (offline gracioso)
      return {
        isPremium: false,
        expiresAt: null,
        paymentMethod: null,
      };
    }
  }

  /**
   * Envia comprovativo de pagamento Multicaixa
   */
  async submitPayment(receiptUri: string, amount: number = 1500): Promise<boolean> {
    try {
      const userId = await UserService.getUserId();
      const deviceInfo = await UserService.getDeviceInfo();

      // Criar novo pagamento na fila
      const paymentsRef = ref(database, 'payments');
      const newPaymentRef = push(paymentsRef);

      const payment: PaymentRequest = {
        userId,
        amount,
        receiptUri,
        deviceInfo,
        status: 'pending',
        createdAt: serverTimestamp(),
      };

      await set(newPaymentRef, payment);
      
      // Invalidar cache
      this.cachedStatus = null;
      
      return true;
    } catch (error) {
      console.error('Erro ao enviar pagamento:', error);
      return false;
    }
  }

  /**
   * Ativa Premium manualmente (usado pelo admin)
   */
  async activatePremium(userId: string, durationDays: number = 30): Promise<void> {
    const expiresAt = Date.now() + (durationDays * 24 * 60 * 60 * 1000);
    const deviceInfo = await UserService.getDeviceInfo();

    const userRef = ref(database, `users/${userId}`);
    await set(userRef, {
      isPremium: true,
      expiresAt,
      paymentMethod: 'multicaixa',
      deviceInfo,
      updatedAt: serverTimestamp(),
    });

    // Invalidar cache
    this.cachedStatus = null;
  }

  /**
   * Força atualização do cache
   */
  async refreshStatus(): Promise<PremiumStatus> {
    this.cachedStatus = null;
    return this.getPremiumStatus();
  }
}

export const PremiumService = new PremiumServiceClass();
