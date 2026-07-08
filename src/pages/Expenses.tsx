
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  TrendingDown, 
  Plus, 
  Calendar, 
  Printer, 
  FileSpreadsheet, 
  Trash2, 
  Edit2,
  Filter,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Transaction, AppConfig, Supplier, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface ExpensesProps {
  config: AppConfig;
}

const Expenses: React.FC<ExpensesProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [activeTab, setActiveTab ] = useState<'register' | 'history'>('register');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  // Form State
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formData, setFormData] = useState({
      description: '',
      category: 'Outros',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      method: 'CASH',
      beneficiary: '',
      supplierId: ''
  });

  // Filter State
  const [startDate, setStartDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
      const date = new Date();
      return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [categoryFilter, setCategoryFilter] = useState('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const categories = [
      'Rendas',
      'Salários',
      'Fornecedores',
      'Impostos',
      'Água/Luz/Energia',
      'Manutenção',
      'Transporte',
      'Marketing',
      'Limpeza',
      'Outros'
  ];

  const paymentMethods = useMemo(() => {
    return (config.paymentMethods || [])
      .filter(m => m.isActive)
      .map(m => ({ id: m.id, label: m.name }));
  }, [config.paymentMethods]);

  const loadData = useCallback(() => {
      setTransactions(StorageService.getTransactions());
      setSuppliers(StorageService.getSuppliers());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT');

  // --- Handlers ---

  const handlePrintReceipt = useCallback((t: Transaction) => {
      DocumentGenerator.Tesouraria.gerarComprovativoDespesa(t, config);
  }, [config]);

  const handleSave = useCallback(async (e: React.FormEvent) => {
      e.preventDefault();
      
      const amount = parseFloat(formData.amount);
      if (!formData.description || !amount || amount <= 0) {
          showToast('Preencha todos os campos obrigatórios corretamente.', ToastType.WARNING);
          return;
      }

      const newTransaction: Transaction = {
          id: isEditing || `EXP-${Date.now()}`,
          date: new Date(formData.date).toISOString(),
          description: formData.description,
          amount: amount,
          type: 'EXPENSE',
          category: formData.category,
          status: 'PAID',
          method: formData.method,
          beneficiary: formData.beneficiary,
          operatorName: 'Admin', // In a real app, use auth context
          walletId: StorageService.getWalletIdForMethod(formData.method)
      };

      StorageService.saveTransaction(newTransaction);
      
      // Reset & Reload
      setFormData({
          description: '',
          category: 'Outros',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          method: 'CASH',
          beneficiary: '',
          supplierId: ''
      });
      setIsEditing(null);
      loadData();
      
      // Feedback
      if (!isEditing) {
          const printConf = await confirm('Despesa registrada. Deseja imprimir o comprovativo térmico?', {
              title: 'Imprimir Comprovativo',
              type: 'info',
              confirmText: 'Imprimir',
              cancelText: 'Não, fechar'
          });
          if (printConf) {
              handlePrintReceipt(newTransaction);
          }
      } else {
          showToast('Despesa updated com sucesso.', ToastType.SUCCESS);
      }
      
      setActiveTab('history');
  }, [formData, isEditing, loadData, handlePrintReceipt, showToast, confirm]);

  const handleEdit = (t: Transaction) => {
      setIsEditing(t.id);
      setFormData({
          description: t.description,
          category: t.category,
          amount: t.amount.toString(),
          date: t.date.split('T')[0],
          method: t.method || 'CASH',
          beneficiary: t.beneficiary || '',
          supplierId: ''
      });
      setActiveTab('register');
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
      const conf = await confirm('Tem certeza que deseja eliminar este registo? O valor será estornado para o caixa.', {
          title: 'Eliminar Despesa',
          type: 'danger',
          confirmText: 'Sim, Eliminar'
      });
      if (conf) {
          StorageService.deleteTransaction(id);
          loadData();
      }
  };

  // --- Filtering ---
  const filteredTransactions = useMemo(() => {
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

      return transactions.filter(t => {
          if (t.type !== 'EXPENSE') return false;
          
          const d = new Date(t.date).getTime();
          const matchDate = d >= start && d <= end;
          const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;

          return matchDate && matchCategory;
      }).sort((a, b) => {
          const idxA = transactions.indexOf(a);
          const idxB = transactions.indexOf(b);
          return idxB - idxA; // Most recently registered (highest index) first
      });
  }, [transactions, startDate, endDate, categoryFilter]);

  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage);

  const paginatedTransactions = useMemo(() => {
      const startIndex = (currentPage - 1) * itemsPerPage;
      return filteredTransactions.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredTransactions, currentPage]);

  const totalFiltered = filteredTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleExportReport = (type: 'PDF' | 'EXCEL') => {
      if (type === 'PDF') {
          if (filteredTransactions.length === 0) {
              showToast('Não existem dados para o relatório com os filtros atuais.', ToastType.WARNING);
              return;
          }
          DocumentGenerator.Tesouraria.gerarRelatorioDespesas(filteredTransactions, config);
      } else if (type === 'EXCEL') {
          const headers = ["Data", "Categoria", "Descrição", "Beneficiário", "Método", "Valor"];
          const csvRows = filteredTransactions.map(t => {
              return [
                  new Date(t.date).toLocaleDateString('pt-PT'),
                  t.category,
                  `"${t.description.replace(/"/g, '""')}"`, 
                  `"${(t.beneficiary || '').replace(/"/g, '""')}"`,
                  t.method || 'CASH',
                  t.amount.toString().replace('.', ',') 
              ].join(";");
          });

          const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + csvRows.join("\n");
          const encodedUri = encodeURI(csvContent);
          const link = document.createElement("a");
          link.setAttribute("href", encodedUri);
          const filenameDate = startDate || new Date().toISOString().split('T')[0];
          link.setAttribute("download", `Relatorio_Despesas_${filenameDate}.csv`);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
      }
  };

  return (
    <div className="flex flex-col gap-6 font-sans pb-10">
      
      {/* 1. Header & Tabs */}
      <div className="flex justify-between items-end shrink-0 pb-2 border-b border-gray-100 dark:border-gray-700">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <TrendingDown className="text-red-600" />
                  Despesas e Saídas
              </h1>
              <p className="text-gray-500 text-sm">Controlo de gastos operacionais e saídas de caixa.</p>
          </div>
          
          {/* Tabs */}
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg print:hidden">
              <button
                  onClick={() => setActiveTab('register')}
                  className={`px-6 py-2 text-sm font-bold rounded-md transition-all duration-200 flex items-center gap-2 ${
                      activeTab === 'register' 
                      ? 'bg-red-600 text-white shadow-md' 
                      : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                  }`}
              >
                  <Plus size={16} />
                  REGISTAR SAÍDA
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
                  HISTÓRICO DE SAÍDAS
              </button>
          </div>
      </div>

      {/* 2. Content */}
      <div className="flex-1 min-h-0 relative">
          
          {/* --- TAB: REGISTER --- */}
          {activeTab === 'register' && (
              <div className="max-w-2xl mx-auto w-full animate-in fade-in duration-200">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                          {isEditing ? <Edit2 size={18} className="text-blue-500" /> : <Plus size={18} className="text-green-500" />}
                          {isEditing ? 'Editar Despesa' : 'Registar Nova Saída'}
                      </h3>
                      
                      <form onSubmit={handleSave} className="space-y-4">
                          <div>
                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Descrição da Despesa</label>
                              <input 
                                required
                                type="text" 
                                placeholder="Ex: Compra de Material de Limpeza"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all text-gray-900 dark:text-white"
                                value={formData.description}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                                  <select 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                                    value={formData.category}
                                    onChange={e => setFormData({...formData, category: e.target.value})}
                                  >
                                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data</label>
                                  <input 
                                    type="date" 
                                    required
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                                    value={formData.date}
                                    onChange={e => setFormData({...formData, date: e.target.value})}
                                  />
                              </div>
                          </div>

                          <div>
                              {formData.category === 'Fornecedores' && (
                                  <div className="mb-4 animate-in slide-in-from-top duration-200">
                                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecionar Fornecedor</label>
                                      <select 
                                        className="w-full p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 appearance-none text-gray-900 dark:text-white"
                                        value={formData.supplierId}
                                        onChange={e => {
                                            const supId = e.target.value;
                                            const sup = suppliers.find(s => s.id === supId);
                                            setFormData({
                                                ...formData, 
                                                supplierId: supId,
                                                beneficiary: sup ? sup.name : formData.beneficiary,
                                                description: sup ? `Pagamento ao Fornecedor: ${sup.name}` : formData.description
                                            });
                                        }}
                                      >
                                          <option value="">-- Escolher Fornecedor --</option>
                                          {suppliers.map(s => (
                                              <option key={s.id} value={s.id}>{s.name} ({s.nif})</option>
                                          ))}
                                      </select>
                                  </div>
                              )}

                              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Beneficiário / Entidade (Opcional)</label>
                              <input 
                                type="text" 
                                placeholder="Ex: Supermercado X, Nome Funcionário"
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 transition-all text-gray-900 dark:text-white"
                                value={formData.beneficiary}
                                onChange={e => setFormData({...formData, beneficiary: e.target.value})}
                              />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor (MT)</label>
                                  <div className="relative">
                                      <span className="absolute left-3 top-3 text-gray-400 font-bold text-xs">MT</span>
                                      <input 
                                        required
                                        type="number" 
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full pl-9 pr-3 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                                        value={formData.amount}
                                        onChange={e => setFormData({...formData, amount: e.target.value})}
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pagamento</label>
                                  <select 
                                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white"
                                    value={formData.method}
                                    onChange={e => setFormData({...formData, method: e.target.value})}
                                  >
                                      {paymentMethods.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                                  </select>
                              </div>
                          </div>

                          <div className="pt-2 flex gap-2">
                              {isEditing && (
                                  <button 
                                    type="button" 
                                    onClick={() => { setIsEditing(null); setFormData({...formData, description: '', amount: '', beneficiary: ''}); setActiveTab('history'); }}
                                    className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-200 font-bold rounded-xl transition-colors"
                                  >
                                      Cancelar
                                  </button>
                              )}
                              <button 
                                type="submit"
                                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg shadow-red-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                              >
                                  {isEditing ? <Edit2 size={18} /> : <TrendingDown size={18} />}
                                  {isEditing ? 'Atualizar' : 'Registar Saída'}
                              </button>
                          </div>
                      </form>
                  </div>
              </div>
          )}

          {/* --- TAB: HISTORY --- */}
          {activeTab === 'history' && (
              <div className="flex flex-col gap-4 animate-in fade-in duration-200 w-full">
                  
                  {/* Toolbar */}
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-end gap-4">
                      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                          <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Intervalo</label>
                              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-1.5 rounded-lg border border-gray-200 dark:border-gray-700">
                                  <Calendar size={14} className="text-gray-400 ml-1"/>
                                  <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-xs outline-none w-24 text-gray-900 dark:text-white" />
                                  <span className="text-gray-400">-</span>
                                  <input type="date" value={endDate} onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }} className="bg-transparent text-xs outline-none w-24 text-gray-900 dark:text-white" />
                              </div>
                          </div>
                          <div className="flex flex-col gap-1">
                              <label className="text-xs font-bold text-gray-500 uppercase">Filtro</label>
                              <div className="relative">
                                  <Filter className="absolute left-2 top-2.5 text-gray-400" size={14} />
                                  <select 
                                    value={categoryFilter}
                                    onChange={e => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                                    className="pl-8 pr-4 py-1.5 h-[34px] bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                  >
                                      <option value="ALL">Todas as Categorias</option>
                                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      <div className="flex gap-2">
                          <button onClick={() => handleExportReport('PDF')} className="flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 text-xs font-bold transition-colors">
                              <Printer size={16} /> Imprimir Relatório
                          </button>
                          <button onClick={() => handleExportReport('EXCEL')} className="flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg border border-green-200 text-xs font-bold transition-colors">
                              <FileSpreadsheet size={16} /> Excel (CSV)
                          </button>
                      </div>
                  </div>

                  {/* Total Card */}
                  <div className="bg-gradient-to-r from-red-500 to-red-600 p-4 rounded-xl shadow-lg text-white flex justify-between items-center">
                      <div>
                          <p className="text-red-100 text-xs font-bold uppercase tracking-wider mb-1">Total de Despesas (Período)</p>
                          <h2 className="text-3xl font-bold">{formatCurrency(totalFiltered)}</h2>
                      </div>
                      <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm">
                          <TrendingDown size={32} />
                      </div>
                  </div>

                  {/* Table */}
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-[400px]">
                      <div className="flex-1 overflow-auto custom-scrollbar">
                          <table className="w-full text-left text-sm whitespace-nowrap">
                              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                  <tr>
                                      <th className="px-6 py-4">Data</th>
                                      <th className="px-6 py-4">Descrição</th>
                                      <th className="px-6 py-4">Categoria</th>
                                      <th className="px-6 py-4">Beneficiário</th>
                                      <th className="px-6 py-4">Método</th>
                                      <th className="px-6 py-4 text-right">Valor</th>
                                      <th className="px-6 py-4 text-center">Ações</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {filteredTransactions.length === 0 ? (
                                      <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nenhuma despesa encontrada no período.</td></tr>
                                  ) : (
                                      paginatedTransactions.map(t => (
                                          <tr key={t.id} className="hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors group">
                                              <td className="px-6 py-4 text-gray-500">{formatDate(t.date)}</td>
                                              <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{t.description}</td>
                                              <td className="px-6 py-4">
                                                  <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs font-medium border border-gray-200 dark:border-gray-600">
                                                      {t.category}
                                                  </span>
                                              </td>
                                              <td className="px-6 py-4 text-gray-500">{t.beneficiary || '-'}</td>
                                              <td className="px-6 py-4 text-gray-500 text-xs uppercase">{t.method || 'CASH'}</td>
                                              <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                                                  -{formatCurrency(t.amount)}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                  <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                      <button onClick={() => handleEdit(t)} className="p-2 text-gray-400 hover:text-orange-500 rounded-full hover:bg-orange-50 dark:hover:bg-orange-900/20" title="Editar">
                                                          <Edit2 size={16} />
                                                      </button>
                                                      <button onClick={() => handleDelete(t.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20" title="Eliminar">
                                                          <Trash2 size={16} />
                                                      </button>
                                                  </div>
                                              </td>
                                          </tr>
                                      ))
                                  )}
                              </tbody>
                          </table>
                      </div>

                      {/* Paginação do Histórico de Despesas */}
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

              </div>
          )}
          
      </div>

    </div>
  );
};

export default Expenses;
