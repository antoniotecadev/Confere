/**
 * 📋 Admin — Auditoria
 *
 * - Histórico completo de acções dos admins em tempo real
 * - Filtro por tipo de acção
 * - Cada registo mostra: acção, admin, utilizador alvo, detalhes, data
 * - Somente leitura (imutável por design)
 */

import { database } from '@/config/firebaseConfig';
import { AuditAction } from '@/services/AuditLogService';
import { Ionicons } from '@expo/vector-icons';
import { onValue, ref } from 'firebase/database';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

interface AuditEntry {
  id: string;
  action: AuditAction;
  adminEmail: string;
  adminUid: string;
  targetUserId?: string;
  details?: Record<string, unknown>;
  clientTimestamp: number;
}

type FilterTab = 'all' | AuditAction;

const ACTION_META: Record<AuditAction, { label: string; icon: string; color: string; bg: string }> = {
  admin_login:              { label: 'Login',             icon: 'log-in-outline',        color: '#1565C0', bg: '#E3F2FD' },
  admin_login_failed:       { label: 'Login Falhado',     icon: 'alert-circle-outline',   color: '#C62828', bg: '#FFEBEE' },
  admin_logout:             { label: 'Logout',            icon: 'log-out-outline',        color: '#455A64', bg: '#ECEFF1' },
  premium_activate:         { label: 'Activar Premium',   icon: 'diamond',                color: '#2E7D32', bg: '#E8F5E9' },
  premium_deactivate:       { label: 'Desactivar Premium',icon: 'diamond-outline',        color: '#B71C1C', bg: '#FFEBEE' },
  premium_plan_change:      { label: 'Alterar Plano',     icon: 'swap-horizontal-outline',color: '#6A1B9A', bg: '#F3E5F5' },
  payment_approve:          { label: 'Aprovar Pag.',      icon: 'checkmark-circle',       color: '#2E7D32', bg: '#E8F5E9' },
  payment_reject:           { label: 'Rejeitar Pag.',     icon: 'close-circle',           color: '#C62828', bg: '#FFEBEE' },
  user_view:                { label: 'Ver Utilizador',    icon: 'eye-outline',            color: '#E65100', bg: '#FFF3E0' },
  contact_message_read:     { label: 'Ler Mensagem',      icon: 'mail-open-outline',      color: '#00695C', bg: '#E0F2F1' },
  contact_message_respond:  { label: 'Responder Msg.',    icon: 'chatbubble-outline',     color: '#00695C', bg: '#E0F2F1' },
};

