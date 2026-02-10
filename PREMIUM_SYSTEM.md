# 🛡️ Sistema Premium Offline-First - Documentação Completa

## 📋 Visão Geral

Sistema de verificação Premium com arquitetura **offline-first** que permite:
- ✅ Uso offline após verificação inicial
- ✅ Validação local com timestamp criptografado
- ✅ Migração de dispositivos via código de 6 dígitos
- ✅ Sincronização com Firebase quando online
- ✅ Modais amigáveis para todos os estados
- ✅ Proteção contra fraude e manipulação

---

## 🏗️ Arquitetura

### Fluxo de Verificação

```
┌─────────────────────────────────────────────────────────────┐
│                   Usuário tenta acessar feature Premium      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
         ┌─────────────────────────────┐
         │  usePremiumGuard() Hook     │
         └──────────┬──────────────────┘
                    │
                    ▼
      ┌─────────────────────────────┐
      │ 1. Verifica SecureStore     │ ◄─── OFFLINE-FIRST
      │    (cache local criptado)   │
      └──────────┬──────────────────┘
                 │
                 ▼
         ┌───────────────┐
         │ Expirado?     │
         └───┬───────┬───┘
             │       │
        NÃO  │       │ SIM
             │       │
             ▼       ▼
      ┌──────────┐  ┌──────────────────┐
      │ APROVADO │  │ 2. Tenta Firebase│ ◄─── FALLBACK
      └────┬─────┘  └────┬─────────────┘
           │             │
           │             ▼
           │      ┌────────────────┐
           │      │ Sucesso?       │
           │      └───┬────────┬───┘
           │          │        │
           │     SIM  │        │ NÃO
           │          │        │
           │          ▼        ▼
           │   ┌──────────┐  ┌────────────────┐
           │   │ Atualiza │  │ Usa cache local│
           │   │  local   │  │   (degradado)  │
           │   └────┬─────┘  └────┬───────────┘
           │        │             │
           └────────┴─────────────┘
                    │
                    ▼
           ┌────────────────┐
           │ hasAccess?     │
           └───┬────────┬───┘
               │        │
          SIM  │        │ NÃO
               │        │
               ▼        ▼
      ┌────────────┐  ┌──────────────────┐
      │ Libera     │  │ PremiumBlockModal│
      │ Acesso     │  │ (pending/expired)│
      └────────────┘  └──────────────────┘
```

---

## 🔐 Componentes do Sistema

### 1. **expo-secure-store** (Armazenamento Criptografado)

**Local:**
- iOS: Keychain
- Android: EncryptedSharedPreferences

**Dados armazenados:**
```typescript
{
  isPremium: boolean;
  expiresAt: number | null;     // timestamp de expiração
  paymentMethod: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | null;
  lastSync: number;              // timestamp da última sincronização
}
```

**Chaves:**
- `confere_premium_status`: Status Premium completo
- `confere_last_sync`: Timestamp da última sincronização
- `confere_transfer_code`: Código de migração (6 dígitos)

---

### 2. **PremiumService** (Lógica de Negócio)

**Métodos Principais:**

#### `isPremium(): Promise<boolean>`
- **Objetivo:** Verificar se usuário tem Premium ativo
- **Fluxo:**
  1. Lê status local (SecureStore)
  2. Verifica expiração
  3. Se expirado/inválido → tenta Firebase
  4. Retorna true/false

#### `getPremiumStatus(): Promise<PremiumStatus>`
- **Objetivo:** Obter status completo com detalhes
- **Uso:** Tela PremiumScreen
- **Retorna:** Status + expiração + método + lastSync

#### `syncStatus(): Promise<PremiumStatus>`
- **Objetivo:** Forçar sincronização com Firebase
- **Uso:** Botão "Sincronizar Estado"
- **Ações:**
  1. Consulta Firebase
  2. Atualiza SecureStore
  3. Retorna novo status

#### `submitPayment(receiptUri, amount): Promise<{success, message}>`
- **Objetivo:** Enviar comprovativo para análise
- **Ações:**
  1. Upload do comprovativo
  2. Cria registro em `payments/{userId}`
  3. Status inicial: `pending`

---

### 3. **UserService** (Identificação de Dispositivo)

**Métodos Principais:**

#### `getDeviceId(): Promise<string>`
- **Android:** `Device.osBuildId` (hardware ID)
- **iOS:** UUID persistente em SecureStore
- **Fallback:** UUID aleatório
- **Importante:** Mesmo ID após reinstalação (Android)

