# 🛒 Confere - Nunca Mais Pague a Mais! 💰

<div align="center">

**A tua arma secreta contra erros de cobrança em supermercados angolanos**

*Porque cada Kwanza conta, e a matemática não falha!*

[![React Native](https://img.shields.io/badge/React%20Native-0.74-61DAFB?logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-SDK%2052-000020?logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-3178C6?logo=typescript)](https://www.typescriptlang.org/)
<!-- [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE) -->

</div>

---

## 🎯 O Problema que Resolvemos

Já te aconteceu chegar ao caixa do supermercado e desconfiar que o valor não bateu? 🤔

Aquele momento em que olhas para o talão e pensas: *"Espera aí... eu calculei 15.000 Kz, mas cobraram 17.500 Kz!"*

**Parece familiar?** É exactamente para isso que o **Confere** existe!

### 💔 A Realidade Angolana

- ❌ **Erros de digitação** nos códigos de barras
- ❌ **Promoções não aplicadas** correctamente
- ❌ **Produtos duplicados** acidentalmente
- ❌ **Preços desactualizados** nas prateleiras vs caixa
- ❌ **Falta de transparência** nos valores cobrados

### ✅ A Nossa Solução

**Confere** coloca o poder de volta nas tuas mãos! Conferência automática, inteligente e sem stress.

---

## 🌟 Funcionalidades Principais

### 🛍️ **Gestão Inteligente de Carrinhos**

- **Criação Rápida**: Seleciona o supermercado favorito ou escreve qualquer nome
- **Orçamento Diário**: Define quanto queres gastar e recebe alertas em tempo real
- **Fotos de Produtos**: Tira foto dos produtos para referência futura
- **Edição Flexível**: Ajusta preços e quantidades a qualquer momento
- **Multi-Carrinhos**: Gere vários carrinhos simultâneamente (Shoprite, Kero, Candando, etc.)

### ⚖️ **Comparação Precisa com 3 Estados**

O coração do Confere! Compara o valor calculado vs o valor cobrado:

1. **✅ Verde (Confere!)**: Valores batem perfeitamente
   - Som positivo + feedback visual verde
   - Tranquilidade garantida! 😌

2. **⚠️ Laranja (Não confere!)**: Cobraram a MAIS que o esperado
   - Som de alerta + feedback visual laranja
   - **É AQUI que tens poder de reclamar!** 💪
   - Mostra exactamente quanto foi cobrado a mais

3. **ℹ️ Azul (Cobraram a menos!)**: Cobraram MENOS que o esperado
   - Som positivo + feedback visual azul
   - Sortudo! Economizaste sem querer 🎉

### 📸 **Sistema de Fotos do Talão**

- Tira várias fotos do talão de compras
- Visualiza em tela cheia quando precisares
- Guarda como prova em caso de disputa
- Organização automática por comparação

### 📊 **Histórico Completo e Inteligente**

- **Busca Rápida**: Procura por nome de supermercado
- **Filtros Inteligentes**: 
  - Todos (visão completa)
  - Corretos (conferiu + cobrado a menos)
  - Erros (cobrado a mais)
- **Timeline Organizada**: Vê todas as tuas compras cronologicamente
- **Detalhes Expandidos**: Toca em qualquer comparação para ver todos os detalhes
- **Indicadores Visuais**: Badges coloridos para status rápido

### 📈 **Estatísticas que Impressionam**

Visualiza o impacto real do Confere na tua vida:

#### 💰 **Painel de Economias**
- **Total Economizado**: Quanto já evitaste pagar a mais
- **Total Gasto**: Visão geral dos teus gastos
- **Erros Encontrados**: Número de cobranças incorrectas detectadas
- **Taxa de Acerto**: Percentual de supermercados que cobram certo

#### 📉 **Gráfico de Gastos por Período**
- Visualização em linha do tempo
- Períodos: Diário, Semanal, Mensal, Anual
- Identifica padrões de consumo
- Interface interactiva e responsiva

#### 🏆 **Top 10 Produtos Mais Comprados**
- Ranking com posição numérica
- Quantidade total comprada
- Total gasto por produto
- Identifica os teus essenciais

#### 🏪 **Top Supermercados**
- Ranking por número de comparações
- Taxa de acerto de cada supermercado
- Total gasto em cada estabelecimento
- Identifica os mais confiáveis

### 🎯 **Sugestões Inteligentes**

Sistema de recomendações baseado nos teus hábitos:

- **Produtos Frequentes**: Sugere produtos que compras regularmente
- **Badge ⭐ Frequente**: Destaca os teus favoritos
- **Histórico de Preços**: Compara preços entre compras
- **Alertas de Preço**: 
  - 🎉 **Promoção detectada!** (preço muito abaixo da média)
  - ⚠️ **Preço suspeito!** (preço muito acima do normal)

### 🎵 **Feedback Sonoro e Háptico**

Experiência sensorial completa:

- **Som Positivo**: Quando confere ou foi cobrado a menos
- **Som de Alerta**: Quando foi cobrado a mais (atenção!)
- **Vibração**: Feedback tátil em todas as acções importantes
- **Sincronização Perfeita**: Som + vibração + visual

---

## 🏗️ Arquitetura Técnica

### 📁 **Estrutura do Projecto**

```
Confere/
├── app/
│   ├── screens/           # Telas principais
│   │   ├── HomeScreen.tsx              # Dashboard inicial
│   │   ├── CartScreen.tsx              # Gestão de carrinho
│   │   ├── AddProductScreen.tsx        # Adicionar produtos
│   │   ├── ComparisonScreen.tsx        # Conferência com 3 estados
│   │   ├── HistoryScreen.tsx           # Histórico de comparações
│   │   └── StatisticsScreen.tsx        # Dashboard de estatísticas
│   ├── services/          # Lógica de negócio
│   │   ├── FavoritesService.ts         # Produtos frequentes
│   │   ├── PriceAlertService.ts        # Alertas de preço
│   │   └── PriceComparisonService.ts   # Comparação de preços
│   └── _layout.tsx        # Navegação e providers
├── assets/
│   ├── images/            # Logos de supermercados
│   └── sounds/            # positive.mp3, negative.mp3
├── components/            # Componentes reutilizáveis
│   └── ui/
├── constants/             # Temas e constantes
├── hooks/                 # Custom hooks
└── utils/                 # Utilitários e storage
    ├── carts-storage.ts              # AsyncStorage de carrinhos
    ├── comparisons-storage.ts        # AsyncStorage de comparações
    ├── sound-feedback.ts             # Sistema de áudio
    └── supermarkets.ts               # Base de supermercados
```

### 🔧 **Stack Tecnológico**

#### **Core**
- **React Native 0.74**: Framework principal
- **Expo SDK 52**: Plataforma de desenvolvimento
- **TypeScript 5.3**: Type safety e IntelliSense
- **Expo Router**: Navegação file-based moderna

#### **Storage & Persistência**
- **AsyncStorage**: Armazenamento local persistente
- **expo-file-system**: Gestão de fotos
- **Padrão de Storage**: Classes service para cada entidade

#### **Recursos Nativos**
- **expo-image-picker**: Câmera e galeria
- **expo-audio**: Sistema de som (createAudioPlayer)
- **react-native Vibration API**: Feedback háptico
- **expo-camera**: Captura de fotos (futuro: scanner de código de barras)

#### **UI & Experiência**
- **react-native-chart-kit**: Gráficos e visualizações
- **@expo/vector-icons (Ionicons)**: Iconografia consistente
- **Custom Components**: Sistema de design próprio

#### **Patterns & Architecture**
- **Context API**: Audio feedback global
- **Custom Hooks**: useFocusEffect para sincronização
- **Service Layer**: Separação de lógica de negócio
- **AsyncStorage Abstraction**: Classes wrapper type-safe

---

<!-- 
## 🚀 Começar a Usar

### 📋 **Pré-requisitos**

- **Node.js** 18+ instalado
- **npm** ou **yarn**
- **Expo Go** app (iOS/Android) OU emulador configurado

### 📥 **Instalação**

```bash
# Clone o repositório
git clone https://github.com/yourusername/Confere.git
cd Confere

# Instala dependências
npm install

# Inicia o servidor de desenvolvimento
npx expo start
```

### 📱 **Executar no Dispositivo**

#### **Opção 1: Expo Go (Recomendado para Desenvolvimento)**

1. Instala **Expo Go** na Play Store (Android) ou App Store (iOS)
2. Executa `npx expo start`
3. Scannea o QR code com a câmera (iOS) ou app Expo Go (Android)

#### **Opção 2: Emulador**

**Android:**
```bash
npx expo start --android
```

**iOS (apenas macOS):**
```bash
npx expo start --ios
```

### 🎵 **Configurar Sons**

Adiciona os ficheiros de áudio necessários:

```bash
# Cria directório de sons
mkdir -p assets/sounds

# Adiciona teus ficheiros MP3:
# - assets/sounds/positive.mp3  (som de sucesso)
# - assets/sounds/negative.mp3  (som de alerta)
```

### 🏪 **Configurar Logos de Supermercados**

Adiciona logos dos supermercados (opcional mas recomendado):

```bash
mkdir -p assets/images/supermarkets

# Adiciona logos (PNG ou JPG, ~200x200px recomendado):
# - shoprite.png
# - kero.png
# - candando.png
# - maxi.png
# - nosso_super.png
# ... (edita utils/supermarkets.ts para adicionar mais)
```
-->

---

## 🎮 Como Usar

### 🆕 **Primeira Compra**

1. **Cria um Carrinho**
   - Toca em "➕ Novo Carrinho"
   - Escolhe ou escreve o nome do supermercado
   - (Opcional) Define um orçamento diário
   - Confirma

2. **Adiciona Produtos**
   - Toca em "➕ Adicionar Produto"
   - Escreve o nome (vê sugestões inteligentes!)
   - Insere preço e quantidade
   - (Opcional) Tira foto do produto
   - Salva

3. **Confere no Caixa**
   - Quando chegares ao caixa, toca em "✓ Conferir"
   - Vê o valor calculado (o que DEVERIA ser)
   - Insere o valor que te cobraram
   - (Opcional) Tira fotos do talão
   - Toca "Comparar"

4. **Interpreta o Resultado**
   - **Verde**: Tudo certo! 😊
   - **Laranja**: Cobraram a mais! Reclama! 💪
   - **Azul**: Cobraram a menos! Sortudo! 🎉

### 🔄 **Uso Contínuo**

- **Dashboard**: Vê todos os carrinhos activos
- **Histórico**: Consulta comparações passadas
- **Estatísticas**: Acompanha economias e padrões
- **Edição**: Ajusta produtos conforme necessário

---

## 🎨 Design System

### 🎨 **Paleta de Cores**

```typescript
Primary Blue:    #2196F3  // Acções principais, header
Success Green:   #4CAF50  // Confere, sucesso
Warning Orange:  #FF9800  // Cobrado a mais, alertas
Info Blue:       #2196F3  // Cobrado a menos, informações
Error Red:       #F44336  // Erros críticos
Purple:          #9C27B0  // Estatísticas, destaques

Backgrounds:
  Light:         #F5F5F5
  White:         #FFFFFF
  Card:          #FFFFFF com shadow

Text:
  Primary:       #333333
  Secondary:     #666666
  Tertiary:      #999999
```

### 📐 **Convenções de Layout**

- **Border Radius**: 12px (cards), 8px (inputs)
- **Padding**: Múltiplos de 4 (8, 12, 16, 20, 24)
- **Shadows**: elevation: 3, shadowOpacity: 0.1
- **Typography**: System fonts com pesos 400, 600, 700

---

## 🧪 Funcionalidades Avançadas

### 🎯 **Sistema de Orçamento Inteligente**

- **Alerta aos 80%**: Aviso quando atingir 80% do orçamento
- **Bloqueio Opcional**: Alerta ao ultrapassar orçamento
- **Barra de Progresso**: Visual em tempo real
- **Cores Dinâmicas**: Verde → Laranja → Vermelho

### 🔍 **Análise de Preços**

```typescript
// PriceComparisonService identifica automaticamente:
- Média de preços por produto
- Desvio padrão para detectar anomalias
- Promoções reais (>15% abaixo da média)
- Preços suspeitos (>20% acima da média)
```

### 📊 **Agregação de Dados**

```typescript
// Estatísticas calculadas em tempo real:
- Total economizado (soma de difference > 0)
- Taxa de acerto por supermercado
- Produtos mais comprados (ranking)
- Gráficos por período (dia/semana/mês/ano)
```

---

<!-- 
## 🛠️ Desenvolvimento

### 🏃 **Scripts Disponíveis**

```bash
# Desenvolvimento
npm start           # Inicia Expo DevTools
npm run android     # Build Android
npm run ios         # Build iOS
npm run web         # Versão web (experimental)

# Linting
npm run lint        # ESLint check
npm run format      # Prettier format

# Reset
npm run reset-project  # Limpa e reinicia projecto
```

### 🔨 **Adicionar Novo Supermercado**

Edita `utils/supermarkets.ts`:

```typescript
export const supermarkets = [
  // ... existentes
  {
    id: 'novo-super',
    name: 'Novo Super',
    logo: require('@/assets/images/supermarkets/novo-super.png'),
  },
];
```

### 🎵 **Customizar Sons**

Edita `utils/sound-feedback.ts`:

```typescript
const players = {
  positive: createAudioPlayer(require('@/assets/sounds/teu-som-positivo.mp3')),
  negative: createAudioPlayer(require('@/assets/sounds/teu-som-negativo.mp3')),
};
```
-->

---

## 🐛 Resolução de Problemas

### ❓ **Sons não tocam?**

1. Verifica se os ficheiros MP3 existem em `assets/sounds/`
2. Testa em dispositivo físico (emuladores têm limitações de áudio)
3. Confirma permissões de áudio no dispositivo

### ❓ **Fotos não aparecem?**

1. Concede permissões de câmera e galeria
2. Verifica espaço de armazenamento disponível
3. Testa em dispositivo físico (emuladores têm limitações)

### ❓ **Gráficos não renderizam?**

1. Confirma que `react-native-chart-kit` está instalado
2. Verifica se há dados suficientes (mínimo 2 pontos)
3. Limpa cache: `npx expo start -c`

### ❓ **AsyncStorage não persiste?**

1. Em desenvolvimento, dados podem limpar ao recarregar
2. Em produção, dados persistem permanentemente
3. Testa com build standalone para comportamento real

---

## 🗺️ Roadmap Futuro

### 🔜 **Próximas Funcionalidades**

- [ ] 📷 **Scanner de Código de Barras** (prioridade máxima!)
  - Scannear produtos directamente
  - Base de dados de preços por código EAN
  - Auto-completar nome e preço sugerido

- [ ] 💵 **Integração AdMob**
  - Monetização via anúncios
  - Banners não-intrusivos
  - Recompensas por vídeos

- [ ] 💎 **Google Play In-App Purchases**
  - Versão Premium sem anúncios
  - Funcionalidades exclusivas
  - Integração RevenueCat

- [ ] ☁️ **Cloud Sync (Firebase)**
  - Backup automático na nuvem
  - Sincronização entre dispositivos
  - Cloud Functions para automação

- [ ] 🤝 **Partilha de Carrinhos**
  - Partilha com família/amigos
  - Colaboração em tempo real
  - Listas de compras partilhadas

- [ ] 📍 **Geolocalização**
  - Detecta supermercado automaticamente
  - Sugestões baseadas em localização
  - Mapa de supermercados próximos

- [ ] 🧾 **OCR para Talões**
  - Extrai dados automaticamente do talão
  - Validação inteligente
  - Reduz erro humano

- [ ] 📢 **Sistema de Notificações**
  - Lembrete para conferir compras
  - Alertas de promoções
  - Resumo semanal de economias

---

<!-- 
## 🤝 Contribuir

Contribuições são bem-vindas! 🎉

### 📝 **Como Contribuir**

1. **Fork** o projecto
2. Cria uma **branch** para a tua feature (`git checkout -b feature/MinhaFeature`)
3. **Commit** as mudanças (`git commit -m 'Adiciona MinhaFeature'`)
4. **Push** para a branch (`git push origin feature/MinhaFeature`)
5. Abre um **Pull Request**

### 🎯 **Áreas que Precisam de Ajuda**

- 🎨 Design e UX improvements
- 🐛 Reportar e corrigir bugs
- 📝 Documentação e tradução
- 🧪 Testes automatizados
- 🚀 Optimização de performance
-->

---

<!-- 
## 📄 Licença

Este projecto está licenciado sob a **MIT License** - vê o ficheiro [LICENSE](LICENSE) para detalhes.
-->

## 📄 Direitos Autorais

**© 2026 Antonio Teca. Todos os direitos reservados.**

Este software é proprietário e confidencial. Uso não autorizado, cópia, modificação ou distribuição é estritamente proibido.

---

## 👨‍💻 Autor

**Antonio Teca**
- GitHub: [@antoniotecadev](https://github.com/antoniotecadev)

---

## 🙏 Agradecimentos

- **Comunidade Expo**: Pela plataforma incrível
- **React Native Team**: Pelo framework poderoso
<!-- - **Contribuidores**: Todos que ajudaram a melhorar o Confere -->
- **Utilizadores Angolanos**: Por confiarem na app e darem feedback valioso

---

## 💡 Inspiração

Este projecto nasceu da frustração de ver erros constantes em cobranças de supermercados em Angola. A ideia é simples: **empoderar o consumidor angolano com tecnologia**.

Cada Kwanza economizado é uma vitória. Cada erro detectado é justiça feita. **Confere** não é apenas uma app - é um movimento pela transparência e justiça financeira! 💪

---

<div align="center">

### ⭐ Se gostaste, deixa uma estrela! ⭐

**Juntos, fazemos as compras mais justas em Angola!** 🇦🇴

[⬆ Voltar ao topo](#-confere---nunca-mais-pague-a-mais-)

</div>
