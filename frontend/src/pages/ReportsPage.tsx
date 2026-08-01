import { useEffect, useState } from 'react';
import { Printer, TrendingUp, TrendingDown, IndianRupee, FileText } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDate } from '@/lib/utils';

export default function ReportsPage() {
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/daily', {
        params: { from: fromDate, to: toDate },
      });
      setReportData(res.data.data);
    } catch {
      toast.error('Failed to load financial report data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fromDate, toDate]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description="Comprehensive financial reporting, Profit & Loss summary, and store audit metrics"
        action={
          <Button onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" /> Print Report
          </Button>
        }
      />

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button className="mt-5" onClick={fetchReports} disabled={loading}>
              {loading ? 'Generating...' : 'Apply Date Filter'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground font-mono mt-2 sm:mt-0">
            Period: {formatDate(fromDate)} to {formatDate(toDate)}
          </div>
        </CardContent>
      </Card>

      {/* Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Period Revenue"
          value={reportData?.income || 0}
          icon={IndianRupee}
          isCurrency
        />
        <StatCard
          title="Total Operating Expense"
          value={reportData?.expense || 0}
          icon={TrendingDown}
          isCurrency
        />
        <StatCard
          title="Net Profit / Loss"
          value={reportData?.profit || 0}
          icon={TrendingUp}
          isCurrency
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sales Transactions Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>Departmental Store POS Sales ({reportData?.salesCount || 0})</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2">Invoice #</th>
                    <th className="py-2">Payment</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(!reportData?.sales || reportData.sales.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">
                        No sales recorded for this date range
                      </td>
                    </tr>
                  ) : (
                    reportData.sales.slice(0, 10).map((sale: any) => (
                      <tr key={sale.id}>
                        <td className="py-2 font-mono font-medium">{sale.invoiceNo}</td>
                        <td className="py-2">{sale.paymentMethod}</td>
                        <td className="py-2 text-right font-mono font-bold">
                          {formatCurrency(Number(sale.total))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Services Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center justify-between">
              <span>E-Service Applications ({reportData?.servicesCount || 0})</span>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-t">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold text-muted-foreground uppercase">
                    <th className="py-2">Service ID</th>
                    <th className="py-2">Service Name</th>
                    <th className="py-2 text-right">Fee</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {(!reportData?.services || reportData.services.length === 0) ? (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-muted-foreground">
                        No E-Services recorded for this date range
                      </td>
                    </tr>
                  ) : (
                    reportData.services.slice(0, 10).map((svc: any) => (
                      <tr key={svc.id}>
                        <td className="py-2 font-mono font-medium">{svc.serviceCode}</td>
                        <td className="py-2">{svc.name}</td>
                        <td className="py-2 text-right font-mono font-bold">
                          {formatCurrency(Number(svc.totalAmount))}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
