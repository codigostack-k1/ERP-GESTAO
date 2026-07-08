
import React, { useState, useMemo } from 'react';
import { Truck, Plus, Search, MapPin, Phone, Edit2, X, Trash2, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Supplier, AppConfig } from '../types';
import { generateSupplierListReportHtml } from '../utils/receipt';
import { useConfirm } from '../contexts/ConfirmContext';

interface SupplierManagementProps {
  config: AppConfig;
}

const SupplierManagement: React.FC<SupplierManagementProps> = ({ config }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => StorageService.getSuppliers());
  const { confirm } = useConfirm();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6; // Grid layout with 3 cols looks great with 6 items per page

  // Lógica de filtragem por Nome ou NUIT
  const filteredSuppliers = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase().trim();
    if (!lowerTerm) return suppliers;

    return suppliers.filter(s => 
      s.name.toLowerCase().includes(lowerTerm) || 
      s.nif.toLowerCase().includes(lowerTerm)
    );
  }, [suppliers, searchTerm]);

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginatedSuppliers = useMemo(() => {
    return filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  }, [filteredSuppliers, currentPage, itemsPerPage]);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const supplier: Supplier = {
      id: editingSupplier ? editingSupplier.id : Date.now().toString(),
      name: formData.get('name') as string,
      nif: formData.get('nif') as string,
      contact: formData.get('contact') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      paymentTerms: formData.get('paymentTerms') as string
    };

    StorageService.saveSupplier(supplier);
    setSuppliers(StorageService.getSuppliers());
    setIsModalOpen(false);
    setEditingSupplier(null);
  };

  const openModal = (supplier?: Supplier) => {
    setEditingSupplier(supplier || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const conf = await confirm('Tem certeza que deseja apagar este fornecedor?', {
      title: 'Eliminar Fornecedor',
      type: 'danger',
      confirmText: 'Sim, Apagar'
    });
    if (conf) {
      StorageService.deleteSupplier(id);
      setSuppliers(StorageService.getSuppliers());
    }
  };

  const handlePrint = () => {
    const html = generateSupplierListReportHtml(filteredSuppliers, config);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="text-blue-600" />
            Gestão de Fornecedores
          </h1>
          <p className="text-gray-500 text-sm">Base de dados de parceiros comerciais.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            {/* Barra de Pesquisa */}
            <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Pesquisar por nome ou NUIT..." 
                    value={searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setCurrentPage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                {searchTerm && (
                    <button 
                        onClick={() => {
                            setSearchTerm('');
                            setCurrentPage(1);
                        }}
                        className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            <button 
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 px-4 py-2 rounded-lg transition-colors shadow-sm w-full sm:w-auto font-bold text-sm"
            >
                <Printer size={18} /> Imprimir Lista
            </button>

            <button 
                onClick={() => openModal()}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors shadow-sm w-full sm:w-auto font-bold text-sm"
            >
                <Plus size={18} /> Novo Fornecedor
            </button>
        </div>
      </div>

      {filteredSuppliers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Search size={48} className="text-gray-300 mb-4" />
              <p className="text-gray-500 font-medium">Nenhum fornecedor encontrado para &quot;{searchTerm}&quot;</p>
              <button 
                onClick={() => setSearchTerm('')}
                className="text-blue-600 text-sm font-bold mt-2 hover:underline"
              >
                Limpar filtros
              </button>
          </div>
      ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedSuppliers.map(supplier => (
                  <div key={supplier.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 group hover:border-blue-400 transition-all flex flex-col h-full">
                      <div className="flex justify-between items-start mb-4">
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600">
                              <Truck size={24} />
                          </div>
                          <div className="flex gap-2">
                              <button onClick={() => openModal(supplier)} className="text-gray-400 hover:text-blue-600 p-1 transition-colors">
                                  <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(supplier.id)} className="text-gray-400 hover:text-red-600 p-1 transition-colors">
                                  <Trash2 size={16} />
                              </button>
                          </div>
                      </div>
                      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-1 line-clamp-1" title={supplier.name}>{supplier.name}</h3>
                      <p className="text-xs text-gray-500 font-mono mb-4 bg-gray-50 dark:bg-gray-900 px-2 py-1 rounded inline-block w-fit">NUIT: {supplier.nif}</p>
                      
                      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 flex-1">
                          <div className="flex items-center gap-2">
                              <Phone size={14} className="text-blue-400" /> {supplier.contact}
                          </div>
                          {supplier.address && (
                              <div className="flex items-start gap-2">
                                  <MapPin size={14} className="text-red-400 mt-1 shrink-0" /> 
                                  <span className="line-clamp-2">{supplier.address}</span>
                              </div>
                          )}
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Condições de Pagamento:</span>
                          <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mt-0.5">{supplier.paymentTerms || 'Não definido'}</p>
                      </div>
                  </div>
              ))}
            </div>

            {/* Pagination Controls */}
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Mostrando {paginatedSuppliers.length} de {filteredSuppliers.length} registos</span>
                <div className="flex items-center gap-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronLeft size={16}/></button>
                    <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={16}/></button>
                </div>
            </div>
          </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-2xl shadow-xl p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                        <span className="text-lg font-black tracking-tighter">E</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                        {editingSupplier ? 'Editar Fornecedor' : 'Novo Fornecedor'}
                    </h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24}/></button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome da Empresa</label>
                    <input required name="name" placeholder="Ex: Distribuidora Central, Lda" defaultValue={editingSupplier?.name} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">NUIT</label>
                        <input required name="nif" placeholder="9 dígitos" defaultValue={editingSupplier?.nif} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Contacto</label>
                        <input required name="contact" placeholder="+258 ..." defaultValue={editingSupplier?.contact} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email (Opcional)</label>
                    <input name="email" type="email" placeholder="contato@empresa.com" defaultValue={editingSupplier?.email} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Endereço</label>
                    <input name="address" placeholder="Rua, Cidade, Província" defaultValue={editingSupplier?.address} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prazo de Pagamento</label>
                    <input name="paymentTerms" placeholder="Ex: 30 Dias, Pronto Pagamento" defaultValue={editingSupplier?.paymentTerms} className="w-full p-2.5 border rounded-lg dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                
                <div className="flex justify-end gap-3 pt-6 border-t mt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">Cancelar</button>
                    <button type="submit" className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-md transition-transform active:scale-95">
                        {editingSupplier ? 'Guardar Alterações' : 'Criar Fornecedor'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;
