import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Bin, Forklift, Product, WarehouseState } from '../types';
import {
  createBinRequest,
  createCategoryRequest,
  createForkliftRequest,
  createProductRequest,
  deleteBinRequest,
  deleteCategoryRequest,
  deleteForkliftRequest,
  deleteProductRequest,
  fetchLive,
  fetchWarehouse,
  logoutSessionRequest,
  setLivePausedRequest,
  updateBinRequest,
  updateCategoryRequest,
  updateForkliftRequest,
  updateProductRequest,
  type WarehouseResponse,
} from '../api/warehouse';
import { ApiError } from '../api/client';
import { createSeedWarehouse } from '../data/mockData';
import { useToast } from './ToastContext';

interface WarehouseContextValue extends WarehouseState {
  loading: boolean;
  error: string | null;
  scanStats: { today: number; unmatchedToday: number };
  refresh: () => Promise<void>;
  addCategory: (name: string, description: string) => Promise<string | null>;
  updateCategory: (id: string, name: string, description: string) => Promise<string | null>;
  deleteCategory: (id: string) => Promise<string | null>;
  addProduct: (payload: Omit<Product, 'lastUpdated' | 'status'> & { status?: Product['status'] }) => Promise<string | null>;
  updateProduct: (id: string, payload: Partial<Product>) => Promise<string | null>;
  deleteProduct: (id: string) => Promise<string | null>;
  addBin: (payload: Omit<Bin, 'status' | 'productCount' | 'capacity'> & { capacity?: number }) => Promise<string | null>;
  updateBin: (id: string, payload: Partial<Bin>) => Promise<string | null>;
  deleteBin: (id: string) => Promise<string | null>;
  addForklift: (payload: Omit<Forklift, 'battery' | 'lastActive'> & { battery?: number; lastActive?: string }) => Promise<string | null>;
  updateForklift: (id: string, payload: Partial<Forklift>) => Promise<string | null>;
  deleteForklift: (id: string) => Promise<string | null>;
  logoutSession: (id: string) => Promise<void>;
  setLivePaused: (paused: boolean) => Promise<void>;
}

const WarehouseContext = createContext<WarehouseContextValue | null>(null);

