
import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Edit2, 
  Printer, 
  FileText, 
  User, 
  ChevronLeft, 
  ChevronRight,
  X,
  Save
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Customer, AppConfig, Sale } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';

interface CustomerManagementProps {
  config: AppConfig;
}

const CustomerManagement: React.FC<CustomerManagementProps> = ({ config }) => {
  const [customers, setCustomers] = useState<Customer[]>(() => StorageService.getCustomers());
  const [sales] = useState<Sale[]>(() => StorageService.getSales());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newCustomer: Customer = {
      id: editingCustomer ? editingCustomer.id : Date.now().toString(),
      name: formData.get('name') as string,
      nif: formData.get('nif') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      debt: parseFloat(formData.get('debt') as string || '0'),
      creditBalance: parseFloat(formData.get('creditBalance') as string || '0'),
      isBlacklisted: editingCustomer ? editingCustomer.isBlacklisted : false,
    };
    StorageService.saveCustomer(newCustomer);
    setCustomers(StorageService.getCustomers());
    setIsModalOpen(false);
  };

  const handleToggleBlacklist = (customer: Customer) => {
    const updated = { ...customer, isBlacklisted: !customer.isBlacklisted };
    StorageService.saveCustomer(updated);
    setCustomers(StorageService.getCustomers());
  };

  const handleOpenListPreview = () => {
      DocumentGenerator.Vendas.gerarMapaGeralClientes(customers, config);
  };

  const handleOpenStatementPreview = (customer: Customer) => {
      const history = sales.filter(s => s.customerId === customer.id);
      DocumentGenerator.Vendas.gerarExtractoCliente(customer, history, config);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.nif.includes(searchTerm)
  );

  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div><h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-dark-text"><User className="text-blue-600" /> Gestão de Clientes</h1><p className="text-gray-500 dark:text-dark-text-muted text-sm">Controle nominal e financeiro de parceiros.</p></div>
        <div className="flex items-center gap-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 text-gray-400" size={18} /><input type="text" placeholder="Pesquisar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text text-sm md:w-64 outline-none focus:ring-2 focus:ring-blue-500" /></div>
            <button onClick={() => {setEditingCustomer(null); setIsModalOpen(true);}} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-bold shadow-lg shadow-blue-500/20"><Plus size={18} /> Novo Cliente</button>
        </div>
      </div>

      <div className="bg-white dark:bg-dark-card p-2 rounded-t-xl border border-gray-200 dark:border-dark-border flex justify-between items-center">
          <div className="flex gap-2">
            <button onClick={handleOpenListPreview} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-dark-text-muted bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"><Printer size={16} className="text-blue-600" /> Mapa Geral (A4)</button>
          </div>
          <span className="text-[10px] font-bold text-gray-400 dark:text-dark-text-muted uppercase mr-4">Total: {customers.length} Registros</span>
      </div>

      <div className="bg-white dark:bg-dark-card rounded-b-xl shadow-sm border border-gray-200 dark:border-dark-border overflow-hidden">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-dark-text-muted font-semibold">
                <tr><th className="px-6 py-4 uppercase text-[10px] tracking-widest">Nome</th><th className="px-6 py-4 uppercase text-[10px] tracking-widest">Contacto</th><th className="px-6 py-4 text-right uppercase text-[10px] tracking-widest">Dívida</th><th className="px-6 py-4 text-right uppercase text-[10px] tracking-widest">Saldo a Favor</th><th className="px-6 py-4 text-center uppercase text-[10px] tracking-widest">Acções</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                {paginatedCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-900 dark:text-dark-text">{customer.name} {customer.isBlacklisted && <span className="ml-1 text-[9px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1 rounded">BLOQUEADO</span>}</td>
                        <td className="px-6 py-4 text-gray-500 dark:text-dark-text-muted">{customer.phone || '-'}</td>
                        <td className="px-6 py-4 text-right text-red-600 dark:text-red-400 font-bold">{formatCurrency(customer.debt)}</td>
                        <td className="px-6 py-4 text-right text-green-600 dark:text-green-400 font-bold">{formatCurrency(customer.creditBalance)}</td>
                        <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-2">
                                <button onClick={() => handleOpenStatementPreview(customer)} className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"><FileText size={16}/></button>
                                <button onClick={() => {setEditingCustomer(customer); setIsModalOpen(true);}} className="p-1.5 text-gray-500 dark:text-dark-text-muted hover:bg-gray-100 dark:hover:bg-white/10 rounded transition-colors"><Edit2 size={16}/></button>
                            </div>
                        </td>
                    </tr>
                ))}
            </tbody>
          </table>
          <div className="p-3 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-dark-border flex justify-between items-center text-xs text-gray-600 dark:text-dark-text-muted">
              <span className="font-medium">Mostrando {paginatedCustomers.length} de {filteredCustomers.length} registos</span>
              <div className="flex items-center gap-2">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage === 1} className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-white dark:hover:bg-dark-bg transition-colors"><ChevronLeft size={16}/></button>
                  <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage === totalPages} className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-white dark:hover:bg-dark-bg transition-colors"><ChevronRight size={16}/></button>
              </div>
          </div>
      </div>

      {/* MODAL CADASTRO */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-dark-card w-full max-w-2xl rounded-2xl p-6 shadow-2xl border border-gray-200 dark:border-dark-border overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                        <span className="text-lg font-black tracking-tighter">E</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-dark-text">{editingCustomer ? 'Editar Ficha' : 'Novo Cliente'}</h2>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><X size={24}/></button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2"><label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted mb-1 uppercase tracking-wider">Nome Completo</label><input required name="name" defaultValue={editingCustomer?.name} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted mb-1 uppercase tracking-wider">NUIT</label><input required name="nif" defaultValue={editingCustomer?.nif} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div><label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted mb-1 uppercase tracking-wider">Telefone</label><input required name="phone" defaultValue={editingCustomer?.phone} className="w-full p-2.5 border border-gray-200 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text outline-none focus:ring-2 focus:ring-blue-500" /></div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-3 rounded-lg border border-red-100 dark:border-red-900/30"><label className="block text-xs font-bold text-red-600 dark:text-red-400 mb-1 uppercase tracking-wider">Dívida Ativa</label><input type="number" step="0.01" name="debt" defaultValue={editingCustomer?.debt} className="w-full p-2 bg-white dark:bg-dark-bg border border-red-200 dark:border-red-900/50 rounded font-black text-red-700 dark:text-red-400 outline-none focus:ring-2 focus:ring-red-500" /></div>
                    <div className="bg-green-50 dark:bg-green-900/10 p-3 rounded-lg border border-green-100 dark:border-green-900/30"><label className="block text-xs font-bold text-green-600 dark:text-green-400 mb-1 uppercase tracking-wider">Saldo a Favor</label><input type="number" step="0.01" name="creditBalance" defaultValue={editingCustomer?.creditBalance} className="w-full p-2 bg-white dark:bg-dark-bg border border-green-200 dark:border-green-900/50 rounded font-black text-green-700 dark:text-green-400 outline-none focus:ring-2 focus:ring-green-500" /></div>
                </div>
                {editingCustomer && (
                    <button type="button" onClick={() => handleToggleBlacklist(editingCustomer)} className={`w-full py-2.5 rounded-lg font-bold border transition-all ${editingCustomer.isBlacklisted ? 'border-green-600 text-green-600 bg-green-50 dark:bg-green-900/10 dark:text-green-400 dark:border-green-900/50' : 'border-red-600 text-red-600 bg-red-50 dark:bg-red-900/10 dark:text-red-400 dark:border-red-900/50'}`}>
                        {editingCustomer.isBlacklisted ? 'REATIVAR VENDAS' : 'BLOQUEAR VENDAS (LISTA NEGRA)'}
                    </button>
                )}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100 dark:border-dark-border">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 font-bold text-gray-500 dark:text-dark-text-muted hover:text-gray-700 dark:hover:text-dark-text transition-colors">Cancelar</button>
                    <button type="submit" className="px-8 py-2 bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-500/20 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95"><Save size={18}/> Salvar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;
