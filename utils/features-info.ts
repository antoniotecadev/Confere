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
    description: 'Planeia as tuas compras com inteligência! Vê preços em diferentes supermercados, define quanto queres gastar e recebe alertas quando os preços sobem.',
    benefits: [
      '✓ Compara preços entre supermercados',
      '✓ Define preço esperado para cada produto',
      '✓ Alerta visual quando preço aumenta',
      '✓ Escolhe onde comprar cada produto',
      '✓ Histórico de preços e última compra',
      '✓ Sugestões de produtos frequentes',
      '✓ Total estimado automático',
    ],
    howToUse: [
      '1. Digita o nome do produto',
      '2. Sistema mostra preços de todos os supermercados',
      '3. Escolhe onde vais comprar',
      '4. (Opcional) Define preço esperado',
      '5. Recebe alerta se preço subir',
      '6. Marca como comprado ao finalizar',
    ],
  },
  {
    id: 'favorites',
    title: 'Produtos Favoritos',
    icon: 'star',
    description: 'Descobre automaticamente os teus produtos mais comprados e acompanha a evolução de preços ao longo do tempo com gráficos detalhados.',
    benefits: [
      '✓ Detecção automática de produtos frequentes',
      '✓ Marca produtos como favoritos manualmente',
      '✓ Gráfico de evolução de preços (últimos 6 meses)',
      '✓ Estatísticas: preço médio, mínimo e máximo',
      '✓ Tendência de preço (subindo/descendo/estável)',
      '✓ Adiciona à lista de compras com 1 toque',
      '✓ Frequência de compra em percentagem',
    ],
    howToUse: [
      '1. Sistema detecta produtos comprados 2+ vezes',
      '2. Toca na estrela para marcar favorito manual',
      '3. Toca no produto para ver gráfico de evolução',
      '4. Analisa tendências (📈 subindo, 📉 descendo)',
      '5. Adiciona à lista de compras rapidamente',
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
