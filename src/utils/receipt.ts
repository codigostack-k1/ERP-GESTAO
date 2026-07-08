
import { AppConfig, Sale, User, CashSession, Transaction, Wallet, Customer, Requisition, Supplier, StockAudit, Product, StockEntry, StockExit, UserLog } from '../types';

/**
 * Utilitários de formatação para os documentos
 */
const formatM = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT');
const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

/**
 * Modelo de Documento Padrão (A4)
 * Utilizado pelos módulos de Tesouraria, Gestão de Vendas e Gestão de Armazém.
 */
export const generateStandardDocumentHtml = (options: {
    title: string;
    config: AppConfig;
    user?: User;
    content: string;
    metadata?: string;
    date?: string;
    pageInfo?: string;
}) => {
    const { 
        title, 
        config, 
        user, 
        content, 
        metadata = 'Original', 
        date = new Date().toISOString(),
        pageInfo = '1/1'
    } = options;
    
    return `
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page { size: A4; margin: 15mm; }
            body { 
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                color: #1e293b; 
                line-height: 1.5; 
                font-size: 10pt; 
                margin: 0; 
                padding: 0; 
                background: #fff;
            }
            .standard-container { width: 100%; }
            
            /* Cabeçalho */
            .header { 
                display: flex; 
                justify-content: space-between; 
                align-items: flex-start; 
                border-bottom: 2px solid #2563eb; 
                padding-bottom: 15px; 
                margin-bottom: 20px; 
            }
            .header-left { display: flex; align-items: center; gap: 15px; }
            .company-logo { max-width: 120px; max-height: 60px; object-fit: contain; }
            .company-info h1 { margin: 0; font-size: 16pt; color: #1e3a8a; text-transform: uppercase; font-weight: 900; letter-spacing: -0.02em; }
            .company-info p { margin: 1px 0; font-size: 8.5pt; color: #64748b; font-weight: 600; }
            
            .doc-title-container { text-align: right; }
            .doc-title-container h2 { 
                margin: 0; 
                font-size: 16pt; 
                color: #2563eb; 
                font-weight: 900; 
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }
            
            /* Metadados */
            .meta-section { 
                display: grid; 
                grid-template-columns: repeat(4, 1fr); 
                border-top: 1px solid #e2e8f0; 
                border-bottom: 1px solid #e2e8f0; 
                padding: 8px 0;
                margin-bottom: 25px;
                background: #f8fafc;
            }
            .meta-item { text-align: center; border-right: 1px solid #e2e8f0; }
            .meta-item:last-child { border-right: none; }
            .meta-label { font-weight: 800; display: block; text-transform: uppercase; font-size: 6.5pt; color: #64748b; margin-bottom: 1px; }
            .meta-value { font-weight: 700; color: #1e293b; font-size: 9pt; }

            /* Conteúdo */
            .content-area { min-height: 150mm; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f1f5f9; color: #475569; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; vertical-align: middle; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .font-bold { font-weight: bold; }
            
            /* Rodapé */
            .footer { 
                margin-top: 30px; 
                text-align: center; 
                font-size: 7.5pt; 
                color: #94a3b8; 
                border-top: 1px dashed #e2e8f0; 
                padding-top: 10px; 
                font-weight: 600; 
            }
            
            .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80pt;
                color: rgba(0,0,0,0.03);
                font-weight: 900;
                pointer-events: none;
                z-index: -1;
            }
        </style>
    </head>
    <body>
        <div class="standard-container">
            <div class="header">
                <div class="header-left">
                    ${config.logo ? `<img src="${config.logo}" class="company-logo" />` : `<div style="font-size: 18pt; font-weight: 900; color: #2563eb;">${config.companyName === 'CODIGO STACK' ? '<span style="color:#2563eb">CODIGO</span> STACK' : config.companyName}</div>`}
                    <div class="company-info">
                        <h1>${config.companyName}</h1>
                        <p>NUIT: ${config.nif}</p>
                        <p>${config.companyAddress || 'Liberdade 1826, Matola, Maputo'}</p>
                        <p>${config.companyContact || '+258 84 264 1083 / +258 86 254 1083'}</p>
                    </div>
                </div>
                <div class="doc-title-container">
                    <h2>${title}</h2>
                </div>
            </div>

            <div class="meta-section">
                <div class="meta-item">
                    <span class="meta-label">Documento</span>
                    <span class="meta-value">${metadata}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Gerado Por</span>
                    <span class="meta-value">${user?.name || 'Sistema'}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Data</span>
                    <span class="meta-value">${new Date(date).toLocaleDateString('pt-PT')}</span>
                </div>
                <div class="meta-item">
                    <span class="meta-label">Pág.</span>
                    <span class="meta-value">${pageInfo}</span>
                </div>
            </div>

            <div class="content-area">
                ${content}
            </div>

            <div class="footer">
                Documento Processado por Computador / Codigo Stack&copy; / ${new Date().toLocaleDateString('pt-PT')} ${new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
            </div>
        </div>
    </body>
    </html>
    `;
};

export const getCommonStylesA4 = () => `
    @page { size: A4; margin: 15mm; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; color: #1e293b; line-height: 1.5; font-size: 11pt; margin: 0; padding: 0; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
    .header-left { display: flex; align-items: center; gap: 15px; }
    .company-logo { max-width: 120px; max-height: 60px; object-fit: contain; border-radius: 8px; }
    .company-info h1 { margin: 0; font-size: 18pt; color: #1e3a8a; text-transform: uppercase; font-weight: 900; letter-spacing: -0.02em; }
    .company-info p { margin: 2px 0; font-size: 9pt; color: #64748b; font-weight: 600; }
    .doc-title { text-align: right; }
    .doc-title h2 { margin: 0; font-size: 14pt; color: #2563eb; font-weight: 900; }
    .doc-title p { margin: 0; font-size: 8pt; color: #94a3b8; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px; }
    .kpi-card { padding: 15px; border-radius: 12px; border: 1px solid #e2e8f0; background: #f8fafc; }
    .kpi-card label { display: block; font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px; }
    .kpi-card span { font-size: 14pt; font-weight: 900; display: block; }
    .kpi-positive { color: #16a34a; }
    .kpi-negative { color: #dc2626; }
    .kpi-neutral { color: #2563eb; }

    .section-title { font-size: 10pt; font-weight: 900; color: #1e293b; text-transform: uppercase; margin: 25px 0 12px 0; padding-bottom: 5px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    th { background: #f1f5f9; color: #475569; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; padding: 10px 12px; border-bottom: 2px solid #cbd5e1; text-align: left; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; font-size: 9pt; vertical-align: middle; }
    tr:nth-child(even) { background: #fcfdfe; }

    .progress-bg { width: 100px; height: 6px; background: #e2e8f0; border-radius: 10px; overflow: hidden; display: inline-block; margin-left: 10px; }
    .progress-fill { height: 100%; background: #3b82f6; border-radius: 10px; }

    .footer { margin-top: 60px; text-align: center; font-size: 7.5pt; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 15px; font-weight: 600; }
    
    .method-badge { font-size: 8pt; font-weight: 700; color: #475569; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; }
`;

