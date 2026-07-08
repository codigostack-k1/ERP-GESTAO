import React, { useState } from 'react';
import { 
  X, 
  Banknote, 
  CreditCard, 
  Smartphone, 
  Plus, 
  Trash2, 
  ChevronDown,
  FileText
} from 'lucide-react';
import { AppConfig, PaymentDetail } from '../types';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  onConfirm: (paymentDetails: PaymentDetail[], paymentMethod: string) => void;
  config: AppConfig;
  title?: string;
}

interface WalletEntry {
  id: number;
  provider: string;
  amount: string;
  reference: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ 
  isOpen, 
  onClose, 
  totalAmount, 
  onConfirm, 
  config,
  title = "Liquidação da Factura"
}) => {
  const [cashAmount, setCashAmount] = useState(totalAmount.toString());
  const [cardAmount, setCardAmount] = useState('');
  const [walletEntries, setWalletEntries] = useState<WalletEntry[]>([]);

  const valCash = parseFloat(cashAmount) || 0;
  const valCard = parseFloat(cardAmount) || 0;
  const valWallets = walletEntries.reduce((acc, w) => acc + (parseFloat(w.amount) || 0), 0);
  const totalPaid = valCash + valCard + valWallets;
  const missing = Math.max(0, totalAmount - totalPaid);
  const changeAmount = Math.max(0, totalPaid - totalAmount);
  const canFinalizePayment = totalPaid >= totalAmount - 0.01;

  const addWallet = () => {
    const activeMobiles = config.paymentMethods?.filter(m => m.type === 'MOBILE' && m.isActive) || [];
    if (activeMobiles.length === 0) return;
    
    setWalletEntries([...walletEntries, { 
      id: Date.now(), 
      provider: activeMobiles[0].id, 
      amount: '', 
      reference: '' 
    }]);
  };

  const removeWallet = (id: number) => setWalletEntries(walletEntries.filter(w => w.id !== id));
  
  const updateWallet = (id: number, field: keyof WalletEntry, value: string) => {
    setWalletEntries(walletEntries.map(w => w.id === id ? { ...w, [field]: value } : w));
  };

  const handleConfirm = () => {
    if (!canFinalizePayment) return;

    const details: PaymentDetail[] = [];
    if (valCard > 0) details.push({ method: 'CARD', amount: valCard });
    
    walletEntries.forEach(w => {
      const amt = parseFloat(w.amount) || 0;
      if (amt > 0) details.push({ method: w.provider, amount: amt, reference: w.reference });
    });
    
    const nonCashTotal = details.reduce((acc, d) => acc + d.amount, 0);
    const revenueCash = Math.max(0, totalAmount - nonCashTotal);
    if (valCash > 0 && revenueCash > 0) details.push({ method: 'CASH', amount: revenueCash });

    let methodLabel = 'CASH';
    if (details.length > 1) {
      methodLabel = 'MIXED';
    } else if (details.length === 1) {
      methodLabel = details[0].method;
    }

    onConfirm(details, methodLabel);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="bg-white dark:bg-gray-800 w-full max-w-4xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                        <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                        <span className="text-lg font-black tracking-tighter">E</span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight text-xl">{title}</h3>
                </div>
                <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"><X size={24} /></button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar max-h-[70vh]">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Coluna Esquerda: Totais e Pagamentos Base */}
                    <div className="space-y-6">
                        {/* Cartão de Total Principal */}
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 rounded-2xl text-white shadow-xl shadow-blue-600/20 flex justify-between items-center relative overflow-hidden">
                            <div className="relative z-10">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">Total a Pagar</p>
                                <div className="text-4xl font-black tracking-tighter">{formatCurrency(totalAmount)}</div>
                            </div>
                            <div className="relative z-10 opacity-20"><FileText size={48} /></div>
                            <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
                        </div>

                        {/* Grade de Inputs */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* Bloco Numerário */}
                            {(config.paymentMethods?.find(m => m.id === 'CASH')?.isActive ?? true) && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200">
                                    <label className="block text-[11px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                                        <Banknote size={12} className="text-emerald-600" /> Numerário (Cash)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 font-black text-sm">MT</span>
                                        <input 
                                            type="number" 
                                            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-900 dark:text-white" 
                                            placeholder="0.00" 
                                            value={cashAmount} 
                                            onChange={e => setCashAmount(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Bloco Cartão */}
                            {(config.paymentMethods?.find(m => m.id === 'CARD')?.isActive ?? true) && (
                                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 transition-all hover:border-blue-200">
                                    <label className="block text-[11px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
                                        <CreditCard size={12} className="text-blue-600" /> Multicaixa / POS
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-500 font-black text-sm">MT</span>
                                        <input 
                                            type="number" 
                                            className="w-full pl-10 pr-3 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl font-black text-xl outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-gray-900 dark:text-white" 
                                            placeholder="0.00" 
                                            value={cardAmount} 
                                            onChange={e => setCardAmount(e.target.value)} 
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Resumo de Troco / Falta */}
                        <div className={`p-4 rounded-2xl border flex justify-between items-center ${changeAmount > 0 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-900/30' : 'bg-gray-50 border-gray-100 dark:bg-gray-900/50 dark:border-gray-700'}`}>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">{changeAmount > 0 ? 'Troco a Devolver' : 'Valor em Falta'}</p>
                                <p className={`text-xl font-black ${changeAmount > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {formatCurrency(changeAmount > 0 ? changeAmount : missing)}
                                </p>
                            </div>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${changeAmount > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                                {changeAmount > 0 ? <Banknote size={20} /> : <FileText size={20} />}
                            </div>
                        </div>
                    </div>

                    {/* Coluna Direita: Carteiras Digitais */}
                    <div className="space-y-4">
                        <div className="bg-gray-50 dark:bg-gray-900/50 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 h-full flex flex-col">
                            <div className="flex justify-between items-center mb-4">
                                <label className="text-[11px] font-black text-gray-700 dark:text-gray-400 uppercase tracking-[0.15em] flex items-center gap-2">
                                    <Smartphone size={14} className="text-red-600" /> Carteiras Digitais (Mobile Money)
                                </label>
                                <button 
                                    onClick={addWallet} 
                                    className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-full text-[11px] font-black uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                >
                                    <Plus size={12} /> Adicionar
                                </button>
                            </div>

                            <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-1 min-h-[200px]">
                                {walletEntries.map(w => (
                                    <div key={w.id} className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-sm animate-in slide-in-from-top-2 duration-300">
                                        <div className="flex gap-2 mb-2">
                                            <div className="relative flex-[1.5]">
                                                <select 
                                                  className="w-full h-full pl-3 pr-8 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg text-[12px] font-black text-gray-800 dark:text-white outline-none appearance-none" 
                                                  value={w.provider} 
                                                  onChange={e => updateWallet(w.id, 'provider', e.target.value)}
                                                >
                                                    {config.paymentMethods?.filter(m => m.type === 'MOBILE' && m.isActive).map(m => (
                                                      <option key={m.id} value={m.id}>{m.name}</option>
                                                    ))}
                                                </select>
                                                <ChevronDown size={12} className="absolute right-2 top-2.5 text-gray-500 pointer-events-none" />
                                            </div>
                                            <div className="relative flex-1">
                                                <span className="absolute left-2 top-2.5 text-[10px] font-black text-gray-500">MT</span>
                                                <input type="number" className="w-full pl-7 pr-2 py-2 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-700 rounded-lg text-sm font-black text-gray-800 dark:text-white outline-none focus:border-blue-500" placeholder="0.00" value={w.amount} onChange={e => updateWallet(w.id, 'amount', e.target.value)} />
                                            </div>
                                            <button onClick={() => removeWallet(w.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                        <input type="text" className="w-full bg-gray-50/50 dark:bg-gray-900/50 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-[11px] font-mono font-bold text-gray-700 dark:text-gray-400 outline-none focus:border-blue-400" placeholder="Nº de Referência / ID da Transação" value={w.reference} onChange={e => updateWallet(w.id, 'reference', e.target.value)} />
                                    </div>
                                ))}
                                {walletEntries.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl flex flex-col items-center justify-center">
                                        <Smartphone size={32} className="text-gray-300 mb-2" />
                                        <p className="text-[12px] text-gray-400 dark:text-gray-500 font-bold italic">Nenhum pagamento via telemóvel adicionado.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-4">
                <button 
                    onClick={onClose}
                    className="flex-1 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-white font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
                >
                    Cancelar
                </button>
                <button 
                    onClick={handleConfirm}
                    disabled={!canFinalizePayment}
                    className={`flex-[2] py-4 font-black uppercase tracking-widest rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${canFinalizePayment ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                >
                    Confirmar Liquidação <FileText size={20} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default PaymentModal;
