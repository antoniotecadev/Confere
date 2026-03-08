/**
 * 🔐 AdminAuthService
 *
 * Autenticação do painel de administração com:
 * - Firebase Auth (email + password)
 * - Rate limiting com bloqueio exponencial
 * - Registo de sessão e tentativas em SecureStore
 * - Sem criação de conta na app (apenas via Firebase Console)
 */

import { auth } from '@/config/firebaseConfig';
import * as SecureStore from 'expo-secure-store';
import { signInWithEmailAndPassword, signOut, User } from 'firebase/auth';

// ─── Chaves SecureStore ───────────────────────────────────────────────────────
const KEY_ATTEMPTS   = 'admin_auth_attempts';   // número de tentativas falhadas
const KEY_LOCKOUT    = 'admin_auth_lockout_until'; // timestamp de desbloqueio
const KEY_LOCK_COUNT = 'admin_auth_lock_count';    // quantas vezes foi bloqueado
const KEY_SESSION    = 'admin_auth_session';       // email do admin autenticado

// ─── Configuração de segurança ────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;

/** Durações de bloqueio em ms: 1min → 5min → 30min → 2h → 24h → 72h */
const LOCKOUT_DURATIONS_MS = [
  1 * 60 * 1000,        // 1 min
  5 * 60 * 1000,        // 5 min
  30 * 60 * 1000,       // 30 min
  2 * 60 * 60 * 1000,   // 2 h
  24 * 60 * 60 * 1000,  // 24 h
  72 * 60 * 60 * 1000,  // 72 h (máximo)
];

// ─── Tipos ────────────────────────────────────────────────────────────────────
export interface AdminLoginResult {
  success: boolean;
  user?: User;
  error?: AdminLoginError;
}

export type AdminLoginError =
  | 'invalid_credentials'
  | 'locked_out'
  | 'network_error'
  | 'unknown';

export interface LockoutInfo {
  isLocked: boolean;
  /** Milissegundos restantes até desbloqueio */
  remainingMs: number;
  /** Texto legível para mostrar ao utilizador */
  remainingLabel: string;
  failedAttempts: number;
  maxAttempts: number;
}

// ─── Serviço ──────────────────────────────────────────────────────────────────
class AdminAuthServiceClass {
  // ── Sessão em memória (evita leituras repetidas ao SecureStore) ──────────────
  private _currentUser: User | null = null;

  /**
   * Tenta fazer login com email + password.
   * Aplica rate limiting e regista o resultado.
   */
  async login(email: string, password: string): Promise<AdminLoginResult> {
    // 1. Verificar bloqueio activo
    const lockout = await this.getLockoutInfo();
    if (lockout.isLocked) {
      return { success: false, error: 'locked_out' };
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
      const user = credential.user;

      // Login bem-sucedido → limpar contadores de tentativas
      
      await this._clearAttempts();
      await this._saveSession(user.email ?? email);
      this._currentUser = user;

      // Registar no log de auditoria (import dinâmico para não criar dependência circular)
      const { AuditLogService } = await import('@/services/AuditLogService');
      await AuditLogService.log({
        action: 'admin_login',
        adminEmail: user.email ?? email,
        adminUid: user.uid,
        details: { success: true },
      });

      return { success: true, user };
    } catch (err: any) {
      const code: string = err?.code ?? '';

      if (
        code === 'auth/wrong-password' ||
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        code === 'auth/invalid-email'
      ) {
        await this._recordFailedAttempt();

        // Registar tentativa falhada
        const { AuditLogService } = await import('@/services/AuditLogService');
        await AuditLogService.log({
          action: 'admin_login_failed',
          adminEmail: email,
          adminUid: null,
          details: { reason: code },
        });

        return { success: false, error: 'invalid_credentials' };
      }

      if (
        code === 'auth/network-request-failed' ||
        code === 'auth/too-many-requests'
      ) {
        return { success: false, error: 'network_error' };
      }

      return { success: false, error: 'unknown' };
    }
  }

