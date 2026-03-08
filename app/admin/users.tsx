/**
 * 👥 Admin — Gestão de Utilizadores
 *
 * - Pesquisa por ID de utilizador
 * - Ver estado de Premium, data de expiração, dias restantes
 * - Activar/Desactivar Premium manualmente
 * - Alterar plano com selector de duração
 * - Histórico de pagamentos do utilizador
 */

import {
    AdminUserData,
    AdminUserPayment,
    AdminUsersService,
} from '@/services/AdminUsersService';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Keyboard,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { useAdmin } from './_layout';

const PLAN_OPTIONS = [
  { label: '30 Dias',  days: 30,  price: '1.500 Kz' },
  { label: '3 Meses',  days: 90,  price: '3.900 Kz' },
  { label: '6 Meses',  days: 180, price: '7.500 Kz' },
  { label: '1 Ano',    days: 365, price: '12.000 Kz' },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function AdminUsersScreen() {
  const { adminUser } = useAdmin();

  const [searchId, setSearchId]       = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userData, setUserData]       = useState<AdminUserData | null>(null);
  const [payments, setPayments]       = useState<AdminUserPayment[]>([]);
  const [notFound, setNotFound]       = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Modal de activação / alteração de plano
  const [planModal, setPlanModal]         = useState(false);
  const [selectedDays, setSelectedDays]   = useState(30);

  // ── Pesquisar utilizador ──────────────────────────────────────────────────
  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id) return;

    Keyboard.dismiss();
    setIsSearching(true);
    setUserData(null);
    setPayments([]);
    setNotFound(false);

    const [user, userPayments] = await Promise.all([
      AdminUsersService.getUserById(id),
      AdminUsersService.getUserPayments(id),
    ]);

    setIsSearching(false);

    if (!user) {
      setNotFound(true);
      return;
    }

    setUserData(user);
    setPayments(userPayments);
  };

  // ── Activar/Estender Premium via modal ────────────────────────────────────
  const handleActivatePlan = () => {
    const plan = PLAN_OPTIONS.find(p => p.days === selectedDays)!;
    const action = userData?.isPremium ? 'Estender Premium' : 'Activar Premium';

    const detailMsg = userData?.isPremium
      ? `A expiração actual será estendida em ${plan.label}.`
      : `O Premium será activado por ${plan.label}.`;

    Alert.alert(
      action,
      `Utilizador: ...${searchId.slice(-8)}\nPlano: ${plan.label}\n\n${detailMsg}`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: action,
          onPress: async () => {
            setPlanModal(false);
            setIsProcessing(true);

            const result = await AdminUsersService.activatePremium(
              searchId.trim(),
              selectedDays,
              adminUser?.email ?? 'unknown',
              adminUser?.uid   ?? 'unknown'
            );

            setIsProcessing(false);

            if (result.success) {
              Alert.alert('✅ Sucesso', `Premium ${userData?.isPremium ? 'estendido' : 'activado'} com sucesso!`);
              handleSearch(); // refrescar dados
            } else {
              Alert.alert('Erro', result.message ?? 'Operação falhou.');
            }
          },
        },
      ]
    );
  };

  // ── Desactivar Premium ────────────────────────────────────────────────────
  const handleDeactivate = () => {
    Alert.alert(
      '⚠️ Desactivar Premium',
      `Confirmar desactivação do Premium para o utilizador ...${searchId.trim().slice(-8)}?\n\nO acesso será removido imediatamente.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desactivar',
          style: 'destructive',
          onPress: async () => {
            setIsProcessing(true);
            const result = await AdminUsersService.deactivatePremium(
              searchId.trim(),
              adminUser?.email ?? 'unknown',
              adminUser?.uid   ?? 'unknown'
            );
            setIsProcessing(false);

            if (result.success) {
              Alert.alert('Desactivado', 'Premium removido com sucesso.');
              handleSearch();
            } else {
              Alert.alert('Erro', result.message ?? 'Operação falhou.');
            }
          },
        },
      ]
    );
  };

  // ── Render de pagamento ───────────────────────────────────────────────────
  const renderPayment = ({ item }: { item: AdminUserPayment }) => {
    const statusColor = item.status === 'approved' ? '#2E7D32'
      : item.status === 'rejected' ? '#B71C1C' : '#E65100';
    const statusBg = item.status === 'approved' ? '#E8F5E9'
      : item.status === 'rejected' ? '#FFEBEE' : '#FFF3E0';
    const statusLabel = item.status === 'approved' ? 'Aprovado'
      : item.status === 'rejected' ? 'Rejeitado' : 'Pendente';

    const date = item.createdAt
      ? new Date(item.createdAt).toLocaleString('pt-AO', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
      : '—';

    return (
      <View style={styles.paymentRow}>
        <View style={[styles.paymentStatusDot, { backgroundColor: statusColor }]} />
        <View style={styles.paymentInfo}>
          <Text style={styles.paymentPlan}>
            {AdminUsersService.formatDuration(item.durationDays)} — {item.amount.toLocaleString('pt-AO')} Kz
          </Text>
          <Text style={styles.paymentDate}>{date}</Text>
          {item.rejectReason ? (
            <Text style={styles.paymentReject}>↳ {item.rejectReason}</Text>
          ) : null}
        </View>
        <View style={[styles.statusMini, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusMiniText, { color: statusColor }]}>{statusLabel}</Text>
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  const daysLeft = userData ? AdminUsersService.daysRemaining(userData.expiresAt) : null;
  const isPremiumActive = !!(userData?.isPremium && daysLeft !== null && daysLeft > 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Barra de pesquisa */}
      <View style={styles.searchCard}>
        <Text style={styles.searchLabel}>ID do Utilizador</Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Cole aqui o UUID do utilizador..."
            placeholderTextColor="#AAAAAA"
            value={searchId}
            onChangeText={setSearchId}
            onSubmitEditing={handleSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <Pressable
            style={[styles.searchBtn, !searchId.trim() && styles.searchBtnDisabled]}
            onPress={handleSearch}
            disabled={!searchId.trim() || isSearching}
          >
            {isSearching
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Ionicons name="search" size={20} color="#FFF" />
            }
          </Pressable>
        </View>
        <Text style={styles.searchHint}>
          O ID é o UUID gerado automaticamente no primeiro acesso do utilizador.
        </Text>
      </View>

      {/* Não encontrado */}
      {notFound && (
        <View style={styles.notFoundCard}>
          <Ionicons name="person-remove-outline" size={40} color="#EF9A9A" />
          <Text style={styles.notFoundText}>Utilizador não encontrado</Text>
          <Text style={styles.notFoundSub}>Verifica se o ID está correcto.</Text>
        </View>
      )}

      {/* Card do utilizador */}
      {userData && (
        <>
          <View style={styles.userCard}>
            {/* Cabeçalho */}
            <View style={styles.userCardHeader}>
              <View style={styles.userAvatarCircle}>
                <Ionicons name="person" size={28} color="#1565C0" />
              </View>
              <View style={styles.userCardInfo}>
                <Text style={styles.userIdText} numberOfLines={1} selectable>
                  {userData.userId}
                </Text>
                <View style={[
                  styles.premiumBadge,
                  { backgroundColor: isPremiumActive ? '#E8F5E9' : '#FFEBEE' },
                ]}>
                  <Ionicons
                    name={isPremiumActive ? 'diamond' : 'diamond-outline'}
                    size={14}
                    color={isPremiumActive ? '#2E7D32' : '#C62828'}
                  />
                  <Text style={[
                    styles.premiumBadgeText,
                    { color: isPremiumActive ? '#2E7D32' : '#C62828' },
                  ]}>
                    {isPremiumActive ? 'Premium Activo' : 'Sem Premium'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Detalhes */}
            {userData.expiresAt && (
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={15} color="#666" />
                <Text style={styles.detailLabel}>Expira a:</Text>
                <Text style={styles.detailValue}>
                  {AdminUsersService.formatExpiry(userData.expiresAt)}
                </Text>
              </View>
            )}

            {daysLeft !== null && userData.expiresAt && (
              <View style={styles.detailRow}>
                <Ionicons
                  name="hourglass-outline"
                  size={15}
                  color={daysLeft > 7 ? '#2E7D32' : daysLeft > 0 ? '#E65100' : '#C62828'}
                />
                <Text style={styles.detailLabel}>Dias restantes:</Text>
                <Text style={[
                  styles.detailValue,
                  { color: daysLeft > 7 ? '#2E7D32' : daysLeft > 0 ? '#E65100' : '#C62828', fontWeight: 'bold' },
                ]}>
                  {daysLeft > 0 ? `${daysLeft} dias` : 'Expirado'}
                </Text>
              </View>
            )}

            {userData.paymentMethod && (
              <View style={styles.detailRow}>
                <Ionicons name="card-outline" size={15} color="#666" />
                <Text style={styles.detailLabel}>Método:</Text>
                <Text style={styles.detailValue}>{userData.paymentMethod}</Text>
              </View>
            )}

            {/* Acções */}
            {isProcessing ? (
              <ActivityIndicator size="large" color="#1565C0" style={{ marginTop: 16 }} />
            ) : (
              <View style={styles.actionsRow}>
                {isPremiumActive && (
                  <Pressable style={styles.deactivateBtn} onPress={handleDeactivate}>
                    <Ionicons name="close-circle-outline" size={18} color="#C62828" />
                    <Text style={styles.deactivateBtnText}>Desactivar</Text>
                  </Pressable>
                )}
                <Pressable
                  style={[styles.activateBtn, isPremiumActive && styles.extendBtn]}
                  onPress={() => setPlanModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFF" />
                  <Text style={styles.activateBtnText}>
                    {isPremiumActive ? 'Estender Plano' : 'Activar Premium'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>

          {/* Histórico de pagamentos */}
          {payments.length > 0 && (
            <View style={styles.paymentsSection}>
              <Text style={styles.sectionTitle}>
                Histórico de Pagamentos ({payments.length})
              </Text>
              <FlatList
                data={payments}
                keyExtractor={p => p.id}
                renderItem={renderPayment}
                scrollEnabled={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
              />
            </View>
          )}

          {payments.length === 0 && (
            <View style={styles.noPayments}>
              <Ionicons name="receipt-outline" size={32} color="#CFD8DC" />
              <Text style={styles.noPaymentsText}>Sem pagamentos registados</Text>
            </View>
          )}
        </>
      )}

      {/* Modal de selector de plano */}
      <Modal
        visible={planModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPlanModal(false)}>
          <Pressable style={styles.modalContent} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>
              {isPremiumActive ? 'Estender Plano' : 'Activar Premium'}
            </Text>
            <Text style={styles.modalSub}>
              Selecciona a duração a {isPremiumActive ? 'adicionar' : 'activar'}:
            </Text>

            {PLAN_OPTIONS.map(opt => {
              const active = selectedDays === opt.days;
              return (
                <Pressable
                  key={opt.days}
                  style={[styles.planOption, active && styles.planOptionActive]}
                  onPress={() => setSelectedDays(opt.days)}
                >
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.planOptionText}>
                    <Text style={[styles.planOptionLabel, active && { color: '#1565C0' }]}>
                      {opt.label}
                    </Text>
                    <Text style={styles.planOptionPrice}>{opt.price}</Text>
                  </View>
                </Pressable>
              );
            })}

            <View style={styles.modalActions}>
              <Pressable style={styles.modalCancel} onPress={() => setPlanModal(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </Pressable>
              <Pressable style={styles.modalConfirm} onPress={handleActivatePlan}>
                <Ionicons name="diamond-outline" size={16} color="#FFF" />
                <Text style={styles.modalConfirmText}>Confirmar</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F2F5' },
  content:   { padding: 16, paddingBottom: 40, gap: 16 },

  // Pesquisa
  searchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  searchLabel: { fontSize: 12, fontWeight: '600', color: '#888', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  searchRow:   { flexDirection: 'row', gap: 8 },
  searchInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#FAFAFA',
    fontFamily: 'monospace',
  },
  searchBtn: {
    backgroundColor: '#2E7D32',
    borderRadius: 10,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: { backgroundColor: '#B0BEC5' },
  searchHint: { fontSize: 11, color: '#BDBDBD', marginTop: 8 },

  // Não encontrado
  notFoundCard: {
    backgroundColor: '#FFEBEE',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  notFoundText: { fontSize: 16, fontWeight: 'bold', color: '#C62828' },
  notFoundSub:  { fontSize: 13, color: '#EF9A9A' },

  // Card do utilizador
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  userCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  userAvatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E3F2FD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCardInfo: { flex: 1, gap: 6 },
  userIdText:   { fontSize: 11, color: '#666', fontFamily: 'monospace' },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  premiumBadgeText: { fontSize: 12, fontWeight: '700' },

  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  detailLabel: { fontSize: 13, color: '#888', flex: 0 },
  detailValue: { fontSize: 13, color: '#333', flex: 1 },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  deactivateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#EF9A9A',
  },
  deactivateBtnText: { color: '#C62828', fontWeight: '700', fontSize: 14 },
  activateBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#2E7D32',
  },
  extendBtn:        { backgroundColor: '#1565C0' },
  activateBtnText:  { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Pagamentos
  paymentsSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    elevation: 1,
  },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 12 },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  paymentStatusDot: { width: 10, height: 10, borderRadius: 5 },
  paymentInfo: { flex: 1 },
  paymentPlan: { fontSize: 13, fontWeight: '600', color: '#333' },
  paymentDate: { fontSize: 11, color: '#999', marginTop: 2 },
  paymentReject: { fontSize: 11, color: '#C62828', marginTop: 2 },
  statusMini: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusMiniText: { fontSize: 11, fontWeight: '700' },
  separator: { height: 1, backgroundColor: '#F5F5F5' },

  noPayments: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  noPaymentsText: { fontSize: 13, color: '#B0BEC5' },

  // Modal plano
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 36,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  modalSub:   { fontSize: 13, color: '#888', marginBottom: 16 },

  planOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    marginBottom: 8,
  },
  planOptionActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#CCC',
    alignItems: 'center', justifyContent: 'center',
  },
  radioActive: { borderColor: '#1565C0' },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: '#1565C0',
  },
  planOptionText:  { flex: 1 },
  planOptionLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  planOptionPrice: { fontSize: 12, color: '#888', marginTop: 2 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  modalCancel: {
    flex: 1,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalCancelText:  { color: '#666', fontWeight: '600', fontSize: 14 },
  modalConfirm: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    borderRadius: 10,
    backgroundColor: '#1565C0',
  },
  modalConfirmText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
});
