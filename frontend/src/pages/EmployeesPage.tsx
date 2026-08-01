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

interface EmployeeItem {
  id: string;
  employeeCode: string;
  name: string;
  mobile: string;
  email?: string;
  role?: string;
  salary: number;
  joinDate: string;
  isActive: boolean;
  address?: string;
}

export default function EmployeesPage() {
  const [data, setData] = useState<EmployeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EmployeeItem | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    mobile: '',
    email: '',
    role: 'Operator',
    salary: 0,
    joinDate: new Date().toISOString().slice(0, 10),
    address: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/employees', { params: { search, limit: 100 } });
      setData(res.data.data);
    } catch {
      toast.error('Failed to load employees');
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
      email: '',
      role: 'Operator',
      salary: 15000,
      joinDate: new Date().toISOString().slice(0, 10),
      address: '',
    });
    setModalOpen(true);
  };

  const openEditModal = (item: EmployeeItem) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      mobile: item.mobile,
      email: item.email || '',
      role: item.role || 'Operator',
      salary: Number(item.salary || 0),
      joinDate: new Date(item.joinDate).toISOString().slice(0, 10),
      address: item.address || '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Please enter employee name');
      return;
    }
    if (!form.mobile.trim()) {
      toast.error('Please enter mobile number');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        ...form,
        salary: Number(form.salary),
        joinDate: new Date(form.joinDate),
      };

      if (editingItem) {
        await api.put(`/employees/${editingItem.id}`, payload);
        toast.success('Employee updated successfully');
      } else {
        await api.post('/employees', payload);
        toast.success('Employee added successfully');
      }
      setModalOpen(false);
      fetchData();
    } catch {
      toast.error(editingItem ? 'Failed to update employee' : 'Failed to add employee');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setActionLoading(true);
    try {
      await api.delete(`/employees/${deletingId}`);
      toast.success('Employee record deleted');
      setDeletingId(null);
      fetchData();
    } catch {
      toast.error('Failed to delete employee');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Employees & Staff"
        description="Staff directory, salaries, job titles, and payroll records"
        action={
          <Button onClick={openCreateModal}>
            <Plus className="mr-2 h-4 w-4" /> Add Employee
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search employees by Name, Code, Role..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={data as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'employeeCode', label: 'Emp ID' },
          { key: 'name', label: 'Employee Name' },
          { key: 'mobile', label: 'Mobile' },
          { key: 'role', label: 'Role', render: (r) => <Badge variant="outline">{(r.role as string) || 'Staff'}</Badge> },
          {
            key: 'salary',
            label: 'Monthly Salary',
            render: (r) => formatCurrency(Number(r.salary || 0)),
          },
          {
            key: 'joinDate',
            label: 'Join Date',
            render: (r) => formatDate(r.joinDate as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as EmployeeItem;
              return (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" title="Edit Employee" onClick={() => openEditModal(item)}>
                    <Edit2 className="h-4 w-4 text-blue-600" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Delete Employee" onClick={() => setDeletingId(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              );
            },
          },
        ]}
      />

      {/* Add / Edit Employee Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingItem ? 'Edit Employee' : 'Add Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Full Name <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g. Senthil Kumar"
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
                placeholder="10-digit mobile"
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Role / Title
              </label>
              <Select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="Operator">Operator</option>
                <option value="Cashier">Cashier</option>
                <option value="Store Manager">Store Manager</option>
                <option value="Assistant">Assistant</option>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Monthly Salary (₹)
              </label>
              <Input
                type="number"
                min="0"
                placeholder="15000"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: Number(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Join Date
              </label>
              <Input
                type="date"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Address
            </label>
            <Input
              placeholder="Residential address"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Saving...' : editingItem ? 'Update Employee' : 'Save Employee'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDelete}
        title="Delete Employee"
        description="Are you sure you want to remove this employee record?"
        loading={actionLoading}
      />
    </div>
  );
}
