import mongoose from 'mongoose';

const binSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    capacity: { type: Number, default: 0 },
    location: { type: String, default: 'Unassigned' },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Full', 'Maintenance'],
      default: 'Available',
    },
    productCount: { type: Number, default: 0 },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const Bin = mongoose.model('Bin', binSchema);
