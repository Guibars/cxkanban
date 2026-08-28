export const EXTRA_COST_ORIGINS = ['Reclame Aqui', 'Logística', 'SAC Avaria', 'Troca Parcial', 'Comercial'];
export const EXTRA_COST_REGIONALS = ['Taisson', 'Isadora', 'Rosi Job'];
export const EXTRA_COST_REASON_CATEGORIES = [
  'Bonificação por Relacionamento',
  'Erro de Lançamento',
  'Troca Parcial por Erro Comercial',
];

export function monthYearFromDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.slice(0, 7) : '';
}

export function totalExtraCost(productCost: number, logisticsCost: number, taxCost: number) {
  return Number((productCost + logisticsCost + taxCost).toFixed(2));
}
