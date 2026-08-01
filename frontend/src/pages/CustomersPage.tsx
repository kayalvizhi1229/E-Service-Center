import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, DataTable, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatDate } from '@/lib/utils';

interface CustomerItem {
  id: string;
  customerCode: string;
  name: string;
  mobile: string;
  altMobile?: string;
  email?: string;
  address?: string;
  village?: string;
  aadhaar?: string;
  pan?: string;
  createdAt: string;
}

export default function CustomersPage() {
  const [data, setData] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CustomerItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    altMobile: '',
    email: '',
    address: '',
    village: '',
    aadhaar: '',
    pan: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers', { params: { search, limit: 100 } });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load customers');
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
      mobile: '',
      altMobile: '',
      email: '',
      address: '',
      village: '',
      aadhaar: '',
      pan: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: CustomerItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      mobile: item.mobile,
      altMobile: item.altMobile || '',
      email: item.email || '',
      address: item.address || '',
      village: item.village || '',
      aadhaar: item.aadhaar || '',
      pan: item.pan || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    if (!form.mobile.trim() || form.mobile.length < 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setActionLoading(true);
    try {
      if (editingItem) {
        await api.put(`/customers/${editingItem.id}`, form);
        toast.success('Customer updated successfully');
      } else {
        await api.post('/customers', form);
        toast.success('Customer added successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update customer' : 'Failed to add customer');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/customers/${deletingId}`);
      toast.success('Customer deleted successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete customer');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customers"
        description="Customer directory, contact details, and document records"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Customer
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search customers by Name, Mobile, ID..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'customerCode', label: 'Customer ID' },
          { key: 'name', label: 'Customer Name' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'village', label: 'Village / Locality', render: (r) => (r.village as string) || '-' },
          { key: 'email', label: 'Email', render: (r) => (r.email as string) || '-' },
          {
            key: 'createdAt',
            label: 'Registered Date',
            render: (r) => formatDate(r.createdAt as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as CustomerItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Customer" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Customer" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Customer Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Customer' : 'Add Customer'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Murugan S"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="10-digit mobile number"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Alternate Mobile
              </label>
              <Input
                placeholder="Secondary phone"
                value={form.altMobile}
                onChange={(e) => setForm({ ...form, altMobile: e.target.value })}
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
                placeholder="customer@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Village / Locality
              </label>
              <Input
                placeholder="e.g. Periyapattu / Cuddalore"
                value={form.village}
                onChange={(e) => setForm({ ...form, village: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Residential Address
            </label>
            <Input
              placeholder="Door No, Street name"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Aadhaar Number
              </label>
              <Input
                placeholder="12-digit Aadhaar"
                value={form.aadhaar}
                onChange={(e) => setForm({ ...form, aadhaar: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                PAN Number
              </label>
              <Input
                placeholder="10-digit PAN"
                value={form.pan}
                onChange={(e) => setForm({ ...form, pan: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Customer' : 'Save Customer'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Customer"
        description="Are you sure you want to delete this customer record? All associated details will be removed."
        loading={actionLoading}
      />
    </div>
  );
}
