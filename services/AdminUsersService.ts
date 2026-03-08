/**
 * 👥 Admin Users Service
 *
 * Gestão manual de utilizadores pelo painel de admin:
 * - Pesquisar por ID
 * - Ver estado de Premium e histórico de pagamentos
 * - Activar / Desactivar Premium
 * - Alterar plano (estender / forçar expiração)
 */

import { database } from '@/config/firebaseConfig';
import { get, ref, serverTimestamp, update } from 'firebase/database';
import { AuditLogService } from './AuditLogService';

export interface AdminUserData {
  userId: string;
  isPremium: boolean;
  status: 'pending' | 'approved' | 'rejected' | 'inactive' | null;
  expiresAt: number | null;
  paymentMethod: string | null;
  updatedAt: number | null;
}

export interface AdminUserPayment {
  id: string;
  amount: number;
  durationDays: number;
  receiptUri?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  rejectReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
export class AdminUsersService {

  /**
   * Busca dados de um utilizador pelo ID.
   * Retorna null se não existir.
   */
  static async getUserById(userId: string): Promise<AdminUserData | null> {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snap = await get(userRef);

      if (!snap.exists()) return null;

      const data = snap.val();
      return {
        userId,
        isPremium:     !!data.isPremium,
        status:        data.status ?? null,
        expiresAt:     data.expiresAt ?? null,
        paymentMethod: data.paymentMethod ?? null,
        updatedAt:     data.updatedAt ?? null,
      };
    } catch (error) {
      console.error('[AdminUsers] Erro ao buscar utilizador:', error);
      return null;
    }
  }

  /**
   * Busca todos os pagamentos de um utilizador específico.
   */
  static async getUserPayments(userId: string): Promise<AdminUserPayment[]> {
    try {
      const paymentsRef = ref(database, `payments/${userId}`);
      const snap = await get(paymentsRef);

      if (!snap.exists()) return [];

      const data = snap.val() as Record<string, Omit<AdminUserPayment, 'id'>>;
      const list: AdminUserPayment[] = Object.entries(data).map(([id, p]) => ({
        id,
        ...p,
      }));

      // Ordenar por data decrescente
      return list.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    } catch (error) {
      console.error('[AdminUsers] Erro ao buscar pagamentos:', error);
      return [];
    }
  }

  /**
   * Activa ou estende Premium manualmente.
   * Se já tiver Premium activo, estende a partir da data de expiração.
   */
  static async activatePremium(
    userId: string,
    durationDays: number,
    adminEmail: string,
    adminUid: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = ref(database, `users/${userId}`);
      const snap    = await get(userRef);

      const now          = Date.now();
      const currentExpiry: number = snap.exists() ? (snap.val().expiresAt ?? 0) : 0;
      const base         = currentExpiry > now ? currentExpiry : now;
      const expiresAt    = base + durationDays * 24 * 60 * 60 * 1000;

      await update(userRef, {
        isPremium:     true,
        status:        'approved',
        expiresAt,
        paymentMethod: 'admin',
        updatedAt:     serverTimestamp(),
      });

      AuditLogService.log({
        action:       'premium_activate',
        adminEmail,
        adminUid,
        targetUserId: userId,
        details: { durationDays, expiresAt, source: 'manual' },
      });

      return { success: true };
    } catch (error) {
      console.error('[AdminUsers] Erro ao activar Premium:', error);
      return { success: false, message: 'Não foi possível activar o Premium.' };
    }
  }

  /**
   * Desactiva Premium imediatamente.
   */
  static async deactivatePremium(
    userId: string,
    adminEmail: string,
    adminUid: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const userRef = ref(database, `users/${userId}`);
      await update(userRef, {
        isPremium:  false,
        status:     'inactive',
        expiresAt:  null,
        updatedAt:  serverTimestamp(),
      });

      AuditLogService.log({
        action:       'premium_deactivate',
        adminEmail,
        adminUid,
        targetUserId: userId,
        details: { source: 'manual' },
      });

      return { success: true };
    } catch (error) {
      console.error('[AdminUsers] Erro ao desactivar Premium:', error);
      return { success: false, message: 'Não foi possível desactivar o Premium.' };
    }
  }

  /** Label legível para duração. */
  static formatDuration(days: number): string {
    if (days >= 365) return '1 Ano';
    if (days >= 180) return '6 Meses';
    if (days >= 90)  return '3 Meses';
    return '30 Dias';
  }

  /** Formata data de expiração. */
  static formatExpiry(expiresAt: number | null): string {
    if (!expiresAt) return '—';
    const d = new Date(expiresAt);
    return d.toLocaleString('pt-AO', {
      day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  /** Calcula dias restantes. Negativo = expirado. */
  static daysRemaining(expiresAt: number | null): number {
    if (!expiresAt) return -1;
    return Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
  }
}
