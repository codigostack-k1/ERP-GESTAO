
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Save, 
  Trash2, 
  X, 
  Printer, 
  Briefcase, 
  Package,
  AlertCircle,
  CheckSquare,
  XSquare,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileDown
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, AppConfig, Requisition, Supplier, RequisitionItem, ToastType } from '../types';
import { generateRequisitionReportHtml, generateRequisitionDocumentA4 } from '../utils/receipt';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';
// Import jsPDF from window/importmap
import { jsPDF } from 'jspdf';

interface RequisitionProps {
  config: AppConfig;
}

const RequisitionPage: React.FC<RequisitionProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  // Global Data
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [requisitions, setRequisitions] = useState<Requisition[]>([]);
  
  // Input Refs for returning focus
  const productSelectRef = useRef<HTMLSelectElement>(null);
  const customItemInputRef = useRef<HTMLInputElement>(null);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [reqType, setReqType] = useState<'RESALE' | 'CONSUMPTION'>('RESALE');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Elastic Table Rule

  // Form State
  const [requester, setRequester] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [items, setItems] = useState<RequisitionItem[]>([]);
  
  // Item Input State
  const [selectedProduct, setSelectedProduct] = useState('');
  const [customItemName, setCustomItemName] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [estimatedCost, setEstimatedCost] = useState(0);

  // Approval Modal
  const [modalAction, setModalAction] = useState<'APPROVE' | 'REJECT' | 'BUY' | null>(null);
  const [selectedReq, setSelectedReq] = useState<Requisition | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // View Details Modal State
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewReq, setViewReq] = useState<Requisition | null>(null);

  const loadData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setSuppliers(StorageService.getSuppliers());
    setRequisitions(StorageService.getRequisitions().reverse()); // Newest first
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // --- Handlers: Form ---

  const addItem = () => {
      let newItem: RequisitionItem;

      if (reqType === 'RESALE') {
          if (!selectedProduct) {
              showToast('Selecione um produto.', ToastType.WARNING);
              return;
          }
          const prod = products.find(p => p.id === selectedProduct);
          if (!prod) return;
          newItem = {
              productId: prod.id,
              productName: prod.name,
              quantity: quantity,
              estimatedUnitCost: estimatedCost > 0 ? estimatedCost : prod.cost
          };
      } else {
          if (!customItemName) {
              showToast('Digite o nome do item.', ToastType.WARNING);
              return;
          }
          newItem = {
              productName: customItemName,
              quantity: quantity,
              estimatedUnitCost: estimatedCost
          };
      }

      setItems([...items, newItem]);
      
      // Reset Item Inputs
      setSelectedProduct('');
      setCustomItemName('');
      setQuantity(1);
      setEstimatedCost(0);
      setTimeout(() => {
          if (reqType === 'RESALE') {
              productSelectRef.current?.focus();
          } else {
              customItemInputRef.current?.focus();
          }
      }, 50);
  };

  const removeItem = (idx: number) => {
      setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
      if (!requester) {
          showToast('Informe o solicitante.', ToastType.WARNING);
          return;
      }
      if (items.length === 0) {
          showToast('Adicione itens à requisição.', ToastType.WARNING);
          return;
      }

      const totalEstimated = items.reduce((acc, i) => acc + (i.quantity * i.estimatedUnitCost), 0);

      const newReq: Requisition = {
          id: `REQ-${Date.now()}`,
          date: new Date().toISOString(),
          requester: requester,
          type: reqType,
          supplierId: selectedSupplier || undefined,
          items: items,
          totalEstimated: totalEstimated,
          status: 'PENDING'
      };

      StorageService.saveRequisition(newReq);
      
      // Reset Form
      setItems([]);
      setRequester('');
      setSelectedSupplier('');
      setActiveTab('list');
      loadData();
      showToast('Requisição criada com sucesso! Aguardando aprovação.', ToastType.SUCCESS);
  };

  // --- Handlers: Actions ---

  const handleActionClick = (req: Requisition, action: 'APPROVE' | 'REJECT' | 'BUY') => {
      setSelectedReq(req);
      setModalAction(action);
      setRejectReason('');
  };

  const handleView = (req: Requisition) => {
      setViewReq(req);
      setViewModalOpen(true);
  };

  const processAction = async () => {
      if (!selectedReq || !modalAction) return;

      try {
          if (modalAction === 'APPROVE') {
              StorageService.updateRequisitionStatus(selectedReq.id, 'APPROVED');
          } else if (modalAction === 'REJECT') {
              if (!rejectReason) {
                  showToast('Motivo é obrigatório.', ToastType.WARNING);
                  return;
              }
              StorageService.updateRequisitionStatus(selectedReq.id, 'REJECTED', rejectReason);
          } else if (modalAction === 'BUY') {
              const conf = await confirm('Deseja converter esta requisição em uma despesa "Contas a Pagar"?', {
                  title: 'Converter em Despesa',
                  type: 'info'
              });
              if (conf) {
                  const txId = StorageService.finalizeRequisitionPurchase(selectedReq.id);
                  showToast(`Requisição finalizada! Despesa gerada (ID: ${txId.slice(-6)}).`, ToastType.SUCCESS);
              } else {
                  return;
              }
          }
          
          loadData();
          setModalAction(null);
          setSelectedReq(null);
      } catch (e: unknown) {
          const error = e as Error;
          showToast(error.message, ToastType.ERROR);
      }
  };

  const handlePrintList = () => {
      const authorizedReqs = requisitions.filter(r => r.status === 'APPROVED');
      const html = generateRequisitionReportHtml(authorizedReqs, suppliers, config);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 2000);
  };

  // --- Single Document Print/Export ---
  
  const handlePrintSingle = (req: Requisition) => {
      const supplier = suppliers.find(s => s.id === req.supplierId);
      const html = generateRequisitionDocumentA4(req, supplier, config);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow?.document;
      if (doc) {
          doc.open();
          doc.write(html);
          doc.close();
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
      }
      setTimeout(() => document.body.removeChild(iframe), 2000);
  };

  const handleExportPDF = (req: Requisition) => {
      // Usando o método nativo de impressão para PDF do navegador para garantir fidelidade visual do template HTML
      // mas também podemos usar o jsPDF para satisfazer o requisito explicitamente se desejado.
      // Aqui usamos a técnica de imprimir o HTML que é muito mais robusta para layouts complexos.
      // Se realmente precisa ser jsPDF "puro", a lógica seria diferente, mas esta abordagem
      // usa o motor de renderização do browser que é superior.
      
      // No entanto, para satisfazer "Utiliza a biblioteca jsPDF", vamos implementar uma versão simples com jsPDF também.
      
      try {
          const doc = new jsPDF();
          doc.setFontSize(18);
          doc.text(config.companyName, 105, 20, { align: 'center' });
          doc.setFontSize(12);
          doc.text("FICHA DE REQUISIÇÃO DE COMPRA", 105, 30, { align: 'center' });
          
          doc.setFontSize(10);
          doc.text(`Requisição: #${req.id.slice(-8)}`, 20, 45);
          doc.text(`Data: ${new Date(req.date).toLocaleDateString()}`, 20, 50);
          doc.text(`Solicitante: ${req.requester}`, 20, 55);
          
          // Table Header
          let y = 70;
          doc.setFont('helvetica', 'bold');
          doc.text("Item", 20, y);
          doc.text("Qtd", 120, y);
          doc.text("Preço Est.", 150, y);
          doc.text("Total", 180, y);
          doc.line(20, y+2, 190, y+2);
          
          // Items
          doc.setFont('helvetica', 'normal');
          y += 10;
          req.items.forEach(item => {
              doc.text(item.productName, 20, y);
              doc.text(item.quantity.toString(), 120, y);
              doc.text(formatCurrency(item.estimatedUnitCost), 150, y);
              doc.text(formatCurrency(item.quantity * item.estimatedUnitCost), 180, y);
              y += 7;
          });
          
          // Total
          y += 5;
          doc.line(20, y, 190, y);
          y += 10;
          doc.setFont('helvetica', 'bold');
          doc.text(`TOTAL ESTIMADO: ${formatCurrency(req.totalEstimated)}`, 140, y);
          
          doc.save(`Requisicao_${req.id.slice(-6)}.pdf`);
      } catch (e) {
          console.error("Erro ao gerar PDF com jsPDF, tentando fallback...", e);
          handlePrintSingle(req); // Fallback to print dialog
      }
  };

  // --- Pagination ---
  const totalPages = Math.ceil(requisitions.length / itemsPerPage);
  const paginatedReqs = requisitions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
      
      {/* 1. Header */}
      <div className="flex justify-between items-start shrink-0">
          <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="text-blue-600" />
                  Requisições de Compra
              </h1>
              <p className="text-gray-500 text-sm">Gestão de aquisições de stock e material interno.</p>
          </div>
          <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
              <button 
                onClick={() => setActiveTab('create')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'create' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}
              >
                  Nova Solicitação
              </button>
              <button 
                onClick={() => setActiveTab('list')}
                className={`px-4 py-2 text-sm font-bold rounded-md transition-colors ${activeTab === 'list' ? 'bg-white dark:bg-gray-700 shadow text-blue-600 dark:text-blue-300' : 'text-gray-500'}`}
              >
                  Gerenciar Pedidos
              </button>
          </div>
      </div>

      {/* 2. Content */}
      <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-0">
          
          {/* --- CREATE TAB --- */}
          {activeTab === 'create' && (
              <div className="flex flex-col h-full">
                  <div className="p-6 border-b border-gray-100 dark:border-gray-700 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 dark:bg-gray-900/50">
                      {/* Left: General Info */}
                      <div className="space-y-4">
                          <div className="flex gap-4">
                              <button 
                                onClick={() => setReqType('RESALE')}
                                className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${reqType === 'RESALE' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                              >
                                  <Package size={18} /> Mercadoria (Revenda)
                              </button>
                              <button 
                                onClick={() => setReqType('CONSUMPTION')}
                                className={`flex-1 p-3 rounded-xl border-2 flex items-center justify-center gap-2 font-bold text-sm transition-all ${reqType === 'CONSUMPTION' ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300' : 'border-gray-200 dark:border-gray-700 text-gray-500'}`}
                              >
                                  <Briefcase size={18} /> Uso Interno
                              </button>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Solicitante</label>
                                  <input 
                                    className="w-full p-2.5 mt-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Seu nome"
                                    value={requester}
                                    onChange={e => setRequester(e.target.value)}
                                  />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Fornecedor Sugerido</label>
                                  <select 
                                    className="w-full p-2.5 mt-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                  >
                                      <option value="">Preferência (Opcional)</option>
                                      {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                  </select>
                              </div>
                          </div>
                      </div>

                      {/* Right: Add Items */}
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3">Adicionar Item</h3>
                          <div className="space-y-3">
                              {reqType === 'RESALE' ? (
                                  <select 
                                    ref={productSelectRef}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    value={selectedProduct}
                                    onChange={e => {
                                        setSelectedProduct(e.target.value);
                                        const p = products.find(prod => prod.id === e.target.value);
                                        if (p) setEstimatedCost(p.cost);
                                    }}
                                  >
                                      <option value="">Selecione o Produto...</option>
                                      {products.map(p => (
                                        <option key={p.id} value={p.id}>
                                          {p.name}{p.description ? ` - ${p.description}` : ''} (Stock: {p.stock})
                                        </option>
                                      ))}
                                  </select>
                              ) : (
                                  <input 
                                    ref={customItemInputRef}
                                    className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                    placeholder="Descrição do material (ex: Papel A4)"
                                    value={customItemName}
                                    onChange={e => setCustomItemName(e.target.value)}
                                  />
                              )}

                              <div className="flex gap-2">
                                  <div className="flex-1">
                                      <input 
                                        type="number" min="1" placeholder="Qtd"
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                        value={quantity}
                                        onChange={e => setQuantity(parseFloat(e.target.value))}
                                      />
                                  </div>
                                  <div className="flex-1">
                                      <input 
                                        type="number" step="0.01" placeholder="Custo Est. (MT)"
                                        className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
                                        value={estimatedCost || ''}
                                        onChange={e => setEstimatedCost(parseFloat(e.target.value))}
                                      />
                                  </div>
                                  <button 
                                    onClick={addItem}
                                    className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                                  >
                                      <Plus size={20} />
                                  </button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Items List */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-500 font-semibold sticky top-0">
                              <tr>
                                  <th className="px-6 py-3">Item</th>
                                  <th className="px-6 py-3 text-center">Quantidade</th>
                                  <th className="px-6 py-3 text-right">Custo Unit. Est.</th>
                                  <th className="px-6 py-3 text-right">Total</th>
                                  <th className="px-6 py-3 w-10"></th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {items.map((item, idx) => (
                                  <tr key={idx}>
                                      <td className="px-6 py-3">
                                         <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                                         {(() => {
                                           const p = products.find(prod => prod.id === item.productId);
                                           return p?.description ? <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{p.description}</div> : null;
                                         })()}
                                       </td>
                                      <td className="px-6 py-3 text-center">{item.quantity}</td>
                                      <td className="px-6 py-3 text-right text-gray-500">{formatCurrency(item.estimatedUnitCost)}</td>
                                      <td className="px-6 py-3 text-right font-bold">{formatCurrency(item.quantity * item.estimatedUnitCost)}</td>
                                      <td className="px-6 py-3 text-center">
                                          <button onClick={() => removeItem(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 size={16}/></button>
                                      </td>
                                  </tr>
                              ))}
                              {items.length === 0 && (
                                  <tr><td colSpan={5} className="text-center py-8 text-gray-400">Nenhum item adicionado.</td></tr>
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Footer Action */}
                  <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800">
                      <div className="text-right">
                          <p className="text-xs text-gray-500 uppercase">Total Estimado</p>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                              {formatCurrency(items.reduce((acc, i) => acc + (i.quantity * i.estimatedUnitCost), 0))}
                          </p>
                      </div>
                      <button 
                        onClick={handleSubmit}
                        className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-green-500/30"
                      >
                          <Save size={18} /> SUBMETER PEDIDO
                      </button>
                  </div>
              </div>
          )}

          {/* --- LIST/MANAGE TAB --- */}
          {activeTab === 'list' && (
              <div className="flex flex-col h-full">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <h3 className="font-bold text-gray-700 dark:text-gray-300">Histórico de Requisições</h3>
                      <button 
                        onClick={handlePrintList}
                        className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors border border-blue-200"
                      >
                          <Printer size={14} /> Imprimir Lista de Compras (Autorizadas)
                      </button>
                  </div>

                  <div className="flex-1 overflow-auto custom-scrollbar">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-100 dark:bg-gray-900 text-gray-500 font-semibold sticky top-0 z-10">
                              <tr>
                                  <th className="px-6 py-3">Data / ID</th>
                                  <th className="px-6 py-3">Tipo</th>
                                  <th className="px-6 py-3">Solicitante</th>
                                  <th className="px-6 py-3">Itens</th>
                                  <th className="px-6 py-3 text-right">Valor Est.</th>
                                  <th className="px-6 py-3 text-center">Status</th>
                                  <th className="px-6 py-3 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                              {paginatedReqs.length === 0 ? (
                                  <tr><td colSpan={7} className="text-center py-12 text-gray-400">Nenhuma requisição encontrada.</td></tr>
                              ) : (
                                  paginatedReqs.map(req => (
                                      <tr key={req.id} onDoubleClick={() => handleView(req)} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group">
                                          <td className="px-6 py-4">
                                              <span className="block font-bold text-gray-900 dark:text-white">#{req.id.slice(-6)}</span>
                                              <span className="text-xs text-gray-500">{new Date(req.date).toLocaleDateString()}</span>
                                          </td>
                                          <td className="px-6 py-4">
                                              {req.type === 'RESALE' ? (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold"><Package size={12}/> Stock</span>
                                              ) : (
                                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold"><Briefcase size={12}/> Interno</span>
                                              )}
                                          </td>
                                          <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{req.requester}</td>
                                          <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate" title={req.items.map(i => i.productName).join(', ')}>
                                              {req.items.length} itens: {req.items[0].productName} {req.items.length > 1 ? `e +${req.items.length - 1}` : ''}
                                          </td>
                                          <td className="px-6 py-4 text-right font-mono">{formatCurrency(req.totalEstimated)}</td>
                                          <td className="px-6 py-4 text-center">
                                              <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                                  req.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                                  req.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                  req.status === 'PURCHASED' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-red-100 text-red-800'
                                              }`}>
                                                  {req.status === 'PENDING' ? 'Pendente' : 
                                                   req.status === 'APPROVED' ? 'Autorizada' : 
                                                   req.status === 'PURCHASED' ? 'Comprada' : 'Recusada'}
                                              </span>
                                          </td>
                                          <td className="px-6 py-4 text-center">
                                              <div className="flex justify-center gap-2">
                                                  <button onClick={(e) => { e.stopPropagation(); handleView(req); }} className="text-gray-500 hover:text-blue-600 hover:bg-blue-50 p-1 rounded transition-colors" title="Visualizar Detalhes">
                                                      <Eye size={18}/>
                                                  </button>
                                                  {req.status === 'PENDING' && (
                                                      <>
                                                          <button onClick={(e) => { e.stopPropagation(); handleActionClick(req, 'APPROVE'); }} className="text-green-600 hover:bg-green-50 p-1 rounded" title="Aprovar"><CheckSquare size={18}/></button>
                                                          <button onClick={(e) => { e.stopPropagation(); handleActionClick(req, 'REJECT'); }} className="text-red-600 hover:bg-red-50 p-1 rounded" title="Recusar"><XSquare size={18}/></button>
                                                      </>
                                                  )}
                                                  {req.status === 'APPROVED' && (
                                                      <button onClick={(e) => { e.stopPropagation(); handleActionClick(req, 'BUY'); }} className="text-blue-600 hover:bg-blue-50 p-1 rounded flex items-center gap-1 text-xs font-bold" title="Marcar como Comprado">
                                                          <CreditCard size={14}/> Comprar
                                                      </button>
                                                  )}
                                                  {req.status === 'REJECTED' && (
                                                      <button onClick={(e) => { e.stopPropagation(); showToast(`Motivo: ${req.rejectionReason}`, ToastType.INFO); }} className="text-gray-400 hover:text-gray-600" title="Ver Motivo"><AlertCircle size={18}/></button>
                                                  )}
                                              </div>
                                          </td>
                                      </tr>
                                  ))
                              )}
                          </tbody>
                      </table>
                  </div>

                  {/* Pagination */}
                  <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center text-xs text-gray-500">
                      <span>Mostrando {paginatedReqs.length} de {requisitions.length} registos</span>
                      <div className="flex items-center gap-2">
                          <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="p-1.5 border rounded hover:bg-gray-200 disabled:opacity-50"><ChevronLeft size={14}/></button>
                          <span className="font-medium px-2 flex items-center">Pág. {currentPage} / {totalPages || 1}</span>
                          <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="p-1.5 border rounded hover:bg-gray-200 disabled:opacity-50"><ChevronRight size={14}/></button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- VIEW DETAILS MODAL --- */}
      {viewModalOpen && viewReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
                  {/* Modal Header */}
                  <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <div>
                              <div className="flex items-center gap-3">
                                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Requisição #{viewReq.id.slice(-6)}</h3>
                                  <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                                      viewReq.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                      viewReq.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                      viewReq.status === 'PURCHASED' ? 'bg-blue-100 text-blue-800' :
                                      'bg-red-100 text-red-800'
                                  }`}>
                                      {viewReq.status === 'PENDING' ? 'Pendente' : 
                                       viewReq.status === 'APPROVED' ? 'Autorizada' : 
                                       viewReq.status === 'PURCHASED' ? 'Comprada' : 'Recusada'}
                                  </span>
                              </div>
                          </div>
                      </div>
                      <button onClick={() => setViewModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 overflow-y-auto custom-scrollbar">
                      {/* General Info Grid */}
                      <div className="grid grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Solicitante</label>
                                  <p className="font-medium text-gray-900 dark:text-white">{viewReq.requester}</p>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Tipo</label>
                                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                                      {viewReq.type === 'RESALE' ? <Package size={14} className="text-blue-500"/> : <Briefcase size={14} className="text-orange-500"/>}
                                      {viewReq.type === 'RESALE' ? 'Mercadoria (Stock)' : 'Consumo Interno'}
                                  </p>
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Data Emissão</label>
                                  <p className="font-medium text-gray-900 dark:text-white">{new Date(viewReq.date).toLocaleString()}</p>
                              </div>
                          </div>
                          <div className="space-y-3">
                              <div>
                                  <label className="text-xs font-bold text-gray-500 uppercase">Fornecedor Sugerido</label>
                                  <p className="font-medium text-gray-900 dark:text-white">{suppliers.find(s => s.id === viewReq.supplierId)?.name || 'Não especificado'}</p>
                              </div>
                              {viewReq.rejectionReason && (
                                  <div className="p-2 bg-red-50 text-red-700 rounded border border-red-200 text-sm">
                                      <strong>Motivo Recusa:</strong> {viewReq.rejectionReason}
                                  </div>
                              )}
                              {viewReq.convertedTransactionId && (
                                  <div className="p-2 bg-blue-50 text-blue-700 rounded border border-blue-200 text-sm">
                                      <strong>Despesa Gerada:</strong> #{viewReq.convertedTransactionId.slice(-6)}
                                  </div>
                              )}
                          </div>
                      </div>

                      {/* Items Table */}
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3">Itens Solicitados</h4>
                      <table className="w-full text-sm text-left mb-4">
                          <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500">
                              <tr>
                                  <th className="py-2 px-3 rounded-l-lg">Produto / Descrição</th>
                                  <th className="py-2 px-3 text-center">Qtd</th>
                                  <th className="py-2 px-3 text-right">Unit. Est.</th>
                                  <th className="py-2 px-3 text-right rounded-r-lg">Total</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                              {viewReq.items.map((item, idx) => (
                                  <tr key={idx}>
                                      <td className="py-2 px-3 font-medium">{item.productName}</td>
                                      <td className="py-2 px-3 text-center">{item.quantity}</td>
                                      <td className="py-2 px-3 text-right">{formatCurrency(item.estimatedUnitCost)}</td>
                                      <td className="py-2 px-3 text-right font-bold">{formatCurrency(item.quantity * item.estimatedUnitCost)}</td>
                                  </tr>
                              ))}
                          </tbody>
                          <tfoot>
                              <tr>
                                  <td colSpan={3} className="py-3 px-3 text-right font-bold text-gray-500 uppercase">Total Estimado:</td>
                                  <td className="py-3 px-3 text-right font-bold text-lg text-blue-600 dark:text-blue-400">{formatCurrency(viewReq.totalEstimated)}</td>
                              </tr>
                          </tfoot>
                      </table>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end gap-3">
                      <button 
                        onClick={() => setViewModalOpen(false)}
                        className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors font-medium text-sm"
                      >
                          Fechar
                      </button>
                      <button 
                        onClick={() => handlePrintSingle(viewReq)}
                        className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg shadow-sm transition-colors font-bold text-sm flex items-center gap-2"
                      >
                          <Printer size={16} /> Imprimir A4
                      </button>
                      <button 
                        onClick={() => handleExportPDF(viewReq)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors font-bold text-sm flex items-center gap-2"
                      >
                          <FileDown size={16} /> Exportar PDF
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* --- ACTION MODAL --- */}
      {modalAction && selectedReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-xl shadow-xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                      <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                          <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                          <span className="text-lg font-black tracking-tighter">E</span>
                      </div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {modalAction === 'APPROVE' ? 'Aprovar Requisição' : modalAction === 'REJECT' ? 'Recusar Requisição' : 'Confirmar Compra'}
                      </h3>
                  </div>
                  
                  {modalAction === 'APPROVE' && <p className="text-sm text-gray-500 mb-4">Deseja autorizar a compra destes itens? Eles aparecerão na lista de compras.</p>}
                  
                  {modalAction === 'REJECT' && (
                      <div className="mb-4">
                          <label className="text-xs font-bold uppercase text-gray-500">Motivo da Recusa</label>
                          <textarea 
                            className="w-full p-2 border rounded mt-1 text-sm dark:bg-gray-700"
                            rows={3}
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="Ex: Orçamento excedido..."
                          />
                      </div>
                  )}

                  {modalAction === 'BUY' && (
                      <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
                          <p>Isso irá gerar uma transação de <strong>DESPESA (Pendente)</strong> na Tesouraria no valor de <strong>{formatCurrency(selectedReq.totalEstimated)}</strong>.</p>
                          <p className="mt-2 text-xs text-gray-400">Nota: O valor real pode ser ajustado no pagamento da fatura posteriormente.</p>
                      </div>
                  )}

                  <div className="flex justify-end gap-2">
                      <button onClick={() => setModalAction(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">Cancelar</button>
                      <button 
                        onClick={processAction}
                        className={`px-4 py-2 text-white rounded font-bold ${
                            modalAction === 'APPROVE' ? 'bg-green-600 hover:bg-green-700' :
                            modalAction === 'REJECT' ? 'bg-red-600 hover:bg-red-700' :
                            'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                          Confirmar
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default RequisitionPage;
