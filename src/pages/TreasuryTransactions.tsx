
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Plus, 
  Minus, 
  Calendar,
  CreditCard,
  DollarSign,
  AlertTriangle,
  X,
  FileText,
  Save,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Transaction, AppConfig, User as UserType, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface TreasuryTransactionsProps {
  config: AppConfig;
  currentUser?: UserType;
}

const TreasuryTransactions: React.FC<TreasuryTransactionsProps> = ({ config, currentUser }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  
  const paymentMethods = useMemo(() => {
    return config.paymentMethods?.filter(m => m.isActive) || [];
  }, [config.paymentMethods]);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'>('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [operatorFilter, setOperatorFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'INCOME' | 'EXPENSE'>('INCOME');

  // Form Data
  const [formData, setFormData] = useState({
      amount: '',
      method: 'CASH',
      category: '',
      description: '',
      beneficiary: ''
  });

  useEffect(() => {
    // Load Data
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransactions(StorageService.getTransactions());
    setUsers(StorageService.getUsers());

    // Default Dates (Current Month)
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, []);

  // --- Filtering Logic ---
  const filteredTransactions = useMemo(() => {
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

      return transactions.filter(t => {
          const d = new Date(t.date).getTime();
          // Corrigido de dateMatch para matchDate para evitar o erro de 'matchDate' not found na linha 83
          const matchDate = d >= start && d <= end;
          const matchType = typeFilter === 'ALL' || t.type === typeFilter;
          const matchMethod = methodFilter === 'ALL' || t.method === methodFilter;
          const matchOperator = operatorFilter === 'ALL' || (t.operatorName && t.operatorName.includes(operatorFilter)); 

          return matchDate && matchType && matchMethod && matchOperator;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, startDate, endDate, typeFilter, methodFilter, operatorFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginatedTransactions = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  // --- KPI Calculation ---
  const totals = useMemo(() => {
      let income = 0;
      let expense = 0;
      filteredTransactions.forEach(t => {
          if (t.type === 'INCOME') {
              income += t.amount;
          } else if (t.type === 'EXPENSE') {
              expense += t.amount;
          }
      });
      return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // --- Handlers ---

  const handleGenerateReport = () => {
      if (filteredTransactions.length === 0) {
          showToast('Não existem transações para os filtros selecionados.', ToastType.WARNING);
          return;
      }
      DocumentGenerator.Tesouraria.gerarRelatorioTransacoes(filteredTransactions, config);
  };

  const resetForm = () => {
      setFormData({ amount: '', method: 'CASH', category: '', description: '', beneficiary: '' });
  };

  const openNewTransaction = (type: 'INCOME' | 'EXPENSE') => {
      resetForm();
      setModalType(type);
      setIsModalOpen(true);
  };

  const handleSave = async () => {
      const amount = parseFloat(formData.amount);
      if (!amount || amount <= 0) {
          showToast('Por favor, insira um valor válido maior que zero.', ToastType.WARNING);
          return;
      }
      if (!formData.description.trim()) {
          showToast('A descrição do lançamento é obrigatória.', ToastType.WARNING);
          return;
      }
      if (!formData.category) {
          showToast('Selecione ou digite uma categoria.', ToastType.WARNING);
          return;
      }

      if (modalType === 'EXPENSE' && amount > 5000) {
          const conf = await confirm('Valor elevado (> 5.000 MT). Confirma esta saída?', {
              title: 'Aviso de Margem Elevada',
              type: 'warning'
          });
          if (!conf) {
              return;
          }
      }

      const activeSession = StorageService.getActiveCashSession(currentUser?.id);

      if (formData.method === 'CASH') {
          if (!activeSession) {
              showToast('Para lançamentos em dinheiro (suprimentos/sangrias), você deve primeiro abrir o seu caixa na página de Controle de Caixa.', ToastType.WARNING);
              return;
          }
      }

      const transactionData: Transaction = {
          id: `MAN-${Date.now()}`,
          date: new Date().toISOString(),
          description: formData.description,
          amount: amount,
          type: modalType,
          category: formData.category,
          status: 'PAID',
          method: formData.method,
          operatorName: currentUser?.name || currentUser?.username || 'Administrador', 
          userId: currentUser?.id,
          beneficiary: formData.beneficiary,
          walletId: StorageService.getWalletIdForMethod(formData.method),
          sessionId: formData.method === 'CASH' ? activeSession?.id : undefined
      };

      try {
          StorageService.saveTransaction(transactionData);
          setTransactions(StorageService.getTransactions());
          showToast('Transação registada com sucesso!', ToastType.SUCCESS);
          setIsModalOpen(false);
          resetForm();
      } catch (e: unknown) {
          const error = e as Error;
          showToast('Erro ao salvar: ' + error.message, ToastType.ERROR);
      }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';
  const formatDateFull = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
      
      {/* 1. Header & Quick Actions */}
      <div className="flex justify-between items-start shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="text-blue-600" />
                  Transações de Tesouraria
              </h1>
              <p className="text-gray-500 text-sm">Entradas e saídas avulsas, suprimentos e sangrias de caixa.</p>
          </div>
          <div className="flex gap-3">
              <button 
                onClick={handleGenerateReport}
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-xl transition-colors font-bold text-sm border border-gray-200 dark:border-gray-600"
                title="Gerar Relatório A4 com base nos filtros atuais"
              >
                  <FileText size={18} /> Relatório A4
              </button>
              <button 
                onClick={() => openNewTransaction('INCOME')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-green-500/30 transition-transform active:scale-95 font-bold text-sm"
              >
                  <Plus size={18} /> Nova Entrada
              </button>
              <button 
                onClick={() => openNewTransaction('EXPENSE')}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-red-500/30 transition-transform active:scale-95 font-bold text-sm"
              >
                  <Minus size={18} /> Nova Saída
              </button>
          </div>
      </div>

      {/* 2. Filters Bar */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col xl:flex-row gap-4 justify-between items-end">
          <div className="flex flex-wrap gap-4 w-full">
              {/* Date Filter */}
              <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-500 uppercase">Período</label>
                  <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Calendar size={14} className="text-gray-400 ml-1"/>
                      <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-sm outline-none w-32" />
                      <span className="text-gray-400">-</span>
                      <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-sm outline-none w-32" />
                  </div>
              </div>

              {/* Type Filter */}
              <div className="flex flex-col gap-1 w-32">
                  <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                  <select 
                    value={typeFilter}
                    onChange={e => { setTypeFilter(e.target.value as 'ALL' | 'INCOME' | 'EXPENSE' | 'TRANSFER'); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm outline-none"
                  >
                      <option value="ALL">Todos</option>
                      <option value="INCOME">Entradas</option>
                      <option value="EXPENSE">Saídas</option>
                      <option value="TRANSFER">Transferências</option>
                  </select>
              </div>

              {/* Method Filter */}
              <div className="flex flex-col gap-1 w-40">
                  <label className="text-xs font-bold text-gray-500 uppercase">Método</label>
                  <select 
                    value={methodFilter}
                    onChange={e => { setMethodFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm outline-none"
                  >
                      <option value="ALL">Todos</option>
                      {paymentMethods.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                  </select>
              </div>

              {/* Operator Filter */}
              <div className="flex flex-col gap-1 w-48">
                  <label className="text-xs font-bold text-gray-500 uppercase">Operador</label>
                  <select 
                    value={operatorFilter}
                    onChange={e => { setOperatorFilter(e.target.value); setCurrentPage(1); }}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-2 text-sm outline-none"
                  >
                      <option value="ALL">Todos</option>
                      {users.map(u => <option key={u.id} value={u.name}>{u.name}</option>)}
                  </select>
              </div>
          </div>
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-xl border border-green-100 dark:border-green-900/30 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Total Entradas</p>
                  <p className="text-2xl font-bold text-green-800 dark:text-green-300">{formatCurrency(totals.income)}</p>
              </div>
              <div className="p-3 bg-green-200 dark:bg-green-800/50 rounded-lg text-green-700 dark:text-green-300">
                  <ArrowUpCircle size={24} />
              </div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 dark:border-red-900/30 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-800 dark:text-green-300">{formatCurrency(totals.expense)}</p>
              </div>
              <div className="p-3 bg-red-200 dark:bg-red-800/50 rounded-lg text-red-700 dark:text-red-300">
                  <ArrowDownCircle size={24} />
              </div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex justify-between items-center">
              <div>
                  <p className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase">Saldo do Período</p>
                  <p className={`text-2xl font-bold ${totals.balance >= 0 ? 'text-blue-800 dark:text-blue-300' : 'text-red-600'}`}>{formatCurrency(totals.balance)}</p>
              </div>
              <div className="p-3 bg-blue-200 dark:bg-blue-800/50 rounded-lg text-blue-700 dark:text-blue-300">
                  <DollarSign size={24} />
              </div>
          </div>
      </div>

      {/* 4. Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left text-sm whitespace-nowrap">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4">Data/Hora</th>
                          <th className="px-6 py-4">Tipo</th>
                          <th className="px-6 py-4">Categoria</th>
                          <th className="px-6 py-4">Descrição</th>
                          <th className="px-6 py-4">Beneficiário</th>
                          <th className="px-6 py-4 text-right">Valor</th>
                          <th className="px-6 py-4">Usuário</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {filteredTransactions.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nenhuma transação encontrada no período.</td></tr>
                      ) : (
                          paginatedTransactions.map(t => {
                              const isTransfer = t.type === 'TRANSFER';
                              const isPositive = t.type === 'INCOME' || (isTransfer && t.transferType === 'RECEIVE');
                              const badgeClass = isTransfer
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                  : isPositive
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
                              const badgeLabel = isTransfer
                                  ? 'TRANSFERÊNCIA'
                                  : isPositive ? 'ENTRADA' : 'SAÍDA';
                              const textClass = isPositive ? 'text-green-600' : 'text-red-600';
                              return (
                                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors group">
                                      <td className="px-6 py-4 text-gray-500">{formatDateFull(t.date)}</td>
                                      <td className="px-6 py-4">
                                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${badgeClass}`}>
                                              {badgeLabel}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{t.category}</td>
                                      <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                      <td className="px-6 py-4 text-gray-500">{t.beneficiary || '-'}</td>
                                      <td className={`px-6 py-4 text-right font-bold ${textClass}`}>
                                          {isPositive ? '+' : '-'}{formatCurrency(t.amount)}
                                      </td>
                                      <td className="px-6 py-4 text-gray-500">{t.operatorName || 'Sistema'}</td>
                                  </tr>
                              );
                          })
                      )}
                  </tbody>
              </table>
          </div>

          {/* Paginação do Histórico de Transações */}
          {filteredTransactions.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500 shrink-0">
                  <span className="font-medium">
                      Mostrando {paginatedTransactions.length} de {filteredTransactions.length} registos
                  </span>
                  <div className="flex items-center gap-2">
                      <button 
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                          <ChevronLeft size={14} />
                      </button>
                      <span className="font-medium px-2">
                          Pág. {currentPage} / {totalPages || 1}
                      </span>
                      <button 
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded bg-white dark:bg-gray-800 border dark:border-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                          <ChevronRight size={14} />
                      </button>
                  </div>
              </div>
          )}
      </div>

      {/* --- UNIFIED MODAL FOR ENTRY & EXIT --- */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                  <div className={`p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center ${
                      modalType === 'INCOME' 
                      ? 'bg-green-50 dark:bg-green-900/20' 
                      : 'bg-red-50 dark:bg-red-900/20'
                  }`}>
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <h3 className={`font-bold flex items-center gap-2 ${
                              modalType === 'INCOME' ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                          }`}>
                              {modalType === 'INCOME' ? <Plus size={20} /> : <Minus size={20} />} 
                              {modalType === 'INCOME' ? 'Nova Entrada (Suprimento)' : 'Nova Saída (Sangria)'}
                          </h3>
                      </div>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                          <X size={20}/>
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      {/* Valor */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor do Movimento</label>
                          <div className="relative">
                              <span className="absolute left-3 top-3 text-gray-400 font-bold">MT</span>
                              <input 
                                type="number" 
                                autoFocus
                                step="0.01"
                                className={`w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-lg font-bold outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={e => setFormData({...formData, amount: e.target.value})}
                              />
                          </div>
                      </div>

                      {/* Categoria e Método */}
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                              <input 
                                list="categories"
                                className="w-full p-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                placeholder="Selecione..."
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                              />
                              <datalist id="categories">
                                  <option value="Suprimento de Caixa" />
                                  <option value="Venda Avulsa" />
                                  <option value="Despesa Geral" />
                                  <option value="Depósito Bancário" />
                                  <option value="Pagamento Fornecedor" />
                                  <option value="Adiantamento Salarial" />
                                  <option value="Transporte" />
                                  <option value="Alimentação" />
                              </datalist>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Método</label>
                              <select 
                                className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                value={formData.method}
                                onChange={e => setFormData({...formData, method: e.target.value})}
                              >
                                  {paymentMethods.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      {/* Descrição */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição / Motivo</label>
                          <input 
                            type="text"
                            placeholder="Ex: Compra de material de escritório"
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                          />
                      </div>

                      {/* Beneficiário */}
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Beneficiário / Entidade (Opcional)</label>
                          <input 
                            type="text"
                            placeholder="Quem recebeu ou entregou o valor?"
                            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            value={formData.beneficiary}
                            onChange={e => setFormData({...formData, beneficiary: e.target.value})}
                          />
                      </div>
                      
                      {modalType === 'EXPENSE' && parseFloat(formData.amount) > 5000 && (
                          <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 p-3 rounded-lg text-xs flex items-center gap-2 border border-orange-100 dark:border-orange-800">
                              <AlertTriangle size={16} /> Atenção: Valor elevado. Verifique os dados.
                          </div>
                      )}

                      <button 
                        onClick={handleSave}
                        className={`w-full py-3 text-white font-bold rounded-xl shadow-lg mt-2 flex items-center justify-center gap-2 transition-transform active:scale-95 ${
                            modalType === 'INCOME' 
                            ? 'bg-green-600 hover:bg-green-700 shadow-green-500/30' 
                            : 'bg-red-600 hover:bg-red-700 shadow-red-500/30'
                        }`}
                      >
                          <Save size={18} />
                          {modalType === 'INCOME' ? 'CONFIRMAR ENTRADA' : 'CONFIRMAR SAÍDA'}
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default TreasuryTransactions;
