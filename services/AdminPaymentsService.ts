/**
 * 💳 AdminPaymentsService
 *
 * Operações do painel admin sobre pagamentos:
 * - Listar todos os pagamentos (todos os utilizadores)
 * - Aprovar → activa Premium + actualiza payment + audit log
 * - Rejeitar → actualiza payment + marca user rejected + audit log
 * - Ouvir actualizações em tempo real (onValue)
 */

import { database } from '@/config/firebaseConfig';
import { AuditLogService } from '@/services/AuditLogService';
import { get, onValue, ref, serverTimestamp, update } from 'firebase/database';

// ─── Tipos públicos ───────────────────────────────────────────────────────────
export interface AdminPayment {
  /** paymentId gerado pelo Firebase push() */
  id: string;
  /** userId do utilizador que enviou */
  userId: string;
  amount: number;
  durationDays: number;
  receiptUri: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  deviceInfo?: any;
}

export interface ApproveResult {
  success: boolean;
  message?: string;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────
class AdminPaymentsServiceClass {

  /**
   * Obtém todos os pagamentos de todos os utilizadores (one-shot).
   * Ordenados do mais recente para o mais antigo.
   */
  async getAllPayments(): Promise<AdminPayment[]> {
    const paymentsRef = ref(database, 'payments');
    const snapshot = await get(paymentsRef);

    if (!snapshot.exists()) return [];

    const result: AdminPayment[] = [];
    const allUsers = snapshot.val() as Record<string, Record<string, any>>;

    for (const userId of Object.keys(allUsers)) {
      const userPayments = allUsers[userId];
      for (const paymentId of Object.keys(userPayments)) {
        const p = userPayments[paymentId];
        result.push({
          id:          paymentId,
          userId,
          amount:      p.amount      ?? 0,
          durationDays: p.durationDays ?? 30,
          receiptUri:  p.receiptUri  ?? '',
          status:      p.status      ?? 'pending',
          createdAt:   p.createdAt   ?? 0,
          reviewedAt:  p.reviewedAt,
          reviewedBy:  p.reviewedBy,
          deviceInfo:  p.deviceInfo,
        });
      }
    }

    // Mais recente primeiro
    return result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  }

