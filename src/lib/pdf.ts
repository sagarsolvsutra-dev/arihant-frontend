import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate } from "./date";

export function exportLedgerToPDF(
  title: string,
  partyInfo: string,
  columns: string[],
  rows: any[][],
  openingBalance: string,
  closingBalance: string
) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  doc.setFontSize(10);
  doc.text(partyInfo, 14, 22);

  let startY = 30;

  if (openingBalance) {
    doc.text(`Opening Balance: ${openingBalance}`, 14, startY);
    startY += 8;
  }

  autoTable(doc, {
    startY: startY,
    head: [columns],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0] },
    margin: { top: 10 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || startY;
  
  if (closingBalance) {
    doc.setFontSize(11);
    doc.text(`Closing Balance: ${closingBalance}`, 14, finalY + 10);
  }

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportTableToPDF(title: string, columns: string[], rows: any[][]) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(16);
  doc.text(title, 14, 15);
  
  autoTable(doc, {
    startY: 25,
    head: [columns],
    body: rows,
    theme: "striped",
    headStyles: { fillColor: [0, 0, 0] },
  });

  doc.save(`${title.replace(/\s+/g, "_")}.pdf`);
}

export function exportInvoiceToPDF(
  record: any,
  type: "Sale" | "Purchase" | "Sale Return" | "Purchase Return",
  company: any,
  party: any // Customer or Supplier
) {
  const doc = new jsPDF();
  
  // Header - Company Info
  doc.setFontSize(20);
  doc.text(company?.name || "Company Name", 14, 20);
  
  doc.setFontSize(10);
  let y = 28;
  if (company?.address) {
    doc.text(company.address, 14, y);
    y += 6;
  }
  if (company?.phone) {
    doc.text(`Phone: ${company.phone}`, 14, y);
    y += 6;
  }
  if (company?.gstin) {
    doc.text(`GSTIN: ${company.gstin}`, 14, y);
    y += 6;
  }

  // Invoice Title
  doc.setFontSize(16);
  const title = type === "Sale" ? "Tax Invoice" : type;
  const titleWidth = doc.getTextWidth(title);
  doc.text(title, 210 - 14 - titleWidth, 20);

  // Invoice Details (Right side)
  doc.setFontSize(10);
  let rightY = 28;
  const invoiceNo = record.invoiceNo || record.returnNo;
  const dateStr = formatDate(record.invoiceDate || record.returnDate);
  
  doc.text(`Invoice No: ${invoiceNo}`, 210 - 14 - doc.getTextWidth(`Invoice No: ${invoiceNo}`), rightY);
  rightY += 6;
  doc.text(`Date: ${dateStr}`, 210 - 14 - doc.getTextWidth(`Date: ${dateStr}`), rightY);
  
  // Party Info (Left side)
  y += 6;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(type === "Sale" || type === "Sale Return" ? "Billed To:" : "Supplier:", 14, y);
  
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(party?.name || party?.companyName || "Unknown", 14, y);
  y += 6;
  if (party?.address) {
    doc.text(party.address, 14, y);
    y += 6;
  }
  if (party?.gstin) {
    doc.text(`GSTIN: ${party.gstin}`, 14, y);
    y += 6;
  }

  // Table
  const tableY = y + 10;
  
  const isPurchase = type.includes("Purchase");
  
  const columns = [
    "S.No", 
    "Item Name",
    "Qty (Pcs)", 
    "Free", 
    isPurchase ? "Rate" : "Rate",
    "Taxable", 
    "GST", 
    "Amount"
  ];
  
  const rows = (record.items || []).map((item: any, idx: number) => {
    const rate = isPurchase ? (item.beforeGstRate || 0) : (item.afterGstRate || 0);
    return [
      idx + 1,
      item.itemName || "-",
      item.totalPieces || (item.caseQty * (item.packing || 1) + item.pcsQty),
      item.freeQty || 0,
      `Rs ${rate.toFixed(2)}`,
      `Rs ${(item.taxableValue || 0).toFixed(2)}`,
      `${(item.gstPercent || 0)}%`,
      `Rs ${(item.netValue || item.amount || 0).toFixed(2)}`
    ];
  });

  autoTable(doc, {
    startY: tableY,
    head: [columns],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [66, 66, 66] },
    styles: { fontSize: 8 },
  });

  const finalY = (doc as any).lastAutoTable.finalY || tableY;
  
  // Totals
  doc.setFontSize(10);
  const totalsY = finalY + 10;
  
  const netAmount = record.netAmount || 0;
  const taxable = record.totalTaxableValue || 0;
  const gstAmt = record.totalGstAmount || 0;
  
  doc.text(`Total Taxable Value: Rs ${taxable.toFixed(2)}`, 140, totalsY);
  doc.text(`Total GST Amount: Rs ${gstAmt.toFixed(2)}`, 140, totalsY + 6);
  doc.setFont("helvetica", "bold");
  doc.text(`Grand Total: Rs ${netAmount.toFixed(2)}`, 140, totalsY + 14);

  // Notes
  if (record.notes) {
    doc.setFont("helvetica", "normal");
    doc.text(`Notes: ${record.notes}`, 14, totalsY);
  }

  doc.save(`${type.replace(/\s+/g, "_")}_${invoiceNo}.pdf`);
}