function applyState(data: WarehouseResponse): WarehouseState & { scanStats: WarehouseResponse['scanStats'] } {
  return {
    categories: data.categories,
    products: data.products,
    bins: data.bins,
    forklifts: data.forklifts,
    users: data.users ?? [],
    userSessions: data.userSessions,
    events: data.events,
    inventoryHistory: data.inventoryHistory,
    lastUpdated: data.lastUpdated,
    livePaused: data.livePaused,
    scanStats: data.scanStats,
  };
}

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const seed = createSeedWarehouse();
  const [state, setState] = useState<WarehouseState>(seed);
  const [scanStats, setScanStats] = useState({ today: 0, unmatchedToday: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pushToast } = useToast();

  const refresh = useCallback(async () => {
    try {
      const data = await fetchWarehouse();
      const next = applyState(data);
      setState(next);
      setScanStats(next.scanStats);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (state.livePaused) return;
    const timer = window.setInterval(() => {
      fetchLive()
        .then((data) => {
          const next = applyState(data);
          setState(next);
          setScanStats(next.scanStats);
          setError(null);
        })
        .catch(() => {
          /* keep last good snapshot while live polling */
        });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [state.livePaused]);

  const fail = (err: unknown) => (err instanceof ApiError ? err.message : 'Unable to reach the warehouse database. Please try again.');

  const addCategory = useCallback(
    async (name: string, description: string) => {
      try {
        await createCategoryRequest(name, description);
        pushToast('success', 'Category added');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const updateCategory = useCallback(
    async (id: string, name: string, description: string) => {
      try {
        await updateCategoryRequest(id, name, description);
        pushToast('success', 'Category updated');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await deleteCategoryRequest(id);
        pushToast('info', 'Category deleted');
        await refresh();
        return null;
      } catch (err) {
        const message = fail(err);
        pushToast('error', message);
        return message;
      }
    },
    [pushToast, refresh],
  );

  const addProduct = useCallback(
    async (payload: Omit<Product, 'lastUpdated' | 'status'> & { status?: Product['status'] }) => {
      try {
        await createProductRequest({
          ...payload,
          status: payload.status ?? 'In Stock',
          lastUpdated: new Date().toISOString(),
        });
        pushToast('success', 'Product added');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const updateProduct = useCallback(
    async (id: string, payload: Partial<Product>) => {
      try {
        await updateProductRequest(id, payload);
        pushToast('success', 'Inventory updated');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      try {
        await deleteProductRequest(id);
        pushToast('info', 'Product removed');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const addBin = useCallback(
    async (payload: Omit<Bin, 'status' | 'productCount' | 'capacity'> & { capacity?: number }) => {
      try {
        await createBinRequest({ ...payload, id: payload.id, name: payload.name });
        pushToast('success', 'Bin created');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const updateBin = useCallback(
    async (id: string, payload: Partial<Bin>) => {
      try {
        await updateBinRequest(id, payload);
        pushToast('success', 'Bin updated');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const deleteBin = useCallback(
    async (id: string) => {
      try {
        await deleteBinRequest(id);
        pushToast('info', 'Bin deleted');
        await refresh();
        return null;
      } catch (err) {
        const message = fail(err);
        pushToast('error', message);
        return message;
      }
    },
    [pushToast, refresh],
  );

  const addForklift = useCallback(
    async (payload: Omit<Forklift, 'battery' | 'lastActive'> & { battery?: number; lastActive?: string }) => {
      try {
        await createForkliftRequest(payload);
        pushToast('success', 'Forklift added');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const updateForklift = useCallback(
    async (id: string, payload: Partial<Forklift>) => {
      try {
        await updateForkliftRequest(id, payload);
        pushToast('success', 'Forklift updated');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const deleteForklift = useCallback(
    async (id: string) => {
      try {
        await deleteForkliftRequest(id);
        pushToast('info', 'Forklift removed');
        await refresh();
        return null;
      } catch (err) {
        return fail(err);
      }
    },
    [pushToast, refresh],
  );

  const logoutSession = useCallback(
    async (id: string) => {
      await logoutSessionRequest(id);
      pushToast('success', 'User logged out');
      await refresh();
    },
    [pushToast, refresh],
  );

  const setLivePaused = useCallback(
    async (paused: boolean) => {
      await setLivePausedRequest(paused);
      window.localStorage.setItem('forklift-live-paused', String(paused));
      setState((prev) => ({ ...prev, livePaused: paused }));
    },
    [],
  );

  const value = useMemo<WarehouseContextValue>(
    () => ({
      ...state,
      loading,
      error,
      scanStats,
      refresh,
      addCategory,
      updateCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      addBin,
      updateBin,
      deleteBin,
      addForklift,
      updateForklift,
      deleteForklift,
      logoutSession,
      setLivePaused,
    }),
    [
      state,
      loading,
      error,
      scanStats,
      refresh,
      addCategory,
      updateCategory,
      deleteCategory,
      addProduct,
      updateProduct,
      deleteProduct,
      addBin,
      updateBin,
      deleteBin,
      addForklift,
      updateForklift,
      deleteForklift,
      logoutSession,
      setLivePaused,
    ],
  );

  return <WarehouseContext.Provider value={value}>{children}</WarehouseContext.Provider>;
}

export function useWarehouse() {
  const ctx = useContext(WarehouseContext);
  if (!ctx) throw new Error('useWarehouse must be used within WarehouseProvider');
  return ctx;
}

export function useWarehouseStats() {
  const warehouse = useWarehouse();
  const totalProducts = warehouse.products.length;
  const totalQuantity = warehouse.products.reduce((sum, p) => sum + p.quantity, 0);
  const activeForklifts = warehouse.forklifts.filter((f) => f.status === 'Active').length;
  const activeUsers = warehouse.userSessions.filter((s) => s.status === 'Active').length;
  const utilization =
    warehouse.bins.length === 0
      ? 0
      : Math.round(warehouse.bins.reduce((sum, b) => sum + b.capacity, 0) / warehouse.bins.length);
  return {
    totalProducts,
    totalQuantity,
    activeForklifts,
    activeUsers,
    utilization,
    occupiedBins: warehouse.bins.filter((b) => b.capacity >= 40).length,
    lowStock: warehouse.products.filter((p) => p.status === 'Low Stock').length,
    reserved: warehouse.products.filter((p) => p.status === 'Reserved').length,
    available: warehouse.products.filter((p) => p.status === 'In Stock').length,
    binCount: warehouse.bins.length,
    scansToday: warehouse.scanStats.today,
    unmatchedToday: warehouse.scanStats.unmatchedToday,
  };
}
