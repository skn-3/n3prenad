import jsPDF from 'jspdf';
import { companyInfo } from '@/data/companyInfo';
import { logoBase64 } from '@/assets/logoBase64';

interface InvoiceLineItem {
  name: string;
  unit_price: number;
  quantity: number;
  sum: number;
}

interface InvoiceData {
  date: string;
  orderNumber: number;
  customerAddress: string;
  lines: InvoiceLineItem[];
  description: string;
  teamCompany: string;
  teamOrgNr: string;
  teamBankgiro: string;
  teamAddress: string;
}

export function generateInvoicePDF(data: InvoiceData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  const green = [34, 197, 94] as const;
  const darkGray = [51, 51, 51] as const;
  const lightGray = [245, 245, 245] as const;
  const headerBg = [55, 65, 81] as const;

  // --- HEADER ---
  try {
    doc.addImage(logoBase64, 'PNG', margin, 8, 18, 18);
  } catch (e) {}

  // Team company info (instead of SmartKlimat)
  const textX = margin + 21;
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(data.teamCompany, textX, 18);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(data.teamOrgNr, textX, 24);
  doc.text(data.teamAddress, textX, 28);

  // Date (right top)
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(data.date, pageWidth - margin, 14, { align: 'right' });

  // FAKTURA title
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text('FAKTURA', pageWidth - margin, 30, { align: 'right' });

  // Invoice number
  doc.setFontSize(14);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.orderNumber}`, pageWidth - margin, 38, { align: 'right' });

  // Customer address
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerAddress, pageWidth - margin, 44, { align: 'right' });

  // --- TABLE ---
  let y = 54;
  const colName = margin + 2;
  const colPrice = margin + 100;
  const colQty = margin + 130;
  const colSum = margin + contentWidth - 2;

  doc.setFillColor(...headerBg);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BENÄMNING', colName, y + 5.5);
  doc.text('Å-PRIS', colPrice, y + 5.5, { align: 'right' });
  doc.text('LEV ANT', colQty, y + 5.5, { align: 'right' });
  doc.text('SUM', colSum, y + 5.5, { align: 'right' });
  y += 8;

  const total = data.lines.reduce((s, l) => s + l.sum, 0);

  data.lines.forEach((line, i) => {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    if (i % 2 === 0) {
      doc.setFillColor(...lightGray);
      doc.rect(margin, y, contentWidth, 7, 'F');
    }
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...darkGray);
    doc.text(line.name, colName, y + 5);
    doc.text(formatPrice(line.unit_price), colPrice, y + 5, { align: 'right' });
    doc.text(String(line.quantity), colQty, y + 5, { align: 'right' });
    doc.text(String(Math.round(line.sum)), colSum, y + 5, { align: 'right' });
    y += 7;
  });

  y += 2;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  if (data.description) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Beskrivning:', margin, y + 4);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(data.description, contentWidth - 4);
    doc.text(descLines, margin, y + 9);
    y += 9 + descLines.length * 4;
  }

  // --- FOOTER ---
  const footerY = Math.max(y + 10, 225);

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(data.customerAddress, margin, footerY);

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text(`Totalt: ${Math.round(total).toLocaleString('sv-SE')} kr`, pageWidth - margin, footerY, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text('Moms: 0 kr', pageWidth - margin, footerY + 7, { align: 'right' });

  // Team bankgiro + address
  doc.setFontSize(8);
  doc.text(`BANKGIRO: ${data.teamBankgiro}`, margin, footerY + 14);
  doc.text(`${data.teamCompany} | ${data.teamOrgNr}`, margin, footerY + 19);

  // SmartKlimat disclaimer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`FAKTURAN HAR UTFÄRDATS AV ${companyInfo.legalName}`, margin, footerY + 26);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Betalningsvillkor: 10 dagar netto.', margin, footerY + 31);
  doc.text(`Momsreg. nr ${companyInfo.momsRegNr}  Godkänd för F-skatt`, margin, footerY + 35);

  // Contact bar
  const barY = 285;
  doc.setFillColor(55, 65, 81);
  doc.rect(0, barY - 5, pageWidth, 14, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  const contactParts = [
    `☎ ${companyInfo.phone}`,
    `✉ ${companyInfo.email}`,
    `⌂ ${companyInfo.address} ${companyInfo.postalCode} ${companyInfo.city}`,
  ];
  doc.text(contactParts.join('    '), pageWidth / 2, barY + 2, { align: 'center' });

  return doc;
}

function formatPrice(n: number): string {
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
