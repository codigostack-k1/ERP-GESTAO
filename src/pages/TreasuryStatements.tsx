import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  FileText, 
  Download, 
  Printer, 
  Landmark, 
  Search, 
  Filter, 
  Wallet as WalletIcon, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RefreshCw,
  TrendingUp
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Wallet, Transaction, AppConfig, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';

interface TreasuryStatementsProps {
  config: AppConfig;
}

const TreasuryStatements: React.FC<TreasuryStatementsProps> = ({ config }) => {
  const { showToast } = useToast();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  
  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadData = useCallback(() => {
    const allWallets = StorageService.getWallets();
    // Filter out inactive wallets if status is present
    const enabledWallets = allWallets.filter(w => w.status !== 'INACTIVE');
    setWallets(enabledWallets);
    setTransactions(StorageService.getTransactions());

    // Auto-select first wallet if none selected or the selected one isn't in enabled list
    if (enabledWallets.length > 0) {
      const exists = enabledWallets.some(w => w.id === selectedWalletId);
      if (!exists) {
        setSelectedWalletId(enabledWallets[0].id);
      }
    }
  }, [selectedWalletId]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedWallet = useMemo(() => {
    return wallets.find(w => w.id === selectedWalletId) || null;
  }, [wallets, selectedWalletId]);

  // Reset pagination when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedWalletId, startDate, endDate, searchTerm, typeFilter]);

  // Calculations for running balances backwards from current wallet balance
  const walletTransactionsAnalysis = useMemo(() => {
    if (!selectedWallet) return { periodTransactions: [], runningBalances: {}, startingBalance: 0, endingBalance: 0, totalIn: 0, totalOut: 0 };

    // 1. Get all transactions for this wallet, sorted newest to oldest
    const walletTxSorted = transactions
      .filter(t => t.walletId === selectedWallet.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 2. Compute running balance for each transaction going backwards from current balance
    const runningBalances: Record<string, number> = {};
    let currentTempBalance = selectedWallet.balance;

    walletTxSorted.forEach(t => {
      runningBalances[t.id] = currentTempBalance;
      const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
      if (isIncoming) {
        currentTempBalance -= t.amount;
      } else {
        currentTempBalance += t.amount;
      }
    });

    // 3. Filter transactions within selected date range and matching other filters
    const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
    const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

    const filtered = walletTxSorted
      .filter(t => {
        const time = new Date(t.date).getTime();
        const matchesDate = time >= start && time <= end;
        
        const matchesSearch = searchTerm 
          ? t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
            (t.reference && t.reference.toLowerCase().includes(searchTerm.toLowerCase())) ||
            t.category.toLowerCase().includes(searchTerm.toLowerCase())
          : true;

        const matchesType = typeFilter === 'ALL'
          ? true
          : t.type === typeFilter;

        return matchesDate && matchesSearch && matchesType;
      })
      // Sort oldest to newest for chronological table display
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // 4. Calculate period stats (credits/debits)
    const totalIn = filtered
      .filter(t => t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE'))
      .reduce((acc, t) => acc + t.amount, 0);

    const totalOut = filtered
      .filter(t => t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.transferType === 'SEND'))
      .reduce((acc, t) => acc + t.amount, 0);

    // 5. Calculate starting and ending balances for the selected period
    let startingBalance = currentTempBalance;
    if (filtered.length > 0) {
      const firstTx = filtered[0];
      const firstTxIsIncoming = firstTx.type === 'INCOME' || (firstTx.type === 'TRANSFER' && firstTx.transferType === 'RECEIVE');
      startingBalance = runningBalances[firstTx.id] - (firstTxIsIncoming ? firstTx.amount : -firstTx.amount);
    }
    const endingBalance = filtered.length > 0 ? runningBalances[filtered[filtered.length - 1].id] : startingBalance;

    return {
      periodTransactions: filtered,
      runningBalances,
      startingBalance,
      endingBalance,
      totalIn,
      totalOut
    };
  }, [selectedWallet, transactions, startDate, endDate, searchTerm, typeFilter]);

  const {
    periodTransactions,
    runningBalances,
    startingBalance,
    endingBalance,
    totalIn,
    totalOut
  } = walletTransactionsAnalysis;

  // Pagination math
  const totalPages = Math.ceil(periodTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return periodTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [periodTransactions, currentPage]);

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-PT') + ' ' + d.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
  };

  // Export to PDF
  const handlePrintPDF = () => {
    if (!selectedWallet) return;
    try {
      DocumentGenerator.Tesouraria.gerarExtratoIndividualWallet(
        selectedWallet,
        transactions,
        startDate,
        endDate,
        config
      );
      showToast('Extrato PDF gerado com sucesso!', ToastType.SUCCESS);
    } catch (e) {
      console.error(e);
      showToast('Erro ao gerar PDF do extrato.', ToastType.ERROR);
    }
  };

  // Export to CSV
  const handleDownloadCSV = () => {
    if (!selectedWallet) return;
    try {
      const headers = ['Data', 'Descricao', 'Referencia', 'Categoria', 'Tipo', 'Entrada (Credito) MT', 'Saida (Debito) MT', 'Saldo Acumulado MT'];
      const rows = periodTransactions.map(t => {
        const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
        return [
          `"${new Date(t.date).toLocaleString('pt-PT')}"`,
          `"${t.description.replace(/"/g, '""')}"`,
          `"${(t.reference || '').replace(/"/g, '""')}"`,
          `"${t.category.replace(/"/g, '""')}"`,
          `"${t.type}"`,
          isIncoming ? t.amount.toFixed(2) : '0.00',
          !isIncoming ? t.amount.toFixed(2) : '0.00',
          runningBalances[t.id].toFixed(2)
        ];
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Extrato_${selectedWallet.name.replace(/\s+/g, '_')}_${startDate}_a_${endDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Extrato CSV baixado com sucesso!', ToastType.SUCCESS);
    } catch (e) {
      console.error(e);
      showToast('Erro ao baixar arquivo CSV.', ToastType.ERROR);
    }
  };

  return (
    <div className="p-6 space-y-6" id="treasury-statements-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
            <Landmark className="text-blue-600 dark:text-blue-400" size={28} />
            Extratos de Contas
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Selecione uma carteira habilitada para visualizar o extrato, conferir o saldo e efetuar o download.
          </p>
        </div>
        
        {/* Export buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintPDF}
            disabled={!selectedWallet || periodTransactions.length === 0}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-95"
            id="print-pdf-btn"
          >
            <Printer size={18} />
            Imprimir Extrato
          </button>
          
          <button
            onClick={handleDownloadCSV}
            disabled={!selectedWallet || periodTransactions.length === 0}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-all duration-200 active:scale-95"
            id="download-csv-btn"
          >
            <Download size={18} />
            Baixar CSV
          </button>
        </div>
      </div>

      {/* Wallet Selector & Date Range Filters Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700/50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Wallet Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Conta / Carteira Ativa
            </label>
            <div className="relative">
              <select
                value={selectedWalletId}
                onChange={(e) => setSelectedWalletId(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                id="wallet-select"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.type})
                  </option>
                ))}
                {wallets.length === 0 && (
                  <option value="">Nenhuma carteira habilitada</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <WalletIcon size={18} />
              </div>
            </div>
          </div>

          {/* Date Range Start */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Data de Início
            </label>
            <div className="relative">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="start-date-input"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar size={18} />
              </div>
            </div>
          </div>

          {/* Date Range End */}
          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Data de Fim
            </label>
            <div className="relative">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg py-2.5 pl-10 pr-3 text-sm font-semibold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                id="end-date-input"
              />
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Calendar size={18} />
              </div>
            </div>
          </div>

          {/* Quick Refresh */}
          <div className="flex">
            <button
              onClick={loadData}
              className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors border border-slate-200/50 dark:border-slate-600"
              id="refresh-btn"
            >
              <RefreshCw size={18} />
              Atualizar Dados
            </button>
          </div>
        </div>
      </div>

      {/* Account Info and Balances KPIs */}
      {selectedWallet ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Starting Balance */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Saldo Anterior ao Período
              </span>
              <span className="text-xl font-black text-slate-700 dark:text-slate-200 block">
                {formatMoney(startingBalance)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-slate-50 dark:bg-slate-900/50 flex items-center justify-center text-slate-500">
              <Calendar size={20} />
            </div>
          </div>

          {/* Credits Summary */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Entradas (Créditos)
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 block">
                +{formatMoney(totalIn)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-500">
              <ArrowDownLeft size={20} />
            </div>
          </div>

          {/* Debits Summary */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Total Saídas (Débitos)
              </span>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 block">
                -{formatMoney(totalOut)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500">
              <ArrowUpRight size={20} />
            </div>
          </div>

          {/* End Period Balance */}
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                Saldo no Fim do Período
              </span>
              <span className="text-xl font-black text-blue-700 dark:text-blue-300 block">
                {formatMoney(endingBalance)}
              </span>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-500">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-amber-50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300 p-4 rounded-xl border border-amber-200 dark:border-amber-900/30 font-medium text-sm">
          Por favor, ative carteiras nas configurações de forma a visualizar os extratos de conta correspondentes.
        </div>
      )}

      {/* Advanced filters and table card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50 overflow-hidden">
        {/* Search & Filter Type Sub-Bar */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-700/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              placeholder="Pesquisar por descrição, referência, categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              id="search-input"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={16} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Filter size={14} />
              Tipo de Movimento:
            </span>
            <div className="flex bg-slate-200/55 dark:bg-slate-900 p-1 rounded-lg">
              <button
                onClick={() => setTypeFilter('ALL')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${typeFilter === 'ALL' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setTypeFilter('INCOME')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${typeFilter === 'INCOME' ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Entradas
              </button>
              <button
                onClick={() => setTypeFilter('EXPENSE')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${typeFilter === 'EXPENSE' ? 'bg-white dark:bg-slate-800 text-rose-600 dark:text-rose-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Saídas
              </button>
              <button
                onClick={() => setTypeFilter('TRANSFER')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors ${typeFilter === 'TRANSFER' ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              >
                Transfs
              </button>
            </div>
          </div>
        </div>

        {/* Transactions list */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-900/30 text-slate-400 text-xs font-bold uppercase border-b border-slate-100 dark:border-slate-700">
                <th className="py-3.5 px-5">Data / Hora</th>
                <th className="py-3.5 px-5">Descrição / Ref</th>
                <th className="py-3.5 px-5">Categoria</th>
                <th className="py-3.5 px-5 text-right">Crédito (Entrada)</th>
                <th className="py-3.5 px-5 text-right">Débito (Saída)</th>
                <th className="py-3.5 px-5 text-right">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 text-slate-700 dark:text-slate-300">
              {paginatedTransactions.map((t) => {
                const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-700/10 transition-colors text-sm"
                  >
                    {/* Timestamp */}
                    <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400">
                      {formatDate(t.date)}
                    </td>
                    
                    {/* Description */}
                    <td className="py-3.5 px-5 font-semibold text-slate-800 dark:text-white">
                      <div className="flex flex-col">
                        <span>{t.description}</span>
                        {t.reference && (
                          <span className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                            Referência: {t.reference}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-5">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400">
                        {t.category}
                      </span>
                    </td>

                    {/* Credit Column */}
                    <td className="py-3.5 px-5 text-right font-bold text-emerald-600 dark:text-emerald-400">
                      {isIncoming ? formatMoney(t.amount) : '—'}
                    </td>

                    {/* Debit Column */}
                    <td className="py-3.5 px-5 text-right font-bold text-rose-600 dark:text-rose-400">
                      {!isIncoming ? formatMoney(t.amount) : '—'}
                    </td>

                    {/* Resulting Balance */}
                    <td className="py-3.5 px-5 text-right font-black text-slate-800 dark:text-slate-200">
                      {formatMoney(runningBalances[t.id])}
                    </td>
                  </tr>
                );
              })}

              {paginatedTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <FileText className="mx-auto text-slate-300 dark:text-slate-600 mb-2" size={40} />
                    <p className="font-semibold text-sm">Nenhuma transação encontrada</p>
                    <p className="text-xs">Tente alterar os filtros ou o período selecionado.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Mostrando página <strong className="text-slate-700 dark:text-slate-200">{currentPage}</strong> de <strong className="text-slate-700 dark:text-slate-200">{totalPages}</strong> ({periodTransactions.length} movimentações no total)
            </span>
            
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold rounded-md text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700 disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-xs font-bold rounded-md text-slate-700 dark:text-slate-200 border border-slate-200/50 dark:border-slate-700 disabled:opacity-50"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TreasuryStatements;
