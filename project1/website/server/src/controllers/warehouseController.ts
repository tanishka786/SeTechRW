import type { Response } from 'express';
import { Bin } from '../models/Bin';
import { Category } from '../models/Category';
import { Forklift } from '../models/Forklift';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { UserLoginActivity } from '../models/UserLoginActivity';
import { warehouseState } from '../services/summary';
import { getSettings } from '../services/liveSim';
import { deriveBinStatus, deriveProductStatus, nextId, syncBinCounts } from '../utils/ids';
import { publicUser, type AuthedRequest } from '../middleware/auth';

function actor(req: AuthedRequest) {
  return req.user?.id ?? null;
}

export async function getState(_req: AuthedRequest, res: Response) {
  res.json(await warehouseState());
}

export async function getSummary(_req: AuthedRequest, res: Response) {
  const state = await warehouseState();
  res.json(state.summary);
}

export async function getLive(_req: AuthedRequest, res: Response) {
  res.json(await warehouseState());
}

export async function setPaused(req: AuthedRequest, res: Response) {
  const settings = await getSettings();
  settings.livePaused = Boolean(req.body.paused);
  settings.lastUpdated = new Date().toISOString();
  await settings.save();
  res.json({ livePaused: settings.livePaused });
}

export async function createCategory(req: AuthedRequest, res: Response) {
  const name = String(req.body.name ?? '').trim();
  const description = String(req.body.description ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  if (await Category.findOne({ name: new RegExp(`^${name}$`, 'i') })) {
    res.status(409).json({ error: 'A category with this name already exists.' });
    return;
  }
  const ids = (await Category.find().select('id')).map((c) => c.id);
  const doc = await Category.create({
    id: nextId('cat', ids).replace('cat-', 'cat-'),
    name,
    description,
    createdBy: actor(req),
  });
  res.json(doc);
}

export async function updateCategory(req: AuthedRequest, res: Response) {
  const name = String(req.body.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Category name is required' });
    return;
  }
  const doc = await Category.findOneAndUpdate(
    { id: req.params.id },
    { name, description: String(req.body.description ?? '').trim(), updatedBy: actor(req) },
    { new: true },
  );
  if (!doc) {
    res.status(404).json({ error: 'Category not found' });
    return;
  }
  res.json(doc);
}

export async function deleteCategory(req: AuthedRequest, res: Response) {
  if (await Product.exists({ categoryId: req.params.id })) {
    res.status(409).json({ error: 'Cannot delete a category that still has products.' });
    return;
  }
  await Category.deleteOne({ id: req.params.id });
  res.json({ ok: true });
}

export async function createProduct(req: AuthedRequest, res: Response) {
  const name = String(req.body.name ?? '').trim();
  const id = String(req.body.id ?? '').trim().toUpperCase();
  if (!name) {
    res.status(400).json({ error: 'Product name is required' });
    return;
  }
  if (await Product.exists({ id })) {
    res.status(409).json({ error: 'This Product ID already exists.' });
    return;
  }
  const quantity = Number(req.body.quantity ?? 0);
  const doc = await Product.create({
    id,
    name,
    categoryId: String(req.body.categoryId ?? ''),
    quantity,
    binId: String(req.body.binId ?? ''),
    status: req.body.status ?? deriveProductStatus(quantity),
    lastUpdated: new Date().toISOString(),
    createdBy: actor(req),
  });
  await syncBinCounts();
  res.json(doc);
}

export async function updateProduct(req: AuthedRequest, res: Response) {
  const product = await Product.findOne({ id: req.params.id });
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }
  if (req.body.name) product.name = String(req.body.name).trim();
  if (req.body.categoryId) product.categoryId = String(req.body.categoryId);
  if (req.body.binId) product.binId = String(req.body.binId);
  if (req.body.quantity !== undefined) product.quantity = Number(req.body.quantity);
  product.status = req.body.status ?? deriveProductStatus(product.quantity, product.status);
  product.lastUpdated = new Date().toISOString();
  product.updatedBy = actor(req);
  await product.save();
  await syncBinCounts();
  res.json(product);
}

export async function deleteProduct(req: AuthedRequest, res: Response) {
  await Product.deleteOne({ id: req.params.id });
  await syncBinCounts();
  res.json({ ok: true });
}

