
import { BaseGenerator, formatM, formatDateTime, formatDate } from './base';
import { AppConfig, CashSession, Transaction, Wallet, Sale } from '../../types';

export class Gerador_Tesouraria extends BaseGenerator {
    /**
     * Controle de Caixa: Gerador_Tesouraria_ControleCaixa
     */
    public gerarRelatorioControleCaixa(sessions: CashSession[], config: AppConfig, paymentBreakdown: Record<string, number>, filter?: string) {
        const totalSales = sessions.reduce((acc, s) => acc + s.totalSalesSystem, 0);
        const totalDiff = sessions.reduce((acc, s) => acc + (s.discrepancy || 0), 0);
        
        const methodLabels: Record<string, string> = {
            'CASH': 'Dinheiro',
            'CARD': 'Multicaixa',
            'MPESA': 'M-Pesa',
            'EMOLA': 'E-mola',
            'TRANSFER': 'Transferência',
            'CREDIT_BALANCE': 'Saldo de Crédito'
        };

        const content = `
        <div style="margin-bottom: 25px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">CONTROLE DE CAIXA - RELATÓRIO ACUMULADO</div>
            <div style="font-size: 9pt; color: #64748b; margin-bottom: 15px;">Filtro: ${filter || 'Nenhum'} | Emissão: ${formatDateTime(new Date().toISOString())}</div>
        </div>

        <!-- KPI Cards -->
        <div style="display: flex; justify-content: space-between; margin-bottom: 30px; gap: 15px;">
            <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Volume de Vendas (Sistema)</div>
                <div style="font-size: 20pt; font-weight: 950; color: #1e293b;">${formatM(totalSales)} <span style="font-size: 10pt; font-weight: 600;">MT</span></div>
            </div>
            <div style="flex: 1; background: ${totalDiff >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${totalDiff >= 0 ? '#dcfce7' : '#fee2e2'}; padding: 20px; border-radius: 12px; text-align: center;">
                <div style="font-size: 7.5pt; font-weight: bold; color: ${totalDiff >= 0 ? '#166534' : '#991b1b'}; text-transform: uppercase; margin-bottom: 8px;">Diferença Encontrada (Quebra/Sobra)</div>
                <div style="font-size: 20pt; font-weight: 950; color: ${totalDiff >= 0 ? '#16a34a' : '#dc2626'}">${totalDiff > 0 ? '+' : ''}${formatM(totalDiff)} <span style="font-size: 10pt; font-weight: 600;">MT</span></div>
            </div>
        </div>

        <!-- Payment Detailing Section -->
        <div style="margin-bottom: 30px;">
            <div style="font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Detalhamento Financeiro por Método</div>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px;">
                ${Object.entries(paymentBreakdown).map(([method, amount]) => `
                    <div style="background: #ffffff; border: 1px solid #f1f5f9; padding: 12px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        <span style="font-size: 8.5pt; color: #64748b; font-weight: 600;">${methodLabels[method] || method}</span>
                        <span style="font-size: 10pt; font-weight: 800; color: #1e293b;">${formatM(amount)} MT</span>
                    </div>
                `).join('')}
                ${Object.keys(paymentBreakdown).length === 0 ? '<div style="font-size: 9pt; color: #94a3b8; font-style: italic;">Nenhuma movimentação financeira registada.</div>' : ''}
            </div>
        </div>

        <div style="font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Lista Detalhada de Turnos</div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc;">
                    <th style="padding: 12px 10px; text-align: left; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">ID / OPERADOR</th>
                    <th style="padding: 12px 10px; text-align: left; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">PERÍODO</th>
                    <th style="padding: 12px 10px; text-align: right; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">VENDAS</th>
                    <th style="padding: 12px 10px; text-align: right; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">DIFERENÇA</th>
                </tr>
            </thead>
            <tbody>
                ${sessions.map(s => `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 12px 10px;">
                            <div style="font-weight: 800; font-size: 9pt; color: #1e293b;">#${s.id.slice(-6)}</div>
                            <div style="font-size: 8pt; color: #64748b;">${s.operatorName}</div>
                        </td>
                        <td style="padding: 12px 10px; font-size: 8.5pt; color: #334155;">
                            ${formatDateTime(s.startTime)}<br>
                            <small style="color: #94a3b8;">${s.endTime ? formatDateTime(s.endTime) : 'Sessão Aberta'}</small>
                        </td>
                        <td style="padding: 12px 10px; text-align: right; font-weight: 800; font-size: 9.5pt;">${formatM(s.totalSalesSystem)} MT</td>
                        <td style="padding: 12px 10px; text-align: right; font-weight: 800; font-size: 9.5pt; color: ${s.discrepancy && s.discrepancy < 0 ? '#dc2626' : s.discrepancy && s.discrepancy > 0 ? '#16a34a' : '#64748b'};">
                            ${s.discrepancy ? (s.discrepancy > 0 ? '+' : '') + formatM(s.discrepancy) : '0,00'}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Controle de Caixa',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Transações: Gerador_Tesouraria_Transacoes
     */
    public gerarRelatorioTransacoes(transactions: Transaction[], config: AppConfig, filter?: string) {
        const totalIn = transactions.filter(t => t.type === 'INCOME').reduce((acc, t) => acc + t.amount, 0);
        const totalOut = transactions.filter(t => t.type === 'EXPENSE').reduce((acc, t) => acc + t.amount, 0);

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE TRANSAÇÕES</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filter || 'Nenhum'}</div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 20px;">
            <div style="width: 48%; background: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #166534; text-transform: uppercase;">Total Entradas</div>
                <div style="font-size: 18pt; font-weight: 900; color: #16a34a;">${formatM(totalIn)} MT</div>
            </div>
            <div style="width: 48%; background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 12px;">
                <div style="font-size: 7pt; font-weight: bold; color: #991b1b; text-transform: uppercase;">Total Saídas</div>
                <div style="font-size: 18pt; font-weight: 900; color: #dc2626;">${formatM(totalOut)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição</th>
                    <th>Categoria</th>
                    <th class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${transactions.map(t => `
                    <tr>
                        <td>${formatDate(t.date)}</td>
                        <td>${t.description}</td>
                        <td>${t.category}</td>
                        <td class="text-right font-bold" style="color: ${t.type === 'INCOME' ? '#16a34a' : '#dc2626'}">
                            ${t.type === 'INCOME' ? '+' : '-'}${formatM(t.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Transações',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Despesas: Gerador_Tesouraria_Despesas
     */
    public gerarRelatorioDespesas(transactions: Transaction[], config: AppConfig, filter?: string) {
        const expenses = transactions.filter(t => t.type === 'EXPENSE');
        const total = expenses.reduce((acc, t) => acc + t.amount, 0);

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE DESPESAS E SAÍDAS</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filter || 'Nenhum'}</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">TOTAL: ${formatM(total)} MT</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Descrição / Beneficiário</th>
                    <th>Categoria</th>
                    <th class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${expenses.map(t => `
                    <tr>
                        <td>${formatDate(t.date)}</td>
                        <td>
                            <div class="font-bold">${t.description}</div>
                            ${t.beneficiary ? `<div style="font-size: 7.5pt; color: #64748b;">Beneficiário: ${t.beneficiary}</div>` : ''}
                        </td>
                        <td>${t.category}</td>
                        <td class="text-right font-bold" style="color: #dc2626">
                            ${formatM(t.amount)}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Despesas',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Comprovativo de Saída Individual: Gerador_Tesouraria_Comprovativo
     */
    public gerarComprovativoDespesa(t: Transaction, config: AppConfig) {
        const content = `
        <div style="border: 2px solid #1e3a8a; padding: 30px; border-radius: 12px; background: #fff; margin-bottom: 20px;">
            <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #f1f5f9; padding-bottom: 15px;">
                <div style="font-size: 16pt; font-weight: 950; color: #1e3a8a; text-transform: uppercase; letter-spacing: 1px;">Comprovativo de Saída de Caixa</div>
                <div style="font-size: 9pt; color: #64748b; margin-top: 5px;">Documento para Controle Interno - #${t.id.slice(-6).toUpperCase()}</div>
            </div>

            <div style="margin-bottom: 30px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Data da Operação</span>
                        <div style="font-size: 11pt; font-weight: 700;">${formatDate(t.date)}</div>
                    </div>
                    <div style="flex: 1; text-align: right;">
                        <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Valor Pago</span>
                        <div style="font-size: 16pt; font-weight: 900; color: #dc2626;">${formatM(t.amount)} MT</div>
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Descrição da Despesa</span>
                    <div style="font-size: 11pt; font-weight: 700; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-top: 5px;">
                        ${t.description}
                    </div>
                </div>

                <div style="margin-bottom: 20px;">
                    <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Beneficiário / Recebedor</span>
                    <div style="font-size: 11pt; font-weight: 700; border-bottom: 1px dashed #cbd5e1; padding: 5px 0;">
                        ${t.beneficiary || '________________________________________________'}
                    </div>
                    <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 3px;">Pessoa ou Entidade que recebeu o valor especificado.</div>
                </div>

                <div style="display: flex; gap: 20px;">
                    <div style="flex: 1;">
                        <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Categoria</span>
                        <div style="font-size: 10pt; font-weight: 700;">${t.category}</div>
                    </div>
                    <div style="flex: 1;">
                        <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">Método de Saída</span>
                        <div style="font-size: 10pt; font-weight: 700;">${t.method || 'CASH'}</div>
                    </div>
                </div>
            </div>

            <div style="margin-top: 60px; display: flex; justify-content: space-between; gap: 40px;">
                <div style="flex: 1; text-align: center;">
                    <div style="border-top: 1px solid #1e293b; padding-top: 8px; font-size: 9pt; font-weight: bold;">Assinatura do Responsável</div>
                    <div style="font-size: 7pt; color: #64748b; text-transform: uppercase; margin-top: 2px;">(Autorizado por: ${t.operatorName || 'Administração'})</div>
                </div>
                <div style="flex: 1; text-align: center;">
                    <div style="border-top: 1px solid #1e293b; padding-top: 8px; font-size: 9pt; font-weight: bold;">Assinatura do Beneficiário</div>
                    <div style="font-size: 7pt; color: #64748b; text-transform: uppercase; margin-top: 2px;">(Recebi em: ____ / ____ / ________)</div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 40px; font-size: 7pt; color: #94a3b8; font-style: italic;">
                Este documento serve exclusivamente para fins de controle interno da empresa ${config.companyName}.
            </div>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Comprovativo de Despesa',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Bancos: Gerador_Tesouraria_Bancos
     */
    public gerarExtratoBancos(config: AppConfig, wallets: Wallet[], transactions: Transaction[], startDate?: string, endDate?: string, walletId?: string) {
        const filteredTransactions = transactions.filter(t => {
            const dateStr = t.date.split('T')[0];
            const inDateRange = (!startDate || dateStr >= startDate) && (!endDate || dateStr <= endDate);
            const forWallet = !walletId || t.walletId === walletId;
            return inDateRange && forWallet;
        });

        const totalBalance = wallets.reduce((acc, w) => acc + w.balance, 0);
        const filterStr = `${startDate || 'Início'} à ${endDate || 'Hoje'}${walletId ? ` | Carteira: ${walletId}` : ''}`;

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">EXTRATO DE CARTEIRAS E BANCOS</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filterStr}</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">SALDO TOTAL ATUAL: ${formatM(totalBalance)} MT</div>
        </div>

        <div style="margin-bottom: 20px;">
            <div style="font-size: 10pt; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">SALDOS POR CARTEIRA</div>
            <table>
                <thead>
                    <tr>
                        <th>Nome da Carteira</th>
                        <th>Tipo</th>
                        <th class="text-right">Saldo Atual</th>
                    </tr>
                </thead>
                <tbody>
                    ${wallets.map(w => `
                        <tr>
                            <td class="font-bold">${w.name}</td>
                            <td>${w.type}</td>
                            <td class="text-right font-bold">${formatM(w.balance)} MT</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div>
            <div style="font-size: 10pt; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">ÚLTIMAS TRANSAÇÕES</div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Descrição</th>
                        <th class="text-right">Valor</th>
                    </tr>
                </thead>
                <tbody>
                    ${filteredTransactions.slice(0, 100).map(t => {
                        const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
                        return `
                        <tr>
                            <td>${formatDate(t.date)}</td>
                            <td>${t.description}</td>
                            <td class="text-right font-bold" style="color: ${isIncoming ? '#16a34a' : '#dc2626'}">
                                ${isIncoming ? '+' : '-'}${formatM(t.amount)}
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Extrato de Bancos',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Recebimentos: Gerador_Tesouraria_Recebimentos
     */
    public gerarRelatorioRecebimentos(sales: Sale[], config: AppConfig, filter?: string) {
        const total = sales.reduce((acc, s) => acc + s.total, 0);

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE RECEBIMENTOS</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filter || 'Nenhum'}</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">TOTAL RECEBIDO: ${formatM(total)} MT</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>Método</th>
                    <th class="text-right">Valor</th>
                </tr>
            </thead>
            <tbody>
                ${sales.map(s => `
                    <tr>
                        <td>${formatDate(s.date)}</td>
                        <td>${s.customerName || 'Consumidor Final'}</td>
                        <td>${s.paymentMethod}</td>
                        <td class="text-right font-bold">${formatM(s.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Recebimentos',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Relatórios: Gerador_Tesouraria_Relatorios
     */
    public gerarDemonstracaoFinanceira(kpis: { totalRevenue?: number; salesRevenue: number; otherIncome: number; totalExpenses: number; netResult: number }, config: AppConfig) {
        const totalIn = kpis.totalRevenue || (kpis.salesRevenue + kpis.otherIncome);
        const totalOut = kpis.totalExpenses;
        const profit = kpis.netResult;

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">DEMONSTRAÇÃO FINANCEIRA SIMPLIFICADA</div>
        </div>

        <div style="background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 25px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span style="font-weight: 600; color: #64748b;">TOTAL DE ENTRADAS (RECEITAS)</span>
                <span style="font-weight: 900; color: #16a34a;">${formatM(totalIn)} MT</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <span style="font-weight: 600; color: #64748b;">TOTAL DE SAÍDAS (DESPESAS)</span>
                <span style="font-weight: 900; color: #dc2626;">- ${formatM(totalOut)} MT</span>
            </div>
            <div style="border-top: 2px solid #cbd5e1; padding-top: 15px; display: flex; justify-content: space-between;">
                <span style="font-size: 14pt; font-weight: 900; color: #1e293b;">LUCRO LÍQUIDO / SALDO</span>
                <span style="font-size: 14pt; font-weight: 900; color: ${profit >= 0 ? '#16a34a' : '#dc2626'};">${formatM(profit)} MT</span>
            </div>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Demonstração Financeira',
            config,
            content,
            metadata: 'Tesouraria'
        });

        this.printHtml(html);
    }

    /**
     * Extrato Individual de Carteira / Conta: Gerador_Tesouraria_ExtratoWallet
     */
    public gerarExtratoIndividualWallet(
        wallet: Wallet,
        allTransactions: Transaction[],
        startDate: string,
        endDate: string,
        config: AppConfig
    ) {
        // 1. Filter transactions belonging to this wallet and sort them newest to oldest to compute running balances backwards
        const walletTxSorted = allTransactions
            .filter(t => t.walletId === wallet.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Map transaction id to its computed running balance
        const runningBalances: Record<string, number> = {};
        let currentTempBalance = wallet.balance;

        walletTxSorted.forEach(t => {
            runningBalances[t.id] = currentTempBalance;
            const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
            if (isIncoming) {
                currentTempBalance -= t.amount;
            } else {
                currentTempBalance += t.amount;
            }
        });

        // The remaining currentTempBalance is the balance before any transaction in history.
        // Let's filter transactions within the selected date range and sort them chronologically (oldest to newest)
        const start = startDate ? new Date(startDate).setHours(0,0,0,0) : 0;
        const end = endDate ? new Date(endDate).setHours(23,59,59,999) : Infinity;

        const periodTransactions = walletTxSorted
            .filter(t => {
                const time = new Date(t.date).getTime();
                return time >= start && time <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate period stats
        const totalIn = periodTransactions
            .filter(t => t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE'))
            .reduce((acc, t) => acc + t.amount, 0);

        const totalOut = periodTransactions
            .filter(t => t.type === 'EXPENSE' || (t.type === 'TRANSFER' && t.transferType === 'SEND'))
            .reduce((acc, t) => acc + t.amount, 0);

        // Balance before the first transaction in this period
        // If there are transactions in this period, the balance before the first one is runningBalance - amount
        let startingBalance = currentTempBalance;
        if (periodTransactions.length > 0) {
            const firstTx = periodTransactions[0];
            const firstTxIsIncoming = firstTx.type === 'INCOME' || (firstTx.type === 'TRANSFER' && firstTx.transferType === 'RECEIVE');
            startingBalance = runningBalances[firstTx.id] - (firstTxIsIncoming ? firstTx.amount : -firstTx.amount);
        }
        const endingBalance = periodTransactions.length > 0 ? runningBalances[periodTransactions[periodTransactions.length - 1].id] : startingBalance;

        const dateRangeStr = `${startDate ? formatDate(startDate) : 'Início'} a ${endDate ? formatDate(endDate) : 'Fim'}`;

        const content = `
        <div style="margin-bottom: 25px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase;">Extrato de Conta - ${wallet.name}</div>
            <div style="font-size: 9pt; color: #64748b; font-weight: 600;">Período: ${dateRangeStr} | Emissão: ${formatDateTime(new Date().toISOString())}</div>
        </div>

        <!-- Wallet Info and Balances -->
        <div style="display: flex; gap: 15px; margin-bottom: 25px;">
            <div style="flex: 1; background: #f8fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px;">
                <div style="font-size: 7.5pt; font-weight: bold; color: #64748b; text-transform: uppercase; margin-bottom: 5px;">Saldo Inicial</div>
                <div style="font-size: 14pt; font-weight: 900; color: #334155;">${formatM(startingBalance)} MT</div>
            </div>
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #dcfce7; padding: 15px; border-radius: 10px;">
                <div style="font-size: 7.5pt; font-weight: bold; color: #166534; text-transform: uppercase; margin-bottom: 5px;">Total Entradas (+)</div>
                <div style="font-size: 14pt; font-weight: 900; color: #16a34a;">+${formatM(totalIn)} MT</div>
            </div>
            <div style="flex: 1; background: #fef2f2; border: 1px solid #fee2e2; padding: 15px; border-radius: 10px;">
                <div style="font-size: 7.5pt; font-weight: bold; color: #991b1b; text-transform: uppercase; margin-bottom: 5px;">Total Saídas (-)</div>
                <div style="font-size: 14pt; font-weight: 900; color: #dc2626;">-${formatM(totalOut)} MT</div>
            </div>
            <div style="flex: 1; background: #f8fafc; border: 1px solid #2563eb; padding: 15px; border-radius: 10px;">
                <div style="font-size: 7.5pt; font-weight: bold; color: #2563eb; text-transform: uppercase; margin-bottom: 5px;">Saldo Final</div>
                <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a;">${formatM(endingBalance)} MT</div>
            </div>
        </div>

        <!-- Transactions Table -->
        <div style="font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 15px; text-transform: uppercase; letter-spacing: 0.5px;">Movimentações da Conta</div>
        <table style="width: 100%; border-collapse: collapse;">
            <thead>
                <tr style="background: #f8fafc;">
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">Data</th>
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">Descrição / Documento</th>
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0;">Categoria</th>
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0; text-align: right;">Crédito (Entrada)</th>
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0; text-align: right;">Débito (Saída)</th>
                    <th style="padding: 10px; font-size: 8pt; color: #475569; border-bottom: 2px solid #e2e8f0; text-align: right;">Saldo Acumulado</th>
                </tr>
            </thead>
            <tbody>
                ${periodTransactions.map(t => {
                    const isIncoming = t.type === 'INCOME' || (t.type === 'TRANSFER' && t.transferType === 'RECEIVE');
                    return `
                    <tr style="border-bottom: 1px solid #f1f5f9;">
                        <td style="padding: 10px; font-size: 8.5pt; color: #334155;">${formatDateTime(t.date)}</td>
                        <td style="padding: 10px; font-size: 8.5pt; color: #1e293b; font-weight: 500;">
                            <div>${t.description}</div>
                            ${t.reference ? `<span style="font-size: 7.5pt; color: #64748b; font-weight: bold;">Ref: ${t.reference}</span>` : ''}
                        </td>
                        <td style="padding: 10px; font-size: 8.5pt; color: #64748b;">${t.category}</td>
                        <td style="padding: 10px; font-size: 8.5pt; text-align: right; font-weight: bold; color: #16a34a;">
                            ${isIncoming ? `${formatM(t.amount)}` : ''}
                        </td>
                        <td style="padding: 10px; font-size: 8.5pt; text-align: right; font-weight: bold; color: #dc2626;">
                            ${!isIncoming ? `${formatM(t.amount)}` : ''}
                        </td>
                        <td style="padding: 10px; font-size: 8.5pt; text-align: right; font-weight: 800; color: #1e293b;">
                            ${formatM(runningBalances[t.id])} MT
                        </td>
                    </tr>
                    `;
                }).join('')}
                ${periodTransactions.length === 0 ? `
                    <tr>
                        <td colspan="6" style="padding: 20px; text-align: center; color: #94a3b8; font-style: italic;">
                            Nenhuma movimentação registada para esta conta no período selecionado.
                        </td>
                    </tr>
                ` : ''}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: `Extrato de Conta - ${wallet.name}`,
            config,
            content,
            metadata: `Extrato Bancário (${wallet.type})`
        });

        this.printHtml(html);
    }
}
