import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface PremiumBlockModalProps {
  visible: boolean;
  onClose: () => void;
  status?: 'pending' | 'approved' | 'rejected' | 'expired' | null;
  expiresAt?: number | null;
}

/**
 * 🚫 Modal amigável que informa o usuário sobre bloqueio Premium
 * 
 * Estados:
 * - pending: Pagamento em análise (aguarde 24-48h)
 * - rejected: Pagamento recusado (tente novamente)
 * - expired: Assinatura expirou (renove)
 * - null: Não possui Premium (assine agora)
 */
export function PremiumBlockModal({ visible, onClose, status, expiresAt }: PremiumBlockModalProps) {
  const handleGoToPremium = () => {
    onClose();
    router.push('/screens/PremiumScreen' as any);
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('pt-AO', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getDaysAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'hoje';
    if (days === 1) return 'ontem';
    return `há ${days} dias`;
  };

  const getModalContent = () => {
    switch (status) {
      case 'pending':
        return {
          icon: 'time-outline' as const,
          iconColor: '#FFA000',
          title: 'Pagamento em Análise',
          message: `📋 Status: Pendente\n\nEstamos a verificar o teu pagamento. Este processo geralmente demora 24-48 horas.\n\n⏰ O que fazer agora?\n• Aguarda a nossa validação\n• Vais receber uma notificação quando for aprovado\n• Podes verificar o estado a qualquer momento\n\n💡 Dica: Certifica-te que enviaste o comprovativo correto com o valor de 1.500,00 Kz.`,
          buttonText: 'Ver Estado do Pagamento',
          showCloseButton: true,
        };
      
      case 'rejected':
        return {
          icon: 'close-circle-outline' as const,
          iconColor: '#E53935',
          title: 'Pagamento Recusado',
          message: `❌ Status: Rejeitado\n\nInfelizmente o teu pagamento não foi aprovado.\n\n🔍 Possíveis motivos:\n• Valor incorreto (deve ser 1.500,00 Kz)\n• Comprovativo ilegível ou incompleto\n• Dados bancários não correspondem\n• Comprovativo já usado anteriormente\n\n✅ Próximos passos:\n1. Verifica o valor e dados bancários\n2. Tira uma foto clara do comprovativo\n3. Envia novamente na tela Premium\n\nSe precisares de ajuda, contacta o suporte.`,
          buttonText: 'Tentar Novamente',
          showCloseButton: true,
        };
      
      case 'expired':
        const expiredMessage = expiresAt 
          ? `⏰ Status: Expirado\n\nA tua assinatura Premium expirou ${getDaysAgo(expiresAt)}.\n\n📅 Data de expiração:\n${formatDate(expiresAt)}\n\n🚫 O que perdeste:\n• Acesso a carrinhos ilimitados\n• Comparações de preços\n• Estatísticas detalhadas\n• Alertas de preço\n• E muito mais...\n\n✅ Renova agora para recuperar todos os benefícios!`
          : `⏰ Status: Expirado\n\nA tua assinatura Premium expirou.\n\nRenova agora para continuar a usar todas as funcionalidades exclusivas!`;
        return {
          icon: 'alert-circle-outline' as const,
          iconColor: '#FF6F00',
          title: 'Assinatura Expirou',
          message: expiredMessage,
          buttonText: 'Renovar Agora',
          showCloseButton: true,
        };
      
      default:
        return {
          icon: 'star-outline' as const,
          iconColor: '#FFB300',
          title: 'Funcionalidade Premium',
          message: `⭐ Status: Não Subscrito\n\nEsta funcionalidade é exclusiva para membros Premium.\n\n🎁 Com Premium tens acesso a:\n• Carrinhos de compras ilimitados\n• Comparação de preços em tempo real\n• Alertas quando os preços sobem\n• Histórico e estatísticas detalhadas\n• Backup automático na nuvem\n• E muito mais...\n\n💰 Apenas 1.500,00 Kz/mês\n\nAssina agora e transforma a tua experiência de compras!`,
          buttonText: 'Ver Planos Premium',
          showCloseButton: true,
        };
    }
  };

  const content = getModalContent();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modal}>
          {/* Ícone */}
          <View style={[styles.iconContainer, { backgroundColor: content.iconColor + '15' }]}>
            <Ionicons name={content.icon} size={56} color={content.iconColor} />
          </View>

          {/* Título */}
          <Text style={styles.title}>{content.title}</Text>

          {/* Mensagem */}
          <Text style={styles.message}>{content.message}</Text>

          {/* Botão Principal */}
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: content.iconColor }]}
            onPress={handleGoToPremium}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryButtonText}>{content.buttonText}</Text>
          </TouchableOpacity>

          {/* Botão Fechar (opcional) */}
          {content.showCloseButton && (
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.6}
            >
              <Text style={styles.closeButtonText}>Fechar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'left',
    lineHeight: 20,
    marginBottom: 24,
    maxHeight: 400,
  },
  primaryButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#94A3B8',
  },
});
