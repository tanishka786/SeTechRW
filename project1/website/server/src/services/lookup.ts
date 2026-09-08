import { Bin } from '../models/Bin';
import { ExcelCatalog } from '../models/ExcelCatalog';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

function variants(code: string) {
  const trimmed = code.trim();
  return [...new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase()])].filter(Boolean);
}

function lookupKeysFromInput(raw: string) {
  const keys = new Set<string>(variants(raw));
  const add = (value: string) => {
    for (const item of variants(value)) keys.add(item);
  };
  try {
    const url = new URL(raw.trim());
    add(url.pathname.split('/').filter(Boolean).pop() ?? '');
    add(url.searchParams.get('r') ?? '');
    add(url.searchParams.get('code') ?? '');
    add(url.href);
  } catch {
    /* not a URL */
  }
  for (const token of raw.match(/\d{4,}/g) ?? []) add(token);
  return [...keys].filter(Boolean);
}

export async function lookupCode(rawCode: string) {
  const code = rawCode.trim();
  if (!code) {
    return { found: false as const, error: 'Please enter or scan a valid code' };
  }

  const keys = lookupKeysFromInput(code);
  const catalog = await ExcelCatalog.findOne({ lookupKeys: { $in: keys } }).sort({ importedAt: -1 }).lean();

  if (!catalog) {
    return {
      found: false as const,
      error: 'No matching record found for this barcode / QR code.',
      catalog: null,
      product: null,
      bin: null,
      forklift: null,
      matchedItem: '',
      location: '',
    };
  }

  const product = await Product.findOne({ productRef: catalog.productRef }).lean();
  const bin = product ? await Bin.findOne({ id: product.binId }).lean() : null;
  const category = product ? await Category.findOne({ id: product.categoryId }).lean() : null;

  return {
    found: true as const,
    catalog: {
      queueId: catalog.queueId,
      productRef: catalog.productRef,
      productName: catalog.productName,
      productCode: catalog.productCode,
      productType: catalog.productType,
      quantity: catalog.quantity,
      price: catalog.price,
      usp: catalog.usp,
      qrValue: catalog.qrValue,
      queuedAtUtc: catalog.queuedAtUtc,
      sourceSheet: catalog.sourceSheet,
      rawRow: catalog.rawRow,
    },
    product: product
      ? {
          id: product.id,
          name: product.name,
          quantity: product.quantity,
          status: product.status,
          binId: product.binId,
          category: category?.name ?? '',
        }
      : null,
    bin: bin
      ? {
          id: bin.id,
          name: bin.name,
          location: bin.location,
          status: bin.status,
          capacity: bin.capacity,
        }
      : null,
    forklift: null,
    matchedItem: catalog.productName || catalog.productRef,
    location: bin?.location || '',
  };
}
