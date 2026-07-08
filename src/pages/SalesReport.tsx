
import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Calendar, 
  Filter, 
  BarChart2, 
  List, 
  DollarSign, 
  ShoppingBag, 
  TrendingUp,
  Receipt,
  ChevronLeft,
  ChevronRight,
  Layers,
  Printer
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { StorageService } from '../services/storageService';
import { Sale, AppConfig, User as UserType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';

interface SalesReportProps {
  config: AppConfig;
}

const SalesReport: React.FC<SalesReportProps> = ({ config }) => {
  const [sales] = useState<Sale[]>(() => StorageService.getSales());
  const [users] = useState<UserType[]>(() => StorageService.getUsers());
  const [dateRange, setDateRange] = useState(() => {
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    return {
        start: firstDay.toISOString().split('T')[0],
        end: lastDay.toISOString().split('T')[0]
    };
  });
  const [filterSource] = useState<'ALL' | 'POS' | 'INVOICE'>('ALL');
  const [filterMethod, setFilterMethod] = useState('ALL');
  const [searchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'ANALYTICS' | 'TAX'>('TRANSACTIONS');
  const [fiscalSubTab, setFiscalSubTab] = useState<'SUMMARY' | 'SALES' | 'ENTRIES'>('SUMMARY');
  const [products] = useState(() => StorageService.getProducts(true));
  const [stockEntries] = useState(() => StorageService.getStockEntries());
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const methodsToShow = useMemo(() => {
      const allMethods = config.paymentMethods || [];
      return allMethods.filter(m => 
          m.isActive || sales.some(s => s.paymentMethod === m.id || (s.paymentDetails && s.paymentDetails.some(pd => pd.method === m.id)))
      );
  }, [config.paymentMethods, sales]);

  const filteredSales = useMemo(() => {
      const start = dateRange.start ? new Date(dateRange.start).setHours(0,0,0,0) : 0;
      const end = dateRange.end ? new Date(dateRange.end).setHours(23,59,59,999) : Infinity;

      return sales.filter(s => {
          const d = new Date(s.date).getTime();
          if (d < start || d > end) return false;
          if (filterSource === 'POS') {
              const isPos = s.type === 'PDV' || (!s.id.includes('/') && !s.type);
              if (!isPos) return false;
          }
          if (filterSource === 'INVOICE') {
              const isInvoice = s.type === 'INVOICE' || (s.id.includes('/') && !s.type);
              if (!isInvoice) return false;
          }
          
          if (filterMethod !== 'ALL') {
              const matchMain = s.paymentMethod === filterMethod;
              const matchDetails = s.paymentDetails?.some(pd => pd.method === filterMethod);
              if (!matchMain && !matchDetails) return false;
          }

          if (searchQuery) {
              const q = searchQuery.toLowerCase();
              return s.id.toLowerCase().includes(q) || (s.customerId && s.customerId.toLowerCase().includes(q));
          }
          return true;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, dateRange, filterSource, filterMethod, searchQuery]);

  const kpis = useMemo(() => {
      let revenue = 0;
      let profit = 0;
      filteredSales.forEach(s => {
          revenue += s.total;
          const cost = s.items.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
          profit += (s.total - cost);
      });
      return {
          revenue,
          profit,
          count: filteredSales.length,
          ticket: filteredSales.length > 0 ? revenue / filteredSales.length : 0
      };
  }, [filteredSales]);

  const productPerformance = useMemo(() => {
      const prods: Record<string, { name: string, qty: number, revenue: number }> = {};
      filteredSales.forEach(s => {
          s.items.forEach(item => {
              if (!prods[item.id]) prods[item.id] = { name: item.name, qty: 0, revenue: 0 };
              prods[item.id].qty += item.quantity;
              prods[item.id].revenue += (item.price * item.quantity);
          });
      });
      return Object.values(prods).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [filteredSales]);

  const sellerPerformance = useMemo(() => {
      const sellers: Record<string, number> = {};
      filteredSales.forEach(s => {
          const userName = users.find(u => u.id === s.userId)?.name || 'Desconhecido';
          sellers[userName] = (sellers[userName] || 0) + s.total;
      });
      return Object.entries(sellers).map(([name, value]) => ({ name, value }));
  }, [filteredSales, users]);

  const fiscalSummary = useMemo(() => {
      const rate = config.ivaRate || 16;
      
      // Create products map for quick lookup
      const productsMap = new Map(products.map(p => [p.id, p]));

      // 1. Apuramento de IVA sobre Vendas (IVA Liquidado)
      const salesList = filteredSales.filter(s => s.status !== 'VOID').map(s => {
          let saleGross = 0;
          let saleIncidence = 0;
          let saleExempt = 0;
          let saleVat = 0;

          s.items.forEach(item => {
              const itemTotal = item.price * item.quantity;
              saleGross += itemTotal;

              // Lookup product to check if ivaEnabled !== false
              const prod = productsMap.get(item.id);
              const isIvaEnabled = prod ? (prod.ivaEnabled !== false) : (item.ivaEnabled !== false);

              if (isIvaEnabled) {
                  const itemVat = itemTotal * (rate / (100 + rate));
                  const itemBase = itemTotal - itemVat;
                  saleIncidence += itemBase;
                  saleVat += itemVat;
              } else {
                  saleExempt += itemTotal;
              }
          });

          return {
              id: s.id,
              date: s.date,
              gross: saleGross,
              incidence: saleIncidence,
              exempt: saleExempt,
              vat: saleVat
          };
      });

      // Sum everything cleanly via reduce
      const totalSalesGross = salesList.reduce((acc, s) => acc + s.gross, 0);
      const totalSalesIncidence = salesList.reduce((acc, s) => acc + s.incidence, 0);
      const totalSalesExempt = salesList.reduce((acc, s) => acc + s.exempt, 0);
      const totalSalesVatLiquidado = salesList.reduce((acc, s) => acc + s.vat, 0);

      // 2. Apuramento de IVA sobre Entradas de Mercadoria (IVA Dedutível)
      const start = dateRange.start ? new Date(dateRange.start).setHours(0,0,0,0) : 0;
      const end = dateRange.end ? new Date(dateRange.end).setHours(23,59,59,999) : Infinity;

      const activeEntries = stockEntries.filter(entry => {
          if (entry.status === 'VOID') return false;
          const d = new Date(entry.date).getTime();
          return d >= start && d <= end;
      });

      const entriesList = activeEntries.map(entry => {
          let entryGross = 0;
          let entryIncidence = 0;
          let entryExempt = 0;
          let entryVat = 0;

          entry.items.forEach(item => {
              const itemTotal = item.cost * item.quantity;
              entryGross += itemTotal;

              const prod = productsMap.get(item.productId);
              const isIvaEnabled = prod ? (prod.ivaEnabled !== false) : true; // Default entries to incident if not specified

              if (isIvaEnabled) {
                  const itemVat = itemTotal * (rate / (100 + rate));
                  const itemBase = itemTotal - itemVat;
                  entryIncidence += itemBase;
                  entryVat += itemVat;
              } else {
                  entryExempt += itemTotal;
              }
          });

          return {
              id: entry.id,
              invoiceNo: entry.invoiceNo,
              supplierName: entry.supplierName,
              date: entry.date,
              gross: entryGross,
              incidence: entryIncidence,
              exempt: entryExempt,
              vat: entryVat
          };
      });

      // Sum everything cleanly via reduce
      const totalEntriesGross = entriesList.reduce((acc, e) => acc + e.gross, 0);
      const totalEntriesIncidence = entriesList.reduce((acc, e) => acc + e.incidence, 0);
      const totalEntriesExempt = entriesList.reduce((acc, e) => acc + e.exempt, 0);
      const totalEntriesVatDeductible = entriesList.reduce((acc, e) => acc + e.vat, 0);

      // 3. Resultado Final do Apuramento de IVA (A pagar ou A recuperar)
      const vatBalance = totalSalesVatLiquidado - totalEntriesVatDeductible;
      const isPayable = vatBalance > 0;
      const finalAmount = Math.abs(vatBalance);

      return {
          rate,
          sales: salesList,
          entries: entriesList,
          totals: {
              salesGross: totalSalesGross,
              salesIncidence: totalSalesIncidence,
              salesExempt: totalSalesExempt,
              salesVatLiquidado: totalSalesVatLiquidado,
              entriesGross: totalEntriesGross,
              entriesIncidence: totalEntriesIncidence,
              entriesExempt: totalEntriesExempt,
              entriesVatDeductible: totalEntriesVatDeductible,
              vatBalance,
              isPayable,
              finalAmount
          }
      };
  }, [filteredSales, stockEntries, products, dateRange, config.ivaRate]);

  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedData = filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExportPDF = () => {
      DocumentGenerator.Vendas.gerarExtratoVendas(filteredSales, config);
  };

  const handleExportSubcategories = () => {
      DocumentGenerator.Vendas.gerarExtratoVendas(filteredSales, config);
  };

  const handleExportCSV = () => {
      const headers = ["Data", "Documento", "Cliente", "Vendedor", "Valor_Venda", "Custo_Total", "Lucro_Estimado"];
      const rows = filteredSales.map(s => {
          const seller = users.find(u => u.id === s.userId)?.name || 'Sistema';
          const cost = s.items.reduce((acc, i) => acc + (i.cost * i.quantity), 0);
          return [
              new Date(s.date).toLocaleDateString(),
              s.id,
              s.customerId || 'Final',
              seller,
              s.total.toFixed(2),
              cost.toFixed(2),
              (s.total - cost).toFixed(2)
          ].join(";");
      });
      const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + rows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Relatorio_Vendas_Consolidado_${dateRange.start}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 font-sans">
      {/* 1. TOP HEADER & FILTERS */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row justify-between gap-4 shrink-0">
          <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <BarChart2 className="text-blue-600" /> Relatórios de Vendas
              </h1>
              <p className="text-xs text-gray-500">Análise detalhada de performance e faturamento.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Calendar size={14} className="text-gray-400 ml-1"/>
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} className="bg-transparent text-xs outline-none w-24 dark:text-gray-200" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} className="bg-transparent text-xs outline-none w-24 dark:text-gray-200" />
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Filter size={14} className="text-gray-400 ml-1"/>
                  <select 
                    value={filterMethod} 
                    onChange={e => setFilterMethod(e.target.value)}
                    className="bg-transparent text-xs outline-none dark:text-gray-200 appearance-none pr-4"
                  >
                      <option value="ALL">Todos Métodos</option>
                      {methodsToShow.map(m => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
              </div>
              <div className="flex gap-1 ml-2 border-l pl-2 border-gray-200 dark:border-gray-700">
                  <button onClick={handleExportPDF} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors flex items-center gap-1" title="Relatório Gerencial PDF">
                      <FileText size={18} /> <span className="text-xs font-bold uppercase">Relatório A4</span>
                  </button>
                  <button onClick={handleExportCSV} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors flex items-center gap-1" title="Excel">
                      <FileSpreadsheet size={18} /> <span className="text-xs font-bold uppercase">Excel</span>
                  </button>
              </div>
          </div>
      </div>

      {/* 2. KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 shrink-0">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 uppercase">Faturação Total</p><h3 className="text-xl font-bold text-blue-600">{formatCurrency(kpis.revenue)}</h3></div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><DollarSign size={20} /></div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 uppercase">Lucro Estimado</p><h3 className="text-xl font-bold text-green-600">{formatCurrency(kpis.profit)}</h3></div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600"><TrendingUp size={20} /></div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 uppercase">Ticket Médio</p><h3 className="text-xl font-bold text-purple-600">{formatCurrency(kpis.ticket)}</h3></div>
              <div className="p-2 bg-purple-50 rounded-lg text-purple-600"><ShoppingBag size={20} /></div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 uppercase">Vendas</p><h3 className="text-xl font-bold text-gray-800 dark:text-white">{kpis.count}</h3></div>
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600"><List size={20} /></div>
          </div>
      </div>

      {/* 3. TABS & CONTENT AREA */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col min-h-0 overflow-hidden">
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
              <button onClick={() => setActiveTab('TRANSACTIONS')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'TRANSACTIONS' ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Transações</button>
              <button onClick={() => setActiveTab('ANALYTICS')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'ANALYTICS' ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Análise Gráfica</button>
              <button onClick={() => setActiveTab('TAX')} className={`px-6 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'TAX' ? 'border-blue-600 text-blue-600 bg-white dark:bg-gray-800' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Fiscal</button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col p-0">
              {activeTab === 'TRANSACTIONS' && (
                  <div className="flex flex-col h-full">
                      <div className="flex-1 overflow-auto custom-scrollbar">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 font-semibold border-b sticky top-0 z-10">
                                  <tr><th className="px-6 py-3">ID</th><th className="px-6 py-3">Data</th><th className="px-6 py-3">Origem</th><th className="px-6 py-3 text-right">Valor Total</th></tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {paginatedData.map(sale => (
                                      <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                          <td className="px-6 py-3 font-mono text-gray-500">#{sale.id.slice(-6)}</td>
                                          <td className="px-6 py-3">{formatDate(sale.date)}</td>
                                          <td className="px-6 py-3"><span className={`px-2 py-1 rounded text-xs font-bold ${sale.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{sale.status === 'PAID' ? 'PAGO' : 'PENDENTE'}</span></td>
                                          <td className="px-6 py-3 text-right font-bold">{formatCurrency(sale.total)}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                      <div className="p-3 border-t bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-xs text-gray-500">
                          <span>Mostrando {paginatedData.length} de {filteredSales.length} registos</span>
                          <div className="flex items-center gap-2">
                              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-1.5 rounded bg-white border disabled:opacity-50"><ChevronLeft size={14} /></button>
                              <span className="flex items-center px-1">Pág. {currentPage} / {totalPages || 1}</span>
                              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-1.5 rounded bg-white border disabled:opacity-50"><ChevronRight size={14} /></button>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'ANALYTICS' && (
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                      <div className="mb-6 flex justify-end">
                         <button 
                            onClick={handleExportSubcategories}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-lg transition-transform active:scale-95"
                         >
                            <Layers size={16} /> RELATÓRIO POR SUBCATEGORIA (A4)
                         </button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                              <h3 className="font-bold mb-4">Faturamento por Operador</h3>
                              <div className="h-64">
                                  <ResponsiveContainer width="100%" height="100%">
                                      <BarChart data={sellerPerformance} layout="vertical">
                                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                          <XAxis type="number" hide />
                                          <YAxis dataKey="name" type="category" width={80} />
                                          <Tooltip formatter={(val: number) => formatCurrency(val)} />
                                          <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={20} />
                                      </BarChart>
                                  </ResponsiveContainer>
                              </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                               <h3 className="font-bold mb-4">Top 10 Produtos</h3>
                               <div className="overflow-x-auto">
                                  <table className="w-full text-xs">
                                      <thead><tr className="text-gray-400"><th>Produto</th><th className="text-right">Qtd</th><th className="text-right">Receita</th></tr></thead>
                                      <tbody>
                                          {productPerformance.map((p, i) => (
                                              <tr key={i} className="border-b last:border-0"><td className="py-2 font-medium">{p.name}</td><td className="text-right">{p.qty}</td><td className="text-right font-bold">{formatCurrency(p.revenue)}</td></tr>
                                          ))}
                                      </tbody>
                                  </table>
                               </div>
                          </div>
                      </div>
                  </div>
              )}

              {activeTab === 'TAX' && (
                  <div className="flex-1 overflow-auto p-6">
                      <div className="max-w-5xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                          
                          {/* Title */}
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                              <div>
                                  <h3 className="font-extrabold text-lg flex items-center gap-2 text-gray-950 dark:text-white">
                                      <Receipt className="text-blue-600" size={22} /> Apuramento de IVA Oficial ({fiscalSummary.rate}%)
                                  </h3>
                                  <p className="text-xs text-gray-500 mt-1">Confronto de IVA Liquidado (Vendas) e IVA Dedutível (Entradas de Mercadoria) com isenções excluídas.</p>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                  <button
                                      onClick={() => DocumentGenerator.Vendas.gerarRelatorioFiscalCompleto(fiscalSummary, config, dateRange)}
                                      className="flex items-center gap-2 px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold transition-all active:scale-95 shadow-md uppercase"
                                  >
                                      <Printer size={15} /> Relatório Completo (A4)
                                  </button>
                                  <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-2 rounded-xl text-xs font-black">
                                      Taxa: {fiscalSummary.rate}%
                                  </div>
                              </div>
                          </div>

                          {/* Navigation Tabs & Actions */}
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-2 mb-6 border-gray-200 dark:border-gray-700">
                              <div className="flex flex-wrap gap-1">
                                  <button 
                                      onClick={() => setFiscalSubTab('SUMMARY')} 
                                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${fiscalSubTab === 'SUMMARY' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                  >
                                      Resumo de Apuramento
                                  </button>
                                  <button 
                                      onClick={() => setFiscalSubTab('SALES')} 
                                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${fiscalSubTab === 'SALES' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                  >
                                      IVA sobre Vendas ({fiscalSummary.sales.length})
                                  </button>
                                  <button 
                                      onClick={() => setFiscalSubTab('ENTRIES')} 
                                      className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${fiscalSubTab === 'ENTRIES' ? 'border-blue-600 text-blue-600 font-black' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                                  >
                                      IVA sobre Compras/Entradas ({fiscalSummary.entries.length})
                                  </button>
                              </div>
                              <button
                                  onClick={() => {
                                      if (fiscalSubTab === 'SUMMARY') {
                                          DocumentGenerator.Vendas.gerarRelatorioFiscalResumo(fiscalSummary, config, dateRange);
                                      } else if (fiscalSubTab === 'SALES') {
                                          DocumentGenerator.Vendas.gerarRelatorioFiscalVendas(fiscalSummary, config, dateRange);
                                      } else if (fiscalSubTab === 'ENTRIES') {
                                          DocumentGenerator.Vendas.gerarRelatorioFiscalCompras(fiscalSummary, config, dateRange);
                                      }
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-gray-700 hover:border-blue-400 text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/40 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 mb-2 sm:mb-0"
                              >
                                  <Printer size={13} /> Imprimir {fiscalSubTab === 'SUMMARY' ? 'Resumo' : fiscalSubTab === 'SALES' ? 'Lista de Vendas' : 'Lista de Compras'}
                              </button>
                          </div>

                          {/* Sub-Tab 1: SUMMARY */}
                          {fiscalSubTab === 'SUMMARY' && (
                              <div className="space-y-6">
                                  {/* Result Banner Card */}
                                  <div className={`p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                                      fiscalSummary.totals.finalAmount === 0 
                                          ? 'bg-gray-50 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800'
                                          : fiscalSummary.totals.isPayable
                                              ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800/50'
                                              : 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800/50'
                                  }`}>
                                      <div className="space-y-1">
                                          <span className="text-[10px] font-black tracking-wider uppercase text-gray-400">Estado de Imposto</span>
                                          <h4 className={`text-lg font-black ${
                                              fiscalSummary.totals.finalAmount === 0 
                                                  ? 'text-gray-700 dark:text-gray-300'
                                                  : fiscalSummary.totals.isPayable
                                                      ? 'text-red-700 dark:text-red-400'
                                                      : 'text-green-700 dark:text-green-400'
                                          }`}>
                                              {fiscalSummary.totals.finalAmount === 0 
                                                  ? 'Apuramento Nulo / Equilibrado'
                                                  : fiscalSummary.totals.isPayable
                                                      ? 'IVA A PAGAR AO ESTADO'
                                                      : 'IVA A RECUPERAR (CRÉDITO FISCAL)'}
                                          </h4>
                                          <p className="text-xs text-gray-500 max-w-xl">
                                              {fiscalSummary.totals.finalAmount === 0 
                                                  ? 'Não existem registos incidentes ou o saldo de IVA liquidado e dedutível é exatamente igual.'
                                                  : fiscalSummary.totals.isPayable
                                                      ? 'O valor do IVA recolhido nas vendas é superior ao IVA deduzido nas compras. O saldo deve ser entregue à Autoridade Tributária.'
                                                      : 'O valor do IVA pago na entrada de mercadoria é superior ao IVA recolhido nas vendas. Fica com saldo credor para o período seguinte.'}
                                          </p>
                                      </div>
                                      <div className="text-left md:text-right shrink-0">
                                          <span className="text-[10px] font-bold text-gray-400 uppercase">Valor do Saldo</span>
                                          <div className={`text-2xl font-black md:text-3xl ${
                                              fiscalSummary.totals.finalAmount === 0 
                                                  ? 'text-gray-600 dark:text-gray-400'
                                                  : fiscalSummary.totals.isPayable
                                                      ? 'text-red-600 dark:text-red-500'
                                                      : 'text-green-600 dark:text-green-500'
                                          }`}>
                                              {formatCurrency(fiscalSummary.totals.finalAmount)}
                                          </div>
                                      </div>
                                  </div>

                                  {/* Two-Column Comparison */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {/* IVA Liquidado (Sales) */}
                                      <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                                          <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 border-b pb-2 mb-4 uppercase tracking-wide">
                                              Vendas (IVA Liquidado)
                                          </h4>
                                          <div className="space-y-3 text-sm">
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Faturação Bruta Total:</span>
                                                  <span className="font-semibold">{formatCurrency(fiscalSummary.totals.salesGross)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Base Tributável (Com IVA):</span>
                                                  <span className="font-semibold text-gray-900 dark:text-gray-200">{formatCurrency(fiscalSummary.totals.salesIncidence)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Isenções de IVA (Excluídas):</span>
                                                  <span className="font-semibold text-yellow-600 dark:text-yellow-500">{formatCurrency(fiscalSummary.totals.salesExempt)}</span>
                                              </div>
                                              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                                  <span className="font-bold text-gray-800 dark:text-gray-200">Total IVA Liquidado:</span>
                                                  <span className="font-black text-lg text-red-600">{formatCurrency(fiscalSummary.totals.salesVatLiquidado)}</span>
                                              </div>
                                          </div>
                                      </div>

                                      {/* IVA Dedutível (Purchases) */}
                                      <div className="bg-gray-50 dark:bg-gray-900/30 p-5 rounded-xl border border-gray-100 dark:border-gray-800">
                                          <h4 className="font-black text-sm text-gray-800 dark:text-gray-200 border-b pb-2 mb-4 uppercase tracking-wide">
                                              Compras / Entradas (IVA Dedutível)
                                          </h4>
                                          <div className="space-y-3 text-sm">
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Compras Brutas Totais:</span>
                                                  <span className="font-semibold">{formatCurrency(fiscalSummary.totals.entriesGross)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Base Tributável (Com IVA):</span>
                                                  <span className="font-semibold text-gray-900 dark:text-gray-200">{formatCurrency(fiscalSummary.totals.entriesIncidence)}</span>
                                              </div>
                                              <div className="flex justify-between">
                                                  <span className="text-gray-500">Isenções de IVA (Excluídas):</span>
                                                  <span className="font-semibold text-yellow-600 dark:text-yellow-500">{formatCurrency(fiscalSummary.totals.entriesExempt)}</span>
                                              </div>
                                              <div className="border-t pt-2 mt-2 flex justify-between items-center">
                                                  <span className="font-bold text-gray-800 dark:text-gray-200">Total IVA Dedutível:</span>
                                                  <span className="font-black text-lg text-green-600">{formatCurrency(fiscalSummary.totals.entriesVatDeductible)}</span>
                                              </div>
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          )}

                          {/* Sub-Tab 2: SALES */}
                          {fiscalSubTab === 'SALES' && (
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold">
                                          <tr>
                                              <th className="p-3">Data da Venda</th>
                                              <th className="p-3">Venda ID</th>
                                              <th className="p-3 text-right">Valor Bruto</th>
                                              <th className="p-3 text-right">Base Incidente</th>
                                              <th className="p-3 text-right">Valor Isento</th>
                                              <th className="p-3 text-right text-red-600">IVA Liquidado</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                          {fiscalSummary.sales.length === 0 ? (
                                              <tr>
                                                  <td colSpan={6} className="p-8 text-center text-gray-400">Nenhum registo de venda com IVA no período.</td>
                                              </tr>
                                          ) : (
                                              fiscalSummary.sales.map(s => (
                                                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                                      <td className="p-3 whitespace-nowrap">{formatDate(s.date)}</td>
                                                      <td className="p-3 font-mono font-bold text-xs text-gray-500">#{s.id.slice(-8)}</td>
                                                      <td className="p-3 text-right font-medium">{formatCurrency(s.gross)}</td>
                                                      <td className="p-3 text-right">{formatCurrency(s.incidence)}</td>
                                                      <td className="p-3 text-right text-yellow-600 dark:text-yellow-500 font-semibold">{s.exempt > 0 ? formatCurrency(s.exempt) : '-'}</td>
                                                      <td className="p-3 text-right text-red-600 font-black">{formatCurrency(s.vat)}</td>
                                                  </tr>
                                              ))
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          )}

                          {/* Sub-Tab 3: ENTRIES */}
                          {fiscalSubTab === 'ENTRIES' && (
                              <div className="overflow-x-auto">
                                  <table className="w-full text-sm text-left">
                                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold">
                                          <tr>
                                              <th className="p-3">Data de Entrada</th>
                                              <th className="p-3">Doc / Fatura</th>
                                              <th className="p-3">Fornecedor</th>
                                              <th className="p-3 text-right">Custo Bruto</th>
                                              <th className="p-3 text-right">Base Incidente</th>
                                              <th className="p-3 text-right">Valor Isento</th>
                                              <th className="p-3 text-right text-green-600">IVA Dedutível</th>
                                          </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                          {fiscalSummary.entries.length === 0 ? (
                                              <tr>
                                                  <td colSpan={7} className="p-8 text-center text-gray-400">Nenhum registo de entrada de mercadoria no período.</td>
                                              </tr>
                                          ) : (
                                              fiscalSummary.entries.map(e => (
                                                  <tr key={e.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                                                      <td className="p-3 whitespace-nowrap">{formatDate(e.date)}</td>
                                                      <td className="p-3 font-semibold text-gray-600 dark:text-gray-300">{e.invoiceNo || `ENT-${e.id.slice(-6)}`}</td>
                                                      <td className="p-3 truncate max-w-48 font-medium">{e.supplierName}</td>
                                                      <td className="p-3 text-right font-medium">{formatCurrency(e.gross)}</td>
                                                      <td className="p-3 text-right">{formatCurrency(e.incidence)}</td>
                                                      <td className="p-3 text-right text-yellow-600 dark:text-yellow-500 font-semibold">{e.exempt > 0 ? formatCurrency(e.exempt) : '-'}</td>
                                                      <td className="p-3 text-right text-green-600 font-black">{formatCurrency(e.vat)}</td>
                                                  </tr>
                                              ))
                                          )}
                                      </tbody>
                                  </table>
                              </div>
                          )}

                      </div>
                  </div>
              )}
          </div>
      </div>

    </div>
  );
};

export default SalesReport;
