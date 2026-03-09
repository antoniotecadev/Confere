/**
 * Faz o parse de um preço digitado pelo utilizador em notação angolana/portuguesa.
 *
 * Regras:
 *  - Ponto seguido de exactamente 3 dígitos = separador de milhar  →  19.000 → 19000
 *  - Vírgula = separador decimal                                    →  19,50  → 19.50
 *  - Ponto seguido de 1 ou 2 dígitos = separador decimal           →  19.5   → 19.5
 *
 * Exemplos:
 *   parsePrice("19.000")      → 19000
 *   parsePrice("1.500.000")   → 1500000
 *   parsePrice("19.000,50")   → 19000.50
 *   parsePrice("19,50")       → 19.50
 *   parsePrice("19.5")        → 19.5
 *   parsePrice("")            → 0
 */
export function parsePrice(text: string): number {
  if (!text?.trim()) return 0;
  let s = text.trim();
  // Pontos seguidos de exactamente 3 dígitos são separadores de milhar
  s = s.replace(/\.(\d{3})(?=[\D,]|$)/g, '$1');
  // Vírgula é separador decimal
  s = s.replace(',', '.');
  return parseFloat(s) || 0;
}
