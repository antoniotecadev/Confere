export interface FeatureInfo {
  id: string;
  title: string;
  icon: string;
  description: string;
  benefits: string[];
  howToUse: string[];
}

export const featuresInfo: FeatureInfo[] = [
  {
    id: 'comparison',
    title: 'Comparação de Preços',
    icon: 'pricetags',
    description: 'Compara o valor calculado dos teus produtos com o valor cobrado no talão, identificando diferenças e possíveis cobranças indevidas.',
    benefits: [
      '✓ Detecta cobranças a mais no caixa',
      '✓ Mostra a diferença exata em Kz',
      '✓ Partilha resultados via WhatsApp',
      '✓ Guarda histórico de comparações',
      '✓ Anexa fotos dos talões como prova',
    ],
    howToUse: [
      '1. Adiciona produtos ao carrinho durante as compras',
      '2. No final, insere o valor total cobrado',
      '3. Confere se há diferença',
      '4. Anexa foto do talão para guardar prova',
      '5. Partilha resultado se necessário',
    ],
  },
  {
    id: 'shopping-list',
    title: 'Lista de Compras Inteligente',
    icon: 'list',
    description: 'Cria e gere listas de compras com alertas de preço. Nunca mais pagues mais do que o esperado!',
    benefits: [
      '✓ Organiza tuas compras por categorias',
      '✓ Define alertas de preço para cada produto',
      '✓ Recebe notificações quando o preço aumenta',
      '✓ Adiciona rapidamente aos favoritos',
      '✓ Marca itens como comprados',
    ],
    howToUse: [
      '1. Cria uma nova lista de compras',
      '2. Adiciona produtos com preços esperados',
      '3. Define alertas para produtos importantes',
      '4. Usa a lista durante as compras',
      '5. Marca itens conforme compras',
    ],
  },
  {
    id: 'favorites',
    title: 'Produtos Favoritos',
    icon: 'star',
    description: 'Guarda os teus produtos mais comprados para acesso rápido e acompanha a evolução dos preços ao longo do tempo.',
    benefits: [
      '✓ Acesso rápido aos produtos frequentes',
      '✓ Adiciona favoritos diretamente ao carrinho',
      '✓ Acompanha histórico de preços',
      '✓ Visualiza tendências de preço',
      '✓ Exporta lista de favoritos',
    ],
    howToUse: [
      '1. Adiciona produtos aos favoritos',
      '2. Acede rapidamente via botão estrela',
      '3. Vê o histórico de preços de cada produto',
      '4. Adiciona ao carrinho com um toque',
    ],
  },
  {
    id: 'budget',
    title: 'Orçamento Mensal',
    icon: 'wallet',
    description: 'Gere o teu orçamento mensal de compras com estatísticas detalhadas e alertas quando te aproximas do limite.',
    benefits: [
      '✓ Define limite de gastos mensais',
      '✓ Acompanha gastos em tempo real',
      '✓ Recebe alertas (80%, 100%, ultrapassou)',
      '✓ Define orçamento diário por carrinho',
      '✓ Visualiza estatísticas e gráficos',
      '✓ Histórico completo de gastos',
    ],
    howToUse: [
      '1. Define o teu orçamento mensal',
      '2. Opcionalmente, define orçamento diário ao criar carrinho',
      '3. Acompanha barra de progresso nos carrinhos',
      '4. Recebe alertas quando próximo do limite',
      '5. Analisa estatísticas no dashboard',
    ],
  },
  {
    id: 'calculator',
    title: 'Calculadora de Desconto',
    icon: 'calculator',
    description: 'Calcula o desconto real de promoções para saberes se realmente vale a pena. Não caias em armadilhas de marketing!',
    benefits: [
      '✓ Calcula 4 tipos de promoções',
      '✓ Mostra desconto real em percentagem',
      '✓ Indica se a promoção é boa ou má',
      '✓ Compara preço original vs final',
      '✓ Dá dicas personalizadas',
    ],
    howToUse: [
      '1. Escolhe o tipo de promoção',
      '2. Insere os valores solicitados',
      '3. Vê o desconto real calculado',
      '4. Analisa se vale a pena',
      '5. Decide com confiança',
    ],
  },
];

/**
 * Busca informações de uma feature pelo ID
 */
export function getFeatureInfo(featureId: string): FeatureInfo | undefined {
  return featuresInfo.find(f => f.id === featureId);
}
