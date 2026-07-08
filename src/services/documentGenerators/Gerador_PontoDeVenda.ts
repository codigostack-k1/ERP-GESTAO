
import { BaseGenerator, formatM, formatDateTime } from './base';
import { AppConfig, Sale, CashSession } from '../../types';

export class Gerador_PontoDeVenda extends BaseGenerator {
    /**
     * Geração de talão térmico (80mm) usando HTML para impressão direta
     */
    public gerarFaturaSimplificada(sale: Sale, config: AppConfig) {
        const itemsHtml = sale.items.map(item => `
            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold; font-size: 8.5pt;">
                    <span style="flex: 1; padding-right: 5px;">${item.name.toUpperCase()}</span>
                    <span>${formatM(item.price * item.quantity)}</span>
                </div>
                ${item.description ? `<div style="font-size: 7.5pt; color: #4b5563; margin-top: 1px;">${item.description}</div>` : ''}
                <div style="font-size: 8pt; color: #4b5563;">
                    ${item.quantity} x ${formatM(item.price)}
                </div>
            </div>
        `).join('');

        const totalIVA = sale.items.reduce((acc, item) => {
            const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
            const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
            const itemTotal = item.price * item.quantity;
            return acc + (isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0);
        }, 0);

        const content = `
            <div style="width: 72mm; margin: 0 auto; font-family: 'Courier New', Courier, monospace; color: black; line-height: 1.2;">
                <!-- Header -->
                <div style="text-align: center; margin-bottom: 10px;">
                    <div style="font-size: 11pt; font-weight: 900; margin-bottom: 2px;">${config.companyName.toUpperCase()}</div>
                    <div style="font-size: 8.5pt;">NUIT: ${config.nif}</div>
                    <div style="font-size: 8.5pt;">Tel: ${config.companyContact || 'N/A'}</div>
                    <div style="font-size: 8.5pt; margin-top: 2px;">${config.companyAddress || ''}</div>
                </div>

                <div style="border-top: 1px dashed black; margin: 8px 0;"></div>

                <!-- Info -->
                <div style="font-size: 8.5pt; margin-bottom: 8px;">
                    <div style="display: flex; justify-content: space-between;">
                        <span><strong>RECIBO №:</strong></span>
                        <span>${sale.id.slice(-8).toUpperCase()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Data:</span>
                        <span>${formatDateTime(sale.date)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Operador:</span>
                        <span>${sale.userId.slice(-4).toUpperCase()}</span>
                    </div>
                </div>

                <div style="border-top: 1px solid black; margin: 8px 0;"></div>

                <!-- Table Header -->
                <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 8.5pt; margin-bottom: 5px;">
                    <span>DESCRIÇÃO</span>
                    <span>TOTAL (MT)</span>
                </div>

                <!-- Items -->
                <div style="margin-bottom: 10px;">
                    ${itemsHtml}
                </div>

                <div style="border-top: 1px dashed black; margin: 8px 0;"></div>

                <!-- Totals -->
                <div style="font-size: 9pt;">
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11pt; margin-bottom: 4px;">
                        <span>TOTAL A PAGAR:</span>
                        <span>${formatM(sale.total)}</span>
                    </div>
                    ${config.ivaEnabled ? `
                    <div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 2px;">
                        <span>Inclui IVA (${config.ivaRate}%):</span>
                        <span>${formatM(totalIVA)}</span>
                    </div>
                    ` : ''}
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <span>Recebido:</span>
                        <span>${formatM(sale.amountTendered || sale.total)}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: bold;">
                        <span>Troco:</span>
                        <span>${formatM(sale.change || 0)}</span>
                    </div>
                </div>

                <div style="border-top: 1px dashed black; margin: 12px 0;"></div>

                <!-- Footer -->
                <div style="text-align: center; font-size: 8pt; font-style: italic;">
                    <div>Obrigado pela sua preferência!</div>
                    <div>Volte sempre.</div>
                    <div style="margin-top: 4px; font-size: 7pt; font-style: normal;">Processado por Sistema Codigo Stack</div>
                </div>
            </div>
        `;

        // Create specialized CSS for thermal printing
        const thermalCss = `
            @page { 
                size: 80mm auto; 
                margin: 0; 
            }
            body { 
                margin: 0; 
                padding: 4mm;
                width: 80mm;
            }
            @media print {
                body { width: 80mm; }
            }
        `;

        const html = `
            <html>
            <head>
                <meta charset="UTF-8">
                <style>${thermalCss}</style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;

        this.printHtml(html);
    }

    /**
     * Relatórios de fecho de caixa diário
     */
    public gerarFechoCaixa(
        session: CashSession, 
        config: AppConfig, 
        paymentBreakdown: Record<string, number>, 
        productBreakdown: { name: string; quantity: number; total: number }[]
    ) {
        const methodLabels: Record<string, string> = {
            'CASH': 'Dinheiro',
            'CARD': 'Multicaixa',
            'MPESA': 'M-Pesa',
            'EMOLA': 'E-mola',
            'TRANSFER': 'Transferência',
            'CREDIT_BALANCE': 'Saldo de Crédito'
        };

        const content = `
        <div style="margin-bottom: 25px; border-bottom: 2px solid #1e3a8a; padding-bottom: 10px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">FECHO DE CAIXA INDIVIDUAL</div>
            <div style="display: flex; justify-content: space-between; font-size: 8.5pt; color: #64748b;">
                <span>ID: <strong>#${session.id.slice(-6)}</strong></span>
                <span>Operador: <strong>${session.operatorName}</strong></span>
            </div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 3px;">
                Período: ${formatDateTime(session.startTime)} - ${session.endTime ? formatDateTime(session.endTime) : 'EM ABERTO'}
            </div>
        </div>

        <!-- Resumo Financeiro Curto -->
        <table style="width: 100%; margin-bottom: 25px; font-size: 9pt;">
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Saldo Inicial (Fundo):</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatM(session.initialBalance)} MT</td>
            </tr>
            <tr style="border-bottom: 1px solid #f1f5f9;">
                <td style="padding: 8px 0; color: #64748b;">Total de Vendas Registradas:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: bold;">${formatM(session.totalSalesSystem)} MT</td>
            </tr>
            <tr style="border-bottom: 2px solid #1e3a8a;">
                <td style="padding: 8px 0; font-weight: 900; color: #1e3a8a;">VALOR EM CAIXA DECLARADO:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 900; color: #1e3a8a; font-size: 11pt;">${formatM(session.finalBalanceDeclared || 0)} MT</td>
            </tr>
            <tr>
                <td style="padding: 12px 0; font-weight: 800; color: ${session.discrepancy && session.discrepancy < 0 ? '#dc2626' : '#16a34a'};">DIFERENÇA (QUEBRA/SOBRA):</td>
                <td style="padding: 12px 0; text-align: right; font-weight: 900; color: ${session.discrepancy && session.discrepancy < 0 ? '#dc2626' : '#16a34a'}; font-size: 11pt;">
                    ${session.discrepancy ? (session.discrepancy > 0 ? '+' : '') + formatM(session.discrepancy) : '0,00'} MT
                </td>
            </tr>
        </table>

