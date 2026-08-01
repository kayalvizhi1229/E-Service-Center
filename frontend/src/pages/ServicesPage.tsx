import { useEffect, useState } from 'react';
import { Plus, Search, Edit2, Trash2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, DataTable, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { formatCurrency, formatDate } from '@/lib/utils';

interface ServiceItem {
  id: string;
  serviceCode: string;
  name: string;
  categoryId: string;
  customerId: string;
  govtFee: number;
  serviceCharge: number;
  totalAmount: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  applicationNo?: string;
  remarks?: string;
  createdAt: string;
  customer?: { id: string; name: string; mobile: string };
  category?: { id: string; name: string };
}

export default function ServicesPage() {
  const [data, setData] = useState<ServiceItem[]>([]);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [customers, setCustomers] = useState<{ id: string; name: string; mobile: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServiceItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    categoryId: '',
    customerId: '',
    govtFee: 0,
    serviceCharge: 0,
    applicationNo: '',
    status: 'PENDING',
    remarks: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [svc, cat, cust] = await Promise.all([
        api.get('/services', { params: { search, status: statusFilter || undefined, limit: 100 } }),
        api.get('/services/categories'),
        api.get('/customers', { params: { limit: 200 } }),
      ]);
      setData(svc.data.data);
      setCategories(cat.data.data);
      setCustomers(cust.data.data);
    } catch {
      toast.error('Failed to load E-Services data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, statusFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      name: '',
      categoryId: categories[0]?.id || '',
      customerId: customers[0]?.id || '',
      govtFee: 0,
      serviceCharge: 0,
      applicationNo: '',
      status: 'PENDING',
      remarks: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: ServiceItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      categoryId: item.categoryId,
      customerId: item.customerId,
      govtFee: Number(item.govtFee),
      serviceCharge: Number(item.serviceCharge),
      applicationNo: item.applicationNo || '',
      status: item.status,
      remarks: item.remarks || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter a service name');
      return;
    }
    if (!form.categoryId) {
      toast.error('Please select a service category');
      return;
    }
    if (!form.customerId) {
      toast.error('Please select a customer');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        govtFee: Number(form.govtFee) || 0,
        serviceCharge: Number(form.serviceCharge) || 0,
      };

      if (editingItem) {
        await api.put(`/services/${editingItem.id}`, payload);
        toast.success('E-Service updated successfully');
      } else {
        await api.post('/services', payload);
        toast.success('E-Service created successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update E-Service' : 'Failed to create E-Service');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/services/${deletingId}`);
      toast.success('E-Service deleted successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete E-Service');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      await api.patch(`/services/${id}/status`, { status: newStatus });
      toast.success(`Service status updated to ${newStatus}`);
      fetchData();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const statusVariant = (s: string) => {
    if (s === 'COMPLETED') return 'success';
    if (s === 'IN_PROGRESS') return 'warning';
    if (s === 'CANCELLED') return 'destructive';
    return 'default';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="E-Services"
        description="Manage government applications, digital services, and customer processing"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add E-Service
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Service Name, Code, Application No..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN_PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
          </Select>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'serviceCode', label: 'Service ID' },
          { key: 'name', label: 'Service Name' },
          {
            key: 'customer',
            label: 'Customer',
            render: (r) => {
              const cust = r.customer as { name: string; mobile: string } | undefined;
              return cust ? `${cust.name} (${cust.mobile})` : '-';
            },
          },
          {
            key: 'category',
            label: 'Category',
            render: (r) => (r.category as { name: string })?.name || '-',
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => (
              <Badge variant={statusVariant(r.status as string)}>
                {r.status as string}
              </Badge>
            ),
          },
          {
            key: 'totalAmount',
            label: 'Total Fee',
            render: (r) => formatCurrency(Number(r.totalAmount || 0)),
          },
          {
            key: 'createdAt',
            label: 'Created Date',
            render: (r) => formatDate(r.createdAt as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as ServiceItem;
              return (
                <div className="flex items-center gap-2">
                  {item.status !== 'COMPLETED' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Mark Completed"
                      onClick={() => handleStatusChange(item.id, 'COMPLETED')}
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" title="Edit E-Service" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete E-Service" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit E-Service Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit E-Service' : 'Add E-Service'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Service Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Aadhaar Update / Income Certificate"
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
                Customer <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
              >
                <option value="">Select Customer</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.mobile})
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Government Fee (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.govtFee}
                onChange={(e) => setForm({ ...form, govtFee: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Service Charge (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.serviceCharge}
                onChange={(e) => setForm({ ...form, serviceCharge: Number(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Application Number
              </label>
              <Input
                placeholder="e.g. APP12345678"
                value={form.applicationNo}
                onChange={(e) => setForm({ ...form, applicationNo: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Status
              </label>
              <Select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="PENDING">PENDING</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="CANCELLED">CANCELLED</option>
              </Select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Remarks / Notes
            </label>
            <Input
              placeholder="Additional service details or notes"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update E-Service' : 'Save E-Service'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete E-Service"
        description="Are you sure you want to delete this E-Service entry? This operation cannot be reversed."
        loading={actionLoading}
      />
    </div>
  );
}
