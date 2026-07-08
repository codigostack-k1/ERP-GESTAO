import bcrypt from 'bcryptjs';
import { 
  User, 
  UserRole, 
  AppConfig, 
  Product, 
  Customer, 
  Sale, 
  Transaction, 
  Wallet, 
  Supplier, 
  StockEntry, 
  StockExit, 
  Requisition, 
  StockAudit, 
  CashSession,
  UserLog,
  PaymentDetail,
  ProductKit,
  Employee,
  Payroll,
  PayrollPayment,
  StockLedgerEntry,
  StockLedgerType
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'ERP_CONFIG',
  USERS: 'ERP_USERS',
  PRODUCTS: 'ERP_PRODUCTS',
  CUSTOMERS: 'ERP_CUSTOMERS',
  SALES: 'ERP_SALES',
  TRANSACTIONS: 'ERP_TRANSACTIONS',
  WALLETS: 'ERP_WALLETS',
  SUPPLIERS: 'ERP_SUPPLIERS',
  LOGS: 'ERP_LOGS',
  CASH_SESSIONS: 'ERP_CASH_SESSIONS',
  STOCK_ENTRIES: 'ERP_STOCK_ENTRIES',
  STOCK_EXITS: 'ERP_STOCK_EXITS',
  REQUISITIONS: 'ERP_REQUISITIONS',
  AUDITS: 'ERP_AUDITS',
  KITS: 'ERP_KITS',
  EMPLOYEES: 'ERP_EMPLOYEES',
  PAYROLLS: 'ERP_PAYROLLS',
  PAYROLL_PAYMENTS: 'ERP_PAYROLL_PAYMENTS',
  STOCK_LEDGER: 'ERP_STOCK_LEDGER'
};

const DEFAULT_CONFIG: AppConfig = {
  companyName: 'ERP Gestão',
  nif: '000000000',
  currency: 'Metical',
  currencySymbol: 'MT',
  darkMode: false,
  companyAddress: '',
  companyContact: '',
  paymentMethods: [
    { id: 'CASH', name: 'Dinheiro', isActive: true, type: 'CASH' },
    { id: 'CARD', name: 'Cartão', isActive: true, type: 'BANK' },
    { id: 'MPESA', name: 'M-Pesa', isActive: true, type: 'MOBILE' },
    { id: 'EMOLA', name: 'E-Mola', isActive: true, type: 'MOBILE' },
    { id: 'TRANSFER', name: 'Transferência', isActive: true, type: 'BANK' },
    { id: 'CREDIT_BALANCE', name: 'Saldo de Crédito', isActive: true, type: 'OTHER' }
  ],
  language: 'pt',
  fontSize: 'medium',
  companyEmail: '',
  ivaRate: 17,
  ivaEnabled: false,
  inactivityTimeout: 5,
  restrictBlacklistedProducts: false
};

const DEFAULT_USERS: User[] = [
  {
    id: 'admin-1',
    name: 'Administrador',
    username: 'admin',
    role: UserRole.ADMIN,
    isActive: true,
    passwordHash: 'admin123', // Will be hashed on first login
    customPermissions: [
      'WIDGET_KPI', 'WIDGET_RANKING', 'WIDGET_ALERTS', 'WIDGET_CHART',
      'VIEW_PDV', 'VIEW_INVOICING', 'VIEW_SALES_PRICES', 'VIEW_SALES_PRODUCTS', 'VIEW_SALES_IVA_PRODUCTS', 'VIEW_SALES_KITS', 'VIEW_SALES_CUSTOMERS', 'VIEW_SALES_BLACKLIST', 'VIEW_SALES_REPORTS',
      'VIEW_WAREHOUSE_ENTRY', 'VIEW_WAREHOUSE_EXIT', 'VIEW_WAREHOUSE_REQ', 'VIEW_WAREHOUSE_INV', 'VIEW_WAREHOUSE_STOCK', 'VIEW_WAREHOUSE_SUP',
      'VIEW_TREASURY_CASH', 'VIEW_TREASURY_TRANS', 'VIEW_TREASURY_BANKS', 'VIEW_TREASURY_EXP', 'VIEW_TREASURY_RECEIPTS', 'VIEW_TREASURY_REPORTS', 'VIEW_TREASURY_STATEMENTS',
      'VIEW_USERS', 'VIEW_SETTINGS', 'VIEW_HR_EMPLOYEES', 'VIEW_HR_PAYROLL', 'VIEW_HR_PAYMENTS'
    ]
  }
];

const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-1',
    name: 'José Mateus',
    bi: '010203040506A',
    nuit: '123456789',
    admissionDate: '2024-01-15',
    bankName: 'Standard Bank',
    bankAccount: '1029384756',
    paymentMethodType: 'BANK',
    baseSalary: 25000,
    position: 'Gestor de Vendas',
    department: 'Comercial',
    isActive: true
  },
  {
    id: 'emp-2',
    name: 'Amélia Nhaca',
    bi: '070809101112B',
    nuit: '987654321',
    admissionDate: '2024-03-01',
    bankName: 'Millennium BIM',
    bankAccount: '1122334455',
    paymentMethodType: 'BANK',
    baseSalary: 18000,
    position: 'Operadora de Caixa',
    department: 'Operações',
    isActive: true
  },
  {
    id: 'emp-3',
    name: 'Carlos Tembe',
    bi: '131415161718C',
    nuit: '556677889',
    admissionDate: '2024-05-10',
    bankName: 'M-Pesa',
    bankAccount: '841234567',
    paymentMethodType: 'M_PESA',
    baseSalary: 15000,
    position: 'Fiel de Armazém',
    department: 'Logística',
    isActive: true
  }
];

