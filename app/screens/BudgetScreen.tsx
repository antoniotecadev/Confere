import { BudgetService, BudgetStats } from '@/services/BudgetService';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function BudgetScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<BudgetStats | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  useEffect(() => {
    loadBudget();
  }, []);

  const loadBudget = async () => {
    setLoading(true);
    const budgetStats = await BudgetService.getBudgetStats();
    setStats(budgetStats);
    
    if (!budgetStats) {
      setIsEditing(true); // Se não tem orçamento, abrir formulário
    }
    
    setLoading(false);
  };

  const handleSaveBudget = async () => {
    const amount = parseFloat(budgetInput.replace(/\./g, '').replace(',', '.'));
    
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Atenção', 'Por favor, informe um valor válido maior que zero.');
      return;
    }

    await BudgetService.setMonthlyBudget(amount);
    setBudgetInput('');
    setIsEditing(false);
    await loadBudget();
    Alert.alert('✅ Sucesso', `Orçamento mensal definido: ${amount.toLocaleString('pt-AO')} Kz`);
  };

  const handleEditBudget = () => {
    if (stats) {
      setBudgetInput(stats.budget.toString());
    }
    setIsEditing(true);
  };

  const handleRemoveBudget = () => {
    Alert.alert(
      'Remover Orçamento',
      'Tem certeza que deseja remover o orçamento mensal?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            await BudgetService.removeBudget();
            await loadBudget();
          },
        },
      ]
    );
  };

  const getProgressColor = () => {
    if (!stats) return '#2196F3';
    if (stats.isOverBudget) return '#f44336';
    if (stats.percentage >= 90) return '#FF5722';
    if (stats.percentage >= 80) return '#FF9800';
    if (stats.percentage >= 60) return '#FFC107';
    return '#4CAF50';
  };

  const getStatusIcon = () => {
    if (!stats) return 'wallet-outline';
    if (stats.isOverBudget) return 'close-circle';
    if (stats.percentage >= 90) return 'warning';
    if (stats.percentage >= 80) return 'alert-circle';
    return 'checkmark-circle';
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>Orçamento Mensal</Text>
      <View style={{ width: 40 }} />
    </View>
  );

  const renderEditForm = () => (
    <View style={styles.formContainer}>
      <Ionicons name="wallet" size={64} color="#4CAF50" />
      <Text style={styles.formTitle}>
        {stats ? 'Editar Orçamento' : 'Definir Orçamento Mensal'}
      </Text>
      <Text style={styles.formSubtitle}>
        Quanto você pretende gastar este mês?
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Valor (Kz)</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          value={budgetInput}
          onChangeText={setBudgetInput}
          keyboardType="decimal-pad"
        />
      </View>

      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={handleSaveBudget}
        >
          <Text style={styles.buttonText}>Salvar</Text>
        </TouchableOpacity>
        
        {stats && (
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={() => {
              setIsEditing(false);
              setBudgetInput('');
            }}
          >
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderDashboard = () => {
    if (!stats) return null;

    return (
      <View style={styles.dashboardContainer}>
        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: getProgressColor() }]}>
          <Ionicons name={getStatusIcon()} size={48} color="#FFFFFF" />
          <Text style={styles.statusTitle}>
            {stats.isOverBudget
              ? 'Orçamento Ultrapassado!'
              : stats.percentage >= 90
              ? 'Atenção ao Limite!'
              : stats.percentage >= 80
              ? 'Cuidado!'
              : 'Dentro do Orçamento'}
          </Text>
          <Text style={styles.statusValue}>{stats.percentage}%</Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Progresso Mensal</Text>
            <Text style={styles.progressPercentage}>{stats.percentage}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBarFill,
                {
                  width: `${Math.min(stats.percentage, 100)}%`,
                  backgroundColor: getProgressColor(),
                },
              ]}
            />
          </View>
          <View style={styles.progressFooter}>
            <Text style={styles.progressText}>
              {stats.spent.toLocaleString('pt-AO')} Kz
            </Text>
            <Text style={styles.progressText}>
              {stats.budget.toLocaleString('pt-AO')} Kz
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="cash-outline" size={32} color="#4CAF50" />
            <Text style={styles.statLabel}>Orçamento</Text>
            <Text style={styles.statValue}>{stats.budget.toLocaleString('pt-AO')} Kz</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="trending-down" size={32} color="#f44336" />
            <Text style={styles.statLabel}>Gasto</Text>
            <Text style={styles.statValue}>{stats.spent.toLocaleString('pt-AO')} Kz</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="wallet-outline" size={32} color="#2196F3" />
            <Text style={styles.statLabel}>Restante</Text>
            <Text style={[styles.statValue, { color: stats.remaining < 0 ? '#f44336' : '#4CAF50' }]}>
              {stats.remaining.toLocaleString('pt-AO')} Kz
            </Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="calendar-outline" size={32} color="#FF9800" />
            <Text style={styles.statLabel}>Dias Restantes</Text>
            <Text style={styles.statValue}>{stats.daysRemaining}</Text>
          </View>
        </View>

        {/* Daily Stats */}
        <View style={styles.dailyStatsSection}>
          <Text style={styles.sectionTitle}>Estatísticas Diárias</Text>
          
          <View style={styles.dailyStatRow}>
            <View style={styles.dailyStatLeft}>
              <Ionicons name="calendar" size={20} color="#666" />
              <Text style={styles.dailyStatLabel}>Média gasta por dia</Text>
            </View>
            <Text style={styles.dailyStatValue}>
              {stats.averagePerDay.toLocaleString('pt-AO')} Kz
            </Text>
          </View>

          <View style={styles.dailyStatRow}>
            <View style={styles.dailyStatLeft}>
              <Ionicons name="trending-up" size={20} color="#4CAF50" />
              <Text style={styles.dailyStatLabel}>Pode gastar por dia</Text>
            </View>
            <Text style={[styles.dailyStatValue, { color: '#4CAF50', fontWeight: 'bold' }]}>
              {stats.suggestedDailyLimit.toLocaleString('pt-AO')} Kz
            </Text>
          </View>

          <View style={styles.tipsCard}>
            <Ionicons name="bulb" size={20} color="#2196F3" />
            <Text style={styles.tipsText}>
              {stats.suggestedDailyLimit < stats.averagePerDay
                ? `Reduza seus gastos! Você está gastando ${stats.averagePerDay.toLocaleString('pt-AO')} Kz/dia, mas deveria gastar ${stats.suggestedDailyLimit.toLocaleString('pt-AO')} Kz/dia.`
                : `Continue assim! Você pode gastar até ${stats.suggestedDailyLimit.toLocaleString('pt-AO')} Kz por dia nos próximos ${stats.daysRemaining} dias.`}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditBudget}>
            <Ionicons name="create-outline" size={20} color="#2196F3" />
            <Text style={styles.actionButtonText}>Editar Orçamento</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={handleRemoveBudget}
          >
            <Ionicons name="trash-outline" size={20} color="#f44336" />
            <Text style={[styles.actionButtonText, { color: '#f44336' }]}>
              Remover Orçamento
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        {renderHeader()}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text style={styles.loadingText}>Carregando orçamento...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isEditing ? renderEditForm() : renderDashboard()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: '#4CAF50',
    paddingTop: 50,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  // Form
  formContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  formSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#757575',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Dashboard
  dashboardContainer: {
    gap: 16,
  },
  statusCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  statusValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 8,
  },
  // Progress
  progressSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: 12,
    color: '#666',
  },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  // Daily Stats
  dailyStatsSection: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  dailyStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dailyStatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dailyStatLabel: {
    fontSize: 14,
    color: '#666',
  },
  dailyStatValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    gap: 8,
  },
  tipsText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  // Actions
  actionsSection: {
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  removeButton: {
    borderWidth: 1,
    borderColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
});