  /**
   * Subscreve actualizações em tempo real.
   * Devolve a função de cancelamento (para usar no useEffect cleanup).
   */
  subscribeToPayments(callback: (payments: AdminPayment[]) => void): () => void {
    const paymentsRef = ref(database, 'payments');

    const unsubscribe = onValue(
      paymentsRef,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback([]);
          return;
        }

        const result: AdminPayment[] = [];
        const allUsers = snapshot.val() as Record<string, Record<string, any>>;

        for (const userId of Object.keys(allUsers)) {
          const userPayments = allUsers[userId];
          if (!userPayments || typeof userPayments !== 'object') continue;
          for (const paymentId of Object.keys(userPayments)) {
            const p = userPayments[paymentId];
            result.push({
              id:           paymentId,
              userId,
              amount:       p.amount       ?? 0,
              durationDays: p.durationDays ?? 30,
              receiptUri:   p.receiptUri   ?? '',
              status:       p.status       ?? 'pending',
              createdAt:    p.createdAt    ?? 0,
              reviewedAt:   p.reviewedAt,
              reviewedBy:   p.reviewedBy,
              deviceInfo:   p.deviceInfo,
            });
          }
        }

        callback(result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0)));
      },
      (error) => {
        console.error('[AdminPayments] Firebase onValue error:', error);
        callback([]); // Desbloqueia o loading mesmo em caso de erro
      }
    );

    return unsubscribe;
  }

  /**
   * Aprova um pagamento:
   * 1. Actualiza payments/{userId}/{paymentId} → approved
   * 2. Actualiza users/{userId} → isPremium, expiresAt, status
   * 3. Regista no audit log
   */
  async approvePayment(
    payment: AdminPayment,
    adminEmail: string,
    adminUid: string
  ): Promise<ApproveResult> {
    try {
      const { userId, id: paymentId, durationDays, amount } = payment;
      const now = Date.now();
      const expiresAt = now + durationDays * 24 * 60 * 60 * 1000;

      // Obter expiração actual para extensão
      const userSnap = await get(ref(database, `users/${userId}`));
      const currentExpiry: number = userSnap.exists()
        ? (userSnap.val().expiresAt ?? 0)
        : 0;

      // Se já tem premium válido, extender a partir da data actual de expiração
      const baseTime = currentExpiry > now ? currentExpiry : now;
      const newExpiresAt = baseTime + durationDays * 24 * 60 * 60 * 1000;
      const expiryLabel = new Date(newExpiresAt).toLocaleDateString('pt-AO');

      // 1. Marcar pagamento como aprovado
      await update(ref(database, `payments/${userId}/${paymentId}`), {
        status:     'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: adminEmail,
      });

      // 2. Activar / renovar Premium do utilizador
      await update(ref(database, `users/${userId}`), {
        isPremium:     true,
        status:        'approved',
        expiresAt:     newExpiresAt,
        paymentMethod: 'multicaixa',
        updatedAt:     serverTimestamp(),
      });

      // 3. Audit log
      await AuditLogService.log({
        action:       'payment_approve',
        adminEmail,
        adminUid,
        targetUserId: userId,
        details: {
          paymentId,
          amount,
          durationDays,
          newExpiresAt,
          expiryLabel,
          extended: currentExpiry > now,
        },
      });

      return { success: true };
    } catch (err) {
      console.error('[AdminPayments] Erro ao aprovar pagamento:', err);
      return { success: false, message: 'Erro ao aprovar. Tente novamente.' };
    }
  }

  /**
   * Rejeita um pagamento:
   * 1. Actualiza payments/{userId}/{paymentId} → rejected
   * 2. Actualiza users/{userId} → status: rejected (se não tiver premium activo)
   * 3. Regista no audit log
   */
  async rejectPayment(
    payment: AdminPayment,
    reason: string,
    adminEmail: string,
    adminUid: string
  ): Promise<ApproveResult> {
    try {
      const { userId, id: paymentId, amount, durationDays } = payment;

      // 1. Marcar pagamento como rejeitado
      await update(ref(database, `payments/${userId}/${paymentId}`), {
        status:       'rejected',
        reviewedAt:   serverTimestamp(),
        reviewedBy:   adminEmail,
        rejectReason: reason || 'Sem motivo especificado',
      });

      // 2. Verificar se utilizador não tem Premium activo antes de marcar rejected
      const userSnap = await get(ref(database, `users/${userId}`));
      const userData = userSnap.exists() ? userSnap.val() : null;
      const hasActiveP = userData?.isPremium && userData?.expiresAt > Date.now();

      if (!hasActiveP) {
        await update(ref(database, `users/${userId}`), {
          status:    'rejected',
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Audit log
      await AuditLogService.log({
        action:       'payment_reject',
        adminEmail,
        adminUid,
        targetUserId: userId,
        details: { paymentId, amount, durationDays, reason },
      });

      return { success: true };
    } catch (err) {
      console.error('[AdminPayments] Erro ao rejeitar pagamento:', err);
      return { success: false, message: 'Erro ao rejeitar. Tente novamente.' };
    }
  }

  /** Conta quantos pagamentos têm status pending. */
  countPending(payments: AdminPayment[]): number {
    return payments.filter(p => p.status === 'pending').length;
  }

  /** Formata duração em texto legível. */
  formatDuration(days: number): string {
    if (days >= 365) return `${Math.round(days / 365)} Ano${days >= 730 ? 's' : ''}`;
    if (days >= 30)  return `${Math.round(days / 30)} Mes${days >= 60 ? 'es' : ''}`;
    return `${days} Dia${days !== 1 ? 's' : ''}`;
  }
}

export const AdminPaymentsService = new AdminPaymentsServiceClass();
