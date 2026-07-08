
import { AppConfig } from '../../types';

export const formatM = (val: number) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString('pt-PT');
export const formatDateTime = (iso: string) => new Date(iso).toLocaleDateString('pt-PT') + ' ' + new Date(iso).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

export interface GeneratorOptions {
    config: AppConfig;
    [key: string]: unknown;
}

export abstract class BaseGenerator {
    protected generateStandardHtml(options: {
        title: string;
        config: AppConfig;
        content: string;
        metadata?: string;
        date?: string;
    }) {
        const { title, config, content, metadata = 'Original', date = new Date().toISOString() } = options;
        
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
                .header { 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: flex-start; 
                    border-bottom: 2px solid #2563eb; 
                    padding-bottom: 15px; 
                    margin-bottom: 20px; 
                }
                .company-info h1 { margin: 0; font-size: 16pt; color: #1e3a8a; text-transform: uppercase; font-weight: 900; }
                .company-info p { margin: 1px 0; font-size: 8.5pt; color: #64748b; font-weight: 600; }
                .doc-title-container h2 { margin: 0; font-size: 16pt; color: #2563eb; font-weight: 900; text-transform: uppercase; }
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
                .meta-label { font-weight: 800; display: block; text-transform: uppercase; font-size: 6.5pt; color: #64748b; }
                .meta-value { font-weight: 700; color: #1e293b; font-size: 9pt; }
                table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                th { background: #f1f5f9; color: #475569; font-size: 7.5pt; font-weight: 900; text-transform: uppercase; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; text-align: left; }
                td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 8.5pt; }
                .text-right { text-align: right; }
                .footer { margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8pt; color: #64748b; text-align: center; }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="company-info">
                    <h1>${config.companyName}</h1>
                    <p>NUIT: ${config.nif}</p>
                    <p>${config.companyAddress || ''}</p>
                </div>
                <div class="doc-title-container">
                    <h2>${title}</h2>
                </div>
            </div>
            <div class="meta-section">
                <div class="meta-item"><span class="meta-label">Data</span><span class="meta-value">${formatDate(date)}</span></div>
                <div class="meta-item"><span class="meta-label">Hora</span><span class="meta-value">${new Date(date).toLocaleTimeString('pt-PT')}</span></div>
                <div class="meta-item"><span class="meta-label">Tipo</span><span class="meta-value">${metadata}</span></div>
                <div class="meta-item"><span class="meta-label">Página</span><span class="meta-value">1/1</span></div>
            </div>
            <div class="content">
                ${content}
            </div>
            <div class="footer">
                ${config.companyName} &copy; 2026 - ERP Gestão Comercial
            </div>
        </body>
        </html>
        `;
    }

    protected printHtml(html: string) {
        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => {
                win.print();
                win.close();
            }, 500);
        }
    }
}
