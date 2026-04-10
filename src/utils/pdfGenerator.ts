import jsPDF from 'jspdf';
import { OrderLine } from '@/types/order';
import { companyInfo } from '@/data/companyInfo';
import { Team } from '@/types/order';

interface PDFData {
  date: string;
  orderNumber: number;
  customerAddress: string;
  lines: OrderLine[];
  description: string;
  team: Team;
}

export function generateOrderPDF(data: PDFData): jsPDF {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = 210;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Colors
  const green = [34, 197, 94] as const; // #22C55E
  const darkGray = [51, 51, 51] as const;
  const lightGray = [245, 245, 245] as const;
  const medGray = [200, 200, 200] as const;

  // --- HEADER ---
  // Company info (left)
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Smartklimat', margin, 18);
  doc.setFontSize(12);
  doc.text('Entreprenad', margin, 24);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(companyInfo.orgNr, margin, 30);
  doc.text(`${companyInfo.address} ${companyInfo.postalCode}`, margin, 34);
  doc.text(companyInfo.city, margin, 38);

  // Date (right)
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.text(data.date, pageWidth - margin, 18, { align: 'right' });

  // A-ORDER title
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text('A-ORDER', pageWidth - margin, 32, { align: 'right' });

  // Order number & address
  doc.setFontSize(10);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text(`Ordernummer: ${data.orderNumber}`, pageWidth - margin, 40, { align: 'right' });
  doc.text(data.customerAddress, pageWidth - margin, 46, { align: 'right' });

  // --- TABLE ---
  let y = 56;

  // Header row
  doc.setFillColor(...green);
  doc.rect(margin, y, contentWidth, 8, 'F');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 255, 255);
  doc.text('BENÄMNING', margin + 2, y + 5.5);
  doc.text('Å-PRIS', margin + 100, y + 5.5, { align: 'right' });
  doc.text('LEV ANT', margin + 130, y + 5.5, { align: 'right' });
  doc.text('SUM', margin + contentWidth - 2, y + 5.5, { align: 'right' });
  y += 8;

  // Data rows
  const total = data.lines.reduce((s, l) => s + l.sum, 0);

  data.lines.forEach((line, i) => {
    if (y > 250) {
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
    doc.text(line.name, margin + 2, y + 5);
    doc.text(formatPrice(line.unitPrice), margin + 100, y + 5, { align: 'right' });
    doc.text(String(line.quantity), margin + 130, y + 5, { align: 'right' });
    doc.text(formatPrice(line.sum), margin + contentWidth - 2, y + 5, { align: 'right' });
    y += 7;
  });

  // Line under table
  y += 2;
  doc.setDrawColor(...medGray);
  doc.line(margin, y, margin + contentWidth, y);
  y += 4;

  // Description
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
  const footerY = Math.max(y + 10, 230);

  // Address left
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(data.customerAddress, margin, footerY);

  // Total right
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text(`Totalt: ${formatPrice(total)} kr`, pageWidth - margin, footerY, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text('Moms: 0 kr', pageWidth - margin, footerY + 6, { align: 'right' });

  // Team bankgiro
  doc.setFontSize(8);
  doc.text(`BANKGIRO: ${data.team.bankgiro}`, margin, footerY + 14);
  doc.text(`${data.team.companyName} | ${data.team.orgNr}`, margin, footerY + 19);

  // SmartKlimat disclaimer
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.text(`FAKTURAN HAR UTFÄRDATS AV ${companyInfo.legalName}`, margin, footerY + 26);

  // Payment terms
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Betalningsvillkor: 10 dagar netto.', margin, footerY + 31);
  doc.text(`Momsreg. nr ${companyInfo.momsRegNr}  Godkänd för F-skatt`, margin, footerY + 35);

  // Contact bar at very bottom
  const barY = 285;
  doc.setFillColor(60, 60, 60);
  doc.rect(0, barY - 4, pageWidth, 12, 'F');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(
    `${companyInfo.phone}    ${companyInfo.email}    ${companyInfo.address} ${companyInfo.postalCode} ${companyInfo.city}`,
    pageWidth / 2,
    barY + 1,
    { align: 'center' }
  );

  return doc;
}

function formatPrice(n: number): string {
  return n.toLocaleString('sv-SE', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
