import { useMemo, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import { ProductCard } from '../components/products/ProductCard';
import { Badge, statusVariant } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { DataTable } from '../components/ui/DataTable';
import { EmptyState } from '../components/ui/EmptyState';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SearchBar } from '../components/ui/SearchBar';
import { Select } from '../components/ui/Select';
import { useWarehouse } from '../context/WarehouseContext';
import { useToast } from '../context/ToastContext';
import type { Category, Product, ProductStatus } from '../types';
import { relativeUpdated } from '../utils/formatters';
import { nextProductId } from '../utils/validation';

const statuses: ProductStatus[] = ['In Stock', 'Low Stock', 'Out of Stock', 'Reserved'];

export function Products() {
  const warehouse = useWarehouse();
  const { pushToast } = useToast();
  const [query, setQuery] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [catError, setCatError] = useState('');
  const [form, setForm] = useState({
    id: '',
    name: '',
    categoryId: warehouse.categories[0]?.id ?? '',
    quantity: '0',
    binId: warehouse.bins[0]?.id ?? '',
    status: 'In Stock' as ProductStatus,
  });
  const [productError, setProductError] = useState('');

  const filtered = useMemo(
    () =>
      warehouse.products.filter((p) => {
        const cat = warehouse.categories.find((c) => c.id === p.categoryId)?.name ?? '';
        return `${p.id} ${p.name} ${cat}`.toLowerCase().includes(query.toLowerCase());
      }),
    [query, warehouse.categories, warehouse.products],
  );

  const openAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setCatError('');
    setCategoryOpen(true);
  };

  const saveCategory = async () => {
    const err = editingCategory
      ? await warehouse.updateCategory(editingCategory.id, catName, catDesc)
      : await warehouse.addCategory(catName, catDesc);
    setCatError(err ?? '');
    if (!err) setCategoryOpen(false);
  };

  const openAddProduct = () => {
    setEditingProduct(null);
    setForm({
      id: nextProductId(warehouse.products),
      name: '',
      categoryId: warehouse.categories[0]?.id ?? '',
      quantity: '0',
      binId: warehouse.bins[0]?.id ?? '',
      status: 'In Stock',
    });
    setProductError('');
    setProductOpen(true);
  };

  const saveProduct = async () => {
    const quantity = Number(form.quantity);
    if (!Number.isFinite(quantity) || quantity < 0) {
      setProductError('Quantity must be a valid number');
      return;
    }
    const payload = {
      id: form.id.trim().toUpperCase(),
      name: form.name,
      categoryId: form.categoryId,
      quantity,
      binId: form.binId,
      status: form.status,
    };
    const err = editingProduct
      ? await warehouse.updateProduct(editingProduct.id, payload)
      : await warehouse.addProduct(payload);
    setProductError(err ?? '');
    if (!err) setProductOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Products</h2>
          <p className="text-sm text-slate-500">Manage warehouse products and categories</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={openAddCategory} icon={<Plus size={16} />}>
            Add Category
          </Button>
          <Button onClick={openAddProduct} icon={<Plus size={16} />}>
            Add Product
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {warehouse.categories.map((category) => (
          <ProductCard
            key={category.id}
            category={category}
            products={warehouse.products.filter((p) => p.categoryId === category.id)}
            onEdit={() => {
              setEditingCategory(category);
              setCatName(category.name);
              setCatDesc(category.description);
              setCatError('');
              setCategoryOpen(true);
            }}
            onDelete={async () => {
              const err = await warehouse.deleteCategory(category.id);
              if (err) pushToast('error', err);
            }}
          />
        ))}
      </div>

      <SearchBar value={query} onChange={setQuery} placeholder="Search products" />

      <DataTable
        rows={filtered}
        rowKey={(row) => row.id}
        empty={<EmptyState icon={<Package />} title="No products found" description="Add a product or adjust your search." />}
        columns={[
          { key: 'id', header: 'Product ID', render: (row) => <span className="font-mono text-xs">{row.id}</span> },
          { key: 'name', header: 'Product Name' },
          {
            key: 'category',
            header: 'Category',
            render: (row) => warehouse.categories.find((c) => c.id === row.categoryId)?.name ?? '—',
          },
          { key: 'quantity', header: 'Quantity' },
          { key: 'bin', header: 'Bin', render: (row) => row.binId },
          {
            key: 'status',
            header: 'Status',
            render: (row) => <Badge variant={statusVariant(row.status)}>{row.status}</Badge>,
          },
          {
            key: 'updated',
            header: 'Updated',
            render: (row) => relativeUpdated(row.lastUpdated),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingProduct(row);
                    setForm({
                      id: row.id,
                      name: row.name,
                      categoryId: row.categoryId,
                      quantity: String(row.quantity),
                      binId: row.binId,
                      status: row.status,
                    });
                    setProductError('');
                    setProductOpen(true);
                  }}
                >
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => warehouse.deleteProduct(row.id)}>
                  Delete
                </Button>
              </div>
            ),
          },
        ]}
      />

      <Modal
        open={categoryOpen}
        title={editingCategory ? 'Edit Product Category' : 'Add Product Category'}
        onClose={() => setCategoryOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveCategory}>{editingCategory ? 'Save' : 'Add Category'}</Button>
          </>
        }
      >
        <Input label="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} />
        <Input label="Description" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} />
        {catError ? <p className="text-sm text-rose-600">{catError}</p> : null}
      </Modal>

      <Modal
        open={productOpen}
        title={editingProduct ? 'Edit Product' : 'Add Product'}
        onClose={() => setProductOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setProductOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveProduct}>{editingProduct ? 'Save' : 'Add Product'}</Button>
          </>
        }
      >
        <Input label="Product ID" value={form.id} onChange={(e) => setForm({ ...form, id: e.target.value })} disabled={Boolean(editingProduct)} />
        <Input label="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <Select
          label="Category"
          value={form.categoryId}
          onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          options={warehouse.categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Input label="Quantity" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
        <Select
          label="Bin"
          value={form.binId}
          onChange={(e) => setForm({ ...form, binId: e.target.value })}
          options={warehouse.bins.map((b) => ({ value: b.id, label: `${b.name} (${b.id})` }))}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={(e) => setForm({ ...form, status: e.target.value as ProductStatus })}
          options={statuses.map((s) => ({ value: s, label: s }))}
        />
        {productError ? <p className="text-sm text-rose-600">{productError}</p> : null}
      </Modal>
    </div>
  );
}
