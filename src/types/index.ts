export interface Item {
  id: string;
  user_id: string;
  name: string;
  category: string;
  unit_cost: number;
  selling_price: number;
  current_stock: number;
  reorder_level: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  item_id: string;
  type: 'sale' | 'restock';
  quantity: number;
  date: string;
  created_at: string;
}

export interface ItemWithStats extends Item {
  avg_daily_sales_7d: number;
  suggested_restock: number;
  total_sold: number;
  total_revenue: number;
}
