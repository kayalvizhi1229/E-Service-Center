import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { PageHeader, DataTable } from '@/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function InventoryPage() {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [lowStock, setLowStock] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/inventory', { params: { limit: 50 } }),
      api.get('/inventory/low-stock'),
    ]).then(([inv, low]) => {
      setData(inv.data.data);
      setLowStock(low.data.data);
    }).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Stock Management" description="Current stock, alerts, and inventory tracking" />

      {lowStock.length > 0 && (
        <Card className="mb-6 border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardHeader><CardTitle className="text-lg text-yellow-800 dark:text-yellow-400">Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStock.map((item, i) => (
                <Badge key={i} variant="warning">
                  {(item.product as { name: string })?.name}: {item.quantity as number} left
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <DataTable
        loading={loading}
        data={data}
        columns={[
          { key: 'product', label: 'Product', render: (r) => (r.product as { name: string })?.name },
          { key: 'quantity', label: 'Quantity' },
          { key: 'rackLocation', label: 'Rack' },
          { key: 'batchNo', label: 'Batch' },
          { key: 'expiryDate', label: 'Expiry', render: (r) => r.expiryDate ? new Date(r.expiryDate as string).toLocaleDateString() : '-' },
        ]}
      />
    </div>
  );
}
