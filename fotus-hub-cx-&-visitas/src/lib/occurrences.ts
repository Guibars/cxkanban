export const BRAZIL_STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

export const DEFAULT_OCCURRENCE_AGENTS = ['Adriely', 'Carol', 'Júlia', 'Laís', 'Marcela', 'Naiane', 'Lara'];
/** Backwards-compatible alias for consumers that still use the built-in list. */
export const OCCURRENCE_AGENTS = DEFAULT_OCCURRENCE_AGENTS;
export const OCCURRENCE_TYPES = ['Material Avariado', 'Material Faltando', 'Material Errado'];
export const OCCURRENCE_PRODUCTS = ['Módulo', 'Estrutura', 'Inversor', 'Cabo', 'Conectores', 'Material de fixação', 'Microinversor', 'Medidor Inteligente'];
export const OCCURRENCE_CARRIERS = [
  'TECMAR TRANSPORTES',
  'ALMAKS TRANSPORTES',
  'TRANSPORTADOR FOTUS',
  'EXPRESSO RIO VERMELHO',
  'E4LOG SOLUÇÕES LOGISTICAS LTDA',
  'ENTREGO',
  'GN TRANSPORTES LTDA',
  'RTL CARGAS GO',
  'CLIENTE RETIRA | FOB',
  'PHENYX INDUSTRIA PROJETOS E OPERACOES LOGISTICAS LTDA',
  'LOGCHIO OPERADOR LOGISTICO LTDA',
  'ATLANTICA TRANSPORTE',
  'FOTUS ENERGIA SOLAR LTDA',
  'VIEIRA E PEREIRA TRANSPORTES',
];

const REGIONS: Record<string, string> = {
  AC: 'Norte', AP: 'Norte', AM: 'Norte', PA: 'Norte', RO: 'Norte', RR: 'Norte', TO: 'Norte',
  AL: 'Nordeste', BA: 'Nordeste', CE: 'Nordeste', MA: 'Nordeste', PB: 'Nordeste', PE: 'Nordeste', PI: 'Nordeste', RN: 'Nordeste', SE: 'Nordeste',
  DF: 'Centro-Oeste', GO: 'Centro-Oeste', MT: 'Centro-Oeste', MS: 'Centro-Oeste',
  ES: 'Sudeste', MG: 'Sudeste', RJ: 'Sudeste', SP: 'Sudeste',
  PR: 'Sul', RS: 'Sul', SC: 'Sul',
};

export function getRegionFromState(state: string) {
  return REGIONS[state.trim().toUpperCase()] || 'Não informada';
}
