
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { 
  Search, 
  FileText, 
  Trash2, 
  CheckCircle, 
  Clock, 
  Printer, 
  CreditCard, 
  Wallet,
  User,
  X,
  Plus,
  History,
  Ban,
  ChevronLeft,
  ChevronRight,
  Lock,
  ArrowRight,
  Eye,
  Menu
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, Customer, CartItem, Sale, AppConfig, User as UserType, PaymentDetail, ToastType, UserRole } from '../types';
import PaymentModal from '../components/PaymentModal';
import { PDFService } from '../services/pdfService';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface InvoicingProps {
  config: AppConfig;
  currentUser?: UserType | null;
}

const Invoicing: React.FC<InvoicingProps> = ({ config, currentUser }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  
  // --- Gatekeeper State ---
  const [isCashOpen, setIsCashOpen] = useState(false);

  // --- New Invoice States ---
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // --- Payment Modal States ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState('');

  // --- Preview State ---
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [saleToPreview, setSaleToPreview] = useState<Sale | null>(null);

  // --- History Filters ---
  const [historySearch, setHistorySearch] = useState('');
  const [historyStartDate, setHistoryStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [historyEndDate, setHistoryEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });
  const [historyPage, setHistoryPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    const session = StorageService.getActiveCashSession(currentUser?.id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCashOpen(!!session);
    setCustomers(StorageService.getCustomers());
    setProducts(StorageService.getProducts());
    setSales(StorageService.getSales());
  }, [currentUser?.id]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
  [customers, selectedCustomerId]);

  useEffect(() => {
    // Auto-compensation logic for customers with both credit and debt
    if (selectedCustomer && selectedCustomer.creditBalance > 0 && selectedCustomer.debt > 0) {
      const compensationAmount = Math.min(selectedCustomer.creditBalance, selectedCustomer.debt);
      if (compensationAmount > 0) {
        StorageService.compensateCustomerBalance(selectedCustomer.id, compensationAmount);
        // Use a small delay to avoid cascading render warning
        const timer = setTimeout(() => {
          setCustomers(StorageService.getCustomers());
        }, 0);
        return () => clearTimeout(timer);
      }
    }
  }, [selectedCustomer]);

  const customerInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales.filter(s => s.customerId === selectedCustomerId)
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, selectedCustomerId]);

  const { cartTotal, cartIVA } = useMemo(() => {
    let total = 0;
    let iva = 0;
    const rate = config.ivaEnabled ? (config.ivaRate || 0) : 0;
    
    cart.forEach(item => {
      const itemTotal = item.price * item.quantity;
      total += itemTotal;
      
      const isItemIvaEnabled = item.ivaEnabled !== false;
      if (config.ivaEnabled && isItemIvaEnabled) {
          // Cálculo por dentro (IVA incluído no preço)
          const itemIva = itemTotal * (rate / (100 + rate));
          iva += itemIva;
      }
    });
    
    return { cartTotal: total, cartIVA: iva };
  }, [cart, config.ivaEnabled, config.ivaRate]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', {hour: '2-digit', minute:'2-digit'});
  
  const handleAddToCart = useCallback((product: Product) => {
    if (product.stock <= 0) {
      showToast("Sem estoque disponível.", ToastType.ERROR);
      return;
    }
    setCart(prev => {
        const existing = prev.find(p => p.id === product.id);
        if (existing) {
            if (existing.quantity >= product.stock) return prev;
            const updatedItem = { ...existing, quantity: existing.quantity + 1 };
            const otherItems = prev.filter(p => p.id !== product.id);
            return [updatedItem, ...otherItems];
        }
        return [{ ...product, quantity: 1 } as CartItem, ...prev];
    });
    setProductSearch('');
    setShowSearchResults(false);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  }, [showToast]);

  const handleSetQuantity = useCallback((id: string, newQty: number) => {
    setCart(prev => prev.map(item => {
        if (item.id === id) {
            const qty = Math.max(1, newQty);
            return { ...item, quantity: qty > item.stock ? item.stock : qty };
        }
        return item;
    }));
  }, []);

  const handleSaveInvoice = useCallback((status: 'PAID' | 'PENDING', paymentDetails?: PaymentDetail[]) => {
    if (cart.length === 0 || !selectedCustomer) return;

    let methodLabel: Sale['paymentMethod'] = 'CASH';
    let totalPaid = cartTotal;
    let changeAmount = 0;

    if (status === 'PENDING') {
        methodLabel = 'PENDING';
    } else if (paymentDetails) {
        if (paymentDetails.length > 1) methodLabel = 'MIXED';
        else if (paymentDetails.length === 1) methodLabel = paymentDetails[0].method;
        
        totalPaid = paymentDetails.reduce((acc, d) => acc + d.amount, 0);
        changeAmount = Math.max(0, totalPaid - cartTotal);
    }

    const sale: Sale = {
        id: StorageService.getNextInvoiceNumber(new Date().getFullYear()),
        date: new Date().toISOString(),
        items: cart,
        total: cartTotal,
        customerId: selectedCustomer.id,
        paymentMethod: methodLabel,
        paymentDetails: paymentDetails,
        amountTendered: totalPaid,
        change: changeAmount,
        status: status,
        userId: currentUser?.id || 'SYSTEM',
        type: 'INVOICE'
    };

    StorageService.createSale(sale);
    
    setCustomers(StorageService.getCustomers());
    setSales(StorageService.getSales());
    setProducts(StorageService.getProducts());
    setCart([]);
    setIsPaymentModalOpen(false);
    setSaleToPreview(sale);
    setPreviewModalOpen(true);
  }, [cart, cartTotal, currentUser?.id, selectedCustomer]);

  const openPaymentModal = useCallback(() => {
      if (cart.length === 0 || !selectedCustomer) return;
      setIsPaymentModalOpen(true);
  }, [cart.length, selectedCustomer]);

  const finalizePaidInvoice = useCallback((details: PaymentDetail[]) => {
      handleSaveInvoice('PAID', details);
  }, [handleSaveInvoice]);

  const handleCancelInvoice = async (saleId: string) => {
    if (!currentUser || (currentUser.role !== UserRole.ADMIN && currentUser.role !== UserRole.MANAGER)) {
      showToast('Apenas administradores e gerentes podem anular facturas.', ToastType.ERROR);
      return;
    }

    const conf = await confirm('ATENÇÃO: Deseja realmente anular esta factura?\n\n- O stock dos itens será devolvido ao armazém.\n- A dívida do cliente (se pendente) será estornada.', {
        title: 'Anular Factura',
        type: 'danger',
        confirmText: 'Sim, Anular'
    });
    if (conf) {
        const success = StorageService.cancelSale(saleId);
        if (success) {
            showToast('Documento anulado com sucesso.', ToastType.SUCCESS);
            setSales(StorageService.getSales());
            setCustomers(StorageService.getCustomers());
            setProducts(StorageService.getProducts());
        } else {
            showToast('Não foi possível anular este documento.', ToastType.ERROR);
        }
    }
  };

  const getCustomerName = useCallback((customerId?: string) => {
    if (!customerId) return 'Consumidor Final';
    const c = customers.find(x => x.id === customerId);
    return c ? c.name : 'Desconhecido';
  }, [customers]);

  const filteredHistory = useMemo(() => {
      return sales.filter(sale => {
          const custName = getCustomerName(sale.customerId).toLowerCase();
          const matchSearch = sale.id.includes(historySearch) || custName.includes(historySearch.toLowerCase());
          const saleDate = new Date(sale.date).setHours(0,0,0,0);
          const start = historyStartDate ? new Date(historyStartDate).setHours(0,0,0,0) : 0;
          const end = historyEndDate ? new Date(historyEndDate).setHours(23,59,59,999) : Infinity;
          
          // Somente facturas no histórico do módulo de facturação
          // Se não houver 'type', inferimos pelo formato do ID (contém '/') ou presença de customerId significativo
          const isInvoice = sale.type === 'INVOICE' || (sale.id.includes('/') && !sale.type);
          
          return isInvoice && matchSearch && saleDate >= start && saleDate <= end;
      }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sales, historySearch, historyStartDate, historyEndDate, getCustomerName]);

  const totalHistoryPages = Math.ceil(filteredHistory.length / itemsPerPage);
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * itemsPerPage, historyPage * itemsPerPage);

  const handleHistoryPageChange = (newPage: number) => {
      if (newPage >= 1 && newPage <= totalHistoryPages) setHistoryPage(newPage);
  };

  const handlePrint = useCallback(() => {
    if (saleToPreview) {
      PDFService.generateInvoicePDF(
        saleToPreview, 
        config, 
        customers.find(c => c.id === saleToPreview.customerId), 
        currentUser || undefined
      );
    }
  }, [saleToPreview, config, customers, currentUser]);

  if (!isCashOpen) {
    return (
        <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-8 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <Lock size={48} className="text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text mb-2">Turno não Iniciado</h1>
            <p className="text-gray-500 dark:text-dark-text-muted text-lg max-w-md mb-8">Olá, <strong>{currentUser?.name || 'Utilizador'}</strong>. O módulo de Facturação está bloqueado porque não existe um caixa aberto para o seu utilizador.</p>
            <button onClick={() => window.location.hash = '#/treasury/cash-control'} className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform active:scale-95">Ir para Tesouraria / Abrir Caixa <ArrowRight size={20} /></button>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans text-gray-800 dark:text-gray-100">
        <div className="flex justify-between items-end shrink-0 pb-2 border-b border-gray-100 dark:border-dark-border">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2"><FileText className="text-blue-600" /> Emissão de Facturação</h1>
                <p className="text-gray-500 dark:text-dark-text-muted text-sm">Controle de faturação e histórico.</p>
            </div>
            <div className="flex bg-gray-100 dark:bg-dark-card p-1 rounded-lg">
                <button onClick={() => setActiveTab('new')} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'new' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text'}`}><Plus size={16} className="inline mr-2" />NOVA FACTURA</button>
                <button onClick={() => { setActiveTab('history'); setHistoryPage(1); }} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'history' ? 'bg-gray-200 text-gray-900 dark:bg-dark-bg dark:text-dark-text shadow-sm' : 'text-gray-500 hover:text-gray-700 dark:text-dark-text-muted dark:hover:text-dark-text'}`}><History size={16} className="inline mr-2" />HISTÓRICO</button>
            </div>
        </div>

        <div className="flex-1 min-h-0 relative">
            {activeTab === 'new' && (
                <div className="flex h-full gap-6 animate-in fade-in duration-200">
                    <div className="flex-[2] flex flex-col card overflow-hidden">
                        <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-dark-border flex items-center gap-4">
                            <div className="relative flex-1">
                                <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <select className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 dark:text-dark-text text-sm font-medium" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                                    <option value="">Selecione um cliente para iniciar...</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>

                        {!selectedCustomer ? (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 dark:text-dark-text-muted">
                                <div className="w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-3"><User size={32} className="opacity-50" /></div>
                                <p className="text-sm font-medium">Selecione um cliente acima para habilitar a facturação</p>
                            </div>
                        ) : (
                            <>
                                <div className="p-4 border-b border-gray-100 dark:border-dark-border">
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                                            <input ref={searchInputRef} type="text" placeholder="Pesquisar produto pelo nome ou código..." className="w-full pl-10 pr-10 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all dark:text-dark-text" value={productSearch} onChange={e => { setProductSearch(e.target.value); setShowSearchResults(true); }} onFocus={() => setShowSearchResults(true)} />
                                            {showSearchResults && productSearch && (
                                                <div className="absolute z-20 top-full left-0 right-0 mt-2 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl max-h-60 overflow-y-auto">
                                                    {products.filter(p => !p.isBlacklisted && (p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.includes(productSearch))).map(p => (
                                                        <button key={p.id} onMouseDown={() => handleAddToCart(p)} className="w-full text-left p-3 hover:bg-blue-50 dark:hover:bg-white/5 flex justify-between items-center border-b border-gray-100 dark:border-dark-border last:border-0">
                                                            <div>
                                                              <span className="text-sm font-medium text-gray-800 dark:text-dark-text block">{p.name}</span>
                                                              {p.description && <span className="text-xs text-gray-500 dark:text-gray-400 block max-w-md whitespace-normal">{p.description}</span>}
                                                              <span className="text-xs text-gray-400 dark:text-dark-text-muted font-mono">{p.code}</span>
                                                            </div>
                                                            <div className="text-right"><span className="text-sm font-bold text-blue-600 dark:text-blue-400">{formatCurrency(p.price)}</span><span className="text-xs text-gray-400 dark:text-dark-text-muted block">Stock: {p.stock}</span></div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button 
                                            onClick={() => setIsProductListOpen(true)}
                                            className="h-full px-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-600 dark:text-dark-text rounded-xl transition-colors flex items-center justify-center border border-gray-200 dark:border-dark-border shadow-sm"
                                            title="Catálogo de Produtos"
                                        >
                                            <Menu size={20} />
                                        </button>
                                    </div>
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar">
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-dark-text-muted sticky top-0 z-10">
                                            <tr><th className="px-6 py-3 font-semibold">Produto</th><th className="px-4 py-3 text-right font-semibold">Preço</th><th className="px-4 py-3 text-center font-semibold">Qtd</th><th className="px-6 py-3 text-right font-semibold">Total</th><th className="px-4 py-3 w-10"></th></tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                                            {cart.length === 0 ? (
                                                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400 dark:text-dark-text-muted italic">Carrinho vazio. Adicione produtos.</td></tr>
                                            ) : (
                                                cart.map(item => (
                                                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <td className="px-6 py-3">
                                                           <span className="font-medium text-gray-900 dark:text-dark-text block">{item.name}</span>
                                                           {item.description && <span className="text-xs text-gray-500 dark:text-gray-400 block max-w-xs whitespace-normal">{item.description}</span>}
                                                           <span className="text-xs text-gray-400 dark:text-dark-text-muted font-mono">{item.code}</span>
                                                         </td>
                                                        <td className="px-4 py-3 text-right text-gray-600 dark:text-dark-text-muted">{formatCurrency(item.price)}</td>
                                                        <td className="px-4 py-3"><div className="flex items-center justify-center"><input type="number" className="w-16 px-2 py-1 text-center bg-white dark:bg-dark-bg border border-gray-300 dark:border-dark-border rounded-md font-bold dark:text-dark-text" value={item.quantity} onChange={(e) => handleSetQuantity(item.id, parseInt(e.target.value) || 0)} /></div></td>
                                                        <td className="px-6 py-3 text-right font-bold text-gray-900 dark:text-dark-text">{formatCurrency(item.price * item.quantity)}</td>
                                                        <td className="px-4 py-3 text-center"><button onClick={() => setCart(cart.filter(i => i.id !== item.id))} className="text-gray-400 hover:text-red-500 p-1.5"><Trash2 size={16}/></button></td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-200 dark:border-dark-border">
                                    <div className="text-right mb-4">
                                        <p className="text-xs text-gray-500 dark:text-dark-text-muted uppercase font-bold tracking-wider">Subtotal Bruto</p>
                                        <p className="text-3xl font-bold text-gray-900 dark:text-dark-text tracking-tighter">{formatCurrency(cartTotal)}</p>
                                        {config.ivaEnabled && <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 italic">Inc. IVA: {formatCurrency(cartIVA)}</p>}
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleSaveInvoice('PENDING')} disabled={cart.length === 0} className="flex items-center justify-center gap-2 py-3 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-xl font-bold transition-all disabled:opacity-50"><Clock size={20} /> Facturar</button>
                                        <button onClick={openPaymentModal} disabled={cart.length === 0} className="flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all disabled:opacity-50"><CheckCircle size={20} /> Facturar Pago</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col gap-4 min-w-[320px]">
                        {selectedCustomer && (
                            <>
                                <div className="card p-5">
                                    <h3 className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-4">Posição Financeira do Cliente</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-100 dark:border-green-900/30">
                                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400"><Wallet size={18} /> <span className="font-medium">Saldo a Favor</span></div>
                                            <span className="font-bold text-lg dark:text-green-400">{formatCurrency(selectedCustomer.creditBalance)}</span>
                                        </div>
                                        <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30">
                                            <div className="flex items-center gap-2 text-red-700 dark:text-red-400"><CreditCard size={18} /> <span className="font-medium">Dívida Ativa</span></div>
                                            <span className="font-bold text-lg dark:text-red-400">{formatCurrency(selectedCustomer.debt)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 card flex flex-col overflow-hidden">
                                    <div className="p-4 border-b border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-white/5"><h3 className="font-bold text-gray-800 dark:text-dark-text text-sm">Últimas Facturas</h3></div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                                        {customerInvoices.length === 0 ? <div className="p-6 text-center text-gray-400 dark:text-dark-text-muted text-xs italic">Sem histórico de facturação.</div> : (
                                            <div className="divide-y divide-gray-100 dark:divide-dark-border">
                                                {customerInvoices.map(inv => (
                                                    <div key={inv.id} className="p-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                                        <div className="flex justify-between items-center mb-1"><span className="text-xs font-mono text-gray-500 dark:text-dark-text-muted">{inv.id}</span><span className="text-xs text-gray-400 dark:text-dark-text-muted">{new Date(inv.date).toLocaleDateString()}</span></div>
                                                        <div className="flex justify-between items-center"><span className="font-bold text-sm dark:text-dark-text">{formatCurrency(inv.total)}</span><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${inv.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : inv.status === 'VOID' ? 'bg-gray-100 text-gray-400 dark:bg-white/10 dark:text-dark-text-muted' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>{inv.status === 'PAID' ? 'PAGA' : inv.status === 'VOID' ? 'ANULADA' : 'PENDENTE'}</span></div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'history' && (
                <div className="flex flex-col h-full animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between gap-4 mb-4">
                        <div className="flex flex-1 gap-2">
                           <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                <input type="text" placeholder="Nº Factura ou Cliente..." className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm focus:ring-2 focus:ring-blue-500 outline-none" value={historySearch} onChange={(e) => { setHistorySearch(e.target.value); setHistoryPage(1); }} />
                           </div>
                           <input type="date" className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm outline-none" value={historyStartDate} onChange={(e) => { setHistoryStartDate(e.target.value); setHistoryPage(1); }} />
                           <input type="date" className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-900 text-sm outline-none" value={historyEndDate} onChange={(e) => { setHistoryEndDate(e.target.value); setHistoryPage(1); }} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col flex-1 min-h-0">
                         <div className="flex-1 overflow-auto custom-scrollbar">
                             <table className="w-full text-left text-sm whitespace-nowrap">
                                 <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
                                     <tr><th className="px-6 py-4">Nº Factura</th><th className="px-6 py-4">Cliente</th><th className="px-6 py-4">Data/Hora</th><th className="px-6 py-4 text-right">Valor Total</th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Ações</th></tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                     {paginatedHistory.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">Nenhum documento encontrado no histórico.</td></tr> : (
                                        paginatedHistory.map(sale => (
                                            <tr key={sale.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${sale.status === 'VOID' ? 'opacity-50 grayscale' : ''}`}>
                                                <td className="px-6 py-4 font-mono text-gray-500">{sale.id}</td>
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{getCustomerName(sale.customerId)}</td>
                                                <td className="px-6 py-4 text-gray-500">{formatDate(sale.date)}</td>
                                                <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">{formatCurrency(sale.total)}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                        sale.status === 'PAID' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 
                                                        sale.status === 'VOID' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                                    }`}>
                                                        {sale.status === 'PAID' ? 'LIQUIDADA' : sale.status === 'VOID' ? 'ANULADA' : 'PENDENTE'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => { setSaleToPreview(sale); setPreviewModalOpen(true); }} className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Ver Documento"><Eye size={18} /></button>
                                                        {sale.status !== 'VOID' && currentUser && (currentUser.role === UserRole.ADMIN || currentUser.role === UserRole.MANAGER) && (
                                                            <button onClick={() => handleCancelInvoice(sale.id)} className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Anular Factura"><Ban size={18} /></button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                     )}
                                 </tbody>
                             </table>
                         </div>

                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0 text-xs text-gray-500">
                            <div className="font-medium">Mostrando {paginatedHistory.length} de {filteredHistory.length} registos</div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleHistoryPageChange(historyPage - 1)} disabled={historyPage === 1} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronLeft size={14} /></button>
                                <span className="font-medium px-2">Pág. {historyPage} / {totalHistoryPages || 1}</span>
                                <button onClick={() => handleHistoryPageChange(historyPage + 1)} disabled={historyPage === totalHistoryPages || totalHistoryPages === 0} className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={14} /></button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>

        {/* --- MODAL DE PAGAMENTO --- */}
      {/* Modal de Pagamento Reutilizável */}
      {isPaymentModalOpen && (
        <PaymentModal 
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          totalAmount={cartTotal}
          onConfirm={finalizePaidInvoice}
          config={config}
          title="Finalizar Venda / Facturação"
        />
      )}

        {/* --- PREVIEW MODAL A4 --- */}
        {previewModalOpen && saleToPreview && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
                <div className="bg-white dark:bg-gray-900 w-full max-w-5xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-800">
                    <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                                <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                                <span className="text-lg font-black tracking-tighter">E</span>
                            </div>
                            <h3 className="font-bold">Previsualização de Factura A4</h3>
                        </div>
                        <div className="flex gap-2">
                            {saleToPreview.status !== 'VOID' && (
                                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold text-sm">
                                    <Printer size={18} /> IMPRIMIR FACTURA
                                </button>
                            )}
                            <button onClick={() => setPreviewModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 transition-colors"><X size={24} /></button>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-gray-200 dark:bg-gray-950 custom-scrollbar">
                         <div className={`print-section bg-white w-[210mm] min-h-[297mm] p-[15mm] shadow-lg text-black font-sans relative ${saleToPreview.status === 'VOID' ? 'grayscale' : ''}`}>
                             
                             {saleToPreview.status === 'VOID' && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none rotate-45 opacity-[0.05] overflow-hidden select-none">
                                    <span className="text-[100pt] font-black border-8 border-red-600 text-red-600 px-20">ANULADA</span>
                                </div>
                             )}

                             {/* Cabeçalho Novo Estilo */}
                             <div className="flex justify-between mb-10">
                                 <div className="w-1/2">
                                     <div className="text-2xl font-black text-blue-600 mb-1">
                                         {config.logo ? <img src={config.logo} alt="Logo" className="max-w-[120px] max-h-[60px] object-contain mb-2" referrerPolicy="no-referrer" /> : (config.companyName === 'CODIGO STACK' ? <><span className="text-blue-600">CODIGO</span> STACK</> : config.companyName)}
                                     </div>
                                     <div className="text-sm font-bold text-gray-800 mb-1">{config.companyName}</div>
                                     <div className="text-[10px] text-gray-500 uppercase font-bold mb-4 tracking-wider">{config.companyDescription || 'Desenvolvedora de Software & Website'}</div>
                                     <div className="text-[11px] leading-relaxed text-gray-600">
                                         <p><strong>Nuit:</strong> {config.nif}</p>
                                         <p><strong>Endereço:</strong> {config.companyAddress || 'Liberdade 1826, Matola, Maputo'}</p>
                                         <p><strong>Telefone:</strong> {config.companyContact || '+258 84 264 1083 / +258 86 254 1083'}</p>
                                         <p><strong>Email:</strong> {config.companyEmail || 'codigostack@gmail.com'}</p>
                                     </div>
                                 </div>
                                 <div className="w-[40%] text-right">
                                     <h2 className="text-2xl font-black text-gray-900 mb-1">FACTURA №</h2>
                                     <div className="text-xl font-bold text-gray-700 mb-2">{saleToPreview.id}</div>
                                     <div className="text-xs text-gray-400 mb-6">Pág. 1/1</div>

                                     <div className="text-left border border-black p-4 rounded-md">
                                         <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Cliente</div>
                                         <div className="text-sm font-black uppercase mb-1">Exmo.(s) Sr.(s) {getCustomerName(saleToPreview.customerId)}</div>
                                         <div className="text-[11px] text-gray-600 space-y-0.5">
                                             <p><strong>Endereço:</strong> {customers.find(c => c.id === saleToPreview.customerId)?.address || 'N/D'}</p>
                                             <p><strong>Nuit:</strong> {customers.find(c => c.id === saleToPreview.customerId)?.nif || 'N/D'}</p>
                                             <p><strong>Telefone:</strong> {customers.find(c => c.id === saleToPreview.customerId)?.phone || 'N/D'}</p>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Barra de Detalhes da Transação */}
                             <div className="grid grid-cols-6 border-y border-black py-3 mb-8 text-center">
                                 <div className="border-r border-gray-100">
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Documento</span>
                                     <span className="text-[11px] font-bold">Original</span>
                                 </div>
                                 <div className="border-r border-gray-100">
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Operador</span>
                                     <span className="text-[11px] font-bold">{StorageService.getUsers().find(u => u.id === saleToPreview.userId)?.name || (saleToPreview.userId === currentUser?.id ? currentUser?.name : 'Sistema')}</span>
                                 </div>
                                 <div className="border-r border-gray-100">
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Data</span>
                                     <span className="text-[11px] font-bold">{new Date(saleToPreview.date).toLocaleDateString('pt-PT')}</span>
                                 </div>
                                 <div className="border-r border-gray-100">
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Condição Pag.</span>
                                     <span className="text-[11px] font-bold">{saleToPreview.status === 'PAID' ? 'Pronto Pagamento' : 'A Prazo'}</span>
                                 </div>
                                 <div className="border-r border-gray-100">
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Vencimento</span>
                                     <span className="text-[11px] font-bold">
                                         {(() => {
                                             const d = new Date(saleToPreview.date);
                                             if (saleToPreview.status !== 'PAID') {
                                                 d.setMonth(d.getMonth() + 1);
                                                 d.setDate(d.getDate() + 10);
                                             }
                                             return d.toLocaleDateString('pt-PT');
                                         })()}
                                     </span>
                                 </div>
                                 <div>
                                     <span className="block text-[9px] font-black text-gray-400 uppercase tracking-tighter mb-1">Estado</span>
                                     <span className="text-[11px] font-bold">{saleToPreview.status === 'PAID' ? 'Factura Paga' : (saleToPreview.status === 'VOID' ? 'Anulada' : 'Pendente')}</span>
                                 </div>
                             </div>

                             {/* Tabela de Itens */}
                             <table className="w-full mb-10">
                                 <thead>
                                     <tr className="border-y border-black bg-gray-50 text-[10px] font-black uppercase">
                                         <th className="p-2 text-left">C. Barras</th>
                                         <th className="p-2 text-left">Descrição</th>
                                         <th className="p-2 text-center">Pr.Validade</th>
                                         <th className="p-2 text-center">Qtd.</th>
                                         <th className="p-2 text-right">Preço Unit.</th>
                                         <th className="p-2 text-right">Taxa IVA</th>
                                         <th className="p-2 text-right">Total Bruto</th>
                                     </tr>
                                 </thead>
                                 <tbody className="text-[11px]">
                                     {saleToPreview.items.map((item, idx) => {
                                         const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
                                         const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
                                         return (
                                             <tr key={idx} className="border-b border-gray-100">
                                                 <td className="p-2 font-mono text-[10px] text-gray-500">{item.code}</td>
                                                 <td className="p-2 font-bold uppercase">
                                                     {item.name}
                                                     {item.description && <div className="text-[9px] text-gray-500 font-normal normal-case mt-0.5">{item.description}</div>}
                                                 </td>
                                                 <td className="p-2 text-center">{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('pt-PT') : 'N/D'}</td>
                                                 <td className="p-2 text-center">{item.quantity.toFixed(2)}</td>
                                                 <td className="p-2 text-right">{formatCurrency(item.price)}</td>
                                                 <td className="p-2 text-right">{rate}%</td>
                                                 <td className="p-2 text-right font-bold">{formatCurrency(item.price * item.quantity)}</td>
                                             </tr>
                                         );
                                     })}
                                 </tbody>
                             </table>

                             {/* Secção Inferior: Resumo IVA e Totais */}
                             <div className="flex justify-between items-start mb-12">
                                 <div className="w-[40%]">
                                     <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Resumo do IVA</div>
                                     <table className="w-full border border-black text-[10px] text-center">
                                         <thead>
                                             <tr className="bg-gray-100 border-b border-black">
                                                 <th className="p-1 border-r border-black">Taxa</th>
                                                 <th className="p-1 border-r border-black">Incidência</th>
                                                 <th className="p-1">Total IVA</th>
                                             </tr>
                                         </thead>
                                         <tbody>
                                             {(() => {
                                                 // Agrupar por taxa
                                                 const groups: Record<number, { incidence: number, iva: number }> = {};
                                                 saleToPreview.items.forEach(item => {
                                                     const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
                                                     const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
                                                     const itemTotal = item.price * item.quantity;
                                                     const itemIva = isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0;
                                                     const incidence = itemTotal - itemIva;
                                                     
                                                     if (!groups[rate]) groups[rate] = { incidence: 0, iva: 0 };
                                                     groups[rate].incidence += incidence;
                                                     groups[rate].iva += itemIva;
                                                 });
                                                 
                                                 return Object.entries(groups).map(([rate, data]) => (
                                                     <tr key={rate} className="border-b border-black last:border-0 text-[10px]">
                                                         <td className="p-1 border-r border-black">{rate}%</td>
                                                         <td className="p-1 border-r border-black">{formatCurrency(data.incidence)}</td>
                                                         <td className="p-1">{formatCurrency(data.iva)}</td>
                                                     </tr>
                                                 ));
                                             })()}
                                         </tbody>
                                     </table>
                                 </div>
                                 <div className="w-[45%]">
                                     <div className="space-y-1.5 mb-6">
                                         <div className="flex justify-between text-[11px]">
                                             <span className="font-bold">Total Líquido:</span>
                                             <span>{formatCurrency(saleToPreview.items.reduce((acc, item) => {
                                                 const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
                                                 const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
                                                 const itemTotal = item.price * item.quantity;
                                                 const itemIva = isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0;
                                                 return acc + (itemTotal - itemIva);
                                             }, 0))}</span>
                                         </div>
                                         <div className="flex justify-between text-[11px]">
                                             <span className="font-bold">Total IVA:</span>
                                             <span>{formatCurrency(saleToPreview.items.reduce((acc, item) => {
                                                 const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
                                                 const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
                                                 const itemTotal = item.price * item.quantity;
                                                 return acc + (isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0);
                                             }, 0))}</span>
                                         </div>
                                         <div className="flex justify-between text-lg font-black pt-2 border-t-2 border-black text-blue-700">
                                             <span>Total Geral:</span>
                                             <span>{formatCurrency(saleToPreview.total)}</span>
                                         </div>
                                     </div>

                                     <div className="border border-gray-100 p-4 rounded-lg">
                                         <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Métodos de Pagamento</div>
                                         <div className="space-y-1 text-[11px]">
                                             {(config.paymentMethods?.find(m => m.id === 'CASH')?.isActive ?? true) && <div className="flex justify-between"><span>Numerário:</span><span>{formatCurrency(saleToPreview.paymentDetails?.find(d => d.method === 'CASH')?.amount || (saleToPreview.paymentMethod === 'CASH' ? saleToPreview.total : 0))}</span></div>}
                                             {(config.paymentMethods?.find(m => m.id === 'CARD')?.isActive ?? true) && <div className="flex justify-between"><span>POS:</span><span>{formatCurrency(saleToPreview.paymentDetails?.find(d => d.method === 'CARD')?.amount || (saleToPreview.paymentMethod === 'CARD' ? saleToPreview.total : 0))}</span></div>}
                                             {(config.paymentMethods?.find(m => m.id === 'EMOLA')?.isActive ?? true) && <div className="flex justify-between"><span>E-mola:</span><span>{formatCurrency(saleToPreview.paymentDetails?.find(d => d.method === 'EMOLA')?.amount || (saleToPreview.paymentMethod === 'EMOLA' ? saleToPreview.total : 0))}</span></div>}
                                             {(config.paymentMethods?.find(m => m.id === 'MPESA')?.isActive ?? true) && <div className="flex justify-between"><span>M-pesa:</span><span>{formatCurrency(saleToPreview.paymentDetails?.find(d => d.method === 'MPESA')?.amount || (saleToPreview.paymentMethod === 'MPESA' ? saleToPreview.total : 0))}</span></div>}
                                             {(config.paymentMethods?.find(m => m.id === 'TRANSFER')?.isActive ?? true) && <div className="flex justify-between"><span>Transferência:</span><span>{formatCurrency(saleToPreview.paymentDetails?.find(d => d.method === 'TRANSFER')?.amount || (saleToPreview.paymentMethod === 'TRANSFER' ? saleToPreview.total : 0))}</span></div>}
                                             <div className="flex justify-between font-black pt-2 border-t border-gray-100 mt-2"><span>Total (MT):</span><span>{formatCurrency(saleToPreview.total)}</span></div>
                                         </div>
                                     </div>
                                 </div>
                             </div>

                             {/* Informações Adicionais */}
                             <div className="text-[11px] mb-12">
                                 <p className="mb-4"><strong>Mensagem:</strong> Não aceitamos devoluções</p>
                                 <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                     <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Dados Para Transação</div>
                                     {config.financialTransactionData ? <div className="whitespace-pre-wrap">{config.financialTransactionData}</div> : (
                                         <div className="grid grid-cols-3 gap-4">
                                             <div><span className="block font-bold">M-pesa:</span> +258 84 264 1083</div>
                                             <div><span className="block font-bold">E-mola:</span> +258 86 254 1083</div>
                                             <div><span className="block font-bold">Moza:</span> 4770 6800 0000 0000</div>
                                         </div>
                                     )}
                                 </div>
                             </div>

                             {/* Footer */}
                             <div className="absolute bottom-10 left-[15mm] right-[15mm] border-t border-gray-200 pt-4 text-center text-[9px] text-gray-400">
                                 Documento Processado por Computador / Codigo Stack&reg; / {new Date().toLocaleString('pt-PT')}
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        )}
        {/* --- MODAL DE LISTA DE PRODUTOS MANUAL --- */}
        {isProductListOpen && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-gray-900 w-full max-w-2xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                        <div className="flex items-center gap-3">
                            <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                                <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">F</div>
                                <span className="text-lg font-black tracking-tighter">F</span>
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Catálogo de Produtos</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecione um item para adicionar à factura</p>
                            </div>
                        </div>
                        <button onClick={() => setIsProductListOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"><X size={24} /></button>
                    </div>

                    <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="Filtrar por nome ou código..."
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                                value={manualSearchTerm}
                                onChange={(e) => setManualSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-gray-50 dark:bg-gray-900">
                        <div className="flex flex-col gap-2">
                            {products
                                .filter(p => !p.isBlacklisted && (p.name.toLowerCase().includes(manualSearchTerm.toLowerCase()) || p.code.includes(manualSearchTerm)))
                                .map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => {
                                            handleAddToCart(product);
                                            setIsProductListOpen(false);
                                            setManualSearchTerm('');
                                        }}
                                        className="flex items-center p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all text-left group shadow-sm w-full"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold text-xs shrink-0 mr-3 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            {product.code.slice(-2)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">{product.name}</p>
                                             {product.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-normal">{product.description}</p>}
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-gray-500">{product.code}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${product.stock > product.minStock ? 'text-green-600 bg-green-50 dark:bg-green-900/20' : 'text-red-600 bg-red-50 dark:bg-red-900/20'}`}>
                                                    Estoque: {product.stock}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right pl-2">
                                            <span className="block font-bold text-lg text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                                                {formatCurrency(product.price)}
                                            </span>
                                        </div>
                                    </button>
                                ))
                            }
                            {products.filter(p => !p.isBlacklisted && (p.name.toLowerCase().includes(manualSearchTerm.toLowerCase()) || p.code.includes(manualSearchTerm))).length === 0 && (
                                <div className="py-12 text-center text-gray-400">
                                    Nenhum produto encontrado.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Invoicing;