export const generateReceiptHtml = (sale: Sale, config: AppConfig, user: User | undefined, totalPaid: number, change: number) => {
    const basePrice = sale.total / 1.16;
    const vatAmount = sale.total - basePrice;
    return `
    <html>
    <head>
        <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: monospace; width: 72mm; margin: 2mm auto; font-size: 11px; line-height: 1.2; color: #000; }
            .center { text-align: center; }
            .right { text-align: right; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 5px 0; }
            .row { display: flex; justify-content: space-between; }
        </style>
    </head>
    <body>
        <div class="center">
            ${config.logo ? `<img src="${config.logo}" style="max-width: 60mm; max-height: 25mm; object-fit: contain; margin-bottom: 5px;" />` : ''}
            <div class="bold" style="font-size: 14px;">${config.companyName.toUpperCase()}</div>
            <div>NUIT: ${config.nif}</div>
            ${config.companyAddress ? `<div>${config.companyAddress}</div>` : ''}
        </div>
        <div class="divider"></div>
        <div class="center">
            <div class="bold">FACTURA SIMPLIFICADA</div>
            <div class="bold">REF: #${(sale.invoiceNumber || sale.id.slice(-8)).toUpperCase()}</div>
            <div>Data: ${formatDateTime(sale.date)}</div>
        </div>
        <div class="divider"></div>
        <table style="width: 100%; font-size: 10px;">
            ${sale.items.map(item => `
                <tr>
                    <td>${item.quantity} x ${item.name.substring(0,25)}</td>
                    <td class="right">${formatM(item.price * item.quantity)}</td>
                </tr>
            `).join('')}
        </table>
        <div class="divider"></div>
        <div class="row"><span>Base Tributável:</span><span>${formatM(basePrice)}</span></div>
        <div class="row"><span>IVA (16%):</span><span>${formatM(vatAmount)}</span></div>
        <div class="row bold" style="font-size: 13px;"><span>TOTAL:</span><span>${formatM(sale.total)} MT</span></div>
        <div class="divider"></div>
        <div class="row"><span>Recebido:</span><span>${formatM(sale.amountTendered || totalPaid)}</span></div>
        <div class="row"><span>Troco:</span><span>${formatM(sale.change || change)}</span></div>
        <div class="divider"></div>
        <div class="footer center" style="margin-top: 10px;">
            Utilizador: ${user?.name || 'Sistema'}<br>
            Obrigado e volte sempre!
        </div>
    </body>
    </html>
    `;
};