export async function createBin(req: AuthedRequest, res: Response) {
  const id = String(req.body.id ?? '').trim().toUpperCase();
  const name = String(req.body.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Bin name is required' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'Bin ID is required' });
    return;
  }
  if (await Bin.exists({ id })) {
    res.status(409).json({ error: 'This Bin ID already exists.' });
    return;
  }
  const capacity = Math.min(100, Math.max(0, Number(req.body.capacity ?? 0)));
  const doc = await Bin.create({
    id,
    name,
    location: String(req.body.location ?? 'Unassigned').trim() || 'Unassigned',
    capacity,
    status: deriveBinStatus(capacity),
    productCount: 0,
    createdBy: actor(req),
  });
  res.json(doc);
}

export async function updateBin(req: AuthedRequest, res: Response) {
  const bin = await Bin.findOne({ id: req.params.id });
  if (!bin) {
    res.status(404).json({ error: 'Bin not found' });
    return;
  }
  if (req.body.name) bin.name = String(req.body.name).trim();
  if (req.body.location) bin.location = String(req.body.location).trim();
  if (req.body.capacity !== undefined) {
    bin.capacity = Math.min(100, Math.max(0, Number(req.body.capacity)));
  }
  bin.status = req.body.status ?? deriveBinStatus(bin.capacity, bin.status);
  bin.updatedBy = actor(req);
  await bin.save();
  res.json(bin);
}

export async function deleteBin(req: AuthedRequest, res: Response) {
  if (await Product.exists({ binId: req.params.id })) {
    res.status(409).json({ error: 'Cannot delete a bin that still holds products.' });
    return;
  }
  await Bin.deleteOne({ id: req.params.id });
  res.json({ ok: true });
}

export async function createForklift(req: AuthedRequest, res: Response) {
  const id = String(req.body.id ?? '').trim().toUpperCase();
  const name = String(req.body.name ?? '').trim();
  if (!name) {
    res.status(400).json({ error: 'Machine name is required' });
    return;
  }
  if (!id) {
    res.status(400).json({ error: 'Machine ID is required' });
    return;
  }
  if (await Forklift.exists({ id })) {
    res.status(409).json({ error: 'This Machine ID already exists.' });
    return;
  }
  const doc = await Forklift.create({
    id,
    name,
    model: String(req.body.model ?? 'Unspecified').trim() || 'Unspecified',
    capacity: String(req.body.capacity ?? '2.0 Ton').trim() || '2.0 Ton',
    status: req.body.status || 'Idle',
    operator: String(req.body.operator ?? 'Unassigned').trim() || 'Unassigned',
    battery: 100,
    location: String(req.body.location ?? 'Staging').trim() || 'Staging',
    lastActive: new Date().toISOString(),
    createdBy: actor(req),
  });
  res.json(doc);
}

export async function updateForklift(req: AuthedRequest, res: Response) {
  const doc = await Forklift.findOne({ id: req.params.id });
  if (!doc) {
    res.status(404).json({ error: 'Forklift not found' });
    return;
  }
  if (req.body.name !== undefined) doc.name = String(req.body.name).trim();
  if (req.body.model !== undefined) doc.model = String(req.body.model).trim();
  if (req.body.capacity !== undefined) doc.capacity = String(req.body.capacity).trim();
  if (req.body.status) doc.status = req.body.status;
  if (req.body.operator !== undefined) {
    doc.operator = String(req.body.operator).trim() || 'Unassigned';
  }
  if (req.body.location !== undefined) doc.location = String(req.body.location).trim() || 'Staging';
  if (req.body.battery !== undefined) {
    const battery = Number(req.body.battery);
    if (Number.isFinite(battery)) doc.battery = Math.min(100, Math.max(0, battery));
  }
  doc.lastActive = new Date().toISOString();
  doc.updatedBy = actor(req);
  await doc.save();
  res.json(doc);
}

export async function deleteForklift(req: AuthedRequest, res: Response) {
  await Forklift.deleteOne({ id: req.params.id });
  res.json({ ok: true });
}

export async function listUsers(_req: AuthedRequest, res: Response) {
  const users = await User.find().select('id name email mobile role createdAt').sort({ name: 1 }).lean();
  res.json(users.map(publicUser));
}

export async function logoutSession(req: AuthedRequest, res: Response) {
  const session = await UserLoginActivity.findOne({ id: req.params.id });
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }
  session.status = 'Logged Out';
  session.logoutTime = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  session.updatedBy = actor(req);
  await session.save();
  res.json(session);
}
