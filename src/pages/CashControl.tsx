
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Lock, 
  Unlock, 
  Clock, 
  DollarSign, 
  AlertTriangle, 
  History,
  CheckCircle,
  Printer,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Calendar,
  Filter,
  Download,
  User as UserIcon,
  FileText,
  Eye,
  X
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AppConfig, CashSession, User, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';

interface CashControlProps {
  config: AppConfig;
  currentUser?: User;
}

const CashControl: React.FC<CashControlProps> = ({ config, currentUser }) => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'operate' | 'history'>('operate');
  const [currentSession, setCurrentSession] = useState<CashSession | undefined>(undefined);
  const [history, setHistory] = useState<CashSession[]>([]);
  
  // --- History Filter States ---
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [historyOperatorFilter, setHistoryOperatorFilter] = useState('ALL');

  // --- Form States (Opening) ---
  const [initialBalance, setInitialBalance] = useState('');
  
  // --- Live Data ---
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [liveSales, setLiveSales] = useState(0);

  // --- Pagination State ---
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 12;

  // --- Closing Flow States (3 Steps) ---
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);
  const [closeStep, setCloseStep] = useState<1 | 2 | 3>(1);
  const [declaredCash, setDeclaredCash] = useState('');
  const [closingStats, setClosingStats] = useState<{
      totalSales: number;
      cashSales: number;
      breakdown: Record<string, number>;
      manualIn: number;
      manualOut: number;
      expectedCash: number;
      diff: number;
  } | null>(null);
  const [justification, setJustification] = useState('');

  // --- History Preview State ---
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedPreviewSession, setSelectedPreviewSession] = useState<CashSession | null>(null);

  const previewData = useMemo(() => {
    if (!selectedPreviewSession) return null;
    const stats = StorageService.getSessionStats(selectedPreviewSession.id);
    
    // Calculate product breakdown
    const sessionSales = StorageService.getSales().filter(s => 
        s.userId === selectedPreviewSession.userId && 
        new Date(s.date) >= new Date(selectedPreviewSession.startTime) &&
        (!selectedPreviewSession.endTime || new Date(s.date) <= new Date(selectedPreviewSession.endTime)) &&
        s.status === 'PAID'
    );

    const productMap: Record<string, { name: string, quantity: number, total: number }> = {};
    sessionSales.forEach(sale => {
        sale.items.forEach(item => {
            if (!productMap[item.id]) {
                productMap[item.id] = { name: item.name, quantity: 0, total: 0 };
            }
            productMap[item.id].quantity += item.quantity;
            productMap[item.id].total += (item.price * item.quantity);
        });
    });

    const productBreakdown = Object.values(productMap).sort((a, b) => b.total - a.total);

    return {
      stats,
      productBreakdown
    };
  }, [selectedPreviewSession]);

  const refreshData = useCallback(() => {
      const active = StorageService.getActiveCashSession(currentUser?.id);
      setCurrentSession(active);
      
      // Load all sessions
      setHistory(StorageService.getCashSessions());

      if (active) {
          const stats = StorageService.getSessionStats(active.id);
          setLiveSales(stats.totalSales);
      }
  }, [currentUser?.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshData();
    const interval = setInterval(() => {
        if (currentSession?.status === 'OPEN') refreshData();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshData, currentSession?.status]);

  const handleOpenCash = () => {
      if (!initialBalance) {
          showToast('Informe o saldo inicial.', ToastType.WARNING);
          return;
      }
      if (!currentUser) {
          showToast('Sessão de usuário inválida.', ToastType.ERROR);
          return;
      }

      try {
          StorageService.openCashSession(parseFloat(initialBalance), currentUser.name, currentUser.id); 
          setInitialBalance('');
          refreshData();
          showToast('Caixa aberto com sucesso!', ToastType.SUCCESS);
      } catch (e: unknown) {
          showToast((e as Error).message, ToastType.ERROR);
      }
  };

  // --- Filtering History ---
  const uniqueOperators = useMemo(() => {
    const ops = new Set(history.map(h => h.operatorName));
    return Array.from(ops).sort();
  }, [history]);

  const filteredHistory = useMemo(() => {
    return history.filter(session => {
        const sessionDate = new Date(session.startTime).setHours(0,0,0,0);
        const start = historyStartDate ? new Date(historyStartDate).setHours(0,0,0,0) : null;
        const end = historyEndDate ? new Date(historyEndDate).setHours(23,59,59,999) : null;

        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        if (historyOperatorFilter !== 'ALL' && session.operatorName !== historyOperatorFilter) return false;

        return true;
    }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [history, historyStartDate, historyEndDate, historyOperatorFilter]);

  // --- Pagination Logic ---
  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
      (historyPage - 1) * itemsPerPage, 
      historyPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalPages) {
          setHistoryPage(newPage);
      }
  };

  // --- Export & Print History ---
  const handleExportHistory = () => {
      if (filteredHistory.length === 0) {
          showToast('Nenhum dado para exportar.', ToastType.WARNING);
          return;
      }
      
      const headers = [
          "ID", 
          "Operador", 
          "Inicio", 
          "Fim", 
          "Fundo Inicial", 
          "Vendas Sistema", 
          "Vendas Dinheiro", 
          "Numerario", 
          "Pos", 
          "M-Pesa", 
          "E-Mola", 
          "Declarado", 
          "Diferenca"
      ];

      const csvRows = filteredHistory.map(h => {
          const stats = StorageService.getSessionStats(h.id);
          
          return [
              h.id.slice(-6),
              `"${h.operatorName}"`,
              new Date(h.startTime).toLocaleString(),
              h.endTime ? new Date(h.endTime).toLocaleString() : "EM ABERTO",
              h.initialBalance.toFixed(2).replace('.', ','),
              h.totalSalesSystem.toFixed(2).replace('.', ','),
              h.totalCashSystem.toFixed(2).replace('.', ','),
              (stats.breakdown['CASH'] || 0).toFixed(2).replace('.', ','),
              (stats.breakdown['CARD'] || 0).toFixed(2).replace('.', ','),
              (stats.breakdown['MPESA'] || 0).toFixed(2).replace('.', ','),
              (stats.breakdown['EMOLA'] || 0).toFixed(2).replace('.', ','),
              (h.finalBalanceDeclared || 0).toFixed(2).replace('.', ','),
              (h.discrepancy || 0).toFixed(2).replace('.', ',')
          ].join(";");
      });

      const csvContent = headers.join(";") + "\n" + csvRows.join("\n");
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Relatorio_Fechos_Caixa_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const handlePrintHistory = () => {
    // Exclude open sessions from aggregate report as they don't have closure data yet
    const closedSessions = filteredHistory.filter(s => s.status === 'CLOSED');

    if (closedSessions.length === 0) {
        showToast('Não há registos de fecho para imprimir no filtro selecionado.', ToastType.WARNING);
        return;
    }
    
    // Calculate aggregate payment breakdown for all filtered closed sessions
    const aggregateBreakdown: Record<string, number> = {};
    closedSessions.forEach(s => {
        const stats = StorageService.getSessionStats(s.id);
        Object.entries(stats.breakdown).forEach(([method, amount]) => {
            aggregateBreakdown[method] = (aggregateBreakdown[method] || 0) + amount;
        });
    });

    DocumentGenerator.Tesouraria.gerarRelatorioControleCaixa(closedSessions, config, aggregateBreakdown);
  };

  // --- CLOSING FLOW HANDLERS ---
  const initCloseProcess = () => {
      if (!currentSession) {
          showToast('Erro: Sessão não encontrada. Atualize a página.', ToastType.ERROR);
          return;
      }
      setCloseStep(1);
      setDeclaredCash('');
      setJustification('');
      setClosingStats(null);
      setIsClosingModalOpen(true);
  };

  const handleStep1Next = () => {
      if (!declaredCash || declaredCash.trim() === '') {
          showToast('Por favor, informe o valor total contado em caixa.', ToastType.WARNING);
          return;
      }
      try {
          const cleanCash = declaredCash.toString().replace(',', '.');
          const declaredVal = parseFloat(cleanCash);
          if (isNaN(declaredVal)) {
              showToast('Valor inválido. Por favor, insira um número válido.', ToastType.ERROR);
              return;
          }
          if (!currentSession) return;
          const stats = StorageService.getSessionStats(currentSession.id);
          const expectedCash = stats.expectedCash;
          const diff = declaredVal - expectedCash;

          setClosingStats({
              totalSales: stats.totalSales,
              cashSales: stats.breakdown['CASH'] || 0,
              breakdown: stats.breakdown,
              manualIn: stats.manualIn,
              manualOut: stats.manualOut,
              expectedCash: expectedCash,
              diff: diff
          });
          setCloseStep(2);
      } catch (error: unknown) {
          showToast("Erro técnico: " + (error as Error).message, ToastType.ERROR);
      }
  };

  const handleStep2Next = () => setCloseStep(3);

  const handleFinalConfirm = () => {
      if (!currentSession || !closingStats) return;
      if (Math.abs(closingStats.diff) > 0.01 && !justification.trim()) {
          showToast('É obrigatório justificar a diferença de caixa.', ToastType.WARNING);
          return;
      }
      try {
          const cleanCash = declaredCash.toString().replace(',', '.');
          StorageService.closeCashSession(currentSession.id, parseFloat(cleanCash), justification);
          setIsClosingModalOpen(false);
          refreshData();
          showToast('Caixa fechado com sucesso!', ToastType.SUCCESS);
      } catch (e: unknown) {
          showToast((e as Error).message, ToastType.ERROR);
      }
  };

  const handlePrintA4Report = (session: CashSession) => {
      const stats = StorageService.getSessionStats(session.id);
      
      // Calculate product breakdown
      const sessionSales = StorageService.getSales().filter(s => 
          s.userId === session.userId && 
          new Date(s.date) >= new Date(session.startTime) &&
          (!session.endTime || new Date(s.date) <= new Date(session.endTime)) &&
          s.status === 'PAID'
      );

      const productMap: Record<string, { name: string, quantity: number, total: number }> = {};
      sessionSales.forEach(sale => {
          sale.items.forEach(item => {
              if (!productMap[item.id]) {
                  productMap[item.id] = { name: item.name, quantity: 0, total: 0 };
              }
              productMap[item.id].quantity += item.quantity;
              productMap[item.id].total += (item.price * item.quantity);
          });
      });

      const productBreakdown = Object.values(productMap).sort((a, b) => b.total - a.total);

      DocumentGenerator.PontoDeVenda.gerarFechoCaixa(session, config, stats.breakdown, productBreakdown);
  };

  const handlePrintReceipt = (session: CashSession) => {
      // For now, receipt can use the same specialized layout or a more thermal-friendly one
      // But user requested a clean list layout, so I'll reuse the A4 generator which I've specialized
      handlePrintA4Report(session);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';

  const getPaymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = {
          'CASH': 'Numerário',
          'CARD': 'Multicaixa',
          'MPESA': 'M-Pesa',
          'EMOLA': 'e-Mola'
      };
      return labels[method] || method;
  };
  const formatDateTime = (iso: string) => {
      if (!iso) return '-';
      const d = new Date(iso);
      return (
          <div className="flex flex-col">
              <span className="font-bold text-gray-700 dark:text-gray-300">{d.toLocaleDateString()}</span>
              <span className="text-xs text-gray-400">{d.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
      );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
        
        {/* 1. Header & Tabs */}
        <div className="flex justify-between items-end shrink-0 pb-2 border-b border-gray-100 dark:border-gray-700">
            <div className="print:hidden">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <DollarSign className="text-green-600" />
                    Controlo de Caixa
                </h1>
                <p className="text-gray-500 text-sm">Gestão de turnos e fecho de caixa individual.</p>
            </div>
            <div className="hidden print:block text-center w-full">
                <h1 className="text-xl font-bold uppercase">{config.companyName}</h1>
                <h2 className="text-lg font-bold">Relatório de Histórico de Caixa</h2>
                <p className="text-xs text-gray-500">Período: {historyStartDate || "Início"} - {historyEndDate || "Fim"}</p>
            </div>
            
            {/* Tabs */}
            <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg print:hidden">
                <button
                    onClick={() => setActiveTab('operate')}
                    className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 flex items-center gap-2 ${
                        activeTab === 'operate' 
                        ? 'bg-green-600 text-white shadow-md' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <Unlock size={16} />
                    MEU CAIXA
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 flex items-center gap-2 ${
                        activeTab === 'history' 
                        ? 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-white shadow-sm' 
                        : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                >
                    <History size={16} />
                    HISTÓRICO GERAL
                </button>
            </div>
        </div>

        {/* 2. Content */}
        <div className="flex-1 min-h-0 relative">
            
            {/* --- TAB: OPERATE --- */}
            {activeTab === 'operate' && (
                <div className="h-full flex items-center justify-center animate-in fade-in duration-200">
                    {!currentSession ? (
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 max-w-md w-full text-center">
                             <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Lock size={40} className="text-red-600 dark:text-red-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Seu Turno está Fechado</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Olá, <strong>{currentUser?.name}</strong>. Inicie um novo turno para operar o PDV.</p>
                            
                            <div className="text-left mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fundo de Maneio (Saldo Inicial)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-gray-400 font-bold">MT</span>
                                    <input 
                                        type="number" 
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-green-500 text-gray-900 dark:text-white"
                                        placeholder="0.00"
                                        value={initialBalance}
                                        onChange={e => setInitialBalance(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleOpenCash()}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={handleOpenCash}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 flex items-center justify-center gap-2"
                            >
                                <Unlock size={20} /> ABRIR MEU CAIXA
                            </button>
                        </div>
                    ) : (
                        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col justify-between h-64">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-bold uppercase tracking-wide border border-green-200 dark:border-green-800 flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            Turno Ativo
                                        </div>
                                        <span className="text-xs text-gray-400 font-mono">ID: {currentSession.id.slice(-8)}</span>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-gray-500">Operador:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{currentSession.operatorName}</span>
                                    </div>
                                    <div className="flex justify-between text-sm border-b border-gray-100 dark:border-gray-700 pb-2">
                                        <span className="text-gray-500">Início:</span>
                                        <span className="font-mono text-gray-700 dark:text-gray-300">{new Date(currentSession.startTime).toLocaleTimeString()}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Fundo Inicial:</span>
                                        <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(currentSession.initialBalance)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-600 to-green-700 p-6 rounded-2xl shadow-xl text-white flex flex-col justify-between h-64">
                                <div>
                                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                        <Clock size={24} /> Operando...
                                    </h3>
                                    <p className="text-green-100 text-sm opacity-80">O sistema manterá seu caixa aberto até que você realize o fecho.</p>
                                </div>
                                <div className="mt-8">
                                    <button 
                                        onClick={initCloseProcess}
                                        className="w-full py-3 bg-white text-green-700 font-bold rounded-xl shadow-md hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Lock size={20} /> REALIZAR FECHO
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- TAB: HISTORY --- */}
            {activeTab === 'history' && (
                <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-200">
                    
                    {/* Filters Toolbar */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-wrap items-end gap-4 bg-gray-50 dark:bg-gray-900/50 print:hidden">
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Calendar size={12} /> Data Inicial
                            </label>
                            <input 
                                type="date" 
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                value={historyStartDate}
                                onChange={e => { setHistoryStartDate(e.target.value); setHistoryPage(1); }}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <Calendar size={12} /> Data Final
                            </label>
                            <input 
                                type="date" 
                                className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                value={historyEndDate}
                                onChange={e => { setHistoryEndDate(e.target.value); setHistoryPage(1); }}
                            />
                        </div>

                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                                <UserIcon size={12} /> Operador
                            </label>
                            <div className="relative">
                                <select 
                                    className="pl-8 pr-4 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg text-xs bg-white dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500 appearance-none min-w-[150px]"
                                    value={historyOperatorFilter}
                                    onChange={e => { setHistoryOperatorFilter(e.target.value); setHistoryPage(1); }}
                                >
                                    <option value="ALL">Todos Operadores</option>
                                    {uniqueOperators.map(op => (
                                        <option key={op} value={op}>{op}</option>
                                    ))}
                                </select>
                                <Filter size={12} className="absolute left-2.5 top-2.5 text-gray-400" />
                            </div>
                        </div>

                        <div className="flex gap-2 ml-auto">
                            <button 
                                onClick={handlePrintHistory}
                                className="flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-xs font-bold shadow-sm"
                            >
                                <Printer size={14} /> Imprimir Tudo
                            </button>
                            <button 
                                onClick={handleExportHistory}
                                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-bold shadow-md shadow-blue-500/20"
                            >
                                <Download size={14} /> Exportar CSV
                            </button>
                        </div>
                    </div>

                    {/* History Table */}
                    <div className="flex-1 overflow-auto custom-scrollbar">
                         <table className="w-full text-left text-sm whitespace-nowrap">
                             <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0">
                                 <tr>
                                     <th className="px-6 py-4">ID / Operador</th>
                                     <th className="px-6 py-4"><div className="flex items-center gap-1"><Clock size={14}/> Abertura</div></th>
                                     <th className="px-6 py-4"><div className="flex items-center gap-1"><Lock size={14}/> Fecho</div></th>
                                     <th className="px-6 py-4 text-right">Fundo Inicial</th>
                                     <th className="px-6 py-4 text-right">Vendas</th>
                                     <th className="px-6 py-4 text-right">Quebra/Sobra</th>
                                     <th className="px-6 py-4 text-center">Status</th>
                                     <th className="px-6 py-4 text-center print:hidden">Ações</th>
                                 </tr>
                             </thead>
                             <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                 {paginatedHistory.length === 0 ? (
                                     <tr><td colSpan={8} className="px-6 py-12 text-center text-gray-400 italic">Nenhum registo encontrado com os filtros selecionados.</td></tr>
                                 ) : (
                                     paginatedHistory.map(session => (
                                         <tr key={session.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                             <td className="px-6 py-4">
                                                 <div className="flex flex-col">
                                                     <span className="font-mono text-gray-500 text-xs">#{session.id.slice(-6)}</span>
                                                     <span className="font-bold text-gray-900 dark:text-white">{session.operatorName}</span>
                                                 </div>
                                             </td>
                                             <td className="px-6 py-4">
                                                 {formatDateTime(session.startTime)}
                                             </td>
                                             <td className="px-6 py-4">
                                                 {session.endTime ? formatDateTime(session.endTime) : <span className="text-green-500 text-xs font-bold uppercase animate-pulse">Em Aberto...</span>}
                                             </td>
                                             <td className="px-6 py-4 text-right text-gray-500 font-mono">{formatCurrency(session.initialBalance)}</td>
                                             <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white font-mono">{formatCurrency(session.totalSalesSystem)}</td>
                                             <td className="px-6 py-4 text-right font-mono">
                                                 {session.status === 'CLOSED' ? (
                                                     <span className={`font-bold ${session.discrepancy && session.discrepancy < 0 ? 'text-red-600' : session.discrepancy && session.discrepancy > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                         {session.discrepancy && session.discrepancy > 0 ? '+' : ''}{formatCurrency(session.discrepancy || 0)}
                                                     </span>
                                                 ) : <span className="text-gray-300">-</span>}
                                             </td>
                                             <td className="px-6 py-4 text-center">
                                                 <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${session.status === 'OPEN' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                                                     {session.status === 'OPEN' ? 'ABERTO' : 'FECHADO'}
                                                 </span>
                                             </td>
                                             <td className="px-6 py-4 text-center print:hidden">
                                                <div className="flex items-center justify-center gap-1">
                                                   {session.status === 'CLOSED' ? (
                                                       <>
                                                           <button 
                                                               onClick={() => handlePrintReceipt(session)}
                                                               className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                               title="Imprimir Relatório de Fecho (Térmico)"
                                                           >
                                                               <Printer size={16} />
                                                           </button>
                                                           <button 
                                                               onClick={() => handlePrintA4Report(session)}
                                                               className="p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                                               title="Imprimir Relatório de Fecho (A4)"
                                                           >
                                                               <FileText size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    setSelectedPreviewSession(session);
                                                                    setIsPreviewOpen(true);
                                                                }}
                                                                className="p-1.5 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors"
                                                                title="Visualizar Resumo / Detalhes"
                                                            >
                                                                <Eye size={16} />
                                                           </button>
                                                       </>
                                                   ) : (
                                                       <span className="text-[10px] text-gray-400 italic">Disponível após fecho</span>
                                                   )}
                                                </div>
                                             </td>
                                         </tr>
                                     ))
                                 )}
                             </tbody>
                         </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 flex justify-between items-center shrink-0 print:hidden">
                        <div className="font-medium">
                            Mostrando {paginatedHistory.length} de {filteredHistory.length} registos
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => handlePageChange(historyPage - 1)}
                                disabled={historyPage === 1}
                                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="font-medium px-2">
                                Pág. {historyPage} / {totalPages || 1}
                            </span>
                            <button 
                                onClick={() => handlePageChange(historyPage + 1)}
                                disabled={historyPage === totalPages || totalPages === 0}
                                className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* ... (rest of the file remains unchanged) */}
        {isPreviewOpen && selectedPreviewSession && previewData && (
             <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
                 <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                     {/* Header */}
                     <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                         <div className="flex items-center gap-3">
                             <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md shadow-teal-500/20">
                                 <FileText size={18} />
                             </div>
                             <div>
                                 <h2 className="text-sm font-bold text-gray-900 dark:text-white">Relatório de Fecho de Caixa</h2>
                                 <p className="text-[10px] text-gray-400 font-mono">Sessão: #{selectedPreviewSession.id.slice(-8)}</p>
                             </div>
                         </div>
                         <button 
                             onClick={() => {
                                 setIsPreviewOpen(false);
                                 setSelectedPreviewSession(null);
                             }}
                             className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-gray-700 rounded-lg transition-all"
                             title="Fechar"
                         >
                             <X size={18} />
                         </button>
                     </div>

                     {/* Content */}
                     <div className="p-6 overflow-y-auto space-y-6">
                         {/* Status Guard / Info Row */}
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800">
                                 <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Detalhes de Turno</p>
                                 <div className="space-y-1.5 text-xs">
                                     <div className="flex justify-between">
                                         <span className="text-gray-500">Operador:</span>
                                         <span className="font-bold text-gray-800 dark:text-white">{selectedPreviewSession.operatorName}</span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-gray-500">Abertura:</span>
                                         <span className="font-semibold text-gray-800 dark:text-gray-200">
                                             {new Date(selectedPreviewSession.startTime).toLocaleString()}
                                         </span>
                                     </div>
                                     <div className="flex justify-between">
                                         <span className="text-gray-500">Fecho:</span>
                                         <span className="font-semibold text-gray-800 dark:text-gray-200">
                                             {selectedPreviewSession.endTime ? new Date(selectedPreviewSession.endTime).toLocaleString() : '-'}
                                         </span>
                                     </div>
                                 </div>
                             </div>

                             <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200/50 dark:border-gray-800 flex flex-col justify-between">
                                 <div>
                                     <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Resultado Comercial</p>
                                     <div className="flex justify-between items-baseline">
                                         <span className="text-gray-500 text-xs">Vendas Totais:</span>
                                         <span className="text-xl font-black text-gray-900 dark:text-white">
                                             {formatCurrency(selectedPreviewSession.totalSalesSystem || 0)}
                                         </span>
                                     </div>
                                 </div>
                                 <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center text-xs">
                                     <span className="text-gray-500">Saldo Inicial:</span>
                                     <span className="font-mono text-gray-700 dark:text-gray-300">
                                         {formatCurrency(selectedPreviewSession.initialBalance || 0)}
                                     </span>
                                 </div>
                             </div>
                         </div>

                         {/* Financial Comparison / Ledger Sheet */}
                         <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 font-mono text-xs">
                             <h3 className="text-center font-bold text-sm mb-4 border-b border-gray-200 dark:border-gray-800 pb-2 text-gray-800 dark:text-white">CONFERÊNCIA DE FLUXO</h3>
                             
                             <div className="space-y-1.5">
                                 <div className="flex justify-between text-xs">
                                     <span className="text-gray-500">Fundo Inicial (Mesa)</span>
                                     <span className="text-gray-700 dark:text-gray-300">
                                         +{formatCurrency(selectedPreviewSession.initialBalance || 0)}
                                     </span>
                                 </div>
                                 <div className="flex justify-between text-xs">
                                     <span className="text-gray-500">Vendas em Dinheiro (Sistema)</span>
                                     <span className="text-gray-700 dark:text-gray-300">
                                         +{formatCurrency(selectedPreviewSession.totalCashSystem || 0)}
                                     </span>
                                 </div>
                                 {previewData.stats.manualIn > 0 && (
                                     <div className="flex justify-between text-xs text-green-600">
                                         <span>Suprimentos (+)</span>
                                         <span>+{formatCurrency(previewData.stats.manualIn)}</span>
                                     </div>
                                 )}
                                 {previewData.stats.manualOut > 0 && (
                                     <div className="flex justify-between text-xs text-red-600">
                                         <span>Sangrias (-)</span>
                                         <span>-{formatCurrency(previewData.stats.manualOut)}</span>
                                     </div>
                                 )}
                                 
                                 <div className="flex justify-between text-xs font-bold border-t border-gray-200 dark:border-gray-800 pt-2 text-gray-800 dark:text-white">
                                     <span>Saldo de Caixa Esperado:</span>
                                     <span>{formatCurrency(selectedPreviewSession.initialBalance + (selectedPreviewSession.totalCashSystem || 0) + previewData.stats.manualIn - previewData.stats.manualOut)}</span>
                                 </div>

                                 <div className="flex justify-between text-xs font-bold pt-1 border-b border-gray-200 dark:border-gray-800 pb-2 text-blue-600 dark:text-blue-400 bg-blue-50/20 dark:bg-blue-900/10 px-2 rounded mt-1">
                                     <span>Saldo Declarado (Físico):</span>
                                     <span>{formatCurrency(selectedPreviewSession.finalBalanceDeclared || 0)}</span>
                                 </div>
                             </div>

                             {/* Discrepancy block */}
                             <div className="mt-4">
                                 <div className={`flex justify-between items-center p-3 rounded-lg ${
                                     (selectedPreviewSession.discrepancy || 0) === 0 
                                     ? 'bg-green-100 dark:bg-green-950/30 text-green-800 dark:text-green-300' 
                                     : (selectedPreviewSession.discrepancy || 0) > 0 
                                         ? 'bg-blue-100 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300' 
                                         : 'bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                                 }`}>
                                     <span className="font-bold uppercase text-[10px] tracking-wider">Diferença de Caixa:</span>
                                     <span className="font-bold text-sm">
                                         {(selectedPreviewSession.discrepancy || 0) > 0 ? '+' : ''}
                                         {formatCurrency(selectedPreviewSession.discrepancy || 0)}
                                     </span>
                                 </div>
                             </div>

                             {/* Justification if any */}
                             {selectedPreviewSession.justification && (
                                 <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/30 rounded-lg text-xs leading-relaxed text-amber-805 dark:text-amber-300">
                                     <span className="font-bold">Justificativa:</span> {selectedPreviewSession.justification}
                                 </div>
                             )}
                         </div>

                         {/* Breakdown by Payment Methods */}
                         <div className="space-y-2">
                             <h3 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                                 Vendas por Meio de Pagamento
                             </h3>
                             <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                 {Object.entries(previewData.stats.breakdown || {}).map(([method, amount]) => (
                                     <div key={method} className="p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-150 dark:border-gray-800 rounded-xl text-center">
                                         <p className="text-[9px] font-bold text-gray-400 uppercase truncate">{getPaymentMethodLabel(method)}</p>
                                         <p className="font-bold text-xs text-gray-800 dark:text-white mt-1 font-mono">{formatCurrency(amount)}</p>
                                     </div>
                                 ))}
                                 {Object.keys(previewData.stats.breakdown || {}).length === 0 && (
                                     <div className="col-span-4 py-4 text-center text-gray-400 dark:text-gray-500 italic text-xs bg-gray-50 dark:bg-gray-900/30 rounded-xl">
                                         Nenhuma venda registada neste turno.
                                     </div>
                                 )}
                             </div>
                         </div>

                         {/* Product breakdown / Top Selling Items in this session */}
                         <div className="space-y-2">
                             <h3 className="text-xs font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                                 Detalhes de Venda de Artigos (Turno)
                             </h3>
                             {previewData.productBreakdown.length === 0 ? (
                                 <p className="text-xs text-gray-400 italic bg-gray-50 dark:bg-gray-900/30 p-4 text-center rounded-xl">Sem registo de vendas de artigos neste turno.</p>
                             ) : (
                                 <div className="border border-gray-100 dark:border-gray-850 rounded-xl overflow-hidden shadow-sm">
                                     <table className="w-full text-left border-collapse text-xs">
                                         <thead>
                                             <tr className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 border-b border-gray-150 dark:border-gray-800 font-bold">
                                                 <th className="px-4 py-2 font-semibold">Produto / Serviço</th>
                                                 <th className="px-4 py-2 font-semibold text-center w-24">Qtd Vendida</th>
                                                 <th className="px-4 py-2 font-semibold text-right w-32">Total Gerado</th>
                                             </tr>
                                         </thead>
                                         <tbody className="divide-y divide-gray-150 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                                             {previewData.productBreakdown.map((prod, index) => (
                                                 <tr key={index} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10">
                                                     <td className="px-4 py-2 font-medium text-gray-800 dark:text-gray-100">{prod.name}</td>
                                                     <td className="px-4 py-2 text-center font-bold font-mono">{prod.quantity}</td>
                                                     <td className="px-4 py-2 text-right font-bold font-mono text-gray-900 dark:text-white">{formatCurrency(prod.total)}</td>
                                                 </tr>
                                             ))}
                                         </tbody>
                                     </table>
                                 </div>
                             )}
                         </div>
                     </div>

                     {/* Footer */}
                     <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-3">
                         <div className="flex gap-2 w-full sm:w-auto">
                             <button 
                                 onClick={() => handlePrintReceipt(selectedPreviewSession)}
                                 className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-bold text-xs rounded-xl transition-all"
                             >
                                 <Printer size={14} /> Imprimir (Térmico)
                             </button>
                             <button 
                                 onClick={() => handlePrintA4Report(selectedPreviewSession)}
                                 className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/20 dark:hover:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-bold text-xs rounded-xl transition-all"
                             >
                                 <FileText size={14} /> Imprimir (A4)
                             </button>
                         </div>
                         <button 
                             onClick={() => {
                                 setIsPreviewOpen(false);
                                 setSelectedPreviewSession(null);
                             }}
                             className="w-full sm:w-auto px-6 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-800 dark:text-white font-bold text-xs rounded-xl transition-all"
                         >
                             Fechar Visualização
                         </button>
                     </div>
                 </div>
             </div>
         )}

        {isClosingModalOpen && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in zoom-in duration-300">
                <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                                <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                                <span className="text-lg font-black tracking-tighter">E</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Lock className="text-gray-500" size={20} />
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Assistente de Fecho de Caixa</h2>
                            </div>
                        </div>
                    </div>

                    <div className="p-8">
                        <div className="flex items-center mb-8 px-4">
                            <div className={`flex-1 h-2 rounded-full ${closeStep >= 1 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            <div className="mx-2 text-[10px] font-bold text-gray-400 uppercase">Passo {closeStep}/3</div>
                            <div className={`flex-1 h-2 rounded-full ${closeStep >= 2 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            <div className={`flex-1 h-2 rounded-full ml-2 ${closeStep >= 3 ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                        </div>

                        {closeStep === 1 && (
                            <div className="animate-in slide-in-from-right duration-300">
                                <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-white">Contagem Física</h3>
                                <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">Informe o valor total em numerário contado.</p>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Valor Declarado (Dinheiro Físico)</label>
                                <div className="relative mb-6">
                                    <span className="absolute left-4 top-4 text-gray-400 font-bold text-lg">MT</span>
                                    <input 
                                        type="number" 
                                        autoFocus
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-700 border-2 border-blue-100 dark:border-blue-900 rounded-xl text-3xl font-bold outline-none focus:border-blue-500 text-gray-900 dark:text-white text-center"
                                        placeholder="0.00"
                                        value={declaredCash}
                                        onChange={e => setDeclaredCash(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleStep1Next()}
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleStep1Next} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                        Próximo <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {closeStep === 2 && closingStats && (
                            <div className="animate-in slide-in-from-right duration-300">
                                <div className="bg-gray-50 dark:bg-gray-900 p-6 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 font-mono text-sm relative mb-6">
                                    <h3 className="text-center font-bold text-lg mb-4 border-b border-gray-200 dark:border-gray-700 pb-2">CONFERÊNCIA</h3>
                                    <div className="mb-3 pb-3 border-b border-gray-200 dark:border-gray-700 border-dashed">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Numerário (Dinheiro)</p>
                                        <div className="flex justify-between py-1 text-xs">
                                            <span className="text-gray-500">Saldo Inicial</span>
                                            <span>{formatCurrency(currentSession?.initialBalance || 0)}</span>
                                        </div>
                                        <div className="flex justify-between py-1 text-xs">
                                            <span className="text-gray-500">Vendas em Dinheiro</span>
                                            <span>+{formatCurrency(closingStats.cashSales)}</span>
                                        </div>
                                        {closingStats.manualIn > 0 && (
                                            <div className="flex justify-between py-1 text-xs text-green-600">
                                                <span>Suprimentos (+)</span>
                                                <span>+{formatCurrency(closingStats.manualIn)}</span>
                                            </div>
                                        )}
                                        {closingStats.manualOut > 0 && (
                                            <div className="flex justify-between py-1 text-xs text-red-600">
                                                <span>Sangrias (-)</span>
                                                <span>-{formatCurrency(closingStats.manualOut)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between py-1 border-t border-gray-100 dark:border-gray-800 mt-1 pt-1">
                                            <span className="text-gray-600 dark:text-gray-300 font-bold">Total Esperado</span>
                                            <span className="font-bold">{formatCurrency(closingStats.expectedCash)}</span>
                                        </div>

                                        {/* Detailed Breakdown of All Payment Methods */}
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 border-dashed">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Resumo por Método de Pagamento</p>
                                            <div className="space-y-1">
                                                {Object.entries(closingStats.breakdown).map(([method, amount]) => (
                                                    <div key={method} className="flex justify-between py-1 text-xs">
                                                        <span className="text-gray-500">{getPaymentMethodLabel(method)}</span>
                                                        <span className="font-medium">{formatCurrency(amount)}</span>
                                                    </div>
                                                ))}
                                                {Object.keys(closingStats.breakdown).length === 0 && (
                                                    <p className="text-[10px] text-gray-400 italic">Nenhuma venda registada neste turno.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-between py-1 mt-4 border-t border-gray-100 dark:border-gray-800 pt-2">
                                            <span className="text-blue-600 font-bold">Informado (Físico)</span>
                                            <span className="font-bold text-blue-600 border-b border-blue-200">{formatCurrency(parseFloat(declaredCash.replace(',', '.')))}</span>
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <div className="flex justify-between items-center text-base mb-2">
                                            <span className="font-bold text-gray-800 dark:text-white">Total Vendas Turno</span>
                                            <span className="font-bold text-gray-800 dark:text-white">{formatCurrency(closingStats.totalSales)}</span>
                                        </div>
                                        <div className={`flex justify-between items-center p-3 rounded-lg ${
                                            closingStats.diff === 0 
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30' 
                                            : closingStats.diff > 0 
                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30' 
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30'
                                        }`}>
                                            <span className="font-bold uppercase text-[10px]">Diferença (Quebra/Sobra):</span>
                                            <span className="font-bold text-lg">
                                                {closingStats.diff > 0 ? '+' : ''}{formatCurrency(closingStats.diff)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleStep2Next} className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
                                        Continuar <ArrowRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {closeStep === 3 && closingStats && (
                            <div className="animate-in slide-in-from-right duration-300">
                                <h3 className="text-xl font-bold text-center mb-2 text-gray-900 dark:text-white">Finalização</h3>
                                <p className="text-center text-gray-500 dark:text-gray-400 mb-6 text-sm">Justifique divergências se houver e confirme o fecho.</p>
                                {Math.abs(closingStats.diff) > 0.01 && (
                                    <div className="mb-6">
                                        <div className="flex items-center gap-2 text-orange-500 mb-2">
                                            <AlertTriangle size={16} />
                                            <span className="text-[10px] font-bold uppercase">Justificativa Obrigatória</span>
                                        </div>
                                        <textarea 
                                            className="w-full p-3 border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 rounded-xl text-sm outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-white placeholder-gray-400 resize-none h-24"
                                            placeholder="Descreva o motivo da quebra ou sobra..."
                                            value={justification}
                                            onChange={e => setJustification(e.target.value)}
                                        ></textarea>
                                    </div>
                                )}
                                <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30 mb-6">
                                    <p className="text-xs text-blue-800 dark:text-blue-300 text-center">
                                        Ao confirmar, o turno será encerrado e os dados salvos permanentemente.
                                    </p>
                                </div>
                                <div className="flex justify-end items-center">
                                    <button 
                                        onClick={handleFinalConfirm}
                                        disabled={Math.abs(closingStats.diff) > 0.01 && !justification.trim()}
                                        className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle size={20} /> ENCERRAR TURNO
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default CashControl;
