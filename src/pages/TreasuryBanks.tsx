
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Landmark, 
  Smartphone, 
  CreditCard, 
  Wallet as WalletIcon, 
  ArrowRightLeft, 
  X, 
  Calendar, 
  Layers,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Wallet, Transaction, AppConfig, ToastType } from '../types';
import { DocumentGenerator } from '../services/documentGenerators';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface TreasuryBanksProps {
  config: AppConfig;
}

const TreasuryBanks: React.FC<TreasuryBanksProps> = ({ config }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>('ALL');
  
  // PROTECTED WALLET IDS (Primárias)
  const PROTECTED_WALLET_IDS = ['CASH', 'CARD', 'MPESA', 'EMOLA'];

  // Date Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modals State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);

  // Forms State
  const [transferData, setTransferData] = useState({ source: '', dest: '', amount: '', fee: '0' });
  const [newWalletData, setNewWalletData] = useState({ name: '', type: 'BANK', accountNumber: '', balance: '0' });

  const loadData = useCallback(() => {
    setWallets(StorageService.getWallets());
    setTransactions(StorageService.getTransactions());
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
    
    // Set default date range (Current Month)
    const date = new Date();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(lastDay.toISOString().split('T')[0]);
  }, [loadData]);

  // Reset pagination when filters change
  useEffect(() => {
     // eslint-disable-next-line react-hooks/set-state-in-effect
     setCurrentPage(1);
  }, [selectedWalletId, startDate, endDate]);

  // --- UI Helpers ---
  const formatMoney = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val) + ' MT';
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', {hour:'2-digit', minute:'2-digit'});
  
  // --- Derived Data ---
  const transferHistory = useMemo(() => {
      const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
      const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

      return transactions
        .filter(t => {
            if (t.category !== 'Transferência' || t.type !== 'TRANSFER' || t.transferType !== 'SEND') return false;
            
            const d = new Date(t.date).getTime();
            const dateMatch = d >= start && d <= end;

            if (selectedWalletId !== 'ALL') {
                const related = transactions.find(rt => rt.relatedTransferId === t.id);
                return dateMatch && (t.walletId === selectedWalletId || (related && related.walletId === selectedWalletId));
            }

            return dateMatch;
        })
        .map(t => {
            const related = transactions.find(rt => rt.relatedTransferId === t.id);
            return {
                id: t.id,
                date: t.date,
                sourceWallet: wallets.find(w => w.id === t.walletId)?.name || 'Desconhecida',
                destWallet: wallets.find(w => w.id === (related?.walletId))?.name || 'Desconhecida',
                amount: related ? related.amount : t.amount,
                fee: related ? (t.amount - related.amount) : 0
            };
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, wallets, selectedWalletId, startDate, endDate]);

  const totalConsolidatedBalance = useMemo(() => wallets.reduce((acc, w) => acc + w.balance, 0), [wallets]);

  const totalPages = Math.ceil(transferHistory.length / itemsPerPage);
  const currentTransfers = transferHistory.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
  );

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
        setCurrentPage(newPage);
    }
  };

  const handleOpenReportPreview = (_mode: 'SYNTHETIC' | 'ANALYTICAL') => {
      DocumentGenerator.Tesouraria.gerarExtratoBancos(config, wallets, transactions, startDate, endDate, selectedWalletId === 'ALL' ? undefined : (selectedWalletId || undefined));
  };

  // --- Handlers ---
  const handleTransfer = () => {
      const { source, dest, amount, fee } = transferData;
      if (!source || !dest || source === dest) {
          showToast('Selecione origem e destino diferentes.', ToastType.WARNING);
          return;
      }
      const valAmount = parseFloat(amount);
      const valFee = parseFloat(fee);
      
      if (!valAmount || valAmount <= 0) {
          showToast('Valor inválido.', ToastType.ERROR);
          return;
      }

      try {
          StorageService.performWalletTransfer(source, dest, valAmount, valFee);
          showToast('Transferência realizada com sucesso!', ToastType.SUCCESS);
          setIsTransferModalOpen(false);
          setTransferData({ source: '', dest: '', amount: '', fee: '0' });
          loadData();
      } catch (e: unknown) {
          const error = e as Error;
          showToast(error.message, ToastType.ERROR);
      }
  };

  const openNewWalletModal = () => {
    setNewWalletData({ name: '', type: 'BANK', accountNumber: '', balance: '0' });
    setEditingWalletId(null);
    setIsWalletModalOpen(true);
  };

  const openEditModal = (wallet: Wallet) => {
    setNewWalletData({
        name: wallet.name,
        type: wallet.type,
        accountNumber: wallet.accountNumber || '',
        balance: wallet.balance.toString()
    });
    setEditingWalletId(wallet.id);
    setIsWalletModalOpen(true);
  };

  const handleSaveWallet = () => {
      if (!newWalletData.name) {
          showToast('Nome é obrigatório.', ToastType.WARNING);
          return;
      }
      
      const currentWallets = StorageService.getWallets();
      if (!editingWalletId && currentWallets.some(w => w.name.toLowerCase() === newWalletData.name.toLowerCase())) {
          showToast('Já existe uma carteira com este nome.', ToastType.ERROR);
          return;
      }

      const walletToSave: Wallet = {
          id: editingWalletId || `w-${Date.now()}`,
          name: newWalletData.name,
          type: newWalletData.type as 'BANK' | 'MOBILE' | 'CASH' | 'POS',
          currency: config.currency || 'MT',
          balance: parseFloat(newWalletData.balance) || 0,
          accountNumber: newWalletData.accountNumber,
          status: 'ACTIVE'
      };

      StorageService.saveWallet(walletToSave);
      loadData();
      setIsWalletModalOpen(false);
      setNewWalletData({ name: '', type: 'BANK', accountNumber: '', balance: '0' });
      setEditingWalletId(null);
  };

  const handleDeleteWallet = async (walletId: string) => {
      if (PROTECTED_WALLET_IDS.includes(walletId)) return;
      const conf = await confirm('Tem certeza que deseja eliminar esta carteira? Esta ação é irreversível.', {
          title: 'Eliminar Carteira',
          type: 'danger',
          confirmText: 'Sim, Eliminar'
      });
      if (conf) {
          StorageService.deleteWallet(walletId);
          if (selectedWalletId === walletId) setSelectedWalletId('ALL');
          loadData();
      }
  };

  const getIconForType = (type: string) => {
      switch (type) {
          case 'MOBILE': return <Smartphone size={18} className="text-white" />;
          case 'BANK': return <Landmark size={18} className="text-white" />;
          case 'POS': return <CreditCard size={18} className="text-white" />;
          default: return <WalletIcon size={18} className="text-white" />;
      }
  };

  const getColorForType = (type: string) => {
      switch (type) {
          case 'MOBILE': return 'bg-red-500';
          case 'BANK': return 'bg-blue-600';
          case 'POS': return 'bg-purple-600';
          default: return 'bg-emerald-600';
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] gap-6 font-sans">
        
        {/* 1. Header & Actions */}
        <div className="flex justify-between items-start shrink-0">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Landmark className="text-blue-600" />
                    Bancos e Carteiras
                </h1>
                <p className="text-gray-500 text-sm">Gestão de contas, conciliação e transferências.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={openNewWalletModal} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all font-bold text-sm">
                    <Plus size={18} /> Nova Carteira
                </button>
                <button onClick={() => setIsTransferModalOpen(true)} className="flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 px-4 py-2.5 rounded-xl shadow-sm transition-colors font-bold text-sm text-center">
                    <ArrowRightLeft size={18} /> Transferir
                </button>
            </div>
        </div>

        {/* 2. Wallet Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 shrink-0 overflow-x-auto pb-2 custom-scrollbar">
            {/* Total Consolidation */}
            <div 
                onClick={() => setSelectedWalletId('ALL')}
                className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    selectedWalletId === 'ALL' 
                    ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-500/30' 
                    : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:border-blue-200'
                }`}
            >
                <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg ${selectedWalletId === 'ALL' ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                        <Layers size={18} />
                    </div>
                </div>
                <h3 className={`${selectedWalletId === 'ALL' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'} text-xs font-medium uppercase tracking-wide truncate`}>Consolidado</h3>
                <p className="text-lg font-bold mt-0.5">{formatMoney(totalConsolidatedBalance)}</p>
            </div>

            {/* Individual Wallets */}
            {wallets.map(wallet => (
                <div 
                    key={wallet.id}
                    onClick={() => setSelectedWalletId(wallet.id)}
                    className={`relative p-4 rounded-xl cursor-pointer transition-all border group ${
                        selectedWalletId === wallet.id 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' 
                        : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 bg-white dark:bg-gray-800 shadow-sm'
                    }`}
                >
                    <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg shadow-sm ${getColorForType(wallet.type)}`}>
                            {getIconForType(wallet.type)}
                        </div>
                    </div>
                    <h3 className="text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide truncate">{wallet.name}</h3>
                    <p className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{formatMoney(wallet.balance)}</p>
                    
                    {/* Action Buttons (Edit/Delete) */}
                    <div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 dark:bg-gray-800/90 rounded-lg p-0.5 shadow-sm border border-gray-100 dark:border-gray-700">
                        <button 
                            onClick={(e) => { e.stopPropagation(); openEditModal(wallet); }}
                            className="p-1.5 text-gray-400 hover:text-blue-500 rounded-md transition-colors"
                        >
                            <Edit2 size={14} />
                        </button>
                        {!PROTECTED_WALLET_IDS.includes(wallet.id) && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteWallet(wallet.id); }}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>

        {/* 3. Detailed Extract Section */}
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden min-h-0">
            {/* Toolbar */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <ArrowRightLeft className="text-gray-400" size={18} />
                    <h3 className="font-bold text-gray-700 dark:text-gray-200 text-sm whitespace-nowrap">
                        Transferências entre Carteiras
                    </h3>
                </div>

                <div className="flex flex-col md:flex-row gap-4 items-center w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1 rounded-lg border border-gray-200 dark:border-gray-600">
                        <Calendar size={14} className="text-gray-400 ml-2" />
                        <input 
                            type="date" 
                            className="bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none" 
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-gray-400 text-xs px-1">até</span>
                        <input 
                            type="date" 
                            className="bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none" 
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2 w-full md:w-auto">
                        <button 
                            onClick={() => handleOpenReportPreview('SYNTHETIC')}
                            className="px-3 py-1.5 text-xs font-bold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg shadow-sm hover:bg-gray-100"
                        >
                            Saldos (A4)
                        </button>
                        <button 
                            onClick={() => handleOpenReportPreview('ANALYTICAL')}
                            className="px-3 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-lg shadow-sm hover:bg-blue-100"
                        >
                            Relatório PDF (A4)
                        </button>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 font-semibold border-b dark:border-gray-700 sticky top-0 z-10 uppercase text-[10px]">
                        <tr>
                            <th className="px-6 py-3">Data</th>
                            <th className="px-6 py-3">Origem</th>
                            <th className="px-6 py-3">Destino</th>
                            <th className="px-6 py-3 text-right">Valor Líquido</th>
                            <th className="px-6 py-3 text-right">Taxa</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentTransfers.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">Nenhuma transferência no período.</td></tr>
                        ) : (
                            currentTransfers.map(t => (
                                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                                    <td className="px-6 py-3 text-gray-500">{formatDate(t.date)}</td>
                                    <td className="px-6 py-3 font-medium">{t.sourceWallet}</td>
                                    <td className="px-6 py-3 font-medium">{t.destWallet}</td>
                                    <td className="px-6 py-3 text-right font-bold text-green-600">{formatMoney(t.amount)}</td>
                                    <td className="px-6 py-3 text-right text-red-400">{t.fee > 0 ? formatMoney(t.fee) : '-'}</td>
                                    <td className="px-6 py-3 text-right font-bold">{formatMoney(t.amount + t.fee)}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-3 border-t dark:border-gray-700 text-xs text-gray-500 flex justify-between items-center shrink-0">
                <div className="font-medium">Mostrando {currentTransfers.length} de {transferHistory.length} registos</div>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1 border dark:border-gray-600 rounded disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"><ChevronLeft size={14} /></button>
                    <span className="font-medium px-2">Pág. {currentPage} / {totalPages || 1}</span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="p-1 border dark:border-gray-600 rounded disabled:opacity-50 hover:bg-white dark:hover:bg-gray-800 transition-colors"><ChevronRight size={14} /></button>
                </div>
            </div>
        </div>

        {/* Transfer Modal */}
        {isTransferModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><ArrowRightLeft size={18} /> Nova Transferência</h3>
                        <button onClick={() => setIsTransferModalOpen(false)}><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Origem</label>
                                <select 
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 text-sm"
                                    value={transferData.source} onChange={e => setTransferData({...transferData, source: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name} ({formatMoney(w.balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase">Destino</label>
                                <select 
                                    className="w-full p-2 border rounded-lg dark:bg-gray-900 text-sm"
                                    value={transferData.dest} onChange={e => setTransferData({...transferData, dest: e.target.value})}
                                >
                                    <option value="">Selecione...</option>
                                    {wallets.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Valor Líquido</label>
                            <input 
                                type="number" 
                                className="w-full p-3 border rounded-xl font-bold dark:bg-gray-900"
                                value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase text-red-400">Taxa / Custo (Opcional)</label>
                            <input 
                                type="number" 
                                className="w-full p-2 border rounded-lg dark:bg-gray-900"
                                value={transferData.fee} onChange={e => setTransferData({...transferData, fee: e.target.value})}
                            />
                        </div>
                        <button 
                            onClick={handleTransfer}
                            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl"
                        >
                            EXECUTAR TRANSFERÊNCIA
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Wallet Modal */}
        {isWalletModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
                        <h3 className="font-bold flex items-center gap-2"><WalletIcon size={18} /> {editingWalletId ? 'Editar' : 'Nova'} Carteira</h3>
                        <button onClick={() => setIsWalletModalOpen(false)}><X size={20} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nome</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded-lg dark:bg-gray-900"
                                value={newWalletData.name} onChange={e => setNewWalletData({...newWalletData, name: e.target.value})}
                                disabled={!!(editingWalletId && PROTECTED_WALLET_IDS.includes(editingWalletId))}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Tipo</label>
                            <select 
                                className="w-full p-2 border rounded-lg dark:bg-gray-900"
                                value={newWalletData.type} onChange={e => setNewWalletData({...newWalletData, type: e.target.value as Wallet['type']})}
                                disabled={!!(editingWalletId && PROTECTED_WALLET_IDS.includes(editingWalletId))}
                            >
                                <option value="BANK">Banco</option>
                                <option value="MOBILE">Móvel</option>
                                <option value="CASH">Dinheiro</option>
                                <option value="POS">TPA</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Nº conta / Telefone</label>
                            <input 
                                type="text"
                                className="w-full p-2 border rounded-lg dark:bg-gray-900"
                                value={newWalletData.accountNumber} onChange={e => setNewWalletData({...newWalletData, accountNumber: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-gray-400 uppercase">Saldo Inicial</label>
                            <input 
                                type="number"
                                className="w-full p-2 border rounded-lg dark:bg-gray-900"
                                value={newWalletData.balance} onChange={e => setNewWalletData({...newWalletData, balance: e.target.value})}
                            />
                        </div>
                        <button onClick={handleSaveWallet} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl uppercase">Salvar Carteira</button>
                    </div>
                </div>
            </div>
        )}

    </div>
  );
};

export default TreasuryBanks;
