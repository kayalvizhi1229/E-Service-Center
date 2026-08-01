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

interface ExpenseItem {
  id: string;
  category: string;
  amount: number;
  description?: string;
  expenseDate: string;
  reference?: string;
}

const CATEGORIES = [
  'RENT',
  'ELECTRICITY',
  'INTERNET',
  'SALARY',
  'MAINTENANCE',
  'TRANSPORT',
  'STATIONERY',
  'OTHER',
];

export default function ExpensesPage() {
  const [data, setData] = useState<ExpenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    category: 'RENT',
    amount: 0,
    description: '',
    expenseDate: new Date().toISOString().slice(0, 10),
    reference: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/expenses', {
        params: { search, category: categoryFilter || undefined, limit: 100 },
      });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, categoryFilter]);

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      category: 'RENT',
      amount: 0,
      description: '',
      expenseDate: new Date().toISOString().slice(0, 10),
      reference: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: ExpenseItem) => {
    setEditingItem(item);
    setForm({
      category: item.category,
      amount: Number(item.amount),
      description: item.description || '',
      expenseDate: new Date(item.expenseDate).toISOString().slice(0, 10),
      reference: item.reference || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        expenseDate: new Date(form.expenseDate),
      };

      if (editingItem) {
        await api.put(`/expenses/${editingItem.id}`, payload);
        toast.success('Expense updated successfully');
      } else {
        await api.post('/expenses', payload);
        toast.success('Expense recorded successfully');
      }

      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update expense' : 'Failed to record expense');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/expenses/${deletingId}`);
      toast.success('Expense deleted successfully');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete expense');
    } finally {
      setActionLoading(false);
    }
  };

  const totalExpenseSum = data.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        description="Track shop operational expenses, rent, bills, and employee payouts"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Record Expense
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
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="px-4 py-2 bg-card border rounded-md text-sm font-bold">
          Total Expenses: <span className="text-destructive font-mono">{formatCurrency(totalExpenseSum)}</span>
        </div>
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'category',
            label: 'Category',
            render: (r) => <Badge variant="default">{r.category as string}</Badge>,
          },
          {
            key: 'amount',
            label: 'Amount',
            render: (r) => formatCurrency(Number(r.amount || 0)),
          },
          { key: 'description', label: 'Description', render: (r) => (r.description as string) || '-' },
          { key: 'reference', label: 'Reference / Voucher', render: (r) => (r.reference as string) || '-' },
          {
            key: 'expenseDate',
            label: 'Date',
            render: (r) => formatDate(r.expenseDate as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as ExpenseItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Expense" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Expense" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Expense Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Expense' : 'Record Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Category <span className="text-destructive">*</span>
              </label>
              <Select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                required
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Expense Amount (₹) <span className="text-destructive">*</span>
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
              placeholder="e.g. Electricity Bill - January 2026"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Expense Date <span className="text-destructive">*</span>
              </label>
              <Input
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm({ ...form, expenseDate: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Reference / Voucher No.
              </label>
              <Input
                placeholder="e.g. VCH-00123"
                value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="default" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Expense' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Expense"
        description="Are you sure you want to delete this expense record?"
        loading={actionLoading}
      />
    </div>
  );
}
