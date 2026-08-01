import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, DataTable, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';

interface ProductItem {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  mrp: number;
  purchasePrice: number;
  sellingPrice: number;
  discount: number;
  gstPercent: number;
  minStock: number;
  availableStock?: number;
  category?: { id: string; name: string };
  supplier?: { id: string; name: string };
}

export default function ProductsPage() {
  const [data, setData] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProductItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    barcode: '',
    sku: '',
    mrp: 0,
    purchasePrice: 0,
    sellingPrice: 0,
    discount: 0,
    gstPercent: 0,
    minStock: 5,
    openingStock: 0,
    rackLocation: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prod, cat] = await Promise.all([
        api.get('/products', { params: { search, limit: 100 } }),
        api.get('/products/categories'),
      ]);
      setData(prod.data.data);
      setCategories(cat.data.data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      name: '',
      categoryId: categories[0]?.id || '',
      barcode: '',
      sku: '',
      mrp: 0,
      purchasePrice: 0,
      sellingPrice: 0,
      discount: 0,
      gstPercent: 0,
      minStock: 5,
      openingStock: 0,
      rackLocation: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: ProductItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      barcode: item.barcode || '',
      sku: item.sku || '',
      mrp: Number(item.mrp),
      purchasePrice: Number(item.purchasePrice),
      sellingPrice: Number(item.sellingPrice),
      discount: Number(item.discount || 0),
      gstPercent: Number(item.gstPercent || 0),
      minStock: Number(item.minStock || 5),
      openingStock: 0,
      rackLocation: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!form.categoryId) {
      toast.error('Please select a product category');
      return;
    }
    if (form.sellingPrice < 0 || form.purchasePrice < 0 || form.mrp < 0) {
      toast.error('Prices cannot be negative');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        mrp: Number(form.mrp) || 0,
        purchasePrice: Number(form.purchasePrice) || 0,
        sellingPrice: Number(form.sellingPrice) || 0,
        discount: Number(form.discount) || 0,
        gstPercent: Number(form.gstPercent) || 0,
        minStock: Number(form.minStock) || 5,
        openingStock: Number(form.openingStock) || 0,
      };

      if (editingItem) {
        await api.put(`/products/${editingItem.id}`, payload);
        toast.success('Product updated successfully');
      } else {
        await api.post('/products', payload);
        toast.success('Product added successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update product' : 'Failed to add product');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/products/${deletingId}`);
      toast.success('Product deactivated successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete product');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Departmental Store inventory product management and pricing"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Product
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search products by Name, Barcode, SKU..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'sku', label: 'SKU' },
          { key: 'name', label: 'Product Name' },
          {
            key: 'category',
            label: 'Category',
            render: (r) => (r.category as { name: string })?.name || '-',
          },
          { key: 'barcode', label: 'Barcode', render: (r) => (r.barcode as string) || '-' },
          {
            key: 'sellingPrice',
            label: 'Selling Price',
            render: (r) => formatCurrency(Number(r.sellingPrice || 0)),
          },
          {
            key: 'mrp',
            label: 'MRP',
            render: (r) => formatCurrency(Number(r.mrp || 0)),
          },
          {
            key: 'availableStock',
            label: 'Stock',
            render: (r) => {
              const stock = Number(r.availableStock || 0);
              const min = Number(r.minStock || 5);
              return (
                <Badge variant={stock <= min ? 'destructive' : 'default'}>
                  {stock} units
                </Badge>
              );
            },
          },
          {
            key: 'gstPercent',
            label: 'GST %',
            render: (r) => `${r.gstPercent || 0}%`,
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as ProductItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Product" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Product" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Product Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Product' : 'Add Product'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Product Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Basmati Rice 1kg / Sunflower Oil 1L"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Category <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                required
              >
                <option value="">Select Category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Barcode Number
              </label>
              <Input
                placeholder="Scan or enter barcode"
                value={form.barcode}
                onChange={(e) => setForm({ ...form, barcode: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                MRP (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.mrp}
                onChange={(e) => setForm({ ...form, mrp: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Purchase Price (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.purchasePrice}
                onChange={(e) => setForm({ ...form, purchasePrice: Number(e.target.value) })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Selling Price (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                GST Percent (%)
              </label>
              <Input
                type="number"
                min="0"
                max="28"
                placeholder="0"
                value={form.gstPercent}
                onChange={(e) => setForm({ ...form, gstPercent: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Min Stock Alert Level
              </label>
              <Input
                type="number"
                min="0"
                placeholder="5"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
              />
            </div>

            {!editingItem && (
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Opening Stock Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={form.openingStock}
                  onChange={(e) => setForm({ ...form, openingStock: Number(e.target.value) })}
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Rack Location
            </label>
            <Input
              placeholder="e.g. Shelf A1 / Counter 2"
              value={form.rackLocation}
              onChange={(e) => setForm({ ...form, rackLocation: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Product' : 'Save Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Deactivate Product"
        description="Are you sure you want to deactivate this product? It will be hidden from sales and inventory list."
        loading={actionLoading}
      />
    </div>
  );
}
