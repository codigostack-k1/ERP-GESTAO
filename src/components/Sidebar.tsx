import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Sun,
  Moon,
  Wallet,
  History,
  TrendingUp,
  Warehouse,
  ClipboardList,
  AlertTriangle,
  Tag,
  Truck,
  UserPlus,
  Shield,
  UserCog,
  Banknote,
  Receipt,
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  Building2,
  CreditCard,
  UserCircle,
  X,
  Boxes,
  Briefcase,
  FileSpreadsheet
} from 'lucide-react';
import { UserRole } from '../types';

interface SidebarProps {
  userRole: UserRole;
  onLogout: () => void;
  toggleTheme: () => void;
  isDark: boolean;
  isCollapsed: boolean;
  toggleSidebar: () => void;
  t: (key: string) => string;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

interface MenuItemProps {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ to, icon: Icon, label, isCollapsed }) => {
  const location = useLocation();
  
  const isLinkActive = (() => {
    if (to.includes('?')) {
      const [path, search] = to.split('?');
      const currentSearch = new URLSearchParams(location.search);
      const targetSearch = new URLSearchParams(search);
      
      if (location.pathname !== path) return false;
      
      for (const [key, val] of targetSearch.entries()) {
        const currentVal = currentSearch.get(key);
        if (key === 'tab' && val === 'employees' && !currentVal) {
          continue;
        }
        if (currentVal !== val) {
          return false;
        }
      }
      return true;
    }
    
    return location.pathname === to;
  })();

  return (
    <NavLink
      to={to}
      className={`
        flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 group
        ${isLinkActive 
          ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none' 
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'}
      `}
      title={isCollapsed ? label : ''}
    >
      <Icon size={20} className="shrink-0" />
      {!isCollapsed && <span className="text-sm font-medium truncate">{label}</span>}
    </NavLink>
  );
};

interface SubMenuProps {
  id: string;
  icon: React.ElementType;
  label: string;
  isCollapsed: boolean;
  isExpanded: boolean;
  isActive?: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}

