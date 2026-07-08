import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PDV from './pages/PDV';
import Inventory from './pages/Inventory';
import SalesReport from './pages/SalesReport';
import ProductBlacklist from './pages/ProductBlacklist';
import CustomerManagement from './pages/CustomerManagement';
import Invoicing from './pages/Invoicing';
import PriceList from './pages/PriceList';
import TechnicalList from './pages/TechnicalList';
import WarehouseEntry from './pages/WarehouseEntry';
import WarehouseExit from './pages/WarehouseExit';
import StockList from './pages/StockList';
import SupplierManagement from './pages/SupplierManagement';
import InventoryCount from './pages/InventoryCount';
import RequisitionPage from './pages/Requisition';
import CashControl from './pages/CashControl';
import FinancialReports from './pages/FinancialReports';
import TreasuryTransactions from './pages/TreasuryTransactions';
import TreasuryBanks from './pages/TreasuryBanks';
import TreasuryReceipts from './pages/TreasuryReceipts';
import TreasuryStatements from './pages/TreasuryStatements';
import Expenses from './pages/Expenses';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import UserProfile from './pages/UserProfile';
import ProductKits from './pages/ProductKits';
import RecursosHumanos from './pages/RecursosHumanos';
import StockTracking from './pages/StockTracking';
import CommandPalette from './components/CommandPalette';

import { StorageService } from './services/storageService';
import { UserRole, AppConfig, User, ToastType } from './types';
import { User as UserIcon, Lock, ArrowRight, Unlock, Eye, EyeOff, LogOut, AlertTriangle, ShieldCheck, Key, Menu, Search, X } from 'lucide-react';
import { translations } from './utils/i18n';
import { useToast } from './contexts/ToastContext';
import { ConfirmProvider } from './contexts/ConfirmContext';

// Keys for LocalStorage Persistence
const LS_KEYS = {
  LOCK_STATE: 'ERP_LOCK_STATE',
  ACTIVE_USER: 'ERP_ACTIVE_USER_ID',
  LAST_USERNAME: 'ERP_LAST_USERNAME'
};

// --- PERMISSION GUARD WRAPPER ---
// Checks if the current user has the required permission. If not, redirects to Dashboard or shows access denied.
const PermissionGuard = ({ children, permission, user }: { children?: React.ReactNode, permission?: string, user: User | null }) => {
    if (!user) return <Navigate to="/" />;
    if (user.role === UserRole.ADMIN) return <>{children}</>; // Admin bypass
    if (!permission) return <>{children}</>; // No permission needed

    // Check custom permissions
    const hasAccess = user.customPermissions?.includes(permission);
    
    if (hasAccess) {
        return <>{children}</>;
    } else {
        // Fallback UI or Redirect
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                    <Lock size={32} className="text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Acesso Negado</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Você não tem permissão para acessar este módulo: <strong>{permission}</strong>.</p>
                <p className="text-sm text-gray-400 mt-4">Contacte o administrador do sistema.</p>
            </div>
        );
    }
};

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  toggleTheme: () => void;
  isDark: boolean;
  t: (key: string) => string;
}

