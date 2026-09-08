import mongoose from 'mongoose';

const scanSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    code: { type: String, required: true },
    codeType: { type: String, enum: ['QR', 'Barcode', 'Manual', 'Image'], required: true },
    status: { type: String, enum: ['Found', 'Not Found'], required: true },
    matchedItem: { type: String, default: '' },
    location: { type: String, default: '' },
    catalogId: { type: String, default: null },
    productId: { type: String, default: null },
    binId: { type: String, default: null },
    forkliftId: { type: String, default: null },
    result: { type: mongoose.Schema.Types.Mixed, default: null },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
);

scanSchema.index({ createdAt: -1 });
scanSchema.index({ code: 1 });

export const ScanEvent = mongoose.model('ScanEvent', scanSchema);
