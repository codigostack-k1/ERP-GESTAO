import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Sale, AppConfig, Customer, User } from '../types';
import { StorageService } from './storageService';

export class PDFService {
  private static formatCurrency(val: number): string {
    return new Intl.NumberFormat('pt-PT', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    }).format(val) + ' MT';
  }

  static async generateInvoicePDF(
    sale: Sale, 
    config: AppConfig, 
    customer: Customer | undefined, 
    user: User | undefined
  ) {
    const doc = new jsPDF();
    const invoiceNo = sale.id;
    const pageMargin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Helper to draw the header on each page
    const drawHeader = (_data: { pageNumber: number }) => {
      if (sale.status === 'VOID') {
        doc.setFontSize(70);
        doc.setTextColor(254, 226, 226); 
        doc.setFont('helvetica', 'bold');
        doc.text('ANULADA', pageWidth / 2, pageHeight / 2, { align: 'center', angle: 45 });
      }

      doc.setFontSize(14);
      doc.setTextColor(37, 99, 235);
      doc.setFont('helvetica', 'bold');
      
      let logoY = pageMargin;
      let drawnCompanyInLogo = false;
      if (config.logo) {
        try {
          doc.addImage(config.logo, 'PNG', pageMargin, logoY, 40, 20);
          logoY += 25;
        } catch (err) {
          console.warn('Failed to load company logo:', err instanceof Error ? err.message : 'Unknown error');
          doc.text(config.companyName, pageMargin, logoY + 5);
          logoY += 12;
          drawnCompanyInLogo = true;
        }
      } else {
        doc.text(config.companyName, pageMargin, logoY + 5);
        logoY += 12;
        drawnCompanyInLogo = true;
      }

      if (!drawnCompanyInLogo) {
        doc.setFontSize(10);
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.text(config.companyName, pageMargin, logoY);
      }
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(config.companyDescription || 'Desenvolvedora de Software & Website', pageMargin, logoY + 5);
      
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Nuit: ${config.nif}`, pageMargin, logoY + 12);
      doc.text(`Endereço: ${config.companyAddress || 'Liberdade 1826, Matola, Maputo'}`, pageMargin, logoY + 17, { maxWidth: 95 });
      doc.text(`Telefone: ${config.companyContact || '+258 84 264 1083 / +258 86 254 1083'}`, pageMargin, logoY + 22, { maxWidth: 95 });
      doc.text(`Email: ${config.companyEmail || 'codigostack@gmail.com'}`, pageMargin, logoY + 27, { maxWidth: 95 });

      doc.setFontSize(18);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text('FACTURA Nº', pageWidth - pageMargin, pageMargin, { align: 'right' });
      
      doc.setFontSize(14);
      doc.setTextColor(55, 65, 81);
      doc.text(invoiceNo, pageWidth - pageMargin, pageMargin + 8, { align: 'right' });
      
      const customerBoxY = pageMargin + 25;
      doc.setDrawColor(0);
      doc.setLineWidth(0.1);
      doc.rect(pageWidth - 95, customerBoxY, 80, 25);
      
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text('CLIENTE', pageWidth - 92, customerBoxY + 5);
      
      doc.setFontSize(10);
      doc.setTextColor(17, 24, 39);
      doc.setFont('helvetica', 'bold');
      doc.text(`Exmo.(s) Sr.(s) ${customer?.name || 'Consumidor Final'}`, pageWidth - 92, customerBoxY + 10, { maxWidth: 74 });
      
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text(`Endereço: ${customer?.address || 'N/D'}`, pageWidth - 92, customerBoxY + 15, { maxWidth: 74 });
      doc.text(`Nuit: ${customer?.nif || 'N/D'}`, pageWidth - 92, customerBoxY + 19, { maxWidth: 74 });
      doc.text(`Telefone: ${customer?.phone || 'N/D'}`, pageWidth - 92, customerBoxY + 23, { maxWidth: 74 });

      const barY = customerBoxY + 35;
      doc.setDrawColor(0);
      doc.setLineWidth(0.5);
      doc.line(pageMargin, barY, pageWidth - pageMargin, barY);
      doc.line(pageMargin, barY + 12, pageWidth - pageMargin, barY + 12);
      
      const colWidth = (pageWidth - 2 * pageMargin) / 6;
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'bold');
      
      // Resolve operator name permanently from Sale's userId to prevent other logged in users from switching it on reprint
      let operatorName = 'Sistema';
      if (sale.userId) {
        const matchingUser = StorageService.getUsers().find(u => u.id === sale.userId);
        operatorName = matchingUser ? matchingUser.name : (user?.name || 'Sistema');
      } else {
        operatorName = user?.name || 'Sistema';
      }

      const dueDate = (() => {
        const d = new Date(sale.date);
        if (sale.status !== 'PAID') {
          d.setMonth(d.getMonth() + 1);
          d.setDate(d.getDate() + 10);
        }
        return d.toLocaleDateString('pt-PT');
      })();

      const labels = ['DOCUMENTO', 'OPERADOR', 'DATA', 'CONDIÇÃO PAG.', 'VENCIMENTO', 'ESTADO'];
      const values = [
          'Original',
          operatorName,
          new Date(sale.date).toLocaleDateString('pt-PT'),
          sale.status === 'PAID' ? 'Pronto Pagamento' : 'A Prazo',
          dueDate,
          sale.status === 'PAID' ? 'Fatura Paga' : (sale.status === 'VOID' ? 'Anulada' : 'Pendente')
      ];

      for (let i = 0; i < 6; i++) {
        doc.text(labels[i], pageMargin + i * colWidth + colWidth / 2, barY + 4, { align: 'center' });
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text(values[i], pageMargin + i * colWidth + colWidth / 2, barY + 9, { align: 'center', maxWidth: colWidth - 2 });
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
      }
    };

    const tableRows = sale.items.map(item => {
      const itemTotal = item.price * item.quantity;
      const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
      const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
      return [
        item.code,
        item.description ? `${item.name}\n${item.description}` : item.name,
        item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('pt-PT') : 'N/D',
        item.quantity.toFixed(2),
        this.formatCurrency(item.price),
        `${rate}%`,
        this.formatCurrency(itemTotal)
      ];
    });

    // CORREÇÃO 1: startY ajustado para 90 para evitar sobreposição com a barra de detalhes
    autoTable(doc, {
      startY: 90, 
      head: [['C. BARRAS', 'DESCRIÇÃO', 'PR. VALIDADE', 'QTD.', 'P. UNIT', 'TAXA IVA', 'TOTAL C/ IVA']],
      body: tableRows,
      margin: { top: 90, bottom: 40 },
      styles: { fontSize: 8, cellPadding: 2, font: 'helvetica' },
      headStyles: { fillColor: [249, 250, 251], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.1, lineColor: [0, 0, 0] },
      bodyStyles: { textColor: [31, 41, 55], lineWidth: 0.05, lineColor: [243, 244, 246] },
      columnStyles: {
        0: { cellWidth: 22, halign: 'left' },
        1: { cellWidth: 'auto', halign: 'left' },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 14, halign: 'center' },
        4: { cellWidth: 24, halign: 'right' },
        5: { cellWidth: 18, halign: 'right' },
        6: { cellWidth: 28, halign: 'right' }
      },
      didDrawPage: (data) => {
        drawHeader(data);
        doc.setFontSize(7);
        doc.setTextColor(156, 163, 175);
        const footerText = `Documento Processado por Computador / Codigo Stack® / ${new Date().toLocaleString('pt-PT')}`;
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });
      },
    });

    const lastAutoTable = (doc as any).lastAutoTable;
    const finalY = lastAutoTable ? lastAutoTable.finalY + 10 : 90;
    
    let currentY = finalY;
    if (currentY + 70 > pageHeight - 20) {
      doc.addPage();
      currentY = 90;
    }

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DO IVA', pageMargin, currentY);
    
    const ivaGroups: Record<number, { incidence: number, iva: number }> = {};
    sale.items.forEach(item => {
      const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
      const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
      const itemTotal = item.price * item.quantity;
      const itemIva = isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0;
      const incidence = itemTotal - itemIva;
      
      if (!ivaGroups[rate]) ivaGroups[rate] = { incidence: 0, iva: 0 };
      ivaGroups[rate].incidence += incidence;
      ivaGroups[rate].iva += itemIva;
    });

    const ivaRows = Object.entries(ivaGroups).map(([rate, data]) => [
      `${rate}%`,
      this.formatCurrency(data.incidence),
      this.formatCurrency(data.iva)
    ]);
    
    autoTable(doc, {
      startY: currentY + 3,
      head: [['TAXA', 'INCIDÊNCIA', 'TOTAL IVA']],
      body: ivaRows,
      tableWidth: 80,
      styles: { fontSize: 7, cellPadding: 1, lineWidth: 0.1, lineColor: [0, 0, 0] },
      headStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { halign: 'center' }, 1: { halign: 'right' }, 2: { halign: 'right' } },
      margin: { left: pageMargin }
    });

    // CORREÇÃO 2: Posicionamento dos totais baseado no fim da tabela de resumo para evitar sobreposição
    const totalsTableEndY = (doc as any).lastAutoTable.finalY;
    const totalsX = pageWidth - 90;
    
    const totalIVA = sale.items.reduce((acc, item) => {
      const isIvaEnabled = config.ivaEnabled && (item.ivaEnabled !== false);
      const rate = isIvaEnabled ? (config.ivaRate || 0) : 0;
      const itemTotal = item.price * item.quantity;
      return acc + (isIvaEnabled ? itemTotal * (rate / (100 + rate)) : 0);
    }, 0);
    const totalLiquido = sale.total - totalIVA;

    // Alinhar os totais com o topo da tabela de resumo para um aspeto mais limpo
    let totalsY = currentY + 10;

    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Líquido:', totalsX, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatCurrency(totalLiquido), pageWidth - pageMargin, totalsY, { align: 'right' });

    totalsY += 6;
    doc.setFont('helvetica', 'bold');
    doc.text('Total IVA:', totalsX, totalsY);
    doc.setFont('helvetica', 'normal');
    doc.text(this.formatCurrency(totalIVA), pageWidth - pageMargin, totalsY, { align: 'right' });

    totalsY += 4;
    doc.setDrawColor(0);
    doc.setLineWidth(0.5);
    doc.line(totalsX, totalsY, pageWidth - pageMargin, totalsY);

    totalsY += 8;
    doc.setFontSize(12);
    doc.setTextColor(37, 99, 235);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Geral:', totalsX, totalsY);
    doc.text(this.formatCurrency(sale.total), pageWidth - pageMargin, totalsY, { align: 'right' });

    // Métodos de Pagamento e Info Adicional
    currentY = Math.max(totalsTableEndY, totalsY) + 10;
    
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('MÉTODOS DE PAGAMENTO', totalsX, currentY);
    
    const activeMethods = (config.paymentMethods || []).filter(m => m.isActive);
    let pIdx = 0;
    activeMethods.forEach(m => {
        const amt = sale.paymentDetails?.find(d => d.method === m.id)?.amount || (sale.paymentMethod === m.id ? sale.total : 0);
        if (amt > 0 || m.id === sale.paymentMethod) {
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);
            doc.setFont('helvetica', 'normal');
            doc.text(`${m.name}:`, totalsX, currentY + 5 + pIdx * 5);
            doc.setFont('helvetica', 'bold');
            doc.text(this.formatCurrency(amt), pageWidth - pageMargin, currentY + 5 + pIdx * 5, { align: 'right' });
            pIdx++;
        }
    });

    const infoY = currentY + 15;
    doc.setFontSize(9);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text('Mensagem: Não aceitamos devoluções', pageMargin, infoY);
    
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('DADOS PARA TRANSAÇÃO', pageMargin, infoY + 8);
    
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    const transData = config.financialTransactionData || 'M-pesa: +258 84 264 1083\nE-mola: +258 86 254 1083\nMoza: 4770 6800 0000 0000';
    doc.text(transData, pageMargin, infoY + 13, { maxWidth: 80 });

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.setTextColor(156, 163, 175);
      doc.setFont('helvetica', 'normal');
      doc.text(`Pág. ${i}/${totalPages}`, pageWidth - pageMargin, pageMargin + 18, { align: 'right' });
    }

    doc.save(`Factura_${sale.id}.pdf`);
  }
}
