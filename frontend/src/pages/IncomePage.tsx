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
import { formatCurrency, formatDate } from '@/lib/utils';

interface IncomeItem {
  id: string;
  type: string;
  amount: number;
  description?: string;
  incomeDate: string;
  reference?: string;
}

const TYPES = ['SERVICE', 'STORE_SALES', 'OTHER'];

export default function IncomePage() {
  const [data, setData] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<IncomeItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    type: 'SERVICE',
    amount: 0,
    description: '',
    incomeDate: new Date().toISOString().slice(0, 10),
    reference: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/income', {
        params: { search, type: typeFilter || undefined, limit: 100 },
      });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load income records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, typeFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      type: 'SERVICE',
      amount: 0,
      description: '',
      incomeDate: new Date().toISOString().slice(0, 10),
      reference: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: IncomeItem) => {
    setEditingItem(item);
    setForm({
      type: item.type,
      amount: Number(item.amount),
      description: item.description || '',
      incomeDate: new Date(item.incomeDate).toISOString().slice(0, 10),
      reference: item.reference || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      toast.error('Please enter a valid income amount');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        incomeDate: new Date(form.incomeDate),
      };

      if (editingItem) {
        await api.put(`/income/${editingItem.id}`, payload);
        toast.success('Income entry updated successfully');
      } else {
        await api.post('/income', payload);
        toast.success('Income entry recorded successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update income entry' : 'Failed to record income entry');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/income/${deletingId}`);
      toast.success('Income entry deleted successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete income entry');
    } finally {
      setActionLoading(false);
    }
  };

  const totalIncomeSum = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Income & Revenue"
        description="Track income, service charges, store sales revenue, and miscellaneous earnings"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Record Income
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by Description or Reference..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="px-4 py-2 bg-card border rounded-md text-sm font-bold">
          Total Revenue: <span className="text-emerald-600 font-mono">{formatCurrency(totalIncomeSum)}</span>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'type',
            label: 'Income Type',
            render: (r) => <Badge variant="default">{r.type as string}</Badge>,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) => formatCurrency(Number(r.amount || 0)),
          },
          { key: 'description', label: 'Description', render: (r) => (r.description as string) || '-' },
          { key: 'reference', label: 'Reference Code', render: (r) => (r.reference as string) || '-' },
          {
            key: 'incomeDate',
            label: 'Date',
            render: (r) => formatDate(r.incomeDate as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as IncomeItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Income" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Income" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Income Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Income Entry' : 'Record Income Entry'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Income Type <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                required
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Income Amount (₹) <span className="text-destructive">*</span>
              </label>
              <Input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Description
            </label>
            <Input
              placeholder="e.g. Passport Online Application Charges"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Income Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.incomeDate}
                onChange={(e) => setForm({ ...form, incomeDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Reference Code
              </label>
              <Input
                placeholder="e.g. SRV-00045"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Income' : 'Save Income'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Income Entry"
        description="Are you sure you want to delete this income entry?"
        loading={actionLoading}
      />
    </div>
  );
}