export class StorageService {
  private static get<T>(key: string, defaultValue: T): T {
    // Initial sync from Electron file system if running in Electron and not already synced
    this.syncFromElectronOnce();

    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    try {
      return JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  }

  private static set(key: string, value: unknown): void {
    const jsonValue = JSON.stringify(value);
    localStorage.setItem(key, jsonValue);
    
    // Sync to Electron file system if applicable
    this.syncToElectron();
  }

  // --- Electron Persistence Bridge ---
  private static isSynced = false;
  private static getElectron() {
    try {
      const win = window as typeof window & { require?: (module: string) => unknown };
      if (win.require) {
        return win.require('electron');
      }
    } catch {
      return null;
    }
    return null;
  }

  private static syncFromElectronOnce() {
    if (this.isSynced) return;
    const electron = this.getElectron();
    if (electron && electron.ipcRenderer) {
      try {
        const fileData = electron.ipcRenderer.sendSync('load-data-sync');
        if (fileData) {
          const parsed = JSON.parse(fileData);
          Object.keys(parsed).forEach(key => {
            localStorage.setItem(key, parsed[key]);
          });
        }
      } catch (err) {
        console.error('Electron Load Sync Failed:', err);
      }
    }
    this.isSynced = true;
  }

  private static syncToElectron() {
    const electron = this.getElectron();
    if (electron && electron.ipcRenderer) {
      try {
        const allData: Record<string, string> = {};
        Object.values(STORAGE_KEYS).forEach(key => {
          const val = localStorage.getItem(key);
          if (val) allData[key] = val;
        });
        electron.ipcRenderer.sendSync('save-data-sync', JSON.stringify(allData));
      } catch (err) {
        console.error('Electron Save Sync Failed:', err);
      }
    }
  }

  // --- CONFIG ---
  static getConfig(): AppConfig {
    const config = this.get(STORAGE_KEYS.CONFIG, DEFAULT_CONFIG);
    // Ensure paymentMethods exist even if the stored config is old
    if (!config.paymentMethods || config.paymentMethods.length === 0) {
      config.paymentMethods = DEFAULT_CONFIG.paymentMethods;
    }
    return config;
  }

  static saveConfig(config: AppConfig): void {
    this.set(STORAGE_KEYS.CONFIG, config);
    this.logActivityForCurrentUser('ALTEROU_CONFIGURACAO', 'CONFIGURACOES');
  }

  // --- USERS ---
  static getCurrentUser(): User | null {
    const userId = localStorage.getItem('ERP_ACTIVE_USER_ID');
    if (!userId) return null;
    return this.getUsers().find(u => u.id === userId) || null;
  }

  static logActivityForCurrentUser(action: string, module: string): void {
    const user = this.getCurrentUser();
    if (!user) return;
    this.logActivity({
      userId: user.id,
      userName: user.name,
      action,
      module,
      deviceInfo: 'Browser'
    });
  }

  static getUsers(): User[] {
    return this.get(STORAGE_KEYS.USERS, DEFAULT_USERS);
  }

  static saveUser(user: User): void {
    const users = this.getUsers();
    const index = users.findIndex(u => u.id === user.id);
    const isEdit = index >= 0;
    if (isEdit) {
      users[index] = user;
    } else {
      users.push(user);
    }
    this.set(STORAGE_KEYS.USERS, users);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o utilizador ${user.name}` : `Criou o utilizador ${user.name}`,
      'UTILIZADORES'
    );
  }

  static checkPassword(password: string, hash: string): boolean {
    const cleanPassword = (password || '').trim();
    const cleanHash = (hash || '').trim();

    try {
      // For initial setup or legacy, check plain text if it looks like one
      if (cleanHash === 'admin123' && cleanPassword === 'admin123') return true;
      
      // Fallback for the placeholder hash that was accidentally deployed
      if (cleanHash === '$2a$10$8K1p/a2L2H2H2H2H2H2H2O' && cleanPassword === 'admin123') return true;

      return bcrypt.compareSync(cleanPassword, cleanHash);
    } catch {
      return false;
    }
  }

  static hashPassword(password: string): string {
    return bcrypt.hashSync((password || '').trim(), 10);
  }

  static login(username: string, password: string): User | null {
    const users = this.getUsers();
    const user = users.find(u => u.username === (username || '').trim());
    
    if (!user) return null;

    // Check if account is active and not locked
    if (user.isActive === false) return null;
    if (user.isLocked) return null;

    const isCorrect = this.checkPassword(password, user.passwordHash || '');
    
    if (isCorrect) {
      // If it was plain text or the invalid placeholder, update it to a real hash now
      if (user.passwordHash === 'admin123' || user.passwordHash === '$2a$10$8K1p/a2L2H2H2H2H2H2H2O') {
        user.passwordHash = this.hashPassword(password);
      }
      // Success: Reset failed attempts and update last login
      user.failedLoginAttempts = 0;
      user.lastLogin = new Date().toISOString();
      this.saveUser(user);
      return user;
    } else {
      // Failure: Increment failed attempts
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      
      // Auto-lock after 5 attempts
      if (user.failedLoginAttempts >= 5) {
        user.isLocked = true;
        this.logActivity({
          userId: user.id,
          userName: user.name,
          action: 'Conta bloqueada por excesso de tentativas',
          module: 'Segurança',
          deviceInfo: 'Sistema'
        });
      }
      
      this.saveUser(user);
      return null;
    }
  }

  static unlockUser(userId: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.isLocked = false;
      user.failedLoginAttempts = 0;
      this.set(STORAGE_KEYS.USERS, users);
      this.logActivityForCurrentUser(`Desbloqueou o utilizador ${user.name}`, 'UTILIZADORES');
    }
  }

  static lockUser(userId: string): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.isLocked = true;
      this.set(STORAGE_KEYS.USERS, users);
      this.logActivityForCurrentUser(`Bloqueou o utilizador ${user.name}`, 'UTILIZADORES');
    }
  }

  static changePassword(userId: string, newPass: string, forceChange: boolean = false): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      // Always hash the password here to ensure consistency, 
      // as some callers might pass plain text (e.g. App.tsx, UserManagement.tsx)
      const cleanPass = (newPass || '').trim();
      
      // If it's already a bcrypt hash (starts with $2), we don't re-hash
      // though usually it's better to just hash what we receive if it's a change request.
      if (cleanPass.startsWith('$2') && cleanPass.length > 30) {
        user.passwordHash = cleanPass;
      } else {
        user.passwordHash = this.hashPassword(cleanPass);
      }
      
      user.passwordChangedAt = new Date().toISOString();
      user.forcePasswordChange = forceChange;
      user.isLocked = false; // Reset lock if password is changed via recovery/admin
      user.failedLoginAttempts = 0;
      this.set(STORAGE_KEYS.USERS, users);
      this.logActivityForCurrentUser(`Alterou a senha do utilizador ${user.name}`, 'UTILIZADORES');
    }
  }

  static saveSecurityQuestions(userId: string, questions: { question: string, answer: string }[]): void {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
      user.securityQuestions = questions.map(q => ({
        question: q.question,
        answerHash: this.hashPassword(q.answer.toLowerCase().trim())
      }));
      this.set(STORAGE_KEYS.USERS, users);
    }
  }

  static verifySecurityAnswer(userId: string, questionIndex: number, answer: string): boolean {
    const users = this.getUsers();
    const user = users.find(u => u.id === userId);
    if (user && user.securityQuestions && user.securityQuestions[questionIndex]) {
      return this.checkPassword(answer.toLowerCase().trim(), user.securityQuestions[questionIndex].answerHash);
    }
    return false;
  }

  // --- PRODUCTS ---
  static getProducts(ignoreRestrictions: boolean = false): Product[] {
    const products = this.get<Product[]>(STORAGE_KEYS.PRODUCTS, []);
    const config = this.getConfig();
    if (!ignoreRestrictions && config.restrictBlacklistedProducts) {
      return products.filter(p => !p.isBlacklisted);
    }
    return products;
  }

  static saveProducts(products: Product[]): void {
    this.set(STORAGE_KEYS.PRODUCTS, products);
  }

  static isBarcodeUnique(code: string, excludeId?: string | number): boolean {
    const products = this.getProducts(true);
    const kits = this.getProductKits();
    const existsInProducts = products.some(p => p.code === code && String(p.id) !== String(excludeId));
    const existsInKits = kits.some(k => k.code === code && String(k.id) !== String(excludeId));
    return !existsInProducts && !existsInKits;
  }

  static saveProduct(product: Product): void {
    if (!this.isBarcodeUnique(product.code, product.id)) {
      throw new Error('Já existe um produto ou kit com este código de barras.');
    }
    const products = this.getProducts(true);
    const index = products.findIndex(p => String(p.id) === String(product.id));
    const isEdit = index >= 0;
    if (isEdit) {
      products[index] = product;
    } else {
      products.push(product);
    }
    this.set(STORAGE_KEYS.PRODUCTS, products);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o produto ${product.name}` : `Criou o produto ${product.name}`,
      'INVENTARIO'
    );
  }

