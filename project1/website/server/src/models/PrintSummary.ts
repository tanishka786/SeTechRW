import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    rowsLabel: { type: String, default: '' },
    exportedAtUtc: { type: String, default: '' },
    rawRow: { type: mongoose.Schema.Types.Mixed, required: true },
    sourceFile: { type: String, required: true },
    sourceSheet: { type: String, required: true },
    importedAt: { type: Date, required: true },
  },
  { timestamps: true },
);

export const PrintSummary = mongoose.model('PrintSummary', summarySchema);
