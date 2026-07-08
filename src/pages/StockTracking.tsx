import React, { useState } from 'react';
import { 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  TrendingUp, 
  Download, 
  Filter, 
  Plus, 
  Search, 
  Eye, 
  X,
  AlertTriangle,
  Info,
  Package,
  Layers,
  Sparkles,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, StockLedgerEntry, StockLedgerType, ToastType } from '../types';
import { useToast } from '../contexts/ToastContext';

interface StockTrackingProps {
  config: any;
  currentUser: any;
}

const StockTracking: React.FC<StockTrackingProps> = ({ currentUser }) => {
  const { showToast } = useToast();
  
  // --- States ---
  const [ledger, setLedger] = useState<StockLedgerEntry[]>(() => {
    try {
      return StorageService.getStockLedger();
    } catch (e) {
      console.error('Erro ao ler ledger de stock:', e);
      return [];
    }
  });
  
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      return StorageService.getProducts(true);
    } catch (e) {
      console.error('Erro ao ler produtos:', e);
      return [];
    }
  });
  
  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // --- Filters ---
  const [filterProduct, setFilterProduct] = useState<string>('');
  const [filterOperator, setFilterOperator] = useState<string>('');
  const [filterShift, setFilterShift] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'ENTRIES' | 'EXITS' | 'ADJUSTMENTS'>('ALL');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  
  // --- Modal States ---
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(null);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState<boolean>(false);
  
  // --- New Adjustment Form States ---
  const [newAdjProductId, setNewAdjProductId] = useState<string>('');
  const [newAdjType, setNewAdjType] = useState<StockLedgerType>(StockLedgerType.AJUSTE_INVENTARIO);
  const [newAdjDirection, setNewAdjDirection] = useState<'UP' | 'DOWN'>('DOWN');
  const [newAdjQuantity, setNewAdjQuantity] = useState<number>(0);
  const [newAdjObservations, setNewAdjObservations] = useState<string>('');
  const [newAdjShift, setNewAdjShift] = useState<string>('TURNO-01');
  const [newAdjDocRef, setNewAdjDocRef] = useState<string>('');

  // --- Reload Data helper ---
  const loadData = () => {
    try {
      setLedger(StorageService.getStockLedger());
      setProducts(StorageService.getProducts(true));
    } catch (err) {
      console.error('Erro ao carregar dados do ledger:', err);
    }
  };

  // --- Dynamic Filtering on Every Render ---
  const filteredLedger = (() => {
    let result = [...ledger];

    // Search term (ID, product name, observations, docRef)
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(
        entry => 
          entry.id.toLowerCase().includes(searchLower) ||
          entry.productName.toLowerCase().includes(searchLower) ||
          (entry.observations && entry.observations.toLowerCase().includes(searchLower)) ||
          (entry.documentRef && entry.documentRef.toLowerCase().includes(searchLower))
      );
    }

    // Active Quick Tab Filter
    if (activeTab === 'ENTRIES') {
      result = result.filter(e => 
        e.type === StockLedgerType.ENTRADA_COMPRA || 
        e.type === StockLedgerType.DEVOLUCAO || 
        (e.type === StockLedgerType.AJUSTE_INVENTARIO && e.quantity > 0)
      );
    } else if (activeTab === 'EXITS') {
      result = result.filter(e => 
        e.type === StockLedgerType.SAIDA_VENDA || 
        (e.type === StockLedgerType.AJUSTE_INVENTARIO && e.quantity < 0)
      );
    } else if (activeTab === 'ADJUSTMENTS') {
      result = result.filter(e => e.type === StockLedgerType.AJUSTE_INVENTARIO);
    }

    // Product Filter
    if (filterProduct) {
      result = result.filter(entry => entry.productId === filterProduct);
    }

    // Operator Filter
    if (filterOperator) {
      const operatorLower = filterOperator.toLowerCase();
      result = result.filter(
        entry => 
          entry.operatorName.toLowerCase().includes(operatorLower) ||
          entry.operatorId.toLowerCase().includes(operatorLower)
      );
    }

    // Shift Filter
    if (filterShift) {
      result = result.filter(entry => entry.shiftId.toLowerCase().includes(filterShift.toLowerCase()));
    }

    // Date Interval
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      result = result.filter(entry => new Date(entry.timestamp) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(entry => new Date(entry.timestamp) <= end);
    }

    // Always keep chronological ledger sequence
    return result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  })();

  const totalPages = Math.ceil(filteredLedger.length / itemsPerPage);
  const activePage = Math.min(totalPages, Math.max(1, currentPage));
  const paginatedLedger = filteredLedger.slice((activePage - 1) * itemsPerPage, activePage * itemsPerPage);

  // --- Clear Filters ---
  const handleClearFilters = () => {
    setFilterProduct('');
    setFilterOperator('');
    setFilterShift('');
    setStartDate('');
    setEndDate('');
    setSearchTerm('');
    setActiveTab('ALL');
    showToast('Filtros limpos', ToastType.INFO);
  };

  // --- Handle Save Manual Adjustment ---
  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdjProductId) {
      showToast('Selecione um produto para o ajuste.', ToastType.ERROR);
      return;
    }
    if (newAdjQuantity <= 0) {
      showToast('A quantidade deve ser superior a zero.', ToastType.ERROR);
      return;
    }
    if (!newAdjObservations.trim()) {
      showToast('Por favor, indique a observação/motivo do ajuste.', ToastType.ERROR);
      return;
    }

    try {
      const targetProd = products.find(p => p.id === newAdjProductId);
      if (!targetProd) {
        showToast('Produto não encontrado.', ToastType.ERROR);
        return;
      }

      // Check if negative adjustment would violate stock constraints (avoiding negative stock)
      const isNegative = newAdjType === StockLedgerType.SAIDA_VENDA || 
                          (newAdjType === StockLedgerType.AJUSTE_INVENTARIO && newAdjDirection === 'DOWN');
      
      if (isNegative && targetProd.stock < newAdjQuantity) {
        showToast(`Impossível ajustar: Stock insuficiente. Stock atual de ${targetProd.name}: ${targetProd.stock} unidades.`, ToastType.ERROR);
        return;
      }

      // 1. Calculate change value based on direction
      // If it's a positive adjustment (Entry/Devolution/Inventory Up), quantity is positive.
      // If negative (Exit/Inventory Down), quantity is negative for AJUSTE_INVENTARIO
      let qtyValue = newAdjQuantity;
      if (newAdjType === StockLedgerType.AJUSTE_INVENTARIO && newAdjDirection === 'DOWN') {
        qtyValue = -newAdjQuantity;
      }

      // 2. Update the actual product stock quantity in storage first
      const newStock = isNegative ? targetProd.stock - newAdjQuantity : targetProd.stock + newAdjQuantity;
      const updatedProducts = products.map(p => {
        if (p.id === targetProd.id) {
          return { ...p, stock: newStock };
        }
        return p;
      });
      StorageService.saveProducts(updatedProducts);

      // 3. Add Stock Ledger Entry with precise resultant stock
      const addedEntry = StorageService.addStockLedgerEntry({
        productId: targetProd.id,
        productName: targetProd.name,
        timestamp: new Date().toISOString(),
        type: newAdjType,
        quantity: qtyValue,
        operatorId: currentUser?.id || 'admin-1',
        operatorName: currentUser?.name || 'Administrador',
        shiftId: newAdjShift || 'TURNO-GERAL',
        documentRef: newAdjDocRef || undefined,
        observations: newAdjObservations
      }, newStock);
      
      showToast(`Ajuste registado com sucesso para "${targetProd.name}". Novo saldo: ${addedEntry.resultantStock} un.`, ToastType.SUCCESS);
      
      // Reset Form and Load Data
      setNewAdjProductId('');
      setNewAdjQuantity(0);
      setNewAdjObservations('');
      setNewAdjDocRef('');
      setIsAdjustmentModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(`Erro ao guardar ajuste: ${err.message}`, ToastType.ERROR);
    }
  };

  // --- Export Excel / CSV ---
  const handleExportCSV = () => {
    try {
      const headers = ['ID', 'Produto', 'Data', 'Tipo', 'Quantidade', 'Operador', 'Turno/Fecho', 'Stock Resultante', 'Documento', 'Observacoes'];
      const rows = filteredLedger.map(entry => [
        entry.id,
        entry.productName,
        new Date(entry.timestamp).toLocaleString(),
        entry.type,
        entry.quantity,
        entry.operatorName,
        entry.shiftId,
        entry.resultantStock,
        entry.documentRef || '',
        entry.observations || ''
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
        + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Rastreio_Mercadorias_Ledger_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast('Exportação concluída com sucesso!', ToastType.SUCCESS);
    } catch {
      showToast('Erro ao exportar dados.', ToastType.ERROR);
    }
  };

  // --- Compute Stats ---
  const totalTransactions = filteredLedger.length;
  
  const entriesCount = filteredLedger.filter(e => 
    e.type === StockLedgerType.ENTRADA_COMPRA || e.type === StockLedgerType.DEVOLUCAO || (e.type === StockLedgerType.AJUSTE_INVENTARIO && e.quantity > 0)
  ).length;

  const exitsCount = filteredLedger.filter(e => 
    e.type === StockLedgerType.SAIDA_VENDA || (e.type === StockLedgerType.AJUSTE_INVENTARIO && e.quantity < 0)
  ).length;

  const latestTransactionDate = filteredLedger.length > 0 
    ? new Date(filteredLedger[0].timestamp).toLocaleDateString([], { day: '2-digit', month: '2-digit' }) + ' ' + new Date(filteredLedger[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'N/A';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header and Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">
            <span>Vendas</span>
            <span>/</span>
            <span className="text-blue-600 dark:text-blue-400">Rastreio de Mercadorias</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
            <History className="text-blue-600 dark:text-blue-400" size={24} />
            Rastreio de Mercadorias
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xl">
            Histórico cronológico de movimentações e extrato de stock. Registe ajustes de inventário e audite entradas e saídas.
          </p>
        </div>
        
        {/* Main Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-all shadow-sm flex items-center gap-2"
          >
            <Plus size={15} />
            Registar Ajuste
          </button>
          
          <button
            onClick={handleExportCSV}
            disabled={filteredLedger.length === 0}
            className="px-4 py-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={15} />
            Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Stats Cards - Minimalist & Space Conscious */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 rounded-lg">
            <Layers size={18} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total Transações</span>
            <span className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 block">{totalTransactions}</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-lg">
            <ArrowDownLeft size={18} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Entradas / Devoluções</span>
            <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">{entriesCount}</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-lg">
            <ArrowUpRight size={18} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Saídas Registadas</span>
            <span className="text-xl font-bold text-rose-600 dark:text-rose-400 mt-0.5 block">{exitsCount}</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 p-4 rounded-xl flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-lg">
            <History size={18} />
          </div>
          <div>
            <span className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Último Evento</span>
            <span className="text-xs font-semibold text-gray-800 dark:text-gray-200 mt-1 block truncate max-w-[140px]">{latestTransactionDate}</span>
          </div>
        </div>
      </div>

      {/* Simplified Search & Filtering Segment */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4.5 rounded-2xl shadow-sm space-y-4">
        
        {/* Simple Search bar with X clear */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 text-gray-400 dark:text-gray-500" size={15} />
          <input
            type="text"
            placeholder="Pesquise por ID, nome do produto, número de documento ou observação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-xl outline-none focus:ring-1 focus:ring-blue-500/30 focus:border-blue-500 transition-all placeholder-gray-400 dark:placeholder-gray-500"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3.5 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs & Toggle advanced */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1 bg-gray-50 dark:bg-gray-900 p-1 rounded-xl border border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'ALL'
                  ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm border border-gray-150 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              Todos os Movimentos
            </button>
            <button
              onClick={() => setActiveTab('ENTRIES')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ENTRIES'
                  ? 'bg-white dark:bg-gray-800 text-emerald-600 dark:text-emerald-400 shadow-sm border border-gray-150 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Entradas / Devoluções
            </button>
            <button
              onClick={() => setActiveTab('EXITS')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'EXITS'
                  ? 'bg-white dark:bg-gray-800 text-rose-600 dark:text-rose-400 shadow-sm border border-gray-150 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
              Saídas
            </button>
            <button
              onClick={() => setActiveTab('ADJUSTMENTS')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
                activeTab === 'ADJUSTMENTS'
                  ? 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 shadow-sm border border-gray-150 dark:border-gray-700'
                  : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Ajustes Manuais
            </button>
          </div>

          <div className="flex items-center justify-between lg:justify-end gap-2">
            <div className="text-[11px] text-gray-400 dark:text-gray-500 flex items-center gap-1 shrink-0">
              <Info size={12} className="text-gray-400 shrink-0" />
              <span>Ordem cronológica</span>
            </div>

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 border ${
                showAdvancedFilters
                  ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-950/20 dark:border-blue-900/30 dark:text-blue-400'
                  : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
              }`}
            >
              <Filter size={13} />
              <span>{showAdvancedFilters ? 'Ocultar Filtros' : 'Mais Filtros'}</span>
            </button>
          </div>
        </div>

        {/* Expandable Advanced Filters Drawer */}
        {showAdvancedFilters && (
          <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border border-gray-150 dark:border-gray-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 animate-in slide-in-from-top-2 duration-200">
            {/* Product Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto Alvo</label>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-950 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Todos os Produtos</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
            </div>

            {/* Operator Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Operador</label>
              <input
                type="text"
                placeholder="Nome do operador..."
                value={filterOperator}
                onChange={(e) => setFilterOperator(e.target.value)}
                className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>

            {/* Shift Filter */}
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Turno / Fecho</label>
              <input
                type="text"
                placeholder="Ex: TURNO-01..."
                value={filterShift}
                onChange={(e) => setFilterShift(e.target.value)}
                className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500 placeholder-gray-400"
              />
            </div>

            {/* Date Interval */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Início</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Fim</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-900 dark:text-white rounded-lg outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Clear Filter Bar footer */}
        {(filterProduct || filterOperator || filterShift || startDate || endDate || searchTerm || activeTab !== 'ALL') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleClearFilters}
              className="px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-lg transition-all"
            >
              Limpar Filtros Activos
            </button>
          </div>
        )}
      </div>

      {/* Streamlined, Highly Readable Ledger Table */}
      <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/40 border-b border-gray-150 dark:border-gray-700">
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data & ID</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipo Operação</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Qtd</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Saldo Final</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Operador / Turno</th>
                <th className="py-3 px-5 text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-gray-400 dark:text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                      <History size={36} className="text-gray-300 dark:text-gray-600" />
                      <span className="font-bold text-xs text-gray-700 dark:text-gray-300">Nenhum evento encontrado</span>
                      <p className="text-[11px] text-gray-400 leading-normal">Não foram encontradas transações de stock que correspondam aos filtros de pesquisa indicados.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedLedger.map((entry) => {
                  // Style Type Badge
                  let typeLabel = '';
                  let typeBadge = '';
                  let iconElement = null;
                  
                  switch (entry.type) {
                    case StockLedgerType.ENTRADA_COMPRA:
                      typeLabel = 'Entrada Compra';
                      typeBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                      iconElement = <ArrowDownLeft size={12} className="text-emerald-600 dark:text-emerald-400" />;
                      break;
                    case StockLedgerType.SAIDA_VENDA:
                      typeLabel = 'Saída Venda';
                      typeBadge = 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
                      iconElement = <ArrowUpRight size={12} className="text-blue-600 dark:text-blue-400" />;
                      break;
                    case StockLedgerType.DEVOLUCAO:
                      typeLabel = 'Devolução';
                      typeBadge = 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
                      iconElement = <RefreshCw size={12} className="text-purple-600 dark:text-purple-400" />;
                      break;
                    case StockLedgerType.AJUSTE_INVENTARIO:
                      typeLabel = 'Ajuste Físico';
                      typeBadge = 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                      iconElement = <TrendingUp size={12} className="text-amber-600 dark:text-amber-400" />;
                      break;
                  }

                  // Determine Quantity sign visual
                  const isNegativeChange = entry.type === StockLedgerType.SAIDA_VENDA || 
                                           (entry.type === StockLedgerType.AJUSTE_INVENTARIO && entry.quantity < 0);
                  const displayQty = Math.abs(entry.quantity);
                  const qtyColor = isNegativeChange ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400';
                  const qtySymbol = isNegativeChange ? '-' : '+';

                  return (
                    <tr 
                      key={entry.id} 
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-900/20 transition-all text-xs"
                    >
                      {/* Date & ID (Stacked) */}
                      <td className="py-3 px-5 leading-relaxed">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {new Date(entry.timestamp).toLocaleDateString()}
                        </div>
                        <div className="font-mono text-[9px] text-gray-400 dark:text-gray-500 uppercase">
                          {entry.id}
                        </div>
                      </td>

                      {/* Produto (Stacked) */}
                      <td className="py-3 px-5 max-w-[200px] truncate leading-relaxed">
                        <div className="font-semibold text-gray-900 dark:text-white truncate">
                          {entry.productName}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                          ID: {entry.productId}
                        </div>
                      </td>

                      {/* Tipo de Movimento Badge */}
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full border ${typeBadge}`}>
                          {iconElement}
                          {typeLabel}
                        </span>
                      </td>

                      {/* Quantidade (Sinalizada & Formatada) */}
                      <td className={`py-3 px-5 text-right font-mono font-bold text-sm ${qtyColor}`}>
                        {qtySymbol}{displayQty}
                      </td>

                      {/* Stock Resultante (SALDO running balance) */}
                      <td className="py-3 px-5 text-right font-mono font-bold text-gray-900 dark:text-white bg-gray-50/20 dark:bg-gray-900/5">
                        {entry.resultantStock} un
                      </td>

                      {/* Operador & Turno (Stacked) */}
                      <td className="py-3 px-5 leading-relaxed">
                        <div className="font-medium text-gray-800 dark:text-gray-200">
                          {entry.operatorName}
                        </div>
                        <div className="font-mono text-[9px] text-gray-400 dark:text-gray-500">
                          {entry.shiftId}
                        </div>
                      </td>

                      {/* Ações de Detalhes (Auditoria) */}
                      <td className="py-3 px-5 text-center">
                        <button
                          onClick={() => setSelectedEntry(entry)}
                          className="px-2.5 py-1 text-[11px] font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-800 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors inline-flex items-center gap-1"
                          title="Auditar Detalhes do Evento"
                        >
                          <Eye size={12} />
                          <span>Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {filteredLedger.length > 0 && (
          <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-150 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
            <span className="font-medium">Mostrando {paginatedLedger.length} de {filteredLedger.length} registos</span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={activePage === 1} 
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronLeft size={16}/>
              </button>
              <span className="font-medium px-2">Pág. {activePage} / {totalPages || 1}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={activePage === totalPages} 
                className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"
              >
                <ChevronRight size={16}/>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Manual Stock Adjustment Event Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl max-w-lg w-full shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-150 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Registar Ajuste / Fluxo Físico</h3>
                  <p className="text-[10px] text-gray-400">Inserir nova transação no ledger definitivo de stock</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body / Form */}
            <form onSubmit={handleSaveAdjustment} className="p-5 overflow-y-auto space-y-4">
              
              <div className="p-3 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400 flex gap-2">
                <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold block">Regra de Integridade e Rastreabilidade</span>
                  <span>Este registo é irreversível. O sistema proíbe modificações e eliminações após a gravação por conformidade de auditoria.</span>
                </div>
              </div>

              {/* Product Selection */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Produto Alvo *</label>
                <select
                  required
                  value={newAdjProductId}
                  onChange={(e) => setNewAdjProductId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-950 dark:text-white"
                >
                  <option value="">Selecione um Produto...</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (Stock Atual: {p.stock})</option>
                  ))}
                </select>
              </div>

              {/* Type Selection */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tipo de Evento *</label>
                  <select
                    value={newAdjType}
                    onChange={(e) => {
                      const val = e.target.value as StockLedgerType;
                      setNewAdjType(val);
                      if (val === StockLedgerType.ENTRADA_COMPRA || val === StockLedgerType.DEVOLUCAO) {
                        setNewAdjDirection('UP');
                      } else if (val === StockLedgerType.SAIDA_VENDA) {
                        setNewAdjDirection('DOWN');
                      }
                    }}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-950 dark:text-white"
                  >
                    <option value={StockLedgerType.AJUSTE_INVENTARIO}>Ajuste de Inventário</option>
                    <option value={StockLedgerType.ENTRADA_COMPRA}>Entrada por Compra</option>
                    <option value={StockLedgerType.DEVOLUCAO}>Devolução</option>
                    <option value={StockLedgerType.SAIDA_VENDA}>Saída por Venda</option>
                  </select>
                </div>

                {/* Adjustment Direction (only for AJUSTE_INVENTARIO) */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sentido do Fluxo</label>
                  {newAdjType === StockLedgerType.AJUSTE_INVENTARIO ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewAdjDirection('UP')}
                        className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          newAdjDirection === 'UP' 
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' 
                            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700'
                        }`}
                      >
                        Entrada (+ Soma)
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewAdjDirection('DOWN')}
                        className={`py-2 text-[11px] font-bold rounded-lg border transition-all ${
                          newAdjDirection === 'DOWN' 
                            ? 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400' 
                            : 'bg-gray-50 border-gray-200 text-gray-500 dark:bg-gray-900 dark:border-gray-700'
                        }`}
                      >
                        Saída (- Sub)
                      </button>
                    </div>
                  ) : (
                    <div className="py-2 text-[10px] font-bold text-gray-500 px-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                      Definido pelo tipo
                    </div>
                  )}
                </div>
              </div>

              {/* Quantity, Shift & Doc Ref */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Quantidade Absoluta *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAdjQuantity || ''}
                    onChange={(e) => setNewAdjQuantity(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs font-mono font-bold text-gray-950 dark:text-white"
                    placeholder="Ex: 10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Turno / Identificador</label>
                  <input
                    type="text"
                    required
                    value={newAdjShift}
                    onChange={(e) => setNewAdjShift(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-950 dark:text-white"
                    placeholder="Ex: TURNO-01"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Doc. Referência (Opcional)</label>
                  <input
                    type="text"
                    value={newAdjDocRef}
                    onChange={(e) => setNewAdjDocRef(e.target.value)}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-950 dark:text-white font-mono"
                    placeholder="Ex: DOC-2026-X"
                  />
                </div>
              </div>

              {/* Observations */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Motivo / Observação *</label>
                <textarea
                  required
                  rows={2}
                  value={newAdjObservations}
                  onChange={(e) => setNewAdjObservations(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-1 focus:ring-blue-500 text-xs text-gray-950 dark:text-white"
                  placeholder="Justifique o motivo do ajuste físico ou inventário..."
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-700 dark:text-gray-300 font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl transition-all shadow-sm"
                >
                  Registar no Ledger
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Entry Details Auditor Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl max-w-md w-full p-5 shadow-2xl animate-in zoom-in-95 duration-200 space-y-4">
            
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-lg">
                  <History size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">Auditoria de Evento</h3>
                  <span className="block font-mono text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{selectedEntry.id}</span>
                </div>
              </div>
              <button 
                onClick={() => setSelectedEntry(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content list */}
            <div className="space-y-3.5 divide-y divide-gray-100 dark:divide-gray-700 text-xs">
              
              {/* Product */}
              <div className="pt-0 pb-2">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Produto Alvo</span>
                <span className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-1">
                  <Package size={14} className="text-gray-400" />
                  {selectedEntry.productName}
                </span>
                <span className="text-[10px] text-gray-400 font-mono block mt-0.5">ID: {selectedEntry.productId}</span>
              </div>

              {/* Details Grid */}
              <div className="py-2.5 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Operação</span>
                  <span className="font-semibold text-gray-900 dark:text-white text-xs">
                    {selectedEntry.type.replace('_', ' ')}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Quantidade</span>
                  <span className={`font-bold text-xs ${
                    selectedEntry.type === StockLedgerType.SAIDA_VENDA || 
                    (selectedEntry.type === StockLedgerType.AJUSTE_INVENTARIO && selectedEntry.quantity < 0)
                      ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                  }`}>
                    {selectedEntry.quantity > 0 ? '+' : ''}{selectedEntry.quantity} unidades
                  </span>
                </div>
              </div>

              {/* Resultant Stock & Shift */}
              <div className="py-2.5 grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Stock Resultante</span>
                  <span className="font-bold text-gray-900 dark:text-white text-xs font-mono">
                    {selectedEntry.resultantStock} un
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Turno Associado</span>
                  <span className="font-mono text-xs text-gray-700 dark:text-gray-300">
                    {selectedEntry.shiftId}
                  </span>
                </div>
              </div>

              {/* Timestamp and Operator */}
              <div className="py-2.5 grid grid-cols-1 gap-2.5">
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Data & Hora</span>
                  <span className="text-gray-700 dark:text-gray-300">
                    {new Date(selectedEntry.timestamp).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Operador Responsável</span>
                  <span className="text-gray-700 dark:text-gray-300 font-semibold flex items-center gap-1">
                    {selectedEntry.operatorName} ({selectedEntry.operatorId})
                  </span>
                </div>
              </div>

              {/* Document Reference */}
              <div className="py-2.5">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Documento Referência</span>
                {selectedEntry.documentRef ? (
                  <span className="font-mono text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-1.5 py-0.5 rounded">
                    {selectedEntry.documentRef}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">Sem documento associado</span>
                )}
              </div>

              {/* Observations */}
              <div className="py-2.5">
                <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-0.5">Justificação / Motivo</span>
                <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed font-medium bg-gray-50 dark:bg-gray-900 p-2.5 rounded-lg border border-gray-100 dark:border-gray-800">
                  {selectedEntry.observations || 'Nenhuma observação registada.'}
                </p>
              </div>
            </div>

            {/* Footer lock note */}
            <div className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl border border-gray-100 dark:border-gray-800 text-[9px] text-gray-400 leading-normal flex gap-1.5">
              <Sparkles size={12} className="text-blue-500 shrink-0 mt-0.5" />
              <span>Assinatura Digital de Integridade: Esta transação foi selada e é imutável por conformidade fiscal e operacional.</span>
            </div>

            <button
              onClick={() => setSelectedEntry(null)}
              className="w-full py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-650 text-gray-800 dark:text-gray-200 font-bold text-xs rounded-xl transition-all"
            >
              Fechar Auditoria
            </button>
          </div>
        </div>
      )}

    </div>
  );
};

export default StockTracking;
