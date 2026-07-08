import React, { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  Users, 
  Plus, 
  Search, 
  Edit2, 
  X, 
  Trash2, 
  FileSpreadsheet, 
  Printer, 
  Briefcase, 
  TrendingUp, 
  Wallet, 
  CreditCard, 
  FileText, 
  Download, 
  Check, 
  AlertCircle,
  Banknote,
  UserPlus,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { StorageService } from '../services/storageService';
import { Employee, Payroll, PayrollItem, PayrollPayment, AppConfig, User, Wallet as AppWallet, ToastType } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useConfirm } from '../contexts/ConfirmContext';

// Pure helper functions declared outside the component to prevent impurity render warnings
const getNowId = (prefix: string): string => {
  return `${prefix}-${Date.now()}`;
};

const getNowIdWithRandom = (prefix: string): string => {
  return `${prefix}-${Date.now()}-${Math.random()}`;
};

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getInitialPeriod = (): string => {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${d.getFullYear()}-${mm}`;
};

interface RecursosHumanosProps {
  config: AppConfig;
  currentUser: User | null;
}

const RecursosHumanos: React.FC<RecursosHumanosProps> = ({ config, currentUser }) => {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [searchParams] = useSearchParams();

  // Active Tab
  const activeTab = (searchParams.get('tab') as 'employees' | 'payroll' | 'payments') || 'employees';

  // Core States
  const [employees, setEmployees] = useState<Employee[]>(() => StorageService.getEmployees());
  const [payrolls, setPayrolls] = useState<Payroll[]>(() => StorageService.getPayrolls());
  const [payments, setPayments] = useState<PayrollPayment[]>(() => StorageService.getPayrollPayments());
  const [wallets] = useState<AppWallet[]>(() => StorageService.getWallets());

  // Search & Filter
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('ALL');

  // Employee Modal State
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Payroll Processing States
  const [isProcessing, setIsProcessing] = useState(false);
  const [payrollPeriod, setPayrollPeriod] = useState(getInitialPeriod);
  const [processingItems, setProcessingItems] = useState<PayrollItem[]>([]);

  // Reset processing state when leaving the payroll tab
  React.useEffect(() => {
    if (activeTab !== 'payroll') {
      setIsProcessing(false);
    }
  }, [activeTab]);

  // Current lines being added/edited for a processing employee
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [tempSubsidies, setTempSubsidies] = useState<{ id: string; name: string; amount: number }[]>([]);
  const [tempDeductions, setTempDeductions] = useState<{ id: string; name: string; amount: number }[]>([]);
  
  // Custom subsidy/deduction item input in sub-editor
  const [newSubName, setNewSubName] = useState('');
  const [newSubAmount, setNewSubAmount] = useState('');
  const [newDedName, setNewDedName] = useState('');
  const [newDedAmount, setNewDedAmount] = useState('');

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPayrollToPay, setSelectedPayrollToPay] = useState<Payroll | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState('');

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedReceiptPayroll, setSelectedReceiptPayroll] = useState<Payroll | null>(null);
  const [selectedReceiptEmployee, setSelectedReceiptEmployee] = useState<PayrollItem | null>(null);

  // Departments List
  const departments = useMemo(() => {
    const depts = new Set<string>();
    employees.forEach(e => {
      if (e.department) depts.add(e.department);
    });
    return ['ALL', ...Array.from(depts)];
  }, [employees]);

  // Filtered Employees list
  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchesSearch = e.name.toLowerCase().includes(employeeSearch.toLowerCase()) || 
                            e.bi.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            e.nuit.toLowerCase().includes(employeeSearch.toLowerCase()) ||
                            e.position.toLowerCase().includes(employeeSearch.toLowerCase());
      const matchesDept = selectedDept === 'ALL' || e.department === selectedDept;
      return matchesSearch && matchesDept;
    });
  }, [employees, employeeSearch, selectedDept]);

  // --- Pagination States & Logic ---
  const [employeesPage, setEmployeesPage] = useState(1);
  const [payrollsPage, setPayrollsPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const itemsPerPageTable = 8;
  const itemsPerPageGrid = 6;

  const totalEmployeesPages = Math.ceil(filteredEmployees.length / itemsPerPageTable);
  const activeEmployeesPage = Math.min(totalEmployeesPages, Math.max(1, employeesPage));
  const paginatedEmployees = useMemo(() => {
    return filteredEmployees.slice((activeEmployeesPage - 1) * itemsPerPageTable, activeEmployeesPage * itemsPerPageTable);
  }, [filteredEmployees, activeEmployeesPage]);

  const totalPayrollsPages = Math.ceil(payrolls.length / itemsPerPageGrid);
  const paginatedPayrolls = useMemo(() => {
    return payrolls.slice((payrollsPage - 1) * itemsPerPageGrid, payrollsPage * itemsPerPageGrid);
  }, [payrolls, payrollsPage]);

  const totalPaymentsPages = Math.ceil(payments.length / itemsPerPageTable);
  const paginatedPayments = useMemo(() => {
    return payments.slice((paymentsPage - 1) * itemsPerPageTable, paymentsPage * itemsPerPageTable);
  }, [payments, paymentsPage]);

  // Form handlers
  const openEmployeeModal = (employee?: Employee) => {
    setEditingEmployee(employee || null);
    setIsEmployeeModalOpen(true);
  };

  const handleSaveEmployee = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const bi = formData.get('bi') as string;
    const nuit = formData.get('nuit') as string;
    const name = formData.get('name') as string;
    const baseSalary = parseFloat(formData.get('baseSalary') as string || '0');

    if (!name || !bi || !nuit) {
      showToast('Por favor, preencha todos os campos obrigatórios (Nome, BI, NUIT).', ToastType.ERROR);
      return;
    }

    const employee: Employee = {
      id: editingEmployee ? editingEmployee.id : getNowId('emp'),
      name,
      bi,
      nuit,
      admissionDate: formData.get('admissionDate') as string || getTodayDateString(),
      position: formData.get('position') as string || 'Colaborador',
      department: formData.get('department') as string || 'Geral',
      baseSalary,
      paymentMethodType: formData.get('paymentMethodType') as Employee['paymentMethodType'],
      bankName: formData.get('bankName') as string || undefined,
      bankAccount: formData.get('bankAccount') as string || undefined,
      isActive: formData.get('isActive') === 'true'
    };

    StorageService.saveEmployee(employee);
    setEmployees(StorageService.getEmployees());
    setIsEmployeeModalOpen(false);
    setEditingEmployee(null);
    showToast(editingEmployee ? 'Colaborador atualizado com sucesso!' : 'Colaborador cadastrado com sucesso!', ToastType.SUCCESS);
  };

  const handleDeleteEmployee = async (id: string) => {
    const conf = await confirm('Tem a certeza que deseja remover este colaborador? Todos os dados associados serão perdidos.', {
      title: 'Excluir Colaborador',
      type: 'danger',
      confirmText: 'Remover'
    });
    if (conf) {
      StorageService.deleteEmployee(id);
      setEmployees(StorageService.getEmployees());
      showToast('Colaborador removido da base de dados.', ToastType.SUCCESS);
    }
  };

  // --- Payroll Calculation logic ---
  const startPayrollProcessing = () => {
    const activeStaff = employees.filter(e => e.isActive);
    if (activeStaff.length === 0) {
      showToast('Não existem colaboradores ativos registados no sistema.', ToastType.WARNING);
      return;
    }

    // Check if payroll already exists for this period
    const existing = payrolls.find(p => p.period === payrollPeriod);
    if (existing) {
      showToast(`Já existe uma folha de salários processada ou em rascunho para ${payrollPeriod}.`, ToastType.WARNING);
    }

    // Initialize processing items
    const items: PayrollItem[] = activeStaff.map(emp => {
      const base = emp.baseSalary;
      const inssWorker = Math.round(base * 0.03 * 100) / 100; // 3%
      const inssCompany = Math.round(base * 0.04 * 100) / 100; // 4%
      return {
        employeeId: emp.id,
        employeeName: emp.name,
        baseSalary: base,
        inssWorker,
        inssCompany,
        subsidies: [],
        otherDeductions: [],
        netSalary: base - inssWorker
      };
    });

    setProcessingItems(items);
    setIsProcessing(true);
  };

  const openLineItemsEditor = (idx: number) => {
    setEditingItemIdx(idx);
    setTempSubsidies([...processingItems[idx].subsidies]);
    setTempDeductions([...processingItems[idx].otherDeductions]);
    setNewSubName('');
    setNewSubAmount('');
    setNewDedName('');
    setNewDedAmount('');
  };

  const handleAddSubsidy = () => {
    if (!newSubName || !newSubAmount) return;
    setTempSubsidies(prev => [
      ...prev, 
      { id: getNowIdWithRandom('sub'), name: newSubName, amount: parseFloat(newSubAmount) }
    ]);
    setNewSubName('');
    setNewSubAmount('');
  };

  const handleRemoveSubsidy = (id: string) => {
    setTempSubsidies(prev => prev.filter(s => s.id !== id));
  };

  const handleAddDeduction = () => {
    if (!newDedName || !newDedAmount) return;
    setTempDeductions(prev => [
      ...prev, 
      { id: getNowIdWithRandom('ded'), name: newDedName, amount: parseFloat(newDedAmount) }
    ]);
    setNewDedName('');
    setNewDedAmount('');
  };

  const handleRemoveDeduction = (id: string) => {
    setTempDeductions(prev => prev.filter(d => d.id !== id));
  };

  const saveLineItems = () => {
    if (editingItemIdx === null) return;
    const items = [...processingItems];
    const item = items[editingItemIdx];

    const totalSubsidies = tempSubsidies.reduce((sum, s) => sum + s.amount, 0);
    const totalDeductions = tempDeductions.reduce((sum, d) => sum + d.amount, 0);

    // netSalary = Base - INSS + Subsidies - Deductions
    const netSalary = item.baseSalary - item.inssWorker + totalSubsidies - totalDeductions;

    items[editingItemIdx] = {
      ...item,
      subsidies: tempSubsidies,
      otherDeductions: tempDeductions,
      netSalary: Math.max(0, Math.round(netSalary * 100) / 100)
    };

    setProcessingItems(items);
    setEditingItemIdx(null);
    showToast('Subsídios e descontos atualizados temporariamente na folha.', ToastType.SUCCESS);
  };

  const finalizePayroll = () => {
    if (processingItems.length === 0) return;

    // Calculate totals
    const totalBaseSalary = processingItems.reduce((sum, item) => sum + item.baseSalary, 0);
    const totalInssWorker = processingItems.reduce((sum, item) => sum + item.inssWorker, 0);
    const totalInssCompany = processingItems.reduce((sum, item) => sum + item.inssCompany, 0);
    const totalSubsidies = processingItems.reduce((sum, item) => {
      return sum + item.subsidies.reduce((sSum, s) => sSum + s.amount, 0);
    }, 0);
    const totalDeductions = processingItems.reduce((sum, item) => {
      return sum + item.otherDeductions.reduce((dSum, d) => dSum + d.amount, 0);
    }, 0);
    const totalNetSalary = processingItems.reduce((sum, item) => sum + item.netSalary, 0);

    const newPayroll: Payroll = {
      id: getNowId('pay'),
      period: payrollPeriod,
      createdAt: getTodayDateString(),
      status: 'APPROVED', // Saved straight as approved for payments
      items: processingItems,
      totalBaseSalary,
      totalInssWorker,
      totalInssCompany,
      totalSubsidies,
      totalDeductions,
      totalNetSalary
    };

    StorageService.savePayroll(newPayroll);
    setPayrolls(StorageService.getPayrolls());
    setIsProcessing(false);
    setProcessingItems([]);
    showToast(`Folha de salários para ${payrollPeriod} processada e aprovada com sucesso!`, ToastType.SUCCESS);
  };

  const handleDeletePayroll = async (id: string) => {
    const payroll = payrolls.find(p => p.id === id);
    if (!payroll) return;
    if (payroll.status === 'PAID') {
      showToast('Não é possível excluir uma folha de salários que já foi paga.', ToastType.ERROR);
      return;
    }

    const conf = await confirm(`Tem a certeza que deseja excluir o processamento de ${payroll.period}?`, {
      title: 'Excluir Processamento',
      type: 'danger',
      confirmText: 'Excluir'
    });
    if (conf) {
      StorageService.deletePayroll(id);
      setPayrolls(StorageService.getPayrolls());
      showToast('Folha de salários excluída.', ToastType.SUCCESS);
    }
  };

  // --- Payment Execution and Treasury Integration ---
  const openPaymentModal = (payroll: Payroll) => {
    setSelectedPayrollToPay(payroll);
    setSelectedWalletId(wallets[0]?.id || '');
    setIsPaymentModalOpen(true);
  };

  const handleExecutePayment = () => {
    if (!selectedPayrollToPay) return;
    if (!selectedWalletId) {
      showToast('Por favor, selecione uma conta de tesouraria para realizar o pagamento.', ToastType.ERROR);
      return;
    }

    const wallet = wallets.find(w => w.id === selectedWalletId);
    if (!wallet) return;

    if (wallet.balance < selectedPayrollToPay.totalNetSalary) {
      showToast(`Saldo insuficiente na conta ${wallet.name} (Saldo: ${wallet.balance.toFixed(2)} MT | Necessário: ${selectedPayrollToPay.totalNetSalary.toFixed(2)} MT).`, ToastType.ERROR);
      return;
    }

    // 1. Mark payroll as PAID
    const updatedPayroll: Payroll = {
      ...selectedPayrollToPay,
      status: 'PAID'
    };
    StorageService.savePayroll(updatedPayroll);

    // 2. Create PayrollPayment record
    const newPayment: PayrollPayment = {
      id: getNowId('pmp'),
      payrollId: selectedPayrollToPay.id,
      payrollPeriod: selectedPayrollToPay.period,
      date: getTodayDateString(),
      totalAmount: selectedPayrollToPay.totalNetSalary,
      walletId: selectedWalletId,
      walletName: wallet.name,
      status: 'SUCCESS',
      paymentFileName: `PAGAMENTO_SALARIOS_${selectedPayrollToPay.period.replace('-', '_')}.txt`,
      paymentFileContent: generateStandardBankPaymentFile(selectedPayrollToPay)
    };
    StorageService.savePayrollPayment(newPayment);

    // 3. Integrate with Treasury: Deduct wallet balance and log cash transaction (EXPENSE)
    // We adjust the wallet balance directly
    const updatedWallet = {
      ...wallet,
      balance: wallet.balance - selectedPayrollToPay.totalNetSalary
    };
    StorageService.saveWallet(updatedWallet);

    // Log the transaction
    StorageService.saveTransaction({
      id: getNowId('tx-rh'),
      date: getTodayDateString(),
      description: `Folha de Salários - Período ${selectedPayrollToPay.period} (${selectedPayrollToPay.items.length} Colaboradores)`,
      amount: selectedPayrollToPay.totalNetSalary,
      type: 'EXPENSE',
      category: 'Salários / Pessoal',
      status: 'PAID',
      walletId: selectedWalletId,
      userId: currentUser?.id,
      method: wallet.type === 'BANK' ? 'TRANSFER' : 'CASH'
    });

    // Refresh state
    setPayrolls(StorageService.getPayrolls());
    setPayments(StorageService.getPayrollPayments());
    setIsPaymentModalOpen(false);
    setSelectedPayrollToPay(null);
    showToast(`Pagamento processado com sucesso! Os fundos foram deduzidos da conta ${wallet.name} e integrados na Tesouraria.`, ToastType.SUCCESS);
  };

  // Standard Bank / Millennium BIM Export text format
  const generateStandardBankPaymentFile = (payroll: Payroll): string => {
    let content = `Ficheiro de Pagamento de Salarios - Periodo: ${payroll.period}\n`;
    content += `Emitido em: ${new Date().toLocaleDateString('pt-MZ')} | Total: ${payroll.totalNetSalary.toFixed(2)} MT\n`;
    content += `========================================================================================\n`;
    content += `NOME_COLABORADOR;BI;NUIT;METODO_PAGAMENTO;BANCO_CARTEIRA;CONTA_TELEFONE;VALOR_LIQUIDO_MT\n`;
    content += `========================================================================================\n`;

    payroll.items.forEach(item => {
      const emp = employees.find(e => e.id === item.employeeId);
      const method = emp?.paymentMethodType || 'BANK';
      const bank = emp?.bankName || 'N/A';
      const acc = emp?.bankAccount || 'N/A';
      content += `${item.employeeName};${emp?.bi || 'N/A'};${emp?.nuit || 'N/A'};${method};${bank};${acc};${item.netSalary.toFixed(2)}\n`;
    });

    return content;
  };

  const downloadPaymentFile = (payment: PayrollPayment) => {
    if (!payment.paymentFileContent) return;
    const blob = new Blob([payment.paymentFileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', payment.paymentFileName || 'pagamento.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Ficheiro de pagamento transferido com sucesso!', ToastType.SUCCESS);
  };

  const openReceiptModal = (payroll: Payroll, item: PayrollItem) => {
    setSelectedReceiptPayroll(payroll);
    setSelectedReceiptEmployee(item);
    setIsReceiptModalOpen(true);
  };

  const handlePrintReceipt = () => {
    if (!selectedReceiptPayroll || !selectedReceiptEmployee) return;
    const emp = employees.find(e => e.id === selectedReceiptEmployee.employeeId);
    const totalEarned = selectedReceiptEmployee.baseSalary + selectedReceiptEmployee.subsidies.reduce((sum, s) => sum + s.amount, 0);
    const totalDeducted = selectedReceiptEmployee.inssWorker + selectedReceiptEmployee.otherDeductions.reduce((sum, d) => sum + d.amount, 0);

    const html = `
      <html>
        <head>
          <title>Recibo de Vencimento - ${selectedReceiptEmployee.employeeName}</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; border-b: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
            .company-name { font-size: 24px; font-weight: bold; }
            .title { font-size: 20px; text-transform: uppercase; font-weight: bold; text-align: center; margin: 20px 0; }
            .grid-info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; }
            .info-label { font-weight: bold; color: #666; font-size: 12px; }
            .info-val { font-size: 14px; margin-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #333; color: white; text-align: left; padding: 10px; font-size: 12px; }
            td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 14px; }
            .totals { display: flex; justify-content: flex-end; margin-bottom: 40px; }
            .totals-box { width: 300px; background: #f3f4f6; padding: 15px; border-radius: 8px; }
            .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
            .net-pay { font-size: 18px; font-weight: bold; color: #1e3a8a; border-top: 1px solid #ccc; padding-top: 8px; margin-top: 8px; }
            .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 60px; text-align: center; }
            .sig-line { border-top: 1px solid #333; margin-top: 40px; padding-top: 10px; font-size: 12px; }
            .watermark { text-align: center; font-size: 10px; color: #999; margin-top: 40px; letter-spacing: 1px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="company-name">${config.companyName}</div>
              <div style="font-size: 12px; color: #666; margin-top: 4px;">NUIT: ${config.nif}</div>
              <div style="font-size: 12px; color: #666;">${config.companyAddress || 'Moçambique'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-weight: bold;">RECIBO DE VENCIMENTO</div>
              <div style="font-size: 14px; margin-top: 4px;">Período: ${selectedReceiptPayroll.period}</div>
              <div style="font-size: 12px; color: #666;">Emitido em: ${new Date().toLocaleDateString('pt-MZ')}</div>
            </div>
          </div>

          <div class="grid-info">
            <div>
              <div class="info-label">COLABORADOR</div>
              <div class="info-val" style="font-weight: bold;">${selectedReceiptEmployee.employeeName}</div>
              <div class="info-label">BI / DOCUMENTO</div>
              <div class="info-val">${emp?.bi || 'N/A'}</div>
              <div class="info-label">NUIT</div>
              <div class="info-val">${emp?.nuit || 'N/A'}</div>
            </div>
            <div>
              <div class="info-label">CARGO / POSIÇÃO</div>
              <div class="info-val">${emp?.position || 'N/A'}</div>
              <div class="info-label">DATA DE ADMISSÃO</div>
              <div class="info-val">${emp?.admissionDate || 'N/A'}</div>
              <div class="info-label">FORMA DE PAGAMENTO</div>
              <div class="info-val">${emp?.paymentMethodType} (${emp?.bankName || 'N/A'} - ${emp?.bankAccount || 'N/A'})</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>CÓDIGO / DESCRIÇÃO</th>
                <th style="text-align: right;">PROVENTOS (MT)</th>
                <th style="text-align: right;">DESCONTOS (MT)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Salário Base do Cargo</td>
                <td style="text-align: right;">${selectedReceiptEmployee.baseSalary.toFixed(2)}</td>
                <td style="text-align: right;">-</td>
              </tr>
              <tr>
                <td>Segurança Social Moçambicana (INSS - 3%)</td>
                <td style="text-align: right;">-</td>
                <td style="text-align: right; color: #dc2626;">${selectedReceiptEmployee.inssWorker.toFixed(2)}</td>
              </tr>
              ${selectedReceiptEmployee.subsidies.map(s => `
                <tr>
                  <td>${s.name} (Subsídio)</td>
                  <td style="text-align: right;">${s.amount.toFixed(2)}</td>
                  <td style="text-align: right;">-</td>
                </tr>
              `).join('')}
              ${selectedReceiptEmployee.otherDeductions.map(d => `
                <tr>
                  <td>${d.name} (Desconto)</td>
                  <td style="text-align: right;">-</td>
                  <td style="text-align: right; color: #dc2626;">${d.amount.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals">
            <div class="totals-box">
              <div class="total-row">
                <span class="info-label">TOTAL PROVENTOS</span>
                <span>${totalEarned.toFixed(2)} MT</span>
              </div>
              <div class="total-row">
                <span class="info-label">TOTAL DESCONTOS</span>
                <span>${totalDeducted.toFixed(2)} MT</span>
              </div>
              <div class="total-row net-pay">
                <span>LÍQUIDO A RECEBER</span>
                <span>${selectedReceiptEmployee.netSalary.toFixed(2)} MT</span>
              </div>
            </div>
          </div>

          <div class="signatures">
            <div class="sig-line">A Entidade Empregadora<br/><br/><strong>${config.companyName}</strong></div>
            <div class="sig-line">O Colaborador<br/><br/><strong>${selectedReceiptEmployee.employeeName}</strong></div>
          </div>

          <div class="watermark">
            ASSINATURA DIGITAL VALIDADA VIA SISTEMA ERP PRO | ESTADO DO DOCUMENTO: PAGO E CONCILIADO
          </div>
        </body>
      </html>
    `;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Briefcase className="text-blue-600 shrink-0" />
            Recursos Humanos (RH) e Salários
          </h1>
          <p className="text-gray-500 text-sm">Gestão de colaboradores, processamento de folhas salariais (INSS) e pagamentos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === 'employees' && (
            <button 
              onClick={() => openEmployeeModal()}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 font-bold text-sm w-full sm:w-auto"
            >
              <UserPlus size={18} /> Novo Colaborador
            </button>
          )}
          {activeTab === 'payroll' && !isProcessing && (
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
              <input 
                type="month" 
                value={payrollPeriod}
                onChange={(e) => setPayrollPeriod(e.target.value)}
                className="bg-transparent text-sm font-semibold outline-none px-2 text-gray-700 dark:text-gray-200"
              />
              <button 
                onClick={startPayrollProcessing}
                className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg transition-colors font-bold text-xs"
              >
                <TrendingUp size={14} /> Processar Folha
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tab Contents */}

      {/* TAB 1: EMPLOYEES LIST */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar por nome, BI, NUIT ou cargo..." 
                value={employeeSearch}
                onChange={(e) => setEmployeeSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">Todos os Departamentos</option>
              {departments.filter(d => d !== 'ALL').map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          {filteredEmployees.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-12 text-center rounded-xl border border-gray-200 dark:border-gray-700">
              <Users size={48} className="text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">Nenhum colaborador encontrado.</p>
              {employeeSearch && (
                <button onClick={() => setEmployeeSearch('')} className="text-blue-600 text-xs font-semibold mt-1">Limpar filtros</button>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-6 py-4">Colaborador</th>
                      <th className="px-6 py-4">BI & NUIT</th>
                      <th className="px-6 py-4">Cargo / Dept</th>
                      <th className="px-6 py-4">Data Admissão</th>
                      <th className="px-6 py-4">Salário Base</th>
                      <th className="px-6 py-4">Método Pagamento</th>
                      <th className="px-6 py-4 text-center">Estado</th>
                      <th className="px-6 py-4 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    {paginatedEmployees.map(emp => (
                      <tr key={emp.id} className="hover:bg-gray-50/55 dark:hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{emp.name}</td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-xs">BI: {emp.bi}</div>
                          <div className="text-gray-400 text-xs">NUIT: {emp.nuit}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div>{emp.position}</div>
                          <span className="inline-block text-[11px] font-bold bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full mt-0.5">{emp.department}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs">{emp.admissionDate}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white">{emp.baseSalary.toLocaleString('pt-MZ')} MT</td>
                        <td className="px-6 py-4">
                          <div className="text-xs font-semibold uppercase">{emp.paymentMethodType}</div>
                          {emp.bankName && <div className="text-[11px] text-gray-400">{emp.bankName} - {emp.bankAccount}</div>}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-lg ${emp.isActive ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                            {emp.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEmployeeModal(emp)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-blue-600 transition-colors">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-red-600 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls for Employee list */}
              <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Mostrando {paginatedEmployees.length} de {filteredEmployees.length} registos</span>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setEmployeesPage(p => Math.max(1, p - 1))} 
                    disabled={activeEmployeesPage === 1} 
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronLeft size={16}/>
                  </button>
                  <span className="font-medium px-2">Pág. {activeEmployeesPage} / {totalEmployeesPages || 1}</span>
                  <button 
                    onClick={() => setEmployeesPage(p => Math.min(totalEmployeesPages, p + 1))} 
                    disabled={activeEmployeesPage === totalEmployeesPages} 
                    className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <ChevronRight size={16}/>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PAYROLL RUN */}
      {activeTab === 'payroll' && (
        <div className="space-y-6">
          {isProcessing ? (
            /* ACTIVE PAYROLL PROCESSING SCREEN */
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Processando Período: {payrollPeriod}</h2>
                  <p className="text-xs text-gray-500">Adicione subsídios e descontos ocasionais individualmente antes de aprovar a folha.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => setIsProcessing(false)} 
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 flex-1 sm:flex-none"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={finalizePayroll} 
                    className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold shadow-md shadow-green-500/10 flex-1 sm:flex-none"
                  >
                    Finalizar & Aprovar Folha
                  </button>
                </div>
              </div>

              {/* Live Processing Table */}
              <div className="overflow-x-auto border border-gray-150 dark:border-gray-700 rounded-lg">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-500 uppercase tracking-wider">
                      <th className="px-4 py-3">Colaborador</th>
                      <th className="px-4 py-3 text-right">Salário Base</th>
                      <th className="px-4 py-3 text-right">INSS Trab. (3%)</th>
                      <th className="px-4 py-3 text-right">INSS Emp. (4%)</th>
                      <th className="px-4 py-3 text-right">Subsídios</th>
                      <th className="px-4 py-3 text-right">Descontos</th>
                      <th className="px-4 py-3 text-right">Líquido a Receber</th>
                      <th className="px-4 py-3 text-center">Editar Linhas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150 dark:divide-gray-700 text-sm text-gray-700 dark:text-gray-300">
                    {processingItems.map((item, idx) => {
                      const subsSum = item.subsidies.reduce((sum, s) => sum + s.amount, 0);
                      const dedsSum = item.otherDeductions.reduce((sum, d) => sum + d.amount, 0);
                      return (
                        <tr key={item.employeeId} className="hover:bg-gray-50/40">
                          <td className="px-4 py-3.5 font-semibold text-gray-900 dark:text-white">{item.employeeName}</td>
                          <td className="px-4 py-3.5 text-right font-mono text-xs">{item.baseSalary.toLocaleString('pt-MZ')} MT</td>
                          <td className="px-4 py-3.5 text-right font-mono text-xs text-red-600">-{item.inssWorker.toLocaleString('pt-MZ')} MT</td>
                          <td className="px-4 py-3.5 text-right font-mono text-xs text-amber-600">{item.inssCompany.toLocaleString('pt-MZ')} MT</td>
                          <td className="px-4 py-3.5 text-right font-mono text-xs text-green-600">
                            {subsSum > 0 ? `+${subsSum.toLocaleString('pt-MZ')} MT` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-mono text-xs text-red-500">
                            {dedsSum > 0 ? `-${dedsSum.toLocaleString('pt-MZ')} MT` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-blue-600 dark:text-blue-400 font-mono text-xs">{item.netSalary.toLocaleString('pt-MZ')} MT</td>
                          <td className="px-4 py-3.5 text-center">
                            <button 
                              onClick={() => openLineItemsEditor(idx)}
                              className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-blue-50 dark:bg-gray-700 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-200 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg transition-colors font-bold"
                            >
                              Configurar Linhas
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* PAYROLL HISTORY LIST */
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                <AlertCircle className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800 dark:text-blue-300">
                  <strong className="font-semibold block mb-0.5">Regras Salariais Aplicadas (INSS Moçambique)</strong>
                  O INSS é calculado automaticamente: 3% deduzido do salário base do trabalhador e 4% de custo para a entidade empregadora. Outros subsídios e descontos podem ser agregados livremente.
                </div>
              </div>

              {payrolls.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 p-16 text-center rounded-xl border border-gray-200 dark:border-gray-700">
                  <FileSpreadsheet size={48} className="text-gray-300 mx-auto mb-3" />
                  <h3 className="text-gray-700 dark:text-gray-200 font-bold mb-1">Nenhuma folha processada</h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto mb-4">Escolha um mês na barra superior para iniciar o processamento salarial automático dos colaboradores ativos.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedPayrolls.map(pay => (
                      <div key={pay.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Folha Salarial</span>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-0.5">{pay.period}</h3>
                            <p className="text-xs text-gray-400 mt-0.5">Criada em: {pay.createdAt}</p>
                          </div>
                          <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${pay.status === 'PAID' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                            {pay.status === 'PAID' ? 'Pago' : 'Aprovado'}
                          </span>
                        </div>

                        <div className="border-t border-gray-100 dark:border-gray-700 pt-3.5 grid grid-cols-2 gap-y-2 gap-x-4 text-xs">
                          <div>
                            <div className="text-gray-400 font-medium">Colaboradores</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm mt-0.5">{pay.items.length}</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium">INSS Total (3% + 4%)</div>
                            <div className="font-bold text-gray-800 dark:text-gray-200 text-sm mt-0.5">{(pay.totalInssWorker + pay.totalInssCompany).toLocaleString('pt-MZ')} MT</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium">Subsídios/Supl.</div>
                            <div className="font-bold text-green-600 text-sm mt-0.5">+{pay.totalSubsidies.toLocaleString('pt-MZ')} MT</div>
                          </div>
                          <div>
                            <div className="text-gray-400 font-medium">Líquido Total</div>
                            <div className="font-bold text-blue-600 dark:text-blue-400 text-sm mt-0.5">{pay.totalNetSalary.toLocaleString('pt-MZ')} MT</div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                          {pay.status !== 'PAID' ? (
                            <>
                              <button 
                                onClick={() => openPaymentModal(pay)}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                              >
                                <CreditCard size={14} /> Pagar Folha
                              </button>
                              <button 
                                onClick={() => handleDeletePayroll(pay.id)}
                                className="p-2 border border-gray-200 dark:border-gray-700 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/10 rounded-lg text-gray-400 transition-colors"
                                title="Eliminar folha"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          ) : (
                            <div className="w-full py-1.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/30 font-bold text-xs rounded-lg text-center flex items-center justify-center gap-1.5">
                              <Check size={14} /> Pagamento Integrado
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination controls for Payroll list */}
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400">
                    <span className="font-medium">Mostrando {paginatedPayrolls.length} de {payrolls.length} folhas</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPayrollsPage(p => Math.max(1, p - 1))} 
                        disabled={payrollsPage === 1} 
                        className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft size={16}/>
                      </button>
                      <span className="font-medium px-2">Pág. {payrollsPage} / {totalPayrollsPages || 1}</span>
                      <button 
                        onClick={() => setPayrollsPage(p => Math.min(totalPayrollsPages, p + 1))} 
                        disabled={payrollsPage === totalPayrollsPages} 
                        className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PAYMENTS & RECEIPTS */}
      {activeTab === 'payments' && (
        <div className="space-y-6">
          {payments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 p-16 text-center rounded-xl border border-gray-200 dark:border-gray-700">
              <Wallet size={48} className="text-gray-300 mx-auto mb-3" />
              <h3 className="text-gray-700 dark:text-gray-200 font-bold mb-1">Nenhum pagamento efetuado</h3>
              <p className="text-gray-500 text-sm max-w-sm mx-auto">Vá para a aba de &quot;Processamento de Folhas&quot; e clique em &quot;Pagar Folha&quot; para conciliar os vencimentos com o saldo de tesouraria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Payment History Log */}
              <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CreditCard size={18} className="text-blue-600" /> Histórico de Pagamentos e Conciliações
                </h3>

                <div className="space-y-3">
                  {paginatedPayments.map(pmp => (
                    <div key={pmp.id} className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-gray-150 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 dark:text-white">Período {pmp.payrollPeriod}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-bold bg-green-100 text-green-800 rounded">SUCESSO</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 flex flex-wrap gap-x-4">
                          <span>Data: {pmp.date}</span>
                          <span>Conta: {pmp.walletName || 'N/A'}</span>
                        </div>
                      </div>

                      <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => downloadPaymentFile(pmp)}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg text-xs transition-colors flex-1 sm:flex-none"
                        >
                          <Download size={12} /> Exportar Banco
                        </button>
                        <button 
                          onClick={() => {
                            const pay = payrolls.find(prl => prl.id === pmp.payrollId);
                            if (pay && pay.items.length > 0) {
                              openReceiptModal(pay, pay.items[0]);
                            } else {
                              showToast('Não foi possível carregar o detalhe desta folha.', ToastType.ERROR);
                            }
                          }}
                          className="flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors flex-1 sm:flex-none"
                        >
                          <FileText size={12} /> Emitir Recibos
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Pagination controls for Payments list */}
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-150 dark:border-gray-700 flex justify-between items-center text-xs text-gray-600 dark:text-gray-400 mt-4">
                    <span className="font-medium">Mostrando {paginatedPayments.length} de {payments.length} registos</span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setPaymentsPage(p => Math.max(1, p - 1))} 
                        disabled={paymentsPage === 1} 
                        className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronLeft size={16}/>
                      </button>
                      <span className="font-medium px-2">Pág. {paymentsPage} / {totalPaymentsPages || 1}</span>
                      <button 
                        onClick={() => setPaymentsPage(p => Math.min(totalPaymentsPages, p + 1))} 
                        disabled={paymentsPage === totalPaymentsPages} 
                        className="p-1.5 border border-gray-200 dark:border-gray-700 rounded disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <ChevronRight size={16}/>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Card: Bank Export Instructions */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm space-y-4 h-fit">
                <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 mb-2">
                  <FileSpreadsheet size={20} />
                </div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white">Ficheiro de Pagamentos de Salários</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Ao exportar o ficheiro para o banco, o sistema ERP Pro cria uma lista de remunerações líquidas em formato padronizado com BI, NUIT e coordenadas bancárias dos colaboradores ativos, pronta para ser importada no Home Banking do Standard Bank ou Millennium BIM em Moçambique.
                </p>
                <div className="p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg text-[11px] font-mono text-gray-600 dark:text-gray-400 border border-gray-200/50">
                  Formato de saída:<br/>
                  NOME;BI;NUIT;METODO_PAG;CONTA;VALOR
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL 1: ADD/EDIT EMPLOYEE */}
      {isEmployeeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative max-w-lg w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setIsEmployeeModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
              {editingEmployee ? 'Editar Ficha do Colaborador' : 'Registo Centralizado de Colaborador'}
            </h2>

            <form onSubmit={handleSaveEmployee} className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome Completo *</label>
                  <input 
                    type="text" 
                    name="name"
                    required
                    defaultValue={editingEmployee?.name || ''}
                    placeholder="Nome Completo"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Data de Admissão *</label>
                  <input 
                    type="date" 
                    name="admissionDate"
                    required
                    defaultValue={editingEmployee?.admissionDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">BI (Bilhete de Identidade) *</label>
                  <input 
                    type="text" 
                    name="bi"
                    required
                    defaultValue={editingEmployee?.bi || ''}
                    placeholder="E.g., 010203040506A"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">NUIT *</label>
                  <input 
                    type="text" 
                    name="nuit"
                    required
                    defaultValue={editingEmployee?.nuit || ''}
                    placeholder="E.g., 123456789"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Cargo / Posição</label>
                  <input 
                    type="text" 
                    name="position"
                    defaultValue={editingEmployee?.position || ''}
                    placeholder="E.g., Operadora de Caixa"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Departamento</label>
                  <input 
                    type="text" 
                    name="department"
                    defaultValue={editingEmployee?.department || ''}
                    placeholder="E.g., Operações"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Salário Base (MT) *</label>
                  <input 
                    type="number" 
                    name="baseSalary"
                    required
                    min="0"
                    step="0.01"
                    defaultValue={editingEmployee?.baseSalary || ''}
                    placeholder="E.g., 18000"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Estado</label>
                  <select
                    name="isActive"
                    defaultValue={editingEmployee?.isActive === false ? 'false' : 'true'}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="true">Ativo</option>
                    <option value="false">Inativo</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-3 space-y-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dados de Pagamento (Moçambique)</h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Método *</label>
                    <select
                      name="paymentMethodType"
                      defaultValue={editingEmployee?.paymentMethodType || 'BANK'}
                      className="w-full px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    >
                      <option value="BANK">Banco (BIM/Standard)</option>
                      <option value="M_PESA">M-Pesa</option>
                      <option value="E_MOLA">e-Mola</option>
                      <option value="MKESH">mKesh</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Nome do Banco</label>
                    <input 
                      type="text" 
                      name="bankName"
                      defaultValue={editingEmployee?.bankName || ''}
                      placeholder="E.g., Standard Bank"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Conta ou N° Carteira *</label>
                    <input 
                      type="text" 
                      name="bankAccount"
                      defaultValue={editingEmployee?.bankAccount || ''}
                      placeholder="Conta bancária / Celular"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsEmployeeModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold shadow-md shadow-blue-500/10"
                >
                  Gravar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIGURE SUBSIDIES & DEDUCTIONS FOR PROCESSING ITEM */}
      {editingItemIdx !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative max-w-xl w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex flex-col max-h-[90vh] overflow-y-auto">
            <button 
              onClick={() => setEditingItemIdx(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              Subsídios e Descontos Ocasioneis
            </h2>
            <p className="text-xs text-gray-500 mb-4">Adicionando linhas personalizadas de proventos ou abatimentos para o colaborador: <strong>{processingItems[editingItemIdx].employeeName}</strong>.</p>

            <div className="space-y-6 text-sm">
              {/* Subsídios (Proventos) Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-green-600 uppercase tracking-wider flex items-center gap-1">
                  <Plus size={14} /> Subsídios & Suplementos
                </h3>
                
                {/* Form to add subsidy */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Descrição (e.g., Alimentação, Bónus)" 
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none"
                  />
                  <input 
                    type="number" 
                    placeholder="Valor (MT)" 
                    value={newSubAmount}
                    onChange={(e) => setNewSubAmount(e.target.value)}
                    className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none font-semibold text-green-600"
                  />
                  <button 
                    onClick={handleAddSubsidy}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-lg"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Added Subsidies list */}
                {tempSubsidies.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum subsídio adicionado.</p>
                ) : (
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-250/30">
                    {tempSubsidies.map(s => (
                      <div key={s.id} className="flex justify-between items-center text-xs py-1 px-2 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-green-600">+{s.amount.toFixed(2)} MT</span>
                          <button onClick={() => handleRemoveSubsidy(s.id)} className="text-gray-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Outros Descontos Section */}
              <div className="space-y-3 border-t border-gray-100 dark:border-gray-700 pt-4">
                <h3 className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
                  <X size={14} /> Outros Descontos
                </h3>
                
                {/* Form to add deduction */}
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Descrição (e.g., Faltas, Adiantamentos)" 
                    value={newDedName}
                    onChange={(e) => setNewDedName(e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none"
                  />
                  <input 
                    type="number" 
                    placeholder="Valor (MT)" 
                    value={newDedAmount}
                    onChange={(e) => setNewDedAmount(e.target.value)}
                    className="w-24 px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-xs text-gray-900 dark:text-white outline-none font-semibold text-red-500"
                  />
                  <button 
                    onClick={handleAddDeduction}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg"
                  >
                    Adicionar
                  </button>
                </div>

                {/* Added Deductions list */}
                {tempDeductions.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Nenhum desconto ocasional adicionado.</p>
                ) : (
                  <div className="space-y-1 bg-gray-50 dark:bg-gray-800/40 p-2 rounded-lg border border-gray-250/30">
                    {tempDeductions.map(d => (
                      <div key={d.id} className="flex justify-between items-center text-xs py-1 px-2 hover:bg-white dark:hover:bg-gray-700 rounded transition-colors">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{d.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-red-500">-{d.amount.toFixed(2)} MT</span>
                          <button onClick={() => handleRemoveDeduction(d.id)} className="text-gray-400 hover:text-red-500">
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setEditingItemIdx(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={saveLineItems}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirmar & Recalcular
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: PAYROLL TREASURY PAYMENT CONCILIATION */}
      {isPaymentModalOpen && selectedPayrollToPay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex flex-col">
            <button 
              onClick={() => setIsPaymentModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Banknote className="text-blue-600" /> Executar Pagamento Financeiro
            </h2>
            <p className="text-xs text-gray-500 mb-4">Escolha uma conta bancária ou de caixa para efetuar a liquidação da folha de salários do período: <strong>{selectedPayrollToPay.period}</strong>.</p>

            <div className="space-y-4 text-sm">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/30">
                <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">TOTAL SALÁRIOS LÍQUIDOS</div>
                <div className="text-2xl font-black text-blue-600 dark:text-blue-400 font-mono">
                  {selectedPayrollToPay.totalNetSalary.toLocaleString('pt-MZ')} MT
                </div>
                <div className="text-[10px] text-gray-400 mt-1">Conciliação automática integrada na Tesouraria e Despesas.</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Selecionar Conta Originadora</label>
                <select
                  value={selectedWalletId}
                  onChange={(e) => setSelectedWalletId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="" disabled>Selecione uma conta...</option>
                  {wallets.map(w => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.type}) - Saldo: {w.balance.toLocaleString('pt-MZ')} MT
                    </option>
                  ))}
                </select>
                {wallets.length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Nenhuma conta bancária ou carteira móvel ativa na Tesouraria para efetuar o pagamento.</p>
                )}
              </div>

              <div className="flex gap-2 justify-end pt-4 border-t border-gray-100 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button 
                  type="button"
                  onClick={handleExecutePayment}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: INDIVIDUAL PAYSLIP RECIPIENT SELECTOR / PRINTER */}
      {isReceiptModalOpen && selectedReceiptPayroll && selectedReceiptEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="relative max-w-4xl w-full bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 flex flex-col h-[90vh]">
            <button 
              onClick={() => setIsReceiptModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-1 flex items-center gap-1.5">
              <FileText size={20} className="text-blue-600" /> Emissão de Recibos de Vencimento
            </h2>
            <p className="text-xs text-gray-500 mb-4">Escolha um colaborador para visualizar e imprimir o recibo de remuneração oficial.</p>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
              {/* Left Selector column */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-y-auto p-3 space-y-2 max-h-[60vh] md:max-h-full">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Lista de Colaboradores</div>
                {selectedReceiptPayroll.items.map(item => (
                  <button
                    key={item.employeeId}
                    onClick={() => setSelectedReceiptEmployee(item)}
                    className={`w-full text-left p-2.5 rounded-lg text-xs transition-all flex items-center justify-between ${selectedReceiptEmployee.employeeId === item.employeeId ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 font-bold border-l-4 border-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                  >
                    <span className="truncate pr-2">{item.employeeName}</span>
                    <span className="font-mono text-gray-500">{item.netSalary.toLocaleString('pt-MZ')} MT</span>
                  </button>
                ))}
              </div>

              {/* Right Live Preview Column */}
              <div className="md:col-span-2 border border-gray-200 dark:border-gray-700 rounded-xl p-6 overflow-y-auto bg-gray-50/50 dark:bg-gray-950/20 flex flex-col justify-between max-h-[60vh] md:max-h-full">
                {/* Payslip preview body */}
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex justify-between items-start border-b border-gray-200 dark:border-gray-700 pb-4">
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white text-base">{config.companyName}</h4>
                      <p className="text-[11px] text-gray-500">NUIT: {config.nif}</p>
                      <p className="text-[11px] text-gray-500">{config.companyAddress || 'Moçambique'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded uppercase">PAGO</span>
                      <h5 className="font-bold text-xs text-gray-900 dark:text-white mt-1.5">RECIBO DE VENCIMENTO</h5>
                      <p className="text-[11px] text-gray-500">Período: {selectedReceiptPayroll.period}</p>
                    </div>
                  </div>

                  {/* Employee Details Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-white dark:bg-gray-800/60 p-3 rounded-lg border border-gray-150 text-[11px]">
                    <div>
                      <div className="text-gray-400 font-medium">COLABORADOR</div>
                      <div className="font-bold text-gray-900 dark:text-white text-xs">{selectedReceiptEmployee.employeeName}</div>
                      <div className="text-gray-400 font-medium mt-2">BI / DOCUMENTO</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {employees.find(e => e.id === selectedReceiptEmployee.employeeId)?.bi || 'N/A'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 font-medium">CARGO / POSIÇÃO</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {employees.find(e => e.id === selectedReceiptEmployee.employeeId)?.position || 'N/A'}
                      </div>
                      <div className="text-gray-400 font-medium mt-2">N° NUIT</div>
                      <div className="font-semibold text-gray-800 dark:text-gray-200">
                        {employees.find(e => e.id === selectedReceiptEmployee.employeeId)?.nuit || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {/* Calculations breakdown table */}
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase">
                        <th className="py-2">Descrição</th>
                        <th className="py-2 text-right">Proventos (MT)</th>
                        <th className="py-2 text-right">Descontos (MT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-gray-700 dark:text-gray-300">
                      <tr>
                        <td className="py-2.5">Salário Base</td>
                        <td className="py-2.5 text-right font-mono">{selectedReceiptEmployee.baseSalary.toFixed(2)}</td>
                        <td className="py-2.5 text-right font-mono">-</td>
                      </tr>
                      <tr>
                        <td className="py-2.5">INSS Trabalhador (3%)</td>
                        <td className="py-2.5 text-right font-mono">-</td>
                        <td className="py-2.5 text-right font-mono text-red-500">-{selectedReceiptEmployee.inssWorker.toFixed(2)}</td>
                      </tr>
                      {selectedReceiptEmployee.subsidies.map(s => (
                        <tr key={s.id}>
                          <td className="py-2.5">{s.name} (Subsídio)</td>
                          <td className="py-2.5 text-right font-mono text-green-600">+{s.amount.toFixed(2)}</td>
                          <td className="py-2.5 text-right font-mono">-</td>
                        </tr>
                      ))}
                      {selectedReceiptEmployee.otherDeductions.map(d => (
                        <tr key={d.id}>
                          <td className="py-2.5">{d.name} (Desconto)</td>
                          <td className="py-2.5 text-right font-mono">-</td>
                          <td className="py-2.5 text-right font-mono text-red-500">-{d.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals Summary */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-1.5 text-xs border-t border-gray-200 dark:border-gray-700 pt-3">
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-400">Total Proventos:</span>
                        <span className="font-mono">{(selectedReceiptEmployee.baseSalary + selectedReceiptEmployee.subsidies.reduce((sum, s) => sum + s.amount, 0)).toFixed(2)} MT</span>
                      </div>
                      <div className="flex justify-between font-medium">
                        <span className="text-gray-400">Total Descontos:</span>
                        <span className="font-mono text-red-500">{(selectedReceiptEmployee.inssWorker + selectedReceiptEmployee.otherDeductions.reduce((sum, d) => sum + d.amount, 0)).toFixed(2)} MT</span>
                      </div>
                      <div className="flex justify-between font-bold text-sm text-blue-600 dark:text-blue-400 border-t border-dashed border-gray-200 dark:border-gray-700 pt-2">
                        <span>Líquido a Receber:</span>
                        <span className="font-mono">{selectedReceiptEmployee.netSalary.toFixed(2)} MT</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-4 border-t border-gray-150 dark:border-gray-700 mt-6">
                  <button 
                    type="button" 
                    onClick={() => setIsReceiptModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50"
                  >
                    Fechar
                  </button>
                  <button 
                    type="button"
                    onClick={handlePrintReceipt}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/10"
                  >
                    <Printer size={14} /> Imprimir Recibo
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecursosHumanos;
