
import { BaseGenerator, formatM, formatDateTime } from './base';
import { AppConfig, StockEntry, StockExit, Requisition, Product, Supplier, StockAudit, StockAuditItem } from '../../types';

export class Gerador_Armazem extends BaseGenerator {
    /**
     * Entradas: Gerador_Armazem_Entradas
     */
    public gerarGuiaEntrada(entry: StockEntry, config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">GUIA DE ENTRADA DE STOCK #${entry.id.slice(-6)}</div>
            <div style="font-size: 9pt; color: #64748b;">Fornecedor: ${entry.supplierName}</div>
            <div style="font-size: 9pt; color: #64748b;">Data: ${formatDateTime(entry.date)}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-right">Qtd</th>
                    <th class="text-right">Custo Unit.</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${entry.items.map(item => `
                    <tr>
                        <td class="font-bold">${item.productCode}</td>
                        <td>${item.productName}</td>
                        <td class="text-right">${item.quantity}</td>
                        <td class="text-right">${formatM(item.cost)}</td>
                        <td class="text-right font-bold">${formatM(item.cost * item.quantity)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 20px; border-top: 2px solid #cbd5e1; padding-top: 10px; display: flex; justify-content: space-between;">
            <span style="font-size: 14pt; font-weight: 900;">VALOR TOTAL DA GUIA</span>
            <span style="font-size: 14pt; font-weight: 900;">${formatM(entry.totalAmount)} MT</span>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Guia de Entrada',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Saídas: Gerador_Armazem_Saidas
     */
    public gerarGuiaSaida(exit: StockExit, config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">GUIA DE SAÍDA DE STOCK #${exit.id.slice(-6)}</div>
            <div style="font-size: 9pt; color: #64748b;">Data: ${formatDateTime(exit.date)}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-right">Qtd Saída</th>
                </tr>
            </thead>
            <tbody>
                ${exit.items.map(item => `
                    <tr>
                        <td class="font-bold">${item.productCode}</td>
                        <td>${item.productName}</td>
                        <td class="text-right font-bold">${item.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Guia de Saída',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Requisição: Gerador_Armazem_Requisicao
     */
    public gerarRequisicaoInterna(req: Requisition, config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">REQUISIÇÃO INTERNA DE MATERIAL #${req.id.slice(-6)}</div>
            <div style="font-size: 9pt; color: #64748b;">Requisitante: ${req.requester}</div>
            <div style="font-size: 9pt; color: #64748b;">Data: ${formatDateTime(req.date)}</div>
            <div style="font-size: 9pt; font-weight: bold; color: #2563eb; margin-top: 5px;">Status: ${req.status}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Produto</th>
                    <th class="text-right">Qtd Requisitada</th>
                </tr>
            </thead>
            <tbody>
                ${req.items.map(item => `
                    <tr>
                        <td>${item.productName}</td>
                        <td class="text-right font-bold">${item.quantity}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <div style="margin-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
            <div style="border-top: 1px solid #1e293b; text-align: center; padding-top: 5px; font-size: 8pt;">Assinatura do Requisitante</div>
            <div style="border-top: 1px solid #1e293b; text-align: center; padding-top: 5px; font-size: 8pt;">Assinatura do Responsável</div>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Requisição Interna',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Inventário: Gerador_Armazem_Inventario
     */
    public gerarRelatorioInventario(products: Product[], config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE INVENTÁRIO FÍSICO</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-right">Stock Sistema</th>
                    <th class="text-right">Stock Físico</th>
                    <th class="text-right">Diferença</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td>${p.name}</td>
                        <td class="text-right">${p.stock}</td>
                        <td style="border-bottom: 1px solid #cbd5e1; width: 80px;"></td>
                        <td style="border-bottom: 1px solid #cbd5e1; width: 80px;"></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Inventário',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Auditoria: Gerador_Armazem_Auditoria
     */
    public gerarRelatorioAuditoria(audit: StockAudit, config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE AUDITORIA DE STOCK #${audit.id.slice(-6)}</div>
            <div style="font-size: 9pt; color: #64748b;">Auditor: ${audit.auditorName}</div>
            <div style="font-size: 9pt; color: #64748b;">Data: ${formatDateTime(audit.dateCreated)}</div>
            <div style="font-size: 9pt; font-weight: bold; color: #2563eb; margin-top: 5px;">Status: ${audit.status}</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Produto</th>
                    <th class="text-right">Sistema</th>
                    <th class="text-right">Contado</th>
                    <th class="text-right">Diferença</th>
                    <th class="text-right">Impacto</th>
                </tr>
            </thead>
            <tbody>
                ${audit.items.map((item: StockAuditItem) => {
                    const diff = (item.countedStock || 0) - item.systemStock;
                    const impact = diff * (diff > 0 ? item.salePrice : item.costPrice);
                    return `
                    <tr>
                        <td>${item.productName}</td>
                        <td class="text-right">${item.systemStock}</td>
                        <td class="text-right">${item.countedStock ?? '-'}</td>
                        <td class="text-right font-bold ${diff < 0 ? 'text-red-600' : diff > 0 ? 'text-green-600' : ''}">${diff}</td>
                        <td class="text-right">${formatM(impact)}</td>
                    </tr>
                `}).join('')}
            </tbody>
        </table>

        <div style="margin-top: 20px; border-top: 2px solid #cbd5e1; padding-top: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                <span>Total de Perdas (Quebras):</span>
                <span style="color: #ef4444; font-weight: bold;">${formatM(audit.totalValueLoss)} MT</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Total de Excedentes (Sobras):</span>
                <span style="color: #10b981; font-weight: bold;">${formatM(audit.totalValueSurplus)} MT</span>
            </div>
        </div>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Auditoria',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Stock: Gerador_Armazem_Stock
     */
    public gerarRelatorioStock(products: Product[], config: AppConfig) {
        const totalValue = products.reduce((acc, p) => acc + (p.stock * p.cost), 0);

        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">RELATÓRIO DE STOCK ATUAL</div>
            <div style="font-size: 14pt; font-weight: 900; margin-top: 10px;">VALOR TOTAL EM STOCK: ${formatM(totalValue)} MT</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Código</th>
                    <th>Produto</th>
                    <th class="text-right">Stock</th>
                    <th class="text-right">Custo Médio</th>
                    <th class="text-right">Valor Stock</th>
                </tr>
            </thead>
            <tbody>
                ${products.map(p => `
                    <tr>
                        <td class="font-bold">${p.code}</td>
                        <td>${p.name}</td>
                        <td class="text-right font-bold">${p.stock}</td>
                        <td class="text-right">${formatM(p.cost)}</td>
                        <td class="text-right font-bold">${formatM(p.stock * p.cost)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Relatório de Stock',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }

    /**
     * Fornecedores: Gerador_Armazem_Fornecedores
     */
    public gerarListaFornecedores(suppliers: Supplier[], config: AppConfig) {
        const content = `
        <div style="margin-bottom: 20px;">
            <div style="font-size: 12pt; font-weight: 900; color: #1e3a8a; margin-bottom: 5px;">LISTA DE FORNECEDORES CADASTRADOS</div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Nome / Empresa</th>
                    <th>NIF</th>
                    <th>Contacto</th>
                    <th>Email</th>
                </tr>
            </thead>
            <tbody>
                ${suppliers.map(s => `
                    <tr>
                        <td class="font-bold">${s.name}</td>
                        <td>${s.nif || '-'}</td>
                        <td>${s.contact || '-'}</td>
                        <td>${s.email || '-'}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;

        const html = this.generateStandardHtml({
            title: 'Lista de Fornecedores',
            config,
            content,
            metadata: 'Armazém'
        });

        this.printHtml(html);
    }
}
