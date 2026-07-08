
import { BaseGenerator } from './base';
import { AppConfig, Sale } from '../../types';
import { PDFService } from '../pdfService';

export class Gerador_Facturacao extends BaseGenerator {
    /**
     * Emissão de faturas, faturas-recibo usando jsPDF
     */
    public gerarFactura(sale: Sale, config: AppConfig, _type: 'FACTURA' | 'FACTURA-RECIBO' = 'FACTURA') {
        // Find customer if available in types (not always passed here, but PDFService handles undefined)
        PDFService.generateInvoicePDF(sale, config, undefined, undefined);
    }
}
