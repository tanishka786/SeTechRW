import { Bin } from '../models/Bin';
import { ExcelCatalog } from '../models/ExcelCatalog';
import { Forklift } from '../models/Forklift';
import { Product } from '../models/Product';
import { Category } from '../models/Category';

function variants(code: string) {
  const trimmed = code.trim();
  return [...new Set([trimmed, trimmed.toLowerCase(), trimmed.toUpperCase()])].filter(Boolean);
}

export async function lookupCode(rawCode: string) {
  const code = rawCode.trim();
  if (!code) {
    return { found: false as const, error: 'Please enter or scan a valid code' };
  }

  const keys = variants(code);
  const catalog = await ExcelCatalog.findOne({ lookupKeys: { $in: keys } }).lean();
  const product =
    (await Product.findOne({
      $or: [{ id: { $in: keys } }, { name: new RegExp(`^${escapeRegex(code)}$`, 'i') }, { productRef: { $in: keys } }],
    }).lean()) ??
    (catalog ? await Product.findOne({ productRef: catalog.productRef }).lean() : null);

  const bin = product
    ? await Bin.findOne({ id: product.binId }).lean()
    : await Bin.findOne({ $or: [{ id: { $in: keys } }, { name: new RegExp(`^${escapeRegex(code)}$`, 'i') }] }).lean();

  const forklift = await Forklift.findOne({
    $or: [{ id: { $in: keys } }, { name: new RegExp(`^${escapeRegex(code)}$`, 'i') }],
  }).lean();

  const category = product ? await Category.findOne({ id: product.categoryId }).lean() : null;
  const found = Boolean(catalog || product || bin || forklift);

  return {
    found,
    catalog: catalog
      ? {
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
        }
      : null,
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
    forklift: forklift
      ? {
          id: forklift.id,
          name: forklift.name,
          status: forklift.status,
          location: forklift.location,
          operator: forklift.operator,
        }
      : null,
    matchedItem: catalog?.productName || product?.name || bin?.name || forklift?.name || '',
    location: bin?.location || forklift?.location || '',
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
