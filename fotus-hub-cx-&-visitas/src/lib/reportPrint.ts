import { ExtraCost, RACase } from '../types';

const currency = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function dateLabel(value: string) {
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value || '—';
}

function reportDate() {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(new Date());
}

function shell(title: string, subtitle: string, body: string) {
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>
    @page { size: A4; margin: 12mm 13mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; color: #17202b; font-family: Arial, Helvetica, sans-serif; font-size: 10px; line-height: 1.35; background: #fff; }
    .page { width: 100%; }
    .header { border-bottom: 3px solid #f08a24; padding: 2px 0 12px; margin-bottom: 15px; }
    .brand { color: #163f5b; font-size: 10px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    h1 { color: #123e5b; font-size: 23px; line-height: 1.05; margin: 5px 0 4px; }
    .subtitle { color: #667382; font-size: 10px; margin: 0; }
    .muted { color: #74808c; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 0 0 16px; }
    .kpi { border: 1px solid #dce3e8; border-radius: 7px; padding: 10px 11px; background: #f8fafb; }
    .kpi-label { color: #6e7c88; font-size: 8px; font-weight: 800; letter-spacing: .05em; text-transform: uppercase; }
    .kpi-value { color: #123e5b; font-size: 17px; font-weight: 800; margin-top: 3px; }
    .section-title { border-left: 4px solid #f08a24; color: #123e5b; font-size: 13px; font-weight: 800; margin: 17px 0 8px; padding-left: 7px; }
    .callout { border: 1px solid #f2c48d; border-radius: 6px; background: #fff8ee; color: #6f4217; padding: 9px 11px; margin: 9px 0 13px; }
    table { border-collapse: collapse; width: 100%; margin: 5px 0 11px; }
    th { background: #123e5b; color: #fff; font-size: 8px; font-weight: 800; padding: 6px 5px; text-align: left; }
    td { border-bottom: 1px solid #e4e9ed; color: #26333e; font-size: 8.5px; padding: 5px; vertical-align: top; }
    tr:nth-child(even) td { background: #f7f9fa; }
    .right { text-align: right; }
    .center { text-align: center; }
    .pill { border-radius: 12px; display: inline-block; font-size: 8px; font-weight: 800; padding: 3px 7px; }
    .pill-green { background: #e8f6ed; color: #1d7a42; }
    .pill-red { background: #fff0ef; color: #b53b36; }
    .pill-orange { background: #fff4e5; color: #a45b12; }
    .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .stat-list { border: 1px solid #e0e7eb; border-radius: 6px; padding: 9px 10px; }
    .stat-row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #edf0f2; padding: 5px 0; }
    .stat-row:last-child { border-bottom: 0; }
    .bar-wrap { background: #e8edf0; border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden; }
    .bar { background: #4f7d62; height: 100%; }
    .mini-chart { align-items: end; border-bottom: 1px solid #cfd9df; display: flex; gap: 8px; height: 104px; margin: 7px 0 13px; padding: 0 5px; }
    .chart-col { align-items: center; display: flex; flex: 1; flex-direction: column; height: 100%; justify-content: end; min-width: 0; }
    .chart-bar { background: linear-gradient(#7da08a, #385041); border-radius: 4px 4px 0 0; min-height: 3px; width: 100%; }
    .chart-label { color: #74808c; font-size: 7px; margin-top: 4px; white-space: nowrap; }
    .page-break { break-before: page; }
    .footer { border-top: 1px solid #dce3e8; color: #87929c; font-size: 8px; margin-top: 18px; padding-top: 7px; text-align: center; }
    @media screen { body { background: #eef2f4; padding: 22px; } .page { background: #fff; margin: 0 auto; max-width: 794px; min-height: 1123px; padding: 40px 44px; box-shadow: 0 4px 24px #152b3b22; } }
  </style></head><body><main class="page">${body}<div class="footer">Fotus Distribuidora Solar · Relatório gerado em ${escapeHtml(reportDate())}</div></main><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},280)})</script></body></html>`;
}

function topValues(items: ExtraCost[], selector: (item: ExtraCost) => string) {
  const grouped = new Map<string, { label: string; total: number; count: number }>();
  items.forEach((item) => {
    const label = selector(item).trim() || 'Não informado';
    const key = label.toLocaleUpperCase('pt-BR');
    const current = grouped.get(key);
    grouped.set(key, { label: current?.label || label, total: (current?.total || 0) + item.totalCost, count: (current?.count || 0) + 1 });
  });
  return [...grouped.values()].sort((a, b) => b.total - a.total).slice(0, 8);
}

export function buildExtraCostsReport(costs: ExtraCost[]) {
  const total = costs.reduce((sum, item) => sum + item.totalCost, 0);
  const august = costs.filter((item) => (item.monthYear || '').endsWith('-08')).reduce((sum, item) => sum + item.totalCost, 0);
  const highestRegional = topValues(costs, (item) => item.regional)[0];
  const months = topValues(costs, (item) => item.monthYear).sort((a, b) => a.label.localeCompare(b.label));
  const highestMonth = Math.max(...months.map((item) => item.total), 1);
  const detailRows = costs.slice().sort((a, b) => a.date.localeCompare(b.date)).map((item) => `<tr><td>${escapeHtml(dateLabel(item.date))}</td><td>${escapeHtml(item.orderNumber)}</td><td>${escapeHtml(item.regional)}</td><td>${escapeHtml(item.product)}${item.quantity ? ` ×${item.quantity}` : ''}</td><td>${escapeHtml(item.responsible)}</td><td class="right">${currency(item.totalCost)}</td></tr>`).join('');
  const responsibleRows = topValues(costs, (item) => item.responsible).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');
  const regionalRows = topValues(costs, (item) => item.regional).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');
  const monthlyRows = months.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');

  return shell('Relatório de Custos Extras', 'Comercial e Cliente · Consolidado dos registros reais', `
    <header class="header"><div class="brand">FOTUS · Comercial e Cliente</div><h1>Relatório de Custos Extras</h1><p class="subtitle">Consolidado dos custos cadastrados no Hub · Emitido em ${escapeHtml(reportDate())}</p></header>
    <div class="kpis"><div class="kpi"><div class="kpi-label">Total de custos</div><div class="kpi-value">${currency(total)}</div></div><div class="kpi"><div class="kpi-label">Ocorrências</div><div class="kpi-value">${costs.length}</div></div><div class="kpi"><div class="kpi-label">Total em agosto</div><div class="kpi-value">${currency(august)}</div></div></div>
    <div class="callout"><strong>Leitura executiva:</strong> ${costs.length ? `o maior concentrador regional é ${escapeHtml(highestRegional?.label || 'não identificado')}, com ${currency(highestRegional?.total || 0)} em ${highestRegional?.count || 0} registro(s).` : 'Ainda não há custos extras cadastrados para análise.'}</div>
    <div class="section-title">Evolução mensal</div><div class="mini-chart">${months.map((item) => `<div class="chart-col" title="${escapeHtml(item.label)}: ${currency(item.total)}"><div class="chart-bar" style="height:${Math.max(3, Math.round((item.total / highestMonth) * 78))}px"></div><span class="chart-label">${escapeHtml(item.label.slice(5))}</span></div>`).join('') || '<span class="muted">Sem dados</span>'}</div><table><thead><tr><th>Mês</th><th class="center">Registros</th><th class="right">Total</th></tr></thead><tbody>${monthlyRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}</tbody></table>
    <div class="grid-two"><div><div class="section-title">Por responsável</div><table><thead><tr><th>Responsável</th><th class="center">Qtd.</th><th class="right">Total</th></tr></thead><tbody>${responsibleRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}</tbody></table></div><div><div class="section-title">Por regional</div><table><thead><tr><th>Regional</th><th class="center">Qtd.</th><th class="right">Total</th></tr></thead><tbody>${regionalRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}</tbody></table></div></div>
    <div class="page-break"></div><header class="header"><div class="brand">FOTUS · Detalhamento</div><h1>Detalhamento dos custos</h1><p class="subtitle">Registros que compõem o consolidado apresentado na primeira página.</p></header>
    <table><thead><tr><th>Data</th><th>Pedido</th><th>Regional</th><th>Produto</th><th>Responsável</th><th class="right">Valor</th></tr></thead><tbody>${detailRows || '<tr><td colspan="6" class="center muted">Sem registros</td></tr>'}</tbody></table>
    <div class="section-title">Composição financeira</div><div class="stat-list"><div class="stat-row"><span>Produto</span><strong>${currency(costs.reduce((sum, item) => sum + item.productCost, 0))}</strong></div><div class="stat-row"><span>Logística</span><strong>${currency(costs.reduce((sum, item) => sum + item.logisticsCost, 0))}</strong></div><div class="stat-row"><span>Impostos</span><strong>${currency(costs.reduce((sum, item) => sum + item.taxCost, 0))}</strong></div><div class="stat-row"><span>Total geral</span><strong>${currency(total)}</strong></div></div>`);
}

const RA_TARGETS = { indicatorIR: 100, indicatorIS: 90, indicatorMA: 8.5, indicatorIN: 87.5 } as const;

function raAverage(cases: RACase[], field: keyof typeof RA_TARGETS) {
  const values = cases.map((item) => item[field]).filter((value): value is number => typeof value === 'number').map((value) => field === 'indicatorMA' ? value : value <= 10 ? value * 10 : value);
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function scoreOnTen(value: number) {
  return value > 10 ? value / 10 : value;
}

function raMetric(label: string, weight: string, value: number | null, meta: number, suffix = '%') {
  const achieved = value !== null && value >= meta;
  return `<tr><td>${escapeHtml(label)}</td><td class="center">${escapeHtml(weight)}</td><td class="center">${value === null ? '—' : `${value.toFixed(1)}${suffix}`}</td><td class="center">${meta}${suffix}</td><td class="center"><span class="pill ${value === null ? 'pill-orange' : achieved ? 'pill-green' : 'pill-red'}">${value === null ? 'Sem dado' : achieved ? 'Meta atingida' : 'Abaixo da meta'}</span></td></tr>`;
}

export function buildRaReport(cases: RACase[]) {
  const resolved = cases.filter((item) => item.status === 'Resolvido').length;
  const belowMeta = cases.filter((item) => (typeof item.finalScore === 'number' && scoreOnTen(item.finalScore) < RA_TARGETS.indicatorMA) || item.status !== 'Resolvido');
  const scoreValues = cases.map((item) => item.finalScore).filter((value): value is number => typeof value === 'number');
  const averageScore = scoreValues.length ? scoreValues.reduce((sum, value) => sum + scoreOnTen(value), 0) / scoreValues.length : null;
  const caseRows = belowMeta.slice(0, 12).map((item) => `<tr><td>${escapeHtml(item.raNumber)}</td><td>${escapeHtml(item.customerName)}</td><td>${escapeHtml(item.status)}</td><td>${item.finalScore === null || item.finalScore === undefined ? '—' : scoreOnTen(item.finalScore).toFixed(1)}</td><td>${escapeHtml(item.information || 'Sem observação')}</td></tr>`).join('');

  return shell('Relatório Estratégico RA', 'Reclame Aqui · Consolidado dos registros reais', `
    <header class="header"><div class="brand">FOTUS DISTRIBUIDORA SOLAR</div><h1>Relatório Estratégico RA</h1><p class="subtitle">Indicadores e tratativas do Reclame Aqui · Emitido em ${escapeHtml(reportDate())}</p></header>
    <div class="kpis"><div class="kpi"><div class="kpi-label">Total de reclamações</div><div class="kpi-value">${cases.length}</div></div><div class="kpi"><div class="kpi-label">Finalizados</div><div class="kpi-value">${resolved}</div></div><div class="kpi"><div class="kpi-label">Nota média</div><div class="kpi-value">${averageScore === null ? '—' : `${averageScore.toFixed(1)} / 10`}</div></div></div>
    <div class="section-title">Indicadores do mês</div><table><thead><tr><th>Índice</th><th class="center">Peso</th><th class="center">Real</th><th class="center">Meta</th><th class="center">Farol</th></tr></thead><tbody>${raMetric('Resposta (IR)', '20%', raAverage(cases, 'indicatorIR'), RA_TARGETS.indicatorIR)}${raMetric('Solução (IS)', '30%', raAverage(cases, 'indicatorIS'), RA_TARGETS.indicatorIS)}${raMetric('Nota do consumidor (MA)', '30%', raAverage(cases, 'indicatorMA'), RA_TARGETS.indicatorMA, '')}${raMetric('Voltaria a negociar (IN)', '20%', raAverage(cases, 'indicatorIN'), RA_TARGETS.indicatorIN)}</tbody></table>
    <div class="callout"><strong>Leitura estratégica:</strong> ${cases.length ? `${resolved} de ${cases.length} reclamações estão finalizadas${averageScore === null ? '' : ` e a nota média dos casos avaliados é ${averageScore.toFixed(1)}`}.` : 'Ainda não há reclamações reais cadastradas para análise.'}</div>
    <div class="section-title">Casos que pedem atenção</div><table><thead><tr><th>Pedido RA</th><th>Cliente</th><th>Status</th><th>Nota</th><th>Entendimento / observação</th></tr></thead><tbody>${caseRows || '<tr><td colspan="5" class="center muted">Nenhum caso abaixo da meta</td></tr>'}</tbody></table>
    <div class="page-break"></div><header class="header"><div class="brand">FOTUS · Análise de jornada</div><h1>Leitura complementar</h1><p class="subtitle">Base completa e próximos focos de acompanhamento.</p></header>
    <div class="section-title">Comparativo e próximos focos</div><div class="mini-chart"><div class="chart-col"><div class="chart-bar" style="height:${Math.max(3, cases.length ? Math.round((resolved / cases.length) * 78) : 3)}px"></div><span class="chart-label">Finalizados</span></div><div class="chart-col"><div class="chart-bar" style="background:linear-gradient(#f6b15d,#c66d16);height:${Math.max(3, cases.length ? Math.round(((cases.length - resolved) / cases.length) * 78) : 3)}px"></div><span class="chart-label">Em aberto</span></div></div><div class="stat-list"><div class="stat-row"><span>Reclamações em aberto ou andamento</span><strong>${cases.filter((item) => item.status === 'Aberto' || item.status === 'Em Andamento').length}</strong></div><div class="stat-row"><span>Casos com nota registrada</span><strong>${scoreValues.length}</strong></div><div class="stat-row"><span>Casos sem nota registrada</span><strong>${cases.length - scoreValues.length}</strong></div><div class="stat-row"><span>Taxa de finalização</span><strong>${cases.length ? Math.round((resolved / cases.length) * 100) : 0}%</strong></div></div>
    <div class="callout"><strong>Recomendação:</strong> priorizar os casos em aberto, registrar os quatro indicadores em cada nova tratativa e revisar os casos listados como “pedem atenção” antes do próximo fechamento.</div>`);
}

export function openA4PrintWindow(title: string, html: string) {
  // Keep the popup handle so the generated A4 document can be written and printed.
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) return false;
  printWindow.document.title = title;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
