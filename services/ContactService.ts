import { database } from '@/config/firebaseConfig';
import { push, ref } from 'firebase/database';
import { Linking } from 'react-native';
import { UserService } from './UserService';

interface ContactMessage {
  userId: string;
  whatsappNumber: string;
  message: string;
  subject: string;
  timestamp: number;
  status: 'pending' | 'responded';
}

export class ContactService {
  private static readonly MAX_MESSAGE_LENGTH = 500;
  private static readonly SUPPORT_WHATSAPP = '244932359808'; // Substitua com seu número

  /**
   * Envia mensagem de contacto para o Firebase
   */
  static async sendContactMessage(
    whatsappNumber: string,
    message: string,
    subject: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      // Validar número de WhatsApp
      if (!this.validateWhatsAppNumber(whatsappNumber)) {
        return {
          success: false,
          message: 'Número de WhatsApp inválido. Use o formato: 244912345678',
        };
      }

      // Validar mensagem
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          message: 'A mensagem não pode estar vazia.',
        };
      }

      if (message.length > this.MAX_MESSAGE_LENGTH) {
        return {
          success: false,
          message: `A mensagem não pode ter mais de ${this.MAX_MESSAGE_LENGTH} caracteres.`,
        };
      }

      // Obter ID do usuário
      const userId = await UserService.getUserId();

      // Criar objeto de contacto
      const contactData: ContactMessage = {
        userId,
        whatsappNumber: this.formatWhatsAppNumber(whatsappNumber),
        message: message.trim(),
        subject,
        timestamp: Date.now(),
        status: 'pending',
      };

      // Salvar no Firebase
      const contactsRef = ref(database, 'contacts');
      await push(contactsRef, contactData);

      return {
        success: true,
        message: 'Mensagem enviada com sucesso! Responderemos em breve.',
      };
    } catch (error) {
      console.error('Erro ao enviar mensagem de contacto:', error);
      return {
        success: false,
        message: 'Erro ao enviar mensagem. Tente novamente mais tarde.',
      };
    }
  }

  /**
   * Abre o WhatsApp com mensagem pré-preenchida
   */
  static async openWhatsAppSupport(
    userWhatsapp: string,
    message: string,
    subject: string
  ): Promise<boolean> {
    try {
      const userId = await UserService.getUserId();
      
      const whatsappMessage = `*${subject}*\n\n${message}\n\n---\n📱 Meu WhatsApp: ${userWhatsapp}\n🆔 Meu ID: ${userId}`;
      
      // Tentar múltiplos esquemas de URL para compatibilidade
      const urls = [
        `https://wa.me/${this.SUPPORT_WHATSAPP}?text=${encodeURIComponent(whatsappMessage)}`,
        `https://api.whatsapp.com/send?phone=${this.SUPPORT_WHATSAPP}&text=${encodeURIComponent(whatsappMessage)}`,
        `whatsapp://send?phone=${this.SUPPORT_WHATSAPP}&text=${encodeURIComponent(whatsappMessage)}`,
      ];
      
      // Tentar abrir cada URL até uma funcionar
      for (const url of urls) {
        try {
          const canOpen = await Linking.canOpenURL(url);
          if (canOpen) {
            await Linking.openURL(url);
            return true;
          }
        } catch (e) {
          // Continuar para o próximo URL
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao abrir WhatsApp:', error);
      return false;
    }
  }

  /**
   * Valida número de WhatsApp (formato angolano)
   */
  private static validateWhatsAppNumber(number: string): boolean {
    // Remove espaços e caracteres especiais
    const cleaned = number.replace(/[\s\-\(\)]/g, '');
    
    // Formato: 244 + 9 dígitos (9XXXXXXXX)
    const angolaMobileRegex = /^244[9][0-9]{8}$/;
    
    return angolaMobileRegex.test(cleaned);
  }

  /**
   * Formata número de WhatsApp
   */
  private static formatWhatsAppNumber(number: string): string {
    return number.replace(/[\s\-\(\)]/g, '');
  }

  /**
   * Retorna o comprimento máximo da mensagem
   */
  static getMaxMessageLength(): number {
    return this.MAX_MESSAGE_LENGTH;
  }
}
