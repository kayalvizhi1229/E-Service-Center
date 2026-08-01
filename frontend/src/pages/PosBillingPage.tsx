import { useState, useEffect } from 'react';
import { Search, ShoppingCart, Plus, Minus, Trash2, Printer, CheckCircle2, User } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import { PageHeader, Modal } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';

interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  sellingPrice: number;
  mrp: number;
  gstPercent: number;
  availableStock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
  unitPrice: number;
  discount: number;
  gstPercent: number;
  total: number;
}

interface Customer {
  id: string;
  name: string;
  mobile: string;
}

interface SaleReceipt {
  invoiceNo: string;
  createdAt: string;
  customer?: Customer;
  paymentMethod: string;
  subtotal: number;
  gstAmount: number;
  discount: number;
  total: number;
  paidAmount: number;
  changeAmount: number;
  items: Array<{
    product: { name: string };
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
}

export default function PosBillingPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('CASH');
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<SaleReceipt | null>(null);

  useEffect(() => {
    api.get('/customers', { params: { limit: 100 } }).then((res) => {
      setCustomers(res.data.data);
    });
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      api.get('/products', { params: { search: searchQuery, limit: 10 } }).then((res) => {
        setSearchResults(res.data.data);
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const res = await api.get(`/products/barcode/${searchQuery.trim()}`);
      if (res.data.data) {
        addToCart(res.data.data);
        setSearchQuery('');
        setSearchResults([]);
      }
    } catch {
      toast.error(`Product with barcode/SKU "${searchQuery}" not found`);
    }
  };

  const addToCart = (product: Product) => {
    if (product.availableStock <= 0) {
      toast.error(`"${product.name}" is out of stock!`);
      return;
    }

    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.product.id === product.id);
      if (existingIndex > -1) {
        const item = prev[existingIndex];
        if (item.quantity >= product.availableStock) {
          toast.warning(`Maximum available stock reached for ${product.name}`);
          return prev;
        }
        const updated = [...prev];
        const newQty = item.quantity + 1;
        const lineSub = item.unitPrice * newQty - item.discount;
        const lineGst = (lineSub * item.gstPercent) / 100;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          total: lineSub + lineGst,
        };
        return updated;
      }

      const price = Number(product.sellingPrice);
      const gst = Number(product.gstPercent || 0);
      const total = price + (price * gst) / 100;
      return [
        ...prev,
        {
          product,
          quantity: 1,
          unitPrice: price,
          discount: 0,
          gstPercent: gst,
          total,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            if (newQty > item.product.availableStock) {
              toast.warning(`Only ${item.product.availableStock} units available`);
              return item;
            }
            const lineSub = item.unitPrice * newQty - item.discount;
            const lineGst = (lineSub * item.gstPercent) / 100;
            return {
              ...item,
              quantity: newQty,
              total: lineSub + lineGst,
            };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const totalGst = cart.reduce(
    (sum, item) => sum + ((item.unitPrice * item.quantity - item.discount) * item.gstPercent) / 100,
    0
  );
  const grandTotal = Math.max(0, subtotal + totalGst - billDiscount);
  const changeAmount = Math.max(0, paidAmount - grandTotal);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        customerId: selectedCustomerId || undefined,
        items: cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount,
          gstPercent: item.gstPercent,
        })),
        discount: billDiscount,
        paymentMethod,
        paidAmount: paidAmount > 0 ? paidAmount : grandTotal,
      };

      const res = await api.post('/sales', payload);
      toast.success('Sale completed successfully!');
      setReceipt(res.data.data);
      setCart([]);
      setBillDiscount(0);
      setPaidAmount(0);
      setSelectedCustomerId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to complete sale');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="POS Billing Counter"
        description="Point of Sale billing and instant counter checkout for Departmental Store"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Product Search & Items Selection */}
        <div className="lg:col-span-7 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Product Search / Barcode Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Scan Barcode or type Product Name / SKU..."
                    className="pl-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button type="submit">Scan</Button>
              </form>

              {searchResults.length > 0 && (
                <div className="mt-3 divide-y rounded-md border bg-card max-h-60 overflow-y-auto">
                  {searchResults.map((prod) => (
                    <div
                      key={prod.id}
                      className="flex items-center justify-between p-3 hover:bg-accent cursor-pointer"
                      onClick={() => {
                        addToCart(prod);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                    >
                      <div>
                        <p className="font-medium text-sm">{prod.name}</p>
                        <p className="text-xs text-muted-foreground">
                          SKU: {prod.sku} | Barcode: {prod.barcode || 'N/A'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-primary">
                          {formatCurrency(Number(prod.sellingPrice))}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Stock: {prod.availableStock}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart Table */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Current Cart ({cart.length} items)
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart([])}>
                  Clear Cart
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="mx-auto h-12 w-12 stroke-1 text-muted-foreground/50 mb-2" />
                  <p>Cart is empty. Scan barcodes or search products to begin billing.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs font-semibold text-muted-foreground uppercase">
                        <th className="py-2 px-1">Item</th>
                        <th className="py-2 px-1 text-right">Price</th>
                        <th className="py-2 px-1 text-center">Qty</th>
                        <th className="py-2 px-1 text-right">Total</th>
                        <th className="py-2 px-1 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {cart.map((item) => (
                        <tr key={item.product.id}>
                          <td className="py-3 px-1">
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">GST: {item.gstPercent}%</p>
                          </td>
                          <td className="py-3 px-1 text-right font-mono">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, -1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-8 text-center font-bold">{item.quantity}</span>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => updateQuantity(item.product.id, 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                          <td className="py-3 px-1 text-right font-bold text-primary font-mono">
                            {formatCurrency(item.total)}
                          </td>
                          <td className="py-3 px-1 text-center">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-600"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Checkout & Billing Details */}
        <div className="lg:col-span-5 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Checkout & Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1 flex items-center gap-1">
                  <User className="h-3.5 w-3.5" /> Customer Selection
                </label>
                <Select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                >
                  <option value="">Walk-in Customer (General)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.mobile})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">
                  Payment Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['CASH', 'UPI', 'CARD', 'CREDIT'].map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={paymentMethod === mode ? 'default' : 'outline'}
                      className="w-full text-xs font-bold"
                      onClick={() => setPaymentMethod(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total GST:</span>
                  <span className="font-mono">{formatCurrency(totalGst)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Discount (₹):</span>
                  <Input
                    type="number"
                    min="0"
                    className="w-28 text-right h-8 font-mono"
                    value={billDiscount}
                    onChange={(e) => setBillDiscount(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-between items-center pt-2 border-t text-lg font-bold text-primary">
                  <span>Grand Total:</span>
                  <span className="font-mono">{formatCurrency(grandTotal)}</span>
                </div>

                <div className="flex justify-between items-center text-sm pt-1">
                  <span className="text-muted-foreground">Paid Amount (₹):</span>
                  <Input
                    type="number"
                    min="0"
                    placeholder={grandTotal.toString()}
                    className="w-28 text-right h-8 font-mono"
                    value={paidAmount || ''}
                    onChange={(e) => setPaidAmount(Number(e.target.value))}
                  />
                </div>

                {paidAmount > grandTotal && (
                  <div className="flex justify-between text-sm font-bold text-emerald-600">
                    <span>Change Due:</span>
                    <span className="font-mono">{formatCurrency(changeAmount)}</span>
                  </div>
                )}
              </div>

              <Button
                className="w-full h-12 text-base font-bold mt-4"
                disabled={cart.length === 0 || submitting}
                onClick={handleCheckout}
              >
                {submitting ? 'Processing Sale...' : 'Complete & Print Bill'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sale Receipt Modal */}
      {receipt && (
        <Modal open={Boolean(receipt)} onClose={() => setReceipt(null)} title="Invoice Receipt">
          <div className="space-y-4 p-2 font-mono text-sm">
            <div className="text-center border-b pb-3">
              <h2 className="text-lg font-bold">YOGA INFOTECH</h2>
              <p className="text-xs">E-Service Center & Departmental Store</p>
              <p className="text-xs">Periyapattu, Cuddalore, TN 608801</p>
              <p className="text-xs font-semibold mt-1">Invoice #: {receipt.invoiceNo}</p>
              <p className="text-xs text-muted-foreground">{new Date(receipt.createdAt).toLocaleString()}</p>
            </div>

            <div className="space-y-1 text-xs">
              <p>Customer: {receipt.customer?.name || 'Walk-in Customer'}</p>
              <p>Payment: {receipt.paymentMethod}</p>
            </div>

            <table className="w-full text-xs border-y py-2 my-2">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-1">Item</th>
                  <th className="py-1 text-center">Qty</th>
                  <th className="py-1 text-right">Amt</th>
                </tr>
              </thead>
              <tbody>
                {receipt.items.map((it, idx) => (
                  <tr key={idx}>
                    <td className="py-1">{it.product.name}</td>
                    <td className="py-1 text-center">{it.quantity}</td>
                    <td className="py-1 text-right">{formatCurrency(it.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="space-y-1 text-xs text-right">
              <p>Subtotal: {formatCurrency(receipt.subtotal)}</p>
              <p>GST: {formatCurrency(receipt.gstAmount)}</p>
              {receipt.discount > 0 && <p>Discount: -{formatCurrency(receipt.discount)}</p>}
              <p className="text-base font-bold text-black border-t pt-1">
                Total: {formatCurrency(receipt.total)}
              </p>
              <p>Paid: {formatCurrency(receipt.paidAmount)}</p>
              {receipt.changeAmount > 0 && <p>Change: {formatCurrency(receipt.changeAmount)}</p>}
            </div>

            <div className="pt-4 flex gap-2">
              <Button className="w-full" onClick={() => window.print()}>
                <Printer className="mr-2 h-4 w-4" /> Print Bill
              </Button>
              <Button variant="outline" className="w-full" onClick={() => setReceipt(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
