
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MinusCircle, Save, Search, Trash2, History, Plus, Eye, ChevronLeft, ChevronRight, Package, Printer, X } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { DocumentGenerator } from '../services/documentGenerators';
import { Product, AppConfig, StockExit, StockExitItem } from '../types';
import { useToast, ToastType } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface WarehouseExitProps {
  config: AppConfig;
}

const WarehouseExit: React.FC<WarehouseExitProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  // Global Data
  const [products, setProducts] = useState<Product[]>([]);
  const [history, setHistory] = useState<StockExit[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'NEW' | 'HISTORY'>('NEW');
  const [currentPage, setCurrentPage] = useState(1);
  const [viewExit, setViewExit] = useState<StockExit | null>(null);
  const itemsPerPage = 12;

  // New Exit Form State
  const [globalReason, setGlobalReason] = useState('Quebra / Dano');
  const [notes, setNotes] = useState('');
  const [exitItems, setExitItems] = useState<Omit<StockExitItem, 'cost'>[]>([]);
  
  // Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setHistory(StorageService.getStockExits().sort((a: StockExit, b: StockExit) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // --- Calculations ---
  const totalLossValue = useMemo(() => {
      return exitItems.reduce((acc, item) => {
          const product = products.find(p => p.id === item.productId);
          return acc + ((product?.cost || 0) * item.quantity);
      }, 0);
  }, [exitItems, products]);

  // --- Handlers: New Exit ---

  const handleSelectProduct = (product: Product) => {
      if (product.stock <= 0) {
          showToast('Produto sem stock disponível.', ToastType.WARNING);
          return;
      }
      if (exitItems.find(i => i.productId === product.id)) {
          showToast('Este item já está na lista.', ToastType.WARNING);
          return;
      }

      setExitItems(prev => [...prev, {
          productId: product.id,
          productCode: product.code,
          productName: product.name,
          quantity: 1,
          reason: globalReason
      }]);
      setSearchQuery('');
      setShowResults(false);
      setTimeout(() => {
          searchRef.current?.focus();
      }, 50);
  };

  const updateItemQuantity = (index: number, qty: number) => {
      const item = exitItems[index];
      const product = products.find(p => p.id === item.productId);
      if (!product) return;

      const safeQty = Math.max(1, Math.min(qty, product.stock));
      setExitItems(prev => prev.map((it, i) => i === index ? { ...it, quantity: safeQty } : it));
  };

  const handleFinalize = async () => {
      if (exitItems.length === 0) {
          showToast('Adicione produtos para saída.', ToastType.WARNING);
          return;
      }
      const conf = await confirm(`Confirma o abate de ${exitItems.length} itens do stock?`, {
          title: 'Confirmar Abate de Stock',
          type: 'warning'
      });
      if (!conf) return;

      const itemsWithCost: StockExitItem[] = exitItems.map(item => ({
          ...item,
          cost: products.find(p => p.id === item.productId)?.cost || 0
      }));

      const newExit: StockExit = {
          id: `EXIT-${Date.now()}`,
          date: new Date().toISOString(),
          items: itemsWithCost,
          totalLossValue: totalLossValue,
          status: 'ACTIVE',
          notes: notes,
          registeredBy: 'Admin'
      };

      StorageService.saveStockExit(newExit);
      showToast('Saída processada com sucesso! A perda financeira foi registada automaticamente na tesouraria.', ToastType.SUCCESS);
      
      // Reset
      setExitItems([]);
      setNotes('');
      loadData();
      setActiveTab('HISTORY');
  };

  // --- Pagination Logic ---
  const totalPages = Math.ceil(history.length / itemsPerPage);
  const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrintExit = (exit: StockExit) => {
    DocumentGenerator.Armazem.gerarGuiaSaida(exit, config);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 font-sans">
      
      {/* Header com Abas */}
      <div className="flex justify-between items-end pb-2 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wide flex items-center gap-2">
                  <MinusCircle className="text-red-600" />
                  Saída de Mercadoria
              </h1>
              <p className="text-xs text-gray-500 font-medium mt-1">ABATE DE QUEBRAS, PERDAS OU CONSUMO INTERNO</p>
          </div>
          
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('NEW')}
                className={`px-6 py-2 text-sm font-bold rounded-md transition-all flex items-center gap-2 ${activeTab === 'NEW' ? 'bg-white dark:bg-gray-700 shadow text-red-600' : 'text-gray-500'}`}
              >
                  <Plus size={16} /> NOVA SAÍDA
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
              {/* Opções Globais */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                      <label className="text-xs font-bold text-red-700 uppercase mb-2 block">Motivo do Abate</label>
                      <select 
                        className="w-full p-2.5 border rounded-lg dark:bg-gray-700"
                        value={globalReason}
                        onChange={e => setGlobalReason(e.target.value)}
                      >
                          <option value="Quebra / Dano">Quebra / Dano</option>
                          <option value="Fora de Prazo">Fora de Prazo</option>
                          <option value="Uso Interno">Uso Interno</option>
                          <option value="Oferta">Oferta / Amostra</option>
                      </select>
                  </div>
                  <div className="flex-[2]">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Observações (Opcional)</label>
                      <input 
                        type="text"
                        className="w-full p-2.5 border rounded-lg dark:bg-gray-700"
                        placeholder="Detalhes adicionais sobre a saída..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                      />
                  </div>
              </div>

              {/* Tabela de Itens Seleccionados */}
              <div className="flex-1 bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden flex flex-col min-h-0">
                  <div className="bg-gray-50 dark:bg-gray-900/50 border-b px-6 py-3 flex text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <div className="flex-1">Produto</div>
                      <div className="w-32 text-center">Stock Atual</div>
                      <div className="w-32 text-center">Qtd. Abate</div>
                      <div className="w-32 text-right">Valor Perda</div>
                      <div className="w-16 text-center">Ação</div>
                  </div>

                  <div className="flex-1 overflow-y-auto custom-scrollbar">
                      {exitItems.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
                              <Package size={48} />
                              <p className="mt-2 text-sm">Adicione produtos à lista de abate</p>
                          </div>
                      ) : (
                          exitItems.map((item, idx) => {
                              const product = products.find(p => p.id === item.productId);
                              return (
                                  <div key={idx} className="flex items-center px-6 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-red-50/30">
                                      <div className="flex-1">
                                          <p className="font-bold text-gray-900 dark:text-white text-sm">{item.productName}</p>
                                           {product?.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{product.description}</p>}
                                          <p className="text-xs text-gray-500 font-mono">{item.productCode}</p>
                                      </div>
                                      <div className="w-32 text-center text-sm font-medium">{product?.stock || 0}</div>
                                      <div className="w-32 px-2">
                                          <input 
                                            type="number" 
                                            className="w-full text-center border rounded py-1 font-bold text-red-600" 
                                            value={item.quantity}
                                            onChange={e => updateItemQuantity(idx, parseInt(e.target.value) || 0)}
                                          />
                                      </div>
                                      <div className="w-32 text-right font-bold text-red-600">
                                          {formatCurrency((product?.cost || 0) * item.quantity)}
                                      </div>
                                      <div className="w-16 text-center">
                                          <button onClick={() => setExitItems(exitItems.filter((_, i) => i !== idx))} className="text-gray-400 hover:text-red-600 transition-colors">
                                              <Trash2 size={16} />
                                          </button>
                                      </div>
                                  </div>
                              );
                          })
                      )}
                  </div>

                  {/* Pesquisa Rápida (Footer da Tabela) */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 relative">
                      <div className="relative">
                          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                          <input 
                            ref={searchRef}
                            type="text"
                            placeholder="Digte o nome ou código do produto para abater..."
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border rounded-xl outline-none focus:ring-2 focus:ring-red-500"
                            value={searchQuery}
                            onChange={e => { setSearchQuery(e.target.value); setShowResults(true); }}
                          />
                          {showResults && searchQuery && (
                              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border rounded-xl shadow-2xl max-h-60 overflow-y-auto z-50">
                                  {products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.includes(searchQuery)).map(p => (
                                      <button key={p.id} onClick={() => handleSelectProduct(p)} className="w-full text-left px-4 py-3 border-b hover:bg-red-50 last:border-0 flex justify-between items-center">
                                          <div>
                                              <span className="font-bold text-sm block">{p.name}</span>
                                              {p.description && <span className="text-xs text-gray-500 dark:text-gray-400 block max-w-sm whitespace-normal">{p.description}</span>}
                                              <span className="text-xs text-gray-400 font-mono">{p.code}</span>
                                          </div>
                                          <span className="text-xs font-bold text-gray-400">STOCK: {p.stock}</span>
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
                      <p className="text-red-400 text-[10px] font-bold uppercase tracking-widest">Valor de Perda Acumulado</p>
                      <div className="text-2xl font-bold">{formatCurrency(totalLossValue)}</div>
                  </div>
                  <button 
                    onClick={handleFinalize}
                    className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold transition-all transform active:scale-95 shadow-xl shadow-red-900/40 flex items-center gap-2"
                  >
                      <Save size={20} /> FINALIZAR ABATE
                  </button>
              </div>
          </div>
      ) : (
          /* --- ABA HISTÓRICO --- */
          <div className="flex-1 flex flex-col bg-white dark:bg-gray-800 rounded-2xl border overflow-hidden animate-in fade-in duration-200">
              <div className="flex-1 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                      <thead className="bg-gray-50 dark:bg-gray-900 border-b sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">Data / Hora</th>
                              <th className="px-6 py-4">ID Operação</th>
                              <th className="px-6 py-4">Itens</th>
                              <th className="px-6 py-4">Valor Total Perda</th>
                              <th className="px-6 py-4 text-center">Estado</th>
                              <th className="px-6 py-4 text-center">Acções</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y border-gray-100 dark:border-gray-700">
                          {paginatedHistory.length === 0 ? (
                              <tr><td colSpan={6} className="py-20 text-center text-gray-400">Nenhum abate registado no sistema.</td></tr>
                          ) : (
                              paginatedHistory.map(exit => (
                                  <tr key={exit.id} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-6 py-4 text-gray-500">
                                          {new Date(exit.date).toLocaleDateString()} {new Date(exit.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </td>
                                      <td className="px-6 py-4 font-mono text-xs font-bold text-gray-400">#{exit.id.slice(-8)}</td>
                                      <td className="px-6 py-4">
                                          <div className="flex items-center gap-2">
                                              <span className="font-bold text-gray-900 dark:text-white">{exit.items.length} itens</span>
                                              <span className="text-xs text-gray-400 italic">({exit.items[0].reason})</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(exit.totalLossValue)}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full border border-green-200">CONFIRMADO</span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => setViewExit(exit)}
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
                  <span>Mostrando {paginatedHistory.length} de {history.length} registos</span>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setCurrentPage(p => Math.max(1, p-1))}
                        disabled={currentPage === 1}
                        className="p-1.5 border rounded-lg bg-white disabled:opacity-50"
                      >
                          <ChevronLeft size={16} />
                      </button>
                      <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                      <button 
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                        className="p-1.5 border rounded-lg bg-white disabled:opacity-50"
                      >
                          <ChevronRight size={16} />
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal de Detalhes da Saída */}
      {viewExit && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
                  <div className="p-6 border-b flex justify-between items-center bg-gray-50 dark:bg-gray-900">
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-lg">Detalhes do Abate</h3>
                              <p className="text-xs text-gray-500">Documento: #{viewExit.id.slice(-8).toUpperCase()}</p>
                          </div>
                      </div>
                      <button onClick={() => setViewExit(null)} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={24} /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6">
                      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                          <div>
                              <p className="text-xs text-gray-500 font-bold uppercase">Motivo Global</p>
                              <p className="font-medium">{viewExit.items[0]?.reason || 'N/A'}</p>
                          </div>
                          <div className="text-right">
                              <p className="text-xs text-gray-500 font-bold uppercase">Data do Registo</p>
                              <p className="font-medium">{new Date(viewExit.date).toLocaleString()}</p>
                          </div>
                      </div>
                      <table className="w-full text-xs text-left">
                          <thead className="bg-gray-50 dark:bg-gray-900 font-bold border-y">
                              <tr>
                                  <th className="p-2">Produto</th>
                                  <th className="p-2 text-center">Qtd</th>
                                  <th className="p-2">Motivo Específico</th>
                              </tr>
                          </thead>
                          <tbody>
                              {viewExit.items.map((item, idx) => (
                                  <tr key={idx} className="border-b">
                                      <td className="p-2 font-medium">{item.productName}</td>
                                      <td className="p-2 text-center">{item.quantity}</td>
                                      <td className="p-2 text-gray-600">{item.reason}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                      {viewExit.notes && (
                          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm">
                              <p className="text-xs text-gray-500 font-bold uppercase mb-1">Observações</p>
                              <p>{viewExit.notes}</p>
                          </div>
                      )}
                  </div>
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t flex justify-between items-center">
                      <div className="text-sm font-bold">Valor Total da Perda: <span className="text-red-600">{formatCurrency(viewExit.totalLossValue)}</span></div>
                      <button onClick={() => handlePrintExit(viewExit)} className="px-4 py-2 bg-white dark:bg-gray-700 border rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-gray-100 transition-colors">
                        <Printer size={14} /> IMPRIMIR GUIA
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WarehouseExit;
