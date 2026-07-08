
import React, { useState, useMemo, useCallback } from 'react';
import { 
  Boxes, 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Package, 
  AlertCircle,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Product, ProductKit, ProductKitItem, ToastType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface ProductKitsProps {
  t: (key: string) => string;
}

const ProductKits: React.FC<ProductKitsProps> = () => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [kits, setKits] = useState<ProductKit[]>(() => StorageService.getProductKits());
  const [products, setProducts] = useState<Product[]>(() => StorageService.getProducts());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  
  // Kit Form States
  const [editingKit, setEditingKit] = useState<ProductKit | null>(null);
  const [kitName, setKitName] = useState('');
  const [kitCode, setKitCode] = useState('');
  const [kitDescription, setKitDescription] = useState('');
  const [kitPrice, setKitPrice] = useState(0);
  const [kitItems, setKitItems] = useState<ProductKitItem[]>([]);

  // Calculate total cost of items in kit
  const kitCost = useMemo(() => {
    return kitItems.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      return acc + (product ? product.cost * item.quantity : 0);
    }, 0);
  }, [kitItems, products]);

  // Calculate sum of individual prices for reference
  const itemsPriceSum = useMemo(() => {
    return kitItems.reduce((acc, item) => {
      const product = products.find(p => p.id === item.productId);
      return acc + (product ? product.price * item.quantity : 0);
    }, 0);
  }, [kitItems, products]);
  
  // Product Selection for Kit
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState(1);

  const loadData = useCallback(() => {
    setKits(StorageService.getProductKits());
    setProducts(StorageService.getProducts());
  }, []);

  // Removed redundant useEffect that was causing cascading render warning

  const filteredKits = kits.filter(k => 
    k.name.toLowerCase().includes(search.toLowerCase()) || 
    k.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filteredKits.length / itemsPerPage);
  const paginatedKits = filteredKits.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
    p.code.toLowerCase().includes(productSearch.toLowerCase())
  );

  const handleOpenModal = (kit: ProductKit | null = null) => {
    if (kit) {
      setEditingKit(kit);
      setKitName(kit.name);
      setKitCode(kit.code);
      setKitDescription(kit.description || '');
      setKitPrice(kit.price);
      setKitItems(kit.items);
    } else {
      setEditingKit(null);
      setKitName('');
      setKitCode(`KIT-${Date.now().toString().slice(-6)}`);
      setKitDescription('');
      setKitPrice(0);
      setKitItems([]);
    }
    setIsModalOpen(true);
  };

  const handleAddItem = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    if (!product) return;

    const existingIndex = kitItems.findIndex(item => item.productId === selectedProductId);
    if (existingIndex >= 0) {
      const updated = [...kitItems];
      updated[existingIndex].quantity += selectedQuantity;
      setKitItems(updated);
    } else {
      setKitItems([...kitItems, {
        productId: product.id,
        productName: product.name,
        quantity: selectedQuantity
      }]);
    }
    
    // Auto-calculate suggested price (sum of costs + margin or sum of prices)
    // For now just keep manual entry but we could suggest
    
    setSelectedProductId('');
    setSelectedQuantity(1);
    setProductSearch('');
  };

  const handleRemoveItem = (productId: string) => {
    setKitItems(kitItems.filter(item => item.productId !== productId));
  };

  const handleSave = useCallback(() => {
    if (!kitName || !kitCode || kitItems.length === 0) {
      showToast('Preencha o nome, código e adicione pelo menos um item.', ToastType.WARNING);
      return;
    }

    const kit: ProductKit = {
      id: editingKit ? editingKit.id : Date.now().toString(),
      code: kitCode,
      name: kitName,
      description: kitDescription,
      price: kitPrice,
      cost: kitCost,
      category: 'Kits',
      items: kitItems,
      isActive: true
    };

    try {
      StorageService.saveProductKit(kit);
      showToast(editingKit ? 'Kit atualizado com sucesso!' : 'Kit criado com sucesso!', ToastType.SUCCESS);
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao salvar o kit.';
      showToast(msg, ToastType.ERROR);
    }
  }, [kitName, kitCode, kitItems, editingKit, kitDescription, kitPrice, kitCost, showToast, loadData]);

  const handleDelete = async (id: string) => {
    const conf = await confirm('Tem certeza que deseja excluir este kit?', {
      title: 'Excluir Kit',
      type: 'danger',
      confirmText: 'Excluir Kit'
    });
    if (conf) {
      StorageService.deleteProductKit(id);
      showToast('Kit excluído com sucesso.', ToastType.INFO);
      loadData();
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
            <Boxes className="text-blue-600" size={28} />
            Kits de Produtos
          </h1>
          <p className="text-gray-500 dark:text-dark-text-muted mt-1">Crie combinações de produtos com preços especiais</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all font-bold active:scale-95"
        >
          <Plus size={20} /> Novo Kit
        </button>
      </div>

      <div className="card p-4">
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text"
            placeholder="Pesquisar kits por nome ou código..."
            className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredKits.length === 0 ? (
              <div className="col-span-full py-20 text-center">
                <Boxes size={64} className="mx-auto text-gray-200 dark:text-dark-border mb-4" />
                <p className="text-gray-500 dark:text-dark-text-muted">Nenhum kit encontrado.</p>
              </div>
            ) : (
              paginatedKits.map(kit => (
                <div key={kit.id} className="group relative bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl p-5 hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900/30 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                      <Boxes size={24} />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(kit)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(kit.id)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"><Trash2 size={16} /></button>
                    </div>
                  </div>

                  <h3 className="font-bold text-gray-900 dark:text-dark-text mb-1">{kit.name}</h3>
                  <p className="text-xs font-mono text-gray-400 mb-3">{kit.code}</p>
                  
                  <div className="space-y-2 mb-4">
                    {kit.items.slice(0, 3).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-text-muted">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="font-bold">{item.quantity}x</span>
                        <span className="truncate">{item.productName}</span>
                      </div>
                    ))}
                    {kit.items.length > 3 && (
                      <p className="text-[10px] text-gray-400 ml-3 font-medium">+ {kit.items.length - 3} outros itens</p>
                    )}
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-50 dark:border-dark-border">
                    <span className="text-xs text-gray-400 uppercase font-bold tracking-wider">Preço do Kit</span>
                    <span className="text-lg font-black text-blue-600 dark:text-blue-400">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format(kit.price)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          {filteredKits.length > 0 && (
            <div className="p-3 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl flex justify-between items-center text-xs text-gray-600 dark:text-dark-text-muted">
              <span className="font-medium">Mostrando {paginatedKits.length} de {filteredKits.length} registos</span>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                  disabled={currentPage === 1} 
                  className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                >
                  <ChevronLeft size={16}/>
                </button>
                <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                <button 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                  disabled={currentPage === totalPages} 
                  className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                >
                  <ChevronRight size={16}/>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal - Create/Edit Kit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-card w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-gray-200 dark:border-dark-border">
            <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
                <Plus className="text-blue-600" /> {editingKit ? 'Editar Kit' : 'Novo Kit de Produtos'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-8 custom-scrollbar">
              {/* Left Column: Kit Details */}
              <div className="lg:w-1/3 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Nome do Kit</label>
                  <input 
                    className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    value={kitName}
                    onChange={(e) => setKitName(e.target.value)}
                    placeholder="Ex: Kit Churrasco Premium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Código (SKU)</label>
                  <input 
                    className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text font-mono"
                    value={kitCode}
                    onChange={(e) => setKitCode(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Descrição (Opcional)</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                    value={kitDescription}
                    onChange={(e) => setKitDescription(e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase">Resumo Financeiro</span>
                    <Info size={14} className="text-blue-400" />
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-dark-text-muted">Soma dos Itens:</span>
                      <span className="font-bold text-gray-900 dark:text-dark-text">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format(itemsPriceSum)}</span>
                    </div>
                    <div className="pt-3 border-t border-blue-200 dark:border-blue-800">
                      <label className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-2">Preço de Venda do Kit</label>
                      <input 
                        type="number"
                        className="w-full p-3 bg-white dark:bg-dark-bg border border-blue-200 dark:border-blue-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-600 text-2xl font-black text-blue-600"
                        value={kitPrice}
                        onChange={(e) => setKitPrice(Number(e.target.value))}
                      />
                      <p className="text-[10px] text-blue-400 mt-2">Dica: O preço do kit geralmente é menor que a soma dos itens para incentivar a venda.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Kit Items */}
              <div className="flex-1 space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Adicionar Produtos ao Kit</label>
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder="Buscar produto p/ adicionar..."
                        className="w-full p-3 pl-10 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                      />
                      <Search className="absolute left-3 top-3.5 text-gray-400" size={18} />
                      
                      {productSearch && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                          {filteredProducts.map(p => (
                            <button 
                              key={p.id}
                              onClick={() => {
                                setSelectedProductId(p.id);
                                setProductSearch(p.name);
                              }}
                              className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-100 last:border-0 transition-colors flex justify-between items-center"
                            >
                              <div>
                                <p className="text-sm font-bold">{p.name}</p>
                                {p.description && (
                                  <p className="text-xs text-gray-400 dark:text-dark-text-muted mt-0.5 max-w-sm whitespace-normal">
                                    {p.description}
                                  </p>
                                )}
                                <p className="text-[10px] text-gray-400">{p.code}</p>
                              </div>
                              <span className="text-xs font-bold text-blue-600">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format(p.price)}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <input 
                      type="number"
                      min="1"
                      className="w-24 p-3 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold"
                      value={selectedQuantity}
                      onChange={(e) => setSelectedQuantity(Number(e.target.value))}
                    />
                    <button 
                      onClick={handleAddItem}
                      className="px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                    >
                      <Plus size={20} /> Adicionar
                    </button>
                  </div>
                </div>

                <div className="border border-gray-200 dark:border-dark-border rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-dark-border text-gray-500 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-6 py-4">Produto</th>
                        <th className="px-6 py-4 text-center">Quantidade</th>
                        <th className="px-6 py-4 text-right">Preço Unit.</th>
                        <th className="px-6 py-4 text-right">Subtotal</th>
                        <th className="px-6 py-4 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                      {kitItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-6 py-10 text-center text-gray-400">Nenhum produto adicionado ao kit ainda.</td>
                        </tr>
                      ) : (
                        kitItems.map((item, idx) => {
                          const p = products.find(prod => prod.id === item.productId);
                          return (
                            <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-gray-100 dark:bg-dark-bg rounded-lg text-gray-400">
                                    <Package size={16} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 dark:text-dark-text">{item.productName}</p>
                                    {p?.description && (
                                      <p className="text-xs text-gray-500 dark:text-dark-text-muted mt-0.5 whitespace-normal">
                                        {p.description}
                                      </p>
                                    )}
                                    <p className="text-[10px] text-gray-400 font-mono">{p?.code}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full font-black">
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right text-gray-500 font-mono">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format(p?.price || 0)}
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-dark-text font-mono">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'MZN' }).format((p?.price || 0) * item.quantity)}
                              </td>
                              <td className="px-6 py-4 text-center">
                                <button onClick={() => handleRemoveItem(item.productId)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                
                {kitItems.length > 0 && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
                    <AlertCircle className="text-orange-600 shrink-0" size={20} />
                    <p className="text-xs text-orange-800 dark:text-orange-300">
                      <strong>Nota de Stock:</strong> A venda de um kit dará baixa automática no stock individual de cada produto que o compõe.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-dark-border bg-gray-50 dark:bg-dark-bg flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors">Cancelar</button>
              <button 
                onClick={handleSave}
                className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95"
              >
                <Save size={20} /> Salvar Kit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductKits;
