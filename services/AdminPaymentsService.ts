/**
 * 💳 AdminPaymentsService
 *
 * Operações do painel admin sobre pagamentos:
 * - Paginação cursor-based em payments_index (Firebase RTDB)
 * - Aprovar → activa Premium + actualiza ambos os nós + audit log
 * - Rejeitar → actualiza ambos os nós + audit log
 * - Subscrição em tempo real apenas para a 1.ª página
 */

import { database } from '@/config/firebaseConfig';
import { AuditLogService } from '@/services/AuditLogService';
import { sendPushNotification } from '@/services/NotificationService';
import { endBefore, get, limitToLast, onValue, orderByChild, query, ref, serverTimestamp, update } from 'firebase/database';

// Número de pagamentos carregados por página
const PAGE_SIZE = 20;

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
  rejectReason?: string;
  deviceInfo?: any;
}

export interface ApproveResult {
  success: boolean;
  message?: string;
}

export interface PaymentsPage {
  payments:  AdminPayment[];
  hasMore:   boolean;
  /** createdAt (timestamp) do registo mais antigo na página — usado como cursor para a próxima */
  cursor:    number | null;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────
class AdminPaymentsServiceClass {

  // ─── Paginação (payments_index) ─────────────────────────────────────────────

  /**
   * Subscreve a 1.ª página em tempo real via payments_index.
   * Sempre que novos pagamentos chegam, o callback é invocado com os últimos PAGE_SIZE.
   * Devolve a função de cancelamento.
   */
  subscribeToFirstPage(callback: (page: PaymentsPage) => void): () => void {
    const indexRef = ref(database, 'payments_index');
    const q = query(indexRef, orderByChild('createdAt'), limitToLast(PAGE_SIZE + 1));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        if (!snapshot.exists()) {
          callback({ payments: [], hasMore: false, cursor: null });
          return;
        }

        const result: AdminPayment[] = [];
        snapshot.forEach((child) => {
          const p = child.val();
          result.push({
            id:           child.key!,
            userId:       p.userId       ?? '',
            amount:       p.amount       ?? 0,
            durationDays: p.durationDays ?? 30,
            receiptUri:   p.receiptUri   ?? '',
            status:       p.status       ?? 'pending',
            createdAt:    p.createdAt    ?? 0,
            reviewedAt:   p.reviewedAt,
            reviewedBy:   p.reviewedBy,
            rejectReason: p.rejectReason,
            deviceInfo:   p.deviceInfo,
          });
        });

        // Mais recente primeiro
        result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

        const hasMore   = result.length > PAGE_SIZE;
        const payments  = hasMore ? result.slice(0, PAGE_SIZE) : result;
        const cursor    = payments.length > 0 ? payments[payments.length - 1].createdAt : null;

        callback({ payments, hasMore, cursor });
      },
      (error) => {
        console.error('[AdminPayments] Firebase onValue error:', error);
        callback({ payments: [], hasMore: false, cursor: null });
      }
    );

    return unsubscribe;
  }

  /**
   * Carrega a próxima página (one-shot) a partir do cursor.
   * cursor = createdAt do registo mais antigo da página anterior.
   */
  async loadNextPage(cursor: number): Promise<PaymentsPage> {
    try {
      const indexRef = ref(database, 'payments_index');
      const q = query(
        indexRef,
        orderByChild('createdAt'),
        endBefore(cursor),
        limitToLast(PAGE_SIZE + 1)
      );

      const snapshot = await get(q);
      if (!snapshot.exists()) return { payments: [], hasMore: false, cursor: null };

      const result: AdminPayment[] = [];
      snapshot.forEach((child) => {
        const p = child.val();
        result.push({
          id:           child.key!,
          userId:       p.userId       ?? '',
          amount:       p.amount       ?? 0,
          durationDays: p.durationDays ?? 30,
          receiptUri:   p.receiptUri   ?? '',
          status:       p.status       ?? 'pending',
          createdAt:    p.createdAt    ?? 0,
          reviewedAt:   p.reviewedAt,
          reviewedBy:   p.reviewedBy,
          rejectReason: p.rejectReason,
          deviceInfo:   p.deviceInfo,
        });
      });

      result.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

      const hasMore  = result.length > PAGE_SIZE;
      const payments = hasMore ? result.slice(0, PAGE_SIZE) : result;
      const newCursor = payments.length > 0 ? payments[payments.length - 1].createdAt : null;

      return { payments, hasMore, cursor: newCursor };
    } catch (err) {
      console.error('[AdminPayments] Erro ao carregar mais:', err);
      return { payments: [], hasMore: false, cursor: null };
    }
  }

  /**
   * Mantido para compatibilidade com o dashboard (subscription global).
   * Usa payments_index em vez de payments/ (mais leve).
   */
  subscribeToPayments(callback: (payments: AdminPayment[]) => void): () => void {
    return this.subscribeToFirstPage(({ payments }) => callback(payments));
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

      // 1. Marcar pagamento como aprovado (nó do utilizador + índice plano)
      await update(ref(database, `payments/${userId}/${paymentId}`), {
        status:     'approved',
        reviewedAt: serverTimestamp(),
        reviewedBy: adminEmail,
      });

      await update(ref(database, `payments_index/${paymentId}`), {
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

      // 4. Notificar o utilizador (se tiver token guardado)
      const pushToken: string | undefined = userSnap.exists() ? userSnap.val().pushToken : undefined;
      if (pushToken) {
        const duration = this.formatDuration(durationDays);
        await sendPushNotification(
          pushToken,
          '✅ Premium Activado!',
          `O teu pagamento de ${amount.toLocaleString('pt-AO')} Kz foi aprovado. O teu plano de ${duration} está activo até ${expiryLabel}.`,
          { screen: 'Premium' }
        );
      }

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

      // 1. Marcar pagamento como rejeitado (nó do utilizador + índice plano)
      await update(ref(database, `payments/${userId}/${paymentId}`), {
        status:       'rejected',
        reviewedAt:   serverTimestamp(),
        reviewedBy:   adminEmail,
        rejectReason: reason || 'Sem motivo especificado',
      });

      await update(ref(database, `payments_index/${paymentId}`), {
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

      // 4. Notificar o utilizador (se tiver token guardado)
      const pushToken: string | undefined = userData?.pushToken;
      if (pushToken) {
        await sendPushNotification(
          pushToken,
          '❌ Pagamento Rejeitado',
          `O teu comprovativo não foi aceite. Motivo: ${reason}. Envia um novo comprovativo válido para activar o Premium.`,
          { screen: 'Premium' }
        );
      }

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