  static updateStock(items: { id: string, quantity: number }[]): void {
    const products = this.getProducts(true);
    items.forEach(item => {
      const p = products.find(prod => prod.id === item.id);
      if (p) {
        p.stock -= item.quantity;
      }
    });
    this.set(STORAGE_KEYS.PRODUCTS, products);
    this.logActivityForCurrentUser('Atualizou stock de produtos', 'INVENTARIO');
  }

  // --- CUSTOMERS ---
  static getCustomers(): Customer[] {
    return this.get(STORAGE_KEYS.CUSTOMERS, []);
  }

  static saveCustomer(customer: Customer): void {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    const isEdit = index >= 0;
    if (isEdit) {
      customers[index] = customer;
    } else {
      customers.push(customer);
    }
    this.set(STORAGE_KEYS.CUSTOMERS, customers);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o cliente ${customer.name}` : `Criou o cliente ${customer.name}`,
      'CLIENTES'
    );
  }

  static performAutomaticCompensation(customerId: string): number {
    const customers = this.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return 0;

    const amount = Math.min(customer.debt, customer.creditBalance);
    if (amount > 0) {
      customer.debt -= amount;
      customer.creditBalance -= amount;
      if (!customer.compensationHistory) customer.compensationHistory = [];
      customer.compensationHistory.push({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        amount,
        description: 'Compensação automática de saldo/dívida'
      });
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
    }
    return amount;
  }

  // --- SALES ---
  static getSales(): Sale[] {
    return this.get(STORAGE_KEYS.SALES, []);
  }

  static getNextInvoiceNumber(year: number): string {
    const sales = this.getSales();
    const salesInYear = sales.filter(s => new Date(s.date).getFullYear() === year && s.status !== 'VOID');
    const nextNum = salesInYear.length + 1;
    return nextNum.toString().padStart(4, '0') + '/' + year;
  }

  /**
   * Identifies the correct wallet ID for a given payment method
   */
  public static getWalletIdForMethod(method: string): string {
    const methodUpper = method.toUpperCase();
    if (methodUpper.includes('CASH') || methodUpper.includes('DINHEIRO') || methodUpper === 'NUMERÁRIO') return 'CASH';
    if (methodUpper.includes('CARD') || methodUpper.includes('CARTÃO') || methodUpper === 'MULTICAIXA' || methodUpper === 'POS') return 'CARD';
    if (methodUpper.includes('MPESA') || methodUpper.includes('M-PESA')) return 'MPESA';
    if (methodUpper.includes('EMOLA') || methodUpper.includes('E-MOLA')) return 'EMOLA';
    if (methodUpper.includes('TRANSFER') || methodUpper.includes('TRANSFERÊNCIA')) return 'TRANSFER';
    if (methodUpper.includes('CREDIT') || methodUpper.includes('CRÉDITO')) return 'CREDIT_BALANCE';
    return 'CASH'; // Default fallback
  }

  /**
   * Automatically creates transactions for a sale to update wallet balances
   */
  private static syncSaleTransactions(sale: Sale): void {
    if (sale.status !== 'PAID') return;

    const details = sale.paymentDetails || [{ method: sale.paymentMethod, amount: sale.total }];
    const isPos = /^\d+$/.test(sale.id); // Simple check: POS IDs are numeric (Date.now()), Invoices have / or -
    const prefix = isPos ? 'Venda POS' : 'Venda Factura';

    details.forEach((d, idx) => {
        const walletId = this.getWalletIdForMethod(d.method);
        this.saveTransaction({
            id: `AUTO-SALE-${sale.id}-${walletId}-${idx}`,
            date: sale.date,
            description: `${prefix} #${isPos ? sale.id.slice(-6) : sale.id} (${d.method})`,
            amount: d.amount,
            type: 'INCOME',
            category: isPos ? 'Vendas Diárias' : 'Vendas Facturação',
            status: 'PAID',
            method: d.method,
            walletId: walletId,
            reference: d.reference || sale.id
        });
    });
  }

  static createSale(sale: Sale): void {
    const sales = this.getSales();
    sales.push(sale);
    this.set(STORAGE_KEYS.SALES, sales);

    // 1. Descontar stock automaticamente ao faturar / vender
    try {
      const products = this.getProducts(true);
      const kits = this.getProductKits();

      sale.items.forEach(item => {
        if (item.isKit) {
          const kit = kits.find(k => k.id === item.id);
          if (kit) {
            kit.items.forEach(kitItem => {
              const prod = products.find(p => p.id === kitItem.productId);
              if (prod) {
                prod.stock -= (kitItem.quantity * item.quantity);
              }
            });
          }
        } else {
          const prod = products.find(p => p.id === item.id);
          if (prod) {
            prod.stock -= item.quantity;
          }
        }
      });
      this.set(STORAGE_KEYS.PRODUCTS, products);
    } catch (e) {
      console.error('Erro ao descontar stock na venda:', e);
    }

    // Registar no Rastreio/Ledger de Stock
    try {
      const products = this.getProducts(true);
      sale.items.forEach(item => {
        const prod = products.find(p => p.id === item.id);
        const resultantStock = prod ? prod.stock : 0;
        this.addStockLedgerEntry({
          productId: item.id,
          productName: item.name,
          timestamp: sale.date || new Date().toISOString(),
          type: StockLedgerType.SAIDA_VENDA,
          quantity: item.quantity,
          operatorId: sale.userId || 'admin',
          operatorName: 'Operador de Venda',
          shiftId: 'SESSAO-PADRAO',
          documentRef: sale.invoiceNumber || sale.id,
          observations: `Venda #${sale.invoiceNumber || sale.id}`
        }, resultantStock);
      });
    } catch (e) {
      console.error('Erro ao registar ledger de stock na venda:', e);
    }

    // If sale is pending, increase customer debt
    if (sale.status === 'PENDING' && sale.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.debt += sale.total;
        this.set(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    // Real-time wallet update for PAID sales
    if (sale.status === 'PAID') {
        this.syncSaleTransactions(sale);
    }
    this.logActivityForCurrentUser(`Registou nova venda/fatura #${sale.id}`, 'VENDAS');
  }

  static cancelSale(saleId: string): boolean {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status === 'VOID') return false;

    // Restore stock
    const products = this.getProducts(true);
    const kits = this.getProductKits();

    sale.items.forEach(item => {
      if (item.isKit) {
        const kit = kits.find(k => k.id === item.id);
        if (kit) {
          kit.items.forEach(kitItem => {
            const prod = products.find(p => p.id === kitItem.productId);
            if (prod) {
              prod.stock += (kitItem.quantity * item.quantity);
              
              try {
                this.addStockLedgerEntry({
                  productId: kitItem.productId,
                  productName: kitItem.productName,
                  timestamp: new Date().toISOString(),
                  type: StockLedgerType.DEVOLUCAO,
                  quantity: kitItem.quantity * item.quantity,
                  operatorId: 'admin',
                  operatorName: 'Administrador',
                  shiftId: 'SESSAO-PADRAO',
                  documentRef: saleId,
                  observations: `Anulação de Venda #${sale.invoiceNumber || saleId} (Componente do Kit)`
                }, prod.stock);
              } catch (e) {
                console.error('Erro ao registar devolução do kit no ledger:', e);
              }
            }
          });
        }
      } else {
        const p = products.find(prod => prod.id === item.id);
        if (p) {
          p.stock += item.quantity;
          
          try {
            this.addStockLedgerEntry({
              productId: item.id,
              productName: item.name,
              timestamp: new Date().toISOString(),
              type: StockLedgerType.DEVOLUCAO,
              quantity: item.quantity,
              operatorId: 'admin',
              operatorName: 'Administrador',
              shiftId: 'SESSAO-PADRAO',
              documentRef: saleId,
              observations: `Anulação de Venda #${sale.invoiceNumber || saleId}`
            }, p.stock);
          } catch (e) {
            console.error('Erro ao registar devolução no ledger:', e);
          }
        }
      }
    });
    this.set(STORAGE_KEYS.PRODUCTS, products);

    // If it was pending, restore customer debt
    if (sale.status === 'PENDING' && sale.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) customer.debt -= sale.total;
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
    }

    sale.status = 'VOID';
    this.set(STORAGE_KEYS.SALES, sales);
    this.logActivityForCurrentUser(`Anulou a venda/fatura #${saleId}`, 'VENDAS');
    return true;
  }

  static settleInvoice(saleId: string, method: string, details?: PaymentDetail[]): boolean {
    const sales = this.getSales();
    const sale = sales.find(s => s.id === saleId);
    if (!sale || sale.status !== 'PENDING') return false;

    // Update customer debt
    if (sale.customerId) {
      const customers = this.getCustomers();
      const customer = customers.find(c => c.id === sale.customerId);
      if (customer) {
        customer.debt -= sale.total;
        this.set(STORAGE_KEYS.CUSTOMERS, customers);
      }
    }

    sale.status = 'PAID';
    sale.paymentMethod = method as Sale['paymentMethod'];
    if (details) {
      sale.paymentDetails = details;
    }
    this.set(STORAGE_KEYS.SALES, sales);
    this.logActivityForCurrentUser(`Liquidou/Recebeu pagamento da fatura #${saleId}`, 'FATURACAO');

    // Create income transactions for the settlement
    const paymentItems = details && details.length > 0 
        ? details 
        : [{ method: method, amount: sale.total }];

    paymentItems.forEach((d, idx) => {
        const walletId = this.getWalletIdForMethod(d.method);
        this.saveTransaction({
          id: `SETTLE-${sale.id}-${idx}-${Date.now()}`,
          date: new Date().toISOString(),
          description: `Liquidação de Fatura #${sale.id} (${d.method})`,
          amount: d.amount,
          type: 'INCOME',
          category: 'Recebimento de Faturas',
          status: 'PAID',
          method: d.method,
          walletId: walletId,
          reference: sale.id
        });
    });

    return true;
  }

  // --- TRANSACTIONS ---
  static getTransactions(): Transaction[] {
    return this.get(STORAGE_KEYS.TRANSACTIONS, []);
  }

  static saveTransaction(transaction: Transaction): void {
    const transactions = this.getTransactions();
    const wallets = this.getWallets();
    const index = transactions.findIndex(t => t.id === transaction.id);
    const isEdit = index >= 0;
    
    // Reverse old transaction effect if updating
    if (isEdit) {
      const oldTx = transactions[index];
      if (oldTx.walletId) {
        const wIndex = wallets.findIndex(w => w.id === oldTx.walletId);
        if (wIndex >= 0) {
          if (oldTx.type === 'INCOME' || (oldTx.type === 'TRANSFER' && oldTx.transferType === 'RECEIVE')) {
            wallets[wIndex].balance -= oldTx.amount;
          } else {
            wallets[wIndex].balance += oldTx.amount;
          }
        }
      }
      transactions[index] = transaction;
    } else {
      transactions.push(transaction);
    }

    // Apply new transaction effect
    if (transaction.walletId) {
      const wIndex = wallets.findIndex(w => w.id === transaction.walletId);
      if (wIndex >= 0) {
        if (transaction.type === 'INCOME' || (transaction.type === 'TRANSFER' && transaction.transferType === 'RECEIVE')) {
          wallets[wIndex].balance += transaction.amount;
        } else {
          wallets[wIndex].balance -= transaction.amount;
        }
      } else if (this.getWalletIdForMethod(transaction.walletId) === transaction.walletId) {
          // It's a valid native wallet ID but not in the list (shouldn't happen with getWallets() call above, but for safety)
          const isIncome = transaction.type === 'INCOME' || (transaction.type === 'TRANSFER' && transaction.transferType === 'RECEIVE');
          const newWallet: Wallet = {
              id: transaction.walletId,
              name: transaction.method || transaction.walletId,
              type: this.mapMethodToWalletType(transaction.walletId),
              currency: this.getConfig().currency,
              balance: isIncome ? transaction.amount : -transaction.amount,
              status: 'ACTIVE'
          };
          wallets.push(newWallet);
      }
    }

    this.set(STORAGE_KEYS.TRANSACTIONS, transactions);
    this.set(STORAGE_KEYS.WALLETS, wallets);

    if (transaction.id && !transaction.id.startsWith('AUTO-')) {
      this.logActivityForCurrentUser(
        isEdit ? `Editou transação: ${transaction.description}` : `Criou transação: ${transaction.description}`,
        'TESOURARIA'
      );
    }
  }

  static deleteTransaction(id: string): void {
    const transactions = this.getTransactions();
    const wallets = this.getWallets();
    const tx = transactions.find(t => t.id === id);

    if (tx && tx.walletId) {
      const wIndex = wallets.findIndex(w => w.id === tx.walletId);
      if (wIndex >= 0) {
        if (tx.type === 'INCOME' || (tx.type === 'TRANSFER' && tx.transferType === 'RECEIVE')) {
          wallets[wIndex].balance -= tx.amount;
        } else {
          wallets[wIndex].balance += tx.amount;
        }
      }
    }

    this.set(STORAGE_KEYS.TRANSACTIONS, transactions.filter(t => t.id !== id));
    if (tx) {
      this.logActivityForCurrentUser(`Apagou transação: ${tx.description}`, 'TESOURARIA');
    }
  }

  static toggleReconciliation(id: string): void {
    const transactions = this.getTransactions();
    const t = transactions.find(tx => tx.id === id);
    if (t) {
      t.reconciled = !t.reconciled;
      this.set(STORAGE_KEYS.TRANSACTIONS, transactions);
      this.logActivityForCurrentUser(
        t.reconciled ? `Reconciliou transação: ${t.description}` : `Desfez reconciliação da transação: ${t.description}`,
        'TESOURARIA'
      );
    }
  }

  // --- WALLETS ---
  static getWallets(): Wallet[] {
    const storedWallets = this.get<Wallet[]>(STORAGE_KEYS.WALLETS, []);
    const config = this.getConfig();
    const activeMethods = config.paymentMethods?.filter(m => m.isActive) || [];

    // 1. Sincronização de Métodos Nativos (Protegidos)
    const nativeIds = ['CASH', 'CARD', 'MPESA', 'EMOLA', 'TRANSFER', 'CREDIT_BALANCE'];
    
    // Filtramos carteiras armazenadas que NÃO são nativas (as customizadas)
    const customWallets = storedWallets.filter(w => !nativeIds.includes(w.id));

    // Mapeamos os métodos ativos para carteiras nativas
    const syncedNativeWallets = activeMethods.map(method => {
      const existing = storedWallets.find(w => w.id === method.id);
      if (existing) {
        return { ...existing, name: method.name };
      }
      return {
        id: method.id,
        name: method.name,
        type: this.mapMethodToWalletType(method.id),
        currency: config.currency,
        balance: 0,
        status: 'ACTIVE'
      } as Wallet;
    });

    // Resultado: Nativas Sincronizadas + Customizadas persistidas
    return [...syncedNativeWallets, ...customWallets];
  }

  private static mapMethodToWalletType(methodId: string): Wallet['type'] {
    switch (methodId) {
      case 'CASH': return 'CASH';
      case 'CARD': return 'POS';
      case 'MPESA':
      case 'EMOLA': return 'MOBILE';
      case 'TRANSFER': return 'BANK';
      default: return 'CASH';
    }
  }

  static saveWallet(wallet: Wallet): void {
    const allWallets = this.get<Wallet[]>(STORAGE_KEYS.WALLETS, []);
    const index = allWallets.findIndex(w => w.id === wallet.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      allWallets[index] = wallet;
    } else {
      allWallets.push(wallet);
    }
    this.set(STORAGE_KEYS.WALLETS, allWallets);
    this.logActivityForCurrentUser(
      isEdit ? `Editou a conta/caixa: ${wallet.name}` : `Criou a conta/caixa: ${wallet.name}`,
      'TESOURARIA'
    );
  }

  static deleteWallet(id: string): void {
    const allWallets = this.get<Wallet[]>(STORAGE_KEYS.WALLETS, []);
    const wallet = allWallets.find(w => w.id === id);
    this.set(STORAGE_KEYS.WALLETS, allWallets.filter(w => w.id !== id));
    if (wallet) {
      this.logActivityForCurrentUser(`Apagou a conta/caixa: ${wallet.name}`, 'TESOURARIA');
    }
  }

  static performWalletTransfer(sourceId: string, destId: string, amount: number, fee: number): void {
    const sourceTxId = `TR-${Date.now()}-S`;
    const destTxId = `TR-${Date.now()}-D`;

    // A transferência é atômica pois saveTransaction atualiza o saldo imediatamente no localStorage
    this.saveTransaction({
      id: sourceTxId,
      date: new Date().toISOString(),
      description: `Transferência enviada`,
      amount: amount + fee,
      type: 'TRANSFER',
      transferType: 'SEND',
      category: 'Transferência',
      status: 'PAID',
      walletId: sourceId,
      relatedTransferId: destTxId
    });

    this.saveTransaction({
      id: destTxId,
      date: new Date().toISOString(),
      description: `Transferência recebida`,
      amount: amount,
      type: 'TRANSFER',
      transferType: 'RECEIVE',
      category: 'Transferência',
      status: 'PAID',
      walletId: destId,
      relatedTransferId: sourceTxId
    });

    const wallets = this.getWallets();
    const source = wallets.find(w => w.id === sourceId);
    const dest = wallets.find(w => w.id === destId);
    this.logActivityForCurrentUser(
      `Efetuou transferência de ${source?.name || sourceId} para ${dest?.name || destId} de ${amount}`,
      'TESOURARIA'
    );
  }

  // --- SUPPLIERS ---
  static getSuppliers(): Supplier[] {
    return this.get(STORAGE_KEYS.SUPPLIERS, []);
  }

  static saveSupplier(supplier: Supplier): void {
    const suppliers = this.getSuppliers();
    const index = suppliers.findIndex(s => s.id === supplier.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      suppliers[index] = supplier;
    } else {
      suppliers.push(supplier);
    }
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o fornecedor ${supplier.name}` : `Criou o fornecedor ${supplier.name}`,
      'ARMAZEM'
    );
  }

  static deleteSupplier(id: string): void {
    const suppliers = this.getSuppliers();
    const supplier = suppliers.find(s => s.id === id);
    this.set(STORAGE_KEYS.SUPPLIERS, suppliers.filter(s => s.id !== id));
    if (supplier) {
      this.logActivityForCurrentUser(`Apagou o fornecedor ${supplier.name}`, 'ARMAZEM');
    }
  }

  // --- LOGS ---
  static getLogs(): UserLog[] {
    return this.get(STORAGE_KEYS.LOGS, []);
  }

  static logActivity(log: Omit<UserLog, 'id' | 'date'>): void {
    const logs = this.getLogs();
    logs.push({
      ...log,
      id: Date.now().toString(),
      date: new Date().toISOString()
    });
    this.set(STORAGE_KEYS.LOGS, logs.slice(-500)); // Keep last 500
  }

  // --- CASH SESSIONS ---
  static getCashSessions(): CashSession[] {
    return this.get(STORAGE_KEYS.CASH_SESSIONS, []);
  }

  static getActiveCashSession(userId?: string): CashSession | undefined {
    const sessions = this.getCashSessions();
    return sessions.find(s => s.status === 'OPEN' && (!userId || s.userId === userId));
  }

  static openCashSession(initialBalance: number, operatorName: string, userId: string): void {
    const sessions = this.getCashSessions();
    if (sessions.some(s => s.status === 'OPEN' && s.userId === userId)) {
      throw new Error('Já existe um caixa aberto para este usuário.');
    }
    sessions.push({
      id: Date.now().toString(),
      userId,
      operatorName,
      startTime: new Date().toISOString(),
      initialBalance,
      totalSalesSystem: 0,
      totalCashSystem: 0,
      status: 'OPEN'
    });
    this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);
    this.logActivityForCurrentUser(`Abriu sessão de caixa com saldo inicial de ${initialBalance}`, 'TESOURARIA');
  }

  static closeCashSession(sessionId: string, declaredBalance: number, justification: string): void {
    const sessions = this.getCashSessions();
    const session = sessions.find(s => s.id === sessionId);
    
    // Só processa se a sessão existir e ainda estiver aberta
    if (session && session.status === 'OPEN') {
      const stats = this.getSessionStats(sessionId);
      session.endTime = new Date().toISOString();
      session.finalBalanceDeclared = declaredBalance;
      session.totalSalesSystem = stats.totalSales;
      session.totalCashSystem = stats.breakdown['CASH'] || 0;
      session.discrepancy = declaredBalance - (session.initialBalance + session.totalCashSystem);
      session.justification = justification;
      session.status = 'CLOSED';
      this.set(STORAGE_KEYS.CASH_SESSIONS, sessions);

      // --- Automação: Registo de Quebra/Diferença de Caixa ---
      if (session.discrepancy !== 0) {
          const isShortage = session.discrepancy < 0;
          this.saveTransaction({
              id: `CASH-DIFF-${sessionId}`,
              date: session.endTime!,
              description: `Diferença de Caixa (Fecho #${sessionId.slice(-6)})${isShortage ? ' - QUEBRA' : ' - SOBRA'}`,
              amount: Math.abs(session.discrepancy),
              type: isShortage ? 'EXPENSE' : 'INCOME',
              category: 'Ajuste de Caixa',
              status: 'PAID',
              method: 'CASH',
              walletId: 'CASH',
              operatorName: session.operatorName,
              sessionId: sessionId,
              reconciled: true
          });
      }
      this.logActivityForCurrentUser(`Fechou sessão de caixa #${sessionId.slice(-6)} com saldo declarado de ${declaredBalance} (Diferença: ${session.discrepancy})`, 'TESOURARIA');
    }
  }

  static getSessionStats(sessionId: string): { 
    totalSales: number; 
    breakdown: Record<string, number>; 
    expectedCash: number; 
    manualIn: number; 
    manualOut: number; 
    diff: number; 
  } {
    const session = this.getCashSessions().find(s => s.id === sessionId);
    if (!session) return { totalSales: 0, breakdown: {}, expectedCash: 0, manualIn: 0, manualOut: 0, diff: 0 };

    const sales = this.getSales().filter(s => 
      s.userId === session.userId && 
      new Date(s.date) >= new Date(session.startTime) &&
      (!session.endTime || new Date(s.date) <= new Date(session.endTime))
    );

    const transactions = this.getTransactions().filter(t => 
      t.sessionId === sessionId || (
        !t.sessionId && 
        new Date(t.date) >= new Date(session.startTime) &&
        (!session.endTime || new Date(t.date) <= new Date(session.endTime)) &&
        ((t.userId && t.userId === session.userId) || (!t.userId && t.operatorName === session.operatorName))
      )
    );

    const breakdown: Record<string, number> = {};
    let totalSales = 0;

    sales.forEach(s => {
      if (s.status === 'PAID') {
        totalSales += s.total;
        if (s.paymentDetails) {
          s.paymentDetails.forEach(d => {
            breakdown[d.method] = (breakdown[d.method] || 0) + d.amount;
          });
        } else {
          breakdown[s.paymentMethod] = (breakdown[s.paymentMethod] || 0) + s.total;
        }
      }
    });

    let manualIn = 0;
    let manualOut = 0;

    transactions.forEach(t => {
      if (t.type === 'INCOME') manualIn += t.amount;
      else manualOut += t.amount;
    });

    const cashSales = breakdown['CASH'] || 0;
    const expectedCash = session.initialBalance + cashSales + manualIn - manualOut;
    const diff = (session.finalBalanceDeclared || 0) - expectedCash;

    return { totalSales, breakdown, expectedCash, manualIn, manualOut, diff };
  }

  static compensateCustomerBalance(customerId: string, amount: number) {
    const customers = this.getCustomers();
    const index = customers.findIndex(c => c.id === customerId);
    if (index !== -1) {
      customers[index].creditBalance -= amount;
      customers[index].debt -= amount;
      this.set(STORAGE_KEYS.CUSTOMERS, customers);
    }
  }

  // --- STOCK ENTRIES ---
  static getStockEntries(): StockEntry[] {
    return this.get(STORAGE_KEYS.STOCK_ENTRIES, []);
  }

  static saveStockEntry(entry: StockEntry): void {
    const entries = this.getStockEntries();
    entries.push(entry);
    this.set(STORAGE_KEYS.STOCK_ENTRIES, entries);

    // Update stock and cost
    const products = this.getProducts(true);
    entry.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        p.stock += item.quantity;
        p.cost = item.cost;
        p.price = item.price;

        // Log entry to ledger
        try {
          this.addStockLedgerEntry({
            productId: item.productId,
            productName: item.productName,
            timestamp: entry.date || new Date().toISOString(),
            type: StockLedgerType.ENTRADA_COMPRA,
            quantity: item.quantity,
            operatorId: entry.registeredBy || 'admin',
            operatorName: entry.registeredBy || 'Administrador',
            shiftId: 'SESSAO-PADRAO',
            documentRef: entry.invoiceNo || entry.id,
            observations: `Entrada de Stock #${entry.id} - Fornecedor: ${entry.supplierName}`
          }, p.stock);
        } catch (e) {
          console.error('Erro ao registar ledger na entrada de stock:', e);
        }
      }
    });
    this.set(STORAGE_KEYS.PRODUCTS, products);
    this.logActivityForCurrentUser(`Registou entrada de stock: #${entry.id}`, 'ARMAZEM');
  }

  // --- STOCK EXITS ---
  static getStockExits(): StockExit[] {
    return this.get(STORAGE_KEYS.STOCK_EXITS, []);
  }

  static saveStockExit(exit: StockExit): void {
    const exits = this.getStockExits();
    exits.push(exit);
    this.set(STORAGE_KEYS.STOCK_EXITS, exits);

    // Update stock
    const products = this.getProducts(true);
    exit.items.forEach(item => {
      const p = products.find(prod => prod.id === item.productId);
      if (p) {
        p.stock -= item.quantity;

        // Log exit to ledger as AJUSTE_INVENTARIO with negative quantity
        try {
          this.addStockLedgerEntry({
            productId: item.productId,
            productName: item.productName,
            timestamp: exit.date || new Date().toISOString(),
            type: StockLedgerType.AJUSTE_INVENTARIO,
            quantity: -item.quantity,
            operatorId: exit.registeredBy || 'admin',
            operatorName: exit.registeredBy || 'Administrador',
            shiftId: 'SESSAO-PADRAO',
            documentRef: exit.id,
            observations: `Saída/Abate de Stock #${exit.id} - Motivo: ${item.reason}`
          }, p.stock);
        } catch (e) {
          console.error('Erro ao registar ledger na saída de stock:', e);
        }
      }
    });
    this.set(STORAGE_KEYS.PRODUCTS, products);

    // Automaticamente registar como perda na tesouraria
    this.saveTransaction({
      id: `LOSS-${exit.id}`,
      date: exit.date,
      description: `Perda de Inventário: ${exit.items[0]?.reason || 'Quebra/Ajuste'} (${exit.items.length} itens)`,
      amount: exit.totalLossValue,
      type: 'EXPENSE',
      category: 'Perdas de Stock',
      status: 'PAID',
      method: 'STOCK_ADJUSTMENT',
      reference: exit.id
    });
    this.logActivityForCurrentUser(`Registou saída de stock (Perda): #${exit.id}`, 'ARMAZEM');
  }

  // --- REQUISITIONS ---
  static getRequisitions(): Requisition[] {
    return this.get(STORAGE_KEYS.REQUISITIONS, []);
  }

  static saveRequisition(req: Requisition): void {
    const reqs = this.getRequisitions();
    const index = reqs.findIndex(r => r.id === req.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      reqs[index] = req;
    } else {
      reqs.push(req);
    }
    this.set(STORAGE_KEYS.REQUISITIONS, reqs);
    this.logActivityForCurrentUser(
      isEdit ? `Editou a requisição de armazém #${req.id}` : `Criou a requisição de armazém #${req.id}`,
      'ARMAZEM'
    );
  }

  static updateRequisitionStatus(id: string, status: Requisition['status'], reason?: string): void {
    const reqs = this.getRequisitions();
    const req = reqs.find(r => r.id === id);
    if (req) {
      req.status = status;
      if (reason) req.rejectionReason = reason;
      this.set(STORAGE_KEYS.REQUISITIONS, reqs);
      this.logActivityForCurrentUser(`Alterou status da requisição #${id} para ${status}`, 'ARMAZEM');
    }
  }

  static finalizeRequisitionPurchase(id: string): string {
    const reqs = this.getRequisitions();
    const req = reqs.find(r => r.id === id);
    if (req) {
      req.status = 'PURCHASED';
      const txId = Date.now().toString();
      req.convertedTransactionId = txId;
      this.set(STORAGE_KEYS.REQUISITIONS, reqs);
      
      // Create transaction
      this.saveTransaction({
        id: txId,
        date: new Date().toISOString(),
        description: `Compra Ref. Requisição #${req.id.slice(-6)}`,
        amount: req.totalEstimated,
        type: 'EXPENSE',
        category: 'Compras',
        status: 'PENDING'
      });
      this.logActivityForCurrentUser(`Finalizou compra da requisição #${id}`, 'ARMAZEM');
      return txId;
    }
    return '';
  }

  // --- AUDITS ---
  static getAudits(): StockAudit[] {
    return this.get(STORAGE_KEYS.AUDITS, []);
  }

  static saveAudit(audit: StockAudit): void {
    const audits = this.getAudits();
    const index = audits.findIndex(a => a.id === audit.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      audits[index] = audit;
    } else {
      audits.push(audit);
    }
    this.set(STORAGE_KEYS.AUDITS, audits);
    this.logActivityForCurrentUser(
      isEdit ? `Editou a auditoria de stock #${audit.id}` : `Criou a auditoria de stock #${audit.id}`,
      'ARMAZEM'
    );
  }

  static approveAudit(id: string, approvedBy: string): void {
    const audits = this.getAudits();
    const audit = audits.find(a => a.id === id);
    if (audit) {
      audit.status = 'APPROVED';
      audit.approvedBy = approvedBy;
      audit.dateFinalized = new Date().toISOString();
      this.set(STORAGE_KEYS.AUDITS, audits);

      // Apply stock adjustments
      const products = this.getProducts(true);
      audit.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        if (p && item.countedStock !== null) {
          const systemStock = p.stock;
          const countedStock = item.countedStock;
          const difference = countedStock - systemStock;

          p.stock = countedStock;

          // Log to ledger as AJUSTE_INVENTARIO if there's any difference
          if (difference !== 0) {
            try {
              this.addStockLedgerEntry({
                productId: item.productId,
                productName: item.productName,
                timestamp: audit.dateFinalized || new Date().toISOString(),
                type: StockLedgerType.AJUSTE_INVENTARIO,
                quantity: difference,
                operatorId: approvedBy,
                operatorName: approvedBy,
                shiftId: 'SESSAO-PADRAO',
                documentRef: audit.id,
                observations: `Ajuste por Auditoria de Stock #${audit.id} (Diferença: ${difference > 0 ? '+' : ''}${difference} un)`
              }, countedStock);
            } catch (e) {
              console.error('Erro ao registar ledger de stock na auditoria:', e);
            }
          }
        }
      });
      this.set(STORAGE_KEYS.PRODUCTS, products);
      this.logActivityForCurrentUser(`Aprovou e aplicou acertos da auditoria de stock #${id}`, 'ARMAZEM');
    }
  }

  // --- KITS ---
  static getProductKits(): ProductKit[] {
    return this.get(STORAGE_KEYS.KITS, []);
  }

  static saveProductKit(kit: ProductKit): void {
    if (!this.isBarcodeUnique(kit.code, kit.id)) {
      throw new Error('Já existe um produto ou kit com este código.');
    }
    const kits = this.getProductKits();
    const index = kits.findIndex(k => String(k.id) === String(kit.id));
    const isEdit = index >= 0;
    if (index >= 0) {
      kits[index] = kit;
    } else {
      kits.push(kit);
    }
    this.set(STORAGE_KEYS.KITS, kits);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o kit de produtos ${kit.name}` : `Criou o kit de produtos ${kit.name}`,
      'INVENTARIO'
    );
  }

  static deleteProductKit(id: string): void {
    const kits = this.getProductKits();
    const kit = kits.find(k => String(k.id) === String(id));
    this.set(STORAGE_KEYS.KITS, kits.filter(k => String(k.id) !== String(id)));
    if (kit) {
      this.logActivityForCurrentUser(`Apagou o kit de produtos ${kit.name}`, 'INVENTARIO');
    }
  }

  // --- RECURSOS HUMANOS (RH) ---
  static getEmployees(): Employee[] {
    return this.get(STORAGE_KEYS.EMPLOYEES, DEFAULT_EMPLOYEES);
  }

  static saveEmployee(employee: Employee): void {
    const employees = this.getEmployees();
    const index = employees.findIndex(e => e.id === employee.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      employees[index] = employee;
    } else {
      employees.push(employee);
    }
    this.set(STORAGE_KEYS.EMPLOYEES, employees);
    this.logActivityForCurrentUser(
      isEdit ? `Editou o colaborador ${employee.name}` : `Cadastrou o colaborador ${employee.name}`,
      'RECURSOS_HUMANOS'
    );
  }

  static deleteEmployee(id: string): void {
    const employees = this.getEmployees();
    const employee = employees.find(e => e.id === id);
    this.set(STORAGE_KEYS.EMPLOYEES, employees.filter(e => e.id !== id));
    if (employee) {
      this.logActivityForCurrentUser(`Removeu o colaborador ${employee.name}`, 'RECURSOS_HUMANOS');
    }
  }

  static getPayrolls(): Payroll[] {
    return this.get(STORAGE_KEYS.PAYROLLS, []);
  }

  static savePayroll(payroll: Payroll): void {
    const payrolls = this.getPayrolls();
    const index = payrolls.findIndex(p => p.id === payroll.id);
    const isEdit = index >= 0;
    if (index >= 0) {
      payrolls[index] = payroll;
    } else {
      payrolls.push(payroll);
    }
    this.set(STORAGE_KEYS.PAYROLLS, payrolls);
    this.logActivityForCurrentUser(
      isEdit ? `Atualizou a folha de salários do período ${payroll.period}` : `Processou nova folha de salários do período ${payroll.period}`,
      'RECURSOS_HUMANOS'
    );
  }

  static deletePayroll(id: string): void {
    const payrolls = this.getPayrolls();
    const payroll = payrolls.find(p => p.id === id);
    this.set(STORAGE_KEYS.PAYROLLS, payrolls.filter(p => p.id !== id));
    if (payroll) {
      this.logActivityForCurrentUser(`Removeu a folha de salários do período ${payroll.period}`, 'RECURSOS_HUMANOS');
    }
  }

  static getPayrollPayments(): PayrollPayment[] {
    return this.get(STORAGE_KEYS.PAYROLL_PAYMENTS, []);
  }

  static savePayrollPayment(payment: PayrollPayment): void {
    const payments = this.getPayrollPayments();
    const index = payments.findIndex(p => p.id === payment.id);
    if (index >= 0) {
      payments[index] = payment;
    } else {
      payments.push(payment);
    }
    this.set(STORAGE_KEYS.PAYROLL_PAYMENTS, payments);
    this.logActivityForCurrentUser(
      `Registou o pagamento da folha de salários do período ${payment.payrollPeriod} no valor de ${payment.totalAmount}`,
      'RECURSOS_HUMANOS'
    );
  }

  // --- STOCK LEDGER ---
  static getStockLedger(): StockLedgerEntry[] {
    // Seed automatically if ledger is completely empty
    this.seedStockLedger();
    const ledger = this.get<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, []);
    return ledger.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  static addStockLedgerEntry(entry: Omit<StockLedgerEntry, 'id' | 'resultantStock'>, resultantStock?: number): StockLedgerEntry {
    const ledger = this.get<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, []);
    
    let change = 0;
    if (entry.type === StockLedgerType.ENTRADA_COMPRA || entry.type === StockLedgerType.DEVOLUCAO) {
      change = entry.quantity;
    } else if (entry.type === StockLedgerType.SAIDA_VENDA) {
      change = -entry.quantity;
    } else if (entry.type === StockLedgerType.AJUSTE_INVENTARIO) {
      change = entry.quantity; // Adjustments can carry negative or positive value
    }

    let calculatedResultantStock = 0;
    if (resultantStock !== undefined) {
      calculatedResultantStock = resultantStock;
    } else {
      const productEntries = ledger
        .filter(e => e.productId === entry.productId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      
      let previousStock = 0;
      if (productEntries.length > 0) {
        previousStock = productEntries[productEntries.length - 1].resultantStock;
      } else {
        const products = this.getProducts(true);
        const prod = products.find(p => p.id === entry.productId);
        previousStock = prod ? prod.stock : 0;
        
        if (entry.type === StockLedgerType.SAIDA_VENDA) {
          previousStock = previousStock + entry.quantity;
        } else if (entry.type === StockLedgerType.ENTRADA_COMPRA || entry.type === StockLedgerType.DEVOLUCAO) {
          previousStock = Math.max(0, previousStock - entry.quantity);
        }
      }
      calculatedResultantStock = previousStock + change;
    }

    const newEntry: StockLedgerEntry = {
      ...entry,
      id: `MV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      resultantStock: calculatedResultantStock
    };

    ledger.push(newEntry);
    this.set(STORAGE_KEYS.STOCK_LEDGER, ledger);
    return newEntry;
  }

  static seedStockLedger(): void {
    const products = this.getProducts(true);
    let seededProducts = [...products];

    // Seed default products if empty
    if (products.length === 0) {
      const defaultProds: Product[] = [
        {
          id: 'prod-laur-01',
          code: 'LAUR-001',
          name: 'Cerveja Laurentina Premium',
          description: 'Cerveja Laurentina Premium Garrafa 330ml',
          price: 120,
          cost: 75,
          stock: 95,
          category: 'Bebidas',
          minStock: 20,
          ivaEnabled: true
        },
        {
          id: 'prod-arr-02',
          code: 'ARR-002',
          name: 'Arroz Nacional 5kg',
          description: 'Arroz de grão longo nacional saco de 5kg',
          price: 350,
          cost: 220,
          stock: 85,
          category: 'Mercearia',
          minStock: 10,
          ivaEnabled: false
        },
        {
          id: 'prod-ole-03',
          code: 'OLE-003',
          name: 'Óleo Alimentar 1L',
          description: 'Óleo vegetal para cozinhar garrafa de 1L',
          price: 180,
          cost: 110,
          stock: 120,
          category: 'Mercearia',
          minStock: 15,
          ivaEnabled: true
        }
      ];
      this.set(STORAGE_KEYS.PRODUCTS, defaultProds);
      seededProducts = defaultProds;
    }

    const ledger = this.get<StockLedgerEntry[]>(STORAGE_KEYS.STOCK_LEDGER, []);
    if (ledger.length === 0) {
      const laurProduct = seededProducts.find(p => p.code === 'LAUR-001') || seededProducts[0];
      const arrProduct = seededProducts.find(p => p.code === 'ARR-002') || seededProducts[1];
      
      const seedEntries: StockLedgerEntry[] = [
        {
          id: 'MV-10001',
          productId: laurProduct.id,
          productName: laurProduct.name,
          timestamp: '2026-07-01T08:30:00Z',
          type: StockLedgerType.ENTRADA_COMPRA,
          quantity: 100,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-01',
          resultantStock: 100,
          documentRef: 'FAT-COMPRA-9921',
          observations: 'Entrada inicial de stock de fornecedor Laurentina SA'
        },
        {
          id: 'MV-10002',
          productId: laurProduct.id,
          productName: laurProduct.name,
          timestamp: '2026-07-02T09:15:00Z',
          type: StockLedgerType.ENTRADA_COMPRA,
          quantity: 50,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-02',
          resultantStock: 150,
          documentRef: 'FAT-COMPRA-9985',
          observations: 'Reforço de stock para o fim de semana'
        },
        {
          id: 'MV-10003',
          productId: laurProduct.id,
          productName: laurProduct.name,
          timestamp: '2026-07-03T14:20:00Z',
          type: StockLedgerType.SAIDA_VENDA,
          quantity: 30,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-03',
          resultantStock: 120,
          documentRef: 'VENDA-PDV-4412',
          observations: 'Saída automatizada por venda ao balcão'
        },
        {
          id: 'MV-10004',
          productId: laurProduct.id,
          productName: laurProduct.name,
          timestamp: '2026-07-04T18:45:00Z',
          type: StockLedgerType.SAIDA_VENDA,
          quantity: 20,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-04',
          resultantStock: 100,
          documentRef: 'VENDA-PDV-4590',
          observations: 'Saída automatizada por venda ao balcão'
        },
        {
          id: 'MV-10005',
          productId: laurProduct.id,
          productName: laurProduct.name,
          timestamp: '2026-07-05T10:00:00Z',
          type: StockLedgerType.AJUSTE_INVENTARIO,
          quantity: -5,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-05',
          resultantStock: 95,
          documentRef: 'AUDIT-003',
          observations: 'Ajuste de inventário por quebra de garrafas no armazém'
        },
        {
          id: 'MV-10006',
          productId: arrProduct.id,
          productName: arrProduct.name,
          timestamp: '2026-07-02T10:00:00Z',
          type: StockLedgerType.ENTRADA_COMPRA,
          quantity: 100,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-02',
          resultantStock: 100,
          documentRef: 'FAT-COMPRA-9922',
          observations: 'Arroz recebido da distribuidora nacional'
        },
        {
          id: 'MV-10007',
          productId: arrProduct.id,
          productName: arrProduct.name,
          timestamp: '2026-07-03T16:00:00Z',
          type: StockLedgerType.SAIDA_VENDA,
          quantity: 15,
          operatorId: 'admin-1',
          operatorName: 'Administrador',
          shiftId: 'TURNO-03',
          resultantStock: 85,
          documentRef: 'VENDA-PDV-4413',
          observations: 'Venda de fardos de arroz 5kg'
        }
      ];
      this.set(STORAGE_KEYS.STOCK_LEDGER, seedEntries);
    }
  }
}

