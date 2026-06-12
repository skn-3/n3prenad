import jsPDF from 'jspdf';
import { OrderLine } from '@/types/order';
import { companyInfo } from '@/data/companyInfo';
import { Team } from '@/types/order';
import { logoBase64 } from '@/assets/logoBase64';

// SECURITY: internal_* fields (internal_extra_hours, internal_hour_rate,
// internal_extra_amount) must never be rendered in this PDF — it is delivered
// to the installer. Same rule applies to invoicePdfGenerator and the
// send-order-email edge function.

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
  const headerBg = [55, 65, 81] as const; // dark gray for table header

  // --- HEADER ---
  // Logo (left)
  try {
    doc.addImage(logoBase64, 'PNG', margin, 8, 18, 18);
  } catch (e) {
    // fallback if image fails
  }

  // Company info (left, next to logo)
  const textX = margin + 21;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('SmartKlimat', textX, 16);
  doc.setFontSize(12);
  doc.text('N3prenad', textX, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text(companyInfo.orgNr, textX, 28);
  doc.text(`${companyInfo.address} ${companyInfo.postalCode}`, textX, 32);
  doc.text(companyInfo.city, textX, 36);

  // Date (right top)
  doc.setFontSize(10);
  doc.setTextColor(120, 120, 120);
  doc.text(data.date, pageWidth - margin, 14, { align: 'right' });

  // A-ORDER title — large, bold, green, right-aligned
  doc.setFontSize(36);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text('A-ORDER', pageWidth - margin, 30, { align: 'right' });

  // Order number — large, right-aligned
  doc.setFontSize(14);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'bold');
  doc.text(`${data.orderNumber}`, pageWidth - margin, 38, { align: 'right' });

  // Customer address — right-aligned under order number
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(data.customerAddress, pageWidth - margin, 44, { align: 'right' });

  // --- TABLE ---
  let y = 54;

  // Column positions
  const colName = margin + 2;
  const colPrice = margin + 100;
  const colQty = margin + 130;
  const colSum = margin + contentWidth - 2;

  // Header row — dark gray background, white text
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

  // Data rows — alternating white / light gray
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
    doc.text(formatPrice(line.unitPrice), colPrice, y + 5, { align: 'right' });
    doc.text(String(line.quantity), colQty, y + 5, { align: 'right' });
    doc.text(String(Math.round(line.sum)), colSum, y + 5, { align: 'right' });
    y += 7;
  });

  // Separator
  y += 2;
  doc.setDrawColor(200, 200, 200);
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
  const footerY = Math.max(y + 10, 225);

  // Delivery address — large, left, bold
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text(data.customerAddress, margin, footerY);

  // Total — right, green, large
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...green);
  doc.text(`Totalt: ${Math.round(total).toLocaleString('sv-SE')} kr`, pageWidth - margin, footerY, { align: 'right' });

  doc.setFontSize(9);
  doc.setTextColor(...darkGray);
  doc.setFont('helvetica', 'normal');
  doc.text('Moms: 0 kr', pageWidth - margin, footerY + 7, { align: 'right' });

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

  // Contact bar at bottom with icons (phone, email, address)
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