// Simplified Layout Wrapper
const Layout = ({ children, user, onLogout, toggleTheme, isDark, t }: LayoutProps) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMobileSidebarOpen(false);

    if (!user) return;

    let moduleName = '';
    let actionName = '';

    switch (pathname) {
      case '/':
        moduleName = 'PAINEL';
        actionName = 'Acedeu ao Painel de Controlo';
        break;
      case '/pdv':
        moduleName = 'PDV';
        actionName = 'Acedeu ao Ponto de Venda (PDV)';
        break;
      case '/invoicing':
        moduleName = 'FATURACAO';
        actionName = 'Acedeu à Faturação';
        break;
      case '/sales/prices':
        moduleName = 'TABELA_PRECOS';
        actionName = 'Acedeu à Tabela de Preços';
        break;
      case '/sales/tech-list':
        moduleName = 'FICHA_TECNICA';
        actionName = 'Acedeu às Fichas Técnicas';
        break;
      case '/sales/products':
        moduleName = 'PRODUTOS';
        actionName = 'Acedeu à Lista de Produtos';
        break;
      case '/sales/iva-products':
        moduleName = 'PRODUTOS';
        actionName = 'Acedeu à Lista de Produtos com IVA';
        break;
      case '/sales/kits':
        moduleName = 'KITS';
        actionName = 'Acedeu aos Kits de Produtos';
        break;
      case '/sales/blacklist':
        moduleName = 'LISTA_NEGRA';
        actionName = 'Acedeu à Lista Negra de Produtos';
        break;
      case '/sales/customers':
        moduleName = 'CLIENTES';
        actionName = 'Acedeu à Gestão de Clientes';
        break;
      case '/sales/reports':
        moduleName = 'RELATORIOS_VENDAS';
        actionName = 'Acedeu aos Relatórios de Vendas';
        break;
      case '/warehouse/entry':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu a Entradas de Mercadoria';
        break;
      case '/warehouse/exit':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu a Saídas de Mercadoria';
        break;
      case '/warehouse/requisition':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu a Requisições de Armazém';
        break;
      case '/warehouse/inventory':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu a Contagens de Inventário';
        break;
      case '/warehouse/stock-list':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu à Lista de Stock';
        break;
      case '/warehouse/suppliers':
        moduleName = 'ARMAZEM';
        actionName = 'Acedeu à Gestão de Fornecedores';
        break;
      case '/treasury/cash-control':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu ao Controlo de Caixas';
        break;
      case '/treasury/reports':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu a Relatórios Financeiros';
        break;
      case '/treasury/transactions':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu a Transações e Lançamentos';
        break;
      case '/treasury/banks':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu à Gestão de Contas Bancárias';
        break;
      case '/treasury/expenses':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu à Gestão de Despesas';
        break;
      case '/treasury/receipts':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu a Recibos de Clientes';
        break;
      case '/treasury/statements':
        moduleName = 'TESOURARIA';
        actionName = 'Acedeu a Extratos de Contas';
        break;
      case '/users/edit':
        moduleName = 'UTILIZADORES';
        actionName = 'Acedeu à Lista de Utilizadores';
        break;
      case '/users/new':
        moduleName = 'UTILIZADORES';
        actionName = 'Acedeu à Criação de Utilizador';
        break;
      case '/users/history':
        moduleName = 'UTILIZADORES';
        actionName = 'Acedeu ao Histórico de Atividade (Logs)';
        break;
      case '/users/permissions':
        moduleName = 'UTILIZADORES';
        actionName = 'Acedeu a Perfis e Permissões';
        break;
      case '/profile':
        moduleName = 'PERFIL';
        actionName = 'Acedeu ao seu Perfil de Utilizador';
        break;
      case '/hr':
        moduleName = 'RECURSOS_HUMANOS';
        actionName = 'Acedeu ao módulo de Recursos Humanos (RH)';
        break;
      default:
        if (pathname.startsWith('/settings')) {
          moduleName = 'CONFIGURACOES';
          actionName = 'Acedeu às Configurações do Sistema';
        }
        break;
    }

    if (moduleName && actionName) {
      StorageService.logActivity({
        userId: user.id,
        userName: user.name,
        action: actionName,
        module: moduleName,
        deviceInfo: 'Browser'
      });
    }
  }, [pathname, user]);

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-dark-bg text-gray-900 dark:text-dark-text transition-colors duration-200 ${isDark ? 'dark' : ''}`}>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white dark:bg-dark-sidebar border-b border-gray-100 dark:border-dark-border z-40 flex items-center justify-between px-4">
        <button 
          onClick={() => setIsMobileSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors"
        >
          <Menu size={24} />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">E</div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">ERP <span className="text-blue-600">Pro</span></span>
        </div>
        <button 
          onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 transition-colors"
        >
          <Search size={24} />
        </button>
      </div>

      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <Sidebar 
        userRole={user?.role || UserRole.SELLER} 
        onLogout={onLogout} 
        toggleTheme={toggleTheme} 
        isDark={isDark} 
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        t={t}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />
      <main 
        className={`p-4 lg:p-8 transition-all duration-300 ease-in-out min-h-screen pb-20 pt-20 lg:pt-8
          ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}
      >
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </div>
      </main>
    </div>
  );
};

