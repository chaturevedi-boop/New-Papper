import jsPDF from 'jspdf';
import { BillingSummary, DeliveryAgent } from '../types';

export interface GeneratedPdf {
  blob: Blob;
  base64: string;
}

// Renders the invoice as a real A4 PDF (not a renamed text file), using jsPDF - a pure JS
// library with no native dependency, so it works identically on web and inside the
// Capacitor Android WebView.
export function generateInvoicePdf(bill: BillingSummary, agent: DeliveryAgent | null, monthName: string): GeneratedPdf {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const marginX = 18;
  const pageWidth = 210;
  const contentWidth = pageWidth - marginX * 2;
  let y = 20;

  const rule = () => {
    doc.setDrawColor(220);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;
  };

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(6, 95, 70); // emerald-800
  doc.text('DAILY NEWS SERVICE', marginX, y);
  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text('Premium Newspaper Drops & Accounting', marginX, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(`INV-${bill.flatId}-${bill.month}`, marginX, y);

  // Payment status badge (top right)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(bill.paid ? 5 : 190, bill.paid ? 122 : 40, bill.paid ? 78 : 40);
  doc.text(bill.paid ? 'PAID / SETTLED' : 'DUE / UNPAID', pageWidth - marginX, 20, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${monthName} ${bill.year}`, pageWidth - marginX, 26, { align: 'right' });

  y += 8;
  rule();

  // Billed To / Agent grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text('BILLED TO', marginX, y);
  doc.text('DELIVERY AGENT', marginX + contentWidth / 2, y);
  y += 5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30);
  doc.text(bill.customerName, marginX, y);
  doc.text(agent ? agent.name : 'Rohan Sharma', marginX + contentWidth / 2, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text(`Flat ${bill.flatNumber}, ${bill.locationPath.split(' ➔ ').slice(1).join(' > ')}`, marginX, y, { maxWidth: contentWidth / 2 - 4 });
  doc.text(`Mobile: ${agent ? agent.phone : '+91 98765 43210'}`, marginX + contentWidth / 2, y);
  y += 5;
  doc.text(`Ph: ${bill.phoneNumber}`, marginX, y);
  y += 9;

  rule();

  // Itemized table header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(140);
  doc.text('NEWSPAPER', marginX, y);
  doc.text('DELIVERED', marginX + 78, y);
  doc.text('SKIPPED', marginX + 108, y);
  doc.text('RATE', marginX + 135, y, { align: 'right' });
  doc.text('SUBTOTAL', pageWidth - marginX, y, { align: 'right' });
  y += 3;
  rule();

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  bill.subscribedPapers.forEach((p) => {
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(p.paperName, marginX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(5, 122, 78);
    doc.text(`${p.deliveredDays}d`, marginX + 78, y);
    doc.setTextColor(190, 40, 40);
    doc.text(`${p.skippedDays}s`, marginX + 108, y);
    doc.setTextColor(90);
    doc.text(`Rs. ${p.rate.toFixed(2)}`, marginX + 135, y, { align: 'right' });
    doc.setTextColor(30);
    doc.setFont('helvetica', 'bold');
    doc.text(`Rs. ${p.cost.toFixed(2)}`, pageWidth - marginX, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 7;
  });

  y += 2;
  rule();

  // Summary block, right-aligned
  const summaryX = pageWidth - marginX;
  doc.setFontSize(9);
  doc.setTextColor(90);
  doc.text('Gross Paper Cost Potential:', summaryX - 55, y, { align: 'right' });
  doc.setTextColor(30);
  doc.text(`Rs. ${bill.grossAmount.toFixed(2)}`, summaryX, y, { align: 'right' });
  y += 6;
  doc.setTextColor(190, 40, 40);
  doc.text('Daily Skip Deductions (-):', summaryX - 55, y, { align: 'right' });
  doc.text(`Rs. ${bill.skipDeductions.toFixed(2)}`, summaryX, y, { align: 'right' });
  y += 7;
  doc.setDrawColor(200);
  doc.line(summaryX - 70, y - 4, summaryX, y - 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(5, 95, 70);
  doc.text('Net Monthly Invoice Payable:', summaryX - 55, y, { align: 'right' });
  doc.text(`Rs. ${bill.netAmount.toFixed(2)}`, summaryX, y, { align: 'right' });

  // Footer disclaimer
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text(
    'Deductions Rule: Subscription rates are active for Calendar Year 2026. Daily skips have been logged via delivery',
    marginX,
    280
  );
  doc.text('agent drop list scans and subtracted from your gross balance. Please settle your bill by the 10th of this month.', marginX, 284);

  const blob = doc.output('blob');
  const base64 = doc.output('datauristring').split(',')[1] ?? '';
  return { blob, base64 };
}
