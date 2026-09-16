import { strToU8, zipSync } from 'fflate';
import type { ExtraCost, Occurrence, RACase } from '../types';
import { calculateRaReputation, customerScoreValue, wouldDoBusinessValue } from './raReputation';

type CellValue = string | number | boolean | null | undefined;
type CellFormat = 'text' | 'integer' | 'decimal' | 'currency' | 'percent';

interface ExcelColumn {
  key: string;
  label: string;
  width?: number;
  format?: CellFormat;
}

interface WorkbookOptions {
  filename: string;
  title: string;
  period: string;
  summary: Array<{ label: string; value: CellValue; format?: CellFormat }>;
  columns: ExcelColumn[];
  rows: Array<Record<string, CellValue>>;
}

const xmlEscape = (value: unknown) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');

function columnName(index: number) {
  let value = index + 1;
  let result = '';
  while (value > 0) {
    value -= 1;
    result = String.fromCharCode(65 + (value % 26)) + result;
    value = Math.floor(value / 26);
  }
  return result;
}

function styleId(format: CellFormat = 'text') {
  return format === 'currency' ? 5 : format === 'decimal' ? 6 : format === 'integer' ? 7 : format === 'percent' ? 8 : 4;
}

function cellXml(reference: string, value: CellValue, style = 4) {
  if (value === null || value === undefined || value === '') return `<c r="${reference}" s="${style}"/>`;
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${reference}" s="${style}" t="n"><v>${value}</v></c>`;
  const display = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : String(value);
  return `<c r="${reference}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEscape(display)}</t></is></c>`;
}