// Login Component (Clean & Professional)
const Login = ({ onLogin }: { onLogin: (u: string, p: string) => Promise<{ success: boolean; error?: string; forceChange?: boolean }> }) => {
  const { showToast } = useToast();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
      // Initialize with remembered user or default 'admin' if none
      const lastUser = localStorage.getItem(LS_KEYS.LAST_USERNAME);
      if (lastUser) {
          setUsername(lastUser);
          setRememberMe(true);
      } else if (!username) {
          setUsername('');
      }

      function handleClickOutside(event: MouseEvent) {
          if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
              setShowSuggestions(false);
          }
      }
      document.addEventListener("mousedown", handleClickOutside);
      
      // Auto-focus username on mount
      const timer = setTimeout(() => {
        const input = wrapperRef.current?.querySelector('input');
        if (input) input.focus();
      }, 300);

      return () => {
          document.removeEventListener("mousedown", handleClickOutside);
          clearTimeout(timer);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter users Logic
  const getFilteredUsers = (query: string) => {
      const users = StorageService.getUsers();
      // Only active users
      let filtered = users
          .filter((u: User) => u.isActive !== false)
          .map((u: User) => u.username);
      
      // Filter by query if typing
      if (query) {
          filtered = filtered.filter((u: string) => u.toLowerCase().includes(query.toLowerCase()));
      }

      // Prioritize last logged user
      const lastUser = localStorage.getItem(LS_KEYS.LAST_USERNAME);
      if (lastUser) {
          filtered.sort((a: string, b: string) => {
              if (a === lastUser) return -1;
              if (b === lastUser) return 1;
              return 0;
          });
      }
      return filtered;
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setUsername(val);
      setSuggestions(getFilteredUsers(val));
      setShowSuggestions(true);
      setActiveSuggestionIndex(-1);
      setError('');
  };

  const handleUsernameFocus = () => {
      setSuggestions(getFilteredUsers(username));
      setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
      setUsername(suggestion);
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      if (e.key === 'ArrowDown') {
          e.preventDefault();
          setActiveSuggestionIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setActiveSuggestionIndex(prev => (prev > 0 ? prev - 1 : -1));
      } else if (e.key === 'Enter') {
          if (activeSuggestionIndex >= 0 && suggestions[activeSuggestionIndex]) {
              e.preventDefault();
              setUsername(suggestions[activeSuggestionIndex]);
              setShowSuggestions(false);
          } else {
              // If no suggestion selected, standard enter behavior (submit) will trigger from form
              setShowSuggestions(false);
          }
      } else if (e.key === 'Escape') {
          setShowSuggestions(false);
      } else if (e.key === 'Tab') {
          setShowSuggestions(false);
      }
  };

  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Recovery State
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState<'USER' | 'QUESTIONS' | 'RESET'>('USER');
  const [recoveryUsername, setRecoveryUsername] = useState('');
  const [recoveryUser, setRecoveryUser] = useState<User | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [recoveryAnswer, setRecoveryAnswer] = useState('');
  const [recoveryError, setRecoveryError] = useState('');

  const handleStartRecovery = () => {
    setRecoveryStep('USER');
    setRecoveryUsername(username);
    setRecoveryError('');
    setShowRecoveryModal(true);
  };

  const handleFindRecoveryUser = () => {
    const users = StorageService.getUsers();
    const user = users.find(u => u.username.toLowerCase() === recoveryUsername.toLowerCase());
    if (!user) {
      setRecoveryError('Usuário não encontrado.');
      return;
    }
    if (!user.securityQuestions || user.securityQuestions.length === 0) {
      setRecoveryError('Este usuário não configurou perguntas de segurança.');
      return;
    }
    setRecoveryUser(user);
    setRecoveryStep('QUESTIONS');
    setCurrentQuestionIndex(0);
    setRecoveryError('');
  };

  const handleVerifyAnswer = () => {
    if (!recoveryUser) return;
    const isValid = StorageService.verifySecurityAnswer(recoveryUser.id, currentQuestionIndex, recoveryAnswer);
    if (isValid) {
      if (currentQuestionIndex < (recoveryUser.securityQuestions?.length || 0) - 1) {
        setCurrentQuestionIndex(prev => prev + 1);
        setRecoveryAnswer('');
        setRecoveryError('');
      } else {
        setRecoveryStep('RESET');
        setNewPassword('');
        setConfirmPassword('');
        setRecoveryError('');
      }
    } else {
      setRecoveryError('Resposta incorreta.');
    }
  };

  const handleRecoveryReset = () => {
    if (!recoveryUser) return;
    if (newPassword !== confirmPassword) {
      setRecoveryError('As senhas não coincidem.');
      return;
    }
    if (newPassword.length < 6) {
      setRecoveryError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    StorageService.changePassword(recoveryUser.id, newPassword, false);
    showToast('Senha redefinida com sucesso!', ToastType.SUCCESS);
    setShowRecoveryModal(false);
    setUsername(recoveryUser.username);
    setPassword('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setShowSuggestions(false); 
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const result = await onLogin(username, password);
    if (result.success) {
        showToast('Login realizado com sucesso!', ToastType.SUCCESS);
        if (result.forceChange) {
            setShowChangePassword(true);
            setLoading(false);
            return;
        }
        if (rememberMe) {
            localStorage.setItem(LS_KEYS.LAST_USERNAME, username);
        } else {
            localStorage.removeItem(LS_KEYS.LAST_USERNAME);
        }
    } else {
        setError(result.error || 'Usuário ou senha incorretos.');
        showToast(result.error || 'Usuário ou senha incorretos.', ToastType.ERROR);
        setLoading(false);
    }
  };

  const handleChangePassword = () => {
      if (newPassword !== confirmPassword) {
          setError('As senhas não coincidem.');
          return;
      }
      if (newPassword.length < 6) {
          setError('A senha deve ter pelo menos 6 caracteres.');
          return;
      }

      const users = StorageService.getUsers();
      const user = users.find(u => u.username === username);
      if (user) {
          StorageService.changePassword(user.id, newPassword, false);
          showToast("Senha alterada com sucesso! Faça login novamente.", ToastType.SUCCESS);
          setShowChangePassword(false);
          setPassword('');
          setNewPassword('');
          setConfirmPassword('');
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4 transition-colors duration-500 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-3xl text-white shadow-2xl shadow-blue-500/30 mb-6 transform hover:rotate-12 transition-transform duration-300">
            <ShieldCheck size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight mb-2">ERP <span className="text-blue-600">Gestão</span></h1>
          <p className="text-gray-500 dark:text-dark-text-muted font-medium">Bem-vindo! Acesse sua conta para continuar.</p>
        </div>

        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-xl border border-gray-100 dark:border-dark-border p-8 backdrop-blur-sm relative z-10">
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase tracking-widest mb-2 ml-1">Utilizador</label>
            <div className="relative" ref={wrapperRef}>
              <input 
                type="text" 
                value={username}
                onChange={handleUsernameChange}
                onFocus={handleUsernameFocus}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white font-medium relative z-10" 
                placeholder="Seu nome de usuário"
                required
              />
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 z-20">
                <UserIcon size={18} />
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      {suggestions.map((suggestion, index) => (
                          <button 
                              key={suggestion}
                              type="button"
                              onClick={() => handleSuggestionClick(suggestion)}
                              onMouseEnter={() => setActiveSuggestionIndex(index)}
                              className={`w-full px-4 py-3 text-left transition-colors flex items-center gap-2
                                  ${index === activeSuggestionIndex 
                                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                                      : 'text-gray-700 dark:text-dark-text hover:bg-gray-50 dark:hover:bg-white/5'
                                  }
                              `}
                          >
                              <UserIcon size={14} className={index === activeSuggestionIndex ? 'text-blue-600' : 'text-blue-500'} />
                              <span className="font-medium">{suggestion}</span>
                          </button>
                      ))}
                  </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-bold text-gray-400 dark:text-dark-text-muted uppercase tracking-widest mb-2 ml-1">Senha</label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <Lock size={18} />
              </div>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-12 pr-12 py-3.5 bg-gray-50 dark:bg-dark-bg border border-gray-100 dark:border-dark-border rounded-2xl outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-900 dark:text-white font-medium"
                placeholder="••••••••"
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && <div className="text-red-500 text-sm text-center font-medium">{error}</div>}

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input 
                type="checkbox" 
                className="rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700" 
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span className="text-gray-600 dark:text-gray-400 group-hover:text-gray-800 dark:group-hover:text-gray-200 transition-colors">Lembrar-me</span>
            </label>
            <button 
              type="button" 
              onClick={handleStartRecovery}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Esqueceu a senha?
            </button>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-bold shadow-xl shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Entrar</span>
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-[13.2px] leading-relaxed text-gray-500 dark:text-gray-400 font-medium">
            ERP Gestão &copy; 2026
          </p>
          <p className="text-[11px] leading-relaxed text-gray-400 dark:text-gray-500 mt-1.5 font-sans">
            Criado por <span className="font-bold text-gray-500 dark:text-gray-400">Codigo Stack&trade;</span>
          </p>
        </div>
      </div>

      {/* Modal Alterar Senha Obrigatório */}
      {showChangePassword && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
              <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto mb-4">
                          <Key size={32} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alteração Obrigatória</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                          Por motivos de segurança, você deve alterar sua senha antes de continuar.
                      </p>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nova Senha</label>
                          <input 
                            type="password"
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Mínimo 6 caracteres"
                            value={newPassword} onChange={e => setNewPassword(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirmar Nova Senha</label>
                          <input 
                            type="password"
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Repita a nova senha"
                            value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                          />
                      </div>

                      {error && <p className="text-xs text-red-500 text-center font-bold">{error}</p>}

                      <button 
                        onClick={handleChangePassword}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95"
                      >
                          Atualizar e Entrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Recuperação de Conta */}
      {showRecoveryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                <ShieldCheck size={24} />
              </div>
              <button 
                onClick={() => setShowRecoveryModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Recuperar Conta</h2>
            
            {recoveryStep === 'USER' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500 dark:text-gray-400">Informe seu nome de usuário para iniciar a recuperação.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Utilizador</label>
                  <input 
                    type="text"
                    value={recoveryUsername}
                    onChange={e => setRecoveryUsername(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome de usuário"
                  />
                </div>
                {recoveryError && <p className="text-xs text-red-500 font-bold">{recoveryError}</p>}
                <button 
                  onClick={handleFindRecoveryUser}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  Continuar
                </button>
              </div>
            )}

            {recoveryStep === 'QUESTIONS' && recoveryUser && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg text-xs text-blue-600 dark:text-blue-400 font-medium">
                  Pergunta {currentQuestionIndex + 1} de {recoveryUser.securityQuestions?.length}
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-700 dark:text-white mb-3">
                    {recoveryUser.securityQuestions?.[currentQuestionIndex].question}
                  </p>
                  <input 
                    type="text"
                    value={recoveryAnswer}
                    onChange={e => setRecoveryAnswer(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Sua resposta"
                  />
                </div>
                {recoveryError && <p className="text-xs text-red-500 font-bold">{recoveryError}</p>}
                <button 
                  onClick={handleVerifyAnswer}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all"
                >
                  Verificar Resposta
                </button>
              </div>
            )}

            {recoveryStep === 'RESET' && (
              <div className="space-y-4">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-4">Identidade confirmada! Defina sua nova senha.</p>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Nova Senha</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Confirmar Senha</label>
                  <input 
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Repita a senha"
                  />
                </div>
                {recoveryError && <p className="text-xs text-red-500 font-bold">{recoveryError}</p>}
                <button 
                  onClick={handleRecoveryReset}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-all"
                >
                  Redefinir Senha
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

// Lock Screen Component
interface LockScreenProps {
  currentUser: User;
  onUnlock: () => void;
  onLogout: () => void;
}

const LockScreen = ({ currentUser, onUnlock, onLogout }: LockScreenProps) => {
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleUnlockAttempt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    const isValid = currentUser.passwordHash 
        ? StorageService.checkPassword(password, currentUser.passwordHash)
        : false;

    if (isValid) {
        setError('');
        onUnlock();
    } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        setPassword(''); 
        
        if (newAttempts >= 3) {
            showToast("Número máximo de tentativas excedido. Por segurança, a sessão será encerrada.", ToastType.ERROR);
            onLogout();
        } else {
            setError(`Senha incorreta. Tentativa ${newAttempts}/3`);
        }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="relative z-10 max-w-sm w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-8 border border-gray-200 dark:border-gray-700 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-2xl font-black">E</div>
                <span className="text-xl font-black tracking-tighter">E</span>
            </div>
            <span className="font-bold text-gray-700 dark:text-gray-200 tracking-wider text-sm uppercase">ERP Gestão</span>
        </div>

        <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30 p-1">
            <div className="w-full h-full bg-white dark:bg-gray-800 rounded-full flex items-center justify-center border-4 border-transparent">
               <ShieldCheck className="text-blue-600 dark:text-blue-400" size={40} />
            </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Sessão Protegida</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 leading-relaxed">
            Olá, <strong className="text-gray-800 dark:text-white">{currentUser.name}</strong>.<br/>
            Digite sua senha para retomar o trabalho.
        </p>

        <div className="mb-4">
          <div className="relative">
            <div className="absolute left-3 top-3 text-gray-400">
              <UserIcon size={18} />
            </div>
            <div className="w-full pl-10 pr-4 py-3 bg-gray-50/30 dark:bg-gray-950/30 border border-gray-100 dark:border-gray-800 rounded-xl text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
              {currentUser.username}
            </div>
          </div>
        </div>
        
        <form onSubmit={handleUnlockAttempt} className="space-y-4">
          <div className="relative group">
            <Lock className="absolute left-3 top-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Senha de Acesso"
              autoFocus
              className="w-full pl-10 pr-10 py-3 bg-gray-50/50 dark:bg-gray-950/50 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all dark:text-white font-medium placeholder-gray-400"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
              <div className="flex items-center justify-center gap-2 text-red-500 text-xs font-bold bg-red-50/80 dark:bg-red-900/20 py-2 rounded-lg animate-in fade-in slide-in-from-top-1">
                  <AlertTriangle size={14} /> {error}
              </div>
          )}
          
          <button type="submit" className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all transform active:scale-95 flex items-center justify-center gap-2">
            <Unlock size={20} />
            <span>Desbloquear Sistema</span>
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200/60 dark:border-gray-700/60">
            <button 
                onClick={onLogout}
                className="text-xs font-semibold text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400 flex items-center justify-center gap-2 w-full transition-colors uppercase tracking-wide"
            >
                <LogOut size={14} /> Encerrar Sessão (Trocar Conta)
            </button>
        </div>
      </div>
    </div>
  );
};

import { ToastProvider } from './contexts/ToastContext';

function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const [isLocked, setIsLocked] = useState<boolean>(() => {
      return localStorage.getItem(LS_KEYS.LOCK_STATE) === 'TRUE';
  });
  
  const [config, setConfig] = useState<AppConfig>(StorageService.getConfig());
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Session Restoration on Mount ---
  useEffect(() => {
      const storedUserId = localStorage.getItem(LS_KEYS.ACTIVE_USER);
      if (storedUserId && !currentUser) {
          const users = StorageService.getUsers();
          const found = users.find((u: User) => u.id === storedUserId);
          if (found) {
              setCurrentUser(found);
          }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Lock State Persistence ---
  useEffect(() => {
      if (isLocked) {
          localStorage.setItem(LS_KEYS.LOCK_STATE, 'TRUE');
      } else {
          localStorage.removeItem(LS_KEYS.LOCK_STATE);
      }
  }, [isLocked]);

  const resetInactivityTimer = useCallback(() => {
    if (!currentUser || isLocked) return;

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    const timeoutMinutes = config.inactivityTimeout ?? 5;
    if (timeoutMinutes === 0) return; // Disabled

    timerRef.current = setTimeout(() => {
      setIsLocked(true);
    }, timeoutMinutes * 60 * 1000);
  }, [currentUser, isLocked, config.inactivityTimeout]);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
  };

  useEffect(() => {
    applyTheme(config.darkMode);
  }, [config.darkMode]);

  // Setup Activity Listeners
  useEffect(() => {
    const handleCommandK = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleCommandK);

    if (currentUser && !isLocked) {
      const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      
      resetInactivityTimer();

      events.forEach(event => {
        window.addEventListener(event, resetInactivityTimer);
      });

      return () => {
        window.removeEventListener('keydown', handleCommandK);
        if (timerRef.current) clearTimeout(timerRef.current);
        events.forEach(event => {
          window.removeEventListener(event, resetInactivityTimer);
        });
      };
    }
    
    return () => window.removeEventListener('keydown', handleCommandK);
  }, [currentUser, isLocked, resetInactivityTimer]);

  const handleConfigUpdate = (newConfig: AppConfig) => {
    setConfig(newConfig);
    applyTheme(newConfig.darkMode);
  };

  const toggleTheme = () => {
    const newConfig = { ...config, darkMode: !config.darkMode };
    handleConfigUpdate(newConfig);
    StorageService.saveConfig(newConfig);
  };

  const handleLogin = async (u: string, p: string): Promise<{ success: boolean; error?: string; forceChange?: boolean }> => {
    const users = StorageService.getUsers();
    const user = users.find(usr => usr.username === u);

    if (!user) return { success: false, error: 'Usuário não encontrado.' };
    if (user.isActive === false) return { success: false, error: 'Conta desativada. Contacte o administrador.' };
    if (user.isLocked) return { success: false, error: 'Conta bloqueada por excesso de tentativas.' };

    const loggedInUser = StorageService.login(u, p);
    if (loggedInUser) {
        if (loggedInUser.forcePasswordChange) {
            return { success: true, forceChange: true };
        }

        setCurrentUser(loggedInUser);
        setIsLocked(false);
        localStorage.setItem(LS_KEYS.ACTIVE_USER, loggedInUser.id);
        
        StorageService.logActivity({
            userId: loggedInUser.id,
            userName: loggedInUser.name,
            action: 'LOGIN',
            module: 'AUTH',
            deviceInfo: 'Browser'
        });
        return { success: true };
    }
    
    // If login failed, check if it just got locked
    const updatedUser = StorageService.getUsers().find(usr => usr.username === u);
    if (updatedUser?.isLocked) {
        return { success: false, error: 'Conta bloqueada por excesso de tentativas.' };
    }

    return { success: false, error: 'Senha incorreta.' };
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsLocked(false);
    localStorage.removeItem(LS_KEYS.ACTIVE_USER);
    localStorage.removeItem(LS_KEYS.LOCK_STATE);
  };

  const handleUnlock = () => {
    setIsLocked(false);
    resetInactivityTimer();
  };

  const t = (key: string) => {
    const lang = config.language || 'pt';
    return translations[lang]?.[key] || key;
  };

  return (
    <ToastProvider>
      <ConfirmProvider>
        {!currentUser ? (
          <Login onLogin={handleLogin} />
        ) : (
          <HashRouter>
            <CommandPalette 
              isOpen={isCommandPaletteOpen} 
              onClose={() => setIsCommandPaletteOpen(false)} 
              currentUser={currentUser}
              t={t}
            />
            {isLocked && (
                <LockScreen 
                  currentUser={currentUser} 
                  onUnlock={handleUnlock} 
                  onLogout={handleLogout}
                />
            )}
            
            <div className={isLocked ? 'filter blur-sm pointer-events-none select-none h-screen overflow-hidden' : ''}>
              <Layout 
                user={currentUser}
                onLogout={handleLogout}
                toggleTheme={toggleTheme} 
                isDark={config.darkMode}
                t={t}
              >
                <Routes>
                  {/* ... existing routes ... */}
                  <Route path="/" element={<Dashboard currentUser={currentUser} t={t} />} />
                  
                  <Route path="/pdv" element={<PermissionGuard user={currentUser} permission="VIEW_PDV"><PDV config={config} currentUser={currentUser} /></PermissionGuard>} />
                  
                  <Route path="/invoicing" element={<PermissionGuard user={currentUser} permission="VIEW_INVOICING"><Invoicing config={config} currentUser={currentUser} /></PermissionGuard>} />

                  {/* Mapped Routes */}
                  <Route path="/sales/prices" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_PRICES"><PriceList config={config} /></PermissionGuard>} />
                  <Route path="/sales/tech-list" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_TECH_LIST"><TechnicalList config={config} /></PermissionGuard>} />
                  <Route path="/sales/products" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_PRODUCTS"><Inventory config={config} pageTitle="Lista de Produtos" /></PermissionGuard>} />
                  <Route path="/sales/iva-products" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_IVA_PRODUCTS"><Inventory config={config} pageTitle="Produtos com IVA" filterMode="IVA_ONLY" /></PermissionGuard>} />
                  <Route path="/sales/kits" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_KITS"><ProductKits t={t} /></PermissionGuard>} />
                  <Route path="/sales/blacklist" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_BLACKLIST"><ProductBlacklist config={config} /></PermissionGuard>} />
                  <Route path="/sales/customers" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_CUSTOMERS"><CustomerManagement config={config} /></PermissionGuard>} />
                  <Route path="/sales/tracking" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_REPORTS"><StockTracking config={config} currentUser={currentUser} /></PermissionGuard>} />
                  <Route path="/sales/reports" element={<PermissionGuard user={currentUser} permission="VIEW_SALES_REPORTS"><SalesReport config={config} /></PermissionGuard>} />

                  {/* Warehouse Routes */}
                  <Route path="/warehouse/entry" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_ENTRY"><WarehouseEntry config={config} /></PermissionGuard>} />
                  <Route path="/warehouse/exit" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_EXIT"><WarehouseExit config={config} /></PermissionGuard>} />
                  <Route path="/warehouse/requisition" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_REQ"><RequisitionPage config={config} /></PermissionGuard>} />
                  <Route path="/warehouse/inventory" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_INV"><InventoryCount config={config} /></PermissionGuard>} />
                  <Route path="/warehouse/stock-list" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_STOCK"><StockList config={config} /></PermissionGuard>} />
                  <Route path="/warehouse/suppliers" element={<PermissionGuard user={currentUser} permission="VIEW_WAREHOUSE_SUP"><SupplierManagement config={config} /></PermissionGuard>} />

                  <Route path="/treasury/cash-control" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_CASH"><CashControl config={config} currentUser={currentUser || undefined} /></PermissionGuard>} />
                  <Route path="/treasury/reports" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_REPORTS"><FinancialReports config={config} /></PermissionGuard>} />
                  <Route path="/treasury/transactions" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_TRANS"><TreasuryTransactions config={config} currentUser={currentUser || undefined} /></PermissionGuard>} />
                  <Route path="/treasury/banks" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_BANKS"><TreasuryBanks config={config} /></PermissionGuard>} />
                  <Route path="/treasury/expenses" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_EXP"><Expenses config={config} /></PermissionGuard>} />
                  <Route path="/treasury/receipts" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_RECEIPTS"><TreasuryReceipts config={config} /></PermissionGuard>} />
                  <Route path="/treasury/statements" element={<PermissionGuard user={currentUser} permission="VIEW_TREASURY_STATEMENTS"><TreasuryStatements config={config} /></PermissionGuard>} />

                  {/* Recursos Humanos Módulo */}
                  <Route path="/hr" element={<PermissionGuard user={currentUser} permission="VIEW_HR_EMPLOYEES"><RecursosHumanos config={config} currentUser={currentUser} /></PermissionGuard>} />

                  {/* User Management Routes */}
                  <Route path="/users/edit" element={<PermissionGuard user={currentUser} permission="VIEW_USERS"><UserManagement config={config} userRole={currentUser.role} initialView="EDIT" t={t} /></PermissionGuard>} />
                  <Route path="/users/new" element={<PermissionGuard user={currentUser} permission="VIEW_USERS"><UserManagement config={config} userRole={currentUser.role} initialView="NEW" t={t} /></PermissionGuard>} />
                  <Route path="/users/history" element={<PermissionGuard user={currentUser} permission="VIEW_USERS"><UserManagement config={config} userRole={currentUser.role} initialView="HISTORY" t={t} /></PermissionGuard>} />
                  <Route path="/users/permissions" element={<PermissionGuard user={currentUser} permission="VIEW_USERS"><UserManagement config={config} userRole={currentUser.role} initialView="PERMISSIONS" t={t} /></PermissionGuard>} />

                  {/* Settings Consolidated Route */}
                  <Route path="/settings/*" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="GENERAL" t={t} /></PermissionGuard>} />
                  
                  <Route path="/settings/company" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="COMPANY" t={t} /></PermissionGuard>} />
                  <Route path="/settings/financial" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="FINANCIAL" t={t} /></PermissionGuard>} />
                  <Route path="/settings/payments" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="FINANCIAL" t={t} /></PermissionGuard>} />
                  <Route path="/settings/currency" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="FINANCIAL" t={t} /></PermissionGuard>} />
                  
                  <Route path="/settings/general" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="GENERAL" t={t} /></PermissionGuard>} />
                  <Route path="/settings/language" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="GENERAL" t={t} /></PermissionGuard>} />
                  <Route path="/settings/font-size" element={<PermissionGuard user={currentUser} permission="VIEW_SETTINGS"><Settings config={config} userRole={currentUser.role} onConfigChange={handleConfigUpdate} initialTab="GENERAL" t={t} /></PermissionGuard>} />

                  <Route path="/profile" element={<UserProfile currentUser={currentUser} t={t} />} />

                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            </div>
          </HashRouter>
        )}
      </ConfirmProvider>
    </ToastProvider>
  );
}


export default App;