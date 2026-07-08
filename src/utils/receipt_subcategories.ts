
import { AppConfig, Sale, Product } from '../types';

const formatM = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

export const generateSubcategorySalesReportHtml = (sales: Sale[], config: AppConfig, startDate: string, endDate: string) => {
    // 1. Agrupar dados por subcategoria
    const stats: Record<string, { qty: number, revenue: number, mainCategory: string }> = {};
    let grandTotalRevenue = 0;

    sales.forEach(sale => {
        sale.items.forEach(item => {
            const sub = item.subcategory || 'Sem Subcategoria';
            if (!stats[sub]) {
                stats[sub] = { qty: 0, revenue: 0, mainCategory: item.category };
            }
            const itemRevenue = item.price * item.quantity;
            stats[sub].qty += item.quantity;
            stats[sub].revenue += itemRevenue;
            grandTotalRevenue += itemRevenue;
        });
    });

    const sortedSubcats = Object.entries(stats).sort((a, b) => b[1].revenue - a[1].revenue);

    return `
    <html>
    <head>
        <style>
            @page { size: A4 portrait; margin: 15mm; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; line-height: 1.5; font-size: 9pt; margin: 0; padding: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
            .company h1 { margin: 0; font-size: 18pt; color: #1e3a8a; font-weight: 900; }
            .company p { margin: 2px 0; color: #64748b; font-weight: 600; }
            .title { text-align: right; }
            .title h2 { margin: 0; font-size: 14pt; color: #3b82f6; font-weight: 800; }
            
            .summary-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; justify-content: space-between; border: 1px solid #e2e8f0; }
            .summary-item label { display: block; font-size: 7pt; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .summary-item span { font-size: 12pt; font-weight: 900; color: #1e3a8a; }

            table { width: 100%; border-collapse: collapse; }
            th { background: #f8fafc; color: #475569; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; padding: 12px; border-bottom: 2px solid #e2e8f0; text-align: left; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
            
            .progress-container { width: 100%; background: #e2e8f0; height: 6px; border-radius: 10px; margin-top: 4px; overflow: hidden; }
            .progress-bar { height: 100%; background: #3b82f6; border-radius: 10px; }
            
            .footer { margin-top: 50px; text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 15px; }
            .badge { background: #dbeafe; color: #1e40af; padding: 2px 6px; border-radius: 4px; font-size: 7pt; font-weight: 800; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company">
                <h1>${config.companyName}</h1>
                <p>NUIT: ${config.nif} | Relatório de Inteligência de Vendas</p>
            </div>
            <div class="title">
                <h2>ANÁLISE POR SUBCATEGORIA</h2>
                <p style="font-size: 8pt; font-weight: bold; color: #94a3b8;">PERÍODO: ${startDate} A ${endDate}</p>
            </div>
        </div>

        <div class="summary-box">
            <div class="summary-item">
                <label>Faturamento Total Analisado</label>
                <span>${formatM(grandTotalRevenue)} MT</span>
            </div>
            <div class="summary-item">
                <label>Total de Subcategorias</label>
                <span>${sortedSubcats.length}</span>
            </div>
            <div class="summary-item" style="text-align: right;">
                <label>Data de Emissão</label>
                <span style="font-size: 9pt;">${formatDateTime(new Date().toISOString())}</span>
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th style="width: 35%;">Subcategoria / Principal</th>
                    <th style="width: 15%; text-align: center;">Qtd Vendida</th>
                    <th style="width: 20%; text-align: right;">Volume (MZN)</th>
                    <th style="width: 30%;">Market Share (%)</th>
                </tr>
            </thead>
            <tbody>
                ${sortedSubcats.map(([name, data]) => {
                    const share = grandTotalRevenue > 0 ? (data.revenue / grandTotalRevenue) * 100 : 0;
                    return `
                    <tr>
                        <td>
                            <div style="font-weight: 800; font-size: 10pt;">${name}</div>
                            <div style="font-size: 7.5pt; color: #94a3b8; margin-top: 2px;">Grupo: ${data.mainCategory}</div>
                        </td>
                        <td style="text-align: center; font-weight: 700; color: #475569;">${data.qty}</td>
                        <td style="text-align: right; font-weight: 900; color: #1e3a8a;">${formatM(data.revenue)}</td>
                        <td>
                            <div style="display: flex; justify-content: space-between; font-size: 7.5pt; font-weight: 800;">
                                <span>${share.toFixed(1)}%</span>
                            </div>
                            <div class="progress-container">
                                <div class="progress-bar" style="width: ${share}%;"></div>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('')}
            </tbody>
        </table>

        <div class="footer">
            Este documento é para fins de análise estratégica e uso interno.<br>
            ERP Gestão Comercial &copy; 2026 - Inteligência de Negócio
        </div>
    </body>
    </html>
    `;
};

/**
 * Gera Tabela de Preços Agrupada por Subcategoria (A4)
 */
export const generateSubcategoryPriceListHtml = (products: Product[], config: AppConfig, mode: 'PUBLIC' | 'INTERNAL') => {
    const groups: Record<string, Product[]> = {};
    
    products.forEach(p => {
        const sub = p.subcategory || 'Sem Subcategoria';
        if (!groups[sub]) groups[sub] = [];
        groups[sub].push(p);
    });

    const sortedSubcats = Object.keys(groups).sort();

    return `
    <html>
    <head>
        <style>
            @page { size: A4 portrait; margin: 12mm; }
            body { font-family: 'Inter', sans-serif; color: #0f172a; line-height: 1.4; font-size: 9pt; margin: 0; padding: 0; }
            .header { display: flex; justify-content: space-between; border-bottom: 2px solid #2563eb; padding-bottom: 10px; margin-bottom: 20px; }
            .company h1 { margin: 0; font-size: 16pt; color: #1e3a8a; font-weight: 900; }
            .company p { margin: 1px 0; color: #64748b; font-size: 8pt; font-weight: 600; }
            .title { text-align: right; }
            .title h2 { margin: 0; font-size: 14pt; color: #2563eb; font-weight: 800; text-transform: uppercase; }
            
            .sub-section { margin-bottom: 25px; break-inside: avoid; }
            .sub-header { background: #f1f5f9; padding: 6px 10px; border-left: 4px solid #2563eb; font-weight: 800; font-size: 10pt; color: #1e3a8a; margin-bottom: 10px; text-transform: uppercase; }
            
            table { width: 100%; border-collapse: collapse; }
            th { border-bottom: 1px solid #e2e8f0; color: #64748b; font-size: 7pt; font-weight: 800; text-transform: uppercase; padding: 8px 10px; text-align: left; }
            td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
            
            .price { font-weight: 900; color: #1e3a8a; white-space: nowrap; }
            .code { font-family: monospace; color: #94a3b8; font-size: 8pt; }
            .stock-alert { color: #dc2626; font-weight: bold; }
            
            .footer { margin-top: 40px; text-align: center; font-size: 7pt; color: #94a3b8; border-top: 1px dashed #e2e8f0; padding-top: 15px; }
        </style>
    </head>
    <body>
        <div class="header">
            <div class="company">
                <h1>${config.companyName}</h1>
                <p>NIF: ${config.nif} | Moeda: ${config.currency}</p>
                <p>${config.companyAddress || ''}</p>
            </div>
            <div class="title">
                <h2>${mode === 'PUBLIC' ? 'Catálogo de Preços' : 'Tabela Técnica de Stock'}</h2>
                <p style="font-size: 7pt; color: #94a3b8;">GERADO EM: ${formatDateTime(new Date().toISOString())}</p>
            </div>
        </div>

        ${sortedSubcats.map(sub => `
            <div class="sub-section">
                <div class="sub-header">${sub}</div>
                <table>
                    <thead>
                        <tr>
                            <th style="width: 15%">Código</th>
                            <th style="width: 50%">Descrição</th>
                            ${mode === 'INTERNAL' ? '<th style="width: 15%; text-align: center;">Stock</th>' : ''}
                            <th style="width: 20%; text-align: right;">Preço Unitário</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${groups[sub].map(p => `
                            <tr>
                                <td class="code">${p.code}</td>
                                <td>
                                    <div style="font-weight: 700;">${p.name}</div>
                                    <div style="font-size: 7pt; color: #64748b;">${p.brand || '-'} | ${p.category}</div>
                                </td>
                                ${mode === 'INTERNAL' ? `
                                    <td style="text-align: center; font-weight: bold;" class="${p.stock <= p.minStock ? 'stock-alert' : ''}">
                                        ${p.stock}
                                    </td>
                                ` : ''}
                                <td style="text-align: right;" class="price">${formatM(p.price)} MT</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}

        <div class="footer">
            Este documento é de uso ${mode === 'INTERNAL' ? 'CONFIDENCIAL E INTERNO' : 'INFORMATIVO PARA CLIENTES'}.<br>
            ERP Gestão Comercial &copy; 2026 - Processado eletronicamente.
        </div>
    </body>
    </html>
    `;
};
