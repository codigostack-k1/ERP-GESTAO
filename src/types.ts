

export enum UserRole {
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  SELLER = 'SELLER'
}

export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning'
}

export interface SecurityQuestion {
  question: string;
  answerHash: string;
}

export interface User {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  contact?: string;
  isActive?: boolean;
  isLocked?: boolean;
  lastLogin?: string;
  lastActivity?: string;
  passwordHash?: string;
  customPermissions?: string[];
  passwordChangedAt?: string;
  forcePasswordChange?: boolean;
  failedLoginAttempts?: number;
  securityQuestions?: SecurityQuestion[];
}

export interface UserLog {
  id: string;
  date: string;
  userId: string;
  userName: string;
  action: string;
  module: string;
  deviceInfo: string;
}

export interface PermissionProfile {
  id: string;
  name: string;
  permissions: string[];
}

export interface Supplier {
  id: string;
  name: string;
  nif: string;
  contact: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
}

export interface StockMovement {
  id: string;
  date: string;
  productId: string;
  type: 'ENTRY' | 'EXIT' | 'ADJUSTMENT';
  quantity: number;
  reason: string;
  documentRef?: string;
  supplierId?: string;
  costPrice?: number;
}

export interface StockEntryItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  cost: number;
  price: number;
  expiryDate?: string;
}

export interface StockEntry {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  invoiceNo: string;
  items: StockEntryItem[];
  totalAmount: number;
  status: 'ACTIVE' | 'VOID';
  notes?: string;
  registeredBy: string;
}

// --- NOVAS INTERFACES PARA SAÍDA (ABATE) ---
export interface StockExitItem {
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  cost: number; // Custo no momento da saída para cálculo de perda
  reason: string;
}

export interface StockExit {
  id: string;
  date: string;
  items: StockExitItem[];
  totalLossValue: number;
  status: 'ACTIVE' | 'VOID';
  notes?: string;
  registeredBy: string;
}
// ------------------------------------------

export interface Product {
  id: string;
  code: string;
  name: string;
  description?: string;
  price: number;
  cost: number;
  stock: number;
  category: string;
  subcategory?: string;
  brand?: string;
  minStock: number;
  supplierId?: string;
  isBlacklisted?: boolean;
  blacklistReason?: string;
  expiryDate?: string;
  ivaEnabled?: boolean;
  isKit?: boolean;
}

export interface CompensationRecord {
  id: string;
  date: string;
  amount: number;
  description: string;
}

export interface Customer {
  id: string;
  name: string;
  nif: string;
  email?: string;
  phone?: string;
  address?: string;
  debt: number;
  creditBalance: number;
  isBlacklisted: boolean;
  compensationHistory?: CompensationRecord[];
}

export interface CartItem extends Product {
  quantity: number;
}

export interface PaymentDetail {
  method: string;
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  invoiceNumber?: string;
  date: string;
  items: CartItem[];
  total: number;
  customerId?: string;
  customerName?: string;
  paymentMethod: string;
  paymentReference?: string;
  paymentDetails?: PaymentDetail[];
  amountTendered?: number;
  change?: number;
  // --- FIX: Added 'VOID' to status ---
  status?: 'PAID' | 'PENDING' | 'VOID';
  userId: string;
  type?: 'PDV' | 'INVOICE';
}

export interface Wallet {
  id: string;
  name: string;
  type: 'CASH' | 'MOBILE' | 'BANK' | 'POS';
  currency: string;
  balance: number;
  accountNumber?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  category: string;
  status: 'PAID' | 'PENDING';
  dueDate?: string;
  method?: string;
  operatorName?: string;
  beneficiary?: string;
  walletId?: string;
  relatedTransferId?: string;
  reconciled?: boolean;
  isFee?: boolean;
  sessionId?: string;
  reference?: string;
  userId?: string;
  transferType?: 'SEND' | 'RECEIVE';
}

export interface RequisitionItem {
  productId?: string;
  productName: string;
  quantity: number;
  estimatedUnitCost: number;
}

export interface Requisition {
  id: string;
  date: string;
  requester: string;
  type: 'RESALE' | 'CONSUMPTION';
  supplierId?: string;
  items: RequisitionItem[];
  totalEstimated: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PURCHASED';
  rejectionReason?: string;
  convertedTransactionId?: string;
}

