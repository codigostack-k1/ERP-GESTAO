
import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DollarSign, 
  TrendingDown, 
  Coins, 
  AlertTriangle, 
  CheckCircle,
  Trophy,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar,
  ChevronRight,
  Clock,
  BarChart3,
  Lock
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { StorageService } from '../services/storageService';
import { User, Sale, Transaction, Product, CartItem, UserRole } from '../types';

interface DashboardProps {
  currentUser: User | null;
  t: (key: string) => string;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  subtext?: string;
  textColor?: string;
}

const StatCard = ({ title, value, icon: Icon, color, subtext, textColor }: StatCardProps) => (
  <div className="card p-6 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-dark-text-muted">{title}</p>
        <h3 className={`text-2xl font-bold mt-1 ${textColor || 'text-gray-900 dark:text-dark-text'}`}>{value}</h3>
      </div>
      <div className={`p-3 rounded-lg ${color} text-white shadow-sm`}>
        <Icon size={24} />
      </div>
    </div>
    {subtext && <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-2">{subtext}</p>}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ currentUser, t }) => {
  const navigate = useNavigate();
  
  const sales = useMemo(() => StorageService.getSales(), []);
  const products = useMemo(() => StorageService.getProducts(), []);
  const transactions = useMemo(() => StorageService.getTransactions(), []);

  const hasPermission = useCallback((permissionKey: string) => {
      if (!currentUser) return false;
      if (currentUser.role === UserRole.ADMIN) return true;
      return currentUser.customPermissions?.includes(permissionKey);
  }, [currentUser]);

  // --- STATE FOR DATE FILTER ---
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // KPI Calculations
  const todayStr = new Date().toISOString().split('T')[0];
  
  // 1. Vendas Hoje
  const todaysSales = useMemo(() => sales.filter((s: Sale) => s.date.startsWith(todayStr)), [sales, todayStr]);
  const totalRevenueToday = useMemo(() => todaysSales.reduce((acc: number, curr: Sale) => acc + curr.total, 0), [todaysSales]);
  
  // 2. Despesas Hoje (Type: EXPENSE)
  const todaysExpenses = useMemo(() => transactions
    .filter((t: Transaction) => t.date.startsWith(todayStr) && t.type === 'EXPENSE')
    .reduce((acc: number, t: Transaction) => acc + t.amount, 0), [transactions, todayStr]);

  // 3. Lucro Real Hoje
  const netProfitToday = totalRevenueToday - todaysExpenses;

  // 4. Outros indicadores
  const lowStockProducts = useMemo(() => products.filter((p: Product) => p.stock <= p.minStock), [products]);
  
  const expiringProducts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const limitDate = new Date();
    limitDate.setDate(today.getDate() + 60);

    return products.filter((p: Product) => {
        if (p.stock <= 0) return false;
        if (!p.expiryDate) return false;
        const expiry = new Date(p.expiryDate);
        return expiry <= limitDate;
    }).sort((a, b) => {
        return new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime();
    });
  }, [products]);

  // --- CHART DATA LOGIC ---
  const chartData = useMemo(() => {
    const daysInMonth = new Date(
      parseInt(selectedMonth.split('-')[0]),
      parseInt(selectedMonth.split('-')[1]),
      0
    ).getDate();

    const data = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const day = i.toString().padStart(2, '0');
      const dateStr = `${selectedMonth}-${day}`;
      
      const daySales = sales
        .filter(s => s.date.startsWith(dateStr) && (s.status === 'PAID' || !s.status))
        .reduce((acc, s) => acc + s.total, 0);

      data.push({
        name: day,
        vendas: daySales
      });
    }
    return data;
  }, [selectedMonth, sales]);
  
  // --- RANKING LOGIC ---
  
  // Helper: Get Available Months for Dropdown
  const availableMonths = useMemo(() => {
      const months = new Set<string>();
      sales.forEach((s: Sale) => months.add(s.date.slice(0, 7)));
      months.add(new Date().toISOString().slice(0, 7));
      return Array.from(months).sort().reverse().slice(0, 12); 
  }, [sales]);

  const getProductStatsByMonth = useCallback((month: string) => {
      const stats: Record<string, { id: string, name: string, qty: number, revenue: number }> = {};
      
      sales.filter((s: Sale) => s.date.startsWith(month) && (s.status === 'PAID' || !s.status)).forEach((sale: Sale) => {
          sale.items.forEach((item: CartItem) => {
              if (!stats[item.id]) {
                  stats[item.id] = { id: item.id, name: item.name, qty: 0, revenue: 0 };
              }
              stats[item.id].qty += item.quantity;
              stats[item.id].revenue += (item.price * item.quantity);
          });
      });
      return stats;
  }, [sales]);

  const rankingData = useMemo(() => {
      const currentStats = getProductStatsByMonth(selectedMonth);
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevDate = new Date(year, month - 2, 1);
      const prevMonthStr = prevDate.toISOString().slice(0, 7);
      const prevStats = getProductStatsByMonth(prevMonthStr);

      const ranking = Object.values(currentStats)
          .sort((a, b) => b.qty - a.qty) 
          .slice(0, 10); 

      const maxQty = ranking.length > 0 ? ranking[0].qty : 1;

      return ranking.map((item, index) => {
          const prevQty = prevStats[item.id]?.qty || 0;
          let trend: 'UP' | 'DOWN' | 'EQUAL' = 'EQUAL';
          if (item.qty > prevQty) trend = 'UP';
          else if (item.qty < prevQty) trend = 'DOWN';

          return {
              ...item,
              rank: index + 1,
              trend,
              progress: (item.qty / maxQty) * 100
          };
      });
  }, [selectedMonth, getProductStatsByMonth]);

  const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dash.title')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{t('dash.subtitle')} {new Date().toLocaleDateString('pt-BR')}</p>
        </div>
        
        <div className="relative">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="pl-3 pr-8 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm text-gray-700 dark:text-dark-text"
          >
            {availableMonths.map(m => (
              <option key={m} value={m}>
                {new Date(m + '-01').toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}
              </option>
            ))}
          </select>
          <Calendar size={14} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {hasPermission('WIDGET_KPI_SALES_TODAY') ? (
          <StatCard 
            title={t('dash.sales_today')}
            value={formatCurrency(totalRevenueToday)} 
            icon={DollarSign} 
            color="bg-blue-600" 
            subtext={`${todaysSales.length} ${t('dash.transactions')}`}
          />
        ) : <div className="card p-6 flex items-center justify-center text-gray-400 font-medium text-sm"><Lock size={16} className="mr-2"/> KPI Oculto</div>}
        
        {hasPermission('WIDGET_KPI_EXPENSES_TODAY') ? (
          <StatCard 
            title={t('dash.expenses_today')}
            value={formatCurrency(todaysExpenses)} 
            icon={TrendingDown} 
            color="bg-red-500" 
            textColor="text-red-600 dark:text-red-400"
            subtext={t('dash.outflows')}
          />
        ) : <div className="card p-6 flex items-center justify-center text-gray-400 font-medium text-sm"><Lock size={16} className="mr-2"/> KPI Oculto</div>}

        {hasPermission('WIDGET_KPI_PROFIT_TODAY') ? (
          <StatCard 
            title={t('dash.profit_today')} 
            value={formatCurrency(netProfitToday)} 
            icon={Coins} 
            color={netProfitToday >= 0 ? "bg-green-600" : "bg-orange-500"} 
            textColor={netProfitToday >= 0 ? "text-green-600 dark:text-green-400" : "text-orange-500"}
            subtext={t('dash.sales_minus_exp')}
          />
        ) : <div className="card p-6 flex items-center justify-center text-gray-400 font-medium text-sm"><Lock size={16} className="mr-2"/> KPI Oculto</div>}

        {hasPermission('WIDGET_KPI_LOW_STOCK') ? (
          <StatCard 
            title={t('dash.low_stock')}
            value={lowStockProducts.length} 
            icon={AlertTriangle} 
            color="bg-yellow-500" 
            subtext={t('dash.attention')}
          />
        ) : <div className="card p-6 flex items-center justify-center text-gray-400 font-medium text-sm"><Lock size={16} className="mr-2"/> KPI Oculto</div>}

        {hasPermission('WIDGET_KPI_EXPIRY') ? (
          <StatCard 
            title="Validade Próxima"
            value={expiringProducts.length} 
            icon={Clock} 
            color="bg-orange-600" 
            subtext="Alertas (60 dias)"
          />
        ) : <div className="card p-6 flex items-center justify-center text-gray-400 font-medium text-sm"><Lock size={16} className="mr-2"/> KPI Oculto</div>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Side List (Alertas) */}
        <div className="card p-6 flex flex-col h-full lg:col-span-3">
          <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg text-red-600">
                  <AlertTriangle size={20} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">{t('dash.alerts')}</h3>
          </div>
          
          <div className="flex-1">
            {lowStockProducts.length === 0 && expiringProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-dark-text-muted py-10">
                  <CheckCircle size={48} className="mb-4 opacity-20 text-green-500" />
                  <p className="text-sm font-medium">{t('dash.stock_healthy')}</p>
                  <p className="text-xs opacity-70">Nenhum alerta crítico no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Alertas de Stock Baixo */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase border-b border-gray-150 dark:border-gray-700/60 pb-2 flex items-center gap-1.5 tracking-wider">
                    <AlertTriangle size={14} className="text-red-500 animate-pulse" />
                    Alertas de Stock Baixo ({lowStockProducts.length})
                  </h4>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {lowStockProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-dark-text-muted italic py-4">Sem stock baixo de momento.</p>
                    ) : (
                      lowStockProducts.map((product: Product) => (
                        <div key={`stock-${product.id}`} className="flex flex-col p-4 bg-red-50/50 dark:bg-red-950/10 rounded-xl border border-red-100 dark:border-red-900/30 hover:border-red-300 dark:hover:border-red-800 transition-all cursor-pointer" onClick={() => navigate('/warehouse/stock-list')}>
                          <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-white dark:bg-red-950/80 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/40">Stock Baixo</span>
                              <span className="text-xs text-red-400 dark:text-red-500 font-mono">Ref: {product.code}</span>
                          </div>
                          <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate mb-2" title={product.name}>{product.name}</p>
                          
                          <div className="flex justify-between items-end">
                              <div>
                                  <p className="text-[10px] text-gray-500 dark:text-dark-text-muted uppercase">Stock Atual</p>
                                  <p className="text-lg font-bold text-red-600 dark:text-red-400">{product.stock}</p>
                              </div>
                              <button className="text-xs bg-white dark:bg-dark-card border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1.5 rounded-lg transition-colors shadow-sm font-medium">
                                Repor
                              </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Alertas de Validade */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase border-b border-gray-150 dark:border-gray-700/60 pb-2 flex items-center gap-1.5 tracking-wider">
                    <Clock size={14} className="text-orange-500" />
                    Produtos Próximos a Vencer ({expiringProducts.length})
                  </h4>
                  <div className="space-y-3 max-h-[380px] overflow-y-auto pr-1.5 custom-scrollbar">
                    {expiringProducts.length === 0 ? (
                      <p className="text-xs text-gray-400 dark:text-dark-text-muted italic py-4">Sem alertas de validade de momento.</p>
                    ) : (
                      expiringProducts.map((product: Product) => {
                          const expiryDate = new Date(product.expiryDate!);
                          const today = new Date();
                          today.setHours(0, 0, 0, 0);
                          const isExpired = expiryDate < today;
                          const diffDays = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                          return (
                            <div key={`expiry-${product.id}`} className={`flex flex-col p-4 ${isExpired ? 'bg-orange-50/50 dark:bg-orange-950/10 border-orange-100 dark:border-orange-900/30 hover:border-orange-300 dark:hover:border-orange-800' : 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-100 dark:border-blue-900/30 hover:border-blue-300 dark:hover:border-blue-800'} rounded-xl border transition-all cursor-pointer`} onClick={() => navigate('/inventory')}>
                              <div className="flex justify-between items-start mb-2">
                                  <span className={`text-xs font-bold ${isExpired ? 'text-orange-600 bg-white dark:bg-orange-950 border-orange-100' : 'text-blue-600 bg-white dark:bg-blue-950 border-blue-150'} px-2 py-0.5 rounded border`}>
                                      {isExpired ? 'Expirado' : `Vence em ${diffDays} dias`}
                                  </span>
                                  <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">Ref: {product.code}</span>
                              </div>
                              <p className="text-sm font-bold text-gray-900 dark:text-dark-text truncate mb-2" title={product.name}>{product.name}</p>
                              
                              <div className="flex justify-between items-end">
                                  <div>
                                      <p className="text-[10px] text-gray-500 dark:text-dark-text-muted uppercase">Data de Validade</p>
                                      <p className={`text-sm font-bold ${isExpired ? 'text-orange-600' : 'text-blue-600'}`}>
                                          {expiryDate.toLocaleDateString('pt-PT')}
                                      </p>
                                  </div>
                                  <Clock size={16} className={isExpired ? 'text-orange-400' : 'text-blue-400'} />
                              </div>
                            </div>
                          );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sales Chart */}
        {hasPermission('WIDGET_CHART') ? (
          <div className="lg:col-span-3 card p-6">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-blue-600">
                <BarChart3 size={20} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Volume de Vendas no Mês</h3>
                <p className="text-xs text-gray-500 dark:text-dark-text-muted">Total faturado por dia</p>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f3f4f6' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [formatCurrency(value), 'Vendas']}
                  />
                  <Bar dataKey="vendas" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.vendas > 0 ? '#2563eb' : '#e5e7eb'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 gap-2 min-h-[300px]">
            <Lock size={32} />
            <p className="text-sm font-medium">Gráfico de desempenho de vendas bloqueado devido a restrições de acesso.</p>
          </div>
        )}
      </div>

      {/* Ranking Mensal de Produtos (Full Width Lower Section) */}
      <div className="card flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-white/5">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg text-yellow-600">
                  <Trophy size={20} />
              </div>
              <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text">Produtos Mais Vendidos</h3>
                  <p className="text-xs text-gray-500 dark:text-dark-text-muted">Desempenho no período selecionado</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/sales/reports')}
              className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 flex items-center gap-1"
            >
                Ver Tudo <ChevronRight size={12} />
            </button>
        </div>

        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-dark-text-muted font-semibold">
                  <tr>
                      <th className="px-6 py-3 w-16 text-center">Pos..</th>
                      <th className="px-6 py-3">Produto</th>
                      <th className="px-6 py-3 text-center">Tendência</th>
                      <th className="px-6 py-3 text-right">Qtd. Vendida</th>
                      <th className="px-6 py-3 text-right">Volume (MZN)</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                  {rankingData.length === 0 ? (
                      <tr>
                          <td colSpan={5} className="px-6 py-12 text-center text-gray-400 dark:text-dark-text-muted">
                              Sem vendas registradas neste período.
                          </td>
                      </tr>
                  ) : (
                      rankingData.map((item, idx) => (
                          <tr 
                              key={item.id} 
                              onClick={() => navigate('/sales/products')}
                              className={`group transition-colors cursor-pointer hover:bg-blue-50 dark:hover:bg-white/5 ${idx % 2 !== 0 ? 'bg-gray-50/30 dark:bg-white/[0.02]' : ''}`}
                          >
                              <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs ${
                                      item.rank === 1 ? 'bg-yellow-100 text-yellow-700' : 
                                      item.rank === 2 ? 'bg-gray-200 text-gray-700' :
                                      item.rank === 3 ? 'bg-orange-100 text-orange-800' :
                                      'text-gray-500 dark:text-dark-text-muted'
                                  }`}>
                                      {item.rank}º
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex flex-col">
                                      <span className="font-bold text-gray-900 dark:text-dark-text group-hover:text-blue-600 transition-colors">
                                          {item.name}
                                      </span>
                                      <span className="text-[10px] text-gray-400 dark:text-dark-text-muted font-mono">ID: {item.id}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                  {item.trend === 'UP' && <span className="inline-flex items-center text-green-600 dark:text-green-400 text-xs font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded"><ArrowUp size={12} className="mr-1"/> Alta</span>}
                                  {item.trend === 'DOWN' && <span className="inline-flex items-center text-red-600 dark:text-red-400 text-xs font-bold bg-red-50 dark:bg-red-900/20 px-2 py-1 rounded"><ArrowDown size={12} className="mr-1"/> Baixa</span>}
                                  {item.trend === 'EQUAL' && <span className="inline-flex items-center text-gray-400 dark:text-dark-text-muted text-xs font-bold"><Minus size={12} className="mr-1"/> Igual</span>}
                              </td>
                              <td className="px-6 py-4 relative">
                                  <div className="relative z-10 text-right font-bold text-gray-800 dark:text-dark-text">
                                      {item.qty} un
                                  </div>
                                  <div 
                                      className="absolute top-1/2 right-6 transform -translate-y-1/2 h-1.5 bg-blue-200 dark:bg-blue-900/50 rounded-full opacity-50 transition-all duration-500"
                                      style={{ width: `calc(${item.progress}% - 3rem)` }}
                                  ></div>
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-gray-600 dark:text-dark-text-muted">
                                  {formatCurrency(item.revenue)}
                              </td>
                          </tr>
                      ))
                  )}
              </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
