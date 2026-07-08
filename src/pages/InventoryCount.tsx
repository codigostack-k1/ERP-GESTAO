
import React, { useState, useEffect, useMemo } from 'react';
import { 
  ClipboardList, 
  Save, 
  Search, 
  CheckCircle, 
  Play, 
  Lock, 
  History, 
  Printer, 
  X,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  Eye,
  RotateCcw,
  Ban,
  RefreshCw,
  Loader
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, AppConfig, StockAudit, StockAuditItem, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface InventoryCountProps {
  config: AppConfig;
}

const InventoryCount: React.FC<InventoryCountProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  // Global Data
  const [products, setProducts] = useState<Product[]>([]);
  
  // View State
  const [viewMode, setViewMode] = useState<'EDITOR' | 'HISTORY'>('HISTORY');
  const [isSaving, setIsSaving] = useState(false); // Estado para bloquear botões durante processamento
  
  // Editor State
  const [currentAudit, setCurrentAudit] = useState<StockAudit | null>(null);
  const [auditItems, setAuditItems] = useState<StockAuditItem[]>([]); // Working copy for UI
  const [searchTerm, setSearchTerm] = useState('');
  
  // History State
  const [auditHistory, setAuditHistory] = useState<StockAudit[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPageHistory = 10;
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setProducts(StorageService.getProducts());
    setAuditHistory(StorageService.getAudits().sort((a: StockAudit, b: StockAudit) => new Date(b.dateCreated).getTime() - new Date(a.dateCreated).getTime()));
  };

  // --- ACTIONS: LIFECYCLE ---

  const handleStartNewAudit = async () => {
      if (currentAudit && currentAudit.status === 'DRAFT') {
          const conf = await confirm("Existe uma auditoria em rascunho. Deseja descartá-la e iniciar uma nova?", {
              title: 'Auditoria Existente',
              type: 'warning',
              confirmText: 'Descartar e Iniciar'
          });
          if (!conf) return;
      }

      const newItems: StockAuditItem[] = products.map((p: Product) => ({
          productId: p.id,
          productCode: p.code,
          productName: p.name,
          systemStock: p.stock,
          countedStock: null, // Starts empty
          salePrice: p.price,
          costPrice: p.cost
      }));

      const newAudit: StockAudit = {
          id: `AUD-${Date.now()}`,
          dateCreated: new Date().toISOString(),
          status: 'DRAFT',
          auditorName: 'Auditor Atual', // Mock user
          items: newItems,
          totalValueLoss: 0,
          totalValueSurplus: 0
      };

      setCurrentAudit(newAudit);
      setAuditItems(newItems);
      setViewMode('EDITOR');
      setSearchTerm('');
      setCurrentPage(1);
  };

  const handleViewAudit = (audit: StockAudit) => {
      setCurrentAudit(audit);
      setAuditItems(audit.items);
      setViewMode('EDITOR');
      setSearchTerm('');
      setCurrentPage(1);
  };

  const handleRedoAudit = async (audit: StockAudit) => {
      const conf = await confirm("Deseja refazer esta auditoria? Uma nova contagem será iniciada baseada nestes itens, atualizando o stock do sistema para os valores de hoje.", {
          title: 'Refazer Auditoria',
          type: 'info',
          confirmText: 'Sim, Iniciar'
      });
      if (!conf) return;

      // Refresh system stock snapshots
      const currentProducts = StorageService.getProducts();
      
      const newItems: StockAuditItem[] = audit.items.map((item: StockAuditItem) => {
          const freshProd = currentProducts.find((p: Product) => p.id === item.productId);
          return {
              ...item,
              systemStock: freshProd ? freshProd.stock : item.systemStock, // Update snapshot
              countedStock: item.countedStock // Keep count for ease of correction, or set null to force recount? Typically keep for correction.
          };
      });

      const newAudit: StockAudit = {
          id: `AUD-${Date.now()}`,
          dateCreated: new Date().toISOString(),
          status: 'DRAFT',
          auditorName: 'Auditor (Refazer)',
          items: newItems,
          totalValueLoss: 0, 
          totalValueSurplus: 0
      };

      // Recalculate based on new snapshot
      const { totalSurplus, totalLoss } = calculateTotals(newItems);
      newAudit.totalValueSurplus = totalSurplus;
      newAudit.totalValueLoss = totalLoss;

      StorageService.saveAudit(newAudit);
      setCurrentAudit(newAudit);
      setAuditItems(newItems);
      setViewMode('EDITOR');
      loadData();
  };

  // --- ACTIONS: FOOTER (LIFECYCLE) ---

  // Botão "Iniciar": Limpa os campos da auditoria atual
  const handleResetCurrentCount = async () => {
      const conf = await confirm("Deseja zerar a contagem atual para iniciar uma nova auditoria? Todos os valores digitados serão perdidos.", {
          title: 'Zerar Contagem',
          type: 'danger',
          confirmText: 'Sim, Zerar'
      });
      if (!conf) return;
      
      setAuditItems(prev => prev.map(item => ({
          ...item,
          countedStock: null // Reset to empty/null
      })));
  };

  // Botão "Salvar": Salva Rascunho sem finalizar
  const handleSaveDraft = () => {
      if (!currentAudit) return;
      
      setIsSaving(true);
      // Recalculate totals before saving
      const { totalSurplus, totalLoss } = calculateTotals(auditItems);
      
      const updatedAudit: StockAudit = {
          ...currentAudit,
          items: auditItems,
          totalValueSurplus: totalSurplus,
          totalValueLoss: totalLoss,
          dateFinalized: new Date().toISOString() // Last updated
      };

      StorageService.saveAudit(updatedAudit);
      setCurrentAudit(updatedAudit);
      loadData(); 
      setIsSaving(false);
      showToast("Rascunho salvo com sucesso! Pode continuar o trabalho mais tarde.", ToastType.INFO);
  };

  // Botão "Concluir": Finaliza e bloqueia
  const handleFinishAudit = async () => {
      console.log("Tentativa de conclusão de auditoria iniciada."); // Debug Log

      if (!currentAudit) return;
      
      // 1. Validação Final: Verificar se há dados
      const hasData = auditItems.some(i => i.countedStock !== null);
      if (!hasData) {
          showToast("Não é possível concluir uma auditoria sem dados. Por favor, insira a contagem de pelo menos um item.", ToastType.WARNING);
          return;
      }

      // 2. Confirmação
      const conf = await confirm("Deseja finalizar a contagem? A auditoria mudará para 'Aguardando Aprovação' e os campos serão bloqueados.", {
          title: 'Finalizar Contagem',
          type: 'warning',
          confirmText: 'Finalizar'
      });
      if (!conf) return;

      setIsSaving(true); // Bloqueio de UI

      try {
          // Simular pequeno delay para garantir feedback visual
          await new Promise(resolve => setTimeout(resolve, 300));

          const { totalSurplus, totalLoss } = calculateTotals(auditItems);

          // 3. Persistência e Mudança de Status
          const finalizedAudit: StockAudit = {
              ...currentAudit,
              items: auditItems,
              totalValueSurplus: totalSurplus,
              totalValueLoss: totalLoss,
              status: 'PENDING_APPROVAL', // Status alterado
              dateFinalized: new Date().toISOString()
          };

          StorageService.saveAudit(finalizedAudit);
          
          // 4. Fechamento e Refresh
          showToast("Auditoria concluída com sucesso! Aguarde a aprovação do gerente.", ToastType.SUCCESS);
          
          setCurrentAudit(null);
          setAuditItems([]);
          setViewMode('HISTORY');
          loadData();
      } catch (error) {
          console.error("Erro ao finalizar auditoria:", error);
          showToast("Ocorreu um erro ao salvar a auditoria. Tente novamente.", ToastType.ERROR);
      } finally {
          setIsSaving(false); // Desbloqueio de UI
      }
  };

  // --- ACTIONS: HEADER (MANAGEMENT) ---

  const handleApprove = async (audit: StockAudit) => {
      const conf = await confirm(`ATENÇÃO: Aprovar a auditoria #${audit.id.slice(-6)} irá atualizar o stock REAL de todos os itens divergentes. Confirma?`, {
          title: 'Aprovar Auditoria',
          type: 'danger',
          confirmText: 'Sim, Aprovar'
      });
      if (!conf) return;
      
      try {
          StorageService.approveAudit(audit.id, 'Gerente Geral');
          showToast("Auditoria aprovada e stock atualizado com sucesso!", ToastType.SUCCESS);
          if (viewMode === 'EDITOR') setViewMode('HISTORY');
          loadData();
      } catch (e: unknown) {
          const error = e as Error;
          showToast(error.message, ToastType.ERROR);
      }
  };

  const handleDiscard = async (audit: StockAudit) => {
      const conf = await confirm("Tem certeza que deseja descartar/cancelar esta auditoria?", {
          title: 'Cancelar Auditoria',
          type: 'danger',
          confirmText: 'Sim, Cancelar'
      });
      if (!conf) return;
      const updated = { ...audit, status: 'DISCARDED' as const };
      StorageService.saveAudit(updated);
      if (viewMode === 'EDITOR') setViewMode('HISTORY');
      loadData();
  };

  const handlePrint = (audit: StockAudit) => {
      DocumentGenerator.Armazem.gerarRelatorioAuditoria(audit, config);
  };

  // --- ACTIONS: EDITING ---

  const handleCountChange = (productId: string, value: string) => {
      const numValue = value === '' ? null : parseFloat(value);
      
      setAuditItems(prev => prev.map(item => {
          if (item.productId === productId) {
              return { ...item, countedStock: numValue };
          }
          return item;
      }));
  };

  const calculateTotals = (items: StockAuditItem[]) => {
      let totalSurplus = 0;
      let totalLoss = 0;

      items.forEach(item => {
          if (item.countedStock !== null) {
              const diff = item.countedStock - item.systemStock;
              const val = Math.abs(diff) * item.salePrice;
              if (diff > 0) totalSurplus += val;
              else if (diff < 0) totalLoss += val;
          }
      });

      return { totalSurplus, totalLoss };
  };

  // --- RENDERING HELPERS ---

  const formatMoney = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);

  // Filter & Pagination for Editor
  const filteredEditorItems = useMemo(() => {
      return auditItems.filter(i => 
          i.productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
          i.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [auditItems, searchTerm]);

  const totalEditorPages = Math.ceil(filteredEditorItems.length / itemsPerPage);
  const paginatedEditorItems = filteredEditorItems.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalHistoryPages = Math.max(1, Math.ceil(auditHistory.length / itemsPerPageHistory));
  const paginatedAuditHistory = auditHistory.slice((historyPage - 1) * itemsPerPageHistory, historyPage * itemsPerPageHistory);

  const currentTotals = useMemo(() => calculateTotals(auditItems), [auditItems]);

  const isReadOnly = currentAudit?.status !== 'DRAFT';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
      
      {/* 1. Header Area */}
      <div className="flex justify-between items-end shrink-0 pb-2 border-b border-gray-100 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Auditoria de Stock
          </h1>
          <p className="text-gray-500 text-sm">Contagem física, apuramento de quebras/sobras e aprovação.</p>
        </div>

        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('HISTORY')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${
                    viewMode === 'HISTORY' 
                    ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-white' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={isSaving}
            >
                <History size={16} /> Consultar Auditorias
            </button>
            <button 
                onClick={() => {
                    if (currentAudit) setViewMode('EDITOR'); 
                    else handleStartNewAudit();
                }}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors flex items-center gap-2 ${
                    viewMode === 'EDITOR' 
                    ? 'bg-blue-600 text-white shadow' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                disabled={isSaving}
            >
                <Play size={16} /> {currentAudit ? (isReadOnly ? 'Detalhes Auditoria' : 'Continuar Auditoria') : 'Auditar (Nova)'}
            </button>
        </div>
      </div>

      {/* 2. Content Area */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-0 relative">
          
          {/* Loading Overlay */}
          {isSaving && (
              <div className="absolute inset-0 z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                      <Loader className="animate-spin text-blue-600" size={32} />
                      <span className="font-bold text-blue-600 dark:text-blue-400">Processando...</span>
                  </div>
              </div>
          )}

          {/* --- VIEW: HISTORY --- */}
          {viewMode === 'HISTORY' && (
              <div className="flex flex-col h-full">
                  <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-bold text-gray-700 dark:text-gray-300">Histórico de Processos</h3>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-500 font-semibold sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3">ID / Data</th>
                                  <th className="px-6 py-3">Responsável</th>
                                  <th className="px-6 py-3 text-center">Itens Auditados</th>
                                  <th className="px-6 py-3 text-right">Sobras (+)</th>
                                  <th className="px-6 py-3 text-right">Quebras (-)</th>
                                  <th className="px-6 py-3 text-center">Estado</th>
                                  <th className="px-6 py-3 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {auditHistory.length === 0 ? (
                                  <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400">Nenhuma auditoria registrada.</td></tr>
                              ) : (
                                  paginatedAuditHistory.map((audit: StockAudit) => (
                                      <tr key={audit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                          <td className="px-6 py-4">
                                              <span className="block font-bold text-gray-900 dark:text-white">#{audit.id.slice(-6)}</span>
                                              <span className="text-xs text-gray-500">{new Date(audit.dateCreated).toLocaleDateString()}</span>
                                          </td>
                                          <td className="px-6 py-4 text-gray-600 dark:text-gray-300">{audit.auditorName}</td>
                                          <td className="px-6 py-4 text-center">{audit.items.filter(i => i.countedStock !== null).length} / {audit.items.length}</td>
                                          <td className="px-6 py-4 text-right font-medium text-green-600">{formatMoney(audit.totalValueSurplus)}</td>
                                          <td className="px-6 py-4 text-right font-medium text-red-600">{formatMoney(audit.totalValueLoss)}</td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                  audit.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                  audit.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                                                  audit.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                                                  'bg-red-100 text-red-800'
                                              }`}>
                                                  {audit.status === 'APPROVED' ? 'Aprovada' :
                                                   audit.status === 'PENDING_APPROVAL' ? 'Aguardando' :
                                                   audit.status === 'DRAFT' ? 'Rascunho' : 'Descartada'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex justify-center gap-2">
                                                  {/* Common Actions */}
                                                  <button onClick={() => handleViewAudit(audit)} className="text-gray-500 hover:bg-gray-100 p-1.5 rounded" title="Visualizar Detalhes"><Eye size={16}/></button>
                                                  <button onClick={() => handlePrint(audit)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Imprimir Relatório"><Printer size={16}/></button>
                                                  
                                                  {/* Draft Actions */}
                                                  {audit.status === 'DRAFT' && (
                                                      <button onClick={() => handleViewAudit(audit)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded" title="Continuar Edição"><Play size={16}/></button>
                                                  )}
                                                  
                                                  {/* Pending Actions */}
                                                  {audit.status === 'PENDING_APPROVAL' && (
                                                      <>
                                                          <button onClick={() => handleApprove(audit)} className="text-green-600 hover:bg-green-50 p-1.5 rounded" title="Aprovar e Atualizar Stock"><FileCheck size={16}/></button>
                                                          <button onClick={() => handleDiscard(audit)} className="text-red-600 hover:bg-red-50 p-1.5 rounded" title="Rejeitar"><X size={16}/></button>
                                                      </>
                                                  )}

                                                  {/* Completed Actions */}
                                                  {(audit.status === 'APPROVED' || audit.status === 'DISCARDED') && (
                                                      <button onClick={() => handleRedoAudit(audit)} className="text-orange-600 hover:bg-orange-50 p-1.5 rounded" title="Refazer (Nova contagem baseada nesta)"><RotateCcw size={16}/></button>
                                                  )}
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Pagination controls for History list */}
                  {auditHistory.length > 0 && (
                      <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-650 dark:text-gray-400">
                          <span className="font-medium">Mostrando {paginatedAuditHistory.length} de {auditHistory.length} auditorias</span>
                          <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setHistoryPage(p => Math.max(1, p - 1))} 
                                disabled={historyPage === 1} 
                                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                  <ChevronLeft size={16}/>
                              </button>
                              <span className="font-medium px-2">Pág. {historyPage} / {totalHistoryPages || 1}</span>
                              <button 
                                onClick={() => setHistoryPage(p => Math.min(totalHistoryPages, p + 1))} 
                                disabled={historyPage === totalHistoryPages} 
                                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                              >
                                  <ChevronRight size={16}/>
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}

          {/* --- VIEW: EDITOR (READ/WRITE BASED ON STATUS) --- */}
          {viewMode === 'EDITOR' && currentAudit && (
              <div className="flex flex-col h-full">
                  {/* Editor Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                      <div className="flex items-center gap-4 w-1/3">
                          <div className="relative w-full">
                              <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                              <input 
                                  type="text" 
                                  placeholder="Filtrar por nome ou código..." 
                                  className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                  value={searchTerm}
                                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                              />
                          </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                          {isReadOnly && (
                              <div className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
                                  <Lock size={12} /> MODO DE LEITURA ({currentAudit.status})
                              </div>
                          )}
                          <div className="text-right flex gap-4 text-xs font-bold uppercase text-gray-500">
                              <div>
                                  <span className="block text-[10px]">Sobras (Est.)</span>
                                  <span className="text-lg text-green-600">{formatMoney(currentTotals.totalSurplus)} MT</span>
                              </div>
                              <div>
                                  <span className="block text-[10px]">Quebras (Est.)</span>
                                  <span className="text-lg text-red-600">{formatMoney(currentTotals.totalLoss)} MT</span>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Elastic Table Body */}
                  <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-500 font-semibold sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3">Item</th>
                                  <th className="px-6 py-3">Preço Venda</th>
                                  <th className="px-6 py-3 text-center bg-gray-200 dark:bg-gray-800">Qtd. Sistema</th>
                                  <th className="px-6 py-3 text-center bg-blue-50 dark:bg-blue-900/20 border-x border-blue-100 dark:border-blue-900 w-32">Qtd. Existente</th>
                                  <th className="px-6 py-3 text-center">Diferença (+/-)</th>
                                  <th className="px-6 py-3 text-right">Valor Impacto</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {paginatedEditorItems.map((item: StockAuditItem) => {
                                  const count = item.countedStock !== null ? item.countedStock : '';
                                  const diff = item.countedStock !== null ? item.countedStock - item.systemStock : 0;
                                  const impact = Math.abs(diff) * item.salePrice;
                                  const isSurplus = diff > 0;
                                  const isLoss = diff < 0;

                                  return (
                                      <tr key={item.productId} className={`transition-colors ${
                                          isLoss ? 'bg-red-50/50 dark:bg-red-900/10' : 
                                          isSurplus ? 'bg-green-50/50 dark:bg-green-900/10' : 
                                          'hover:bg-gray-50 dark:hover:bg-gray-700/30'
                                      }`}>
                                          <td className="px-6 py-3">
                                              <span className="block font-bold text-gray-900 dark:text-white text-xs">{item.productName}</span>
                                               {(() => {
                                                   const prod = products.find(p => p.id === item.productId);
                                                   return prod?.description ? <span className="block text-[10px] text-gray-500 mt-0.5">{prod.description}</span> : null;
                                               })()}
                                              <span className="text-[10px] text-gray-500 font-mono">{item.productCode}</span>
                                          </td>
                                          <td className="px-6 py-3 text-gray-600 dark:text-gray-300">{formatMoney(item.salePrice)}</td>
                                          <td className="px-6 py-3 text-center font-mono bg-gray-50 dark:bg-gray-800/50">{item.systemStock}</td>
                                          <td className="px-4 py-2 text-center bg-blue-50/50 dark:bg-blue-900/10 border-x border-blue-100 dark:border-blue-900/30">
                                              <input 
                                                  type="number" 
                                                  disabled={isReadOnly}
                                                  className={`w-20 text-center font-bold bg-white dark:bg-gray-700 border rounded py-1 px-1 focus:ring-2 focus:ring-blue-500 outline-none ${isReadOnly ? 'cursor-not-allowed opacity-70 text-gray-600 border-gray-200' : 'text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}
                                                  value={count}
                                                  placeholder={isReadOnly ? '-' : ''}
                                                  onChange={(e) => handleCountChange(item.productId, e.target.value)}
                                              />
                                          </td>
                                          <td className="px-6 py-3 text-center font-bold">
                                              {item.countedStock !== null && diff !== 0 ? (
                                                  <span className={isSurplus ? 'text-green-600' : 'text-red-600'}>
                                                      {isSurplus ? '+' : ''}{diff}
                                                  </span>
                                              ) : (
                                                  <span className="text-gray-300">-</span>
                                              )}
                                          </td>
                                          <td className="px-6 py-3 text-right font-medium">
                                              {item.countedStock !== null && diff !== 0 ? (
                                                  <span className={isSurplus ? 'text-green-600' : 'text-red-600'}>
                                                      {formatMoney(impact)}
                                                  </span>
                                              ) : (
                                                  <span className="text-gray-300">-</span>
                                              )}
                                          </td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>

                  {/* Editor Footer / Pagination */}
                  <div className="flex justify-between items-center p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 text-xs text-gray-500">
                        <div className="font-medium">
                            Mostrando {paginatedEditorItems.length} de {filteredEditorItems.length} registos
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage((p: number) => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-1.5 rounded bg-white dark:bg-gray-800 border disabled:opacity-50"
                            >
                                <ChevronLeft size={14} />
                            </button>
                            <span className="font-medium px-2">Pág. {currentPage} / {totalEditorPages || 1}</span>
                            <button 
                                onClick={() => setCurrentPage((p: number) => Math.min(totalEditorPages, p + 1))}
                                disabled={currentPage === totalEditorPages}
                                className="p-1.5 rounded bg-white dark:bg-gray-800 border disabled:opacity-50"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                  </div>

                  {/* Dynamic Action Bar */}
                  <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-2">
                            <button onClick={() => setViewMode('HISTORY')} className="text-gray-500 hover:text-gray-700 text-sm font-medium">
                                <ChevronLeft size={16} className="inline mr-1"/> Voltar
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            {/* CASE: DRAFT - Show Lifecycle Buttons */}
                            {!isReadOnly && (
                                <>
                                    <button 
                                        onClick={handleResetCurrentCount} 
                                        disabled={isSaving}
                                        className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <RefreshCw size={18} /> Iniciar (Zerar)
                                    </button>
                                    <button 
                                        onClick={handleSaveDraft} 
                                        disabled={isSaving}
                                        className="px-6 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={18} /> Salvar
                                    </button>
                                    <button 
                                        onClick={handleFinishAudit} 
                                        disabled={isSaving}
                                        className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-500/30 flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <CheckCircle size={18} /> Concluir
                                    </button>
                                </>
                            )}

                            {/* CASE: PENDING - Show Approval Buttons */}
                            {currentAudit.status === 'PENDING_APPROVAL' && (
                                <>
                                    <button onClick={() => handleDiscard(currentAudit)} className="px-6 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold flex items-center gap-2">
                                        <Ban size={18} /> Rejeitar/Descartar
                                    </button>
                                    <button onClick={() => handleApprove(currentAudit)} className="px-8 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-500/30 flex items-center gap-2">
                                        <FileCheck size={18} /> APROVAR MUDANÇAS
                                    </button>
                                </>
                            )}

                            {/* CASE: FINALIZED - Show Utils */}
                            {(currentAudit.status === 'APPROVED' || currentAudit.status === 'DISCARDED') && (
                                <>
                                    <button onClick={() => handlePrint(currentAudit)} className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold flex items-center gap-2">
                                        <Printer size={18} /> Imprimir
                                    </button>
                                    <button onClick={() => handleRedoAudit(currentAudit)} className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-lg shadow-orange-500/30 flex items-center gap-2">
                                        <RotateCcw size={18} /> Refazer Auditoria
                                    </button>
                                </>
                            )}
                        </div>
                  </div>
              </div>
          )}

      </div>
    </div>
  );
};

export default InventoryCount;
