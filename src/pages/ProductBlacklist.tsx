
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, 
  Printer, 
  FileSpreadsheet, 
  Lock, 
  AlertTriangle,
  TrendingDown,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, AppConfig, ToastType } from '../types';
import { generateBlacklistReportHtml } from '../utils/receipt';
import { useToast } from '../contexts/ToastContext';

interface ProductBlacklistProps {
  config: AppConfig;
}

const ProductBlacklist: React.FC<ProductBlacklistProps> = ({ config }) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts(true));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Preview State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Dynamic Category Extraction
  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category).filter(Boolean));
    return Array.from(cats);
  }, [products]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, statusFilter]);

  const handleToggleBlacklist = (product: Product) => {
    try {
      const updatedProduct = { ...product, isBlacklisted: !product.isBlacklisted };
      setProducts(prev => prev.map(p => p.id === product.id ? updatedProduct : p));
      StorageService.saveProduct(updatedProduct);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar o produto.';
      showToast(msg, ToastType.ERROR);
    }
  };

  const displayedProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.code.toLowerCase().includes(lower) || 
        p.category.toLowerCase().includes(lower)
      );
    }
    
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (statusFilter === 'BLACKLISTED') {
      filtered = filtered.filter(p => p.isBlacklisted);
    } else if (statusFilter === 'ACTIVE') {
      filtered = filtered.filter(p => !p.isBlacklisted);
    }

    return filtered;
  }, [products, searchTerm, selectedCategory, statusFilter]);

  const totalPages = Math.ceil(displayedProducts.length / itemsPerPage) || 1;
  const paginatedProducts = displayedProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getBlacklistedItems = useCallback(() => products.filter(p => p.isBlacklisted), [products]);

  const handlePrint = () => {
    const html = generateBlacklistReportHtml(products, config); 
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
        doc.open(); doc.write(html); doc.close();
        iframe.contentWindow?.focus(); iframe.contentWindow?.print();
    }
    setTimeout(() => document.body.removeChild(iframe), 2000);
    setIsPreviewOpen(false);
  };
  
  const handleExportExcel = () => {
    const blacklist = getBlacklistedItems();
    if (blacklist.length === 0) {
        showToast("Nada para exportar.", ToastType.WARNING);
        return;
    }
    const headers = ["Codigo", "Produto", "Categoria", "Stock_Retido", "Custo_Unit_MZN"];
    const rows = blacklist.map(p => [p.code, `"${p.name}"`, p.category, p.stock, p.cost].join(";"));
    const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Lista_Negra_${new Date().toISOString().slice(0,10)}.csv`);
    link.click();
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';

  const auditSummary = useMemo(() => {
      const list = getBlacklistedItems();
      const totalLoss = list.reduce((acc, p) => acc + (p.stock * p.cost), 0);
      return { totalItems: list.length, totalLoss };
  }, [getBlacklistedItems]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Lock className="text-red-500" size={24} /> Lista Negra de Produtos</h1>
          <p className="text-gray-500 text-sm">Controle de visibilidade. Itens bloqueados não aparecem no PDV.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Campo de Busca */}
          <div className="relative flex-1 min-w-[200px] md:flex-none">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome, código ou categoria..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)} 
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm w-full md:w-64 outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" 
              />
          </div>

          {/* Filtro de Categoria */}
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="ALL">Todas as Categorias</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Filtro de Estado */}
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-200 outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="ALL">Todos os Produtos</option>
            <option value="BLACKLISTED">Apenas Bloqueados</option>
            <option value="ACTIVE">Apenas Visíveis (Ativos)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100 flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-red-600 uppercase mb-1">Prejuízo Bruto Estimado</p><p className="text-xl font-black text-red-700">{formatCurrency(auditSummary.totalLoss)}</p></div>
              <TrendingDown className="text-red-500 opacity-50" size={32} />
          </div>
          <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-xl border border-gray-200 flex items-center justify-between">
              <div><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Total de SKUs Bloqueados</p><p className="text-xl font-black">{auditSummary.totalItems} referências</p></div>
              <AlertTriangle className="text-orange-500 opacity-50" size={32} />
          </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 rounded-t-xl border-x border-t flex justify-between items-center flex-wrap gap-2">
        <div className="flex gap-2">
            <button onClick={() => setIsPreviewOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-700 border rounded-lg text-xs font-bold hover:bg-gray-100 transition-all"><Printer size={16} className="text-blue-600" /> Previsualizar A4</button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 text-green-600 rounded-lg text-xs font-bold transition-all"><FileSpreadsheet size={16} /> Exportar Excel</button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-b-xl shadow-sm border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 font-semibold">
              <tr><th className="px-6 py-4 w-32">Cód. Barras</th><th className="px-6 py-4">Produto</th><th className="px-6 py-4">Categoria</th><th className="px-6 py-4 text-center">Stock</th><th className="px-6 py-4 text-center">Venda Ativa</th></tr>
            </thead>
            <tbody className="divide-y">
              {paginatedProducts.map(product => (
                    <tr key={product.id} className={`transition-colors ${product.isBlacklisted ? 'bg-red-50/50 dark:bg-red-900/5' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                        <td className="px-6 py-4 font-mono text-xs">{product.code}</td>
                        <td className="px-6 py-4">
                          <div className={`font-bold ${product.isBlacklisted ? 'text-red-700' : 'text-gray-900 dark:text-white'}`}>{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 font-normal">
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500">{product.category}</td>
                        <td className="px-6 py-4 text-center font-bold">{product.stock}</td>
                        <td className="px-6 py-4 text-center">
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" className="sr-only peer" checked={!product.isBlacklisted} onChange={() => handleToggleBlacklist(product)} />
                                <div className="w-11 h-6 bg-red-600 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:bg-green-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                            </label>
                        </td>
                    </tr>
              ))}
            </tbody>
          </table>
          
          <div className="p-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-250 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
              <span className="font-medium text-gray-500 dark:text-gray-400">
                Mostrando {paginatedProducts.length} de {displayedProducts.length} registos
              </span>
              {displayedProducts.length > 0 && (
                <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                      disabled={currentPage === 1} 
                      className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                      <ChevronLeft size={16}/>
                    </button>
                    <span className="font-medium text-gray-700 dark:text-gray-300 px-2 select-none">
                      Pág. {currentPage} / {totalPages}
                    </span>
                    <button 
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                      disabled={currentPage === totalPages} 
                      className="p-1.5 border border-gray-200 dark:border-gray-700 rounded-lg disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors cursor-pointer text-gray-700 dark:text-gray-300"
                    >
                      <ChevronRight size={16}/>
                    </button>
                </div>
              )}
          </div>
      </div>

      {/* MODAL PREVISUALIZAÇÃO */}
      {isPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white dark:bg-gray-800 w-full max-w-5xl h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
                  <div className="p-4 border-b flex justify-between items-center bg-white dark:bg-gray-800">
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <h3 className="font-bold">Guia de Auditoria de Produtos Bloqueados</h3>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={handlePrint} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2"><Printer size={18} /> IMPRIMIR</button>
                        <button onClick={() => setIsPreviewOpen(false)} className="p-2 text-gray-400 hover:text-red-500"><X size={24} /></button>
                      </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-10 bg-gray-200 dark:bg-gray-950 flex justify-center custom-scrollbar">
                      <div className="bg-white text-black w-[210mm] min-h-[297mm] p-[20mm] shadow-2xl" dangerouslySetInnerHTML={{ __html: generateBlacklistReportHtml(products, config) }}></div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ProductBlacklist;