#### `generateTransferCode(): Promise<string>`
- **Gera:** Código de 6 dígitos aleatório
- **Armazena:** SecureStore (criptografado)
- **Validade:** 10 minutos (validação via Firebase)

#### `validateTransferCode(code): Promise<boolean>`
- **Verifica:** Código contra valor armazenado
- **Uso:** Migração de dispositivo

---

### 4. **usePremiumGuard()** (Hook de Proteção)

**Retorno:**
```typescript
{
  hasAccess: boolean;        // true = libera acesso
  loading: boolean;          // true = verificando
  status: 'pending' | 'approved' | 'rejected' | 'expired' | null;
  showBlockModal: boolean;   // true = mostrar modal
  closeModal: () => void;
  retry: () => void;         // tentar novamente
}
```

**Uso:**
```typescript
const { hasAccess, loading, showBlockModal, closeModal, status } = usePremiumGuard();

if (loading) return <LoadingSpinner />;
if (!hasAccess) return <PremiumBlockModal visible={showBlockModal} onClose={closeModal} status={status} />;

return <PremiumFeature />;
```

---

### 5. **PremiumBlockModal** (UI de Bloqueio)

**Estados:**

| Status      | Ícone   | Cor      | Mensagem                                                      | Ação                       |
|-------------|---------|----------|---------------------------------------------------------------|----------------------------|
| `pending`   | ⏱️      | Laranja  | "Pagamento em análise. Aguarde 24-48h."                      | Ver Estado do Pagamento    |
| `rejected`  | ❌      | Vermelho | "Pagamento recusado. Verifique os dados."                    | Tentar Novamente           |
| `expired`   | ⚠️      | Laranja  | "Assinatura expirou. Renove para continuar."                 | Renovar Agora              |
| `null`      | ⭐      | Dourado  | "Funcionalidade exclusiva Premium. Assine agora!"            | Ver Planos Premium         |

---

### 6. **TransferCodeScreen** (Migração de Dispositivo)

**Modos:**

#### Gerar Código (Dispositivo Antigo)
1. Usuário clica "Gerar Código"
2. Sistema gera 6 dígitos aleatórios
3. Armazena em SecureStore criptografado
4. Exibe código grande na tela
5. Validade: 10 minutos

#### Inserir Código (Dispositivo Novo)
1. Usuário instala app no novo dispositivo
2. Vai para tela de transferência
3. Insere código de 6 dígitos
4. Sistema valida via Firebase
5. Se válido: transfere Premium (remove do antigo)
6. Sincroniza status localmente

**Fluxo Completo:**
```
Dispositivo A (antigo)              Dispositivo B (novo)
─────────────────────              ────────────────────
1. Gera código: 123456
2. Armazena: SecureStore
3. Envia: Firebase                  4. Recebe código do usuário
                                    5. Valida: Firebase
                                    6. Se OK: sincStatus()
                                    7. Premium ativo!
```

---

## 🔒 Segurança

### Proteção Contra Fraude

1. **Armazenamento Criptografado**
   - iOS: Keychain (hardware-backed)
   - Android: EncryptedSharedPreferences

2. **Verificação de Expiração**
   - Timestamp comparado com `Date.now()`
   - Não depende de servidor (offline-first)

3. **Device ID Hardware-Based**
   - Android: `Device.osBuildId` (único por dispositivo)
   - iOS: UUID persistente e criptografado

4. **Validação Dupla**
   - Local: rápida, confiável, offline
   - Firebase: autoritativa, sincronização

5. **Código de Transferência**
   - 6 dígitos (1 milhão de combinações)
   - Expira em 10 minutos
   - Validação via Firebase
   - Remove do dispositivo antigo

### O Que NÃO Protege (Aceitável)

❌ Usuário avançado com root/jailbreak pode modificar SecureStore
✅ **Solução:** Verificação periódica com Firebase quando online

❌ Usuário pode manipular clock do sistema
✅ **Solução:** Verificação com servidor quando online detecta

❌ Usuário pode compartilhar código de transferência
✅ **Solução:** Expira em 10 min + remove do dispositivo original

---

## 📱 Integração nas Features

### Exemplo: CartScreen

**Antes (Sem Proteção):**
```typescript
export default function CartScreen() {
  const [items, setItems] = useState([]);
  // ... código normal
}
```

