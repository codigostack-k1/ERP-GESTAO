
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Package, 
  Printer, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { DocumentGenerator } from '../services/documentGenerators';
import { Product, AppConfig } from '../types';

interface StockListProps {
  config: AppConfig;
}

const StockList: React.FC<StockListProps> = ({ config }) => {
  const [products] = useState<Product[]>(() => StorageService.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado de Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  // Reset da página ao pesquisar
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [searchTerm]);

  const filteredProducts = products.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.code.includes(searchTerm) || 
      p.category.toLowerCase().includes(searchTerm)
  );

  // Lógica de Paginação
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

  const getStockStatus = (p: Product) => {
    if (p.stock <= 0) return { color: 'bg-red-100 text-red-800 border-red-200', label: 'Sem Stock' };
    if (p.stock <= p.minStock) return { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Baixo Stock' };
    return { color: 'bg-green-100 text-green-800 border-green-200', label: 'Normal' };
  };

  const handlePrint = () => {
    DocumentGenerator.Armazem.gerarRelatorioStock(filteredProducts, config);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="text-blue-600" />
            Lista de Stock
          </h1>
          <p className="text-gray-500 text-sm">Visão geral do inventário e alertas.</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
                <Printer size={18} />
                Imprimir Relatório
            </button>
            <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
                type="text" 
                placeholder="Filtrar stock..." 
                className="pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
            />
        </div>
      </div>
    </div>

    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col min-h-[500px]">
        <div className="flex-1 overflow-x-auto">
          <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
                  <tr>
                      <th className="px-6 py-4 w-24">ID/SKU</th>
                      <th className="px-6 py-4">Produto</th>
                      <th className="px-6 py-4">Categoria</th>
                      <th className="px-6 py-4 text-center">Validade</th>
                      <th className="px-6 py-4 text-center">Stock Atual</th>
                      <th className="px-6 py-4 text-center">Stock Mín.</th>
                      <th className="px-6 py-4 text-center">Status</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {paginatedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400 italic">Nenhum produto encontrado.</td>
                      </tr>
                  ) : (
                    paginatedProducts.map(p => {
                        const status = getStockStatus(p);
                        return (
                            <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                <td className="px-6 py-4 font-mono text-xs text-gray-500">{p.code}</td>
                                <td className="px-6 py-4">
                                  <div className="font-medium text-gray-900 dark:text-white">{p.name}</div>
                                  {p.description && (
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                      {p.description}
                                    </div>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-gray-500">{p.category}</td>
                                <td className={`px-6 py-4 text-center text-xs font-bold ${p.expiryDate && new Date(p.expiryDate) < new Date() ? 'text-red-600' : 'text-gray-400'}`}>
                                  {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-center font-bold text-lg">{p.stock}</td>
                                <td className="px-6 py-4 text-center text-gray-400">{p.minStock}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                                        {status.label.toUpperCase()}
                                    </span>
                                </td>
                            </tr>
                        );
                    })
                  )}
              </tbody>
          </table>
        </div>

        {/* Rodapé com Paginação */}
        <div className="bg-gray-50 dark:bg-gray-900/50 p-4 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-500">
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
                <span className="font-medium px-2">
                    Pág. {currentPage} / {totalPages || 1}
                </span>
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
    </div>
  );
};

export default StockList;