        <!-- Entradas por Método de Pagamento -->
        <div style="margin-bottom: 30px;">
            <div style="font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Entradas por Método</div>
            <table style="width: 100%; font-size: 8.5pt;">
                ${Object.entries(paymentBreakdown).map(([method, amount]) => `
                    <tr style="border-bottom: 1px solid #f8fafc;">
                        <td style="padding: 6px 0; color: #334155;">${methodLabels[method] || method}</td>
                        <td style="padding: 6px 0; text-align: right; font-weight: bold;">${formatM(amount)} MT</td>
                    </tr>
                `).join('')}
            </table>
        </div>

        <!-- Relatório de Vendas por Produto -->
        <div style="margin-bottom: 20px;">
            <div style="font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; margin-bottom: 10px; text-transform: uppercase;">Resumo de Cenas (Por Item)</div>
            <table style="width: 100%; font-size: 8pt; border-collapse: collapse;">
                <thead>
                    <tr style="background: #f8fafc;">
                        <th style="padding: 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">PRODUTO</th>
                        <th style="padding: 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">QTD</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 1px solid #e2e8f0;">TOTAL</th>
                    </tr>
                </thead>
                <tbody>
                    ${productBreakdown.map(p => `
                        <tr style="border-bottom: 1px solid #f1f5f9;">
                            <td style="padding: 8px; font-weight: 600;">${p.name}</td>
                            <td style="padding: 8px; text-align: center;">${p.quantity}</td>
                            <td style="padding: 8px; text-align: right; font-weight: 700;">${formatM(p.total)} MT</td>
                        </tr>
                    `).join('')}
                    ${productBreakdown.length === 0 ? '<tr><td colspan="3" style="padding: 15px; text-align: center; color: #94a3b8; font-style: italic;">Nenhuma venda realizada neste turno.</td></tr>' : ''}
                </tbody>
            </table>
        </div>

        ${session.justification ? `
            <div style="margin-top: 25px; padding: 15px; background: #fffcf0; border: 1px solid #fef3c7; border-radius: 8px;">
                <div style="font-size: 8pt; font-weight: bold; color: #92400e; margin-bottom: 5px; text-transform: uppercase;">Justificativa de Diferença:</div>
                <div style="font-size: 9pt; color: #78350f;">${session.justification}</div>
            </div>
        ` : ''}
        `;

        const html = this.generateStandardHtml({
            title: 'Fecho de Caixa',
            config,
            content,
            metadata: 'Ponto de Venda'
        });

        this.printHtml(html);
    }
}
