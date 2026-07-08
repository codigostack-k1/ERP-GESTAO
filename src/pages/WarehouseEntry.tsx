

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Package, Save, Search, ArrowDownCircle, Plus, Trash2, FileText, History, Eye, ChevronLeft, ChevronRight, X, Calendar, Printer } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { DocumentGenerator } from '../services/documentGenerators';
import { Product, Supplier, AppConfig, StockEntry, StockEntryItem, PaymentDetail } from '../types';
import PaymentModal from '../components/PaymentModal';
import { useToast, ToastType } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface WarehouseEntryProps {
  config: AppConfig;
}

const WarehouseEntry: React.FC<WarehouseEntryProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  // Global Data
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [entriesHistory, setEntriesHistory] = useState<StockEntry[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // New Entry Form State
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [entryItems, setEntryItems] = useState<StockEntryItem[]>([]);
  
  // Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Detail Modal
  const [viewEntry, setViewEntry] = useState<StockEntry | null>(null);

  // Payment Expense Flow
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [expenseTotal, setExpenseTotal] = useState(0);
  const [lastEntryId, setLastEntryId] = useState('');

  const loadData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setSuppliers(StorageService.getSuppliers());
    setEntriesHistory(StorageService.getStockEntries().sort((a: StockEntry, b: StockEntry) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  const resetForm = useCallback(() => {
    setEntryItems([]);
    setDocumentRef('');
    setSelectedSupplierId('');
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // --- Calculations ---
  const totalEntryValue = entryItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);

  // --- Handlers: New Entry ---

  const handleSelectProduct = (product: Product) => {
      if (entryItems.find(i => i.productId === product.id)) {
          showToast('Este item já está na lista.', ToastType.WARNING);
          return;
      }

      setEntryItems(prev => [...prev, {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          cost: product.cost,
          price: product.price,
          expiryDate: product.expiryDate
      }]);
      setSearchQuery('');
      setShowResults(false);
      setTimeout(() => {
          searchRef.current?.focus();
      }, 50);
  };

  const updateItem = (index: number, field: keyof StockEntryItem, value: string | number | undefined) => {
      setEntryItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';

  const handleFinalize = useCallback(async () => {
      if (!selectedSupplierId) {
          showToast('Selecione um fornecedor.', ToastType.WARNING);
          return;
      }
      if (!documentRef) {
          showToast('Informe o número da factura/documento.', ToastType.WARNING);
          return;
      }
      if (entryItems.length === 0) {
          showToast('Adicione produtos à entrada.', ToastType.WARNING);
          return;
      }

      const conf = await confirm(`Confirma a entrada de ${entryItems.length} itens no valor total de ${formatCurrency(totalEntryValue)}?`, {
          title: 'Confirmar Entrada de Stock',
          type: 'info'
      });
      if (!conf) return;

      const supplier = suppliers.find(s => s.id === selectedSupplierId);

      const newEntry: StockEntry = {
          id: `ENT-${Date.now()}`,
          date: new Date().toISOString(),
          supplierId: selectedSupplierId,
          supplierName: supplier?.name || 'Desconhecido',
          invoiceNo: documentRef,
          items: entryItems,
          totalAmount: totalEntryValue,
          status: 'ACTIVE',
          registeredBy: 'Admin'
      };

      StorageService.saveStockEntry(newEntry);
      
      const payConf = await confirm('Entrada processada com sucesso! Deseja registar esta entrada como uma despesa (saída de caixa) agora?', {
          title: 'Registrar Despesa',
          type: 'info',
          confirmText: 'Registrar Despesa',
          cancelText: 'Não, fechar'
      });

      if (payConf) {
          setExpenseTotal(totalEntryValue);
          setLastEntryId(newEntry.id);
          setPaymentModalOpen(true);
      } else {
          // Reset only if not proceeding to payment (or payment will reset)
          resetForm();
          setActiveTab('HISTORY');
      }
      
      loadData();
  }, [selectedSupplierId, documentRef, entryItems, totalEntryValue, suppliers, loadData, resetForm, showToast, confirm]);

  const handlePaymentConfirm = (details: PaymentDetail[], _method: string) => {
      const supplier = suppliers.find(s => s.id === selectedSupplierId);
      
      details.forEach((d, idx) => {
          const walletId = StorageService.getWalletIdForMethod(d.method);
          StorageService.saveTransaction({
              id: `EXP-ENTRY-${lastEntryId}-${idx}`,
              date: new Date().toISOString(),
              description: `Pagamento de Entrada #${documentRef} - ${supplier?.name || 'Fornecedor'}`,
              amount: d.amount,
              type: 'EXPENSE',
              category: 'Compras de Mercadoria',
              status: 'PAID',
              method: d.method,
              walletId: walletId,
              reference: documentRef
          });
      });

      showToast('Despesa registada com sucesso!', ToastType.SUCCESS);
      setPaymentModalOpen(false);
      resetForm();
      setActiveTab('HISTORY');
  };

  // --- Pagination & Filter: History ---
  const filteredHistory = useMemo(() => {
      return entriesHistory.filter(h => 
          h.supplierName.toLowerCase().includes(historySearch.toLowerCase()) ||
          h.invoiceNo.toLowerCase().includes(historySearch.toLowerCase())
      );
  }, [entriesHistory, historySearch]);

  const totalPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrintEntry = (entry: StockEntry) => {
    DocumentGenerator.Armazem.gerarGuiaEntrada(entry, config);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 font-sans">
      
      {/* Header com Abas */}
      <div className="flex justify-between items-end pb-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <ArrowDownCircle className="text-green-600" />
                  Entrada de Mercadoria
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1">GESTÃO DE COMPRAS E ABASTECIMENTO</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('NEW')}
                className={`px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'NEW' ? 'bg-white dark:bg-gray-700 shadow text-green-600' : 'text-gray-500'}`}
              >
                  <Plus size={16} /> NOVA ENTRADA
              </button>
              <button 
                onClick={() => { setActiveTab('HISTORY'); setCurrentPage(1); }}
                className={`px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'HISTORY' ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500'}`}
              >
                  <History size={16} /> HISTÓRICO
              </button>
          </div>
      </div>

      {activeTab === 'NEW' ? (
          <div className="flex flex-col h-full gap-4 animate-in fade-in duration-200">
              {/* Header de Dados */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border flex flex-col md:flex-row gap-4 shadow-sm">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase mb-2 block">Fornecedor</label>
                      <select 
                        className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedSupplierId}
                        onChange={e => setSelectedSupplierId(e.target.value)}
                      >
                          <option value="">-- Selecione o Fornecedor --</option>
                          {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} (NUIT: {s.nif})</option>)}
                      </select>
                  </div>
                  <div className="w-full md:w-1/3">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nº Factura / Documento</label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 text-gray-400" size={18} />
                        <input 
                            type="text"
                            className="w-full pl-10 pr-4 py-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            placeholder="Ex: FT-2024/001"
                            value={documentRef}
                            onChange={e => setDocumentRef(e.target.value)}
                        />
                      </div>
                  </div>
              </div>

              {/* Tabela de Itens */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden flex flex-col min-0">
                  <div className="bg-gray-50 dark:bg-gray-900/50 border-b px-6 py-3 flex text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex-1">Produto</div>
                      <div className="w-32 text-center">Qtd. Entrada</div>
                      <div className="w-32 text-right">Custo Unit.</div>
                      <div className="w-32 text-right">Preço Venda</div>
                      <div className="w-32 text-center px-2">Validade</div>
                      <div className="w-32 text-right">Subtotal</div>
                      <div className="w-16 text-center">Ação</div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {entryItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                              <Package size={48} />
                              <p className="mt-2 text-sm">Adicione produtos à lista de entrada</p>
                          </div>
                      ) : (
                          entryItems.map((item, idx) => (
                              <div key={idx} className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50/30 transition-colors">
                                  <div className="flex-1">
                                      <p className="font-bold text-gray-900 dark:text-white text-sm">{item.productName}</p>
                                      {(() => {
                                        const p = products.find(prod => prod.id === item.productId);
                                        return p?.description ? <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{p.description}</p> : null;
                                      })()}
                                      <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                                  </div>
                                  <div className="w-32 px-2">
                                      <input 
                                        type="number" 
                                        className="w-full text-center border rounded py-1 font-bold text-blue-600 dark:bg-gray-700" 
                                        value={item.quantity}
                                        onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                                      />
                                  </div>
                                  <div className="w-32 px-2">
                                      <input 
                                        type="number" 
                                        className="w-full text-right border rounded py-1 dark:bg-gray-700" 
                                        value={item.cost}
                                        onChange={e => updateItem(idx, 'cost', parseFloat(e.target.value) || 0)}
                                      />
                                  </div>
                                  <div className="w-32 px-2">
                                      <input 
                                        type="number" 
                                        className="w-full text-right border rounded py-1 dark:bg-gray-700" 
                                        value={item.price}
                                        onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                                      />
                                  </div>
                                  <div className="w-32 px-2">
                                      <input 
                                        type="date" 
                                        className="w-full text-center border rounded py-1 text-xs dark:bg-gray-700" 
                                        value={item.expiryDate || ''}
                                        onChange={e => updateItem(idx, 'expiryDate', e.target.value)}
                                      />
                                  </div>
                                  <div className="w-32 text-right font-bold text-gray-900 dark:text-white">
                                      {formatCurrency(item.cost * item.quantity)}
                                  </div>
                                  <div className="w-16 text-center">
                                      <button onClick={() => setEntryItems(entryItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600 transition-colors">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))
                      )}
                  </div>

                  {/* Pesquisa Rápida */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 relative">
                      <div className="relative">
                          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                          <input 
                            ref={searchRef}
                            type="text"
                            placeholder="Digte o nome ou código do produto para adicionar..."
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
                          />
                          {showResults && searchQuery && (
                              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery)).map(p => (
                                      <button key={p.id} onClick={() => handleSelectProduct(p)} className="w-full text-left px-4 py-3 border-b hover:bg-blue-50 last:border-0 flex justify-between items-center">
                                          <div>
                                              <span className="font-bold text-sm block">{p.name}</span>
                                              {p.description && <span className="text-xs text-gray-500 dark:text-gray-400 block max-w-sm whitespace-normal">{p.description}</span>}
                                              <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                                          </div>
                                          <span className="text-xs font-bold text-gray-400">STOCK ATUAL: {p.stock}</span>
                                      </button>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>
              </div>

              {/* Action Bar */}
              <div className="bg-slate-900 text-white p-4 rounded-2xl flex justify-between items-center shadow-lg">
                  <div>
                      <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest">Investimento em Stock</p>
                      <div className="text-2xl font-bold">{formatCurrency(totalEntryValue)}</div>
                  </div>
                  <button 
                    onClick={handleFinalize}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-xl flex items-center gap-2"
                  >
                      <Save size={20} /> FINALIZAR ENTRADA
                  </button>
              </div>
          </div>
      ) : (
          /* --- ABA HISTÓRICO --- */
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-in fade-in duration-200">
              {/* Filtro do Histórico */}
              <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b flex justify-between items-center gap-4">
                  <div className="relative w-full max-w-md">
                      <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                      <input 
                        type="text"
                        placeholder="Pesquisar por fornecedor ou fatura..."
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        value={historySearch}
                        onChange={e => { setHistorySearch(e.target.value); setCurrentPage(1); }}
                      />
                  </div>
                  <div className="text-xs text-gray-500 font-bold uppercase flex items-center gap-2">
                    <Calendar size={14} /> Total de Registos: {filteredHistory.length}
                  </div>
              </div>

              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">Data / Hora</th>
                              <th className="px-6 py-4">Fornecedor</th>
                              <th className="px-6 py-4">Nº Factura</th>
                              <th className="px-6 py-4">Itens</th>
                              <th className="px-6 py-4 text-right">Valor Total</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-center">Acções</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y border-gray-100 dark:divide-gray-700">
                          {paginatedHistory.length === 0 ? (
                              <tr><td colSpan={7} className="py-20 text-center text-gray-400 italic">Nenhum registo de entrada encontrado.</td></tr>
                          ) : (
                              paginatedHistory.map(entry => (
                                  <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                      <td className="px-6 py-4 text-gray-500">
                                          {new Date(entry.date).toLocaleDateString()} {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-white">{entry.supplierName}</td>
                                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{entry.invoiceNo}</td>
                                      <td className="px-6 py-4 text-xs">{entry.items.length} itens</td>
                                      <td className="px-6 py-4 font-bold text-blue-600">{formatCurrency(entry.totalAmount)}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">CONFIRMADA</span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => setViewEntry(entry)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="Ver Detalhes"
                                          >
                                              <Eye size={18} />
                                          </button>
                                      </td>
                                  </tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>

              {/* Paginação do Histórico */}
              <div className="p-4 border-t bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center text-xs text-gray-500">
                  <span>Mostrando {paginatedHistory.length} de {filteredHistory.length} registos</span>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                      >
                          <ChevronLeft size={16} />
                      </button>
                      <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 border rounded-lg bg-white dark:bg-gray-800 disabled:opacity-50"
                      >
                          <ChevronRight size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Payment Modal for Expense */}
      <PaymentModal 
        isOpen={paymentModalOpen}
        onClose={() => {
            setPaymentModalOpen(false);
            resetForm();
            setActiveTab('HISTORY');
        }}
        totalAmount={expenseTotal}
        onConfirm={handlePaymentConfirm}
        config={config}
        title="Registar Pagamento de Compra"
      />

      {/* Modal de Detalhes da Entrada */}
      {viewEntry && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-lg">Detalhes da Entrada</h3>
                              <p className="text-xs text-gray-500">Documento: {viewEntry.invoiceNo}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewEntry(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase">Fornecedor</p>
                              <p className="font-medium">{viewEntry.supplierName}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-500 font-bold uppercase">Data do Registo</p>
                              <p className="font-medium">{new Date(viewEntry.date).toLocaleString()}</p>
                          </div>
                      </div>
                      <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 dark:bg-gray-900 font-bold border-y">
                              <tr>
                                  <th className="p-2">Produto</th>
                                  <th className="p-2 text-center">Qtd</th>
                                  <th className="p-2 text-right">Custo Unit.</th>
                                  <th className="p-2 text-center">Validade</th>
                                  <th className="p-2 text-right">Total</th>
                              </tr>
                          </thead>
                          <tbody>
                              {viewEntry.items.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                      <td className="p-2 font-medium">{item.productName}</td>
                                      <td className="p-2 text-center">{item.quantity}</td>
                                      <td className="p-2 text-right">{formatCurrency(item.cost)}</td>
                                      <td className="p-2 text-center text-xs">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString() : '-'}</td>
                                      <td className="p-2 text-right font-bold">{formatCurrency(item.cost * item.quantity)}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t flex justify-between items-center">
                      <div className="text-sm font-bold">Investimento Total: <span className="text-blue-600">{formatCurrency(viewEntry.totalAmount)}</span></div>
                      <button onClick={() => handlePrintEntry(viewEntry)} className="px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
                        <Printer size={14} /> IMPRIMIR GUIA
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WarehouseEntry;