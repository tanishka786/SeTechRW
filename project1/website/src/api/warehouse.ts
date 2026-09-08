import { api } from './client';
import type { AppUser, Bin, Category, Forklift, Product, WarehouseState } from '../types';

export interface WarehouseResponse extends WarehouseState {
  scanStats: { today: number; unmatchedToday: number };
  summary: {
    totalProducts: number;
    binCount: number;
    activeForklifts: number;
    activeUsers: number;
    totalQuantity: number;
    utilization: number;
    occupiedBins: number;
    lowStock: number;
    reserved: number;
    available: number;
    scansToday: number;
    unmatchedToday: number;
  };
}

export function fetchWarehouse() {
  return api<WarehouseResponse>('/api/warehouse/state');
}

export function fetchLive() {
  return api<WarehouseResponse>('/api/analytics/live');
}

export function setLivePausedRequest(paused: boolean) {
  return api<{ livePaused: boolean }>('/api/analytics/pause', {
    method: 'POST',
    body: JSON.stringify({ paused }),
  });
}

export function createCategoryRequest(name: string, description: string) {
  return api<Category>('/api/categories', { method: 'POST', body: JSON.stringify({ name, description }) });
}

export function updateCategoryRequest(id: string, name: string, description: string) {
  return api<Category>(`/api/categories/${id}`, { method: 'PATCH', body: JSON.stringify({ name, description }) });
}

export function deleteCategoryRequest(id: string) {
  return api(`/api/categories/${id}`, { method: 'DELETE' });
}

export function createProductRequest(payload: Product) {
  return api<Product>('/api/products', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateProductRequest(id: string, payload: Partial<Product>) {
  return api<Product>(`/api/products/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteProductRequest(id: string) {
  return api(`/api/products/${id}`, { method: 'DELETE' });
}

export function createBinRequest(payload: Partial<Bin> & { id: string; name: string }) {
  return api<Bin>('/api/bins', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateBinRequest(id: string, payload: Partial<Bin>) {
  return api<Bin>(`/api/bins/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteBinRequest(id: string) {
  return api(`/api/bins/${id}`, { method: 'DELETE' });
}

export function createForkliftRequest(payload: Partial<Forklift> & { id: string; name: string }) {
  return api<Forklift>('/api/forklifts', { method: 'POST', body: JSON.stringify(payload) });
}

export function updateForkliftRequest(id: string, payload: Partial<Forklift>) {
  return api<Forklift>(`/api/forklifts/${id}`, { method: 'PATCH', body: JSON.stringify(payload) });
}

export function deleteForkliftRequest(id: string) {
  return api(`/api/forklifts/${id}`, { method: 'DELETE' });
}

export function fetchUsers() {
  return api<AppUser[]>('/api/users');
}

export function logoutSessionRequest(id: string) {
  return api(`/api/users/sessions/${id}/logout`, { method: 'POST' });
}
