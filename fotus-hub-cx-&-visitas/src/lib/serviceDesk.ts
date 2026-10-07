import type { VocFeedback } from '../types';

export const SERVICE_CATEGORIES = [
  'Solução para entrega',
  'Solução fiscal',
  'Avarias na Entrega',
  'Processo Seletivo',
  'Compliance',
] as const;
export const SERVICE_STATUSES = [
  'Aberto',
  'Em Andamento',
  'Finalizado',
] as const;
export const VOC_KINDS = ['Reclamação', 'Sugestão', 'Elogio', 'Dor'] as const;
export const VOC_STATUSES = [
  'Novo',
  'Em análise',
  'Em melhoria',
  'Concluído',
] as const;
export const VOC_PRIORITIES = ['Baixa', 'Média', 'Alta'] as const;
export const VOC_THEMES = [
  'Entrega e prazo',
  'Avarias',
  'Atendimento',
  'Fiscal e faturamento',
  'Produto e qualidade',
  'Pagamento',
  'Pós-venda',
  'Processos internos',
  'Outros',
];
export const VOC_AREAS = [
  'Logística',
  'Fiscal',
  'Comercial',
  'CX / Atendimento',
  'Qualidade',
  'Financeiro',
  'Recursos Humanos',
  'Compliance',
  'Outros',
];
export const VOC_SOURCES = [
  'WhatsApp',
  'Telefone',
  'E-mail',
  'Reclame Aqui',
  'Chat',
  'Pesquisa',
  'Outros',
];

export function experienceToday() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export const experienceDate = (date: string) =>
  date.split('-').reverse().join('/');
export const normalizedTopic = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');

export function rankFeedback(
  records: VocFeedback[],
  field: 'theme' | 'responsibleArea' | 'kind',
) {
  const groups = new Map<string, { label: string; count: number }>();
  for (const record of records) {
    const label = record[field].trim() || 'Não informado';
    const key = normalizedTopic(label);
    const group = groups.get(key) || { label, count: 0 };
    group.count++;
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) => b.count - a.count || a.label.localeCompare(b.label, 'pt-BR'),
  );
}

export function vocOpportunities(records: VocFeedback[]) {
  const groups = new Map<
    string,
    {
      theme: string;
      area: string;
      count: number;
      complaints: number;
      suggestions: number;
      highPriority: number;
    }
  >();
  for (const item of records) {
    if (item.kind === 'Elogio' || item.status === 'Concluído') continue;
    const key = JSON.stringify([
      normalizedTopic(item.theme),
      normalizedTopic(item.responsibleArea),
    ]);
    const group = groups.get(key) || {
      theme: item.theme,
      area: item.responsibleArea,
      count: 0,
      complaints: 0,
      suggestions: 0,
      highPriority: 0,
    };
    group.count++;
    group.complaints += Number(
      item.kind === 'Reclamação' || item.kind === 'Dor',
    );
    group.suggestions += Number(item.kind === 'Sugestão');
    group.highPriority += Number(item.priority === 'Alta');
    groups.set(key, group);
  }
  return [...groups.values()].sort(
    (a, b) =>
      b.highPriority - a.highPriority ||
      b.count - a.count ||
      a.theme.localeCompare(b.theme, 'pt-BR'),
  );
}