**Depois (Com Proteção):**
```typescript
import { usePremiumGuard } from '@/hooks/usePremiumGuard';
import { PremiumBlockModal } from '@/components/PremiumBlockModal';
import { ActivityIndicator } from 'react-native';

export default function CartScreen() {
  const { hasAccess, loading, showBlockModal, closeModal, status } = usePremiumGuard();
  const [items, setItems] = useState([]);

  // 🛡️ Verificação de acesso
  if (loading) {
    return (
      <View style={styles.centerContent}>
        <ActivityIndicator size="large" color="#E65100" />
        <Text>A verificar acesso...</Text>
      </View>
    );
  }

  if (!hasAccess) {
    return <PremiumBlockModal visible={showBlockModal} onClose={closeModal} status={status} />;
  }

  // ... código normal protegido
}
```

**3 linhas de código = proteção completa!**

---

## 🚀 Fluxo de Pagamento

### Do Pagamento ao Premium Ativo

```
1. Usuário na PremiumScreen
   └─> Clica "Anexar Comprovativo"
   └─> Seleciona imagem da galeria
   └─> Clica "Enviar Pagamento"

2. PremiumService.submitPayment()
   └─> Upload para Firebase Storage
   └─> Cria registro: payments/{userId}/{paymentId}
   └─> Status inicial: "pending"

3. Admin (Dashboard Firebase ou Manual)
   └─> Vê novos pagamentos pendentes
   └─> Valida comprovativo bancário
   └─> Chama PremiumService.activatePremium(userId, 30)
   
4. activatePremium() no Firebase
   └─> Atualiza: users/{userId}
       {
         isPremium: true,
         status: "approved",
         expiresAt: now + 30 dias,
         paymentMethod: "multicaixa"
       }

5. Usuário abre app (ou clica Sincronizar)
   └─> PremiumService.syncStatus()
   └─> Lê dados do Firebase
   └─> Atualiza SecureStore local
   └─> isPremium() retorna true

6. Premium Ativo! 🎉
   └─> Acesso a todas features
   └─> Funciona offline
   └─> Válido por 30 dias
```

---

## 🔄 Sincronização

### Quando Sincroniza?

1. **Abertura do App** (background)
   - Se última sync > 24h
   - Silenciosa (não bloqueia UI)

2. **Botão Manual** (PremiumScreen)
   - Usuário clica "Sincronizar Estado"
   - Mostra loading
   - Exibe resultado

3. **Após Expiração**
   - isPremium() detecta expirado
   - Tenta Firebase
   - Se renovado: atualiza local

4. **Após Validação de Código**
   - Transferência de dispositivo
   - Força sync imediata
   - Garante estado atualizado

### Estratégia Offline

```typescript
// Prioridade: LOCAL → FIREBASE → DEGRADADO

async isPremium() {
  // 1. Tentar local primeiro (rápido, offline)
  const local = await getLocalStatus();
  
  // 2. Verificar se expirou
  if (local && local.expiresAt > Date.now()) {
    return local.isPremium; // ✅ Aprovado, não expirado
  }
  
  // 3. Tentar Firebase (online)
  try {
    const firebase = await getPremiumStatusFromFirebase();
    await saveLocalStatus(firebase); // Atualiza cache
    return firebase.isPremium;
  } catch (error) {
    // 4. Degradação: usar local mesmo expirado (offline gracioso)
    if (local && local.status === 'approved') {
      console.warn('Offline: usando cache local expirado');
      return local.isPremium; // ⚠️ Permite uso temporário
    }
    return false; // ❌ Sem cache ou status inválido
  }
}
```

---

## 🧪 Testes Recomendados

### Cenários de Teste

#### ✅ Teste 1: Pagamento e Aprovação
1. Usuário envia comprovativo
2. Status: `pending` (modal laranja)
3. Admin aprova no Firebase
4. Usuário clica "Sincronizar"
5. Status: `approved` (acesso liberado)

#### ✅ Teste 2: Modo Offline
1. Usuário Premium com status aprovado
2. Ativar modo avião
3. Abrir feature protegida
4. Deve liberar acesso (cache local)

#### ✅ Teste 3: Expiração
1. Usuário Premium com expiresAt no passado
2. Abrir feature protegida
3. isPremium() detecta expiração
4. Tenta Firebase (se online)
5. Modal "Assinatura Expirou"

#### ✅ Teste 4: Migração de Dispositivo
1. Dispositivo A: gerar código 123456
2. Dispositivo B: instalar app
3. Dispositivo B: inserir 123456
4. Validar código via Firebase
5. Premium transferido para B
6. Dispositivo A: Premium removido

