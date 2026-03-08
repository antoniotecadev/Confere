/**
 * 🛡️ Admin Layout — carregado LAZILY (só quando se navega para /admin/*)
 *
 * Protege todas as rotas filhas:
 *   - Redireciona para /admin/login se não autenticado
 *   - Mantém sessão em contexto partilhado
 */

import { AdminAuthService } from '@/services/AdminAuthService';
import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect } from 'expo-router';
import { User } from 'firebase/auth';
import React, { createContext, useCallback, useContext, useState } from 'react';
import { Pressable, Text } from 'react-native';

// ─── Contexto Admin ───────────────────────────────────────────────────────────
interface AdminContextValue {
  adminUser: User | null;
  setAdminUser: (u: User | null) => void;
  logout: () => Promise<void>;
}

const AdminContext = createContext<AdminContextValue>({
  adminUser: null,
  setAdminUser: () => {},
  logout: async () => {},
});

export const useAdmin = () => useContext(AdminContext);

// ─── Layout ───────────────────────────────────────────────────────────────────
export default function AdminLayout() {
  const [adminUser, setAdminUser] = useState<User | null>(
    AdminAuthService.getCurrentUser()
  );

  // Verificar auth sempre que o layout ganhar foco
  useFocusEffect(
    useCallback(() => {
      const user = AdminAuthService.getCurrentUser();
      if (!user) {
        router.replace('/admin/login');
      } else {
        setAdminUser(user);
      }
    }, [])
  );

  const logout = async () => {
    if (adminUser) {
      await AdminAuthService.logout(adminUser.email ?? '', adminUser.uid);
    }
    setAdminUser(null);
    router.replace('/admin/login');
  };

  return (
    <AdminContext.Provider value={{ adminUser, setAdminUser, logout }}>
      <Stack
        screenOptions={{
          headerStyle:      { backgroundColor: '#1A237E' },
          headerTintColor:  '#FFFFFF',
          headerTitleStyle: { fontWeight: 'bold', fontSize: 16 },
          headerRight: () => (
            adminUser ? (
              <Pressable
                onPress={logout}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 12 }}
              >
                <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 13 }}>Sair</Text>
              </Pressable>
            ) : null
          ),
        }}
      >
        <Stack.Screen name="login"     options={{ title: 'Admin — Acesso', headerRight: () => null }} />
        <Stack.Screen name="index"     options={{ title: '⚙️  Painel Admin' }} />
        <Stack.Screen name="users"     options={{ title: '👥  Utilizadores' }} />
        <Stack.Screen name="payments"  options={{ title: '💳  Pagamentos' }} />
        <Stack.Screen name="messages"  options={{ title: '💬  Mensagens' }} />
        <Stack.Screen name="audit"     options={{ title: '📋  Auditoria' }} />
      </Stack>
    </AdminContext.Provider>
  );
}
