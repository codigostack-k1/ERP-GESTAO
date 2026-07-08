
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  CheckCircle, 
  Printer, 
  Calendar,
  AlertCircle,
  Wallet,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AppConfig, Sale, Customer, PaymentDetail, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import PaymentModal from '../components/PaymentModal';
import { useToast } from '../contexts/ToastContext';

interface TreasuryReceiptsProps {
  config: AppConfig;
}

const TreasuryReceipts: React.FC<TreasuryReceiptsProps> = ({ config }) => {
  const { showToast } = useToast();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING'>('ALL');
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modals
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceToSettle, setInvoiceToSettle] = useState<Sale | null>(null);

  // --- Calculations ---

  const loadData = useCallback(() => {
    setSales(StorageService.getSales());
    setCustomers(StorageService.getCustomers());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    // Default dates
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, [loadData]);

  // Reset pagination when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, statusFilter, startDate, endDate]);

  const getCustomerName = useCallback((id?: string) => {
      if (!id) return 'Consumidor Final';
      const c = customers.find(x => x.id === id);
      return c ? c.name : 'Desconhecido';
  }, [customers]);

  // --- Filtering ---
  const filteredSales = useMemo(() => {
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

      return sales.filter(s => {
          const d = new Date(s.date).getTime();
          const matchDate = d >= start && d <= end;
          const matchStatus = statusFilter === 'ALL' || s.status === statusFilter;
          const matchSearch = s.id.includes(searchTerm) || getCustomerName(s.customerId).toLowerCase().includes(searchTerm.toLowerCase());

          return matchDate && matchStatus && matchSearch;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, startDate, endDate, statusFilter, searchTerm, getCustomerName]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const paginatedSales = filteredSales.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setCurrentPage(newPage);
      }
  };

  // --- KPIs ---
  const stats = useMemo(() => {
      const pending = filteredSales.filter(s => s.status === 'PENDING').reduce((acc, s) => acc + s.total, 0);
      const paid = filteredSales.filter(s => s.status === 'PAID').reduce((acc, s) => acc + s.total, 0);
      return { pending, paid };
  }, [filteredSales]);

  // --- Handlers ---

  const openPaymentModal = (sale: Sale) => {
      setInvoiceToSettle(sale);
      setPaymentModalOpen(true);
  };

  const handleSettleInvoice = (details: PaymentDetail[], methodLabel: string) => {
      if (!invoiceToSettle) return;
      
      const success = StorageService.settleInvoice(invoiceToSettle.id, methodLabel as Sale['paymentMethod'], details);
      if (success) {
          showToast('Fatura liquidada com sucesso!', ToastType.SUCCESS);
          setPaymentModalOpen(false);
          setInvoiceToSettle(null);
          loadData();
      } else {
          showToast('Erro ao liquidar fatura.', ToastType.ERROR);
      }
  };

  const handleReportAction = (type: 'PRINT' | 'EXCEL') => {
      if (type === 'PRINT') {
          if (filteredSales.length === 0) {
              showToast('Não existem dados para o relatório com os filtros atuais.', ToastType.WARNING);
              return;
          }
          DocumentGenerator.Tesouraria.gerarRelatorioRecebimentos(filteredSales, config);
      } else {
          // EXCEL / CSV Export Logic
          const headers = ["Data", "Recibo ID", "Cliente", "Metodo", "Status", "Valor"];
          const rows = filteredSales.map(s => {
              const cName = getCustomerName(s.customerId).replace(/"/g, '""');
              return [
                  new Date(s.date).toLocaleDateString(),
                  s.id,
                  `"${cName}"`,
                  s.paymentMethod,
                  s.status,
                  s.total.toString().replace('.', ',')
              ].join(";");
          });

          const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + rows.join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          const filenameDate = startDate || new Date().toISOString().split('T')[0];
          link.setAttribute("download", `Relatorio_Facturacao_${filenameDate}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT');

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
      
      {/* 1. Header */}
      <div className="flex justify-between items-start shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CheckCircle className="text-blue-600" />
                  Recebimentos e Liquidação
              </h1>
              <p className="text-gray-500 text-sm">Gestão de faturas, pagamentos pendentes e histórico de recebimentos.</p>
          </div>
          <div className="flex gap-2">
              <button 
                onClick={() => handleReportAction('PRINT')}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/30 transition-transform active:scale-95 font-bold text-sm"
              >
                  <Printer size={18} /> Imprimir Relatório
              </button>
              <button 
                onClick={() => handleReportAction('EXCEL')}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-600 border border-green-200 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm"
              >
                  <FileSpreadsheet size={18} /> Exportar Excel
              </button>
          </div>
      </div>

      {/* 2. Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 shrink-0">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-5 rounded-xl border border-yellow-100 dark:border-yellow-900/30 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-yellow-700 dark:text-yellow-400 uppercase">Total Pendente (Período)</p>
                  <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-300">{formatCurrency(stats.pending)}</p>
              </div>
              <div className="p-3 bg-yellow-200 dark:bg-yellow-800/50 rounded-lg text-yellow-700 dark:text-yellow-300">
                  <AlertCircle size={24} />
              </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-xl border border-green-100 dark:border-green-900/30 flex items-center justify-between">
              <div>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Recebido (Período)</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(stats.paid)}</p>
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-800/50 rounded-lg text-green-700 dark:text-green-300">
                  <Wallet size={24} />
              </div>
          </div>
      </div>

      {/* 3. Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center shrink-0">
          <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                  type="text" 
                  placeholder="Pesquisar por Cliente ou Nº Fatura..." 
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
              />
          </div>
          <div className="flex items-center gap-2">
              <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <button 
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${statusFilter === 'ALL' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}
                  >
                      TODOS
                  </button>
                  <button 
                    onClick={() => setStatusFilter('PENDING')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${statusFilter === 'PENDING' ? 'bg-white dark:bg-gray-700 shadow text-yellow-600 dark:text-yellow-300' : 'text-gray-500'}`}
                  >
                      PENDENTES
                  </button>
                  <button 
                    onClick={() => setStatusFilter('PAID')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${statusFilter === 'PAID' ? 'bg-white dark:bg-gray-700 shadow text-green-600 dark:text-green-300' : 'text-gray-500'}`}
                  >
                      PAGOS
                  </button>
              </div>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Calendar size={14} className="text-gray-400 ml-2"/>
                  <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs outline-none w-24" />
                  <span className="text-gray-400">-</span>
                  <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs outline-none w-24" />
              </div>
          </div>
      </div>

      {/* 4. Table with Pagination */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">Nº Factura</th>
                          <th className="px-6 py-4">Data</th>
                          <th className="px-6 py-4">Cliente</th>
                          <th className="px-6 py-4 text-right">Valor Total</th>
                          <th className="px-6 py-4 text-center">Status</th>
                          <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {paginatedSales.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma fatura encontrada.</td></tr>
                      ) : (
                          paginatedSales.map(sale => (
                              <tr key={sale.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                  <td className="px-6 py-4 font-mono text-gray-500">#{sale.id.slice(-6).toUpperCase()}</td>
                                  <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{formatDate(sale.date)}</td>
                                  <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{getCustomerName(sale.customerId)}</td>
                                  <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</td>
                                  <td className="px-6 py-4 text-center">
                                      <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                          sale.status === 'PAID' 
                                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      }`}>
                                          {sale.status === 'PAID' ? 'LIQUIDADA' : 'PENDENTE'}
                                      </span>
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                      <div className="flex justify-center gap-2">
                                          {sale.status === 'PENDING' && (
                                              <button 
                                                onClick={() => openPaymentModal(sale)}
                                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
                                              >
                                                  LIQUIDAR
                                              </button>
                                          )}
                                          {/* Botão de impressão individual removido conforme solicitado */}
                                      </div>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>

          {/* Pagination Footer */}
          <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 shrink-0">
              <div className="font-medium">
                  Mostrando {paginatedSales.length} de {filteredSales.length} registos
              </div>
              <div className="flex items-center gap-2">
                  <button 
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                      <ChevronLeft size={14} />
                  </button>
                  <span className="font-medium px-2">
                      Pág. {currentPage} / {totalPages || 1}
                  </span>
                  <button 
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || totalPages === 0}
                      className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                      <ChevronRight size={14} />
                  </button>
              </div>
          </div>
      </div>

      {/* --- PAYMENT MODAL --- */}
      {paymentModalOpen && invoiceToSettle && (
          <PaymentModal 
            isOpen={paymentModalOpen}
            onClose={() => { setPaymentModalOpen(false); setInvoiceToSettle(null); }}
            totalAmount={invoiceToSettle.total}
            onConfirm={handleSettleInvoice}
            config={config}
            title="Liquidação da Factura"
          />
      )}
    </div>
  );
};

export default TreasuryReceipts;