const SubMenu: React.FC<SubMenuProps> = ({ id, icon: Icon, label, isCollapsed, isExpanded, isActive, onToggle, children }) => {
  return (
    <div className="space-y-1">
      <button
        onClick={() => onToggle(id)}
        className={`
          w-full flex items-center justify-between px-4 py-2.5 rounded-lg transition-all duration-200
          ${isActive 
            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-blue-600 dark:hover:text-blue-400'}
        `}
        title={isCollapsed ? label : ''}
      >
        <div className="flex items-center gap-3">
          <Icon size={20} className="shrink-0" />
          {!isCollapsed && <span className="text-sm font-medium truncate">{label}</span>}
        </div>
        {!isCollapsed && (
          <ChevronRight 
            size={16} 
            className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
          />
        )}
      </button>
      {isExpanded && !isCollapsed && (
        <div className="ml-4 pl-4 border-l border-gray-100 dark:border-gray-800 space-y-1 mt-1">
          {children}
        </div>
      )}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ 
  userRole, 
  onLogout, 
  toggleTheme, 
  isDark, 
  isCollapsed, 
  toggleSidebar,
  t,
  isMobileOpen,
  onCloseMobile
}) => {
  const location = useLocation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Auto-open submenu based on current path
  React.useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/treasury')) setOpenMenuId('treasury');
    else if (path.startsWith('/sales')) setOpenMenuId('sales');
    else if (path.startsWith('/warehouse')) setOpenMenuId('warehouse');
    else if (path.startsWith('/hr')) setOpenMenuId('hr');
    else if (path.startsWith('/users')) setOpenMenuId('users');
    else if (path.startsWith('/settings')) setOpenMenuId('settings');
  }, [location.pathname]);

  const toggleMenu = (menuId: string) => {
    if (isCollapsed) {
      toggleSidebar();
      setOpenMenuId(menuId);
    } else {
      setOpenMenuId(prev => prev === menuId ? null : menuId);
    }
  };

  const isSubMenuChildActive = (prefix: string) => {
    return location.pathname.startsWith(prefix);
  };

  const isAdmin = userRole === UserRole.ADMIN;
  const isManager = userRole === UserRole.MANAGER || isAdmin;

  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 
        transition-all duration-300 ease-in-out z-50 flex flex-col
        ${isCollapsed ? 'w-20' : 'w-64'}
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Brand Header */}
      <div className="p-6 flex items-center justify-between">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="relative w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 dark:shadow-none overflow-hidden">
              <div className="absolute -bottom-1 -right-1 opacity-20 transform rotate-12 text-2xl font-black">E</div>
              <div className="flex flex-col items-center justify-center leading-none">
                <span className="text-xl font-black tracking-tighter">E</span>
              </div>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">ERP <span className="text-blue-600">Gestão</span></span>
          </div>
        )}
        
        <div className="flex items-center gap-1">
          <button 
            onClick={toggleSidebar}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>
          
          {onCloseMobile && (
            <button 
              onClick={onCloseMobile}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-4 space-y-6 py-4 custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-1">
          <MenuItem to="/" icon={LayoutDashboard} label={t('menu.dashboard')} isCollapsed={isCollapsed} />
          <MenuItem to="/pdv" icon={ShoppingCart} label={t('menu.pos')} isCollapsed={isCollapsed} />
          <MenuItem to="/invoicing" icon={FileText} label={t('menu.invoicing')} isCollapsed={isCollapsed} />
        </div>

        {/* Treasury Section */}
        <div className="space-y-1">
          <SubMenu 
            id="treasury" 
            icon={Wallet} 
            label={t('menu.treasury')} 
            isCollapsed={isCollapsed} 
            isExpanded={openMenuId === 'treasury'} 
            isActive={isSubMenuChildActive('/treasury')}
            onToggle={toggleMenu}
          >
            <MenuItem to="/treasury/cash-control" icon={History} label={t('menu.treasury.cash')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/transactions" icon={TrendingUp} label={t('menu.treasury.trans')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/expenses" icon={ArrowUpCircle} label={t('menu.treasury.exp')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/banks" icon={Banknote} label={t('menu.treasury.banks')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/receipts" icon={Receipt} label={t('menu.treasury.receipts')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/reports" icon={BarChart3} label={t('menu.treasury.reports')} isCollapsed={isCollapsed} />
            <MenuItem to="/treasury/statements" icon={FileSpreadsheet} label={t('menu.treasury.statements')} isCollapsed={isCollapsed} />
          </SubMenu>
        </div>

        {/* Sales Section */}
        <div className="space-y-1">
          <SubMenu 
            id="sales" 
            icon={Tag} 
            label={t('menu.sales')} 
            isCollapsed={isCollapsed} 
            isExpanded={openMenuId === 'sales'} 
            isActive={isSubMenuChildActive('/sales')}
            onToggle={toggleMenu}
          >
            <MenuItem to="/sales/prices" icon={Tag} label={t('menu.sales.prices')} isCollapsed={isCollapsed} />
            <MenuItem to="/sales/tech-list" icon={ClipboardList} label={t('menu.sales.tech_list')} isCollapsed={isCollapsed} />
            <MenuItem to="/sales/products" icon={Package} label={t('menu.sales.products')} isCollapsed={isCollapsed} />
            <MenuItem to="/sales/iva-products" icon={FileText} label="Produtos com IVA" isCollapsed={isCollapsed} />
            <MenuItem to="/sales/kits" icon={Boxes} label="Kits de Produtos" isCollapsed={isCollapsed} />
            <MenuItem to="/sales/blacklist" icon={AlertTriangle} label={t('menu.sales.blacklist')} isCollapsed={isCollapsed} />
            <MenuItem to="/sales/customers" icon={Users} label={t('menu.sales.customers')} isCollapsed={isCollapsed} />
            <MenuItem to="/sales/tracking" icon={History} label="Rastreio de Mercadorias" isCollapsed={isCollapsed} />
            <MenuItem to="/sales/reports" icon={FileText} label={t('menu.sales.reports')} isCollapsed={isCollapsed} />
          </SubMenu>
        </div>

        {/* Warehouse Section */}
        <div className="space-y-1">
          <SubMenu 
            id="warehouse" 
            icon={Warehouse} 
            label={t('menu.warehouse')} 
            isCollapsed={isCollapsed} 
            isExpanded={openMenuId === 'warehouse'} 
            isActive={isSubMenuChildActive('/warehouse')}
            onToggle={toggleMenu}
          >
            <MenuItem to="/warehouse/entry" icon={ArrowDownCircle} label={t('menu.warehouse.entry')} isCollapsed={isCollapsed} />
            <MenuItem to="/warehouse/exit" icon={ArrowUpCircle} label={t('menu.warehouse.exit')} isCollapsed={isCollapsed} />
            <MenuItem to="/warehouse/requisition" icon={FileText} label={t('menu.warehouse.req')} isCollapsed={isCollapsed} />
            <MenuItem to="/warehouse/inventory" icon={ClipboardList} label={t('menu.warehouse.inv')} isCollapsed={isCollapsed} />
            <MenuItem to="/warehouse/stock-list" icon={Package} label={t('menu.warehouse.stock')} isCollapsed={isCollapsed} />
            <MenuItem to="/warehouse/suppliers" icon={Truck} label={t('menu.warehouse.sup')} isCollapsed={isCollapsed} />
          </SubMenu>
        </div>

        {/* Recursos Humanos Section */}
        <div className="space-y-1">
          <SubMenu 
            id="hr" 
            icon={Briefcase} 
            label="Recursos Humanos" 
            isCollapsed={isCollapsed} 
            isExpanded={openMenuId === 'hr'} 
            isActive={isSubMenuChildActive('/hr')}
            onToggle={toggleMenu}
          >
            <MenuItem to="/hr?tab=employees" icon={Users} label="Gestão de Colaboradores" isCollapsed={isCollapsed} />
            <MenuItem to="/hr?tab=payroll" icon={FileSpreadsheet} label="Folha de Salários" isCollapsed={isCollapsed} />
            <MenuItem to="/hr?tab=payments" icon={Wallet} label="Pagamentos e Recibos" isCollapsed={isCollapsed} />
          </SubMenu>
        </div>

        {/* Admin Section */}
        {isManager && (
          <div className="space-y-1">
            <SubMenu 
              id="users" 
              icon={Users} 
              label={t('menu.users')} 
              isCollapsed={isCollapsed} 
              isExpanded={openMenuId === 'users'} 
              isActive={isSubMenuChildActive('/users')}
              onToggle={toggleMenu}
            >
              <MenuItem to="/users/edit" icon={UserCog} label={t('menu.users.edit')} isCollapsed={isCollapsed} />
              <MenuItem to="/users/new" icon={UserPlus} label={t('menu.users.new')} isCollapsed={isCollapsed} />
              <MenuItem to="/users/permissions" icon={Shield} label={t('menu.users.perm')} isCollapsed={isCollapsed} />
              <MenuItem to="/users/history" icon={History} label={t('menu.users.hist')} isCollapsed={isCollapsed} />
            </SubMenu>
          </div>
        )}

        <div className="space-y-1">
          <SubMenu 
            id="settings" 
            icon={Settings} 
            label={t('menu.settings')} 
            isCollapsed={isCollapsed} 
            isExpanded={openMenuId === 'settings'} 
            isActive={isSubMenuChildActive('/settings')}
            onToggle={toggleMenu}
          >
            {isAdmin && (
              <>
                {!isCollapsed && (
                  <div className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 pt-2 pb-1">
                    Definições do Admin
                  </div>
                )}
                <MenuItem to="/settings/company" icon={Building2} label="Dados da Empresa" isCollapsed={isCollapsed} />
                <MenuItem to="/settings/financial" icon={CreditCard} label="Financeiro" isCollapsed={isCollapsed} />
              </>
            )}
            
            {!isCollapsed && (
              <div className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest px-4 pt-3 pb-1">
                Definições Gerais
              </div>
            )}
            <MenuItem to="/settings/general" icon={Settings} label="Preferências do Utilizador" isCollapsed={isCollapsed} />
          </SubMenu>
        </div>

        {/* Profile Section */}
        <div className="space-y-1">
          <MenuItem to="/profile" icon={UserCircle} label={t('menu.profile')} isCollapsed={isCollapsed} />
        </div>
      </nav>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-100 dark:border-gray-800 space-y-2">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={isCollapsed ? (isDark ? 'Light Mode' : 'Dark Mode') : ''}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {!isCollapsed && <span className="text-sm font-medium">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </button>
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          title={isCollapsed ? t('menu.logout') : ''}
        >
          <LogOut size={20} />
          {!isCollapsed && <span className="text-sm font-medium">{t('menu.logout')}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
