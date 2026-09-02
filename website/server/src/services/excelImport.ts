/**
 * Supports both:
 * - Print queue: Queue Id, Product ref, Product name, Product code, Product type, Quantity, Price, USP, QR value
 * - Birla Carbon Demo Queue: Queue Id, Barcode, Quantity (e.g. 25kg), Price, USP, QR value
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSX from 'xlsx';
import { ExcelCatalog } from '../models/ExcelCatalog';
import { PrintSummary } from '../models/PrintSummary';

const QUEUE_SHEET = 'Print queue';
const SUMMARY_SHEET = 'Print summary';
const here = path.dirname(fileURLToPath(import.meta.url));

function text(value: unknown) {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function cell(raw: Record<string, unknown>, ...names: string[]) {
  const entries = Object.entries(raw);
  for (const name of names) {
    const direct = raw[name];
    if (direct !== undefined && text(direct)) return text(direct);
    const match = entries.find(([key]) => key.trim().toLowerCase() === name.trim().toLowerCase());
    if (match && text(match[1])) return text(match[1]);
  }
  return '';
}

export function parseKg(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = text(value).replace(/,/g, '').match(/(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : 0;
}

function addKey(keys: Set<string>, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return;
  keys.add(trimmed);
  keys.add(trimmed.toLowerCase());
  keys.add(trimmed.toUpperCase());
}

export function buildLookupKeys(row: {
  queueId: string;
  productRef: string;
  productCode: string;
  qrValue: string;
  barcode?: string;
}) {
  const keys = new Set<string>();
  addKey(keys, row.queueId);
  addKey(keys, row.productRef);
  addKey(keys, row.productCode);
  addKey(keys, row.barcode ?? '');
  addKey(keys, row.qrValue);
  const urlText = row.qrValue;
  try {
    const url = new URL(urlText);
    addKey(keys, url.pathname.split('/').filter(Boolean).pop() ?? '');
    addKey(keys, url.searchParams.get('r') ?? '');
    addKey(keys, url.searchParams.get('code') ?? '');
    addKey(keys, url.href);
    addKey(keys, `${url.host}${url.pathname}`);
  } catch {
    /* not a URL */
  }
  for (const token of urlText.match(/\d{4,}/g) ?? []) addKey(keys, token);
  return [...keys].filter(Boolean);
}

type ProductExtra = {
  product_name?: string;
  description?: string;
  category?: string;
  net_weight?: string;
  product_reference?: string;
  barcode?: string;
};

function loadProductExtras(): Map<string, ProductExtra> {
  const extras = new Map<string, ProductExtra>();
  const candidates = [
    path.resolve(here, '../../../qrGenerator/demo_products.json'),
    path.resolve(here, '../../../../qrGenerator/demo_products.json'),
    path.resolve(here, '../../data/demo_products.json'),
  ];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    try {
      const rows = JSON.parse(fs.readFileSync(file, 'utf8')) as ProductExtra[];
      for (const row of rows) {
        for (const key of [row.product_reference, row.barcode]) {
          if (key) extras.set(String(key).trim(), row);
        }
      }
      break;
    } catch {
      /* ignore extra catalog */
    }
  }
  return extras;
}

function mapQueueRow(
  raw: Record<string, unknown>,
  sourceFile: string,
  sourceSheet: string,
  importedAt: Date,
  extras: Map<string, ProductExtra>,
) {
  const barcode = cell(raw, 'Barcode', 'Product ref', 'Product code', 'product_reference');
  const productRef = cell(raw, 'Product ref', 'Barcode', 'Product code') || barcode;
  const extra = extras.get(productRef) ?? extras.get(barcode);
  const productName =
    cell(raw, 'Product name', 'product_name') || extra?.product_name || (productRef ? `Birla Carbon ${productRef}` : '');
  const qrValue = cell(raw, 'QR value', 'QR Value', 'URL', 'qrValue');
  const quantity = parseKg(cell(raw, 'Quantity', 'Net weight', 'net_weight') || extra?.net_weight);
  return {
    queueId: cell(raw, 'Queue Id', 'Queue ID') || productRef,
    productRef,
    productName,
    productCode: cell(raw, 'Product code', 'Barcode') || barcode,
    productType: cell(raw, 'Product type', 'category') || extra?.category || 'Carbon Black',
    quantity,
    price: parseKg(cell(raw, 'Price', 'MRP', 'mrp')),
    usp: cell(raw, 'USP', 'description') || extra?.description || '',
    qrValue,
    queuedAtUtc: cell(raw, 'Queued at (UTC)', 'Queued At (UTC)'),
    lookupKeys: buildLookupKeys({ queueId: cell(raw, 'Queue Id', 'Queue ID') || productRef, productRef, productCode: barcode, qrValue, barcode }),
    rawRow: raw,
    sourceFile,
    sourceSheet,
    importedAt,
  };
}

export async function importExcelBuffer(buffer: Buffer, sourceFile: string, actor?: string | null) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const importedAt = new Date();
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  const extras = loadProductExtras();

  const queueSheetName =
    workbook.SheetNames.find((name) => /queue/i.test(name)) ?? workbook.SheetNames[0] ?? '';
  const queueSheet = workbook.Sheets[QUEUE_SHEET] ?? workbook.Sheets[queueSheetName];
  if (!queueSheet) {
    throw new Error('The Excel file does not contain a queue sheet.');
  }

  const queueRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(queueSheet, { defval: '' });
  for (const raw of queueRows) {
    const mapped = mapQueueRow(raw, sourceFile, queueSheetName || QUEUE_SHEET, importedAt, extras);
    if (!mapped.productRef && !mapped.qrValue) continue;
    const existing = await ExcelCatalog.findOne({
      $or: [{ productRef: mapped.productRef }, { lookupKeys: mapped.productRef }, { qrValue: mapped.qrValue }],
    });
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
