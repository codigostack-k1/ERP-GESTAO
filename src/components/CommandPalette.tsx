
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Wallet, 
  Tag, 
  Warehouse, 
  Users, 
  Settings,
  UserCircle,
  Command,
  ChevronRight
} from 'lucide-react';
import { User, UserRole } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  t: (key: string) => string;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose, currentUser, t }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAdmin = currentUser?.role === UserRole.ADMIN;

  const allActions = [
    { id: 'dash', label: t('menu.dashboard'), path: '/', icon: LayoutDashboard, category: 'Geral' },
    { id: 'pdv', label: t('menu.pos'), path: '/pdv', icon: ShoppingCart, category: 'Vendas' },
    { id: 'inv', label: t('menu.invoicing'), path: '/invoicing', icon: FileText, category: 'Vendas' },
    { id: 'profile', label: t('menu.profile'), path: '/profile', icon: UserCircle, category: 'Conta' },
    
    { id: 'prices', label: t('menu.sales.prices'), path: '/sales/prices', icon: Tag, category: 'Vendas' },
    { id: 'customers', label: t('menu.sales.customers'), path: '/sales/customers', icon: Users, category: 'Vendas' },
    
    { id: 'stock', label: t('menu.warehouse.stock'), path: '/warehouse/stock-list', icon: Warehouse, category: 'Armazém' },
    { id: 'entry', label: t('menu.warehouse.entry'), path: '/warehouse/entry', icon: Warehouse, category: 'Armazém' },
    
    { id: 'cash', label: t('menu.treasury.cash'), path: '/treasury/cash-control', icon: Wallet, category: 'Tesouraria' },
    { id: 'trans', label: t('menu.treasury.trans'), path: '/treasury/transactions', icon: Wallet, category: 'Tesouraria' },
    { id: 'statements', label: t('menu.treasury.statements'), path: '/treasury/statements', icon: Wallet, category: 'Tesouraria' },
    
    { id: 'settings', label: t('menu.settings'), path: '/settings', icon: Settings, category: 'Sistema', adminOnly: true },
    { id: 'users', label: t('menu.users'), path: '/users/edit', icon: Users, category: 'Sistema', adminOnly: true },
  ];

  const filteredActions = allActions.filter(action => {
    if (action.adminOnly && !isAdmin) return false;
    return action.label.toLowerCase().includes(query.toLowerCase()) || 
           action.category.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        setQuery('');
        setActiveIndex(0);
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(prev => (prev < filteredActions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredActions[activeIndex]) {
          navigate(filteredActions[activeIndex].path);
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredActions, activeIndex, navigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="relative flex items-center px-4 border-b border-gray-100 dark:border-gray-700">
          <Search className="text-gray-400" size={20} />
          <input 
            ref={inputRef}
            type="text"
            className="w-full py-4 px-3 bg-transparent outline-none text-gray-900 dark:text-white placeholder-gray-400 text-lg"
            placeholder="O que você está procurando? (Ex: Vendas, Stock...)"
            value={query}
            onChange={e => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
          />
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-[10px] font-bold text-gray-500 dark:text-gray-400">
            <Command size={10} />
            <span>K</span>
          </div>
        </div>

        <div className="flex-1 max-h-[60vh] overflow-y-auto p-2 custom-scrollbar">
          {filteredActions.length > 0 ? (
            <div className="space-y-4">
              {/* Group by category */}
              {Array.from(new Set(filteredActions.map(a => a.category))).map(category => (
                <div key={category}>
                  <h3 className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{category}</h3>
                  <div className="space-y-1">
                    {filteredActions.filter(a => a.category === category).map((action) => {
                      const globalIdx = filteredActions.indexOf(action);
                      const isActive = globalIdx === activeIndex;
                      
                      return (
                        <button
                          key={action.id}
                          onClick={() => {
                            navigate(action.path);
                            onClose();
                          }}
                          onMouseEnter={() => setActiveIndex(globalIdx)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-left
                            ${isActive 
                              ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'}
                          `}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${isActive ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-700'}`}>
                              <action.icon size={18} />
                            </div>
                            <span className="font-medium">{action.label}</span>
                          </div>
                          {isActive && <ChevronRight size={16} className="animate-in slide-in-from-left-2" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                <Search size={32} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum resultado encontrado para &quot;{query}&quot;</p>
              <p className="text-xs text-gray-400 mt-1">Tente pesquisar por termos mais genéricos.</p>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">ENTER</span> Selecionar</span>
            <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">↑↓</span> Navegar</span>
          </div>
          <span className="flex items-center gap-1"><span className="px-1.5 py-0.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm">ESC</span> Fechar</span>
        </div>
      </div>
      
      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
};

export default CommandPalette;
