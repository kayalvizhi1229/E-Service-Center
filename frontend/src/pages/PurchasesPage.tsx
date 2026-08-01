import { useEffect, useState } from 'react';
import { Plus, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, DataTable, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, formatDate } from '@/lib/utils';

interface PurchaseItemRow {
  productId: string;
  quantity: number;
  unitPrice: number;
  gstPercent: number;
}

interface PurchaseOrder {
  id: string;
  purchaseNo: string;
  supplierId: string;
  subtotal: number;
  gstAmount: number;
  total: number;
  paidAmount: number;
  status: string;
  purchaseDate: string;
  supplier?: { id: string; name: string };
  items?: Array<{
    id: string;
    product: { name: string };
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string; purchasePrice: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [viewingPurchase, setViewingPurchase] = useState<PurchaseOrder | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [supplierId, setSupplierId] = useState('');
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [lineItems, setLineItems] = useState<PurchaseItemRow[]>([]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes] = await Promise.all([
        api.get('/purchases', { params: { search, limit: 100 } }),
        api.get('/suppliers', { params: { limit: 100 } }),
        api.get('/products', { params: { limit: 200 } }),
      ]);
      setPurchases(purRes.data.data);
      setSuppliers(supRes.data.data);
      setProducts(prodRes.data.data);
    } catch {
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  const addLineItem = () => {
    if (products.length === 0) return;
    const defaultProduct = products[0];
    setLineItems((prev) => [
      ...prev,
      {
        productId: defaultProduct.id,
        quantity: 1,
        unitPrice: Number(defaultProduct.purchasePrice || 0),
        gstPercent: 0,
      },
    ]);
  };

  const updateLineItem = (index: number, field: keyof PurchaseItemRow, value: any) => {
    setLineItems((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'productId') {
        const prod = products.find((p) => p.id === value);
        if (prod) updated[index].unitPrice = Number(prod.purchasePrice || 0);
      }
      return updated;
    });
  };

  const removeLineItem = (index: number) => {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  };

  const calculatedSubtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const calculatedGst = lineItems.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.gstPercent) / 100,
    0
  );
  const calculatedTotal = calculatedSubtotal + calculatedGst;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }
    if (lineItems.length === 0) {
      toast.error('Please add at least one purchase line item');
      return;
    }

    setActionLoading(true);
    try {
      const payload = {
        supplierId,
        items: lineItems,
        paidAmount: Number(paidAmount) || 0,
        notes,
      };

      await api.post('/purchases', payload);
      toast.success('Purchase order created successfully');
      setModalOpen(false);
      setLineItems([]);
      setSupplierId('');
      setPaidAmount(0);
      setNotes('');
      fetchData();
    } catch {
      toast.error('Failed to create purchase order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Purchases"
        description="Manage stock purchase orders, supplier bills, and inventory restocking"
        action={
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Purchase Order
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search purchases by PO Number..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <DataTable
        loading={loading}
        data={purchases as unknown as Record<string, unknown>[]}
        columns={[
          { key: 'purchaseNo', label: 'PO Number' },
          {
            key: 'supplier',
            label: 'Supplier',
            render: (r) => (r.supplier as { name: string })?.name || '-',
          },
          {
            key: 'total',
            label: 'Total Amount',
            render: (r) => formatCurrency(Number(r.total || 0)),
          },
          {
            key: 'paidAmount',
            label: 'Paid Amount',
            render: (r) => formatCurrency(Number(r.paidAmount || 0)),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => <Badge variant="default">{r.status as string}</Badge>,
          },
          {
            key: 'purchaseDate',
            label: 'Order Date',
            render: (r) => formatDate(r.purchaseDate as string),
          },
          {
            key: 'actions',
            label: 'Actions',
            render: (r) => {
              const item = r as unknown as PurchaseOrder;
              return (
                <Button variant="ghost" size="icon" title="View Purchase Details" onClick={() => setViewingPurchase(item)}>
                  <Eye className="h-4 w-4 text-blue-600" />
                </Button>
              );
            },
          },
        ]}
      />

      {/* New Purchase Order Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Purchase Order">
        <form onSubmit={handleSubmit} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          <div>
            <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
              Select Supplier <span className="text-destructive">*</span>
            </label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">Choose Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-muted-foreground uppercase">
                Purchase Items ({lineItems.length})
              </label>
              <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Add Product Line
              </Button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-center border p-2 rounded-md bg-accent/30">
                <div className="col-span-4">
                  <Select
                    value={item.productId}
                    onChange={(e) => updateLineItem(idx, 'productId', e.target.value)}
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateLineItem(idx, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-3">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Cost"
                    value={item.unitPrice}
                    onChange={(e) => updateLineItem(idx, 'unitPrice', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-2">
                  <Input
                    type="number"
                    min="0"
                    max="28"
                    placeholder="GST%"
                    value={item.gstPercent}
                    onChange={(e) => updateLineItem(idx, 'gstPercent', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-1 text-center">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600"
                    onClick={() => removeLineItem(idx)}
                  >
                    ×
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1 text-right text-sm">
            <p>Subtotal: <span className="font-mono">{formatCurrency(calculatedSubtotal)}</span></p>
            <p>GST Amount: <span className="font-mono">{formatCurrency(calculatedGst)}</span></p>
            <p className="text-base font-bold text-primary">
              Total Order Value: <span className="font-mono">{formatCurrency(calculatedTotal)}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Amount Paid (₹)
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={paidAmount}
                onChange={(e) => setPaidAmount(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                Notes
              </label>
              <Input
                placeholder="Invoice reference or delivery notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? 'Creating...' : 'Create Purchase Order'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Purchase Order Details Modal */}
      {viewingPurchase && (
        <Modal open={Boolean(viewingPurchase)} onClose={() => setViewingPurchase(null)} title="Purchase Order Details">
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>
                <h3 className="font-bold text-lg">{viewingPurchase.purchaseNo}</h3>
                <p className="text-xs text-muted-foreground">Supplier: {viewingPurchase.supplier?.name}</p>
              </div>
              <Badge variant="default">{viewingPurchase.status}</Badge>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase">Items Included</h4>
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-muted text-left border-b text-xs font-semibold">
                    <th className="p-2">Product</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Cost</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewingPurchase.items?.map((it) => (
                    <tr key={it.id} className="border-b">
                      <td className="p-2">{it.product?.name}</td>
                      <td className="p-2 text-center">{it.quantity}</td>
                      <td className="p-2 text-right">{formatCurrency(Number(it.unitPrice))}</td>
                      <td className="p-2 text-right font-bold">{formatCurrency(Number(it.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-right space-y-1 text-sm pt-2">
              <p>Total Amount: <span className="font-bold text-primary font-mono">{formatCurrency(Number(viewingPurchase.total))}</span></p>
              <p>Paid Amount: <span className="font-mono">{formatCurrency(Number(viewingPurchase.paidAmount))}</span></p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
