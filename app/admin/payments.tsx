/**
 * 💳 Admin — Gestão de Pagamentos
 *
 * - Lista em tempo real via Firebase onValue
 * - Filtros: Todos / Pendentes / Aprovados / Rejeitados
 * - Aprovar com 1 toque (confirmação) → activa Premium
 * - Rejeitar com motivo obrigatório
 * - Visualização do comprovativo em ecrã completo
 * - Badge com contagem de pendentes
 */

import useUtils from '@/hooks/useUtils';
import {
    AdminPayment,
    AdminPaymentsService,
    PaymentsPage,
} from '@/services/AdminPaymentsService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from 'react-native';
import { useAdmin } from './_layout';

type FilterTab = 'all' | 'pending' | 'approved' | 'rejected';

const SCREEN_W = Dimensions.get('window').width;

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminPaymentsScreen() {
    const { adminUser } = useAdmin();
    const { copyToClipboard } = useUtils();

    const [allPayments, setAllPayments] = useState<AdminPayment[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);
    const [cursor, setCursor] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<FilterTab>('pending');
    const [loadError, setLoadError] = useState(false);

    // Ecrã de comprovativo
    const [receiptModal, setReceiptModal] = useState<string | null>(null);

    // Modal de rejeição
    const [rejectTarget, setRejectTarget] = useState<AdminPayment | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isProcessingId, setIsProcessingId] = useState<string | null>(null); // ID do pagamento a processar (aprov/rejeit)

    // Subscrição Firebase (cleanup)
    const unsubscribeRef = useRef<(() => void) | null>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Subscrição em tempo real ────────────────────────────────────────────────
    const subscribeRealtime = useCallback(() => {
        if (unsubscribeRef.current) unsubscribeRef.current();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        setLoadError(false);

        // Timeout de segurança: se passarem 10s sem resposta, mostra ecrã vazio
        timeoutRef.current = setTimeout(() => {
            if (isLoading) {
                console.warn('[AdminPayments] Timeout ao carregar — Firebase não respondeu');
                setLoadError(true);
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }, 10_000);

        unsubscribeRef.current = AdminPaymentsService.subscribeToFirstPage((page: PaymentsPage) => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            // Actualiza apenas a 1.ª página (em tempo real); páginas seguintes mantidas
            setAllPayments(prev => {
                const olderPages = prev.filter(p => !page.payments.some(np => np.id === p.id));
                // Manter itens mais antigos (carregados via loadMore) + nova 1.ª página
                const freshIds = new Set(page.payments.map(p => p.id));
                const kept = prev.filter(p => !freshIds.has(p.id) &&
                    (page.cursor === null || (p.createdAt ?? 0) < page.cursor));
                return [...page.payments, ...kept];
            });
            setHasMore(page.hasMore);
            setCursor(prev => {
                // Só actualizar cursor se ainda não tivermos páginas extras carregadas
                // (para não perder o cursor das páginas seguintes)
                return page.cursor;
            });
            setIsLoading(false);
            setIsRefreshing(false);
        });
    }, []);

    useEffect(() => {
        subscribeRealtime();
        return () => {
            unsubscribeRef.current?.();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    // ── Carregar página seguinte ──────────────────────────────────────────────
    const loadMore = async () => {
        if (!hasMore || isLoadingMore || cursor === null) return;
        setIsLoadingMore(true);
        const page = await AdminPaymentsService.loadNextPage(cursor);
        setAllPayments(prev => [
            ...prev,
            // Evitar duplicados por race-condition com a subscrição em tempo real
            ...page.payments.filter(np => !prev.some(p => p.id === np.id)),
        ]);
        setHasMore(page.hasMore);
        if (page.cursor !== null) setCursor(page.cursor);
        setIsLoadingMore(false);
    };

    const onRefresh = () => {
        setIsRefreshing(true);
        setAllPayments([]);
        setHasMore(false);
        setCursor(null);
        subscribeRealtime();
    };

    // ── Lista filtrada ──────────────────────────────────────────────────────────
    const displayed = activeTab === 'all'
        ? allPayments
        : allPayments.filter(p => p.status === activeTab);

    const pendingCount = AdminPaymentsService.countPending(allPayments);

    // ── Aprovar ─────────────────────────────────────────────────────────────────
    const handleApprove = (payment: AdminPayment) => {
        const duration = AdminPaymentsService.formatDuration(payment.durationDays);
        Alert.alert(
            '✅ Confirmar Aprovação',
            `Utilizador: ...${payment.userId.slice(-8)}\n\nPlano: ${duration}\nValor: ${payment.amount.toLocaleString('pt-AO')} Kz\n\nActivar Premium agora?`,
            [
                { text: 'Cancelar', style: 'cancel' },
                {
                    text: 'Aprovar',
                    style: 'default',
                    onPress: () => processApprove(payment),
                },
            ]
        );
    };

    const processApprove = async (payment: AdminPayment) => {
        setIsProcessingId(payment.id);
        const result = await AdminPaymentsService.approvePayment(
            payment,
            adminUser?.email ?? 'unknown',
            adminUser?.uid ?? 'unknown'
        );
        setIsProcessingId(null);

        if (result.success) {
            Alert.alert('✅ Aprovado!', `Premium activado com sucesso para o utilizador.`);
        } else {
            Alert.alert('Erro', result.message ?? 'Não foi possível aprovar.');
        }
    };

    // ── Rejeitar ────────────────────────────────────────────────────────────────
    const openRejectModal = (payment: AdminPayment) => {
        setRejectTarget(payment);
        setRejectReason('');
    };

    const processReject = async () => {
        if (!rejectTarget) return;
        if (!rejectReason.trim()) {
            Alert.alert('Motivo Obrigatório', 'Escreve o motivo da rejeição antes de continuar.');
            return;
        }

        Keyboard.dismiss();
        setIsProcessingId(rejectTarget.id);

        const result = await AdminPaymentsService.rejectPayment(
            rejectTarget,
            rejectReason.trim(),
            adminUser?.email ?? 'unknown',
            adminUser?.uid ?? 'unknown'
        );

        setIsProcessingId(null);
        setRejectTarget(null);
        setRejectReason('');

        if (result.success) {
            Alert.alert('Rejeitado', 'O pagamento foi rejeitado e o utilizador notificado.');
        } else {
            Alert.alert('Erro', result.message ?? 'Não foi possível rejeitar.');
        }
    };

    // ── Renderização de cada card ───────────────────────────────────────────────
    const renderPayment = ({ item }: { item: AdminPayment }) => {
        const isPending = item.status === 'pending';
        const isApproved = item.status === 'approved';
        const date = item.createdAt
            ? new Date(item.createdAt).toLocaleString('pt-AO', {
                day: '2-digit', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            })
            : '—';

        const reviewDate = item.reviewedAt
            ? new Date(item.reviewedAt).toLocaleString('pt-AO', {
                day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            })
            : null;

        const statusColor =
            isPending ? '#E65100' :
                isApproved ? '#2E7D32' : '#B71C1C';

        const statusBg =
            isPending ? '#FFF3E0' :
                isApproved ? '#E8F5E9' : '#FFEBEE';

        return (
            <View style={styles.card}>
                {/* Cabeçalho do card */}
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Ionicons
                            name={isPending ? 'time-outline' : isApproved ? 'checkmark-circle' : 'close-circle'}
                            size={14}
                            color={statusColor}
                        />
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>
                            {isPending ? 'Pendente' : isApproved ? 'Aprovado' : 'Rejeitado'}
                        </Text>
                    </View>
                    <Text style={styles.cardDate}>{date}</Text>
                </View>

                {/* ID do utilizador */}
                <Pressable onPress={() => copyToClipboard(item.userId, 'ID do Utilizador')}>
                    <View style={styles.userIdRow}>
                        <Ionicons name="person-outline" size={14} color="#666" />
                        <Text style={styles.userIdText} numberOfLines={1}>
                            {item.userId}
                        </Text>
                        <Ionicons name="copy-outline" size={14} color="#666" />
                    </View>
                </Pressable>

                {/* Valor e duração */}
                <View style={styles.planRow}>
                    <View style={styles.planBadge}>
                        <Ionicons name="diamond-outline" size={14} color="#1565C0" />
                        <Text style={styles.planText}>
                            {AdminPaymentsService.formatDuration(item.durationDays)}
                        </Text>
                    </View>
                    <Text style={styles.amountText}>
                        {item.amount.toLocaleString('pt-AO')} Kz
                    </Text>
                </View>

                {/* Comprovativo */}
                {item.receiptUri ? (
                    <Pressable onPress={() => setReceiptModal(item.receiptUri)} style={styles.receiptWrapper}>
                        <Image source={{ uri: item.receiptUri }} style={styles.receiptThumb} />
                        <View style={styles.receiptOverlay}>
                            <Ionicons name="expand-outline" size={20} color="#FFF" />
                            <Text style={styles.receiptOverlayText}>Ver Comprovativo</Text>
                        </View>
                    </Pressable>
                ) : (
                    <View style={styles.noReceipt}>
                        <Ionicons name="image-outline" size={20} color="#BDBDBD" />
                        <Text style={styles.noReceiptText}>Sem comprovativo</Text>
                    </View>
                )}

                {/* Revisão */}
                {reviewDate && (
                    <View style={styles.reviewRow}>
                        <Ionicons name="person-circle-outline" size={13} color="#999" />
                        <Text style={styles.reviewText}>
                            Revisto a {reviewDate} por {item.reviewedBy?.split('@')[0] ?? '—'}
                        </Text>
                    </View>
                )}

                {/* Acções (só para pending) */}
                {isPending && (
                    <View style={styles.actionsRow}>
                        <Pressable
                            style={[styles.actionBtn, styles.rejectBtn]}
                            onPress={() => openRejectModal(item)}
                            disabled={isProcessingId === item.id}
                        >
                            <Ionicons name="close-outline" size={18} color="#C62828" />
                            <Text style={styles.rejectBtnText}>Rejeitar</Text>
                        </Pressable>

                        <Pressable
                            style={[styles.actionBtn, styles.approveBtn]}
                            onPress={() => handleApprove(item)}
                            disabled={isProcessingId === item.id}
                        >
                            {isProcessingId === item.id ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-outline" size={18} color="#FFF" />
                                    <Text style={styles.approveBtnText}>Aprovar</Text>
                                </>
                            )}
                        </Pressable>
                    </View>
                )}
            </View>
        );
    };

    // ── Ecrã de loading ─────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <View style={styles.centered}>
                <ActivityIndicator size="large" color="#1A237E" />
                <Text style={styles.loadingText}>A carregar pagamentos...</Text>
            </View>
        );
    }

    // ── Ecrã de erro de ligação ──────────────────────────────────────────────────
    if (loadError) {
        return (
            <View style={styles.centered}>
                <Ionicons name="cloud-offline-outline" size={56} color="#EF9A9A" />
                <Text style={[styles.loadingText, { color: '#C62828', fontWeight: 'bold' }]}>
                    Erro de ligação
                </Text>
                <Text style={{ color: '#999', fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
                    Não foi possível ligar ao Firebase.{`\n`}Verifica as regras de segurança e a tua ligação.
                </Text>
                <Pressable
                    style={{ marginTop: 16, backgroundColor: '#1A237E', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
                    onPress={() => { setIsLoading(true); subscribeRealtime(); }}
                >
                    <Text style={{ color: '#FFF', fontWeight: '700' }}>Tentar Novamente</Text>
                </Pressable>
            </View>
        );
    }

    // ── Ecrã principal ──────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>

            {/* Summary bar */}
            <View style={styles.summaryBar}>
                <View style={styles.summaryItem}>
                    <Text style={styles.summaryNum}>
                        {allPayments.length}{hasMore ? '+' : ''}
                    </Text>
                    <Text style={styles.summaryLabel}>Carregados</Text>
                </View>
                <View style={[styles.summaryItem, styles.summaryItemHL]}>
                    <Text style={[styles.summaryNum, { color: '#E65100' }]}>{pendingCount}</Text>
                    <Text style={styles.summaryLabel}>Pendentes</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNum, { color: '#2E7D32' }]}>
                        {allPayments.filter(p => p.status === 'approved').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Aprovados</Text>
                </View>
                <View style={styles.summaryItem}>
                    <Text style={[styles.summaryNum, { color: '#B71C1C' }]}>
                        {allPayments.filter(p => p.status === 'rejected').length}
                    </Text>
                    <Text style={styles.summaryLabel}>Rejeitados</Text>
                </View>
            </View>

            {/* Tabs de filtro */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.tabsScrollView}
                contentContainerStyle={styles.tabsContainer}
            >
                {(['pending', 'all', 'approved', 'rejected'] as FilterTab[]).map((tab) => {
                    const labels: Record<FilterTab, string> = {
                        all: 'Todos',
                        pending: `Pendentes${pendingCount > 0 ? ` (${pendingCount})` : ''}`,
                        approved: 'Aprovados',
                        rejected: 'Rejeitados',
                    };
                    return (
                        <Pressable
                            key={tab}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {labels[tab]}
                            </Text>
                        </Pressable>
                    );
                })}
            </ScrollView>

            {/* Lista */}
            <FlatList
                data={displayed}
                keyExtractor={item => `${item.userId}_${item.id}`}
                renderItem={renderPayment}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={['#1A237E']} />
                }
                ListFooterComponent={
                    hasMore ? (
                        <Pressable
                            style={styles.loadMoreBtn}
                            onPress={loadMore}
                            disabled={isLoadingMore}
                        >
                            {isLoadingMore ? (
                                <ActivityIndicator size="small" color="#1A237E" />
                            ) : (
                                <>
                                    <Ionicons name="chevron-down-outline" size={16} color="#1A237E" />
                                    <Text style={styles.loadMoreText}>Carregar Mais</Text>
                                </>
                            )}
                        </Pressable>
                    ) : (
                        allPayments.length > 0 ? (
                            <Text style={styles.allLoadedText}>
                                ✔ Todos os {allPayments.length} pagamentos carregados
                            </Text>
                        ) : null
                    )
                }
                ListEmptyComponent={
                    <View style={styles.empty}>
                        <Ionicons name="receipt-outline" size={56} color="#CFD8DC" />
                        <Text style={styles.emptyTitle}>Sem pagamentos</Text>
                        <Text style={styles.emptySubtitle}>
                            {activeTab === 'pending'
                                ? 'Nenhum pagamento pendente de revisão.'
                                : 'Nenhum registo para este filtro.'}
                        </Text>
                    </View>
                }
            />

            {/* ── Modal: ver comprovativo em ecrã completo ── */}
            <Modal
                visible={!!receiptModal}
                transparent
                animationType="fade"
                onRequestClose={() => setReceiptModal(null)}
            >
                <View style={styles.receiptModalBg}>
                    <Pressable style={styles.receiptModalClose} onPress={() => setReceiptModal(null)}>
                        <Ionicons name="close-circle" size={36} color="#FFFFFF" />
                    </Pressable>
                    {receiptModal && (
                        <Image
                            source={{ uri: receiptModal }}
                            style={styles.receiptModalImage}
                            contentFit="contain"
                        />
                    )}
                </View>
            </Modal>

            {/* ── Modal: rejeitar com motivo ── */}
            <Modal
                visible={!!rejectTarget}
                transparent
                animationType="slide"
                onRequestClose={() => setRejectTarget(null)}
            >
                <KeyboardAvoidingView
                    style={styles.rejectModalOverlay}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Pressable style={StyleSheet.absoluteFill} onPress={() => setRejectTarget(null)} />
                    <View style={styles.rejectModalContent}>
                        <Text style={styles.rejectModalTitle}>Rejeitar Pagamento</Text>
                        <Text style={styles.rejectModalSub}>
                            Utilizador: ...{rejectTarget?.userId.slice(-8)}
                        </Text>

                        <Text style={styles.rejectModalLabel}>Motivo da Rejeição *</Text>
                        <TextInput
                            style={styles.rejectModalInput}
                            placeholder="Ex: Comprovativo ilegível, valor incorrecto..."
                            placeholderTextColor="#AAAAAA"
                            value={rejectReason}
                            onChangeText={setRejectReason}
                            multiline
                            numberOfLines={3}
                            textAlignVertical="top"
                            autoFocus
                        />

                        <View style={styles.rejectModalActions}>
                            <Pressable
                                style={styles.rejectModalCancel}
                                onPress={() => setRejectTarget(null)}
                            >
                                <Text style={styles.rejectModalCancelText}>Cancelar</Text>
                            </Pressable>

                            <Pressable
                                style={[
                                    styles.rejectModalConfirm,
                                    (!rejectReason.trim() || isProcessingId !== null) && styles.rejectModalConfirmDisabled,
                                ]}
                                onPress={processReject}
                                disabled={!rejectReason.trim() || isProcessingId !== null}
                            >
                                {isProcessingId === rejectTarget?.id ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.rejectModalConfirmText}>Confirmar Rejeição</Text>
                                )}
                            </Pressable>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F2F5' },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { color: '#666', fontSize: 15 },

    // Summary bar
    summaryBar: {
        flexDirection: 'row',
        backgroundColor: '#1A237E',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    summaryItem: {
        flex: 1,
        alignItems: 'center',
    },
    summaryItemHL: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#3949AB',
    },
    summaryNum: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    summaryLabel: {
        fontSize: 11,
        color: '#9FA8DA',
        marginTop: 2,
    },

    // Tabs
    tabsScrollView: {
        flexGrow: 0,
        flexShrink: 0,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    tabsContainer: {
        paddingHorizontal: 8,
        paddingVertical: 8,
        gap: 8,
        alignItems: 'center',
    },
    tab: {
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    tabActive: {
        backgroundColor: '#1A237E',
        borderColor: '#1A237E',
    },
    tabText: { fontSize: 13, color: '#555', fontWeight: '500' },
    tabTextActive: { color: '#FFFFFF', fontWeight: '700' },

    // Lista
    listContent: { padding: 12, paddingBottom: 40, gap: 12 },

    // Card
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
    statusBadgeText: { fontSize: 12, fontWeight: '700' },
    cardDate: { fontSize: 11, color: '#999' },

    // User id
    userIdRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 6,
        padding: 8,
    },
    userIdText: { fontSize: 12, color: '#555', flex: 1, fontFamily: 'monospace' },

    // Plano e valor
    planRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    planBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
    },
    planText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
    amountText: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    // Comprovativo
    receiptWrapper: {
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 10,
        position: 'relative',
        height: 160,
    },
    receiptThumb: { width: '100%', height: '100%' },
    receiptOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: 8,
    },
    receiptOverlayText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    noReceipt: {
        height: 60,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
    },
    noReceiptText: { color: '#BDBDBD', fontSize: 13 },

    // Revisão
    reviewRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 6,
    },
    reviewText: { fontSize: 11, color: '#999' },

    // Acções
    actionsRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 4,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        borderRadius: 10,
    },
    rejectBtn: { backgroundColor: '#FFEBEE', borderWidth: 1, borderColor: '#EF9A9A' },
    approveBtn: { backgroundColor: '#2E7D32' },
    rejectBtnText: { color: '#C62828', fontWeight: '700', fontSize: 14 },
    approveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },

    // Empty state
    empty: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 10,
    },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#90A4AE' },
    emptySubtitle: { fontSize: 13, color: '#B0BEC5', textAlign: 'center', paddingHorizontal: 32 },

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
        borderColor: '#1A237E',
        backgroundColor: '#FFFFFF',
    },
    loadMoreText: { fontSize: 14, fontWeight: '700', color: '#1A237E' },
    allLoadedText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#B0BEC5',
        paddingVertical: 16,
    },

    // Modal comprovativo
    receiptModalBg: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    receiptModalClose: {
        position: 'absolute',
        top: 48,
        right: 16,
        zIndex: 10,
    },
    receiptModalImage: {
        width: SCREEN_W,
        height: SCREEN_W * 1.4,
    },

    // Modal rejeição
    rejectModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    rejectModalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 36,
    },
    rejectModalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    rejectModalSub: { fontSize: 13, color: '#888', marginBottom: 16 },
    rejectModalLabel: { fontSize: 13, fontWeight: '600', color: '#333', marginBottom: 6 },
    rejectModalInput: {
        borderWidth: 1.5,
        borderColor: '#E0E0E0',
        borderRadius: 10,
        padding: 12,
        fontSize: 14,
        color: '#333',
        minHeight: 80,
        marginBottom: 20,
        backgroundColor: '#FAFAFA',
    },
    rejectModalActions: { flexDirection: 'row', gap: 10 },
    rejectModalCancel: { flex: 1, padding: 14, borderRadius: 10, backgroundColor: '#F5F5F5', alignItems: 'center' },
    rejectModalCancelText: { color: '#666', fontWeight: '600', fontSize: 14 },
    rejectModalConfirm: { flex: 2, padding: 14, borderRadius: 10, backgroundColor: '#C62828', alignItems: 'center' },
    rejectModalConfirmDisabled: { backgroundColor: '#BDBDBD' },
    rejectModalConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
