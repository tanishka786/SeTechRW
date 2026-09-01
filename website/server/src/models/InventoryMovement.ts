import mongoose from 'mongoose';

const movementSchema = new mongoose.Schema(
  {
    time: { type: String, required: true },
    quantity: { type: Number, required: true },
    inbound: { type: Number, required: true },
    outbound: { type: Number, required: true },
    activity: { type: Number, required: true },
  },
  { timestamps: true },
);

export const InventoryMovement = mongoose.model('InventoryMovement', movementSchema);
