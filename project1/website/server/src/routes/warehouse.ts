import { Router } from 'express';
import {
  createBin,
  createCategory,
  createForklift,
  createProduct,
  deleteBin,
  deleteCategory,
  deleteForklift,
  deleteProduct,
  getLive,
  getState,
  getSummary,
  listUsers,
  logoutSession,
  setPaused,
  updateBin,
  updateCategory,
  updateForklift,
  updateProduct,
} from '../controllers/warehouseController';

export const warehouseRouter = Router();

warehouseRouter.get('/state', getState);
warehouseRouter.get('/warehouse/state', getState);
warehouseRouter.get('/dashboard/summary', getSummary);
warehouseRouter.get('/analytics/live', getLive);
warehouseRouter.post('/analytics/pause', setPaused);

warehouseRouter.post('/categories', createCategory);
warehouseRouter.patch('/categories/:id', updateCategory);
warehouseRouter.delete('/categories/:id', deleteCategory);

warehouseRouter.post('/products', createProduct);
warehouseRouter.patch('/products/:id', updateProduct);
warehouseRouter.delete('/products/:id', deleteProduct);

warehouseRouter.post('/bins', createBin);
warehouseRouter.patch('/bins/:id', updateBin);
warehouseRouter.delete('/bins/:id', deleteBin);

warehouseRouter.post('/forklifts', createForklift);
warehouseRouter.patch('/forklifts/:id', updateForklift);
warehouseRouter.delete('/forklifts/:id', deleteForklift);

warehouseRouter.get('/users', listUsers);
warehouseRouter.post('/users/sessions/:id/logout', logoutSession);
