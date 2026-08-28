import { User } from 'firebase/auth';
import { readSheet } from 'read-excel-file/browser';
import { ExtraCost, ExtraCostResponsible } from '../types';
import { db, doc, writeBatch } from './firebase';
import { monthYearFromDate, totalExtraCost } from './extraCosts';

const SHEET_NAME = 'Base de Dados';
const BATCH_SIZE = 400;

type ImportedExtraCost = Omit<ExtraCost, 'id'> & { id: string };

function text(cell: unknown) {
  if (cell === null || cell === undefined) return '';
  return String(cell).replace(/\s+/g, ' ').trim();
}

function normalized(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function spreadsheetDate(cell: unknown) {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) return formatDate(cell);
  if (typeof cell === 'number' && Number.isFinite(cell)) {
    return formatDate(new Date(Date.UTC(1899, 11, 30) + cell * 86_400_000));
  }
  const value = text(cell);
  const brDate = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (brDate) {
    const [, day, month, rawYear] = brDate;
    return `${rawYear.length === 2 ? `20${rawYear}` : rawYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return value.match(/^\d{4}-\d{2}-\d{2}/)?.[0] || '';
}

function integer(cell: unknown) {
  const parsed = typeof cell === 'number' ? cell : Number(text(cell).replace(',', '.'));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function money(cell: unknown) {
  if (typeof cell === 'number' && Number.isFinite(cell)) return Number(cell.toFixed(2));
  let value = text(cell).replace(/R\$/gi, '').replace(/\s/g, '');
  if (!value) return 0;
  const comma = value.lastIndexOf(',');
  const dot = value.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    value = comma > dot ? value.replace(/\./g, '').replace(',', '.') : value.replace(/,/g, '');
  } else if (comma >= 0) {
    value = value.replace(',', '.');
  }
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? Number(parsed.toFixed(2)) : 0;
}

function responsible(cell: unknown): ExtraCostResponsible {
  return normalized(text(cell)).includes('cliente') ? 'Cliente' : 'Comercial';
}

function createdAtFromDate(date: string, rowNumber: number) {
  const timestamp = Date.parse(`${date || '2000-01-01'}T12:00:00`);
  return (Number.isNaN(timestamp) ? Date.UTC(2000, 0, 1, 12) : timestamp) + rowNumber;
}

export async function readExtraCostsSpreadsheet(file: File, currentUser: User) {
  const rows = await readSheet(file, SHEET_NAME);
  const header = rows[0] || [];
  if (normalized(text(header[0])) !== 'data' || normalized(text(header[1])) !== 'pedido') {
    throw new Error(`A aba “${SHEET_NAME}” não possui o cabeçalho esperado da planilha de custos.`);
  }

  const imported: ImportedExtraCost[] = [];
  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const orderNumber = text(row[1]);
    if (!orderNumber || normalized(orderNumber) === 'total') return;

    const date = spreadsheetDate(row[0]);
    const productCost = money(row[6]);
    const logisticsCost = money(row[7]);
    const taxCost = money(row[8]);
    const createdAt = createdAtFromDate(date, rowNumber);

    imported.push({
      id: `xlsx_custo_extra_${String(rowNumber).padStart(4, '0')}`,
      date,
      orderNumber,
      regional: text(row[2]),
      product: text(row[3]),
      quantity: integer(row[4]),
      origin: text(row[5]),
      productCost,
      logisticsCost,
      taxCost,
      totalCost: totalExtraCost(productCost, logisticsCost, taxCost),
      responsible: responsible(row[10]),
      reasonCategory: text(row[11]),
      detailedReason: text(row[12]),
      monthYear: monthYearFromDate(date),
      createdByEmail: currentUser.email || '',
      createdByName: currentUser.displayName || currentUser.email || 'Importação da planilha',
      importSource: file.name,
      importRow: rowNumber,
      createdAt,
      updatedAt: createdAt,
    });
  });

  if (!imported.length) throw new Error('Nenhum custo extra preenchido foi encontrado nessa planilha.');
  return imported;
}

export async function saveImportedExtraCosts(
  costs: ImportedExtraCost[],
  onProgress?: (saved: number, total: number) => void,
) {
  let saved = 0;
  for (let start = 0; start < costs.length; start += BATCH_SIZE) {
    const currentBatch = costs.slice(start, start + BATCH_SIZE);
    const batch = writeBatch(db);
    currentBatch.forEach(({ id, ...cost }) => {
      batch.set(doc(db, 'extra_costs', id), cost, { merge: true });
    });
    await batch.commit();
    saved += currentBatch.length;
    onProgress?.(saved, costs.length);
  }
  return saved;
}
