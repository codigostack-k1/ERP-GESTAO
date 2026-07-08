
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Search, 
  Trash2, 
  User, 
  Maximize2, 
  Zap, 
  CreditCard, 
  Banknote, 
  CheckCircle, 
  RotateCcw, 
  Calculator, 
  List, 
  X, 
  Smartphone, 
  Plus, 
  Lock, 
  Printer, 
  ArrowRight,
  FileText
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, CartItem, Sale, Customer, AppConfig, PaymentDetail, User as UserType, ToastType, ProductKit, ProductKitItem } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { PDFService } from '../services/pdfService';
import { useToast } from '../contexts/ToastContext';
import ConfirmModal from '../components/ConfirmModal';

interface PDVProps {
  config: AppConfig;
  currentUser?: UserType;
}

// Interface for search results that combine products and kits
interface PDVResultItem {
  id: string;
  code: string;
  name: string;
  price: number;
  cost: number;
  category: string;
  stock: number;
  isKit: boolean;
  items?: ProductKitItem[]; // For kits
  ivaEnabled?: boolean;
  minStock: number;
  description?: string;
}

// Interface auxiliar para o estado local das carteiras
interface WalletEntry {
    id: number;
    provider: string;
    amount: string;
    reference: string;
}

const PDV: React.FC<PDVProps> = ({ config, currentUser }) => {
  const { showToast } = useToast();
  // --- Gatekeeper State ---
  const [isCashOpen, setIsCashOpen] = useState(false);

  // --- States ---
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<ProductKit[]>([]); 
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  
  // Search / Scanner State
  const [searchTerm, setSearchTerm] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Manual Product List Modal State
  const [isProductListOpen, setIsProductListOpen] = useState(false);
  const [manualSearchTerm, setManualSearchTerm] = useState('');

  // Transaction State
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Payment State
  const [cashAmount, setCashAmount] = useState<string>('');
  const [cardAmount, setCardAmount] = useState<string>('');
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);

  // --- SUCCESS MODAL STATE ---
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [lastChange, setLastChange] = useState(0);
  const [lastPaid, setLastPaid] = useState(0);

  // --- UI Feedback States ---
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  } | null>(null);

  // Wrapper for formatCurrency using current config
  const formatMoney = useCallback((val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT', []);

  const getPaymentMethodLabel = (method: string) => {
      const labels: Record<string, string> = {
          'CASH': 'Numerário',
          'CARD': 'Multicaixa',
          'MPESA': 'M-Pesa',
          'EMOLA': 'e-Mola'
      };
      return labels[method] || method;
  };

  const loadData = useCallback(() => {
    setProducts(StorageService.getProducts());
    setKits(StorageService.getProductKits());
    setCustomers(StorageService.getCustomers());
    // Only check session status, don't focus here as it causes jumps during re-renders
    const session = StorageService.getActiveCashSession(currentUser?.id);
    setIsCashOpen(!!session);
  }, [currentUser?.id]);

  // Initial focus on mount
  useEffect(() => {
    const session = StorageService.getActiveCashSession(currentUser?.id);
    if (session) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentUser?.id]);

  // --- CHECKOUT PROCESS ---
  // --- Calculations ---
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

  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  
  const valCash = parseFloat(cashAmount || '0');
  const valCard = parseFloat(cardAmount || '0');
  const valWallets = walletEntries.reduce((sum, entry) => sum + (parseFloat(entry.amount) || 0), 0);
  
  const totalPaid = valCash + valCard + valWallets;
  
  const change = totalPaid - cartTotal;
  const missing = cartTotal - totalPaid;
  const isPaid = totalPaid >= (cartTotal - 0.01); // Tolerance for float precision

  const handleCheckout = useCallback(() => {
    if (cart.length === 0) {
        showToast("Carrinho vazio.", ToastType.WARNING);
        return;
    }
    
    // VALIDAÇÃO DE PAGAMENTO
    if (totalPaid < cartTotal - 0.01) {
        showToast(`Valor insuficiente! Faltam ${formatMoney(missing)} para concluir a venda.`, ToastType.ERROR);
        return;
    }

    const paymentDetails: PaymentDetail[] = [];
    
    // 1. Adiciona pagamentos exatos (Cartão, M-Pesa, etc.)
    if (valCard > 0) {
        paymentDetails.push({ method: 'CARD', amount: valCard });
    }
    
    walletEntries.forEach(w => {
        const amt = parseFloat(w.amount) || 0;
        if (amt > 0) {
            paymentDetails.push({ 
                method: w.provider, 
                amount: amt,
                reference: w.reference 
            });
        }
    });

    const nonCashTotal = paymentDetails.reduce((acc, p) => acc + p.amount, 0);
    
    let revenueCash = cartTotal - nonCashTotal;
    
    revenueCash = Math.round(revenueCash * 100) / 100;

    if (valCash > 0 && revenueCash > 0) {
        paymentDetails.push({ method: 'CASH', amount: revenueCash });
    }

    const checkSum = paymentDetails.reduce((acc, p) => acc + p.amount, 0);
    if (Math.abs(checkSum - cartTotal) > 0.05) {
        console.warn("Ajuste de integridade financeira aplicado.");
    }

    let methodLabel: Sale['paymentMethod'] = 'CASH';
    if (paymentDetails.length > 1) {
        methodLabel = 'MIXED';
    } else if (paymentDetails.length === 1) {
        methodLabel = paymentDetails[0].method;
    }

    const sale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      items: cart,
      total: cartTotal,
      paymentMethod: methodLabel,
      paymentDetails: paymentDetails, // Valores LÍQUIDOS para contabilidade
      amountTendered: totalPaid,      // Valor BRUTO para auditoria
      change: change,                 // Troco para auditoria
      userId: currentUser?.id || 'GUEST', // Linked to current user
      customerId: selectedCustomer?.id,
      status: 'PAID',
      type: 'PDV'
    };

    try {
      // Save to DB (updates stock automatically inside createSale)
      StorageService.createSale(sale);
      
      setProducts(StorageService.getProducts());

      // Prepare Success Modal Data
      setLastSale(sale);
      setLastPaid(totalPaid);
      setLastChange(change);
      setShowSuccessModal(true);
      showToast("Venda finalizada com sucesso!", ToastType.SUCCESS);
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);
      showToast("Erro ao salvar a venda. Verifique o armazenamento.", ToastType.ERROR);
    }
  }, [cart, cartTotal, totalPaid, missing, valCard, walletEntries, valCash, change, currentUser?.id, selectedCustomer?.id, formatMoney, showToast]);

  // --- Effects ---
  useEffect(() => {
    // Use a small delay to avoid cascading render warning during initialization
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  useEffect(() => {
    // Listener for Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // F12 (Finalize)
      if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0 && isCashOpen) {
          handleCheckout();
        }
        return;
      }
      
      // F2 or Ctrl+F (Focus Search)
      if (e.key === 'F2' || (e.ctrlKey && e.key.toLowerCase() === 'f')) {
        const activeElement = document.activeElement;
        const isInput = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'SELECT' || activeElement?.tagName === 'TEXTAREA';
        
        // If we are already in an input, only F2 forces focus to search
        if (!isInput || e.key === 'F2') {
            e.preventDefault();
            searchInputRef.current?.focus();
        }
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleCheckout, cart.length, isCashOpen]); // Re-run when checkout logic changes to keep it fresh

  // Search Logic (Derived from state)
  const searchResults = useMemo((): PDVResultItem[] => {
    if (searchTerm.trim().length === 0) return [];
    
    const term = searchTerm.toLowerCase();
    
    const prodResults: PDVResultItem[] = products.filter(p => 
      p.name.toLowerCase().includes(term) || 
      p.code.includes(term)
    ).map(p => ({ 
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        cost: p.cost,
        category: p.category,
        stock: p.stock,
        isKit: false,
        ivaEnabled: p.ivaEnabled,
        minStock: p.minStock,
        description: p.description
    }));

    const kitResults: PDVResultItem[] = kits.filter(k => 
      k.name.toLowerCase().includes(term) || 
      k.code.includes(term)
    ).map(k => ({ 
        id: k.id,
        code: k.code,
        name: k.name,
        price: k.price,
        cost: k.cost || 0,
        category: k.category || 'Kits',
        stock: 999999, // Kits don't have direct stock
        isKit: true,
        items: k.items,
        minStock: 0,
        description: k.description
    }));

    return [...prodResults, ...kitResults];
  }, [searchTerm, products, kits]);

  const showResults = searchTerm.trim().length > 0;

  // --- Automatic Compensation Check ---
  useEffect(() => {
    if (selectedCustomer && selectedCustomer.debt > 0 && selectedCustomer.creditBalance > 0) {
         const timer = setTimeout(() => {
            setConfirmModal({
              isOpen: true,
              title: 'Compensação Automática',
              message: `O cliente ${selectedCustomer.name} possui saldo a favor (${formatMoney(selectedCustomer.creditBalance)}) e dívida ativa (${formatMoney(selectedCustomer.debt)}). Deseja realizar a compensação automática agora?`,
              onConfirm: () => {
                const compensatedAmount = StorageService.performAutomaticCompensation(selectedCustomer.id);
                if (compensatedAmount > 0) {
                    showToast(`Compensação de ${formatMoney(compensatedAmount)} realizada com sucesso.`, ToastType.SUCCESS);
                    const updatedCustomers = StorageService.getCustomers();
                    setCustomers(updatedCustomers);
                    const updatedSelected = updatedCustomers.find(c => c.id === selectedCustomer.id);
                    setSelectedCustomer(updatedSelected || null);
                }
                setConfirmModal(null);
              }
            });
         }, 200);
         return () => clearTimeout(timer);
    }
  }, [selectedCustomer, formatMoney, showToast]);

  // Filter for Manual Modal
  const manualListProducts = useMemo((): PDVResultItem[] => {
    const term = manualSearchTerm.toLowerCase();
    const prodList: PDVResultItem[] = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.code.includes(term)
    ).map(p => ({ 
        id: p.id,
        code: p.code,
        name: p.name,
        price: p.price,
        cost: p.cost,
        category: p.category,
        stock: p.stock,
        isKit: false,
        ivaEnabled: p.ivaEnabled,
        minStock: p.minStock,
        description: p.description
    }));

    const kitList: PDVResultItem[] = kits.filter(k => 
        k.name.toLowerCase().includes(term) || 
        k.code.includes(term)
    ).map(k => ({ 
        id: k.id,
        code: k.code,
        name: k.name,
        price: k.price,
        cost: k.cost || 0,
        category: k.category || 'Kits',
        stock: 999999, 
        isKit: true,
        items: k.items,
        minStock: 0,
        description: k.description
    }));

    return [...prodList, ...kitList];
  }, [products, kits, manualSearchTerm]);

  // --- Handlers ---

  const addToCart = (product: PDVResultItem) => {
    if (!product.isKit && product.stock <= 0) {
        showToast("Produto sem estoque!", ToastType.WARNING);
        return;
    }

    if (product.isKit && product.items) {
      // Check if all component items have enough stock
      const canAdd = product.items.every((item) => {
        const p = products.find(prod => prod.id === item.productId);
        const cartQty = cart.reduce((acc, cItem) => {
           if (cItem.id === item.productId) acc += cItem.quantity;
           if (cItem.isKit) {
               const kit = kits.find(k => k.id === cItem.id);
               const kitItemMatch = kit?.items.find((ki) => ki.productId === item.productId);
               if (kitItemMatch) acc += kitItemMatch.quantity * cItem.quantity;
           }
           return acc;
        }, 0);
        return (p?.stock || 0) >= (item.quantity + cartQty);
      });

      if (!canAdd) {
        showToast("Alguns itens do kit não possuem estoque suficiente!", ToastType.WARNING);
        return;
      }
    }

    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        if (!product.isKit && existing.quantity >= product.stock) {
          showToast("Quantidade máxima em estoque atingida.", ToastType.WARNING);
          return prev; 
        }
        const updatedItem = { ...existing, quantity: existing.quantity + 1 };
        const otherItems = prev.filter(item => item.id !== product.id);
        return [updatedItem, ...otherItems];
      }
      
      const newItem: CartItem = {
        id: product.id,
        code: product.code,
        name: product.name,
        price: product.price,
        cost: product.cost,
        category: product.category,
        stock: product.stock,
        minStock: product.minStock,
        isKit: product.isKit,
        ivaEnabled: product.ivaEnabled !== undefined ? product.ivaEnabled : true,
        quantity: 1
      } as CartItem;

      return [newItem, ...prev];
    });
    
    setSearchTerm('');
    setIsProductListOpen(false); 
    setManualSearchTerm(''); 
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };


  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, newQty: number) => {
      if (newQty < 1) return;
      setCart(prev => prev.map(item => {
          if (item.id === id) {
              if (newQty > item.stock) return item;
              return { ...item, quantity: newQty };
          }
          return item;
      }));
  };

  // --- Wallet Management ---
  const addWalletEntry = () => {
      const activeMobiles = config.paymentMethods?.filter(m => m.type === 'MOBILE' && m.isActive) || [];
      if (activeMobiles.length === 0) return;
      
      setWalletEntries(prev => [
          ...prev, 
          { id: Date.now(), provider: activeMobiles[0].id, amount: '', reference: '' }
      ]);
  };

  const removeWalletEntry = (id: number) => {
      setWalletEntries(prev => prev.filter(e => e.id !== id));
  };

  const updateWalletEntry = (id: number, field: keyof WalletEntry, value: string) => {
      setWalletEntries(prev => prev.map(e => {
          if (e.id === id) {
              return { ...e, [field]: value };
          }
          return e;
      }));
  };

  const handlePrintReceipt = () => {
      if (!lastSale) return;
      DocumentGenerator.PontoDeVenda.gerarFaturaSimplificada(lastSale, config);
  };

  const handlePrintA4 = () => {
    if (!lastSale) return;
    PDFService.generateInvoicePDF(
      lastSale, 
      config, 
      customers.find(c => c.id === lastSale.customerId), 
      currentUser
    );
  };

  const handleNextSale = () => {
      setShowSuccessModal(false);
      setCart([]);
      setCashAmount('');
      setCardAmount('');
      setWalletEntries([]);
      setProducts(StorageService.getProducts()); 
      setSelectedCustomer(null);
      setLastSale(null);
      searchInputRef.current?.focus();
  };

  // --- GATEKEEPER RENDER ---
  if (!isCashOpen) {
      return (
          <div className="flex flex-col items-center justify-center h-[calc(100vh-6rem)] bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center animate-in fade-in duration-300">
              <div className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <Lock size={48} className="text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Turno não Iniciado</h1>
              <p className="text-gray-500 text-lg max-w-md mb-8">Olá, <strong>{currentUser?.name || 'Utilizador'}</strong>. Por favor, realize a abertura do seu caixa individual para operar.</p>
              <button 
                onClick={() => window.location.hash = '#/treasury/cash-control'}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 flex items-center gap-2 transition-transform active:scale-95"
              >
                  Ir para Tesouraria / Abrir Caixa <ArrowRight size={20} />
              </button>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-4 font-sans relative">
      
      {/* 1. Unidade de Cabeçalho Sincronizada com Grelha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 shrink-0">
          {/* Coluna Esquerda do Cabeçalho (Alinhada com a Pesquisa) */}
          <div className="lg:col-span-8 flex items-center justify-between bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded text-sm font-bold uppercase tracking-wide transition-colors">
                      <Zap size={16} />
                      Fluxo Contínuo
                  </button>
                  <div className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-semibold text-gray-600 dark:text-gray-300">
                      OPERADOR: <span className="text-blue-600 dark:text-blue-400">{currentUser?.name || 'Desconhecido'}</span>
                  </div>
                  <div className="px-3 py-1 bg-green-50 dark:bg-green-900/30 rounded text-xs font-semibold text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800">
                      MODO: <span className="font-bold">Vendas Diretas</span>
                  </div>
              </div>
              <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors"><Maximize2 size={18} /></button>
          </div>

          {/* Coluna Direita do Cabeçalho (Alinhada com o Painel de Pagamento) */}
          <div className="lg:col-span-4 flex items-center justify-between bg-slate-800 dark:bg-gray-950 px-5 py-2 rounded-lg shadow-lg border border-slate-700">
              <span className="font-bold text-sm uppercase tracking-wider text-slate-100">Modo Agilizado</span>
              <Calculator size={18} className="text-slate-400" />
          </div>
      </div>

      {/* 2. Main Split View */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
         
         {/* LEFT COLUMN: Search + Cart Table */}
         <div className="lg:col-span-8 flex flex-col gap-4 min-h-0">
            {/* SEARCH BAR */}
            <div className="relative z-20 shrink-0">
                <div className="relative flex items-center w-full bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-900 rounded-xl shadow-sm focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/20 transition-all">
                    <div className="pl-4 text-gray-400 animate-pulse">
                        <div className="h-6 w-0.5 bg-blue-500"></div>
                    </div>
                    <input 
                        ref={searchInputRef}
                        type="text" 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchResults.length > 0) {
                                e.preventDefault();
                                addToCart(searchResults[0]);
                            }
                        }}
                        className="w-full h-14 px-4 bg-transparent outline-none text-xl font-medium text-gray-700 dark:text-gray-200 placeholder-gray-300 dark:placeholder-gray-600 uppercase"
                        placeholder="Aguardando leitura de código de barras..."
                    />
                    <div className="pr-4">
                        <button 
                            onClick={() => setIsProductListOpen(true)}
                            className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
                            title="Abrir Lista de Produtos (F2)"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
                
                {/* Search Results Dropdown */}
                {showResults && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl overflow-hidden max-h-80 overflow-y-auto z-50">
                        {searchResults.map(product => (
                            <button 
                                key={product.id}
                                onClick={() => addToCart(product)}
                                className="w-full text-left px-4 py-3 border-b border-gray-100 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex justify-between items-center group"
                            >
                                <div>
                                    <span className="text-xs font-mono text-gray-400 block">{product.code}</span>
                                    <span className="font-medium text-gray-800 dark:text-white group-hover:text-blue-600 block">{product.name}</span>
                                    {product.description && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400 block max-w-xs whitespace-normal mt-0.5 normal-case font-normal">
                                            {product.description}
                                        </span>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-blue-600">{formatMoney(product.price)}</div>
                                    <div className="text-xs text-gray-400">Estoque: {product.stock}</div>
                                </div>
                            </button>
                        ))}
                        {searchResults.length === 0 && (
                            <div className="p-4 text-center text-gray-400">Nenhum produto encontrado.</div>
                        )}
                    </div>
                )}
            </div>

            {/* PRODUCT LIST TABLE */}
            <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-0">
                {/* Table Header */}
                <div className="bg-blue-600 text-white flex text-xs font-bold uppercase tracking-wider py-3 px-4 shadow-sm shrink-0">
                    <div className="w-1/2">Item / Produto</div>
                    <div className="w-1/6 text-right">Unitário</div>
                    <div className="w-1/6 text-center">Qtd.</div>
                    <div className="w-1/6 text-right">Subtotal</div>
                    <div className="w-10 text-center">Ação</div>
                </div>

                {/* Table Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-gray-50/50 dark:bg-gray-900/50">
                    {cart.length === 0 ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300 dark:text-gray-600 select-none">
                            <RotateCcw size={80} strokeWidth={1} className="mb-4" />
                            <h3 className="text-xl font-bold uppercase tracking-widest opacity-50">Carrinho Vazio</h3>
                            <p className="text-sm opacity-50">Use o scanner ou digite para adicionar</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 dark:divide-gray-700">
                            {cart.map((item, idx) => (
                                <div key={item.id} className="flex items-center py-3 px-4 hover:bg-white dark:hover:bg-gray-800 transition-colors group">
                                    <div className="w-1/2 pr-2">
                                        <div className="text-xs text-gray-400 mb-0.5 font-mono">{String(idx + 1).padStart(2, '0')} - {item.code}</div>
                                        <div className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-1">{item.name}</div>
                                        {item.description && <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 whitespace-normal leading-snug">{item.description}</div>}
                                    </div>
                                    <div className="w-1/6 text-right text-sm text-gray-600 dark:text-gray-300 font-medium">
                                        {formatMoney(item.price)}
                                    </div>
                                    <div className="w-1/6 flex justify-center">
                                        <input 
                                            type="number" 
                                            min="1"
                                            max={item.stock}
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(item.id, parseInt(e.target.value))}
                                            className="w-16 text-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded py-1 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="w-1/6 text-right text-sm font-bold text-gray-900 dark:text-white">
                                        {formatMoney(item.price * item.quantity)}
                                    </div>
                                    <div className="w-10 flex justify-center">
                                        <button 
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Customer Select Footer */}
                <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 p-2 flex items-center gap-2 shrink-0">
                    <div className="relative flex-1">
                        <User size={16} className="absolute left-3 top-2.5 text-gray-400" />
                        <select 
                            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded text-sm outline-none focus:border-blue-500 text-gray-700 dark:text-gray-200"
                            value={selectedCustomer?.id || ''}
                            onChange={(e) => {
                                const c = customers.find(x => x.id === e.target.value);
                                setSelectedCustomer(c || null);
                            }}
                        >
                            <option value="">Cliente Consumidor Final</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>
         </div>

         {/* RIGHT COLUMN: Payment Panel */}
         <div className="lg:col-span-4 flex flex-col gap-4 h-full">
            
            {/* Dark Payment Box */}
            <div className="bg-slate-800 dark:bg-gray-950 rounded-lg p-5 text-white shadow-lg flex-1 flex flex-col h-full">
                <div className="space-y-5 flex-1 overflow-y-auto custom-scrollbar">
                    {/* CASH INPUT */}
                    {(config.paymentMethods?.find(m => m.id === 'CASH')?.isActive ?? true) && (
                        <div>
                            <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">Numerário (Dinheiro)</label>
                            <div className="relative group">
                                <Banknote className="absolute left-3 top-3 text-slate-400 group-focus-within:text-green-400 transition-colors" size={20} />
                                <input 
                                    type="number" 
                                    placeholder="0.00"
                                    value={cashAmount}
                                    onChange={(e) => setCashAmount(e.target.value)}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-3 pl-10 pr-4 text-xl font-bold text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                                />
                                {valCash > 0 && <CheckCircle size={16} className="absolute right-3 top-4 text-green-500" />}
                            </div>
                        </div>
                    )}

                    {/* CARD INPUT */}
                    {(config.paymentMethods?.find(m => m.id === 'CARD')?.isActive ?? true) && (
                        <div>
                            <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">Multicaixa</label>
                            <div className="relative">
                                <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={16} />
                                <input 
                                    type="number" 
                                    placeholder="0.00" 
                                    value={cardAmount} 
                                    onChange={(e) => setCardAmount(e.target.value)}
                                    className="w-full bg-slate-700/50 border border-slate-600 rounded-lg py-2 pl-9 pr-2 text-sm font-medium text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* MULTIPLE WALLET SECTION */}
                    {(config.paymentMethods?.some(m => m.type === 'MOBILE' && m.isActive) ?? true) && (
                        <div className="bg-slate-700/30 p-3 rounded-xl border border-slate-700">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-[10px] font-semibold text-slate-400 uppercase block flex items-center gap-1">
                                    <Smartphone size={12} />
                                    Carteiras Digitais
                                </label>
                                <button 
                                    onClick={addWalletEntry}
                                    className="text-[10px] flex items-center gap-1 bg-slate-600 hover:bg-slate-500 text-white px-2 py-1 rounded transition-colors"
                                >
                                    <Plus size={10} /> Adicionar
                                </button>
                            </div>

                            <div className="space-y-2">
                                {walletEntries.map((wallet) => (
                                    <div key={wallet.id} className="animate-in slide-in-from-left-2 duration-200">
                                        <div className="flex gap-2 mb-1">
                                            <select 
                                                className="bg-slate-800 border border-slate-600 text-[10px] text-white rounded px-1 outline-none focus:border-blue-500 w-28 shrink-0"
                                                value={wallet.provider}
                                                onChange={(e) => updateWalletEntry(wallet.id, 'provider', e.target.value)}
                                            >
                                                {config.paymentMethods?.filter(m => m.type === 'MOBILE' && m.isActive).map(m => (
                                                  <option key={m.id} value={m.id}>{m.name}</option>
                                                ))}
                                            </select>
                                            <input 
                                                type="number" 
                                                placeholder="Valor"
                                                value={wallet.amount}
                                                onChange={(e) => updateWalletEntry(wallet.id, 'amount', e.target.value)}
                                                className="flex-1 bg-slate-800 border border-slate-600 text-xs text-white rounded px-2 py-1.5 outline-none focus:border-blue-500"
                                            />
                                            <button 
                                                onClick={() => removeWalletEntry(wallet.id)}
                                                className="text-slate-400 hover:text-red-400"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                        <input 
                                            type="text"
                                            placeholder="Referência / ID Transação"
                                            value={wallet.reference}
                                            onChange={(e) => updateWalletEntry(wallet.id, 'reference', e.target.value)}
                                            className="w-full bg-slate-800/50 border border-slate-700 text-[10px] text-slate-300 rounded px-2 py-1 outline-none focus:border-slate-500"
                                        />
                                    </div>
                                ))}
                                {walletEntries.length === 0 && (
                                    <div className="text-center py-2 text-slate-500 text-xs italic border border-dashed border-slate-700 rounded">
                                        Nenhuma carteira adicionada
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* TOTAL DISPLAYS */}
                    <div className="mt-6 space-y-3">
                        <div className="bg-blue-600 rounded-lg p-4 shadow-lg shadow-blue-900/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-blue-200 text-xs font-bold uppercase mb-1">Total Geral</p>
                                    <div className="text-4xl font-extrabold tracking-tight">
                                        {formatMoney(cartTotal)}
                                    </div>
                                </div>
                                {config.ivaEnabled && (
                                    <div className="text-right">
                                        <p className="text-blue-200 text-[10px] font-bold uppercase mb-1">Inclui IVA</p>
                                        <div className="text-lg font-bold">{formatMoney(cartIVA)}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        <div className={`rounded-lg p-4 transition-colors ${change >= 0 ? 'bg-emerald-600' : 'bg-slate-700'}`}>
                            <div className="flex justify-between items-end">
                                <div>
                                    <p className={`text-xs font-bold uppercase mb-1 ${change >= 0 ? 'text-emerald-100' : 'text-slate-400'}`}>
                                        {change >= 0 ? 'Troco a Devolver' : 'Faltam'}
                                    </p>
                                    <div className="text-2xl font-bold tracking-tight">
                                        {formatMoney(Math.abs(change))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Stats */}
                <div className="flex justify-between items-center py-4 border-t border-slate-700 mt-4 text-sm shrink-0">
                    <div>
                        <span className="text-slate-400 block text-xs">Valor Entregue</span>
                        <span className="font-bold">{formatMoney(totalPaid)}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-slate-400 block text-xs">Itens</span>
                        <span className="font-bold">{totalItems}</span>
                    </div>
                </div>

                {/* Main Action Button */}
                <button 
                    onClick={handleCheckout}
                    disabled={cart.length === 0 || !isPaid}
                    className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shrink-0
                        ${cart.length > 0 && isPaid 
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white transform hover:-translate-y-0.5' 
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                >
                    <span>FINALIZAR (F12)</span>
                    <CheckCircle size={20} />
                </button>
            </div>
         </div>
      </div>

      {/* --- SUCCESS MODAL --- */}
      {showSuccessModal && lastSale && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in zoom-in duration-300">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-3xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden">
                  
                  {/* Modal Header with Logo */}
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/50">
                      <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                          <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                          <span className="text-lg font-black tracking-tighter">E</span>
                      </div>
                      <span className="font-bold text-gray-900 dark:text-white text-sm uppercase tracking-tight">Venda Finalizada</span>
                  </div>

                  {/* Modal Content */}
                  <div className="flex flex-col items-center p-8 text-center">
                      <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6 shadow-sm">
                          <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
                      </div>
                      
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Venda Concluída!</h2>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 font-mono">Recibo #{lastSale.id.slice(-8).toUpperCase()}</p>

                      <div className="w-full bg-gray-50 dark:bg-gray-900 rounded-xl p-4 border border-gray-100 dark:border-gray-700 mb-6">
                          <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                              <span className="text-gray-500 text-sm">Total da Venda</span>
                              <div className="text-right">
                                  <span className="text-lg font-bold text-gray-900 dark:text-white block leading-none">{formatMoney(lastSale.total)}</span>
                                  {config.ivaEnabled && (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase block mt-1">Inclui {formatMoney(lastSale.items.reduce((acc, item) => {
                                          const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
                                          const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
                                          const itemTotal = item.price * item.quantity;
                                          return acc + (isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0);
                                      }, 0))} de IVA</span>
                                  )}
                              </div>
                          </div>
                          
                          {/* Auditoria de Pagamento */}
                          <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                              <span>Total Entregue</span>
                              <span>{formatMoney(lastPaid)}</span>
                          </div>

                          {/* Detalhes dos Métodos de Pagamento */}
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                              <p className="text-[10px] font-bold text-gray-400 uppercase mb-2 text-left">Métodos Utilizados</p>
                              <div className="space-y-1">
                                  {lastSale.paymentDetails?.map((payment, idx) => (
                                      <div key={idx} className="flex justify-between items-center text-xs">
                                          <span className="text-gray-500">{getPaymentMethodLabel(payment.method)}</span>
                                          <span className="font-medium text-gray-700 dark:text-gray-300">{formatMoney(payment.amount)}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                          
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-dashed border-gray-300 dark:border-gray-600">
                              <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Troco</span>
                              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">{formatMoney(lastChange)}</span>
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 w-full mb-4">
                          <button 
                            onClick={handlePrintReceipt}
                            className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-2xl font-bold transition-colors border border-gray-200 dark:border-gray-600"
                          >
                              <Printer size={24} className="text-blue-600 dark:text-blue-400" />
                              <span className="text-xs uppercase">Talão Térmico</span>
                          </button>
                          <button 
                            onClick={handlePrintA4}
                            className="flex flex-col items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-2xl font-bold transition-colors border border-gray-200 dark:border-gray-600"
                          >
                              <FileText size={24} className="text-blue-600 dark:text-blue-400" />
                              <span className="text-xs uppercase">Factura A4</span>
                          </button>
                      </div>
                      
                      <button 
                        onClick={handleNextSale}
                        className="w-full flex items-center justify-center gap-2 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-colors shadow-lg shadow-blue-500/30"
                      >
                          <ArrowRight size={24} />
                          <span>Página Inicial / Próxima Venda</span>
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* MODAL MANUAL PRODUCT LIST */}
      {isProductListOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden border border-gray-200 dark:border-gray-700">
                {/* Modal Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                            <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                            <span className="text-lg font-black tracking-tighter">E</span>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-none">Catálogo de Produtos</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Selecione um item para adicionar ao carrinho</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsProductListOpen(false)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Modal Search */}
                <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="Filtrar por nome ou código..."
                            value={manualSearchTerm}
                            onChange={(e) => setManualSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                        />
                    </div>
                </div>

                {/* Modal List */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    <div className="flex flex-col gap-2">
                        {manualListProducts.length === 0 ? (
                             <div className="col-span-full py-12 text-center text-gray-400">
                                Nenhum produto encontrado.
                             </div>
                        ) : (
                            manualListProducts.map((product: PDVResultItem) => (
                                <button
                                    key={product.id}
                                    onClick={() => addToCart(product)}
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
                                            {formatMoney(product.price)}
                                        </span>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>
                
                {/* Modal Footer */}
                <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center text-xs text-gray-500">
                    Mostrando {manualListProducts.length} produtos
                </div>
            </div>
        </div>
      )}

      {/* CONFIRM MODAL */}
      {confirmModal && (
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
          type={confirmModal.type}
        />
      )}

    </div>
  );
};

export default PDV;
