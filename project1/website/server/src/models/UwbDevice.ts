import mongoose from 'mongoose';

const uwbDeviceSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['tag', 'primary', 'secondary'], required: true },
    chipModel: { type: String, default: 'DWM3001C' },
    chipId: { type: String, required: true, unique: true },
    macAddress: { type: String, default: '' },
    forkliftId: { type: String, default: null },
    binId: { type: String, default: null },
    relayIds: { type: [String], default: [] },
    x: { type: Number, default: 0 },
    y: { type: Number, default: 0 },
    location: { type: String, default: 'Warehouse floor' },
    online: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export const UwbDevice = mongoose.model('UwbDevice', uwbDeviceSchema);