function dataSheetXml(options: WorkbookOptions) {
  const lastColumn = columnName(Math.max(0, options.columns.length - 1));
  const rows = [
    `<row r="1" ht="27" customHeight="1">${cellXml('A1', options.title, 1)}</row>`,
    `<row r="2" ht="20" customHeight="1">${cellXml('A2', `Período: ${options.period} · Gerado em ${new Date().toLocaleString('pt-BR')}`, 2)}</row>`,
    '<row r="3" ht="8" customHeight="1"/>',
    `<row r="4" ht="24" customHeight="1">${options.columns.map((column, index) => cellXml(`${columnName(index)}4`, column.label, 3)).join('')}</row>`,
    ...options.rows.map((row, rowIndex) => {
      const excelRow = rowIndex + 5;
      return `<row r="${excelRow}" ht="21" customHeight="1">${options.columns.map((column, columnIndex) => cellXml(`${columnName(columnIndex)}${excelRow}`, row[column.key], styleId(column.format))).join('')}</row>`;
    }),
  ].join('');
  const lastRow = Math.max(4, options.rows.length + 4);
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="4" topLeftCell="A5" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols>${options.columns.map((column, index) => `<col min="${index + 1}" max="${index + 1}" width="${column.width || 16}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData><autoFilter ref="A4:${lastColumn}${lastRow}"/><mergeCells count="2"><mergeCell ref="A1:${lastColumn}1"/><mergeCell ref="A2:${lastColumn}2"/></mergeCells><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}

function summarySheetXml(options: WorkbookOptions) {
  const rows = [
    `<row r="1" ht="27" customHeight="1">${cellXml('A1', options.title, 1)}</row>`,
    `<row r="2" ht="20" customHeight="1">${cellXml('A2', `Resumo do período: ${options.period}`, 2)}</row>`,
    '<row r="3" ht="8" customHeight="1"/>',
    `<row r="4" ht="24" customHeight="1">${cellXml('A4', 'Indicador', 3)}${cellXml('B4', 'Valor', 3)}</row>`,
    ...options.summary.map((item, index) => `<row r="${index + 5}" ht="22" customHeight="1">${cellXml(`A${index + 5}`, item.label, 4)}${cellXml(`B${index + 5}`, item.value, styleId(item.format))}</row>`),
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="34" customWidth="1"/><col min="2" max="2" width="24" customWidth="1"/></cols><sheetData>${rows}</sheetData><mergeCells count="2"><mergeCell ref="A1:D1"/><mergeCell ref="A2:D2"/></mergeCells><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.2" footer="0.2"/></worksheet>`;
}

const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="4"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/><numFmt numFmtId="165" formatCode="0.0"/><numFmt numFmtId="166" formatCode="0"/><numFmt numFmtId="167" formatCode="0.0%"/></numFmts><fonts count="4"><font><sz val="10"/><name val="Aptos"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="16"/><name val="Aptos Display"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="10"/><name val="Aptos"/></font><font><color rgb="FF52606D"/><sz val="9"/><name val="Aptos"/></font></fonts><fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF123E5B"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FF385041"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF3F7F3"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFE1E7E2"/></left><right style="thin"><color rgb="FFE1E7E2"/></right><top style="thin"><color rgb="FFE1E7E2"/></top><bottom style="thin"><color rgb="FFE1E7E2"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/><xf numFmtId="167" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;

function downloadWorkbook(options: WorkbookOptions) {
  const entries: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>'),
    '_rels/.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>'),
    'docProps/core.xml': strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>${xmlEscape(options.title)}</dc:title><dc:creator>Fotus CX</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString()}</dcterms:created></cp:coreProperties>`),
    'docProps/app.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Fotus CX</Application></Properties>'),
    'xl/workbook.xml': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Resumo" sheetId="1" r:id="rId1"/><sheet name="Dados" sheetId="2" r:id="rId2"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': strToU8(stylesXml),
    'xl/worksheets/sheet1.xml': strToU8(summarySheetXml(options)),
    'xl/worksheets/sheet2.xml': strToU8(dataSheetXml(options)),
  };
  const zippedWorkbook = new Uint8Array(zipSync(entries, { level: 6 }));
  const blob = new Blob([zippedWorkbook], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = options.filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const fileDate = () => new Date().toISOString().slice(0, 10);

export function exportOccurrencesExcel(items: Occurrence[], period: string) {
  const finalized = items.filter((item) => item.stage === 'Finalizada').length;
  const damageTotal = items.reduce((sum, item) => sum + (item.damageAmount || 0), 0);
  downloadWorkbook({
    filename: `ocorrencias-${fileDate()}.xlsx`, title: 'Controle de Ocorrências', period,
    summary: [{ label: 'Total de ocorrências', value: items.length, format: 'integer' }, { label: 'Finalizadas', value: finalized, format: 'integer' }, { label: 'Em aberto', value: items.length - finalized, format: 'integer' }, { label: 'Custo de avarias', value: damageTotal, format: 'currency' }],
    columns: [
      { key: 'date', label: 'Data', width: 13 }, { key: 'agent', label: 'Agente', width: 22 }, { key: 'company', label: 'Empresa', width: 32 }, { key: 'state', label: 'UF', width: 8 }, { key: 'city', label: 'Cidade', width: 20 }, { key: 'region', label: 'Região', width: 16 }, { key: 'order', label: 'Nº Pedido', width: 18 }, { key: 'unique', label: 'Nº Único', width: 18 }, { key: 'sac', label: 'Cód. SAC', width: 14 }, { key: 'type', label: 'Tipo de ocorrência', width: 24 }, { key: 'product', label: 'Produto', width: 28 }, { key: 'quantity', label: 'Quantidade', width: 12, format: 'integer' }, { key: 'stage', label: 'Etapa', width: 18 }, { key: 'approval', label: 'Aprovação', width: 14 }, { key: 'carrier', label: 'Transportadora', width: 28 }, { key: 'damage', label: 'Avaria', width: 10 }, { key: 'damageAmount', label: 'Valor da avaria', width: 17, format: 'currency' }, { key: 'consultant', label: 'Consultor', width: 22 }, { key: 'comments', label: 'Comentários', width: 45 },
    ],
    rows: items.map((item) => ({ date: item.date, agent: item.agentName, company: item.companyName, state: item.state, city: item.city || '', region: item.region, order: item.orderNumber, unique: item.uniqueNumber, sac: item.sacCode, type: item.occurrenceType, product: item.product, quantity: item.quantity, stage: item.stage, approval: item.approvalStatus, carrier: item.carrier, damage: item.isDamage ? 'Sim' : 'Não', damageAmount: item.damageAmount || 0, consultant: item.consultant, comments: item.comments })),
  });
}

export function exportExtraCostsExcel(items: ExtraCost[], period: string) {
  const total = items.reduce((sum, item) => sum + item.totalCost, 0);
  downloadWorkbook({
    filename: `custos-extras-${fileDate()}.xlsx`, title: 'Controle de Custos Extras', period,
    summary: [{ label: 'Quantidade de registros', value: items.length, format: 'integer' }, { label: 'Custo total', value: total, format: 'currency' }, { label: 'Custo médio', value: items.length ? total / items.length : 0, format: 'currency' }, { label: 'Responsabilidade Comercial', value: items.filter((item) => item.responsible === 'Comercial').reduce((sum, item) => sum + item.totalCost, 0), format: 'currency' }],
    columns: [
      { key: 'date', label: 'Data', width: 13 }, { key: 'order', label: 'Pedido', width: 18 }, { key: 'regional', label: 'Regional', width: 20 }, { key: 'product', label: 'Produto', width: 32 }, { key: 'quantity', label: 'Quantidade', width: 12, format: 'integer' }, { key: 'origin', label: 'Origem', width: 20 }, { key: 'productCost', label: 'Custo produto', width: 17, format: 'currency' }, { key: 'logisticsCost', label: 'Custo logística', width: 17, format: 'currency' }, { key: 'taxCost', label: 'Impostos', width: 15, format: 'currency' }, { key: 'totalCost', label: 'Custo total', width: 17, format: 'currency' }, { key: 'responsible', label: 'Responsável', width: 16 }, { key: 'category', label: 'Causa raiz', width: 24 }, { key: 'reason', label: 'Motivo detalhado', width: 50 },
    ],
    rows: items.map((item) => ({ date: item.date, order: item.orderNumber, regional: item.regional, product: item.product, quantity: item.quantity, origin: item.origin, productCost: item.productCost, logisticsCost: item.logisticsCost, taxCost: item.taxCost, totalCost: item.totalCost, responsible: item.responsible, category: item.reasonCategory, reason: item.detailedReason })),
  });
}

export function exportRaExcel(items: RACase[], period: string) {
  const reputation = calculateRaReputation(items);
  downloadWorkbook({
    filename: `reclame-aqui-${fileDate()}.xlsx`, title: 'Relatório Reclame Aqui', period,
    summary: [{ label: 'Total de reclamações', value: items.length, format: 'integer' }, { label: 'Taxa de resposta', value: reputation.responseRate / 100, format: 'percent' }, { label: 'Índice de solução', value: reputation.solutionRate / 100, format: 'percent' }, { label: 'Nota média do cliente', value: reputation.customerScore, format: 'decimal' }, { label: 'Voltaria a fazer negócio', value: reputation.wouldDoBusinessRate === null ? null : reputation.wouldDoBusinessRate / 100, format: 'percent' }, { label: 'Reputação calculada', value: reputation.finalScore, format: 'decimal' }, { label: 'Classificação', value: reputation.classification }],
    columns: [
      { key: 'date', label: 'Data', width: 20 }, { key: 'ra', label: 'Nº Reclamação', width: 20 }, { key: 'customer', label: 'Consumidor', width: 28 }, { key: 'phone', label: 'Telefone', width: 18 }, { key: 'email', label: 'E-mail', width: 28 }, { key: 'status', label: 'Status', width: 18 }, { key: 'score', label: 'Nota do cliente', width: 17, format: 'decimal' }, { key: 'return', label: 'Voltaria a fazer negócio', width: 23 }, { key: 'assignee', label: 'Responsável', width: 24 }, { key: 'information', label: 'Relato e tratativa', width: 55 },
    ],
    rows: items.map((item) => ({ date: new Date(item.createdAt).toLocaleString('pt-BR'), ra: item.raNumber, customer: item.customerName, phone: item.phone, email: item.email, status: item.status, score: customerScoreValue(item), return: wouldDoBusinessValue(item) === null ? 'Sem resposta' : wouldDoBusinessValue(item) ? 'Sim' : 'Não', assignee: item.assigneeName || item.assigneeEmail || '', information: item.information })),
  });
}
