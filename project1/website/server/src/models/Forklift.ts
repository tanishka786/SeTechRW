import mongoose from 'mongoose';

const forkliftSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    model: { type: String, default: 'Unspecified' },
    capacity: { type: String, default: '2.0 Ton' },
    status: {
      type: String,
      enum: ['Active', 'Idle', 'Maintenance', 'Offline'],
      default: 'Idle',
    },
    operator: { type: String, default: 'Unassigned' },
    battery: { type: Number, default: 100 },
    location: { type: String, default: 'Staging' },
    lastActive: { type: String, required: true },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const Forklift = mongoose.model('Forklift', forkliftSchema);
