import { User } from 'firebase/auth';
import { readSheet } from 'read-excel-file/browser';
import { db, doc, writeBatch } from './firebase';
import { getRegionFromState } from './occurrences';
import { Occurrence, OccurrenceApproval, OccurrenceStage } from '../types';

const SHEET_NAME = 'Controle de Ocorrências';
const BATCH_SIZE = 400;

type ImportedOccurrence = Omit<Occurrence, 'id'> & { id: string };

function text(cell: unknown) {
  if (cell === null || cell === undefined) return '';
  if (cell instanceof Date) return formatDate(cell);
  return String(cell).replace(/\s+/g, ' ').trim();
}

function normalized(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function formatDate(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return repairAmbiguousHistoricalDate(`${year}-${month}-${day}`);
}

/**
 * Some rows in the legacy workbook were entered as dd/mm/yyyy while Excel
 * stored them as mm/dd/yyyy. If that produces a future date with a day up to
 * 12, the only safe repair is to exchange the month and day.
 */
function repairAmbiguousHistoricalDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return value;
  const [, year, month, day] = match;
  const today = new Date();
  const candidate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  const isFuture = candidate.getTime() > Date.now() + 86_400_000;
  const monthIsAhead = Number(year) === today.getFullYear() && Number(month) > today.getMonth() + 1;
  if (isFuture && monthIsAhead && Number(day) <= 12) {
    return `${year}-${day}-${month}`;
  }
  return value;
}

function spreadsheetDate(cell: unknown) {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) return formatDate(cell);

  if (typeof cell === 'number' && Number.isFinite(cell)) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    return formatDate(new Date(excelEpoch + cell * 86_400_000));
  }

  const value = text(cell);
  const brDate = value.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2}|\d{4})$/);
  if (brDate) {
    const [, day, month, rawYear] = brDate;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    return repairAmbiguousHistoricalDate(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
  }

  const isoDate = value.match(/^\d{4}-\d{2}-\d{2}/);
  return isoDate?.[0] ? repairAmbiguousHistoricalDate(isoDate[0]) : '';
}

function quantity(cell: unknown) {
  if (typeof cell === 'number' && Number.isFinite(cell)) return Math.max(0, Math.round(cell));
  const value = text(cell).replace(/\./g, '').replace(',', '.');
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function stage(value: string): OccurrenceStage {
  const key = normalized(value);
  if (key.includes('conclu') || key.includes('finaliz')) return 'Finalizada';
  if (key.includes('andamento') || key === 'nao') return 'Em Análise';
  if (key.includes('aguard')) return 'Aguardando Retorno';
  return 'Recebida';
}

function approval(value: string): OccurrenceApproval {
  const key = normalized(value);
  if (key.includes('reprov')) return 'Reprovado';
  if (key.includes('aprov')) return 'Aprovado';
  return 'Pendente';
}

function createdAtFromDate(date: string, rowNumber: number) {
  const timestamp = Date.parse(`${date || '2000-01-01'}T12:00:00`);
  return (Number.isNaN(timestamp) ? Date.UTC(2000, 0, 1, 12) : timestamp) + rowNumber;
}

export async function readOccurrencesSpreadsheet(file: File, currentUser: User) {
  const rows = await readSheet(file, SHEET_NAME);
  const header = rows[0] || [];
  if (normalized(text(header[1])) !== 'data' || normalized(text(header[2])) !== 'agente') {
    throw new Error(`A aba “${SHEET_NAME}” não possui o cabeçalho esperado da planilha de controle.`);
  }

  const imported: ImportedOccurrence[] = [];

  rows.slice(1).forEach((row, index) => {
    const rowNumber = index + 2;
    const values = row.slice(1, 16).map(text);
    if (values.every((value) => !value)) return;

    const date = spreadsheetDate(row[1]);
    const agentName = text(row[2]);
    const companyName = text(row[3]);
    const state = text(row[4]).toUpperCase();
    const orderNumber = text(row[5]);
    const uniqueNumber = text(row[6]);
    const sacCode = text(row[7]);
    const occurrenceType = text(row[8]);
    const product = text(row[9]);
    const itemQuantity = quantity(row[10]);
    const occurrenceStage = stage(text(row[11]));
    const approvalStatus = approval(text(row[12]));
    const carrier = text(row[13]);
    const comments = text(row[14]);
    const consultant = text(row[15]);
    const createdAt = createdAtFromDate(date, rowNumber);

    imported.push({
      id: `xlsx_controle_cx_${String(rowNumber).padStart(4, '0')}`,
      date,
      agentName,
      companyName,
      state,
      region: getRegionFromState(state),
      orderNumber,
      uniqueNumber,
      sacCode,
      occurrenceType,
      product,
      quantity: itemQuantity,
      stage: occurrenceStage,
      approvalStatus,
      carrier,
      comments,
      consultant,
      isDamage: normalized(occurrenceType).includes('avari'),
      damageAmount: 0,
      city: '',
      organizationUnitId: null,
      routedToName: null,
      routedToEmail: null,
      createdByEmail: currentUser.email || '',
      createdByName: currentUser.displayName || currentUser.email || 'Importação da planilha',
      importSource: file.name,
      importRow: rowNumber,
      createdAt,
      updatedAt: createdAt,
    });
  });

  if (imported.length === 0) throw new Error('Nenhuma ocorrência preenchida foi encontrada nessa planilha.');
  return imported;
}

export async function saveImportedOccurrences(
  occurrences: ImportedOccurrence[],
  onProgress?: (saved: number, total: number) => void,
) {
  let saved = 0;

  for (let start = 0; start < occurrences.length; start += BATCH_SIZE) {
    const currentBatch = occurrences.slice(start, start + BATCH_SIZE);
    const batch = writeBatch(db);

    currentBatch.forEach(({ id, ...occurrence }) => {
      batch.set(doc(db, 'occurrences', id), occurrence, { merge: true });
    });

    await batch.commit();
    saved += currentBatch.length;
    onProgress?.(saved, occurrences.length);
  }

  return saved;
}
