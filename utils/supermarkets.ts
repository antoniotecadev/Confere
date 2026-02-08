export interface Supermarket {
  id: string;
  name: string;
  logo: any; // require() returns any type
  searchTerms: string[]; // Termos de busca para correspondência inteligente
}

export const supermarkets: Supermarket[] = [
  {
    id: 'kibabo',
    name: 'Kibabo',
    logo: require('@/assets/images/supermarkets/kibabo.png'),
    searchTerms: ['kibabo'],
  },
  {
    id: 'shoprite',
    name: 'Shoprite',
    logo: require('@/assets/images/supermarkets/shoprite.png'),
    searchTerms: ['shoprite', 'shop rite'],
  },
  {
    id: 'angomart',
    name: 'Angomart',
    logo: require('@/assets/images/supermarkets/angomart.png'),
    searchTerms: ['angomart'],
  },
  {
    id: 'maxi',
    name: 'Maxi',
    logo: require('@/assets/images/supermarkets/maxi.png'),
    searchTerms: ['maxi'],
  },
  {
    id: 'alimenta-angola',
    name: 'Alimenta Angola',
    logo: require('@/assets/images/supermarkets/alimenta-angola.png'),
    searchTerms: ['alimenta angola', 'alimenta'],
  },
  {
    id: 'deskontao',
    name: 'Deskontão',
    logo: require('@/assets/images/supermarkets/deskontao.png'),
    searchTerms: ['deskontão', 'deskontao', 'descontão', 'descontao'],
  },
  {
    id: 'candando',
    name: 'Candando',
    logo: require('@/assets/images/supermarkets/candando.png'),
    searchTerms: ['candando'],
  },
  {
    id: 'casa-dos-frescos',
    name: 'Casa dos Frescos',
    logo: require('@/assets/images/supermarkets/casa-dos-frescos.webp'),
    searchTerms: ['casa dos frescos', 'casa frescos', 'frescos'],
  },
  {
    id: 'martal',
    name: 'Martal',
    logo: require('@/assets/images/supermarkets/martal.png'),
    searchTerms: ['martal'],
  },
  {
    id: 'intermarket',
    name: 'Intermarket',
    logo: require('@/assets/images/supermarkets/intermarket.jpeg'),
    searchTerms: ['intermarket', 'inter market'],
  },
  {
    id: 'arreiou',
    name: 'Arreiou',
    logo: require('@/assets/images/supermarkets/arreiou.png'),
    searchTerms: ['arreiou', 'arreio'],
  },
  {
    id: 'freshmart',
    name: 'Freshmart',
    logo: require('@/assets/images/supermarkets/freshmart.png'),
    searchTerms: ['freshmart', 'fresh mart'],
  },
  {
    id: 'kero',
    name: 'Kero',
    logo: require('@/assets/images/supermarkets/kero.png'),
    searchTerms: ['kero'],
  },
  {
    id: 'nosso-super',
    name: 'Nosso Super',
    logo: require('@/assets/images/supermarkets/nosso-super.png'),
    searchTerms: ['nosso super', 'nosso'],
  },
  {
    id: 'bb-eskebra',
    name: 'BB Eskebra',
    logo: require('@/assets/images/supermarkets/bb-eskebra.png'),
    searchTerms: ['bb eskebra', 'bb-eskebra', 'eskebra'],
  },
  {
    id: 'belas-shopping',
    name: 'Belas Shopping',
    logo: require('@/assets/images/supermarkets/belas-shopping.png'),
    searchTerms: ['belas shopping', 'belas'],
  },
  {
    id: 'mangole',
    name: 'Mangolê',
    logo: require('@/assets/images/supermarkets/mangole.png'),
    searchTerms: ['mangolê', 'mangole'],
  },
  {
    id: 'mdc',
    name: 'MDC',
    logo: require('@/assets/images/supermarkets/mdc.png'),
    searchTerms: ['mdc'],
  },
  {
    id: 'shopping-avennida',
    name: 'Shopping Avennida',
    logo: require('@/assets/images/supermarkets/shopping-avennida.png'),
    searchTerms: ['shopping avennida', 'avennida'],
  },
  {
    id: 'shopping-fortaleza',
    name: 'Shopping Fortaleza',
    logo: require('@/assets/images/supermarkets/shopping-fortaleza.png'),
    searchTerms: ['shopping fortaleza', 'fortaleza'],
  }
];

// Imagem placeholder para supermercados não reconhecidos
export const supermarketPlaceholder = require('@/assets/images/supermarkets/placeholder.jpg');

/**
 * Busca inteligente de supermercado pelo nome do carrinho
 * Exemplo: "Kero do Kilambal" vai corresponder a "Kero"
 */
export function findSupermarket(cartName: string): Supermarket | null {
  const normalizedCartName = cartName.toLowerCase().trim();
  
  // Procura por correspondência exata ou parcial
  for (const supermarket of supermarkets) {
    for (const term of supermarket.searchTerms) {
      if (normalizedCartName.includes(term.toLowerCase())) {
        return supermarket;
      }
    }
  }
  
  return null;
}

/**
 * Retorna o logo do supermercado ou placeholder
 */
export function getSupermarketLogo(cartName: string): any {
  const supermarket = findSupermarket(cartName);
  return supermarket ? supermarket.logo : supermarketPlaceholder;
}
