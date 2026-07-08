
import { BaseGenerator, formatM, formatDate } from './base';
import { AppConfig, Product, Customer, Sale } from '../../types';

export class Gerador_Vendas extends BaseGenerator {
    /**
     * Preços: Gerador_Vendas_Precos
     */
    public gerarTabelaPrecos(products: Product[], config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">TABELA DE PREÇOS ATUALIZADA</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th>Categoria</th>
                    <th class="text-right">Preço</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td>${p.name}</td>
                        <td>${p.category}</td>
                        <td class="text-right font-bold">${formatM(p.price)} MT</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Tabela de Preços',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Lista Técnica Completa: Gerador_Vendas_ListaTecnicaCompleta
     */
    public gerarListaTecnicaCompleta(products: Product[], config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">LISTA TÉCNICA DE PRODUTOS</div>
            <div style="font-size: 9pt; color: #64748b;">Relatório detalhado de especificações e valores.</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 15%">Código B.</th>
                    <th style="width: 20%">Nome</th>
                    <th style="width: 35%">Descrição</th>
                    <th style="width: 15%" class="text-right">P. Compra</th>
                    <th style="width: 15%" class="text-right">P. Venda</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td class="font-bold text-blue-700">${p.name.toUpperCase()}</td>
                        <td style="font-size: 8pt; color: #475569;">${p.description || '-'}</td>
                        <td class="text-right">${formatM(p.cost)}</td>
                        <td class="text-right font-bold text-blue-600">${formatM(p.price)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Lista Técnica de Produtos',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Lista Técnica (Individual): Gerador_Vendas_ListaTecnica
     */
    public gerarFichaTecnica(product: Product, config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">FICHA TÉCNICA DO PRODUTO</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">${product.name}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                <div style="font-size: 8pt; font-weight: bold; color: #64748b;">CÓDIGO</div>
                <div style="font-size: 12pt; font-weight: 900;">${product.code}</div>
            </div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                <div style="font-size: 8pt; font-weight: bold; color: #64748b;">CATEGORIA</div>
                <div style="font-size: 12pt; font-weight: 900;">${product.category}</div>
            </div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                <div style="font-size: 8pt; font-weight: bold; color: #64748b;">MARCA</div>
                <div style="font-size: 12pt; font-weight: 900;">${product.brand || 'N/A'}</div>
            </div>
            <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
                <div style="font-size: 8pt; font-weight: bold; color: #64748b;">PREÇO VENDA</div>
                <div style="font-size: 12pt; font-weight: 900;">${formatM(product.price)} MT</div>
            </div>
        </div>

        <div style="margin-top: 20px;">
            <div style="font-size: 10pt; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">DESCRIÇÃO / ESPECIFICAÇÕES</div>
            <div style="font-size: 9pt; color: #1e293b; line-height: 1.6; border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px;">
                ${product.description || 'Nenhuma descrição disponível para este produto.'}
            </div>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Ficha Técnica',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Produtos: Gerador_Vendas_Produtos
     */
    public gerarCatalogoProdutos(products: Product[], config: AppConfig, filter?: string) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">CATÁLOGO DE PRODUTOS</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filter || 'Nenhum'}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Nome</th>
                    <th>Marca</th>
                    <th>Categoria</th>
                    <th class="text-right">Preço</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td>${p.name}</td>
                        <td>${p.brand || '-'}</td>
                        <td>${p.category}</td>
                        <td class="text-right font-bold">${formatM(p.price)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Catálogo de Produtos',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Lista Negra: Gerador_Vendas_ListaNegra
     */
    public gerarRelatorioListaNegra(products: Product[], config: AppConfig) {
        const blacklisted = products.filter(p => p.isBlacklisted);
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #dc2626; margin-bottom: 5px;">RELATÓRIO DE PRODUTOS BLOQUEADOS (LISTA NEGRA)</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th>Motivo do Bloqueio</th>
                </tr>
            </thead>
            <tbody>
                ${blacklisted.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td>${p.name}</td>
                        <td style="color: #dc2626;">${p.blacklistReason || 'Bloqueio administrativo'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Lista Negra de Produtos',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Clientes: Gerador_Vendas_Clientes
     */
    public gerarMapaGeralClientes(customers: Customer[], config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">MAPA GERAL DE CLIENTES</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Nome</th>
                    <th>NIF</th>
                    <th>Contacto</th>
                    <th class="text-right">Saldo</th>
                </tr>
            </thead>
            <tbody>
                ${customers.map(c => `
                    <tr>
                        <td class="font-bold">${c.name}</td>
                        <td>${c.nif || '-'}</td>
                        <td>${c.phone || '-'}</td>
                        <td class="text-right font-bold">${formatM(c.creditBalance - c.debt)} MT</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Mapa de Clientes',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    public gerarExtractoCliente(customer: Customer, sales: Sale[], config: AppConfig) {
        const totalDebt = customer.debt;
        const totalCredit = customer.creditBalance;
        const balance = totalCredit - totalDebt;

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">EXTRATO DE CONTA DE CLIENTE</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">${customer.name}</div>
            <div style="font-size: 9pt; color: #64748b;">NIF: ${customer.nif || 'N/A'} | Telefone: ${customer.phone || 'N/A'}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 20px;">
            <div style="background: #fef2f2; padding: 15px; border-radius: 8px; border: 1px solid #fee2e2;">
                <div style="font-size: 8pt; font-weight: bold; color: #991b1b;">DÍVIDA TOTAL</div>
                <div style="font-size: 12pt; font-weight: 900; color: #991b1b;">${formatM(totalDebt)} MT</div>
            </div>
            <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #dcfce7;">
                <div style="font-size: 8pt; font-weight: bold; color: #166534;">SALDO A FAVOR</div>
                <div style="font-size: 12pt; font-weight: 900; color: #166534;">${formatM(totalCredit)} MT</div>
            </div>
            <div style="background: ${balance >= 0 ? '#f0fdf4' : '#fef2f2'}; padding: 15px; border-radius: 8px; border: 1px solid ${balance >= 0 ? '#dcfce7' : '#fee2e2'};">
                <div style="font-size: 8pt; font-weight: bold; color: ${balance >= 0 ? '#166534' : '#991b1b'};">SALDO LÍQUIDO</div>
                <div style="font-size: 12pt; font-weight: 900; color: ${balance >= 0 ? '#166534' : '#991b1b'};">${formatM(balance)} MT</div>
            </div>
        </div>

        <div style="font-size: 10pt; font-weight: bold; color: #1e3a8a; margin-bottom: 10px;">HISTÓRICO RECENTE DE VENDAS</div>
        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Documento</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${sales.length > 0 ? sales.map(s => `
                    <tr>
                        <td>${formatDate(s.date)}</td>
                        <td class="font-bold">#${s.id.slice(-6)}</td>
                        <td class="text-right font-bold">${formatM(s.total)} MT</td>
                    </tr>
                `).join('') : '<tr><td colspan="3" class="text-center">Nenhuma venda registada para este cliente.</td></tr>'}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Extrato de Cliente',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Relatórios: Gerador_Vendas_Relatorios
     */
    public gerarExtratoVendas(sales: Sale[], config: AppConfig, filter?: string) {
        const total = sales.reduce((acc, s) => acc + s.total, 0);

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">EXTRATO DE VENDAS DETALHADO</div>
            <div style="font-size: 9pt; color: #64748b;">Filtro: ${filter || 'Nenhum'}</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">TOTAL VENDIDO: ${formatM(total)} MT</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>ID Venda</th>
                    <th>Cliente</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${sales.map(s => `
                    <tr>
                        <td>${formatDate(s.date)}</td>
                        <td class="font-bold">#${s.id.slice(-6)}</td>
                        <td>${s.customerName || 'Consumidor Final'}</td>
                        <td class="text-right font-bold">${formatM(s.total)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Extrato de Vendas',
            config,
            content,
            metadata: 'Vendas'
        });

        this.printHtml(html);
    }

    /**
     * Resumo Fiscal de Apuramento de IVA
     */
    public gerarRelatorioFiscalResumo(fiscalSummary: any, config: AppConfig, dateRange: { start: string, end: string }) {
        const t = fiscalSummary.totals;
        const resultLabel = t.finalAmount === 0 
            ? 'Apuramento Nulo / Equilibrado'
            : t.isPayable
                ? 'IVA A PAGAR AO ESTADO'
                : 'IVA A RECUPERAR (CRÉDITO FISCAL)';
        const resultColor = t.finalAmount === 0 
            ? '#475569'
            : t.isPayable
                ? '#dc2626'
                : '#16a34a';

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase;">Apuramento de IVA - Resumo</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}</div>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ESTADO DO IMPOSTO</div>
                <div style="font-size: 14pt; font-weight: 900; color: ${resultColor}; margin-top: 4px;">${resultLabel}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">SALDO FINAL DO PERÍODO</div>
                <div style="font-size: 18pt; font-weight: 900; color: ${resultColor}; margin-top: 4px;">${formatM(t.finalAmount)} MT</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fff;">
                <h3 style="margin: 0 0 12px 0; font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase;">VENDAS (IVA LIQUIDADO)</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Faturação Bruta Total:</span>
                    <span style="font-weight: bold;">${formatM(t.salesGross)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Base Incidente de IVA:</span>
                    <span style="font-weight: bold;">${formatM(t.salesIncidence)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Isenções de IVA:</span>
                    <span style="font-weight: bold; color: #b45309;">${formatM(t.salesExempt)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 10pt; font-weight: 900;">
                    <span style="color: #1e293b;">Total IVA Liquidado:</span>
                    <span style="color: #dc2626;">${formatM(t.salesVatLiquidado)} MT</span>
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fff;">
                <h3 style="margin: 0 0 12px 0; font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase;">COMPRAS (IVA DEDUTÍVEL)</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Compras Brutas Totais:</span>
                    <span style="font-weight: bold;">${formatM(t.entriesGross)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Base Incidente de IVA:</span>
                    <span style="font-weight: bold;">${formatM(t.entriesIncidence)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Isenções de IVA:</span>
                    <span style="font-weight: bold; color: #b45309;">${formatM(t.entriesExempt)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 10pt; font-weight: 900;">
                    <span style="color: #1e293b;">Total IVA Dedutível:</span>
                    <span style="color: #16a34a;">${formatM(t.entriesVatDeductible)} MT</span>
                </div>
            </div>
        </div>

        <div style="font-size: 8pt; color: #64748b; font-style: italic; line-height: 1.4; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            Nota: Este relatório foi gerado de acordo com a taxa nominal de IVA de ${fiscalSummary.rate}%. As transações marcadas como isentas ou com IVA desabilitado foram excluídas dos cálculos de incidência e apuramento respetivos.
        </div>
        `;

        const html = this.generateStandardHtml({
            title: `Resumo de Apuramento de IVA`,
            config,
            content,
            metadata: 'Fiscal'
        });

        this.printHtml(html);
    }

    /**
     * Relatório Detalhado de IVA sobre Vendas
     */
    public gerarRelatorioFiscalVendas(fiscalSummary: any, config: AppConfig, dateRange: { start: string, end: string }) {
        const list = fiscalSummary.sales;
        const t = fiscalSummary.totals;

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase;">IVA sobre Vendas (Liquidado)</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Incidência</span>
                <div style="font-size: 12pt; font-weight: 900; margin-top: 2px;">${formatM(t.salesIncidence)} MT</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Isenções</span>
                <div style="font-size: 12pt; font-weight: 900; color: #b45309; margin-top: 2px;">${formatM(t.salesExempt)} MT</div>
            </div>
            <div style="background: #fef2f2; padding: 12px; border-radius: 6px; border: 1px solid #fee2e2;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #991b1b; text-transform: uppercase;">Total IVA Liquidado</span>
                <div style="font-size: 12pt; font-weight: 900; color: #dc2626; margin-top: 2px;">${formatM(t.salesVatLiquidado)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>ID Venda</th>
                    <th class="text-right">Valor Bruto</th>
                    <th class="text-right">Base Incidente</th>
                    <th class="text-right">Isento</th>
                    <th class="text-right" style="color: #dc2626;">IVA Liquidado</th>
                </tr>
            </thead>
            <tbody>
                ${list.length === 0 ? `
                    <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">Nenhum registo no período selecionado.</td></tr>
                ` : list.map((s: any) => `
                    <tr>
                        <td>${formatDate(s.date)}</td>
                        <td class="font-bold">#${s.id.slice(-8)}</td>
                        <td class="text-right">${formatM(s.gross)}</td>
                        <td class="text-right">${formatM(s.incidence)}</td>
                        <td class="text-right" style="color: #b45309;">${s.exempt > 0 ? formatM(s.exempt) : '-'}</td>
                        <td class="text-right font-bold" style="color: #dc2626;">${formatM(s.vat)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: `Extrato Fiscal de Vendas`,
            config,
            content,
            metadata: 'Vendas - Fiscal'
        });

        this.printHtml(html);
    }

    /**
     * Relatório Detalhado de IVA sobre Compras/Entradas
     */
    public gerarRelatorioFiscalCompras(fiscalSummary: any, config: AppConfig, dateRange: { start: string, end: string }) {
        const list = fiscalSummary.entries;
        const t = fiscalSummary.totals;

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase;">IVA sobre Compras (Dedutível)</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; margin-bottom: 25px;">
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Incidência</span>
                <div style="font-size: 12pt; font-weight: 900; margin-top: 2px;">${formatM(t.entriesIncidence)} MT</div>
            </div>
            <div style="background: #f8fafc; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #64748b; text-transform: uppercase;">Isenções</span>
                <div style="font-size: 12pt; font-weight: 900; color: #b45309; margin-top: 2px;">${formatM(t.entriesExempt)} MT</div>
            </div>
            <div style="background: #f0fdf4; padding: 12px; border-radius: 6px; border: 1px solid #dcfce7;">
                <span style="font-size: 7.5pt; font-weight: 800; color: #166534; text-transform: uppercase;">Total IVA Dedutível</span>
                <div style="font-size: 12pt; font-weight: 900; color: #16a34a; margin-top: 2px;">${formatM(t.entriesVatDeductible)} MT</div>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Doc / Fatura</th>
                    <th>Fornecedor</th>
                    <th class="text-right">Custo Bruto</th>
                    <th class="text-right">Base Incidente</th>
                    <th class="text-right">Isento</th>
                    <th class="text-right" style="color: #16a34a;">IVA Dedutível</th>
                </tr>
            </thead>
            <tbody>
                ${list.length === 0 ? `
                    <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Nenhum registo no período selecionado.</td></tr>
                ` : list.map((e: any) => `
                    <tr>
                        <td>${formatDate(e.date)}</td>
                        <td class="font-bold">${e.invoiceNo || `ENT-${e.id.slice(-6)}`}</td>
                        <td>${e.supplierName}</td>
                        <td class="text-right">${formatM(e.gross)}</td>
                        <td class="text-right">${formatM(e.incidence)}</td>
                        <td class="text-right" style="color: #b45309;">${e.exempt > 0 ? formatM(e.exempt) : '-'}</td>
                        <td class="text-right font-bold" style="color: #16a34a;">${formatM(e.vat)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: `Extrato Fiscal de Compras / Entradas`,
            config,
            content,
            metadata: 'Compras - Fiscal'
        });

        this.printHtml(html);
    }

    /**
     * Relatório Fiscal Completo Unificado (Apuramento + Vendas + Compras)
     */
    public gerarRelatorioFiscalCompleto(fiscalSummary: any, config: AppConfig, dateRange: { start: string, end: string }) {
        const t = fiscalSummary.totals;
        const resultLabel = t.finalAmount === 0 
            ? 'Apuramento Nulo / Equilibrado'
            : t.isPayable
                ? 'IVA A PAGAR AO ESTADO'
                : 'IVA A RECUPERAR (CRÉDITO FISCAL)';
        const resultColor = t.finalAmount === 0 
            ? '#475569'
            : t.isPayable
                ? '#dc2626'
                : '#16a34a';

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 14pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px; text-transform: uppercase;">Apuramento de IVA - Relatório Completo</div>
            <div style="font-size: 9pt; color: #64748b;">Período: ${formatDate(dateRange.start)} a ${formatDate(dateRange.end)}</div>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">ESTADO DO IMPOSTO</div>
                <div style="font-size: 14pt; font-weight: 900; color: ${resultColor}; margin-top: 4px;">${resultLabel}</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 8pt; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">SALDO FINAL DO PERÍODO</div>
                <div style="font-size: 18pt; font-weight: 900; color: ${resultColor}; margin-top: 4px;">${formatM(t.finalAmount)} MT</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fff;">
                <h3 style="margin: 0 0 12px 0; font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase;">VENDAS (IVA LIQUIDADO)</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Faturação Bruta Total:</span>
                    <span style="font-weight: bold;">${formatM(t.salesGross)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Base Incidente de IVA:</span>
                    <span style="font-weight: bold;">${formatM(t.salesIncidence)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Isenções de IVA:</span>
                    <span style="font-weight: bold; color: #b45309;">${formatM(t.salesExempt)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 10pt; font-weight: 900;">
                    <span style="color: #1e293b;">Total IVA Liquidado:</span>
                    <span style="color: #dc2626;">${formatM(t.salesVatLiquidado)} MT</span>
                </div>
            </div>

            <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #fff;">
                <h3 style="margin: 0 0 12px 0; font-size: 10pt; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; text-transform: uppercase;">COMPRAS (IVA DEDUTÍVEL)</h3>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Compras Brutas Totais:</span>
                    <span style="font-weight: bold;">${formatM(t.entriesGross)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Base Incidente de IVA:</span>
                    <span style="font-weight: bold;">${formatM(t.entriesIncidence)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 9pt;">
                    <span style="color: #64748b;">Isenções de IVA:</span>
                    <span style="font-weight: bold; color: #b45309;">${formatM(t.entriesExempt)} MT</span>
                </div>
                <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e8f0; padding-top: 8px; margin-top: 8px; font-size: 10pt; font-weight: 900;">
                    <span style="color: #1e293b;">Total IVA Dedutível:</span>
                    <span style="color: #16a34a;">${formatM(t.entriesVatDeductible)} MT</span>
                </div>
            </div>
        </div>

        <div style="page-break-before: always; margin-top: 30px;">
            <div style="font-size: 11pt; font-weight: 900; color: #1e3a8a; margin-bottom: 10px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; text-transform: uppercase;">Anexo I: Detalhe de IVA sobre Vendas (${fiscalSummary.sales.length} registos)</div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>ID Venda</th>
                        <th class="text-right">Valor Bruto</th>
                        <th class="text-right">Base Incidente</th>
                        <th class="text-right">Isento</th>
                        <th class="text-right" style="color: #dc2626;">IVA Liquidado</th>
                    </tr>
                </thead>
                <tbody>
                    ${fiscalSummary.sales.length === 0 ? `
                        <tr><td colspan="6" style="text-align: center; color: #64748b; padding: 20px;">Nenhum registo de venda no período.</td></tr>
                    ` : fiscalSummary.sales.map((s: any) => `
                        <tr>
                            <td>${formatDate(s.date)}</td>
                            <td class="font-bold">#${s.id.slice(-8)}</td>
                            <td class="text-right">${formatM(s.gross)}</td>
                            <td class="text-right">${formatM(s.incidence)}</td>
                            <td class="text-right" style="color: #b45309;">${s.exempt > 0 ? formatM(s.exempt) : '-'}</td>
                            <td class="text-right font-bold" style="color: #dc2626;">${formatM(s.vat)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div style="page-break-before: always; margin-top: 30px;">
            <div style="font-size: 11pt; font-weight: 900; color: #1e3a8a; margin-bottom: 10px; border-bottom: 2px solid #2563eb; padding-bottom: 4px; text-transform: uppercase;">Anexo II: Detalhe de IVA sobre Compras / Entradas (${fiscalSummary.entries.length} registos)</div>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Doc / Fatura</th>
                        <th>Fornecedor</th>
                        <th class="text-right">Custo Bruto</th>
                        <th class="text-right">Base Incidente</th>
                        <th class="text-right">Isento</th>
                        <th class="text-right" style="color: #16a34a;">IVA Dedutível</th>
                    </tr>
                </thead>
                <tbody>
                    ${fiscalSummary.entries.length === 0 ? `
                        <tr><td colspan="7" style="text-align: center; color: #64748b; padding: 20px;">Nenhum registo de entrada no período.</td></tr>
                    ` : fiscalSummary.entries.map((e: any) => `
                        <tr>
                            <td>${formatDate(e.date)}</td>
                            <td class="font-bold">${e.invoiceNo || `ENT-${e.id.slice(-6)}`}</td>
                            <td>${e.supplierName}</td>
                            <td class="text-right">${formatM(e.gross)}</td>
                            <td class="text-right">${formatM(e.incidence)}</td>
                            <td class="text-right" style="color: #b45309;">${e.exempt > 0 ? formatM(e.exempt) : '-'}</td>
                            <td class="text-right font-bold" style="color: #16a34a;">${formatM(e.vat)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: `Relatório Fiscal Unificado de IVA`,
            config,
            content,
            metadata: 'Fiscal - Completo'
        });

        this.printHtml(html);
    }
}

