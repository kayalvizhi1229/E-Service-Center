import { useEffect, useState } from 'react';
import {
  IndianRupee, TrendingDown, TrendingUp, Briefcase, CheckCircle,
  ShoppingBag, Package, AlertTriangle, Users, ShoppingCart,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import api from '@/lib/api';
import { StatCard } from '@/components/ui/StatCard';
import { PageHeader, DataTable } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/ui/Badge';

export default function DashboardPage() {
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [charts, setCharts] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/dashboard/summary'),
      api.get('/dashboard/charts'),
    ])
      .then(([s, c]) => {
        setSummary(s.data.data);
        setCharts(c.data.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </div>
    );
  }

  const s = (summary || {}) as Record<string, number>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Yoga Infotech - Real-Time Business Performance & Store Overview"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Today's Income" value={s.todayIncome || 0} icon={IndianRupee} isCurrency />
        <StatCard title="Today's Expense" value={s.todayExpense || 0} icon={TrendingDown} isCurrency />
        <StatCard title="Today's Profit" value={s.todayProfit || 0} icon={TrendingUp} isCurrency />
        <StatCard title="Monthly Profit" value={s.monthlyProfit || 0} icon={TrendingUp} isCurrency />
        <StatCard title="Pending Services" value={s.pendingServices || 0} icon={Briefcase} />
        <StatCard title="Completed Today" value={s.completedServices || 0} icon={CheckCircle} />
        <StatCard title="Store Sales Today" value={s.departmentStoreSales || 0} icon={ShoppingBag} isCurrency />
        <StatCard title="Inventory Value" value={s.inventoryValue || 0} icon={Package} isCurrency />
        <StatCard title="Low Stock Items" value={s.lowStockProducts || 0} icon={AlertTriangle} />
        <StatCard title="Today's Orders" value={s.todayOrders || 0} icon={ShoppingCart} />
        <StatCard title="Total Customers" value={s.totalCustomers || 0} icon={Users} />
        <StatCard title="Total Products" value={s.totalProducts || 0} icon={Package} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={(charts?.salesChart as Record<string, unknown>[]) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={(charts?.revenueChart as Record<string, unknown>[]) || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Recent Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', label: 'Name' },
                { key: 'mobile', label: 'Mobile' },
                {
                  key: 'createdAt',
                  label: 'Joined Date',
                  render: (r) => formatDate(r.createdAt as string),
                },
              ]}
              data={(summary?.recentCustomers as Record<string, unknown>[]) || []}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Pending Service Deliveries</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={[
                { key: 'name', label: 'Service' },
                { key: 'status', label: 'Status' },
                {
                  key: 'customer',
                  label: 'Customer',
                  render: (r) => (r.customer as { name: string })?.name || '-',
                },
              ]}
              data={(summary?.upcomingServices as Record<string, unknown>[]) || []}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
