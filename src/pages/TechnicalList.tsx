
import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Printer, 
  ChevronLeft,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { DocumentGenerator } from '../services/documentGenerators';
import { Product, AppConfig } from '../types';

interface TechnicalListProps {
  config: AppConfig;
}

const TechnicalList: React.FC<TechnicalListProps> = ({ config }) => {
  const [products] = useState<Product[]>(() => StorageService.getProducts());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;
    const lower = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lower) || 
      p.code.toLowerCase().includes(lower)
    );
  }, [products, searchTerm]);

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

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';

  const handlePrint = () => {
    const list = filteredProducts.length > 0 ? filteredProducts : products;
    if (list.length > 0) {
        DocumentGenerator.Vendas.gerarListaTecnicaCompleta(list, config);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ClipboardList className="text-blue-600" />
            Lista Técnica
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Visualização técnica de produtos e valores financeiros.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Pesquisar..." 
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <button 
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-colors shadow-lg shadow-blue-500/20"
          >
            <Printer size={18} /> Imprimir Lista
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-6 py-4 tracking-wider text-xs uppercase text-left">Código B.</th>
                <th className="px-6 py-4 tracking-wider text-xs uppercase text-left">Nome</th>
                <th className="px-6 py-4 text-right tracking-wider text-xs uppercase">Preço de Compra</th>
                <th className="px-6 py-4 text-right tracking-wider text-xs uppercase">Preço de Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {paginatedProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-gray-400 italic">
                    Nenhum produto encontrado.
                  </td>
                </tr>
              ) : (
                paginatedProducts.map(product => (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-500">{product.code}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900 dark:text-white uppercase">{product.name}</div>
                      {product.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 normal-case font-normal whitespace-normal max-w-sm">
                          {product.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-600 dark:text-gray-300">
                      {formatCurrency(product.cost)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-blue-600 dark:text-blue-400">
                        {formatCurrency(product.price)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredProducts.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center text-xs text-gray-500">
            <span className="font-medium">
              Mostrando {paginatedProducts.length} de {filteredProducts.length} registos
            </span>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
              <button 
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicalList;
