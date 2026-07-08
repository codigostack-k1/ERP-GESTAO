
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Filter, 
  PieChart, 
  FileSpreadsheet,
  Printer,
  Activity
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { StorageService } from '../services/storageService';
import { AppConfig, Sale, Transaction } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';

interface FinancialReportsProps {
  config: AppConfig;
}

const FinancialReports: React.FC<FinancialReportsProps> = ({ config }) => {
  // --- State ---
  const [sales] = useState<Sale[]>(() => StorageService.getSales());
  const [transactions] = useState<Transaction[]>(() => StorageService.getTransactions());
  
  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [selectedCategory, setSelectedCategory] = useState('ALL');

  // --- Calculations & Logic ---

  const filteredData = useMemo(() => {
    const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
    const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

    const filteredSales = sales.filter(s => {
      const d = new Date(s.date).getTime();
      const matchDate = d >= start && d <= end && s.status === 'PAID';
      const matchCat = selectedCategory === 'ALL' || selectedCategory === 'Vendas PDV';
      return matchDate && matchCat;
    });

    const filteredTrans = transactions.filter(t => {
      const d = new Date(t.date).getTime();
      const matchDate = d >= start && d <= end;
      const matchCat = selectedCategory === 'ALL' || t.category === selectedCategory;
      return matchDate && matchCat && t.status === 'PAID';
    });

    return { sales: filteredSales, transactions: filteredTrans };
  }, [sales, transactions, startDate, endDate, selectedCategory]);

  // 1. Executive Summary KPIs
  const kpis = useMemo(() => {
    const salesRevenue = filteredData.sales.reduce((acc, s) => acc + s.total, 0);
    const otherIncome = filteredData.transactions
      .filter(t => t.type === 'INCOME' && t.category !== 'Vendas PDV')
      .reduce((acc, t) => acc + t.amount, 0);
    
    const totalExpenses = filteredData.transactions
      .filter(t => t.type === 'EXPENSE')
      .reduce((acc, t) => acc + t.amount, 0);

    const netResult = (salesRevenue + otherIncome) - totalExpenses;

    return { salesRevenue, otherIncome, totalRevenue: salesRevenue + otherIncome, totalExpenses, netResult };
  }, [filteredData]);

  // 2. Weekly Comparison Data (Chart) - Optimized for Trends
  const chartData = useMemo(() => {
    const data: Record<string, { name: string, date: number, Receitas: number, Despesas: number }> = {};

    const getWeekKeyAndStart = (dateStr: string) => {
      const d = new Date(dateStr);
      const day = d.getDay();
      // Monday is the first day of the week. Adjusting for Sunday.
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const startOfWeek = new Date(d.setDate(diff));
      startOfWeek.setHours(0, 0, 0, 0);
      
      const dayStr = String(startOfWeek.getDate()).padStart(2, '0');
      const monthStr = String(startOfWeek.getMonth() + 1).padStart(2, '0');
      const label = `Sem. ${dayStr}/${monthStr}`;
      return { label, timestamp: startOfWeek.getTime() };
    };

    filteredData.sales.forEach(s => {
      const { label, timestamp } = getWeekKeyAndStart(s.date);
      if (!data[label]) data[label] = { name: label, date: timestamp, Receitas: 0, Despesas: 0 };
      data[label].Receitas += s.total;
    });

    filteredData.transactions.forEach(t => {
      const { label, timestamp } = getWeekKeyAndStart(t.date);
      if (!data[label]) data[label] = { name: label, date: timestamp, Receitas: 0, Despesas: 0 };
      if (t.type === 'INCOME') data[label].Receitas += t.amount;
      else data[label].Despesas += t.amount;
    });

    return Object.values(data).sort((a, b) => a.date - b.date); 
  }, [filteredData]);

  // 3. Cost Classification Data (Table)
  const costClassification = useMemo(() => {
    const categories: Record<string, number> = {};
    
    filteredData.transactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  // Helpers
  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';
  
  const availableCategories = useMemo(() => {
    const cats = new Set(transactions.map(t => t.category));
    return ['ALL', 'Vendas PDV', ...Array.from(cats)];
  }, [transactions]);

  // --- Export Actions ---

  const handleExport = (type: 'PDF' | 'EXCEL') => {
      const byMethod: Record<string, number> = {};
      const byDate: Record<string, { in: number, out: number }> = {};
      const byCategory: Record<string, number> = {};

      const addDate = (date: string, amount: number, type: 'in' | 'out') => {
          const d = date.split('T')[0];
          if (!byDate[d]) byDate[d] = { in: 0, out: 0 };
          byDate[d][type] += amount;
      };

      filteredData.sales.forEach(s => {
          byMethod[s.paymentMethod] = (byMethod[s.paymentMethod] || 0) + s.total;
          addDate(s.date, s.total, 'in');
      });

      filteredData.transactions.forEach(t => {
          if (t.type === 'INCOME') {
              byMethod[t.method || 'CASH'] = (byMethod[t.method || 'CASH'] || 0) + t.amount;
              addDate(t.date, t.amount, 'in');
          } else {
              byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
              addDate(t.date, t.amount, 'out');
          }
      });

      if (type === 'PDF') {
          DocumentGenerator.Tesouraria.gerarDemonstracaoFinanceira(kpis, config);
      } else {
          // EXCEL (CSV)
          let csv = "RELATORIO FINANCEIRO;Periodo: " + startDate + " a " + endDate + "\n\n";
          csv += "Receita Vendas;" + kpis.salesRevenue + "\n";
          csv += "Outros Recebimentos;" + kpis.otherIncome + "\n";
          csv += "Total Custos;-" + kpis.totalExpenses + "\n";
          csv += "Resultado Liquido;" + kpis.netResult + "\n";
          
          const encodedUri = encodeURI("data:text/csv;charset=utf-8," + csv);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          link.setAttribute("download", "Relatorio_Financeiro.csv");
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  return (
    <div className="flex flex-col gap-8 pb-10 font-sans text-gray-800 dark:text-gray-100" id="modulo-relatorios-bi">
      
      {/* --- HEADER & FILTERS --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <PieChart className="text-teal-600" />
            Relatórios Financeiros
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Análise de desempenho e saúde financeira.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto items-end">
           <div className="flex flex-col gap-1 w-full md:w-auto">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Período de Análise</label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent border-none text-sm outline-none px-2 py-1 dark:text-white" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent border-none text-sm outline-none px-2 py-1 dark:text-white" />
              </div>
           </div>

           <div className="flex flex-col gap-1 w-full md:w-48">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Centro de Custo</label>
              <div className="relative">
                  <Filter className="absolute left-2 top-2.5 text-gray-400" size={14} />
                  <select 
                    value={selectedCategory}
                    onChange={e => setSelectedCategory(e.target.value)}
                    className="w-full pl-8 pr-2 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-teal-500 appearance-none dark:text-white"
                  >
                      <option value="ALL">Todas Categorias</option>
                      {availableCategories.filter(c => c !== 'ALL').map(c => (
                          <option key={c} value={c}>{c}</option>
                      ))}
                  </select>
              </div>
           </div>

           <div className="flex gap-2">
              <button onClick={() => handleExport('PDF')} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/30 transition-all font-bold text-xs uppercase tracking-widest">
                  <Printer size={16} /> Relatório A4
              </button>
              <button onClick={() => handleExport('EXCEL')} className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 rounded-xl transition-all font-bold text-xs uppercase tracking-widest">
                  <FileSpreadsheet size={16} /> Excel
              </button>
           </div>
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-l-4 border-teal-500 flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Receita Bruta Total</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-2">{formatCurrency(kpis.totalRevenue)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-2 text-teal-600 text-sm font-bold">
                  <TrendingUp size={16} /> <span>Fluxo de Entrada</span>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between transition-transform hover:-translate-y-1">
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Total de Saídas</p>
                  <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-2">{formatCurrency(kpis.totalExpenses)}</h3>
              </div>
              <div className="mt-4 flex items-center gap-2 text-red-600 text-sm font-bold">
                  <TrendingDown size={16} /> <span>Fluxo de Saída</span>
              </div>
          </div>

          <div className={`bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border-l-4 flex flex-col justify-between transition-transform hover:-translate-y-1 ${kpis.netResult >= 0 ? 'border-green-500' : 'border-red-600'}`}>
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Resultado Líquido</p>
                  <h3 className={`text-2xl font-black mt-2 ${kpis.netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(kpis.netResult)}
                  </h3>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 font-bold">
                  <DollarSign size={16} /> <span>Balanço do Período</span>
              </div>
          </div>

          <div className="bg-slate-900 p-6 rounded-2xl shadow-lg flex flex-col justify-center items-center text-white text-center">
              <Calendar size={32} className="mb-2 text-blue-400" />
              <p className="text-[10px] font-black uppercase opacity-60 tracking-[0.2em]">Competência</p>
              <p className="font-bold mt-1 text-sm">
                  {new Date(startDate).toLocaleDateString()} <br/> <span className="opacity-40">até</span> <br/> {new Date(endDate).toLocaleDateString()}
              </p>
          </div>
      </div>

      {/* --- TREND CHART SECTION --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                  <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Activity size={20} className="text-blue-600" />
                      Análise Comparativa Ocorrencial (Trends)
                  </h3>
              </div>
              <div className="h-72 w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                              <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                          <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} />
                          <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(value) => `${value/1000}k`} />
                          <Tooltip 
                              cursor={{stroke: '#2563eb', strokeWidth: 1}}
                              contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                              formatter={(value: number) => [`${value} MT`, 'Valor']}
                          />
                          <Legend iconType="circle" />
                          <Area 
                            type="monotone" 
                            dataKey="Receitas" 
                            stroke="#10B981" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorIn)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="Despesas" 
                            stroke="#EF4444" 
                            strokeWidth={3}
                            fillOpacity={1} 
                            fill="url(#colorOut)" 
                            activeDot={{ r: 6, strokeWidth: 0 }}
                          />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
              <div className="p-5 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 text-sm uppercase tracking-wider">
                      <TrendingDown size={18} className="text-red-500" />
                      Impacto por Categoria
                  </h3>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                  <table className="w-full text-left text-sm">
                      <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 font-bold text-[10px] uppercase tracking-widest sticky top-0">
                          <tr>
                              <th className="px-5 py-3">Categoria</th>
                              <th className="px-5 py-3 text-right">Valor</th>
                              <th className="px-5 py-3 text-right">%</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                          {costClassification.length === 0 ? (
                              <tr><td colSpan={3} className="p-10 text-center text-gray-400 italic">Nenhum dado analítico</td></tr>
                          ) : (
                              costClassification.map((item, idx) => {
                                  const percentage = kpis.totalExpenses > 0 ? (item.value / kpis.totalExpenses) * 100 : 0;
                                  return (
                                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                          <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-200">{item.name}</td>
                                          <td className="px-5 py-3 text-right text-gray-500 dark:text-gray-400 font-mono text-xs">{formatCurrency(item.value)}</td>
                                          <td className="px-5 py-3 text-right">
                                              <div className="flex items-center justify-end gap-2">
                                                  <span className="text-[10px] font-black text-gray-500">{percentage.toFixed(0)}%</span>
                                                  <div className="w-12 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                      <div className="h-full bg-red-500" style={{ width: `${percentage}%` }}></div>
                                                  </div>
                                              </div>
                                          </td>
                                      </tr>
                                  );
                              })
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {/* --- PREVIEW MODAL A4 --- */}
    </div>
  );
};

export default FinancialReports;
