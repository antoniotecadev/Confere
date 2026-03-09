/**
 * 💬 Admin Messages Service
 *
 * Gestão das mensagens de "Fala Connosco" recebidas no Firebase.
 * - Subscrição em tempo real
 * - Marcar como respondida
 * - Abrir WhatsApp directamente para o número do utilizador
 */

import { database } from '@/config/firebaseConfig';
import { endBefore, get, limitToLast, onValue, orderByChild, query, ref, serverTimestamp, update } from 'firebase/database';
import { Linking } from 'react-native';
import { AuditLogService } from './AuditLogService';

const PAGE_SIZE = 20;

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

export interface MessagesPage {
  messages: AdminMessage[];
  hasMore:  boolean;
  /** timestamp do registo mais antigo na página — cursor para a próxima */
  cursor:   number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
export class AdminMessagesService {

  /**
   * Subscreve a 1.ª página em tempo real (pendentes primeiro, depois mais recentes).
   * Usa orderByChild('timestamp') + limitToLast diretamente em contacts/ (nó já plano).
   * Devolve a função de cancelamento.
   */
  static subscribeToFirstPage(callback: (page: MessagesPage) => void): () => void {
    const contactsRef = ref(database, 'contacts');
    const q = query(contactsRef, orderByChild('timestamp'), limitToLast(PAGE_SIZE + 1));

    const unsubscribe = onValue(
      q,
      (snapshot) => {
        const messages: AdminMessage[] = [];

        if (snapshot.exists()) {
          snapshot.forEach((child) => {
            messages.push({ id: child.key!, ...child.val() as Omit<AdminMessage, 'id'> });
          });
        }

        // Mais recente primeiro, pendentes no topo
        messages.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return (b.timestamp ?? 0) - (a.timestamp ?? 0);
        });

        const hasMore  = messages.length > PAGE_SIZE;
        const result   = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
        const cursor   = result.length > 0 ? Math.min(...result.map(m => m.timestamp ?? 0)) : null;

        callback({ messages: result, hasMore, cursor });
      },
      (error) => {
        console.error('[AdminMessages] Firebase onValue error:', error);
        callback({ messages: [], hasMore: false, cursor: null });
      }
    );

    return unsubscribe;
  }

  /**
   * Carrega a próxima página (one-shot) a partir do cursor.
   * cursor = timestamp do registo mais antigo da página anterior.
   */
  static async loadNextPage(cursor: number): Promise<MessagesPage> {
    try {
      const contactsRef = ref(database, 'contacts');
      const q = query(
        contactsRef,
        orderByChild('timestamp'),
        endBefore(cursor),
        limitToLast(PAGE_SIZE + 1)
      );

      const snapshot = await get(q);
      if (!snapshot.exists()) return { messages: [], hasMore: false, cursor: null };

      const messages: AdminMessage[] = [];
      snapshot.forEach((child) => {
        messages.push({ id: child.key!, ...child.val() as Omit<AdminMessage, 'id'> });
      });

      messages.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return (b.timestamp ?? 0) - (a.timestamp ?? 0);
      });

      const hasMore  = messages.length > PAGE_SIZE;
      const result   = hasMore ? messages.slice(0, PAGE_SIZE) : messages;
      const newCursor = result.length > 0 ? Math.min(...result.map(m => m.timestamp ?? 0)) : null;

      return { messages: result, hasMore, cursor: newCursor };
    } catch (err) {
      console.error('[AdminMessages] Erro ao carregar mais:', err);
      return { messages: [], hasMore: false, cursor: null };
    }
  }

  /**
   * Subscrição em tempo real de todas as mensagens.
   * Mantido para compatibilidade — usa subscribeToFirstPage internamente.
   */
  static subscribeToMessages(onChange: (messages: AdminMessage[]) => void): () => void {
    return AdminMessagesService.subscribeToFirstPage(({ messages }) => onChange(messages));
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