#### ✅ Teste 5: Pagamento Recusado
1. Admin rejeita pagamento no Firebase
2. Status: `rejected`
3. Modal vermelho: "Pagamento Recusado"
4. Botão: "Tentar Novamente"

---

## 📊 Estrutura Firebase

### Database (Realtime)

```
confere/
├── users/
│   └── {userId}/
│       ├── isPremium: boolean
│       ├── status: "pending" | "approved" | "rejected" | "expired"
│       ├── expiresAt: number
│       ├── paymentMethod: "multicaixa" | null
│       ├── deviceInfo: {...}
│       └── updatedAt: timestamp
│
└── payments/
    └── {userId}/
        └── {paymentId}/
            ├── amount: number
            ├── receiptUri: string
            ├── deviceInfo: {...}
            ├── status: "pending" | "approved" | "rejected"
            ├── createdAt: timestamp
            └── reviewedAt: timestamp (opcional)
```

### Storage (Comprovativos)

```
receipts/
└── {userId}/
    └── {paymentId}.jpg
```

---

## 🎯 Checklist de Implementação

### ✅ Feito

- [x] Instalar `expo-secure-store` e `expo-device`
- [x] Criar `PremiumService` com offline-first
- [x] Criar `UserService` com device ID
- [x] Implementar `usePremiumGuard()` hook
- [x] Criar `PremiumBlockModal` component
- [x] Criar `TransferCodeScreen` para migração
- [x] Adicionar botão "Sincronizar" em PremiumScreen
- [x] Proteger CartScreen com PremiumGuard
- [x] Testar compilação (0 erros)

### ⏳ Próximos Passos

- [ ] Testar fluxo completo em device real
- [ ] Testar modo offline (avião)
- [ ] Testar migração entre 2 dispositivos
- [ ] Criar dashboard admin para aprovar pagamentos
- [ ] Implementar notificações push (aprovação)
- [ ] Adicionar analytics (conversão Premium)
- [ ] Testes de segurança (root/jailbreak)
- [ ] Documentar API admin

---

## 💡 Boas Práticas

### Para Desenvolvedores

1. **Sempre use usePremiumGuard() nas features pagas**
   ```typescript
   const { hasAccess, loading, showBlockModal, closeModal, status } = usePremiumGuard();
   ```

2. **Nunca confie apenas em verificação local**
   - Sempre sincronize quando online
   - Use Firebase como fonte de verdade

3. **Trate offline graciosamente**
   - Permita uso com cache válido
   - Mostre avisos quando cache expirou

4. **Logs importantes**
   ```typescript
   console.log('[Premium] Verificando acesso...');
   console.log('[Premium] Cache local válido até:', expiresAt);
   console.log('[Premium] Sincronizando com Firebase...');
   ```

### Para Usuários

1. **Sincronize regularmente**
   - Clique "Sincronizar Estado" semanalmente
   - Garante status atualizado

2. **Migração de dispositivo**
   - Use código de transferência
   - Não compartilhe o código (expira em 10 min)

3. **Problemas de pagamento**
   - Aguarde 24-48h para análise
   - Verifique dados bancários corretos
   - Clique "Sincronizar" após aprovação

---

## 📞 Suporte

### Problemas Comuns

**"Meu pagamento não foi aprovado"**
- Aguarde 24-48h (análise manual)
- Verifique IBAN correto
- Clique "Sincronizar Estado"

**"Premium não funciona offline"**
- Sincronize uma vez online
- Verifique expiração
- Cache válido por 30 dias

**"Troquei de telefone, perdi Premium"**
- Use tela "Transferir Premium"
- Gere código no antigo
- Insira no novo

**"Modal 'Assinatura Expirou' aparece sempre"**
- Renovação necessária
- Envie novo pagamento
- Aguarde aprovação

---

## 🎉 Conclusão

Sistema Premium **offline-first** completo e seguro:

✅ **Funciona offline** após verificação inicial  
✅ **Seguro** com criptografia nativa  
✅ **Migração** suave entre dispositivos  
✅ **UX amigável** com modais informativos  
✅ **Escalável** para milhares de usuários  
✅ **Monetizável** com validação de pagamentos  

**Custo de operação:** Quase zero (Firebase Free Tier)  
**Complexidade para usuário:** Baixíssima (3 cliques)  
**Proteção contra fraude:** Alta (device ID + timestamp)  

---

**Desenvolvido com ❤️ para Confere Angola**  
**Versão:** 1.0.0  
**Data:** 2024  
**Autor:** Antonio Teca Dev