export interface StockAuditItem {
  productId: string;
  productName: string;
  productCode: string;
  systemStock: number;
  countedStock: number | null;
  salePrice: number;
  costPrice: number;
}

export interface StockAudit {
  id: string;
  dateCreated: string;
  dateFinalized?: string;
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'DISCARDED';
  auditorName: string;
  items: StockAuditItem[];
  totalValueSurplus: number;
  totalValueLoss: number;
  approvedBy?: string;
}

export interface CashSession {
  id: string;
  userId?: string;
  operatorName: string;
  startTime: string;
  endTime?: string;
  initialBalance: number;
  finalBalanceDeclared?: number;
  totalSalesSystem: number;
  totalCashSystem: number;
  discrepancy?: number;
  justification?: string;
  status: 'OPEN' | 'CLOSED';
}

export interface PaymentMethod {
  id: string;
  name: string;
  isActive: boolean;
  type: 'CASH' | 'MOBILE' | 'BANK' | 'OTHER';
}

export interface ProductKitItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface ProductKit {
  id: string;
  code: string;
  name: string;
  description?: string;
  items: ProductKitItem[];
  price: number;
  cost: number;
  category: string;
  isActive: boolean;
}

export interface AppConfig {
  companyName: string;
  nif: string;
  currency: string;
  currencySymbol?: string;
  darkMode: boolean;
  companyAddress?: string;
  companyContact?: string;
  logo?: string;
  paymentMethods?: PaymentMethod[];
  language?: 'pt' | 'en';
  fontSize?: 'small' | 'medium' | 'large';
  companyDescription?: string;
  financialTransactionData?: string;
  companyEmail?: string;
  ivaRate?: number;
  ivaEnabled?: boolean;
  inactivityTimeout?: number; // In minutes
  restrictBlacklistedProducts?: boolean;
}

// --- HUMAN RESOURCES (RH) TYPES ---
export interface Employee {
  id: string;
  name: string;
  bi: string; // Bilhete de Identidade (obrigatório)
  nuit: string; // NUIT (obrigatório)
  admissionDate: string; // Data de admissão
  bankName?: string; // Nome do banco
  bankAccount?: string; // Conta bancária ou N° de carteira móvel
  paymentMethodType: 'BANK' | 'M_PESA' | 'E_MOLA' | 'MKESH'; // Tipo de pagamento
  baseSalary: number; // Salário base
  position: string; // Cargo
  department?: string; // Departamento
  isActive: boolean;
}

export interface PayrollItem {
  employeeId: string;
  employeeName: string;
  baseSalary: number;
  inssWorker: number; // 3%
  inssCompany: number; // 4%
  subsidies: { id: string; name: string; amount: number }[];
  otherDeductions: { id: string; name: string; amount: number }[];
  netSalary: number;
}

export interface Payroll {
  id: string;
  period: string; // e.g. "2026-06"
  createdAt: string;
  status: 'DRAFT' | 'APPROVED' | 'PAID';
  items: PayrollItem[];
  totalBaseSalary: number;
  totalInssWorker: number;
  totalInssCompany: number;
  totalSubsidies: number;
  totalDeductions: number;
  totalNetSalary: number;
}

export interface PayrollPayment {
  id: string;
  payrollId: string;
  payrollPeriod: string;
  date: string;
  totalAmount: number;
  walletId: string; // Account/wallet used for payment
  walletName?: string;
  status: 'SUCCESS' | 'FAILED';
  paymentFileContent?: string;
  paymentFileName?: string;
}

export enum StockLedgerType {
  ENTRADA_COMPRA = 'ENTRADA_COMPRA',
  SAIDA_VENDA = 'SAIDA_VENDA',
  DEVOLUCAO = 'DEVOLUCAO',
  AJUSTE_INVENTARIO = 'AJUSTE_INVENTARIO'
}

export interface StockLedgerEntry {
  id: string;
  productId: string;
  productName: string;
  timestamp: string;
  type: StockLedgerType;
  quantity: number;
  operatorId: string;
  operatorName: string;
  shiftId: string;
  resultantStock: number;
  documentRef?: string;
  observations?: string;
}

