import { TrendingUp, TrendingDown, DollarSign, Percent, Package, AlertTriangle, ShoppingCart } from 'lucide-react';
import { formatCurrency, isLowStock, calcMovingAverage, suggestedRestock, getDailySalesTrend } from '@/lib/analytics';
import type { Item, Transaction } from '@/types';
import { StockBarChart } from '@/components/StockBarChart';
import { SalesTrendChart } from '@/components/SalesTrendChart';

interface DashboardProps {
  items: Item[];
  transactions: Transaction[];
}

export function Dashboard({ items, transactions }: DashboardProps) {
  const totalItems = items.length;
  const lowStockItems = items.filter((i) => isLowStock(i.current_stock, i.reorder_level));

  // Total profit = sum of (selling_price - unit_cost) * total_sold
  const itemRevenue: Record<string, { revenue: number; cost: number; sold: number }> = {};
  for (const t of transactions) {
    if (t.type !== 'sale') continue;
    const item = items.find((i) => i.id === t.item_id);
    if (!item) continue;
    if (!itemRevenue[t.item_id]) itemRevenue[t.item_id] = { revenue: 0, cost: 0, sold: 0 };
    itemRevenue[t.item_id].revenue += t.quantity * item.selling_price;
    itemRevenue[t.item_id].cost += t.quantity * item.unit_cost;
    itemRevenue[t.item_id].sold += t.quantity;
  }

  const totalRevenue = Object.values(itemRevenue).reduce((a, b) => a + b.revenue, 0);
  const totalCost = Object.values(itemRevenue).reduce((a, b) => a + b.cost, 0);
  const totalProfit = totalRevenue - totalCost;
  const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

  // Stock level bar chart data
  const stockChartData = items.slice(0, 12).map((i) => ({
    label: i.name.length > 10 ? i.name.slice(0, 10) + '…' : i.name,
    value: i.current_stock,
    color: isLowStock(i.current_stock, i.reorder_level) ? '#f59e0b' : '#0d9488',
  }));

  // Sales trend (last 30 days) with revenue
  const trendData = getDailySalesTrend(transactions, 30).map((d) => {
    const daySales = transactions.filter((t) => {
      if (t.type !== 'sale') return false;
      const td = new Date(t.date);
      const dd = new Date(d.date);
      return td.toDateString() === dd.toDateString();
    });
    const rev = daySales.reduce((a, t) => {
      const item = items.find((i) => i.id === t.item_id);
      return a + (item ? t.quantity * item.selling_price : 0);
    }, 0);
    return { label: d.label, value: d.sales, revenue: rev };
  });

  // Top 5 sellers
  const topSellers = Object.entries(itemRevenue)
    .map(([id, data]) => {
      const item = items.find((i) => i.id === id);
      return item ? { item, ...data } : null;
    })
    .filter((x): x is { item: Item; revenue: number; cost: number; sold: number } => x !== null)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Revenue"
          value={formatCurrency(totalRevenue)}
          color="teal"
        />
        <StatCard
          icon={totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
          label="Total Profit"
          value={formatCurrency(totalProfit)}
          color={totalProfit >= 0 ? 'green' : 'red'}
        />
        <StatCard
          icon={<Percent className="w-5 h-5" />}
          label="Avg Margin"
          value={`${margin.toFixed(1)}%`}
          color="amber"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Low Stock Items"
          value={String(lowStockItems.length)}
          color={lowStockItems.length > 0 ? 'red' : 'gray'}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package className="w-4 h-4 text-teal-600" />
            Stock Levels
          </h3>
          {totalItems === 0 ? (
            <EmptyChart message="Add items to see stock levels" />
          ) : (
            <StockBarChart data={stockChartData} />
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-teal-600" />
            Sales Trend (Last 30 Days)
          </h3>
          <SalesTrendChart data={trendData} />
        </div>
      </div>

      {/* Top sellers + low stock */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-teal-600" />
            Top 5 Sellers
          </h3>
          {topSellers.length === 0 ? (
            <EmptyChart message="No sales recorded yet" />
          ) : (
            <div className="space-y-3">
              {topSellers.map((s, i) => (
                <div key={s.item.id} className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-gray-200 text-gray-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-teal-50 text-teal-600'
                  }`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{s.item.name}</p>
                    <p className="text-xs text-gray-500">{s.sold} sold · {s.item.category}</p>
                  </div>
                  <span className="text-sm font-semibold text-teal-600">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Low Stock Alerts
          </h3>
          {lowStockItems.length === 0 ? (
            <EmptyChart message="All items are well stocked" />
          ) : (
            <div className="space-y-2">
              {lowStockItems.map((item) => {
                const ma = calcMovingAverage(transactions, item.id);
                const restock = suggestedRestock(ma, item.current_stock);
                return (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 bg-amber-50 rounded-lg border border-amber-100">
                    <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                      <p className="text-xs text-gray-500">
                        {item.current_stock} left · reorder at {item.reorder_level}
                      </p>
                    </div>
                    {restock > 0 && (
                      <span className="text-xs font-medium text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
                        Restock ~{restock}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'teal' | 'green' | 'red' | 'amber' | 'gray';
}) {
  const colors: Record<string, string> = {
    teal: 'bg-teal-50 text-teal-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    gray: 'bg-gray-100 text-gray-500',
  };
  return (
    <div className="card flex items-center gap-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
      </div>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
      {message}
    </div>
  );
}
