/**
 * 🏠 Admin Dashboard — Painel Principal
 *
 * Acesso rápido a todos os módulos de gestão.
 * Cada módulo será construído progressivamente.
 */

import { AdminMessagesService } from '@/services/AdminMessagesService';
import { AdminPaymentsService } from '@/services/AdminPaymentsService';
import { AuditLogService } from '@/services/AuditLogService';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useAdmin } from './_layout';

// ─── Módulos do painel ────────────────────────────────────────────────────────
const MODULES = [
  {
    id: 'payments',
    title: 'Pagamentos',
    description: 'Aprovar / rejeitar comprovativos pendentes',
    icon: 'card' as const,
    color: '#1565C0',
    bg: '#E3F2FD',
    route: '/admin/payments' as const,
    badge: null as number | null, // será preenchido dinamicamente
  },
  {
    id: 'users',
    title: 'Utilizadores',
    description: 'Activar, desactivar e alterar planos',
    icon: 'people' as const,
    color: '#2E7D32',
    bg: '#E8F5E9',
    route: '/admin/users' as const,
    badge: null as number | null,
  },
  {
    id: 'messages',
    title: 'Mensagens',
    description: 'Responder ao "Fala Connosco"',
    icon: 'chatbubbles' as const,
    color: '#6A1B9A',
    bg: '#F3E5F5',
    route: '/admin/messages' as const,
    badge: null as number | null,
  },
  {
    id: 'audit',
    title: 'Auditoria',
    description: 'Histórico completo de acções dos admins',
    icon: 'document-text' as const,
    color: '#E65100',
    bg: '#FFF3E0',
    route: '/admin/audit' as const,
    badge: null as number | null,
  },
] as const;

// ─── Componente ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { adminUser, logout } = useAdmin();
  const [greeting, setGreeting]                 = useState('');
  const [pendingCount, setPendingCount]         = useState(0);
  const [pendingMessages, setPendingMessages]   = useState(0);
  const unsubscribeRef    = useRef<(() => void) | null>(null);
  const unsubMsgRef       = useRef<(() => void) | null>(null);

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Bom dia');
    else if (h < 18) setGreeting('Boa tarde');
    else setGreeting('Boa noite');

    // Registar visita ao painel
    if (adminUser) {
      AuditLogService.log({
        action: 'user_view',
        adminEmail: adminUser.email ?? '',
        adminUid: adminUser.uid,
        details: { screen: 'dashboard' },
      });
    }

    // Subscrever contagem de pagamentos pendentes em tempo real
    unsubscribeRef.current = AdminPaymentsService.subscribeToPayments((payments) => {
      setPendingCount(AdminPaymentsService.countPending(payments));
    });

    // Subscrever contagem de mensagens pendentes em tempo real
    unsubMsgRef.current = AdminMessagesService.subscribeToMessages((msgs) => {
      setPendingMessages(AdminMessagesService.countPending(msgs));
    });

    return () => {
      unsubscribeRef.current?.();
      unsubMsgRef.current?.();
    };
  }, []);

  const adminName = adminUser?.email?.split('@')[0] ?? 'Admin';

  // Badges dinâmicos por módulo
  const badges: Record<string, number | null> = {
    payments: pendingCount    > 0 ? pendingCount    : null,
    users:    null,
    messages: pendingMessages > 0 ? pendingMessages : null,
    audit:    null,
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* Boas-vindas */}
      <View style={styles.welcomeCard}>
        <View style={styles.welcomeLeft}>
          <Text style={styles.welcomeGreeting}>{greeting},</Text>
          <Text style={styles.welcomeName}>{adminName}</Text>
          <Text style={styles.welcomeEmail}>{adminUser?.email}</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarLetter}>
            {adminName.charAt(0).toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Aviso de responsabilidade */}
      <View style={styles.warningCard}>
        <Ionicons name="warning" size={18} color="#E65100" />
        <Text style={styles.warningText}>
          Todas as acções ficam registadas com o teu email e dispositivo para auditoria.
        </Text>
      </View>

      {/* Módulos */}
      <Text style={styles.sectionTitle}>Módulos de Gestão</Text>
      <View style={styles.grid}>
        {MODULES.map((mod) => {
          const badgeValue = badges[mod.id];
          return (
          <Pressable
            key={mod.id}
            style={[styles.moduleCard, { backgroundColor: mod.bg }]}
            onPress={() => router.push(mod.route as any)}
          >
            <View style={[styles.moduleIconWrapper, { backgroundColor: mod.color }]}>
              <Ionicons name={mod.icon} size={28} color="#FFFFFF" />
            </View>
            {badgeValue !== null && badgeValue > 0 && (
              <View style={styles.badgePill}>
                <Text style={styles.badgeText}>{badgeValue}</Text>
              </View>
            )}
            <Text style={[styles.moduleTitle, { color: mod.color }]}>{mod.title}</Text>
            <Text style={styles.moduleDesc}>{mod.description}</Text>
          </Pressable>
          );
        })}
      </View>

      {/* Terminar sessão */}
      <Pressable style={styles.logoutButton} onPress={logout}>
        <Ionicons name="log-out-outline" size={20} color="#C62828" />
        <Text style={styles.logoutText}>Terminar Sessão</Text>
      </Pressable>

      <Text style={styles.version}>Confere Admin • v1.0</Text>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0F2F5',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },

  // Boas-vindas
  welcomeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A237E',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    justifyContent: 'space-between',
  },
  welcomeLeft: { flex: 1 },
  welcomeGreeting: {
    fontSize: 14,
    color: '#9FA8DA',
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textTransform: 'capitalize',
  },
  welcomeEmail: {
    fontSize: 12,
    color: '#9FA8DA',
    marginTop: 2,
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#3F51B5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // Aviso
  warningCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#E65100',
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#5D4037',
    lineHeight: 18,
  },

  // Grid de módulos
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  moduleCard: {
    width: '47%',
    borderRadius: 14,
    padding: 16,
    position: 'relative',
    minHeight: 130,
  },
  moduleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  badgePill: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: '#F44336',
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: 'bold',
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  moduleDesc: {
    fontSize: 12,
    color: '#555',
    lineHeight: 16,
  },

  // Logout
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  logoutText: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
  },

  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#BDBDBD',
  },
});
