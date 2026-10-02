import { type Transaction } from '@/types';

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function isLowStock(current: number, reorder: number): boolean {
  return current <= reorder;
}

/** Compute 7-day moving average of sales per item. */
export function calcMovingAverage(transactions: Transaction[], itemId: string): number {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const sales = transactions.filter(
    (t) => t.item_id === itemId && t.type === 'sale' && new Date(t.date) >= sevenDaysAgo
  );

  if (sales.length === 0) return 0;

  // Group by day
  const dailyTotals: Record<string, number> = {};
  for (const t of sales) {
    const day = new Date(t.date).toDateString();
    dailyTotals[day] = (dailyTotals[day] || 0) + t.quantity;
  }

  const days = Object.keys(dailyTotals).length;
  const total = Object.values(dailyTotals).reduce((a, b) => a + b, 0);

  // Average per day across the 7-day window (including zero-sale days)
  return total / 7;
}

/** Suggested restock = avg daily sales * 14 days - current stock, min 0. */
export function suggestedRestock(movingAverage: number, currentStock: number): number {
  const projectedDemand = movingAverage * 14;
  const needed = Math.ceil(projectedDemand - currentStock);
  return Math.max(0, needed);
}

/** Get sales for the last N days grouped by date for trend chart. */
export function getDailySalesTrend(
  transactions: Transaction[],
  days: number
): { date: string; label: string; sales: number; revenue: number }[] {
  const result: { date: string; label: string; sales: number; revenue: number }[] = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(now);
    day.setDate(now.getDate() - i);
    day.setHours(0, 0, 0, 0);
    const nextDay = new Date(day);
    nextDay.setDate(day.getDate() + 1);

    const daySales = transactions.filter((t) => {
      const tDate = new Date(t.date);
      return t.type === 'sale' && tDate >= day && tDate < nextDay;
    });

    const sales = daySales.reduce((a, b) => a + b.quantity, 0);
    const revenue = daySales.reduce((a, b) => a + b.quantity * 0, 0); // revenue computed with item price by caller

    result.push({
      date: day.toISOString().split('T')[0],
      label: day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      sales,
      revenue,
    });
  }

  return result;
}