  /**
   * Termina a sessão do administrador.
   */
  async logout(adminEmail: string, adminUid: string): Promise<void> {
    try {
      await signOut(auth);
      await SecureStore.deleteItemAsync(KEY_SESSION);
      this._currentUser = null;

      const { AuditLogService } = await import('@/services/AuditLogService');
      await AuditLogService.log({
        action: 'admin_logout',
        adminEmail,
        adminUid,
        details: {},
      });
    } catch (err) {
      console.error('[AdminAuth] Erro ao fazer logout:', err);
    }
  }

  /**
   * Devolve o utilizador Firebase actualmente autenticado (ou null).
   */
  getCurrentUser(): User | null {
    return this._currentUser ?? auth.currentUser;
  }

  /**
   * Verifica se existe uma sessão admin activa.
   */
  async isAuthenticated(): Promise<boolean> {
    // Verificar Firebase Auth em memória
    if (auth.currentUser) {
      this._currentUser = auth.currentUser;
      return true;
    }

    // Verificar sessão guardada (persistência entre abrimentos de app)
    const session = await SecureStore.getItemAsync(KEY_SESSION);
    return !!session;
  }

  /**
   * Devolve informação sobre o estado de bloqueio actual.
   */
  async getLockoutInfo(): Promise<LockoutInfo> {
    const [attemptsRaw, lockoutUntilRaw] = await Promise.all([
      SecureStore.getItemAsync(KEY_ATTEMPTS),
      SecureStore.getItemAsync(KEY_LOCKOUT),
    ]);

    const failedAttempts = parseInt(attemptsRaw ?? '0', 10);
    const lockoutUntil   = parseInt(lockoutUntilRaw ?? '0', 10);
    const now            = Date.now();
    const remainingMs    = Math.max(0, lockoutUntil - now);
    const isLocked       = remainingMs > 0;

    return {
      isLocked,
      remainingMs,
      remainingLabel: this._formatDuration(remainingMs),
      failedAttempts,
      maxAttempts: MAX_ATTEMPTS,
    };
  }

  // ── Métodos privados ─────────────────────────────────────────────────────────

  private async _recordFailedAttempt(): Promise<void> {
    const [attemptsRaw, lockCountRaw] = await Promise.all([
      SecureStore.getItemAsync(KEY_ATTEMPTS),
      SecureStore.getItemAsync(KEY_LOCK_COUNT),
    ]);

    const attempts  = parseInt(attemptsRaw ?? '0', 10) + 1;
    const lockCount = parseInt(lockCountRaw ?? '0', 10);

    await SecureStore.setItemAsync(KEY_ATTEMPTS, attempts.toString());

    if (attempts >= MAX_ATTEMPTS) {
      // Determinar duração do bloqueio (exponencial)
      const durationIndex = Math.min(lockCount, LOCKOUT_DURATIONS_MS.length - 1);
      const duration      = LOCKOUT_DURATIONS_MS[durationIndex];
      const lockoutUntil  = Date.now() + duration;

      await Promise.all([
        SecureStore.setItemAsync(KEY_LOCKOUT, lockoutUntil.toString()),
        SecureStore.setItemAsync(KEY_LOCK_COUNT, (lockCount + 1).toString()),
        SecureStore.setItemAsync(KEY_ATTEMPTS, '0'), // reset tentativas após bloqueio
      ]);
    }
  }

  private async _clearAttempts(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(KEY_ATTEMPTS),
      SecureStore.deleteItemAsync(KEY_LOCKOUT),
      // Mantém KEY_LOCK_COUNT — o histórico de bloqueios persiste intencionalmente
    ]);
  }

  private async _saveSession(email: string): Promise<void> {
    await SecureStore.setItemAsync(KEY_SESSION, email);
  }

  /**
   * Formata milissegundos num texto legível (ex: "4 min 32 seg").
   */
  _formatDuration(ms: number): string {
    if (ms <= 0) return '';
    const totalSeconds = Math.ceil(ms / 1000);
    const seconds      = totalSeconds % 60;
    const minutes      = Math.floor(totalSeconds / 60) % 60;
    const hours        = Math.floor(totalSeconds / 3600) % 24;
    const days         = Math.floor(totalSeconds / 86400);

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}min`;
    if (minutes > 0) return `${minutes}min ${seconds}seg`;
    return `${seconds}seg`;
  }
}

export const AdminAuthService = new AdminAuthServiceClass();
