
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  FileSpreadsheet, 
  Edit2, 
  X,
  ChevronLeft,
  ChevronRight,
  Save,
  Tag,
  Box
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, AppConfig, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';

interface PriceListProps {
  config: AppConfig;
}

const PriceList: React.FC<PriceListProps> = ({ config }) => {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Filter Logic
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.code.toLowerCase().includes(lower)
    );
  }, [products, searchTerm]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  // Actions
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;

    const formData = new FormData(e.currentTarget);
    const newCost = parseFloat(formData.get('cost') as string);
    const newPrice = parseFloat(formData.get('price') as string);

    const updatedProduct = {
        ...editingProduct,
        cost: newCost,
        price: newPrice
    };

    try {
      StorageService.saveProduct(updatedProduct);
      setProducts(StorageService.getProducts()); 
      setIsModalOpen(false);
      setEditingProduct(null);
      showToast('Preço do produto atualizado com sucesso!', ToastType.SUCCESS);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao atualizar preço do produto.';
      showToast(msg, ToastType.ERROR);
    }
  };

  const handleOpenPreview = (_type: 'PUBLIC' | 'INTERNAL' = 'PUBLIC') => {
      const listToPrint = filteredProducts.length > 0 ? filteredProducts : products;
      DocumentGenerator.Vendas.gerarTabelaPrecos(listToPrint, config);
  };

  const handleExportExcel = () => {
      const productsToExport = filteredProducts.length > 0 ? filteredProducts : products;
      
      const headers = ["Codigo", "Produto", "Categoria", "Subcategoria", "Validade", "Stock", "Preco Custo", "Preco Venda", "Valor Stock"];
      const csvRows = productsToExport.map(p => {
          return [
              p.code,
              `"${p.name.replace(/"/g, '""')}"`,
              p.category,
              p.subcategory || '-',
              p.expiryDate || '-',
              p.stock,
              p.cost.toString().replace('.', ','),
              p.price.toString().replace('.', ','),
              (p.stock * p.cost).toString().replace('.', ',')
          ].join(";");
      });

      const csvContent = "data:text/csv;charset=utf-8," + headers.join(";") + "\n" + csvRows.join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      const today = new Date().toISOString().split('T')[0];
      link.setAttribute("download", `Tabela_Precos_${today}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + 'MT';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <Tag className="text-blue-600" />
            Lista de Preços
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gestão de custos e preçário agrupado por subcategorias.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Pesquisar por Nome ou Código..." 
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
            </div>
            
            <div className="flex gap-2">
                <button 
                  onClick={() => handleOpenPreview('PUBLIC')} 
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 text-blue-600 rounded-xl border border-blue-100 font-bold text-xs transition-colors" 
                  title="Gerar Catálogo para Clientes"
                >
                    <Printer size={16} /> Catálogo (A4)
                </button>
                <button 
                  onClick={() => handleOpenPreview('INTERNAL')} 
                  className="flex items-center gap-2 px-4 py-2 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 text-purple-600 rounded-xl border border-purple-100 font-bold text-xs transition-colors" 
                  title="Gerar Tabela Técnica Interna"
                >
                    <Box size={16} /> Técnica (A4)
                </button>
                <button 
                  onClick={handleExportExcel} 
                  className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 text-green-600 rounded-xl border border-green-100 font-bold text-xs transition-colors" 
                  title="Exportar CSV Completo"
                >
                    <FileSpreadsheet size={16} /> Excel
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 w-32 tracking-wider text-xs uppercase">C. Barras</th>
                <th className="px-6 py-4 tracking-wider text-xs uppercase">Nome</th>
                <th className="px-6 py-4 tracking-wider text-xs uppercase">Subcategoria</th>
                <th className="px-6 py-4 text-center tracking-wider text-xs uppercase">Validade</th>
                <th className="px-6 py-4 text-right tracking-wider text-xs uppercase">Preço de Compra</th>
                <th className="px-6 py-4 text-right tracking-wider text-xs uppercase">Preço de Venda</th>
                <th className="px-6 py-4 text-center w-20 tracking-wider text-xs uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedProducts.length === 0 ? (
                  <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                          Nenhum produto encontrado.
                      </td>
                  </tr>
              ) : (
                paginatedProducts.map(product => (
                    <tr 
                        key={product.id} 
                        onClick={() => openEditModal(product)}
                        className="hover:bg-blue-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                    >
                        <td className="px-6 py-4 font-mono text-xs text-gray-500">{product.code}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                          {product.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 whitespace-normal">
                              {product.description}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                            <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-[10px] font-bold uppercase">
                                {product.subcategory || 'Diversos'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center text-[10px] font-bold text-gray-400">
                          {product.expiryDate ? new Date(product.expiryDate).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-6 py-4 text-right text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300">
                            {formatCurrency(product.cost)}
                        </td>
                        <td className="px-6 py-4 text-right">
                            <span className="font-bold text-blue-600 dark:text-blue-400 text-base">
                                {formatCurrency(product.price)}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                            <button className="text-gray-400 hover:text-blue-600 p-2 rounded-full hover:bg-white dark:bg-gray-600 transition-all">
                                <Edit2 size={16} />
                            </button>
                        </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">
                Mostrando {paginatedProducts.length} de {filteredProducts.length} registos
            </span>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronLeft size={16} />
                </button>
                <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                <button 
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="p-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
      </div>

      {isModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                            <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                            <span className="text-lg font-black tracking-tighter">E</span>
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white">Editar Preços</h3>
                            <p className="text-xs text-gray-500 mt-0.5 max-w-[250px] truncate">{editingProduct.name}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSave} className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Preço de Compra (Custo)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-gray-400 text-sm font-bold">MT</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    name="cost" 
                                    defaultValue={editingProduct.cost} 
                                    className="w-full pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-medium"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Preço de Venda (Final)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-blue-500 text-sm font-bold">MT</span>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    name="price" 
                                    defaultValue={editingProduct.price} 
                                    autoFocus
                                    className="w-full pl-10 pr-3 py-3 border-2 border-blue-100 dark:border-blue-900 bg-white dark:bg-gray-800 rounded-lg focus:border-blue-500 focus:ring-0 outline-none text-xl font-bold text-gray-900 dark:text-white"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-2">
                        <button 
                            type="button" 
                            onClick={() => setIsModalOpen(false)} 
                            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit" 
                            className="flex items-center gap-2 px-6 py-2 text-sm font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-transform active:scale-95"
                        >
                            <Save size={16} />
                            Guardar Alterações
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {/* --- MODAL DE PREVISUALIZAÇÃO A4 --- */}
    </div>
  );
};

export default PriceList;
