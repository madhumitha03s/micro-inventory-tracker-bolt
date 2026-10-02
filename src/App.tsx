import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Item, Transaction } from '@/types';
import { LoginPage } from '@/pages/LoginPage';
import { Dashboard } from '@/pages/Dashboard';
import { Inventory } from '@/pages/Inventory';
import { Transactions } from '@/pages/Transactions';
import { Insights } from '@/pages/Insights';
import { TrendingUp, LayoutDashboard, Package, ShoppingCart, Brain, LogOut, Loader2 } from 'lucide-react';

type View = 'dashboard' | 'inventory' | 'transactions' | 'insights';

function App() {
  const { session, loading, signOut } = useAuth();
  const [view, setView] = useState<View>('dashboard');
  const [items, setItems] = useState<Item[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    const [itemsRes, txRes] = await Promise.all([
      supabase.from('items').select('*').order('created_at', { ascending: true }),
      supabase.from('transactions').select('*').order('date', { ascending: true }),
    ]);
    setItems((itemsRes.data as Item[]) || []);
    setTransactions((txRes.data as Transaction[]) || []);
    setDataLoading(false);
  }, []);

  useEffect(() => {
    if (session) loadData();
  }, [session, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!session) {
    return <LoginPage />;
  }

  const navItems: { key: View; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'inventory', label: 'Inventory', icon: <Package className="w-4 h-4" /> },
    { key: 'transactions', label: 'Transactions', icon: <ShoppingCart className="w-4 h-4" /> },
    { key: 'insights', label: 'Insights', icon: <Brain className="w-4 h-4" /> },
  ];

  const titles: Record<View, string> = {
    dashboard: 'Dashboard',
    inventory: 'Inventory',
    transactions: 'Transactions',
    insights: 'Demand Insights',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg hidden sm:block">StockPulse</span>
          </div>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((n) => (
              <button
                key={n.key}
                onClick={() => setView(n.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  view === n.key
                    ? 'bg-teal-50 text-teal-600'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {n.icon}
                {n.label}
              </button>
            ))}
          </nav>

          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-500 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:block">Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 md:pb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-5">{titles[view]}</h1>
        {dataLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : (
          <>
            {view === 'dashboard' && <Dashboard items={items} transactions={transactions} />}
            {view === 'inventory' && <Inventory items={items} onRefresh={loadData} />}
            {view === 'transactions' && <Transactions items={items} transactions={transactions} onRefresh={loadData} />}
            {view === 'insights' && <Insights items={items} transactions={transactions} />}
          </>
        )}
      </main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40">
        <div className="flex">
          {navItems.map((n) => (
            <button
              key={n.key}
              onClick={() => setView(n.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors ${
                view === n.key ? 'text-teal-600' : 'text-gray-400'
              }`}
            >
              {n.icon}
              <span className="text-[10px] font-medium">{n.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default App;
