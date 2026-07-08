
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserPlus, 
  UserCog, 
  History, 
  Shield, 
  Search, 
  Edit2, 
  Lock, 
  Unlock, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw,
  Printer,
  LayoutDashboard,
  ShoppingBag,
  Package,
  Landmark,
  Settings,
  X,
  ShieldAlert,
  ShieldCheck,
  Activity,
  Key,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { generateUserLogReportHtml } from '../utils/receipt';
import { User, UserRole, UserLog, AppConfig, ToastType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

interface UserManagementProps {
  config: AppConfig;
  userRole: UserRole; // Current logged in user role
  initialView?: 'EDIT' | 'NEW' | 'HISTORY' | 'PERMISSIONS';
  t: (key: string) => string;
}

// Definição da Árvore de Permissões do Sistema
const SYSTEM_MODULES = [
    {
        id: 'DASHBOARD',
        label: 'Dashboard (Widgets)',
        icon: LayoutDashboard,
        permissions: [
            { key: 'WIDGET_KPI_SALES_TODAY', label: 'KPI: Vendas Hoje' },
            { key: 'WIDGET_KPI_EXPENSES_TODAY', label: 'KPI: Despesas Hoje' },
            { key: 'WIDGET_KPI_PROFIT_TODAY', label: 'KPI: Lucro Hoje' },
            { key: 'WIDGET_KPI_LOW_STOCK', label: 'KPI: Stock Baixo' },
            { key: 'WIDGET_KPI_EXPIRY', label: 'KPI: Validade Próxima' },
            { key: 'WIDGET_RANKING', label: 'Ranking de Produtos' },
            { key: 'WIDGET_ALERTS', label: 'Alertas de Stock' },
            { key: 'WIDGET_CHART', label: 'Gráficos de Vendas' }
        ]
    },
    {
        id: 'SALES',
        label: 'Gestão de Vendas',
        icon: ShoppingBag,
        permissions: [
            { key: 'VIEW_PDV', label: 'Ponto de Venda (PDV)' },
            { key: 'VIEW_INVOICING', label: 'Emissão de Facturas' },
            { key: 'VIEW_SALES_PRICES', label: 'Lista de Preços' },
            { key: 'VIEW_SALES_PRODUCTS', label: 'Catálogo de Produtos' },
            { key: 'VIEW_SALES_IVA_PRODUCTS', label: 'Produtos com IVA' },
            { key: 'VIEW_SALES_KITS', label: 'Kits de Produtos' },
            { key: 'VIEW_SALES_CUSTOMERS', label: 'Gestão de Clientes' },
            { key: 'VIEW_SALES_BLACKLIST', label: 'Lista Negra' },
            { key: 'VIEW_SALES_REPORTS', label: 'Relatórios de Vendas' },
        ]
    },
    {
        id: 'WAREHOUSE',
        label: 'Gestão de Armazém',
        icon: Package,
        permissions: [
            { key: 'VIEW_WAREHOUSE_ENTRY', label: 'Entrada de Mercadoria' },
            { key: 'VIEW_WAREHOUSE_EXIT', label: 'Saída de Mercadoria' },
            { key: 'VIEW_WAREHOUSE_REQ', label: 'Requisições de Compra' },
            { key: 'VIEW_WAREHOUSE_INV', label: 'Auditoria / Inventário' },
            { key: 'VIEW_WAREHOUSE_STOCK', label: 'Lista de Stock' },
            { key: 'VIEW_WAREHOUSE_SUP', label: 'Gestão de Fornecedores' },
        ]
    },
    {
        id: 'TREASURY',
        label: 'Tesouraria',
        icon: Landmark,
        permissions: [
            { key: 'VIEW_TREASURY_CASH', label: 'Controlo de Caixa' },
            { key: 'VIEW_TREASURY_TRANS', label: 'Transações (Entradas/Saídas)' },
            { key: 'VIEW_TREASURY_BANKS', label: 'Bancos e Carteiras' },
            { key: 'VIEW_TREASURY_EXP', label: 'Despesas' },
            { key: 'VIEW_TREASURY_RECEIPTS', label: 'Recebimentos / Liquidação' },
            { key: 'VIEW_TREASURY_REPORTS', label: 'Relatórios Financeiros' },
            { key: 'VIEW_TREASURY_STATEMENTS', label: 'Extratos de Contas' },
        ]
    },
    {
        id: 'SYSTEM',
        label: 'Sistema',
        icon: Settings,
        permissions: [
            { key: 'VIEW_USERS', label: 'Gestão de Usuários' },
            { key: 'VIEW_SETTINGS', label: 'Definições Gerais' },
        ]
    }
];

const UserManagement: React.FC<UserManagementProps> = ({ config, userRole, initialView = 'EDIT', t }) => {
  const { showToast } = useToast();
  const { confirm, prompt } = useConfirm();
  const [activeView, setActiveView] = useState(initialView);
  const [users, setUsers] = useState<User[]>([]);
  const [logs, setLogs] = useState<UserLog[]>([]);
  
  // --- Form States ---
  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', contact: '', role: UserRole.SELLER });
  const [showPassword, setShowPassword] = useState(false);
  
  // --- Edit State ---
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // --- Permissions Modal State ---
  const [permissionUser, setPermissionUser] = useState<User | null>(null);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);
  const [tempPermissions, setTempPermissions] = useState<string[]>([]);

  // --- History Filters ---
  const [logSearch, setLogSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');

  const [logsLast24h, setLogsLast24h] = useState(0);

  // --- Pagination ---
  const [logPage, setLogPage] = useState(1);
  const [userPage, setUserPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
      const now = Date.now();
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      const count = logs.filter(l => new Date(l.date).getTime() > oneDayAgo).length;
      setLogsLast24h(count);
  }, [logs]);

  const loadData = useCallback(() => {
    setUsers(StorageService.getUsers());
    setLogs(StorageService.getLogs());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setLogPage(1);
  }, [logSearch]);

  useEffect(() => {
    setUserPage(1);
  }, [userSearch]);

  useEffect(() => {
    setActiveView(initialView);
  }, [initialView]);

  // --- Security Gatekeeper ---
  if (userRole !== UserRole.ADMIN) {
      return (
          <div className="flex flex-col items-center justify-center h-[50vh] bg-white dark:bg-dark-card rounded-2xl border border-gray-200 dark:border-dark-border p-8 text-center shadow-sm">
              <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
                  <Lock size={40} className="text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text mb-2">Acesso Restrito</h1>
              <p className="text-gray-500 dark:text-dark-text-muted max-w-md">Este módulo é exclusivo para Administradores.</p>
          </div>
      );
  }

  // --- Handlers: New User ---
  const handleCreateUser = () => {
      if (!newUser.name || !newUser.username || !newUser.password) {
          showToast("Preencha os campos obrigatórios.", ToastType.WARNING);
          return;
      }
      
      const user: User = {
          id: `USR-${Date.now()}`,
          name: newUser.name,
          username: newUser.username,
          passwordHash: StorageService.hashPassword(newUser.password), // Hash the password
          contact: newUser.contact,
          role: newUser.role,
          isActive: true,
          customPermissions: [] // Default empty (or we could pre-fill based on role)
      };

      StorageService.saveUser(user);
      StorageService.logActivity({
          userId: 'ADMIN', // Mock
          userName: 'Administrador',
          action: `Criou usuário: ${user.username}`,
          module: 'Gestão de Usuários',
          deviceInfo: 'Desktop'
      });

      showToast("Usuário criado com sucesso!", ToastType.SUCCESS);
      setNewUser({ name: '', username: '', password: '', contact: '', role: UserRole.SELLER });
      loadData();
  };

  // --- Handlers: Edit User ---
  const handleEditClick = (user: User) => {
      setEditingUser(user);
      setIsEditModalOpen(true);
  };

  const handleUpdateUser = () => {
      if (!editingUser) return;
      StorageService.saveUser(editingUser);
      StorageService.logActivity({
          userId: 'ADMIN',
          userName: 'Administrador',
          action: `Atualizou usuário: ${editingUser.username}`,
          module: 'Gestão de Usuários',
          deviceInfo: 'Desktop'
      });
      setIsEditModalOpen(false);
      setEditingUser(null);
      loadData();
  };

  const toggleUserStatus = () => {
      if (editingUser) {
          setEditingUser({ ...editingUser, isActive: !editingUser.isActive });
      }
  };

  const handleResetPassword = async () => {
      if (!editingUser) return;
      const newPass = await prompt(`Digite a nova senha para ${editingUser.name}:`, '', { isPassword: true, title: 'Alterar Senha' });
      if (newPass) {
          const forceChange = await confirm("Forçar o usuário a alterar a senha no próximo login?", { title: 'Segurança' });
          StorageService.changePassword(editingUser.id, newPass, forceChange);
          showToast("Senha alterada com sucesso!", ToastType.SUCCESS);
      }
  };

  const handleToggleLock = (user: User) => {
      if (user.isLocked) {
          StorageService.unlockUser(user.id);
          showToast(`Usuário ${user.name} desbloqueado.`, ToastType.SUCCESS);
      } else {
          StorageService.lockUser(user.id);
          showToast(`Usuário ${user.name} bloqueado.`, ToastType.WARNING);
      }
      loadData();
  };

  // --- Handlers: Permissions ---
  const openPermissionModal = (user: User) => {
      setPermissionUser(user);
      // If user has custom permissions, use them. If undefined (new feature), initialize.
      // If Admin, theoretically they have all, but we allow configuring just in case role changes.
      setTempPermissions(user.customPermissions || []);
      setIsPermissionModalOpen(true);
  };

  const togglePermission = (key: string) => {
      setTempPermissions(prev => {
          if (prev.includes(key)) return prev.filter(k => k !== key);
          return [...prev, key];
      });
  };

  const toggleCategory = (keys: string[]) => {
      // Check if all are currently selected
      const allSelected = keys.every(k => tempPermissions.includes(k));
      
      if (allSelected) {
          // Deselect all
          setTempPermissions(prev => prev.filter(k => !keys.includes(k)));
      } else {
          // Select all (add missing)
          const newKeys = keys.filter(k => !tempPermissions.includes(k));
          setTempPermissions(prev => [...prev, ...newKeys]);
      }
  };

  const savePermissions = () => {
      if (permissionUser) {
          const updatedUser = { ...permissionUser, customPermissions: tempPermissions };
          StorageService.saveUser(updatedUser);
          
          StorageService.logActivity({
            userId: 'ADMIN',
            userName: 'Administrador',
            action: `Atualizou permissões de: ${updatedUser.username}`,
            module: 'Gestão de Usuários',
            deviceInfo: 'Desktop'
        });

          setIsPermissionModalOpen(false);
          setPermissionUser(null);
          loadData();
          showToast('Permissões atualizadas com sucesso!', ToastType.SUCCESS);
      }
  };

  // --- Filters ---
  const filteredUsers = users.filter(u => u.name.toLowerCase().includes(userSearch.toLowerCase()));
  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const paginatedUsers = filteredUsers.slice((userPage - 1) * itemsPerPage, userPage * itemsPerPage);
  
  const filteredLogs = logs
    .filter(l => 
      l.userName.toLowerCase().includes(logSearch.toLowerCase()) || 
      l.action.toLowerCase().includes(logSearch.toLowerCase()) ||
      l.module.toLowerCase().includes(logSearch.toLowerCase())
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalLogPages = Math.max(1, Math.ceil(filteredLogs.length / itemsPerPage));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * itemsPerPage, logPage * itemsPerPage);

  // Dynamic Title Helper
  const getPageTitle = () => {
      switch (activeView) {
          case 'NEW': return t('users.tab.new');
          case 'HISTORY': return t('users.tab.history');
          case 'PERMISSIONS': return t('users.tab.permissions');
          default: return t('users.tab.edit');
      }
  };

  const getPageIcon = () => {
      switch (activeView) {
          case 'NEW': return <UserPlus className="text-blue-600" size={24} />;
          case 'HISTORY': return <History className="text-blue-600" size={24} />;
          case 'PERMISSIONS': return <Shield className="text-blue-600" size={24} />;
          default: return <UserCog className="text-blue-600" size={24} />;
      }
  };

  const handlePrintLogs = () => {
    const html = generateUserLogReportHtml(filteredLogs, config);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }
    setTimeout(() => document.body.removeChild(iframe), 2000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans relative">
      
      {/* Sticky Header */}
      <div className="sticky top-0 z-20 bg-gray-50/95 dark:bg-dark-bg/95 backdrop-blur-sm pb-4 pt-2 border-b border-gray-200 dark:border-dark-border flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-dark-text flex items-center gap-2">
            {getPageIcon()}
            <span className="opacity-50 font-normal">{t('users.title')} /</span>
            {getPageTitle()}
          </h1>
          <p className="text-gray-500 dark:text-dark-text-muted text-sm mt-1">{t('users.subtitle')}</p>
        </div>
      </div>

      {/* Security Dashboard Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Users size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Total Usuários</p>
                  <p className="text-xl font-black text-gray-900 dark:text-dark-text">{users.length}</p>
              </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                  <ShieldCheck size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Ativos</p>
                  <p className="text-xl font-black text-gray-900 dark:text-dark-text">{users.filter(u => u.isActive !== false).length}</p>
              </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center text-red-600 dark:text-red-400">
                  <ShieldAlert size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Bloqueados</p>
                  <p className="text-xl font-black text-gray-900 dark:text-dark-text">{users.filter(u => u.isLocked).length}</p>
              </div>
          </div>
          <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <Activity size={24} />
              </div>
              <div>
                  <p className="text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase tracking-wider">Logs (24h)</p>
                  <p className="text-xl font-black text-gray-900 dark:text-dark-text">
                      {logsLast24h}
                  </p>
              </div>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="w-full bg-white dark:bg-dark-card rounded-2xl shadow-sm border border-gray-200 dark:border-dark-border flex flex-col overflow-hidden">
          
          {/* --- VIEW: NEW USER --- */}
          {activeView === 'NEW' && (
              <div className="p-8 max-w-4xl mx-auto w-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-gray-50 dark:bg-white/5 p-8 rounded-2xl border border-gray-100 dark:border-dark-border">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text mb-6 pb-2 border-b border-gray-100 dark:border-dark-border flex items-center gap-2">
                          <UserPlus size={20} className="text-blue-600 dark:text-blue-400" /> Formuário de Cadastro
                      </h3>
                      <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">{t('users.lbl.name')}</label>
                                  <input 
                                    className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-dark-text"
                                    placeholder="Ex: João da Silva"
                                    value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})}
                                  />
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">{t('users.lbl.username')}</label>
                                  <input 
                                    className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-dark-text"
                                    placeholder="Ex: joao.silva"
                                    value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})}
                                  />
                              </div>
                          </div>
                          
                          <div>
                              <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">{t('users.lbl.contact')}</label>
                              <input 
                                className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-dark-text"
                                placeholder="Ex: +258 84..."
                                value={newUser.contact} onChange={e => setNewUser({...newUser, contact: e.target.value})}
                              />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">{t('users.lbl.role')}</label>
                                  <select 
                                    className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-dark-text"
                                    value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as UserRole})}
                                  >
                                      <option value={UserRole.ADMIN}>Administrador</option>
                                      <option value={UserRole.MANAGER}>Gerente</option>
                                      <option value={UserRole.SELLER}>Vendedor / Caixa</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Senha Inicial</label>
                                  <div className="relative">
                                      <input 
                                        type={showPassword ? "text" : "password"}
                                        className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-gray-900 dark:text-dark-text"
                                        placeholder="••••••••"
                                        value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}
                                      />
                                      <button 
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"
                                      >
                                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                      </button>
                                  </div>
                              </div>
                          </div>

                          <div className="pt-4 flex justify-end">
                              <button 
                                onClick={handleCreateUser}
                                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-transform active:scale-95"
                              >
                                  <Save size={18} /> {t('users.btn.create')}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* --- VIEW: EDIT USER (LIST) --- */}
          {activeView === 'EDIT' && (
              <div className="flex flex-col w-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-dark-text-muted font-semibold border-b border-gray-200 dark:border-dark-border">
                              <tr>
                                  <th className="px-6 py-4">Nome</th>
                                  <th className="px-6 py-4">Usuário</th>
                                  <th className="px-6 py-4">Último Acesso</th>
                                  <th className="px-6 py-4 text-center">Status</th>
                                  <th className="px-6 py-4 text-center">Ações</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                              {users.map(u => (
                                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4">
                                          <div className="flex flex-col">
                                              <span className="font-bold text-gray-900 dark:text-dark-text">{u.name}</span>
                                              <span className="text-xs text-gray-500 dark:text-dark-text-muted">{u.role}</span>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-gray-600 dark:text-dark-text-muted">@{u.username}</td>
                                      <td className="px-6 py-4 text-xs text-gray-500 dark:text-dark-text-muted">
                                          {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Nunca'}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <div className="flex flex-col items-center gap-1">
                                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${u.isActive !== false ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'}`}>
                                                  {u.isActive !== false ? 'ATIVO' : 'INATIVO'}
                                              </span>
                                              {u.isLocked && (
                                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 rounded-full text-[10px] font-bold flex items-center gap-1">
                                                      <Lock size={8} /> BLOQUEADO
                                                  </span>
                                              )}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <div className="flex items-center justify-center gap-1">
                                              <button onClick={() => handleEditClick(u)} className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar">
                                                  <Edit2 size={16} />
                                              </button>
                                              <button onClick={() => handleToggleLock(u)} className={`p-2 rounded-lg transition-colors ${u.isLocked ? 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20' : 'text-gray-400 dark:text-dark-text-muted hover:bg-gray-100 dark:hover:bg-white/5'}`} title={u.isLocked ? 'Desbloquear' : 'Bloquear'}>
                                                  {u.isLocked ? <Unlock size={16} /> : <Lock size={16} />}
                                              </button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          )}

          {/* --- VIEW: PERMISSIONS --- */}
          {activeView === 'PERMISSIONS' && (
              <div className="flex flex-col w-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-white/5 flex items-center gap-4">
                      <div className="relative w-72">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500"
                            placeholder="Buscar usuário..."
                            value={userSearch} onChange={e => setUserSearch(e.target.value)}
                          />
                      </div>
                  </div>
                  <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-dark-text-muted font-semibold border-b border-gray-200 dark:border-dark-border">
                              <tr>
                                  <th className="px-6 py-4">ID</th>
                                  <th className="px-6 py-4">Nome</th>
                                  <th className="px-6 py-4">Cargo</th>
                                  <th className="px-6 py-4 text-center">Permissões Especiais</th>
                                  <th className="px-6 py-4 text-center">Ação</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                              {paginatedUsers.map(u => (
                                  <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-4 text-gray-500 dark:text-dark-text-muted font-mono text-xs">#{u.id.slice(-6)}</td>
                                      <td className="px-6 py-4 font-bold text-gray-900 dark:text-dark-text">{u.name}</td>
                                      <td className="px-6 py-4">
                                          <span className="px-2 py-1 bg-gray-100 dark:bg-white/10 rounded text-xs border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-muted">
                                              {u.role}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          {u.role === UserRole.ADMIN ? (
                                              <span className="text-xs text-green-600 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded">ACESSO TOTAL</span>
                                          ) : (
                                              <span className="text-xs text-gray-500 dark:text-dark-text-muted">
                                                  {u.customPermissions && u.customPermissions.length > 0 ? `${u.customPermissions.length} definidas` : 'Padrão'}
                                              </span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          <button 
                                            onClick={() => openPermissionModal(u)}
                                            className="px-4 py-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-lg transition-colors border border-blue-200 dark:border-blue-900"
                                          >
                                              Configurar
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Pagination controls for Users list */}
                  <div className="p-3 bg-white dark:bg-dark-card border-t border-gray-200 dark:border-dark-border flex justify-between items-center text-xs text-gray-650 dark:text-dark-text-muted">
                      <span className="font-medium">Mostrando {paginatedUsers.length} de {filteredUsers.length} registos</span>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setUserPage(p => Math.max(1, p - 1))} 
                            disabled={userPage === 1} 
                            className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                          >
                              <ChevronLeft size={16}/>
                          </button>
                          <span className="font-medium px-2">Pág. {userPage} / {totalUserPages || 1}</span>
                          <button 
                            onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} 
                            disabled={userPage === totalUserPages} 
                            className="p-1.5 border border-gray-200 dark:border-dark-border rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-dark-bg transition-colors"
                          >
                              <ChevronRight size={16}/>
                           </button>
                       </div>
                   </div>
              </div>
          )}

          {/* --- VIEW: HISTORY --- */}
          {activeView === 'HISTORY' && (
              <div className="flex flex-col w-full animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="p-4 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-white/5 flex justify-between items-center sticky top-0 z-10">
                      <div className="relative w-72">
                          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                          <input 
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 dark:border-dark-border rounded-lg text-sm outline-none bg-white dark:bg-dark-bg text-gray-900 dark:text-dark-text focus:ring-2 focus:ring-blue-500"
                            placeholder="Filtrar logs por usuário, ação..."
                            value={logSearch} onChange={e => setLogSearch(e.target.value)}
                          />
                      </div>
                      <div className="flex gap-2">
                          <button onClick={() => handlePrintLogs()} className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg text-sm text-gray-700 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-white/5 transition-colors shadow-sm" title="Imprimir">
                              <Printer size={16} className="text-blue-600 dark:text-blue-400" /> <span className="hidden sm:inline">Imprimir</span>
                          </button>
                      </div>
                  </div>
                  <div className="w-full overflow-x-auto">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-dark-text-muted font-semibold border-b border-gray-200 dark:border-dark-border">
                              <tr>
                                  <th className="px-6 py-3">Data/Hora</th>
                                  <th className="px-6 py-3">Usuário</th>
                                  <th className="px-6 py-3">Ação Realizada</th>
                                  <th className="px-6 py-3">Módulo</th>
                                  <th className="px-6 py-3">IP/Dispositivo</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-dark-border">
                              {paginatedLogs.map(l => (
                                  <tr key={l.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                      <td className="px-6 py-3 text-gray-500 dark:text-dark-text-muted font-mono text-xs">{new Date(l.date).toLocaleString()}</td>
                                      <td className="px-6 py-3 font-bold text-gray-900 dark:text-dark-text">{l.userName}</td>
                                      <td className="px-6 py-3 text-gray-700 dark:text-dark-text">{l.action}</td>
                                      <td className="px-6 py-3"><span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-xs font-medium border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-muted">{l.module}</span></td>
                                      <td className="px-6 py-3 text-gray-500 dark:text-dark-text-muted text-xs">{l.deviceInfo}</td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>

                  {/* Pagination Controls */}
                  <div className="p-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                      <div className="text-xs text-gray-500 dark:text-dark-text-muted">
                          Mostrando <span className="font-bold text-gray-700 dark:text-dark-text">{paginatedLogs.length}</span> de <span className="font-bold text-gray-700 dark:text-dark-text">{filteredLogs.length}</span> registos
                      </div>
                      <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setLogPage(prev => Math.max(1, prev - 1))}
                            disabled={logPage === 1}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-white dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                              <ChevronLeft size={16} />
                          </button>
                          <span className="text-xs font-bold text-gray-700 dark:text-dark-text px-2">
                              Pág. {logPage} / {totalLogPages}
                          </span>
                          <button 
                            onClick={() => setLogPage(prev => Math.min(totalLogPages, prev + 1))}
                            disabled={logPage === totalLogPages}
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-dark-border hover:bg-white dark:hover:bg-dark-bg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                              <ChevronRight size={16} />
                          </button>
                      </div>
                  </div>
              </div>
          )}
      </div>

      {/* --- MODAL EDITAR USUÁRIO --- */}
      {isEditModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-dark-card w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-gray-200 dark:border-dark-border">
                  <div className="p-6 border-b border-gray-100 dark:border-dark-border flex justify-between items-center bg-gray-50 dark:bg-white/5">
                      <div className="flex items-center gap-3">
                          <div className="relative w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-xl font-black">E</div>
                              <span className="text-lg font-black tracking-tighter">E</span>
                          </div>
                          <h3 className="font-bold text-lg text-gray-900 dark:text-dark-text">Editar Perfil</h3>
                      </div>
                      <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text transition-colors"><X size={20} /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Nome</label>
                          <input 
                            className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                            value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">{t('users.lbl.contact')}</label>
                          <input 
                            className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                            value={editingUser.contact || ''} onChange={e => setEditingUser({...editingUser, contact: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 dark:text-dark-text-muted uppercase mb-1 tracking-wider">Cargo</label>
                          <select 
                            className="w-full p-3 bg-white dark:bg-dark-bg border border-gray-200 dark:border-dark-border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-dark-text"
                            value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as UserRole})}
                          >
                              <option value={UserRole.ADMIN}>Admin</option>
                              <option value={UserRole.MANAGER}>Gerente</option>
                              <option value={UserRole.SELLER}>Vendedor</option>
                          </select>
                      </div>

                      <div className="pt-4 border-t border-gray-100 dark:border-dark-border flex flex-col gap-3">
                          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-dark-border">
                              <div className="flex items-center gap-2">
                                  <Key size={16} className="text-amber-600 dark:text-amber-400" />
                                  <span className="text-xs font-bold text-gray-700 dark:text-dark-text">Forçar Troca de Senha</span>
                              </div>
                              <button 
                                onClick={() => setEditingUser({...editingUser, forcePasswordChange: !editingUser.forcePasswordChange})}
                                className={`w-10 h-5 rounded-full transition-colors relative ${editingUser.forcePasswordChange ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                              >
                                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${editingUser.forcePasswordChange ? 'left-6' : 'left-1'}`} />
                              </button>
                          </div>

                          <button 
                            onClick={toggleUserStatus}
                            className={`w-full py-2.5 rounded-lg font-bold text-sm border flex items-center justify-center gap-2 transition-colors ${
                                editingUser.isActive !== false 
                                ? 'border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                                : 'border-green-200 dark:border-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                          >
                              {editingUser.isActive !== false ? <Lock size={16} /> : <Unlock size={16} />}
                              {editingUser.isActive !== false ? t('users.btn.deactivate') : t('users.btn.activate')}
                          </button>
                          
                          <button 
                            onClick={handleResetPassword}
                            className="w-full py-2.5 rounded-lg font-bold text-sm border border-gray-200 dark:border-dark-border text-gray-600 dark:text-dark-text-muted hover:bg-gray-50 dark:hover:bg-white/5 flex items-center justify-center gap-2 transition-colors"
                          >
                              <RefreshCw size={16} className="text-blue-600 dark:text-blue-400" /> {t('users.btn.reset_pass')}
                          </button>
                      </div>

                      <div className="flex gap-3 pt-2">
                          <button onClick={() => setIsEditModalOpen(false)} className="flex-1 py-3 text-gray-500 dark:text-dark-text-muted hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl font-bold transition-colors">Cancelar</button>
                          <button onClick={handleUpdateUser} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-transform active:scale-95">Salvar</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* --- MODAL PERMISSÕES GRANULARES --- */}
      {isPermissionModalOpen && permissionUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-dark-card w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-dark-border">
                  {/* Header */}
                  <div className="p-6 border-b border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-white/5 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="relative w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg overflow-hidden shrink-0">
                              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-2xl font-black">E</div>
                              <span className="text-xl font-black tracking-tighter">E</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-xl text-gray-900 dark:text-dark-text flex items-center gap-2">
                                  <Shield size={24} className="text-blue-600 dark:text-blue-400"/> 
                                  Permissões de Acesso
                              </h3>
                              <p className="text-sm text-gray-500 dark:text-dark-text-muted mt-1">
                                  Configurando acesso para: <span className="font-bold text-gray-900 dark:text-dark-text">{permissionUser.name}</span>
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setIsPermissionModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-dark-text hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  {/* Body - Grid Layout */}
                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-gray-50/50 dark:bg-dark-bg/50">
                      {permissionUser.role === UserRole.ADMIN ? (
                          <div className="flex flex-col items-center justify-center h-full text-center p-8">
                              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                                  <Shield size={48} className="text-green-600 dark:text-green-400"/>
                              </div>
                              <h4 className="text-xl font-bold text-gray-900 dark:text-dark-text mb-2">Acesso Total Concedido</h4>
                              <p className="text-gray-500 dark:text-dark-text-muted max-w-md">
                                  Usuários com perfil de <strong>Administrador</strong> possuem acesso irrestrito a todos os módulos do sistema por padrão. Não é necessário configurar permissões individuais.
                              </p>
                          </div>
                      ) : (
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              {SYSTEM_MODULES.map((module) => (
                                  <div key={module.id} className="bg-white dark:bg-dark-card rounded-xl border border-gray-200 dark:border-dark-border shadow-sm overflow-hidden flex flex-col">
                                      {/* Module Header */}
                                      <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-dark-border flex items-center justify-between">
                                          <div className="flex items-center gap-3">
                                              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                                                  <module.icon size={20} />
                                              </div>
                                              <span className="font-bold text-gray-800 dark:text-dark-text">{module.label}</span>
                                          </div>
                                          <button 
                                            onClick={() => toggleCategory(module.permissions.map(p => p.key))}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 dark:text-blue-400 hover:underline"
                                          >
                                              Alternar Tudo
                                          </button>
                                      </div>
                                      
                                      {/* Permissions List */}
                                      <div className="p-4 space-y-1">
                                          {module.permissions.map((perm) => {
                                              const isChecked = tempPermissions.includes(perm.key);
                                              return (
                                                  <div 
                                                    key={perm.key} 
                                                    onClick={() => togglePermission(perm.key)}
                                                    className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${
                                                        isChecked 
                                                        ? 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800' 
                                                        : 'hover:bg-gray-50 dark:hover:bg-white/5 border-transparent'
                                                    }`}
                                                  >
                                                      <span className={`text-sm ${isChecked ? 'font-bold text-blue-800 dark:text-blue-200' : 'text-gray-600 dark:text-dark-text-muted'}`}>
                                                          {perm.label}
                                                      </span>
                                                      
                                                      {/* Custom Toggle Switch */}
                                                      <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${isChecked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                                                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transform transition-transform ${isChecked ? 'translate-x-4' : 'translate-x-0'}`} />
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>

                  {/* Footer */}
                  <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card flex justify-end gap-3 shrink-0">
                      <button 
                        onClick={() => setIsPermissionModalOpen(false)}
                        className="px-6 py-3 text-gray-600 dark:text-dark-text-muted font-bold hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={savePermissions}
                        disabled={permissionUser.role === UserRole.ADMIN}
                        className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2 transition-transform active:scale-95 ${permissionUser.role === UserRole.ADMIN ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                          <Save size={20} /> Salvar Permissões
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default UserManagement;
