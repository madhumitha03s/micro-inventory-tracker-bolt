import { useState, type FormEvent } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Item } from '@/types';
import { Plus, Pencil, Trash2, X, Package, AlertTriangle, Loader2 } from 'lucide-react';
import { isLowStock, formatCurrency } from '@/lib/analytics';

interface InventoryProps {
  items: Item[];
  onRefresh: () => void;
}

export function Inventory({ items, onRefresh }: InventoryProps) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low'>('all');
  const [confirmDelete, setConfirmDelete] = useState<Item | null>(null);

  const filtered = items
    .filter((i) =>
      filter === 'low' ? isLowStock(i.current_stock, i.reorder_level) : true
    )
    .filter((i) => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()));

  const handleEdit = (item: Item) => {
    setEditing(item);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    await supabase.from('items').delete().eq('id', confirmDelete.id);
    setConfirmDelete(null);
    onRefresh();
  };

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
        <div className="flex gap-2 flex-1">
          <input
            type="text"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field max-w-xs"
          />
          <button
            onClick={() => setFilter(filter === 'all' ? 'low' : 'all')}
            className={filter === 'low' ? 'btn-primary' : 'btn-secondary'}
          >
            <span className="flex items-center gap-1.5 text-sm">
              <AlertTriangle className="w-4 h-4" />
              {filter === 'low' ? 'Showing Low Stock' : 'Low Stock Only'}
            </span>
          </button>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {/* Table */}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Package className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No items yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "Add Item" to start tracking your inventory</p>
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500 text-xs uppercase tracking-wide">
                <th className="py-3 px-4 font-medium">Name</th>
                <th className="py-3 px-4 font-medium">Category</th>
                <th className="py-3 px-4 font-medium text-right">Unit Cost</th>
                <th className="py-3 px-4 font-medium text-right">Price</th>
                <th className="py-3 px-4 font-medium text-right">Stock</th>
                <th className="py-3 px-4 font-medium text-right">Reorder At</th>
                <th className="py-3 px-4 font-medium text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const low = isLowStock(item.current_stock, item.reorder_level);
                return (
                  <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {low && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}
                        {item.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-md">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">{formatCurrency(item.unit_cost)}</td>
                    <td className="py-3 px-4 text-right font-medium text-gray-800">{formatCurrency(item.selling_price)}</td>
                    <td className="py-3 px-4 text-right">
                      <span className={`font-semibold ${low ? 'text-amber-600' : 'text-gray-800'}`}>
                        {item.current_stock}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-500">{item.reorder_level}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 rounded-md hover:bg-teal-50 text-gray-400 hover:text-teal-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(item)}
                          className="p-1.5 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">No items match your search</div>
          )}
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <ItemFormModal
          item={editing}
          userId={user!.id}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); onRefresh(); }}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 text-lg">Delete "{confirmDelete.name}"?</h3>
            <p className="text-gray-500 text-sm mt-2">
              This will also delete all transactions for this item. This cannot be undone.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleDelete} className="btn-danger flex-1">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ItemFormModal({ item, userId, onClose, onSaved }: {
  item: Item | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(item?.name || '');
  const [category, setCategory] = useState(item?.category || '');
  const [unitCost, setUnitCost] = useState(String(item?.unit_cost || ''));
  const [sellingPrice, setSellingPrice] = useState(String(item?.selling_price || ''));
  const [currentStock, setCurrentStock] = useState(String(item?.current_stock || '0'));
  const [reorderLevel, setReorderLevel] = useState(String(item?.reorder_level || '0'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      name,
      category: category || 'General',
      unit_cost: parseFloat(unitCost) || 0,
      selling_price: parseFloat(sellingPrice) || 0,
      current_stock: parseInt(currentStock) || 0,
      reorder_level: parseInt(reorderLevel) || 0,
    };

    if (item) {
      const { error } = await supabase.from('items').update(payload).eq('id', item.id);
      if (error) { setError(error.message); setSaving(false); return; }
    } else {
      const { error } = await supabase.from('items').insert({ ...payload, user_id: userId });
      if (error) { setError(error.message); setSaving(false); return; }
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-gray-900 text-lg">{item ? 'Edit Item' : 'Add New Item'}</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Item Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className="input-field" placeholder="e.g. Ramen Noodles" />
          </div>
          <div>
            <label className="label-text">Category</label>
            <input value={category} onChange={(e) => setCategory(e.target.value)} className="input-field" placeholder="e.g. Food" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Unit Cost ($)</label>
              <input required type="number" step="0.01" min="0" value={unitCost} onChange={(e) => setUnitCost(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Selling Price ($)</label>
              <input required type="number" step="0.01" min="0" value={sellingPrice} onChange={(e) => setSellingPrice(e.target.value)} className="input-field" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-text">Current Stock</label>
              <input required type="number" min="0" value={currentStock} onChange={(e) => setCurrentStock(e.target.value)} className="input-field" />
            </div>
            <div>
              <label className="label-text">Reorder Level</label>
              <input required type="number" min="0" value={reorderLevel} onChange={(e) => setReorderLevel(e.target.value)} className="input-field" />
            </div>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 rounded-lg p-3">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {item ? 'Save Changes' : 'Add Item'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
