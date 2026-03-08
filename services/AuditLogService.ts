/**
 * 📋 AuditLogService
 *
 * Regista cada acção do administrador no Firebase com:
 * - Quem fez (email + uid)
 * - O quê (action)
 * - Em que utilizador (targetUserId, se aplicável)
 * - Quando (timestamp)
 * - Detalhes adicionais (antes/depois, plano, valor, etc.)
 *
 * Estrutura Firebase:
 *   audit_logs/{logId} → { adminEmail, adminUid, action, targetUserId, details, timestamp, deviceInfo }
 *
 * ⚠️  Este log é IMUTÁVEL por design: nunca se apaga nem edita no lado do admin.
 *     Qualquer tentativa de manipulação fica registada na syslog do Firebase.
 */

import { database } from '@/config/firebaseConfig';
import * as Device from 'expo-device';
import { push, ref, serverTimestamp } from 'firebase/database';

// ─── Tipos ────────────────────────────────────────────────────────────────────
export type AuditAction =
  | 'admin_login'
  | 'admin_login_failed'
  | 'admin_logout'
  | 'premium_activate'
  | 'premium_deactivate'
  | 'premium_plan_change'
  | 'payment_approve'
  | 'payment_reject'
  | 'user_view'
  | 'contact_message_read'
  | 'contact_message_respond';

export interface AuditLogEntry {
  /** Email do admin que realizou a acção */
  adminEmail: string;
  /** UID Firebase do admin (null se login falhado) */
  adminUid: string | null;
  action: AuditAction;
  /** ID do utilizador afectado (quando aplicável) */
  targetUserId?: string;
  /** Dados contextuais da acção (antes/depois, plano, motivo…) */
  details: Record<string, any>;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────
class AuditLogServiceClass {
  /**
   * Regista uma entrada de auditoria no Firebase.
   * Falha silenciosamente para nunca bloquear a operação principal.
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      const logsRef = ref(database, 'audit_logs');

      const deviceInfo = {
        brand:       Device.brand,
        modelName:   Device.modelName,
        osName:      Device.osName,
        osVersion:   Device.osVersion,
        deviceType:  Device.deviceType,
      };

      await push(logsRef, {
        ...entry,
        deviceInfo,
        timestamp: serverTimestamp(),
        // Campo extra de segurança: epoch local também (para diffs de clock)
        clientTimestamp: Date.now(),
      });
    } catch (err) {
      // Não deixar falha de log bloquear a acção principal
      console.warn('[AuditLog] Falha ao registar ação:', err);
    }
  }
}

export const AuditLogService = new AuditLogServiceClass();
