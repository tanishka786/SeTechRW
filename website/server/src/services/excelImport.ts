/**
 * Excel column → MongoDB field → UI label
 *
 * Print queue sheet
 * Queue Id            → queueId        → Queue ID
 * Product ref         → productRef     → Product Ref
 * Product name        → productName    → Product Name
 * Product code        → productCode    → Product Code
 * Product type        → productType    → Product Type
 * Quantity            → quantity       → Quantity
 * Price               → price          → Price
 * USP                 → usp            → USP
 * QR value            → qrValue        → QR Value
 * Queued at (UTC)     → queuedAtUtc    → Queued At (UTC)
 *
 * Print summary sheet (metadata only, stored separately)
 * Row 1 title         → title          → Title
 * Rows: N             → rowsLabel      → Rows
 * Exported (UTC): ... → exportedAtUtc  → Exported At (UTC)
 */
import * as XLSX from 'xlsx';
import { ExcelCatalog } from '../models/ExcelCatalog';
import { PrintSummary } from '../models/PrintSummary';

const QUEUE_SHEET = 'Print queue';
const SUMMARY_SHEET = 'Print summary';

function text(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function number(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function buildLookupKeys(row: {
  queueId: string;
  productRef: string;
  productCode: string;
  qrValue: string;
}) {
  const keys = new Set<string>();
  const add = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    keys.add(trimmed);
    keys.add(trimmed.toLowerCase());
    keys.add(trimmed.toUpperCase());
  };
  add(row.queueId);
  add(row.productRef);
  add(row.productCode);
  add(row.qrValue);
  try {
    const url = new URL(row.qrValue);
    add(url.searchParams.get('r') ?? '');
    add(url.pathname.split('/').filter(Boolean).pop() ?? '');
  } catch {
    /* not a URL */
  }
  return [...keys].filter(Boolean);
}

function mapQueueRow(raw: Record<string, unknown>, sourceFile: string, importedAt: Date) {
  const queueId = text(raw['Queue Id']);
  const productRef = text(raw['Product ref']);
  const productName = text(raw['Product name']);
  const productCode = text(raw['Product code']);
  const qrValue = text(raw['QR value']);
  return {
    queueId,
    productRef,
    productName,
    productCode,
    productType: text(raw['Product type']),
    quantity: number(raw['Quantity']),
    price: number(raw['Price']),
    usp: text(raw['USP']),
    qrValue,
    queuedAtUtc: text(raw['Queued at (UTC)']),
    lookupKeys: buildLookupKeys({ queueId, productRef, productCode, qrValue }),
    rawRow: raw,
    sourceFile,
    sourceSheet: QUEUE_SHEET,
    importedAt,
  };
}

export async function importExcelBuffer(buffer: Buffer, sourceFile: string, actor?: string | null) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const importedAt = new Date();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;

  const queueSheet = workbook.Sheets[QUEUE_SHEET] ?? workbook.Sheets[workbook.SheetNames[0] ?? ''];
  if (!queueSheet) {
    throw new Error('The Excel file does not contain a Print queue sheet.');
  }

  const queueRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(queueSheet, { defval: '' });
  for (const raw of queueRows) {
    const mapped = mapQueueRow(raw, sourceFile, importedAt);
    if (!mapped.productRef && !mapped.qrValue) continue;
    const existing = await ExcelCatalog.findOne({ productRef: mapped.productRef, sourceSheet: QUEUE_SHEET });
    if (!existing) {
      await ExcelCatalog.create({ ...mapped, createdBy: actor ?? null, updatedBy: actor ?? null });
      inserted += 1;
      continue;
    }
    const same =
      existing.qrValue === mapped.qrValue &&
      existing.productName === mapped.productName &&
      existing.quantity === mapped.quantity;
    existing.set({ ...mapped, updatedBy: actor ?? null });
    await existing.save();
    if (same) unchanged += 1;
    else updated += 1;
  }

  const summarySheet = workbook.Sheets[SUMMARY_SHEET];
  if (summarySheet) {
    const aoa = XLSX.utils.sheet_to_json<string[]>(summarySheet, { header: 1, defval: '' });
    const title = text(aoa[0]?.[0]);
    const rowsLabel = text(aoa[1]?.[0]);
    const exportedAtUtc = text(aoa[2]?.[0]).replace(/^Exported \(UTC\):\s*/i, '');
    await PrintSummary.deleteMany({ sourceFile, sourceSheet: SUMMARY_SHEET });
    await PrintSummary.create({
      title,
      rowsLabel,
      exportedAtUtc,
      rawRow: { title, rowsLabel, exportedAtUtc },
      sourceFile,
      sourceSheet: SUMMARY_SHEET,
      importedAt,
    });
  }

  return {
    inserted,
    updated,
    unchanged,
    message: `Existing catalog records were updated, ${inserted} inserted, ${unchanged} unchanged.`,
  };
}
