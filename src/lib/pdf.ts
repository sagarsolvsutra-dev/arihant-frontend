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