export const generateInvoiceA4Html = (sale: Sale, config: AppConfig, customer: Customer | undefined, user: User | undefined) => {
    const subtotal = sale.total;
    const vatRate = 0;
    const vatAmount = subtotal * (vatRate / 100);
    const totalToPay = subtotal + vatAmount;

    const invoiceNo = sale.invoiceNumber || `${sale.id.slice(-4).padStart(4, '0')}/${new Date(sale.date).getFullYear()}`;

    // Payment methods breakdown
    const payments = {
        CASH: 0,
        POS: 0,
        EMOLA: 0,
        MPESA: 0,
        TRANSFER: 0
    };

    if (sale.paymentDetails) {
        sale.paymentDetails.forEach(d => {
            if (d.method === 'CASH') payments.CASH += d.amount;
            else if (d.method === 'CARD') payments.POS += d.amount;
            else if (d.method === 'EMOLA') payments.EMOLA += d.amount;
            else if (d.method === 'MPESA') payments.MPESA += d.amount;
            else if (d.method === 'TRANSFER') payments.TRANSFER += d.amount;
        });
    } else if (sale.paymentMethod !== 'MIXED' && sale.paymentMethod !== 'PENDING') {
        const method = sale.paymentMethod === 'CARD' ? 'POS' : sale.paymentMethod;
        if (Object.prototype.hasOwnProperty.call(payments, method)) {
            (payments as Record<string, number>)[method] = sale.total;
        }
    }

    const content = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div style="width: 55%;">
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: #f8fafc;">
                    <div style="font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Dados do Cliente</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${customer?.name || 'Consumidor Final'}</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 8px; line-height: 1.4;">
                        NUIT: ${customer?.nif || 'N/D'}<br>
                        Endereço: ${customer?.address || 'N/D'}<br>
                        Telefone: ${customer?.phone || 'N/D'}
                    </div>
                </div>
            </div>
            <div style="width: 40%; text-align: right;">
                <div style="font-size: 9pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Condição de Pagamento</div>
                <div style="font-size: 10pt; font-weight: 700; color: #1e293b;">${sale.status === 'PAID' ? 'Pronto Pagamento' : 'A Prazo'}</div>
                
                <div style="margin-top: 15px;">
                    <div style="font-size: 9pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Estado do Documento</div>
                    <div style="font-size: 10pt; font-weight: 700; color: ${sale.status === 'PAID' ? '#16a34a' : (sale.status === 'VOID' ? '#dc2626' : '#eab308')}">
                        ${sale.status === 'PAID' ? 'LIQUIDADA' : (sale.status === 'VOID' ? 'ANULADA' : 'PENDENTE')}
                    </div>
                </div>
            </div>
        </div>

        ${sale.status === 'VOID' ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(220, 38, 38, 0.1); font-weight: 900; pointer-events: none; z-index: 10;">ANULADA</div>' : ''}

        <table>
            <thead>
                <tr>
                    <th>Cód.</th>
                    <th>Descrição</th>
                    <th class="text-center">Qtd.</th>
                    <th class="text-right">Pr. Unitário</th>
                    <th class="text-right">IVA</th>
                    <th class="text-right">Total Líquido</th>
                </tr>
            </thead>
            <tbody>
                ${sale.items.map(item => `
                    <tr>
                        <td style="font-family: monospace; font-size: 8pt;">${item.code}</td>
                        <td class="font-bold">${item.name}</td>
                        <td class="text-center">${item.quantity.toFixed(2)}</td>
                        <td class="text-right">${formatM(item.price)}</td>
                        <td class="text-right">0,00</td>
                        <td class="text-right font-bold">${formatM(item.price * item.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 30px;">
            <div style="width: 45%;">
                <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 10px;">Resumo de Impostos</div>
                <table style="font-size: 8pt;">
                    <thead>
                        <tr>
                            <th>Taxa</th>
                            <th>Incidência</th>
                            <th class="text-right">Valor IVA</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Isento (0%)</td>
                            <td>${formatM(subtotal)}</td>
                            <td class="text-right">0,00</td>
                        </tr>
                    </tbody>
                </table>
                
                <div style="margin-top: 20px; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
                    <div style="font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Dados para Pagamento</div>
                    <div style="font-size: 8pt; color: #475569; white-space: pre-wrap;">${config.financialTransactionData || 'Consulte os nossos canais oficiais para dados bancários.'}</div>
                </div>
            </div>

            <div style="width: 50%;">
                <div style="background: #f1f5f9; padding: 15px; border-radius: 12px;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                        <span style="color: #64748b; font-weight: 600;">Subtotal:</span>
                        <span style="font-weight: 700;">${formatM(subtotal)} MT</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                        <span style="color: #64748b; font-weight: 600;">IVA (0%):</span>
                        <span style="font-weight: 700;">0,00 MT</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #cbd5e1; font-size: 14pt; color: #2563eb;">
                        <span style="font-weight: 900;">TOTAL A PAGAR:</span>
                        <span style="font-weight: 900;">${formatM(totalToPay)} MT</span>
                    </div>
                </div>

                <div style="margin-top: 15px; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Métodos de Pagamento Utilizados</div>
                    ${payments.CASH > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px;"><span>Numerário:</span><span class="font-bold">${formatM(payments.CASH)}</span></div>` : ''}
                    ${payments.POS > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px;"><span>POS:</span><span class="font-bold">${formatM(payments.POS)}</span></div>` : ''}
                    ${payments.MPESA > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px;"><span>M-Pesa:</span><span class="font-bold">${formatM(payments.MPESA)}</span></div>` : ''}
                    ${payments.EMOLA > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px;"><span>E-Mola:</span><span class="font-bold">${formatM(payments.EMOLA)}</span></div>` : ''}
                    ${payments.TRANSFER > 0 ? `<div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px;"><span>Transferência:</span><span class="font-bold">${formatM(payments.TRANSFER)}</span></div>` : ''}
                </div>
            </div>
        </div>

        <div style="margin-top: 40px; font-size: 8.5pt; color: #64748b; font-style: italic;">
            <strong>Observações:</strong> Os bens/serviços foram entregues em conformidade. Não aceitamos devoluções após 48h.
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Factura',
        config,
        user,
        content,
        metadata: invoiceNo,
        date: sale.date
    });
};

export const generateFinancialReportHtml = (data: {
    totalSales: number;
    otherIncome: number;
    byCategory: Record<string, number>;
    totalExpenses: number;
    netProfit: number;
    byMethod: Record<string, number>;
    byDate: Record<string, { in: number; out: number }>;
}, config: AppConfig, startDate: string, endDate: string) => {
    const totalRevenue = (data.totalSales || 0) + (data.otherIncome || 0);
    const costClassification = Object.entries(data.byCategory || {})
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

    const content = `
        <div style="margin-bottom: 25px;">
            <div style="font-size: 11pt; font-weight: 800; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 15px;">RESUMO EXECUTIVO DO PERÍODO</div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
                <div style="background: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 7pt; font-weight: 800; color: #166534; text-transform: uppercase;">Receita Bruta</div>
                    <div style="font-size: 14pt; font-weight: 900; color: #16a34a;">${formatM(totalRevenue)} MT</div>
                </div>
                <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 7pt; font-weight: 800; color: #991b1b; text-transform: uppercase;">Despesas Totais</div>
                    <div style="font-size: 14pt; font-weight: 900; color: #dc2626;">${formatM(data.totalExpenses)} MT</div>
                </div>
                <div style="background: #eff6ff; border: 1px solid #dbeafe; padding: 15px; border-radius: 10px;">
                    <div style="font-size: 7pt; font-weight: 800; color: #1e40af; text-transform: uppercase;">Resultado Líquido</div>
                    <div style="font-size: 14pt; font-weight: 900; color: ${data.netProfit >= 0 ? '#2563eb' : '#dc2626'}">${formatM(data.netProfit)} MT</div>
                </div>
            </div>
        </div>

        <div style="display: flex; gap: 20px; margin-bottom: 25px;">
            <div style="flex: 1;">
                <div style="font-size: 9pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Classificação de Custos</div>
                <table>
                    <thead>
                        <tr>
                            <th>Categoria</th>
                            <th class="text-right">Valor</th>
                            <th class="text-right">%</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${costClassification.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td class="text-right">${formatM(c.value)}</td>
                                <td class="text-right">${data.totalExpenses > 0 ? ((c.value / data.totalExpenses) * 100).toFixed(1) : 0}%</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div style="flex: 1;">
                <div style="font-size: 9pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Receitas por Método</div>
                <table>
                    <thead>
                        <tr>
                            <th>Método</th>
                            <th class="text-right">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${Object.entries(data.byMethod || {}).map(([methodId, amount]) => {
                            const methodName = config.paymentMethods?.find(m => m.id === methodId)?.name || methodId;
                            return `
                                <tr>
                                    <td>${methodName}</td>
                                    <td class="text-right font-bold">${formatM(amount)} MT</td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        </div>

        <div style="margin-bottom: 25px;">
            <div style="font-size: 9pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Histórico de Fluxo de Caixa</div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th class="text-right">Entradas</th>
                        <th class="text-right">Saídas</th>
                        <th class="text-right">Balanço</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(data.byDate || {}).sort().map(([date, flow]) => `
                        <tr>
                            <td>${formatDate(date)}</td>
                            <td class="text-right" style="color: #16a34a;">${formatM(flow.in)}</td>
                            <td class="text-right" style="color: #dc2626;">${formatM(flow.out)}</td>
                            <td class="text-right font-bold">${formatM(flow.in - flow.out)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Relatório Financeiro',
        config,
        content,
        metadata: `Período: ${startDate} a ${endDate}`,
        date: new Date().toISOString()
    });
};

export const generateThermalCashClosingHtml = (session: CashSession, stats: { breakdown: Record<string, number> }, declaredAmount: number, config: AppConfig) => {
    const totalExpected = session.initialBalance + session.totalCashSystem + (stats.breakdown['CARD'] || 0) + (stats.breakdown['EMOLA'] || 0) + (stats.breakdown['MPESA'] || 0);
    const diff = declaredAmount - (session.initialBalance + session.totalCashSystem);

    return `
    <html>
    <head>
        <style>
            @page { margin: 0; size: 80mm auto; }
            body { font-family: monospace; width: 72mm; margin: 2mm auto; font-size: 12px; line-height: 1.4; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .row { display: flex; justify-content: space-between; }
            .header-title { font-size: 14px; margin-bottom: 5px; }
        </style>
    </head>
    <body>
        <div class="center">
            ${config.logo ? `<img src="${config.logo}" style="max-width: 60mm; max-height: 25mm; object-fit: contain; margin-bottom: 5px;" />` : ''}
        </div>
        <div class="center bold header-title">-----------------------------------------</div>
        <div class="center bold header-title">RELATÓRIO DE FECHO</div>
        <div class="center bold header-title">-----------------------------------------</div>
        
        <div class="row">
            <span>CAIXA: ${session.id.slice(-3)}</span>
            <span>OPERADOR: ${session.operatorName.toUpperCase()}</span>
        </div>
        <div>ABERTURA: ${formatDateTime(session.startTime)}</div>
        <div>FECHO:    ${session.endTime ? formatDateTime(session.endTime) : 'EM ABERTO'}</div>
        
        <div class="divider"></div>
        
        <div class="row"><span>VALOR INICIAL:</span><span>${formatM(session.initialBalance)} MT</span></div>
        ${(config.paymentMethods || []).filter(m => m.isActive || (stats.breakdown[m.id] && stats.breakdown[m.id] > 0)).map(m => {
            const amount = m.id === 'CASH' ? session.totalCashSystem : (stats.breakdown[m.id] || 0);
            if (amount === 0 && !m.isActive) return '';
            return `<div class="row"><span>(+) ${m.name.toUpperCase()}:</span><span>${formatM(amount)} MT</span></div>`;
        }).join('')}
        
        <div class="divider"></div>
        
        <div class="row bold"><span>TOTAL PREVISTO:</span><span>${formatM(totalExpected)} MT</span></div>
        <div class="row bold"><span>VALOR INFORMADO:</span><span>${formatM(declaredAmount)} MT</span></div>
        <div class="row bold"><span>DIFERENÇA:</span><span style="color: ${diff === 0 ? 'black' : (diff > 0 ? 'green' : 'red')}">${formatM(diff)} MT</span></div>
        
        <div class="divider"></div>
        <div class="center" style="margin-top: 20px; font-size: 10px;">
            ERP GESTÃO COMERCIAL<br>
            DOCUMENTO DE CONTROLE INTERNO
        </div>
    </body>
    </html>
    `;
};

export const generateInventoryReportHtml = (products: Product[], config: AppConfig, filterLowStock: boolean) => {
    const list = filterLowStock ? products.filter(p => p.stock <= p.minStock) : products;
    const totalValue = list.reduce((acc, p) => acc + (p.stock * p.cost), 0);

    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">LISTAGEM DE STOCK</div>
            <div style="font-size: 9pt; color: #64748b;">${filterLowStock ? 'Somente Alertas de Reposição' : 'Posição Completa'}</div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: right;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Valor Total (Custo)</div>
                <div style="font-size: 12pt; font-weight: 900; color: #2563eb;">${formatM(totalValue)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Descrição do Artigo</th>
                    <th>Categoria</th>
                    <th class="text-center">Mínimo</th>
                    <th class="text-center">Stock Atual</th>
                    <th class="text-right">Custo Unit.</th>
                    <th class="text-right">Total Custo</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(p => `
                    <tr>
                        <td style="font-family: monospace; font-size: 8pt;">${p.code}</td>
                        <td class="font-bold">${p.name}</td>
                        <td>${p.category}</td>
                        <td class="text-center">${p.minStock}</td>
                        <td class="text-center font-bold" style="${p.stock <= p.minStock ? 'color: #dc2626;' : ''}">${p.stock}</td>
                        <td class="text-right">${formatM(p.cost)}</td>
                        <td class="text-right font-bold">${formatM(p.stock * p.cost)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Listagem de Stock',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateBlacklistReportHtml = (products: Product[], config: AppConfig) => {
    const list = products.filter(p => p.isBlacklisted);
    const totalRetainedValue = list.reduce((acc, p) => acc + (p.stock * p.cost), 0);

    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #dc2626; margin-bottom: 5px;">ARTIGOS BLOQUEADOS</div>
            <div style="font-size: 9pt; color: #64748b;">Lista Negra de Vendas - Auditoria de Stock</div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
            <div style="background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 8px; text-align: right;">
                <div style="font-size: 7pt; font-weight: bold; color: #991b1b; text-transform: uppercase;">Valor Total Retido</div>
                <div style="font-size: 12pt; font-weight: 900; color: #dc2626;">${formatM(totalRetainedValue)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-center">Stock</th>
                    <th class="text-right">Preço Venda</th>
                    <th class="text-right">Valor Retido</th>
                </tr>
            </thead>
            <tbody>
                ${list.map(p => `
                    <tr>
                        <td style="font-family: monospace;">${p.code}</td>
                        <td class="font-bold">${p.name}</td>
                        <td class="text-center">${p.stock}</td>
                        <td class="text-right">${formatM(p.price)}</td>
                        <td class="text-right font-bold">${formatM(p.stock * p.price)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Artigos Bloqueados',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateCustomerStatementHtml = (customer: Customer, history: Sale[], config: AppConfig) => {
    const content = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 25px;">
            <div style="width: 55%;">
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: #f8fafc;">
                    <div style="font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Dados do Cliente</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${customer.name}</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 8px;">
                        NUIT: ${customer.nif || 'N/D'}<br>
                        Telefone: ${customer.phone || 'N/D'}
                    </div>
                </div>
            </div>
            <div style="width: 40%; text-align: right;">
                <div style="font-size: 9pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Saldo Atual</div>
                <div style="font-size: 16pt; font-weight: 900; color: ${customer.creditBalance - customer.debt >= 0 ? '#16a34a' : '#dc2626'}">
                    ${formatM(customer.creditBalance - customer.debt)} MT
                </div>
            </div>
        </div>

        <h3 style="font-size: 10pt; font-weight: 800; color: #1e293b; margin-bottom: 15px; border-bottom: 2px solid #e2e8f0; padding-bottom: 5px;">Histórico de Facturação</h3>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Ref #</th>
                    <th>Status</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${history.map(s => `
                    <tr>
                        <td>${formatDate(s.date)}</td>
                        <td class="font-mono">#${s.invoiceNumber || s.id.slice(-6).toUpperCase()}</td>
                        <td>
                            <span style="color: ${s.status === 'PAID' ? '#16a34a' : '#eab308'}; font-weight: bold;">
                                ${s.status === 'PAID' ? 'LIQUIDADA' : 'PENDENTE'}
                            </span>
                        </td>
                        <td class="text-right font-bold">${formatM(s.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
            <div style="width: 40%; background: #f1f5f9; padding: 15px; border-radius: 12px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b; font-weight: 600;">Dívida Acumulada:</span>
                    <span style="font-weight: 700; color: #dc2626;">${formatM(customer.debt)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b; font-weight: 600;">Saldo a Favor:</span>
                    <span style="font-weight: 700; color: #16a34a;">${formatM(customer.creditBalance)}</span>
                </div>
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Extrato de Conta',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generatePriceListHtml = (products: Product[], config: AppConfig, mode: 'PUBLIC' | 'INTERNAL') => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">TABELA DE PREÇOS</div>
            <div style="font-size: 9pt; color: #64748b;">${mode === 'PUBLIC' ? 'CATÁLOGO PÚBLICO' : 'CONTROLE INTERNO'}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Artigo</th>
                    <th>Categoria</th>
                    ${mode === 'INTERNAL' ? '<th class="text-center">Stock</th>' : ''}
                    <th class="text-right">Preço de Venda</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.name}</td>
                        <td>${p.category}</td>
                        ${mode === 'INTERNAL' ? `<td class="text-center">${p.stock}</td>` : ''}
                        <td class="text-right font-bold">${formatM(p.price)} MT</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Tabela de Preços',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateStockEntryReportHtml = (entry: StockEntry, supplier: Supplier | undefined, config: AppConfig) => {
    const content = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 50%;">
                <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Fornecedor</div>
                    <div style="font-size: 10pt; font-weight: bold;">${entry.supplierName}</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 5px;">
                        Doc. Origem: ${entry.invoiceNo}<br>
                        Data Entrada: ${formatDateTime(entry.date)}
                    </div>
                </div>
            </div>
            <div style="width: 40%; text-align: right;">
                <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a;">NOTA DE ENTRADA</div>
                <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">
                    Ref: #${entry.id.slice(-8).toUpperCase()}
                </div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Cód.</th>
                    <th>Artigo</th>
                    <th class="text-center">Qtd</th>
                    <th class="text-right">Custo Unit.</th>
                    <th class="text-right">Subtotal</th>
                </tr>
            </thead>
            <tbody>
                ${entry.items.map(i => `
                    <tr>
                        <td style="font-family: monospace; font-size: 8pt;">${i.productCode}</td>
                        <td class="font-bold">${i.productName}</td>
                        <td class="text-center">${i.quantity}</td>
                        <td class="text-right">${formatM(i.cost)}</td>
                        <td class="text-right font-bold">${formatM(i.cost * i.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 12pt; color: #2563eb; border-top: 2px solid #2563eb;">
                    <span class="font-bold">TOTAL INVESTIDO:</span>
                    <span style="font-weight: 900;">${formatM(entry.totalAmount)} MT</span>
                </div>
            </div>
        </div>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px;">
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                ENTREGUE POR (ASSINATURA)
            </div>
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                RECEBIDO POR (FIEL DE ARMAZÉM)
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Nota de Entrada',
        config,
        content,
        date: entry.date
    });
};

export const generateAuditReportHtml = (audit: StockAudit, config: AppConfig) => {
    const netImpact = audit.totalValueSurplus - audit.totalValueLoss;
    
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE INVENTÁRIO / AUDITORIA</div>
            <div style="font-size: 9pt; color: #64748b;">ID: #${audit.id.slice(-6).toUpperCase()} | Auditor: ${audit.auditorName}</div>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 15px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; text-align: right;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Resultado Líquido</div>
                <div style="font-size: 12pt; font-weight: 900; color: ${netImpact >= 0 ? '#16a34a' : '#dc2626'}">${formatM(netImpact)} MT</div>
            </div>
        </div>

        <h3 style="font-size: 10pt; font-weight: 800; color: #1e293b; margin-bottom: 15px;">Divergências Encontradas</h3>
        <table>
            <thead>
                <tr>
                    <th>Cód.</th>
                    <th>Artigo</th>
                    <th class="text-center">Sist.</th>
                    <th class="text-center">Físico</th>
                    <th class="text-center">Dif.</th>
                    <th class="text-right">Impacto</th>
                </tr>
            </thead>
            <tbody>
                ${audit.items.filter(i => i.countedStock !== null && i.countedStock !== i.systemStock).map(i => {
                    const diff = (i.countedStock || 0) - i.systemStock;
                    const impact = Math.abs(diff) * i.salePrice;
                    return `
                        <tr>
                            <td style="font-family: monospace; font-size: 8pt;">${i.productCode}</td>
                            <td class="font-bold">${i.productName}</td>
                            <td class="text-center">${i.systemStock}</td>
                            <td class="text-center font-bold">${i.countedStock}</td>
                            <td class="text-center" style="color: ${diff < 0 ? '#dc2626' : '#16a34a'}; font-weight: bold;">
                                ${diff > 0 ? '+' : ''}${diff}
                            </td>
                            <td class="text-right font-bold">${formatM(impact)}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Relatório de Auditoria',
        config,
        content,
        date: audit.dateCreated
    });
};

export const generateSupplierListReportHtml = (suppliers: Supplier[], config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">LISTA DE FORNECEDORES</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Empresa</th>
                    <th>NUIT</th>
                    <th>Contacto</th>
                    <th>Email</th>
                    <th>Endereço</th>
                    <th>Condições de Pagamento</th>
                </tr>
            </thead>
            <tbody>
                ${suppliers.map(s => `
                    <tr>
                        <td class="font-bold">${s.name}</td>
                        <td>${s.nif}</td>
                        <td>${s.contact}</td>
                        <td>${s.email || '-'}</td>
                        <td>${s.address || '-'}</td>
                        <td>${s.paymentTerms || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Lista de Fornecedores',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateCustomerListHtml = (customers: Customer[], config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">LISTAGEM DE CLIENTES</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>NUIT</th>
                    <th>Telefone</th>
                    <th class="text-right">Saldo Devedor</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(c => `
                    <tr>
                        <td class="font-bold">${c.name}</td>
                        <td>${c.nif}</td>
                        <td>${c.phone || '-'}</td>
                        <td class="text-right font-bold" style="color: ${c.debt > 0 ? '#dc2626' : 'inherit'};">${formatM(c.debt)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Listagem de Clientes',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateInternalRequisitionHtml = (req: Requisition, config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">REQUISIÇÃO INTERNA</div>
            <div style="font-size: 9pt; color: #64748b;">REF: #${req.id.slice(-6).toUpperCase()} | Requisitante: ${req.requester}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Artigo</th>
                    <th class="text-center">Quantidade</th>
                </tr>
            </thead>
            <tbody>
                ${req.items.map(i => `
                    <tr>
                        <td class="font-bold">${i.productName}</td>
                        <td class="text-center">${i.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px;">
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                REQUISITANTE (ASSINATURA)
            </div>
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                AUTORIZADO POR
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Requisição Interna',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateStockExitReportHtml = (exit: StockExit, config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">GUIA DE SAÍDA / ABATE</div>
            <div style="font-size: 9pt; color: #64748b;">Ref: #${exit.id.slice(-6).toUpperCase()} | Data: ${formatDateTime(exit.date)}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Artigo</th>
                    <th class="text-center">Qtd</th>
                    <th>Motivo</th>
                </tr>
            </thead>
            <tbody>
                ${exit.items.map(i => `
                    <tr>
                        <td class="font-bold">${i.productName}</td>
                        <td class="text-center">${i.quantity}</td>
                        <td>${i.reason}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px;">
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                AUTORIZADO POR
            </div>
            <div style="flex: 1; border-top: 1px solid #cbd5e1; padding-top: 10px; text-align: center; font-size: 8pt; color: #64748b;">
                PROCESSADO POR
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Guia de Saída',
        config,
        content,
        date: exit.date
    });
};

export const generateTransactionReceiptHtml = (transaction: Transaction, config: AppConfig) => {
    const isTransfer = transaction.type === 'TRANSFER';
    const isPositive = transaction.type === 'INCOME' || (isTransfer && transaction.transferType === 'RECEIVE');
    const label = isTransfer ? 'TRANSFERENCIA' : isPositive ? 'ENTRADA' : 'SAIDA';
    const sign = isPositive ? '+' : '-';
    return `<html><head><style>body{font-family:monospace;width:72mm;padding:5mm;font-size:12px;}.center{text-align:center;}.bold{font-weight:bold;}</style></head><body><div class="center bold">${config.companyName.toUpperCase()}</div><div class="center">COMPROVATIVO DE LANÇAMENTO</div><hr><div>ID: #${transaction.id.slice(-6)}</div><div>Data: ${formatDateTime(transaction.date)}</div><div>Tipo: ${label}</div><hr><div>DESC: ${transaction.description}</div><div class="bold">VALOR: ${sign}${formatM(transaction.amount)} MT</div><hr><div class="center">ERP Gestão Comercial</div></body></html>`;
};

export const generateTransactionReportHtml = (transactions: Transaction[], config: AppConfig, start: string, end: string) => {
    const totalIncomes = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
    const totalExpenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
    const netBalance = totalIncomes - totalExpenses;

    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">EXTRATO DE TESOURARIA</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${start} a ${end}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 30%; background: #f0fdf4; border: 1px solid #dcfce7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #166534; text-transform: uppercase;">Total Entradas</div>
                <div style="font-size: 11pt; font-weight: 900; color: #16a34a;">${formatM(totalIncomes)} MT</div>
            </div>
            <div style="width: 30%; background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #991b1b; text-transform: uppercase;">Total Saídas</div>
                <div style="font-size: 11pt; font-weight: 900; color: #dc2626;">${formatM(totalExpenses)} MT</div>
            </div>
            <div style="width: 30%; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Saldo Líquido</div>
                <div style="font-size: 11pt; font-weight: 900; color: ${netBalance >= 0 ? '#16a34a' : '#dc2626'}">${formatM(netBalance)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 15%">Data/Hora</th>
                    <th style="width: 10%">Tipo</th>
                    <th style="width: 15%">Categoria</th>
                    <th style="width: 35%">Descrição / Beneficiário</th>
                    <th style="width: 12%">Método</th>
                    <th style="width: 13%" class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => {
                    const isTransfer = t.type === 'TRANSFER';
                    const isPositive = t.type === 'INCOME' || (isTransfer && t.transferType === 'RECEIVE');
                    const badgeBg = isTransfer ? '#dbeafe' : isPositive ? '#dcfce7' : '#fee2e2';
                    const badgeColor = isTransfer ? '#1e40af' : isPositive ? '#166534' : '#991b1b';
                    const label = isTransfer ? 'TRANSFERÊNCIA' : isPositive ? 'ENTRADA' : 'SAÍDA';
                    const textValueColor = isPositive ? '#16a34a' : '#dc2626';
                    const sign = isPositive ? '+' : '-';
                    return `
                    <tr>
                        <td>${formatDateTime(t.date)}</td>
                        <td>
                            <span style="font-size: 7pt; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${badgeBg}; color: ${badgeColor};">
                                ${label}
                            </span>
                        </td>
                        <td>${t.category}</td>
                        <td>
                            <div class="font-bold">${t.description}</div>
                            <div style="font-size: 7.5pt; color: #64748b;">${t.beneficiary || '-'}</div>
                        </td>
                        <td style="font-size: 8pt; text-transform: uppercase;">${t.method || 'CASH'}</td>
                        <td class="text-right font-bold" style="color: ${textValueColor}">
                            ${sign}${formatM(t.amount)}
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Extrato de Tesouraria',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateWalletReportHtml = (mode: string, wallets: Wallet[], transactions: Transaction[], config: AppConfig, activeWallet?: Wallet, startDate?: string, endDate?: string) => {
    const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
    const startStr = startDate ? new Date(startDate).toLocaleDateString() : 'Início';
    const endStr = endDate ? new Date(endDate).toLocaleDateString() : 'Fim';
    
    let content = '';
    
    if (mode === 'SYNTHETIC') {
        content = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">SALDOS DE CONTAS E CARTEIRAS</div>
                <div style="font-size: 9pt; color: #64748b;">Posição Consolidada Financeira</div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 40%">Nome da Conta</th>
                        <th style="width: 20%">Tipo</th>
                        <th style="width: 20%">Nº Conta / Ref</th>
                        <th style="width: 20%" class="text-right">Saldo Atual</th>
                    </tr>
                </thead>
                <tbody>
                    ${wallets.map(w => `
                        <tr>
                            <td class="font-bold">${w.name}</td>
                            <td>${w.type}</td>
                            <td class="font-mono">${w.accountNumber || '-'}</td>
                            <td class="text-right font-bold">${formatM(w.balance)} MT</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div style="display: flex; justify-content: flex-end; margin-top: 30px;">
                <div style="width: 40%; background: #f1f5f9; padding: 15px; border-radius: 12px; text-align: right;">
                    <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Saldo Total Consolidado</div>
                    <div style="font-size: 16pt; font-weight: 900; color: #2563eb;">${formatM(totalBalance)} MT</div>
                </div>
            </div>
        `;
    } else {
        const incomes = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const expenses = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);
        
        content = `
            <div style="margin-bottom: 20px;">
                <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">EXTRATO ANALÍTICO DE CONTA</div>
                <div style="font-size: 9pt; color: #64748b;">Conta: ${activeWallet ? activeWallet.name : 'Todas as Carteiras'} | Período: ${startStr} a ${endStr}</div>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
                <div style="width: 30%; background: #f0fdf4; border: 1px solid #dcfce7; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: bold; color: #166534; text-transform: uppercase;">Total Entradas</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #16a34a;">${formatM(incomes)} MT</div>
                </div>
                <div style="width: 30%; background: #fef2f2; border: 1px solid #fee2e2; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: bold; color: #991b1b; text-transform: uppercase;">Total Saídas</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #dc2626;">${formatM(expenses)} MT</div>
                </div>
                <div style="width: 30%; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Diferença Líquida</div>
                    <div style="font-size: 11pt; font-weight: 900; color: ${incomes - expenses >= 0 ? '#16a34a' : '#dc2626'}">${formatM(incomes - expenses)} MT</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 15%">Data</th>
                        ${!activeWallet ? '<th style="width: 15%">Carteira</th>' : ''}
                        <th style="width: 40%">Descrição</th>
                        <th style="width: 15%">Tipo</th>
                        <th style="width: 15%" class="text-right">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${transactions.map(t => {
                        const isTransfer = t.type === 'TRANSFER';
                        const isPositive = t.type === 'INCOME' || (isTransfer && t.transferType === 'RECEIVE');
                        const badgeBg = isTransfer ? '#dbeafe' : isPositive ? '#dcfce7' : '#fee2e2';
                        const badgeColor = isTransfer ? '#1e40af' : isPositive ? '#166534' : '#991b1b';
                        const label = isTransfer ? 'TRANSFERÊNCIA' : isPositive ? 'ENTRADA' : 'SAÍDA';
                        const textValueColor = isPositive ? '#16a34a' : '#dc2626';
                        const sign = isPositive ? '+' : '-';
                        return `
                        <tr>
                            <td>${formatDateTime(t.date)}</td>
                            ${!activeWallet ? `<td>${wallets.find(w => w.id === t.walletId)?.name || '-'}</td>` : ''}
                            <td>
                                <div class="font-bold">${t.description}</div>
                                <div style="font-size: 7pt; color: #64748b;">${t.category}</div>
                            </td>
                            <td>
                                <span style="font-size: 7pt; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${badgeBg}; color: ${badgeColor};">
                                    ${label}
                                </span>
                            </td>
                            <td class="text-right font-bold" style="color: ${textValueColor}">
                                ${sign}${formatM(t.amount)}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    return generateStandardDocumentHtml({
        title: mode === 'SYNTHETIC' ? 'Saldos Consolidados' : 'Extrato de Conta',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateInvoicesReportHtml = (sales: Sale[], customers: Customer[], config: AppConfig, statusFilter: string, startDate: string, endDate: string) => {
    const total = sales.reduce((acc, s) => acc + s.total, 0);
    const paid = sales.filter(s => s.status === 'PAID').reduce((acc, s) => acc + s.total, 0);
    const pending = sales.filter(s => s.status === 'PENDING').reduce((acc, s) => acc + s.total, 0);

    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">MAPA DE RECEBIMENTOS / FACTURAÇÃO</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${startDate} a ${endDate} | Status: ${statusFilter === 'ALL' ? 'Todos' : statusFilter}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 30%; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Total Facturado</div>
                <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${formatM(total)} MT</div>
            </div>
            <div style="width: 30%; background: #f0fdf4; border: 1px solid #dcfce7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #166534; text-transform: uppercase;">Total Liquidado</div>
                <div style="font-size: 11pt; font-weight: 900; color: #16a34a;">${formatM(paid)} MT</div>
            </div>
            <div style="width: 30%; background: #fffbeb; border: 1px solid #fef3c7; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #92400e; text-transform: uppercase;">Total Pendente</div>
                <div style="font-size: 11pt; font-weight: 900; color: #d97706;">${formatM(pending)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 12%">Nº Factura</th>
                    <th style="width: 15%">Data Emissão</th>
                    <th style="width: 30%">Cliente / Entidade</th>
                    <th style="width: 15%">Método Pag.</th>
                    <th style="width: 12%">Status</th>
                    <th style="width: 16%" class="text-right">Valor Total</th>
                </tr>
            </thead>
            <tbody>
                ${sales.map(s => {
                    const customer = customers.find(c => c.id === s.customerId);
                    const methodName = s.paymentMethod === 'MIXED' ? 'Misto' : (config.paymentMethods?.find(m => m.id === s.paymentMethod)?.name || s.paymentMethod);
                    return `
                    <tr>
                        <td class="font-mono">#${s.invoiceNumber || s.id.slice(-6).toUpperCase()}</td>
                        <td>${formatDate(s.date)}</td>
                        <td class="font-bold">${customer?.name || 'Consumidor Final'}</td>
                        <td>${methodName}</td>
                        <td>
                            <span style="font-size: 7pt; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${s.status === 'PAID' ? '#dcfce7' : s.status === 'VOID' ? '#fee2e2' : '#fef3c7'}; color: ${s.status === 'PAID' ? '#166534' : s.status === 'VOID' ? '#991b1b' : '#92400e'};">
                                ${s.status === 'PAID' ? 'LIQUIDADA' : s.status === 'VOID' ? 'ANULADA' : 'PENDENTE'}
                            </span>
                        </td>
                        <td class="text-right font-bold">${formatM(s.total)}</td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Mapa de Recebimentos',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateSalesAnalyticsReportHtml = (sales: Sale[], kpis: { revenue: number; count: number }, topProducts: { name: string; revenue: number }[], config: AppConfig, filterInfo: { startDate: string; endDate: string }) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">ANÁLISE DE DESEMPENHO DE VENDAS</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${filterInfo.startDate} a ${filterInfo.endDate}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 48%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Volume de Vendas</div>
                <div style="font-size: 18pt; font-weight: 900; color: #1e293b;">${formatM(kpis.revenue)} MT</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 5px;">Total de ${kpis.count} transações</div>
            </div>
            <div style="width: 48%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Ticket Médio</div>
                <div style="font-size: 18pt; font-weight: 900; color: #1e293b;">${formatM(kpis.count > 0 ? kpis.revenue / kpis.count : 0)} MT</div>
                <div style="font-size: 8pt; color: #64748b; margin-top: 5px;">Média por venda</div>
            </div>
        </div>

        <h3 style="font-size: 10pt; font-weight: 800; color: #1e293b; margin-bottom: 15px;">Top Artigos por Facturação</h3>
        <table>
            <thead>
                <tr>
                    <th>Artigo</th>
                    <th class="text-right">Valor Facturado</th>
                    <th class="text-right">% do Total</th>
                </tr>
            </thead>
            <tbody>
                ${topProducts.map(p => `
                    <tr>
                        <td class="font-bold">${p.name}</td>
                        <td class="text-right font-bold">${formatM(p.revenue)} MT</td>
                        <td class="text-right">${((p.revenue / kpis.revenue) * 100).toFixed(1)}%</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Análise de Vendas',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generatePaymentReceiptHtml = (sale: Sale, config: AppConfig, customer: Customer | undefined, user: User | undefined) => {
    const content = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 50%;">
                <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px; background: #f8fafc;">
                    <div style="font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Recebemos de</div>
                    <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${customer?.name || 'Consumidor Final'}</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 8px; line-height: 1.4;">
                        NUIT: ${customer?.nif || 'N/D'}<br>
                        Endereço: ${customer?.address || 'N/D'}
                    </div>
                </div>
            </div>
            <div style="width: 40%; text-align: right;">
                <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a;">RECIBO DE PAGAMENTO</div>
                <div style="font-size: 10pt; font-weight: 700; color: #64748b; margin-top: 5px;">Nº ${sale.invoiceNumber || `REC-${sale.id.slice(-6).toUpperCase()}`}</div>
                <div style="font-size: 9pt; color: #94a3b8; margin-top: 5px;">Referente à Factura #${sale.invoiceNumber || sale.id.slice(-8).toUpperCase()}</div>
            </div>
        </div>

        <div style="background: #f1f5f9; padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: center;">
            <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Valor Recebido</div>
            <div style="font-size: 24pt; font-weight: 900; color: #2563eb;">${formatM(sale.total)} MT</div>
            <div style="font-size: 9pt; color: #475569; margin-top: 5px; font-style: italic;">( ${sale.total.toLocaleString('pt-PT')} Meticais )</div>
        </div>

        <div style="margin-bottom: 30px;">
            <div style="font-size: 9pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Detalhes da Liquidação</div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th>Método</th>
                        <th class="text-right">Valor Pago</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${formatDate(sale.date)}</td>
                        <td>Liquidação de Factura #${sale.invoiceNumber || sale.id.slice(-8).toUpperCase()}</td>
                        <td>${sale.paymentMethod}</td>
                        <td class="text-right font-bold">${formatM(sale.total)} MT</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div style="margin-top: 80px; text-align: center;">
            <div style="display: inline-block; width: 250px; border-top: 1px solid #1e293b; padding-top: 10px;">
                <div style="font-size: 8pt; font-weight: 800; color: #1e293b; text-transform: uppercase;">Assinatura e Carimbo</div>
                <div style="font-size: 7pt; color: #64748b; margin-top: 2px;">${config.companyName}</div>
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Recibo de Pagamento',
        config,
        user,
        content,
        date: sale.date
    });
};

export const generateExpenseReportHtml = (transactions: Transaction[], config: AppConfig, startDate: string, endDate: string) => {
    return generateTransactionReportHtml(transactions, config, startDate, endDate);
};

export const generateRequisitionDocumentA4 = (req: Requisition, supplier: Supplier | undefined, config: AppConfig) => {
    const content = `
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 50%;">
                <div style="border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                    <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Requisitante</div>
                    <div style="font-size: 10pt; font-weight: bold;">${req.requester}</div>
                    <div style="font-size: 8.5pt; color: #475569; margin-top: 5px;">
                        Data: ${formatDate(req.date)}
                    </div>
                </div>
            </div>
            <div style="width: 40%; text-align: right;">
                <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a;">REQUISIÇÃO DE COMPRA</div>
                <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">Ref: #${req.id.slice(-6).toUpperCase()}</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Artigo</th>
                    <th class="text-center">Quantidade</th>
                    <th class="text-right">Custo Est.</th>
                    <th class="text-right">Subtotal Est.</th>
                </tr>
            </thead>
            <tbody>
                ${req.items.map(i => `
                    <tr>
                        <td class="font-bold">${i.productName}</td>
                        <td class="text-center">${i.quantity}</td>
                        <td class="text-right">${formatM(i.estimatedUnitCost)}</td>
                        <td class="text-right font-bold">${formatM(i.estimatedUnitCost * i.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
            <div style="width: 40%;">
                <div style="display: flex; justify-content: space-between; padding: 10px 0; font-size: 12pt; color: #2563eb; border-top: 2px solid #2563eb;">
                    <span class="font-bold">TOTAL ESTIMADO:</span>
                    <span style="font-weight: 900;">${formatM(req.totalEstimated)} MT</span>
                </div>
            </div>
        </div>
    `;

    return generateStandardDocumentHtml({
        title: 'Requisição de Compra',
        config,
        content,
        date: req.date
    });
};

export const generateRequisitionReportHtml = (requisitions: Requisition[], suppliers: Supplier[], config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE REQUISIÇÕES</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>ID</th>
                    <th>Requisitante</th>
                    <th class="text-right">Total Est.</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${requisitions.map(r => `
                    <tr>
                        <td>${formatDate(r.date)}</td>
                        <td class="font-mono">#${r.id.slice(-6)}</td>
                        <td class="font-bold">${r.requester}</td>
                        <td class="text-right font-bold">${formatM(r.totalEstimated)}</td>
                        <td>
                            <span style="font-size: 7pt; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: #f1f5f9; color: #475569;">
                                ${r.status}
                            </span>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Relatório de Requisições',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateCashClosingHtml = (session: CashSession, stats: { expectedCash: number; diff: number }, declaredAmount: number, justification: string, config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">FECHO DE CAIXA / RESUMO DE SESSÃO</div>
            <div style="font-size: 9pt; color: #64748b;">Ref: #${session.id.slice(-6).toUpperCase()} | Operador: ${session.operatorName}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
            <div style="width: 30%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Esperado em Caixa</div>
                <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${formatM(stats.expectedCash)} MT</div>
            </div>
            <div style="width: 30%; background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Informado (Físico)</div>
                <div style="font-size: 11pt; font-weight: 900; color: #1e293b;">${formatM(declaredAmount)} MT</div>
            </div>
            <div style="width: 30%; background: ${stats.diff >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${stats.diff >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 10px; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: ${stats.diff >= 0 ? '#166534' : '#991b1b'}; text-transform: uppercase;">Diferença</div>
                <div style="font-size: 11pt; font-weight: 900; color: ${stats.diff >= 0 ? '#16a34a' : '#dc2626'}">${formatM(stats.diff)} MT</div>
            </div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="font-size: 9pt; font-weight: 800; color: #1e293b; text-transform: uppercase; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">Detalhes da Sessão</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 9pt;">
                <div>
                    <span style="color: #64748b;">Abertura:</span> <span class="font-bold">${formatDateTime(session.startTime)}</span><br>
                    <span style="color: #64748b;">Fecho:</span> <span class="font-bold">${session.endTime ? formatDateTime(session.endTime) : 'N/D'}</span>
                </div>
                <div>
                    <span style="color: #64748b;">Fundo Inicial:</span> <span class="font-bold">${formatM(session.initialBalance)} MT</span><br>
                    <span style="color: #64748b;">Vendas Brutas:</span> <span class="font-bold">${formatM(session.totalSalesSystem)} MT</span>
                </div>
            </div>
        </div>

        ${justification ? `
            <div style="margin-top: 20px; padding: 15px; background: #fffbeb; border: 1px solid #fef3c7; border-radius: 8px;">
                <div style="font-size: 7pt; font-weight: bold; color: #92400e; text-transform: uppercase; margin-bottom: 5px;">Justificação de Divergência</div>
                <div style="font-size: 9pt; color: #92400e; font-style: italic;">${justification}</div>
            </div>
        ` : ''}
    `;

    return generateStandardDocumentHtml({
        title: 'Fecho de Caixa',
        config,
        content,
        date: session.endTime || session.startTime
    });
};

export const generateUserLogReportHtml = (logs: UserLog[], config: AppConfig) => {
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">REGISTO DE ACTIVIDADE DO SISTEMA</div>
            <div style="font-size: 9pt; color: #64748b;">Logs de Auditoria e Segurança</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data/Hora</th>
                    <th>Usuário</th>
                    <th>Ação</th>
                    <th>Módulo</th>
                    <th>Dispositivo</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(l => `
                    <tr>
                        <td style="font-size: 8pt;">${formatDateTime(l.date)}</td>
                        <td class="font-bold">${l.userName}</td>
                        <td>${l.action}</td>
                        <td style="font-size: 8pt; color: #64748b;">${l.module}</td>
                        <td style="font-size: 7pt; color: #94a3b8;">${l.deviceInfo}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Registo de Actividade',
        config,
        content,
        date: new Date().toISOString()
    });
};

export const generateCashHistoryReportHtml = (sessions: CashSession[], config: AppConfig, start?: string, end?: string) => {
    const totalSales = sessions.reduce((acc, s) => acc + s.totalSalesSystem, 0);
    const totalDiff = sessions.reduce((acc, s) => acc + (s.discrepancy || 0), 0);
    
    const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">HISTÓRICO DE FECHOS DE CAIXA</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${start || '---'} a ${end || '---'}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 48%; background: #f1f5f9; border: 1px solid #e2e8f0; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Volume Total de Vendas</div>
                <div style="font-size: 18pt; font-weight: 900; color: #1e293b;">${formatM(totalSales)} MT</div>
            </div>
            <div style="width: 48%; background: ${totalDiff >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${totalDiff >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: ${totalDiff >= 0 ? '#166534' : '#991b1b'}; text-transform: uppercase;">Diferença Líquida Acumulada</div>
                <div style="font-size: 18pt; font-weight: 900; color: ${totalDiff >= 0 ? '#16a34a' : '#dc2626'}">${formatM(totalDiff)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>ID / Operador</th>
                    <th>Abertura</th>
                    <th>Fecho</th>
                    <th class="text-right">Fundo Inicial</th>
                    <th class="text-right">Vendas</th>
                    <th class="text-right">Quebra/Sobra</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.map(s => `
                    <tr>
                        <td>
                            <span class="font-bold">#${s.id.slice(-6)}</span><br>
                            <small style="color: #64748b;">${s.operatorName}</small>
                        </td>
                        <td>${formatDateTime(s.startTime)}</td>
                        <td>${s.endTime ? formatDateTime(s.endTime) : 'EM ABERTO'}</td>
                        <td class="text-right">${formatM(s.initialBalance)}</td>
                        <td class="text-right font-bold">${formatM(s.totalSalesSystem)}</td>
                        <td class="text-right font-bold" style="color: ${s.discrepancy && s.discrepancy < 0 ? '#dc2626' : '#16a34a'}">
                            ${s.discrepancy ? (s.discrepancy > 0 ? '+' : '') + formatM(s.discrepancy) : '0,00'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    return generateStandardDocumentHtml({
        title: 'Histórico de Fechos',
        config,
        content,
        date: new Date().toISOString()
    });
};
