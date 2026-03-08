/**
 * 💬 Admin Messages Service
 *
 * Gestão das mensagens de "Fala Connosco" recebidas no Firebase.
 * - Subscrição em tempo real
 * - Marcar como respondida
 * - Abrir WhatsApp directamente para o número do utilizador
 */

import { database } from '@/config/firebaseConfig';
import { onValue, ref, serverTimestamp, update } from 'firebase/database';
import { Linking } from 'react-native';
import { AuditLogService } from './AuditLogService';

export interface AdminMessage {
  id: string;
  userId: string;
  whatsappNumber: string;
  message: string;
  subject: string;
  timestamp: number;
  status: 'pending' | 'responded';
  respondedAt?: number;
  respondedBy?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
export class AdminMessagesService {

  /**
   * Subscrição em tempo real de todas as mensagens.
   * Retorna função de limpeza (unsubscribe).
   */
  static subscribeToMessages(onChange: (messages: AdminMessage[]) => void): () => void {
    const contactsRef = ref(database, 'contacts');

    const unsubscribe = onValue(contactsRef, (snapshot) => {
      const messages: AdminMessage[] = [];

      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, Omit<AdminMessage, 'id'>>;
        for (const id in data) {
          messages.push({ id, ...data[id] });
        }
      }

      // Ordenar: pendentes primeiro, depois por data decrescente
      messages.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.timestamp ?? 0) - (a.timestamp ?? 0);
      });

      onChange(messages);
    });

    return unsubscribe;
  }

  /**
   * Marcar mensagem como respondida.
   */
  static async markAsResponded(
    message: AdminMessage,
    adminEmail: string,
    adminUid: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const msgRef = ref(database, `contacts/${message.id}`);
      await update(msgRef, {
        status:      'responded',
        respondedAt: serverTimestamp(),
        respondedBy: adminEmail,
      });

      AuditLogService.log({
        action:        'contact_message_respond',
        adminEmail,
        adminUid,
        targetUserId: message.userId,
        details: {
          messageId: message.id,
          subject:   message.subject,
          userPhone: message.whatsappNumber,
        },
      });

      return { success: true };
    } catch (error) {
      console.error('[AdminMessages] Erro ao marcar como respondida:', error);
      return { success: false, message: 'Não foi possível actualizar o estado.' };
    }
  }

  /**
   * Abre o WhatsApp com número e mensagem de retorno pré-preenchidos.
   * Retorna true se conseguiu abrir, false caso contrário.
   */
  static async openWhatsApp(
    userWhatsapp: string,
    originalMessage: string,
    subject: string,
    userId: string
  ): Promise<boolean> {
    try {
      // Número limpo (só dígitos)
      const phone = userWhatsapp.replace(/\D/g, '');

      const replyText =
        `Olá! Estamos a responder à sua mensagem sobre:\n` +
        `*${subject}*\n\n` +
        `ℹ️ A sua mensagem:\n_${originalMessage.slice(0, 120)}${originalMessage.length > 120 ? '...' : ''}_\n\n` +
        `— Equipa Confere 🛒`;

      const urls = [
        `https://wa.me/${phone}?text=${encodeURIComponent(replyText)}`,
        `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(replyText)}`,
        `whatsapp://send?phone=${phone}&text=${encodeURIComponent(replyText)}`,
      ];

      for (const url of urls) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('[AdminMessages] Erro ao abrir WhatsApp:', error);
      return false;
    }
  }

  /** Contagem de mensagens com status 'pending'. */
  static countPending(messages: AdminMessage[]): number {
    return messages.filter(m => m.status === 'pending').length;
  }

  /** Formata label do assunto. */
  static formatSubject(subject: string): string {
    const labels: Record<string, string> = {
      bug:      '🐛 Erro/Bug',
      premium:  '💎 Premium',
      sugestao: '💡 Sugestão',
      outro:    '💬 Outro',
    };
    return labels[subject] ?? subject;
  }
}
