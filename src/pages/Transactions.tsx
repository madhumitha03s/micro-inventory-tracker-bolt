import { useState, type FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import type { Item, Transaction } from '@/types';
import { Plus, ShoppingCart, PackagePlus, X, Loader2, TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/analytics';

interface TransactionsProps {
  items: Item[];
  transactions: Transaction[];
  onRefresh: () => void;
}

export function Transactions({ items, transactions, onRefresh }: TransactionsProps) {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sale' | 'restock'>('all');

  const sorted = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const filtered = sorted.filter((t) => filter === 'all' || t.type === filter);

  const itemName = (id: string) => items.find((i) => i.id === id)?.name || 'Unknown';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'sale', 'restock'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={filter === f ? 'btn-primary' : 'btn-secondary'}
            >
              <span className="text-sm capitalize">{f === 'all' ? 'All' : f + 's'}</span>
            </button>
          ))}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2" disabled={items.length === 0}>
          <Plus className="w-4 h-4" />
          Log Transaction
        </button>
      </div>

      {transactions.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No transactions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {items.length === 0 ? 'Add items first, then log sales and restocks' : 'Log a sale or restock to get started'}
          </p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Item</th>
                <th className="py-3 px-4 font-medium text-right">Quantity</th>
                <th className="py-3 px-4 font-medium text-right">Value</th>
                <th className="py-3 px-4 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const item = items.find((i) => i.id === t.item_id);
                const value = item ? (t.type === 'sale' ? t.quantity * item.selling_price : t.quantity * item.unit_cost) : 0;
                return (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md ${
                        t.type === 'sale' ? 'bg-teal-50 text-teal-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {t.type === 'sale' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {t.type === 'sale' ? 'Sale' : 'Restock'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-800">{itemName(t.item_id)}</td>
                    <td className="py-3 px-4 text-right text-gray-700 font-medium">{t.quantity}</td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(value)}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(t.date)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No {filter} transactions found</div>
          )}
        </div>
      )}

      {showForm && (
        <TransactionFormModal
          items={items}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); onRefresh(); }}
        />
      )}
    </div>
  );
}

function TransactionFormModal({ items, onClose, onSaved }: {
  items: Item[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [itemId, setItemId] = useState(items[0]?.id || '');
  const [type, setType] = useState<'sale' | 'restock'>('sale');
  const [quantity, setQuantity] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 16));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedItem = items.find((i) => i.id === itemId);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const qty = parseInt(quantity);
    if (!qty || qty <= 0) {
      setError('Quantity must be a positive number');
      setSaving(false);
      return;
    }

    if (type === 'sale' && selectedItem && qty > selectedItem.current_stock) {
      setError(`Not enough stock. Current: ${selectedItem.current_stock}`);
      setSaving(false);
      return;
    }

    // Insert transaction
    const { error: txError } = await supabase.from('transactions').insert({
      item_id: itemId,
      type,
      quantity: qty,
      date: new Date(date).toISOString(),
    });

    if (txError) { setError(txError.message); setSaving(false); return; }

    // Update stock
    const stockDelta = type === 'sale' ? -qty : qty;
    const newStock = (selectedItem?.current_stock || 0) + stockDelta;
    const { error: itemError } = await supabase
      .from('items')
      .update({ current_stock: newStock })
      .eq('id', itemId);

    if (itemError) { setError(itemError.message); setSaving(false); return; }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">Log Transaction</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type toggle */}
          <div>
            <label className="label-text">Transaction Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType('sale')}
                className={`flex-1 py-2.5 rounded-lg border font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  type === 'sale' ? 'border-teal-500 bg-teal-50 text-teal-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                Sale
              </button>
              <button
                type="button"
                onClick={() => setType('restock')}
                className={`flex-1 py-2.5 rounded-lg border font-medium text-sm flex items-center justify-center gap-2 transition-all ${
                  type === 'restock' ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <PackagePlus className="w-4 h-4" />
                Restock
              </button>
            </div>
          </div>

          <div>
            <label className="label-text">Item</label>
            <select value={itemId} onChange={(e) => setItemId(e.target.value)} className="input-field">
              {items.map((i) => (
                <option key={i.id} value={i.id}>{i.name} ({i.current_stock} in stock)</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Quantity</label>
              <input required type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Date & Time</label>
              <input required type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="input-field" />
            </div>
          </div>

          {selectedItem && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
              {type === 'sale' ? (
                <span>Selling {quantity} × {formatCurrency(selectedItem.selling_price)} = <strong>{formatCurrency(parseInt(quantity) * selectedItem.selling_price)}</strong></span>
              ) : (
                <span>Restocking {quantity} × {formatCurrency(selectedItem.unit_cost)} = <strong>{formatCurrency(parseInt(quantity) * selectedItem.unit_cost)}</strong></span>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Log Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
