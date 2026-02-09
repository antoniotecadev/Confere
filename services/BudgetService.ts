import { CartsStorage } from '@/utils/carts-storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BUDGET_STORAGE_KEY = '@confere_monthly_budget';

export interface MonthlyBudget {
  amount: number; // Valor do orçamento mensal
  month: string; // Formato: "2026-02" (YYYY-MM)
  createdAt: string;
}

export interface BudgetStats {
  budget: number;
  spent: number;
  remaining: number;
  percentage: number;
  daysInMonth: number;
  daysRemaining: number;
  daysPassed: number;
  averagePerDay: number; // Média gasta por dia até agora
  suggestedDailyLimit: number; // Quanto pode gastar por dia nos dias restantes
  isOverBudget: boolean;
}

class BudgetServiceClass {
  /**
   * Definir orçamento mensal
   */
  async setMonthlyBudget(amount: number): Promise<void> {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const budget: MonthlyBudget = {
      amount,
      month,
      createdAt: now.toISOString(),
    };

    await AsyncStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budget));
  }

  /**
   * Obter orçamento mensal atual
   */
  async getMonthlyBudget(): Promise<MonthlyBudget | null> {
    try {
      const data = await AsyncStorage.getItem(BUDGET_STORAGE_KEY);
      if (!data) return null;

      const budget: MonthlyBudget = JSON.parse(data);
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      // Se o orçamento é de outro mês, retornar null
      if (budget.month !== currentMonth) {
        return null;
      }

      return budget;
    } catch (error) {
      console.error('Erro ao obter orçamento:', error);
      return null;
    }
  }

  /**
   * Calcular total gasto no mês atual
   */
  async getMonthlySpending(): Promise<number> {
    try {
      const carts = await CartsStorage.getAllCarts();
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let total = 0;

      for (const cart of carts) {
        const cartDate = new Date(cart.date);
        
        // Apenas carrinhos do mês atual
        if (cartDate.getFullYear() === currentYear && cartDate.getMonth() === currentMonth) {
          total += cart.total;
        }
      }

      return total;
    } catch (error) {
      console.error('Erro ao calcular gastos mensais:', error);
      return 0;
    }
  }

  /**
   * Obter estatísticas do orçamento
   */
  async getBudgetStats(): Promise<BudgetStats | null> {
    const budget = await this.getMonthlyBudget();
    if (!budget) return null;

    const spent = await this.getMonthlySpending();
    const remaining = budget.amount - spent;
    const percentage = (spent / budget.amount) * 100;

    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const currentDay = now.getDate();
    const daysRemaining = daysInMonth - currentDay;
    const daysPassed = currentDay;

    const averagePerDay = daysPassed > 0 ? spent / daysPassed : 0;
    const suggestedDailyLimit = daysRemaining > 0 ? remaining / daysRemaining : 0;

    return {
      budget: budget.amount,
      spent: Math.round(spent),
      remaining: Math.round(remaining),
      percentage: Math.round(percentage),
      daysInMonth,
      daysRemaining,
      daysPassed,
      averagePerDay: Math.round(averagePerDay),
      suggestedDailyLimit: Math.round(suggestedDailyLimit),
      isOverBudget: spent > budget.amount,
    };
  }

  /**
   * Verificar se deve mostrar alerta
   */
  async shouldShowAlert(): Promise<{ show: boolean; level: 'warning' | 'danger' | 'critical'; message: string } | null> {
    const stats = await this.getBudgetStats();
    if (!stats) return null;

    if (stats.isOverBudget) {
      return {
        show: true,
        level: 'critical',
        message: `⛔ Você ultrapassou seu orçamento mensal em ${Math.abs(stats.remaining).toLocaleString('pt-AO')} Kz!`,
      };
    }

    if (stats.percentage >= 90) {
      return {
        show: true,
        level: 'danger',
        message: `🚨 Atenção! Você já gastou ${stats.percentage}% do orçamento. Restam apenas ${stats.remaining.toLocaleString('pt-AO')} Kz.`,
      };
    }

    if (stats.percentage >= 80) {
      return {
        show: true,
        level: 'warning',
        message: `⚠️ Cuidado! Você já gastou ${stats.percentage}% do orçamento mensal.`,
      };
    }

    // Alerta se está no final do mês com pouco dinheiro
    if (stats.daysRemaining <= 5 && stats.suggestedDailyLimit < stats.averagePerDay * 0.5) {
      return {
        show: true,
        level: 'warning',
        message: `⏰ Faltam ${stats.daysRemaining} dias e você tem ${stats.remaining.toLocaleString('pt-AO')} Kz restantes.`,
      };
    }

    return null;
  }

  /**
   * Remover orçamento
   */
  async removeBudget(): Promise<void> {
    await AsyncStorage.removeItem(BUDGET_STORAGE_KEY);
  }

  /**
   * Calcular projeção de gastos
   */
  async getProjection(): Promise<{ projected: number; willExceed: boolean } | null> {
    const stats = await this.getBudgetStats();
    if (!stats || stats.daysPassed === 0) return null;

    const projected = stats.averagePerDay * stats.daysInMonth;
    const willExceed = projected > stats.budget;

    return {
      projected: Math.round(projected),
      willExceed,
    };
  }

  /**
   * Verificar se pode adicionar compra
   */
  async canAddPurchase(amount: number): Promise<{ allowed: boolean; reason?: string }> {
    const stats = await this.getBudgetStats();
    if (!stats) return { allowed: true }; // Sem orçamento definido, pode adicionar

    const newTotal = stats.spent + amount;

    if (newTotal > stats.budget) {
      return {
        allowed: false,
        reason: `Esta compra de ${amount.toLocaleString('pt-AO')} Kz ultrapassará seu orçamento mensal em ${(newTotal - stats.budget).toLocaleString('pt-AO')} Kz.`,
      };
    }

    return { allowed: true };
  }
}

export const BudgetService = new BudgetServiceClass();