const FILTER_TABS: FilterTab[] = ['all', 'payment_approve', 'payment_reject', 'premium_activate', 'premium_deactivate', 'admin_login', 'admin_login_failed'];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminAuditScreen() {
  const [allEntries, setAllEntries]   = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab]     = useState<FilterTab>('all');

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Subscrição em tempo real ──────────────────────────────────────────────
  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();

    const logsRef = ref(database, 'audit_logs');
    unsubscribeRef.current = onValue(logsRef, (snapshot) => {
      const entries: AuditEntry[] = [];

      if (snapshot.exists()) {
        const data = snapshot.val() as Record<string, Omit<AuditEntry, 'id'>>;
        for (const id in data) {
          entries.push({ id, ...data[id] });
        }
      }

      // Ordenar mais recente primeiro
      entries.sort((a, b) => (b.clientTimestamp ?? 0) - (a.clientTimestamp ?? 0));

      setAllEntries(entries);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, []);

  useEffect(() => {
    subscribe();
    return () => { unsubscribeRef.current?.(); };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    subscribe();
  };

  // ── Filtro ────────────────────────────────────────────────────────────────
  const displayed = activeTab === 'all'
    ? allEntries
    : allEntries.filter(e => e.action === activeTab);

  // ── Render de cada entrada ─────────────────────────────────────────────────
  const renderEntry = ({ item }: { item: AuditEntry }) => {
    const meta = ACTION_META[item.action] ?? {
      label: item.action,
      icon:  'document-outline',
      color: '#888',
      bg:    '#F5F5F5',
    };

    const date = item.clientTimestamp
      ? new Date(item.clientTimestamp).toLocaleString('pt-AO', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit', second: '2-digit',
        })
      : '—';

    const adminName = item.adminEmail?.split('@')[0] ?? '—';

    return (
      <View style={styles.entry}>
        {/* Ícone da acção */}
        <View style={[styles.entryIcon, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon as any} size={18} color={meta.color} />
        </View>

        {/* Conteúdo */}
        <View style={styles.entryContent}>
          <View style={styles.entryHeader}>
            <Text style={[styles.entryAction, { color: meta.color }]}>{meta.label}</Text>
            <Text style={styles.entryDate}>{date}</Text>
          </View>

          <Text style={styles.entryAdmin}>
            <Text style={styles.entryAdminLabel}>Admin: </Text>
            {adminName}
          </Text>

          {item.targetUserId && (
            <Text style={styles.entryUser} numberOfLines={1}>
              <Text style={styles.entryAdminLabel}>Utilizador: </Text>
              ...{item.targetUserId.slice(-12)}
            </Text>
          )}

          {item.details && Object.keys(item.details).length > 0 && (
            <View style={styles.detailsBox}>
              <Text style={styles.detailsText} numberOfLines={2}>
                {Object.entries(item.details)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(' · ')}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E65100" />
        <Text style={styles.loadingText}>A carregar registos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Ionicons name="shield-checkmark-outline" size={18} color="#FFCC80" />
        <Text style={styles.summaryText}>
          {allEntries.length} {allEntries.length === 1 ? 'registo' : 'registos'} de auditoria
        </Text>
        <Text style={styles.summaryNote}>Somente leitura · Imutável</Text>
      </View>

      {/* Tabs de filtro */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {FILTER_TABS.map((tab) => {
          const active = activeTab === tab;
          const label = tab === 'all'
            ? `Todos (${allEntries.length})`
            : ACTION_META[tab as AuditAction]?.label ?? tab;

          return (
            <Pressable
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#E65100']} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="document-text-outline" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>Sem registos</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'all'
                ? 'Nenhuma acção registada ainda.'
                : 'Nenhum registo para este filtro.'}
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#F0F2F5' },
  centered:    { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#666', fontSize: 15 },

  summaryBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E65100',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  summaryText:  { fontSize: 13, fontWeight: '600', color: '#FFF', flex: 1 },
  summaryNote:  { fontSize: 11, color: '#FFCC80' },

  tabsScroll: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsContainer: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabActive:     { backgroundColor: '#E65100', borderColor: '#E65100' },
  tabText:       { fontSize: 12, color: '#555', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  listContent: { padding: 12, paddingBottom: 40, gap: 8 },

  entry: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  entryContent:     { flex: 1 },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  entryAction:      { fontSize: 13, fontWeight: '700', flex: 1 },
  entryDate:        { fontSize: 10, color: '#BDBDBD', flexShrink: 0, marginLeft: 4 },
  entryAdmin:       { fontSize: 12, color: '#555', marginBottom: 2 },
  entryAdminLabel:  { fontWeight: '600', color: '#333' },
  entryUser:        { fontSize: 11, color: '#888', fontFamily: 'monospace', marginBottom: 4 },
  detailsBox: {
    backgroundColor: '#F5F5F5',
    borderRadius: 6,
    padding: 6,
    marginTop: 4,
  },
  detailsText: { fontSize: 10, color: '#888', fontFamily: 'monospace' },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle:    { fontSize: 18, fontWeight: 'bold', color: '#90A4AE' },
  emptySubtitle: { fontSize: 13, color: '#B0BEC5', textAlign: 'center', paddingHorizontal: 32 },
});
