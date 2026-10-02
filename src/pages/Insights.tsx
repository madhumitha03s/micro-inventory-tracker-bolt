import { calcMovingAverage, suggestedRestock, formatCurrency, isLowStock } from '@/lib/analytics';
import type { Item, Transaction } from '@/types';
import { Brain, Package, TrendingUp, AlertTriangle } from 'lucide-react';

interface InsightsProps {
  items: Item[];
  transactions: Transaction[];
}

export function Insights({ items, transactions }: InsightsProps) {
  const itemInsights = items
    .map((item) => {
      const ma = calcMovingAverage(transactions, item.id);
      const restock = suggestedRestock(ma, item.current_stock);
      const low = isLowStock(item.current_stock, item.reorder_level);
      return { item, ma, restock, low };
    })
    .sort((a, b) => b.ma - a.ma);

  const totalSuggested = itemInsights.reduce((a, b) => a + b.restock, 0);
  const totalSuggestedCost = itemInsights.reduce(
    (a, b) => a + b.restock * b.item.unit_cost,
    0
  );
  const highDemand = itemInsights.filter((i) => i.ma > 0).length;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
            <Brain className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">7-Day Avg Demand</p>
            <p className="text-xl font-bold text-gray-900">
              {itemInsights.reduce((a, b) => a + b.ma, 0).toFixed(1)} <span className="text-sm font-normal text-gray-400">units/day</span>
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Items with Active Demand</p>
            <p className="text-xl font-bold text-gray-900">{highDemand}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium">Suggested Restock Cost</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totalSuggestedCost)}</p>
          </div>
        </div>
      </div>

      {/* Insight cards per item */}
      {items.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-16 text-center">
          <Brain className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No insights yet</p>
          <p className="text-gray-400 text-sm mt-1">Add items and log sales to see demand insights</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {itemInsights.map(({ item, ma, restock, low }) => (
            <div key={item.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {low && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  <div>
                    <h4 className="font-semibold text-gray-800">{item.name}</h4>
                    <p className="text-xs text-gray-500">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Current Stock</p>
                  <p className={`text-lg font-bold ${low ? 'text-amber-600' : 'text-gray-800'}`}>{item.current_stock}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-500">7-Day Moving Avg</p>
                  <p className="text-lg font-bold text-teal-600">
                    {ma.toFixed(2)} <span className="text-xs font-normal text-gray-400">/day</span>
                  </p>
                  <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-teal-500 rounded-full transition-all"
                      style={{ width: `${Math.min(ma * 20, 100)}%` }}
                    />
                  </div>
                </div>
                <div className={`rounded-lg p-3 ${restock > 0 ? 'bg-amber-50' : 'bg-green-50'}`}>
                  <p className={`text-xs ${restock > 0 ? 'text-amber-600' : 'text-green-600'}`}>Suggested Restock</p>
                  <p className={`text-lg font-bold ${restock > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                    {restock > 0 ? `~${restock} units` : 'Stocked'}
                  </p>
                  {restock > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Est. cost: {formatCurrency(restock * item.unit_cost)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
