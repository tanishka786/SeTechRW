import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    categoryId: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    binId: { type: String, required: true },
    status: {
      type: String,
      enum: ['In Stock', 'Low Stock', 'Out of Stock', 'Reserved'],
      default: 'In Stock',
    },
    lastUpdated: { type: String, required: true },
    productRef: { type: String, default: null },
    createdBy: { type: String, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);

export const Product = mongoose.model('Product', productSchema);
