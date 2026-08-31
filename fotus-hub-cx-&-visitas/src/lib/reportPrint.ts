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
    body { margin: 0; color: #23272b; font-family: Arial, Helvetica, sans-serif; font-size: 9.5px; line-height: 1.35; background: #fff; }
    .page { width: 100%; }
    .hero { background: #24567f; border-bottom: 5px solid #f5a623; color: #fff; margin: -12mm -13mm 18px; padding: 16mm 13mm 13mm; }
    .hero .brand { color: #f5a623; }
    .hero h1 { color: #fff; }
    .plain-header { margin-bottom: 14px; }
    .plain-header h1 { color: #0d0d0d; font-size: 21px; }
    .brand { color: #24567f; font-size: 9px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
    h1 { color: #24567f; font-size: 23px; line-height: 1.05; margin: 6px 0 5px; }
    .subtitle { color: #d8e4ed; font-size: 9.5px; margin: 0; }
    .plain-header .subtitle { color: #4f5358; }
    .muted { color: #737a80; }
    .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; margin: 0 0 14px; }
    .kpi { border-right: 1px solid #e2e8ed; padding: 11px; text-align: center; background: #f3f6f8; }
    .kpi:first-child { border-radius: 5px 0 0 5px; }
    .kpi:last-child { border-right: 0; border-radius: 0 5px 5px 0; background: #fff0d7; }
    .kpi-label { color: #6d747b; font-size: 7.5px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
    .kpi-value { color: #24567f; font-size: 18px; font-weight: 800; margin-bottom: 2px; }
    .section-title, .band { background: #e7eff5; color: #24567f; font-size: 10.5px; font-weight: 800; letter-spacing: .03em; margin: 14px 0 7px; padding: 6px 9px; text-transform: uppercase; }
    .band-blue { background: #2878b7; color: #fff; text-transform: none; font-size: 12px; }
    .band-navy { background: #173f6b; color: #fff; text-transform: none; font-size: 12px; }
    .band-orange { background: #df8b19; color: #fff; text-transform: none; font-size: 12px; }
    .band-red { background: #c7382c; color: #fff; text-transform: none; font-size: 12px; }
    .callout { border: 1px solid #d7d7d7; background: #fff; color: #24282c; padding: 9px 11px; margin: 0 0 13px; }
    .positive { color: #00a84f; font-weight: 800; margin: 7px 0 12px; }
    .note { color: #6e7378; font-size: 8px; font-style: italic; margin: -5px 0 12px; }
    table { border-collapse: collapse; width: 100%; margin: 5px 0 11px; }
    th { background: #24567f; color: #fff; font-size: 8px; font-weight: 800; padding: 5px 6px; text-align: left; }
    td { border: 1px solid #d9dde0; color: #2c3034; font-size: 8.3px; padding: 4px 6px; vertical-align: top; }
    tr:nth-child(even) td { background: #f5f7f8; }
    .total-row td { background: #e7eff5 !important; color: #24567f; font-weight: 800; }
    .right { text-align: right; }
    .center { text-align: center; }
    .pill { border-radius: 12px; display: inline-block; font-size: 8px; font-weight: 800; padding: 3px 7px; }
    .pill-green { background: #e8f6ed; color: #1d7a42; }
    .pill-red { background: #fff0ef; color: #b53b36; }
    .pill-orange { background: #fff4e5; color: #a45b12; }
    .grid-two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .stat-list { border: 1px solid #e0e7eb; border-radius: 6px; padding: 9px 10px; }
    .stat-row { display: flex; justify-content: space-between; gap: 8px; border-bottom: 1px solid #edf0f2; padding: 5px 0; }
    .stat-row:last-child { border-bottom: 0; }
    .bar-wrap { background: #e8edf0; border-radius: 4px; height: 6px; margin-top: 4px; overflow: hidden; }
    .bar { background: #4f7d62; height: 100%; }
    .report-chart { break-inside: avoid; border: 1px solid #e2e8f0; border-radius: 12px; background: #fbfcfe; margin: 9px 0 16px; padding: 14px 15px 12px; box-shadow: 0 8px 24px rgba(36, 61, 80, .06); }
    .chart-heading { align-items: center; display: flex; justify-content: space-between; margin-bottom: 7px; }
    .chart-title { color: #182434; font-size: 10.5px; font-weight: 800; }
    .chart-legend { align-items: center; color: #68758a; display: flex; font-size: 7.5px; font-weight: 700; gap: 11px; }
    .legend-bar, .legend-line, .legend-target { display: inline-block; margin-right: 4px; vertical-align: middle; }
    .legend-bar { background: #ef9200; border-radius: 2px 2px 0 0; height: 7px; width: 7px; }
    .legend-line { background: #ef9200; height: 2px; width: 12px; }
    .legend-target { border-top: 2px dashed #596cff; height: 1px; width: 12px; }
    .report-chart-svg { display: block; height: 155px; overflow: visible; width: 100%; }
    .chart-summary-grid { display: grid; gap: 5px; grid-template-columns: repeat(6, 1fr); margin-top: 8px; }
    .chart-summary-card { background: #fff; border: 1px solid #e5eaf0; border-radius: 7px; padding: 6px 7px; }
    .chart-summary-card strong { color: #182434; display: block; font-size: 9px; margin-top: 2px; }
    .chart-summary-card span { color: #8490a3; font-size: 6.8px; font-weight: 800; text-transform: uppercase; }
    .page-break { break-before: page; }
    .footer { color: #24567f; font-size: 8px; font-weight: 700; margin-top: 18px; padding-top: 7px; text-align: right; }
    @media screen { body { background: #eef2f4; padding: 22px; } .page { background: #fff; margin: 0 auto; max-width: 794px; min-height: 1123px; padding: 40px 44px; box-shadow: 0 4px 24px #152b3b22; } }
  </style></head><body><main class="page">${body}<div class="footer">Fotus Distribuidora Solar · Relatório gerado em ${escapeHtml(reportDate())}</div></main><script>window.addEventListener('load',function(){setTimeout(function(){window.print()},280)})</script></body></html>`;
}

interface ReportChartDatum {
  label: string;
  value: number;
  display: string;
}

function reportSmoothPath(points: Array<{ x: number; y: number }>) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  return points.slice(1).reduce((path, point, index) => {
    const previous = points[index];
    const middleX = (previous.x + point.x) / 2;
    return `${path} C ${middleX} ${previous.y}, ${middleX} ${point.y}, ${point.x} ${point.y}`;
  }, `M ${points[0].x} ${points[0].y}`);
}

function modernReportChart(title: string, data: ReportChartDatum[], target?: { label: string; value: number }) {
  if (!data.length) return `<div class="report-chart"><div class="chart-title">${escapeHtml(title)}</div><p class="muted center">Sem dados suficientes para montar o gráfico.</p></div>`;
  const width = 690;
  const top = 18;
  const bottom = 132;
  const max = Math.max(...data.map((item) => item.value), target?.value || 0, 1);
  const step = width / data.length;
  const barWidth = Math.min(22, step * .34);
  const points = data.map((item, index) => ({ x: step * index + step / 2, y: bottom - (item.value / max) * (bottom - top) }));
  const targetY = target ? bottom - (target.value / max) * (bottom - top) : null;
  const grid = [0, 1, 2, 3].map((line) => {
    const y = top + line * ((bottom - top) / 3);
    return `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="#dfe5ec" stroke-width="1" stroke-dasharray="3 5" />`;
  }).join('');
  const bars = data.map((item, index) => {
    const height = item.value ? Math.max(2, (item.value / max) * (bottom - top)) : 0;
    return `<rect x="${points[index].x - barWidth / 2}" y="${bottom - height}" width="${barWidth}" height="${height}" rx="5" fill="#ef9200" opacity=".95" />`;
  }).join('');
  const labels = data.map((item, index) => `<text x="${points[index].x}" y="151" text-anchor="middle" fill="#617087" font-size="7" font-weight="700">${escapeHtml(item.label)}</text>`).join('');
  const cards = data.map((item) => `<div class="chart-summary-card"><span>${escapeHtml(item.label)}</span><strong>${escapeHtml(item.display)}</strong></div>`).join('');
  return `<div class="report-chart"><div class="chart-heading"><div class="chart-title">${escapeHtml(title)}</div><div class="chart-legend"><span><i class="legend-bar"></i>Realizado</span><span><i class="legend-line"></i>Tendência</span>${target ? `<span><i class="legend-target"></i>${escapeHtml(target.label)}</span>` : ''}</div></div><svg class="report-chart-svg" viewBox="0 0 ${width} 158" preserveAspectRatio="none" aria-label="${escapeHtml(title)}">${grid}${bars}<path d="${reportSmoothPath(points)}" fill="none" stroke="#ef9200" stroke-width="3" stroke-linecap="round" />${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="3.5" fill="#fff" stroke="#ef9200" stroke-width="2.5" />`).join('')}${targetY !== null ? `<line x1="0" y1="${targetY}" x2="${width}" y2="${targetY}" stroke="#596cff" stroke-width="2" stroke-dasharray="7 6" />` : ''}${labels}</svg><div class="chart-summary-grid">${cards}</div></div>`;
}

function topValues(items: ExtraCost[], selector: (item: ExtraCost) => string, limit = 8) {
  const grouped = new Map<string, { label: string; total: number; count: number }>();
  items.forEach((item) => {
    const label = selector(item).trim() || 'Não informado';
    const key = label.toLocaleUpperCase('pt-BR');
    const current = grouped.get(key);
    grouped.set(key, { label: current?.label || label, total: (current?.total || 0) + item.totalCost, count: (current?.count || 0) + 1 });
  });
  return [...grouped.values()].sort((a, b) => b.total - a.total).slice(0, limit);
}

export function buildExtraCostsReport(costs: ExtraCost[]) {
  const total = costs.reduce((sum, item) => sum + item.totalCost, 0);
  const months = topValues(costs, (item) => item.monthYear, 12).sort((a, b) => a.label.localeCompare(b.label));
  const latestMonthKey = months[months.length - 1]?.label || '';
  const latestMonthCosts = costs.filter((item) => item.monthYear === latestMonthKey);
  const latestMonthTotal = latestMonthCosts.reduce((sum, item) => sum + item.totalCost, 0);
  const latestMonthName = latestMonthKey ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${latestMonthKey}-01T12:00:00`)) : 'período atual';
  const periodStart = months[0]?.label ? new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(`${months[0].label}-01T12:00:00`)) : 'início';
  const periodEnd = latestMonthKey ? new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${latestMonthKey}-01T12:00:00`)) : 'atual';
  const detailRows = latestMonthCosts.slice().sort((a, b) => a.date.localeCompare(b.date)).map((item) => `<tr><td>${escapeHtml(dateLabel(item.date))}</td><td>${escapeHtml(item.orderNumber)}</td><td>${escapeHtml(item.regional)}</td><td>${escapeHtml(item.product)}${item.quantity ? ` ×${item.quantity}` : ''}</td><td>${escapeHtml(item.responsible)}</td><td class="right">${currency(item.totalCost)}</td></tr>`).join('');
  const responsibleRows = topValues(latestMonthCosts, (item) => item.responsible).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');
  const regionalRows = topValues(latestMonthCosts, (item) => item.regional).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');
  const causeRows = topValues(latestMonthCosts, (item) => item.reasonCategory).map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');
  const monthlyRows = months.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="center">${item.count}</td><td class="right">${currency(item.total)}</td></tr>`).join('');

  return shell('Relatório de Custos Extras', 'Comercial e Cliente · Consolidado dos registros reais', `
    <header class="hero"><div class="brand">Custos extras · Fotus CX</div><h1>Relatório de Custos Extras</h1><p class="subtitle">Comercial e Cliente · Consolidado ${escapeHtml(periodStart)}–${escapeHtml(periodEnd)} · Emitido em ${escapeHtml(reportDate())}</p></header>
    <div class="kpis"><div class="kpi"><div class="kpi-value">${currency(total)}</div><div class="kpi-label">Custo total do período</div></div><div class="kpi"><div class="kpi-value">${costs.length}</div><div class="kpi-label">Ocorrências no período</div></div><div class="kpi"><div class="kpi-value">${currency(latestMonthTotal)}</div><div class="kpi-label">Custo em ${escapeHtml(latestMonthName)}</div></div></div>
    <div class="section-title">Visão geral · ${escapeHtml(periodStart)} a ${escapeHtml(periodEnd)}</div><table><thead><tr><th>Mês</th><th class="center">Qtd. Ocorrências</th><th class="right">Custo Total</th></tr></thead><tbody>${monthlyRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}<tr class="total-row"><td>Total consolidado</td><td class="center">${costs.length}</td><td class="right">${currency(total)}</td></tr></tbody></table>
    ${modernReportChart('Evolução de Ocorrências por Mês', months.map((item) => ({ label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${item.label}-01T12:00:00`)).replace('.', ''), value: item.count, display: `${item.count} registros` })))}
    ${modernReportChart('Evolução de Valor por Mês', months.map((item) => ({ label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${item.label}-01T12:00:00`)).replace('.', ''), value: item.total, display: currency(item.total).replace(',00', '') })))}
    <div class="page-break"></div><div class="section-title" style="background:#fff0d7;color:#b76400">Foco do mês · ${escapeHtml(latestMonthName)}</div>
    <div class="section-title">1. Detalhamento de ${escapeHtml(latestMonthName)}</div><table><thead><tr><th>Data</th><th>Pedido</th><th>Regional</th><th>Produto</th><th>Responsável</th><th class="right">Valor</th></tr></thead><tbody>${detailRows || '<tr><td colspan="6" class="center muted">Sem registros</td></tr>'}<tr class="total-row"><td colspan="5">Total do mês</td><td class="right">${currency(latestMonthTotal)}</td></tr></tbody></table>
    <div class="section-title">2. Custo por responsável</div><table><thead><tr><th>Responsável</th><th class="center">Qtd.</th><th class="right">Valor</th></tr></thead><tbody>${responsibleRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}<tr class="total-row"><td>Total</td><td class="center">${latestMonthCosts.length}</td><td class="right">${currency(latestMonthTotal)}</td></tr></tbody></table><p class="note">Comercial = custo por erro interno · Cliente = bonificação ou relacionamento.</p>
    <div class="section-title">3. Custo por causa raiz e por regional</div><div class="grid-two"><table><thead><tr><th>Causa raiz</th><th class="center">Qtd.</th><th class="right">Valor</th></tr></thead><tbody>${causeRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}</tbody></table><table><thead><tr><th>Regional</th><th class="center">Qtd.</th><th class="right">Valor</th></tr></thead><tbody>${regionalRows || '<tr><td colspan="3" class="center muted">Sem dados</td></tr>'}</tbody></table></div><table><tbody><tr class="total-row"><td>Total · ${escapeHtml(latestMonthName)}</td><td class="center">${latestMonthCosts.length} ocorrências</td><td class="right">${currency(latestMonthTotal)}</td></tr></tbody></table>`);
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
  const achievedMetrics = [
    raAverage(cases, 'indicatorIR') !== null && (raAverage(cases, 'indicatorIR') || 0) >= RA_TARGETS.indicatorIR,
    raAverage(cases, 'indicatorIS') !== null && (raAverage(cases, 'indicatorIS') || 0) >= RA_TARGETS.indicatorIS,
    raAverage(cases, 'indicatorMA') !== null && (raAverage(cases, 'indicatorMA') || 0) >= RA_TARGETS.indicatorMA,
    raAverage(cases, 'indicatorIN') !== null && (raAverage(cases, 'indicatorIN') || 0) >= RA_TARGETS.indicatorIN,
  ].filter(Boolean).length;
  const monthGroups = new Map<string, number[]>();
  cases.forEach((item) => {
    if (typeof item.finalScore !== 'number' || !item.createdAt) return;
    const date = new Date(item.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthGroups.set(key, [...(monthGroups.get(key) || []), scoreOnTen(item.finalScore)]);
  });
  const scoreMonths = [...monthGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-7).map(([key, values]) => ({ key, value: values.reduce((sum, value) => sum + value, 0) / values.length }));
  const now = new Date();
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1).getTime();
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).getTime();
  const currentWindow = cases.filter((item) => item.createdAt >= sixMonthsAgo);
  const previousWindow = cases.filter((item) => item.createdAt >= twelveMonthsAgo && item.createdAt < sixMonthsAgo);
  const currentResolvedRate = currentWindow.length ? Math.round((currentWindow.filter((item) => item.status === 'Resolvido').length / currentWindow.length) * 100) : 0;
  const previousResolvedRate = previousWindow.length ? Math.round((previousWindow.filter((item) => item.status === 'Resolvido').length / previousWindow.length) * 100) : 0;

  return shell('Relatório Estratégico RA', 'Reclame Aqui · Consolidado dos registros reais', `
    <header class="plain-header"><h1>Relatório Estratégico RA · ${escapeHtml(new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date()))}</h1><p class="subtitle">Fotus Distribuidora Solar · Emitido em ${escapeHtml(reportDate())}</p><p style="font-weight:800;margin:7px 0 0">Total de Reclamações: ${cases.length} | Finalizados: ${resolved}</p></header>
    <div class="band band-blue">Indicadores do Mês</div><table><thead><tr><th>Índice</th><th class="center">Peso</th><th class="center">Real %</th><th class="center">Meta</th><th class="center">Farol</th></tr></thead><tbody>${raMetric('Resposta (IR)', '20%', raAverage(cases, 'indicatorIR'), RA_TARGETS.indicatorIR)}${raMetric('Solução (IS)', '30%', raAverage(cases, 'indicatorIS'), RA_TARGETS.indicatorIS)}${raMetric('Nota do consumidor (MA)', '30%', raAverage(cases, 'indicatorMA'), RA_TARGETS.indicatorMA, '')}${raMetric('Voltaria a negociar (IN)', '20%', raAverage(cases, 'indicatorIN'), RA_TARGETS.indicatorIN)}</tbody></table>
    <p class="positive">${achievedMetrics === 4 ? 'Os 4 índices bateram a meta do período.' : `${achievedMetrics} de 4 índices atingiram a meta do período.`}</p>
    <div class="band band-orange">Leitura Estratégica</div><div class="callout">${cases.length ? `O período encerra com ${resolved} de ${cases.length} casos finalizados. ${averageScore === null ? 'Ainda faltam avaliações para consolidar a Nota do Consumidor.' : `A média dos registros avaliados ficou em ${averageScore.toFixed(1)}, frente à meta de ${RA_TARGETS.indicatorMA}.`} Os indicadores consideram apenas clientes que responderam à avaliação; casos sem retorno não devem ser interpretados como sucesso.` : 'Ainda não há reclamações reais cadastradas para análise.'}</div>
    <div class="band band-red">Casos Abaixo da Meta</div><table><thead><tr><th>Pedido / RA</th><th>Cliente</th><th>Status</th><th>Nota</th><th>Entendimento</th></tr></thead><tbody>${caseRows || '<tr><td colspan="5" class="center muted">Nenhum caso abaixo da meta</td></tr>'}</tbody></table>
    <div class="band band-navy">Comparativo: janela anterior vs. janela atual</div>${modernReportChart('Reclame Aqui · Comparativo móvel de 6 meses', [{ label: 'Janela anterior', value: previousWindow.length, display: `${previousWindow.length} · ${previousResolvedRate}% resolvidos` }, { label: 'Janela atual', value: currentWindow.length, display: `${currentWindow.length} · ${currentResolvedRate}% resolvidos` }])}<p class="positive">Taxa de resolução: ${previousResolvedRate}% → ${currentResolvedRate}% (${currentResolvedRate - previousResolvedRate >= 0 ? '+' : ''}${currentResolvedRate - previousResolvedRate} p.p.)</p><p>A leitura compara duas janelas móveis de seis meses para reduzir distorções de um único mês e evidenciar a direção mais recente do atendimento.</p>
    <div class="page-break"></div>${modernReportChart('Nota do Consumidor (MA) · Evolução mês a mês', scoreMonths.map((item) => ({ label: new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(new Date(`${item.key}-01T12:00:00`)).replace('.', ''), value: item.value, display: item.value.toFixed(1) })), { label: `Meta ${RA_TARGETS.indicatorMA}`, value: RA_TARGETS.indicatorMA })}<p>A série mensal evidencia a estabilidade da experiência ao longo do tempo. Meses abaixo da meta devem ser cruzados com os casos listados na primeira página antes da definição das próximas tratativas.</p>`);
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
