import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, DataTable, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/utils';

interface SupplierItem {
  id: string;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  mobile: string;
  email?: string;
  address?: string;
  gstNo?: string;
  outstanding: number;
  createdAt: string;
}

export default function SuppliersPage() {
  const [data, setData] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SupplierItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    gstNo: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers', { params: { search, limit: 100 } });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load suppliers');
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
      contactPerson: '',
      mobile: '',
      email: '',
      address: '',
      gstNo: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: SupplierItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      contactPerson: item.contactPerson || '',
      mobile: item.mobile,
      email: item.email || '',
      address: item.address || '',
      gstNo: item.gstNo || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter supplier name');
      return;
    }
    if (!form.mobile.trim()) {
      toast.error('Please enter supplier mobile number');
      return;
    }

    setActionLoading(true);
    try {
      if (editingItem) {
        await api.put(`/suppliers/${editingItem.id}`, form);
        toast.success('Supplier updated successfully');
      } else {
        await api.post('/suppliers', form);
        toast.success('Supplier added successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update supplier' : 'Failed to add supplier');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/suppliers/${deletingId}`);
      toast.success('Supplier deleted successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete supplier');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Suppliers"
        description="Vendor and product supplier directory, GST details, and outstanding balances"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Supplier
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search suppliers by Name, Mobile, Code..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'supplierCode', label: 'Supplier Code' },
          { key: 'name', label: 'Supplier / Firm Name' },
          { key: 'contactPerson', label: 'Contact Person', render: (r) => (r.contactPerson as string) || '-' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'gstNo', label: 'GSTIN', render: (r) => (r.gstNo as string) || '-' },
          {
            key: 'outstanding',
            label: 'Outstanding Balance',
            render: (r) => formatCurrency(Number(r.outstanding || 0)),
          },
          {
            key: 'createdAt',
            label: 'Added Date',
            render: (r) => formatDate(r.createdAt as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as SupplierItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Supplier" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Supplier" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Supplier Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Supplier' : 'Add Supplier'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Supplier / Company Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Cuddalore Wholesale Traders"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Contact Person
              </label>
              <Input
                placeholder="Key contact name"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="10-digit mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Email Address
              </label>
              <Input
                type="email"
                placeholder="supplier@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                GSTIN Number
              </label>
              <Input
                placeholder="15-digit GSTIN"
                value={form.gstNo}
                onChange={(e) => setForm({ ...form, gstNo: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Address
            </label>
            <Input
              placeholder="Office / Warehouse address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Supplier' : 'Save Supplier'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Supplier"
        description="Are you sure you want to delete this supplier record?"
        loading={actionLoading}
      />
    </div>
  );
}
