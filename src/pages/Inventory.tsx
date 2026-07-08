
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Edit2, 
  Search, 
  Printer, 
  FileSpreadsheet, 
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  DollarSign,
  Package,
  X
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, AppConfig, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';

interface InventoryProps {
  config: AppConfig;
  pageTitle?: string;
  filterMode?: 'ALL' | 'BLACKLIST' | 'IVA_ONLY';
}

const Inventory: React.FC<InventoryProps> = ({ config, pageTitle = 'Gestão de Armazém', filterMode = 'ALL' }) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Product | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  
  const searchRef = useRef<HTMLInputElement>(null);

  // Return focus to search bar whenever the modal is closed
  useEffect(() => {
    if (!isModalOpen) {
      const timer = setTimeout(() => {
        searchRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen]);
  
  // Export/Preview State
  const [exportLowStockOnly, setExportLowStockOnly] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'EXPIRED' | 'NEAR_EXPIRY'>('ALL');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm, filterMode, exportLowStockOnly, expiryFilter]);

  const inventoryStats = useMemo(() => {
      const list = products;
      const skus = list.length;
      const totalCostValue = list.reduce((acc, p) => acc + (p.stock * p.cost), 0);
      const totalSalesValue = list.reduce((acc, p) => acc + (p.stock * p.price), 0);
      return { skus, totalCostValue, totalSalesValue };
  }, [products]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code = formData.get('code') as string;
    const id = editingProduct ? editingProduct.id : Date.now().toString();

    // Check for duplicate barcode across all products and kits (including blacklisted/restricted ones)
    if (!StorageService.isBarcodeUnique(code, id)) {
        showToast('Já existe um produto ou kit com este código de barras.', ToastType.ERROR);
        return;
    }
    
    const newProduct: Product = {
      id,
      code,
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      brand: formData.get('brand') as string,
      category: formData.get('category') as string,
      subcategory: formData.get('subcategory') as string,
      price: parseFloat(formData.get('price') as string),
      cost: parseFloat(formData.get('cost') as string),
      stock: parseInt(formData.get('stock') as string),
      minStock: parseInt(formData.get('minStock') as string),
      expiryDate: formData.get('expiryDate') as string || undefined,
      isBlacklisted: formData.get('isBlacklisted') === 'on',
      ivaEnabled: config.ivaEnabled ? formData.get('ivaEnabled') === 'on' : (editingProduct?.ivaEnabled ?? true)
    };

    try {
      StorageService.saveProduct(newProduct);
      setProducts(StorageService.getProducts());
      setIsModalOpen(false);
      setEditingProduct(null);
      showToast(editingProduct ? 'Produto atualizado com sucesso!' : 'Produto criado com sucesso!', ToastType.SUCCESS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar o produto.';
      showToast(msg, ToastType.ERROR);
    }
  };

  const openModal = (product?: Product) => {
    setEditingProduct(product || null);
    setIsModalOpen(true);
  };

  const getExpiryStatus = (expiryDateStr?: string) => {
    if (!expiryDateStr) return { label: '-', className: 'text-gray-500 dark:text-dark-text-muted' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const expDate = new Date(expiryDateStr);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { 
        label: `${expDate.toLocaleDateString()} (Vencido)`, 
        className: 'text-red-600 dark:text-red-400 font-bold bg-red-100 dark:bg-red-950/40 px-2.5 py-1 rounded-lg text-xs' 
      };
    } else if (diffDays <= 30) {
      return { 
        label: `${expDate.toLocaleDateString()} (${diffDays === 0 ? 'Vence hoje' : `Vence em ${diffDays} dias`})`, 
        className: 'text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1 rounded-lg text-xs' 
      };
    }
    
    return { 
      label: expDate.toLocaleDateString(), 
      className: 'text-gray-750 dark:text-dark-text' 
    };
  };

  const filteredProducts = useMemo(() => {
    let filtered = [...products];
    if (filterMode === 'BLACKLIST') filtered = filtered.filter(p => p.isBlacklisted);
    if (filterMode === 'IVA_ONLY') filtered = filtered.filter(p => p.ivaEnabled);
    if (exportLowStockOnly) filtered = filtered.filter(p => p.stock <= p.minStock);
    
    // Expiry filters
    if (expiryFilter === 'EXPIRED') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      filtered = filtered.filter(p => {
        if (!p.expiryDate) return false;
        return new Date(p.expiryDate) < today;
      });
    } else if (expiryFilter === 'NEAR_EXPIRY') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDays = new Date();
      thirtyDays.setDate(today.getDate() + 30);
      thirtyDays.setHours(23, 59, 59, 999);
      filtered = filtered.filter(p => {
        if (!p.expiryDate) return false;
        const exp = new Date(p.expiryDate);
        return exp >= today && exp <= thirtyDays;
      });
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(lower) || 
        p.code.toLowerCase().includes(lower) ||
        (p.brand && p.brand.toLowerCase().includes(lower))
      );
    }
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = (a[sortConfig.key!] || '').toString().toLowerCase();
        const valB = (b[sortConfig.key!] || '').toString().toLowerCase();
        if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return filtered;
  }, [products, filterMode, searchTerm, sortConfig, exportLowStockOnly, expiryFilter]);

  const handleSort = (key: keyof Product) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrint = () => {
    DocumentGenerator.Armazem.gerarRelatorioStock(filteredProducts, config);
  };

  const handleExportExcel = () => {
      const list = filteredProducts;
      const headers = ["Codigo", "Produto", "Categoria", "Stock Atual", "Custo Unit.", "Preco Venda"];
      const rows = list.map(p => [p.code, `"${p.name.replace(/"/g, '""')}"`, p.category, p.stock, p.cost, p.price].join(';'));
      const csvContent = headers.join(';') + "\n" + rows.join('\n');
      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Inventario_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-5 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">Total SKUs</p><h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text">{inventoryStats.skus}</h3></div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-600 dark:text-blue-400"><Package size={24} /></div>
          </div>
          <div className="card p-5 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">Custo Total Stock</p><h3 className="text-2xl font-bold text-teal-600 dark:text-teal-400">{formatCurrency(inventoryStats.totalCostValue)}</h3></div>
              <div className="p-3 bg-teal-50 dark:bg-teal-900/20 rounded-xl text-teal-600 dark:text-teal-400"><DollarSign size={24} /></div>
          </div>
          <div className="card p-5 flex justify-between items-center">
              <div><p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider mb-1">Valor Venda Stock</p><h3 className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(inventoryStats.totalSalesValue)}</h3></div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-blue-700 dark:text-blue-400"><TrendingUp size={24} /></div>
          </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text">{pageTitle}</h1>
          <p className="text-gray-500 dark:text-dark-text-muted text-sm">Gerenciamento completo do catálogo.</p>
        </div>
        <div className="flex items-center gap-3">
            <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input ref={searchRef} type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text text-sm w-64 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={() => openModal()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-lg shadow-blue-500/20"><Plus size={18} /> Novo</button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card p-3 rounded-xl border border-gray-200 dark:border-dark-border flex flex-col lg:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-dark-text-muted uppercase cursor-pointer">
              <input type="checkbox" checked={exportLowStockOnly} onChange={e => setExportLowStockOnly(e.target.checked)} className="w-4 h-4 rounded text-blue-600" />
              Filtrar Alertas de Reposição
          </label>
          <div className="h-4 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
          <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase">Validade:</span>
              <select 
                value={expiryFilter} 
                onChange={e => setExpiryFilter(e.target.value as 'ALL' | 'EXPIRED' | 'NEAR_EXPIRY')}
                className="px-2 py-1 border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg rounded-lg text-xs text-gray-700 dark:text-gray-200 shadow-sm outline-none focus:ring-1 focus:ring-blue-500 font-semibold cursor-pointer"
              >
                <option value="ALL">Todas as Validades</option>
                <option value="EXPIRED">Vencidos</option>
                <option value="NEAR_EXPIRY">Próximos a Vencer (30 dias)</option>
              </select>
          </div>
        </div>
        <div className="flex gap-2 w-full lg:w-auto justify-end">
            <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-xs font-bold text-gray-700 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-white/5 transition-all"><Printer size={16} className="text-blue-600" /> Imprimir A4</button>
            <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 rounded-lg text-xs font-bold transition-all"><FileSpreadsheet size={16} /> Excel</button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-dark-text-muted font-semibold">
              <tr>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" onClick={() => handleSort('code')}>Código</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" onClick={() => handleSort('name')}>Produto</th>
                <th className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10 transition-colors" onClick={() => handleSort('category')}>Categoria</th>
                <th className="px-6 py-4 text-center">Validade</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-right">P. Venda</th>
                <th className="px-6 py-4 text-center">Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
              {paginatedProducts.map(product => (
                    <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-500 dark:text-dark-text-muted">{product.code}</td>
                        <td className="px-6 py-4">
                          <div className="font-bold text-gray-900 dark:text-dark-text">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5 font-normal">
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4"><span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[10px] font-bold uppercase text-gray-600 dark:text-dark-text-muted">{product.category}</span></td>
                        <td className="px-6 py-4 text-center text-xs font-medium">
                          {(() => {
                            const status = getExpiryStatus(product.expiryDate);
                            return (
                              <span className={status.className}>
                                {status.label}
                              </span>
                            );
                          })()}
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-gray-900 dark:text-dark-text">{product.stock}</td>
                        <td className="px-6 py-4 text-right font-black text-blue-600 dark:text-blue-400">{formatCurrency(product.price)}</td>
                        <td className="px-6 py-4 text-center"><button onClick={() => openModal(product)} className="text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 p-1.5 rounded transition-colors"><Edit2 size={16} /></button></td>
                    </tr>
              ))}
            </tbody>
          </table>
          <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-dark-border flex justify-between items-center text-xs text-gray-600 dark:text-dark-text-muted">
              <span className="font-medium">Mostrando {paginatedProducts.length} de {filteredProducts.length} registos</span>
              <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-white dark:hover:bg-dark-bg transition-colors"><ChevronLeft size={16}/></button>
                  <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-white dark:hover:bg-dark-bg transition-colors"><ChevronRight size={16}/></button>
              </div>
          </div>
      </div>

      {/* MODAL NOVO/EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-dark-border flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                        <span className="text-lg font-black tracking-tighter">E</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 overflow-y-auto custom-scrollbar space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Nome do Artigo</label>
                        <input required name="name" defaultValue={editingProduct?.name} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Descrição do Produto</label>
                        <textarea name="description" defaultValue={editingProduct?.description} rows={3} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="Ex: Detalhes técnicos, especificações ou observações..." />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Código / SKU</label>
                        <input required name="code" defaultValue={editingProduct?.code} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Categoria</label>
                        <input required name="category" defaultValue={editingProduct?.category} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Preço Venda (MT)</label>
                        <input required type="number" step="0.01" name="price" defaultValue={editingProduct?.price} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Custo Médio (MT)</label>
                        <input required type="number" step="0.01" name="cost" defaultValue={editingProduct?.cost} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Stock Disponível</label>
                        <input required type="number" name="stock" defaultValue={editingProduct?.stock} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text font-bold outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Stock Mínimo</label>
                        <input required type="number" name="minStock" defaultValue={editingProduct?.minStock} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Data de Validade</label>
                        <input type="date" name="expiryDate" defaultValue={editingProduct?.expiryDate} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    {config.ivaEnabled && (
                      <div className="md:col-span-2 flex items-center gap-4 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-dark-border">
                          <label className="flex items-center gap-3 cursor-pointer">
                              <input 
                                type="checkbox" 
                                name="ivaEnabled" 
                                defaultChecked={editingProduct ? (editingProduct.ivaEnabled ?? true) : true} 
                                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500" 
                              />
                              <div className="flex flex-col">
                                  <span className="text-sm font-bold text-gray-900 dark:text-dark-text tracking-tight uppercase">Aplicar IVA ({config.ivaRate}%)</span>
                                  <span className="text-[10px] text-gray-500 font-medium">Se desativado, o produto será isento de imposto nesta venda.</span>
                              </div>
                          </label>
                      </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 mt-8 border-t border-gray-100 dark:border-dark-border pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-bold text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">Salvar Produto</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
