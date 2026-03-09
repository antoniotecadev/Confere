/**
 * 💬 Admin — Mensagens "Fala Connosco"
 *
 * - Lista em tempo real via Firebase
 * - Filtros: Pendentes / Todas / Respondidas
 * - Abrir WhatsApp directamente com resposta pré-preenchida
 * - Marcar como respondida (manual ou automático ao abrir WhatsApp)
 */

import useUtils from '@/hooks/useUtils';
import {
  AdminMessage,
  AdminMessagesService,
  MessagesPage,
} from '@/services/AdminMessagesService';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAdmin } from './_layout';

type FilterTab = 'pending' | 'all' | 'responded';

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminMessagesScreen() {
  const { adminUser } = useAdmin();
  const { copyToClipboard } = useUtils();

  const [allMessages, setAllMessages] = useState<AdminMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('pending');
  const [processing, setProcessing] = useState<string | null>(null); // id da msg em processo

  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ── Subscrição em tempo real ────────────────────────────────────────────────
  const subscribe = useCallback(() => {
    if (unsubscribeRef.current) unsubscribeRef.current();

    unsubscribeRef.current = AdminMessagesService.subscribeToFirstPage((page: MessagesPage) => {
      // Actualiza 1.ª página em tempo real; páginas extras mantidas
      setAllMessages(prev => {
        const freshIds = new Set(page.messages.map(m => m.id));
        const kept = prev.filter(m => !freshIds.has(m.id) &&
          (page.cursor === null || (m.timestamp ?? 0) < page.cursor));
        return [...page.messages, ...kept];
      });
      setHasMore(page.hasMore);
      setCursor(page.cursor);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  }, []);

  // ── Carregar página seguinte ─────────────────────────────────────────
  const loadMore = async () => {
    if (!hasMore || isLoadingMore || cursor === null) return;
    setIsLoadingMore(true);
    const page = await AdminMessagesService.loadNextPage(cursor);
    setAllMessages(prev => [
      ...prev,
      ...page.messages.filter(nm => !prev.some(m => m.id === nm.id)),
    ]);
    setHasMore(page.hasMore);
    if (page.cursor !== null) setCursor(page.cursor);
    setIsLoadingMore(false);
  };

  useEffect(() => {
    subscribe();
    return () => { unsubscribeRef.current?.(); };
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    setAllMessages([]);
    setHasMore(false);
    setCursor(null);
    subscribe();
  };

  // ── Mensagens filtradas ────────────────────────────────────────────────────
  const displayed = activeTab === 'all'
    ? allMessages
    : allMessages.filter(m => m.status === activeTab);

  const pendingCount = AdminMessagesService.countPending(allMessages);

  // ── Abrir WhatsApp + marcar como respondida ────────────────────────────────
  const handleReply = async (msg: AdminMessage) => {
    setProcessing(msg.id);

    const opened = await AdminMessagesService.openWhatsApp(
      msg.whatsappNumber,
      msg.message,
      msg.subject,
      msg.userId
    );

    if (!opened) {
      Alert.alert(
        'WhatsApp não encontrado',
        `Não foi possível abrir o WhatsApp automaticamente.\n\nNúmero do utilizador: ${msg.whatsappNumber}`,
        [{ text: 'OK' }]
      );
      setProcessing(null);
      return;
    }

    // Auto-marcar como respondida ao abrir o WhatsApp
    if (msg.status === 'pending') {
      await AdminMessagesService.markAsResponded(
        msg,
        adminUser?.email ?? 'unknown',
        adminUser?.uid ?? 'unknown'
      );
    }

    setProcessing(null);
  };

  // ── Marcar como respondida (manual) ───────────────────────────────────────
  const handleMarkResponded = (msg: AdminMessage) => {
    Alert.alert(
      'Marcar como Respondida',
      `Confirmar que esta mensagem de ${msg.whatsappNumber} foi respondida?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            setProcessing(msg.id);
            await AdminMessagesService.markAsResponded(
              msg,
              adminUser?.email ?? 'unknown',
              adminUser?.uid ?? 'unknown'
            );
            setProcessing(null);
          },
        },
      ]
    );
  };

  // ── Render de cada card ───────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: AdminMessage }) => {
    const isPending = item.status === 'pending';
    const isProcessingThis = processing === item.id;

    const date = item.timestamp
      ? new Date(item.timestamp).toLocaleString('pt-AO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
      : '—';

    const respondedDate = item.respondedAt
      ? new Date(item.respondedAt).toLocaleString('pt-AO', {
        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
      })
      : null;

    return (
      <View style={[styles.card, !isPending && styles.cardResponded]}>
        {/* Cabeçalho */}
        <View style={styles.cardHeader}>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isPending ? '#FFF3E0' : '#E8F5E9' },
          ]}>
            <Ionicons
              name={isPending ? 'time-outline' : 'checkmark-circle'}
              size={13}
              color={isPending ? '#E65100' : '#2E7D32'}
            />
            <Text style={[
              styles.statusText,
              { color: isPending ? '#E65100' : '#2E7D32' },
            ]}>
              {isPending ? 'Pendente' : 'Respondida'}
            </Text>
          </View>
          <Text style={styles.cardDate}>{date}</Text>
        </View>

        {/* Assunto */}
        <View style={styles.subjectRow}>
          <Ionicons name="pricetag-outline" size={14} color="#6A1B9A" />
          <Text style={styles.subjectText}>
            {AdminMessagesService.formatSubject(item.subject)}
          </Text>
        </View>

        {/* WhatsApp do utilizador */}
        <Pressable onPress={() => copyToClipboard(item.whatsappNumber, 'Número do WhatsApp')}>
          <View style={styles.userRow}>
            <Ionicons name="logo-whatsapp" size={14} color="#25D366" />
            <Text style={styles.userPhone} numberOfLines={1}>{item.whatsappNumber}</Text>
            <Ionicons name="copy-outline" size={14} color="#666" />
          </View>
        </Pressable>

        {/* ID do utilizador */}
        <Pressable onPress={() => copyToClipboard(item.userId, 'ID do Utilizador')}>
          <View style={styles.userRow}>
            <Ionicons name="person-outline" size={14} color="#666" />
            <Text style={styles.userIdText} numberOfLines={1}>
              {item.userId}
            </Text>
            <Ionicons name="copy-outline" size={14} color="#666" />
          </View>
        </Pressable>

        {/* Mensagem */}
        <View style={styles.messageBox}>
          <Text style={styles.messageText} numberOfLines={4}>
            {item.message}
          </Text>
        </View>

        {/* Respondido por */}
        {respondedDate && (
          <View style={styles.respondedRow}>
            <Ionicons name="person-circle-outline" size={12} color="#999" />
            <Text style={styles.respondedText}>
              Respondida a {respondedDate} por {item.respondedBy?.split('@')[0] ?? '—'}
            </Text>
          </View>
        )}

        {/* Acções */}
        <View style={styles.actionsRow}>
          {isPending && (
            <Pressable
              style={styles.markBtn}
              onPress={() => handleMarkResponded(item)}
              disabled={!!processing}
            >
              <Ionicons name="checkmark-outline" size={16} color="#2E7D32" />
              <Text style={styles.markBtnText}>Marcar Respondida</Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.replyBtn, !isPending && styles.replyBtnFull]}
            onPress={() => handleReply(item)}
            disabled={!!processing}
          >
            {isProcessingThis ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="logo-whatsapp" size={16} color="#FFF" />
                <Text style={styles.replyBtnText}>
                  {isPending ? 'Responder' : 'Reabrir WhatsApp'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#6A1B9A" />
        <Text style={styles.loadingText}>A carregar mensagens...</Text>
      </View>
    );
  }

  // ── Ecrã principal ────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNum}>
            {allMessages.length}{hasMore ? '+' : ''}
          </Text>
          <Text style={styles.summaryLabel}>Carregadas</Text>
        </View>
        <View style={[styles.summaryItem, styles.summaryHL]}>
          <Text style={[styles.summaryNum, { color: '#FFD54F' }]}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pendentes</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNum, { color: '#A5D6A7' }]}>
            {allMessages.filter(m => m.status === 'responded').length}
          </Text>
          <Text style={styles.summaryLabel}>Respondidas</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
      >
        {(['pending', 'all', 'responded'] as FilterTab[]).map((tab) => {
          const labels: Record<FilterTab, string> = {
            pending: `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
            all: 'Todas',
            responded: 'Respondidas',
          };
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, active && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>
                {labels[tab]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Lista */}
      <FlatList
        data={displayed}
        keyExtractor={item => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#6A1B9A']} />
        }
        ListFooterComponent={
          hasMore ? (
            <Pressable
              style={styles.loadMoreBtn}
              onPress={loadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color="#6A1B9A" />
              ) : (
                <>
                  <Ionicons name="chevron-down-outline" size={16} color="#6A1B9A" />
                  <Text style={styles.loadMoreText}>Carregar Mais</Text>
                </>
              )}
            </Pressable>
          ) : (
            allMessages.length > 0 ? (
              <Text style={styles.allLoadedText}>
                ✔ Todas as {allMessages.length} mensagens carregadas
              </Text>
            ) : null
          )
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={56} color="#CFD8DC" />
            <Text style={styles.emptyTitle}>Sem mensagens</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === 'pending'
                ? 'Nenhuma mensagem pendente de resposta.'
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
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { color: '#666', fontSize: 15 },

  summaryBar: {
    flexDirection: 'row',
    backgroundColor: '#6A1B9A',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryHL: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#7B1FA2',
  },
  summaryNum: { fontSize: 22, fontWeight: 'bold', color: '#FFFFFF' },
  summaryLabel: { fontSize: 11, color: '#CE93D8', marginTop: 2 },

  tabsScroll: {
    flexGrow: 0,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabsContainer: { paddingHorizontal: 8, paddingVertical: 8, gap: 8 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  tabActive: { backgroundColor: '#6A1B9A', borderColor: '#6A1B9A' },
  tabText: { fontSize: 13, color: '#555', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

  listContent: { padding: 12, paddingBottom: 40, gap: 12 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardResponded: { opacity: 0.8 },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '700' },
  cardDate: { fontSize: 11, color: '#999' },

  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  subjectText: { fontSize: 14, fontWeight: '700', color: '#4A148C' },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
  },
  userPhone: { fontSize: 13, fontWeight: '600', color: '#333', flex: 1 },
  userId: { fontSize: 11, color: '#999', fontFamily: 'monospace' },

  messageBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#CE93D8',
  },
  messageText: { fontSize: 13, color: '#444', lineHeight: 19 },

  respondedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  respondedText: { fontSize: 11, color: '#999' },

  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  markBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  markBtnText: { color: '#2E7D32', fontWeight: '700', fontSize: 13 },

  replyBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: '#25D366',
  },
  replyBtnFull: { flex: 1 },
  replyBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#90A4AE' },
  emptySubtitle: { fontSize: 13, color: '#B0BEC5', textAlign: 'center', paddingHorizontal: 32 },
  userIdText: { fontSize: 12, color: '#555', flex: 1, fontFamily: 'monospace' },

  // Carregar mais
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 16,
    marginHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#6A1B9A',
    backgroundColor: '#FFFFFF',
  },
  loadMoreText: { fontSize: 14, fontWeight: '700', color: '#6A1B9A' },
  allLoadedText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#B0BEC5',
    paddingVertical: 16,
  },
});
