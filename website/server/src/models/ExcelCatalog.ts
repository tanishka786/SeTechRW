import mongoose from 'mongoose';

const catalogSchema = new mongoose.Schema(
  {
    queueId: { type: String, required: true },
    productRef: { type: String, required: true },
    productName: { type: String, default: '' },
    productCode: { type: String, default: '' },
    productType: { type: String, default: '' },
    quantity: { type: Number, default: 0 },
    price: { type: Number, default: 0 },
    usp: { type: String, default: '' },
    qrValue: { type: String, default: '' },
    queuedAtUtc: { type: String, default: '' },
    lookupKeys: { type: [String], default: [] },
    rawRow: { type: mongoose.Schema.Types.Mixed, required: true },
    sourceFile: { type: String, required: true },
    sourceSheet: { type: String, required: true },
    importedAt: { type: Date, required: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

catalogSchema.index({ productRef: 1, sourceSheet: 1 }, { unique: true });
catalogSchema.index({ lookupKeys: 1 });

export const ExcelCatalog = mongoose.model('ExcelCatalog', catalogSchema);
