import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';
import type { PurchaseTableSnapshot } from './purchaseTableSnapshot';

export function downloadPurchasePdf(snapshot: PurchaseTableSnapshot, info: {
  title: string; date: string; validFrom: string; product: string;
}) {
  if (!snapshot.rows.length) throw new Error('No hay filas en este cuadro para exportar.');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const formatDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.split('-').reverse().join('/') : date;
  doc.setProperties({ title: `Compras - ${info.title}`, author: 'AREA117', subject: info.product });
  const widths = snapshot.headers.length === 9
    ? [42, 23, 27, 28, 28, 29, 33, 37, 30]
    : [42, 23, 22, 24, 28, 14, 14, 14, 24, 24, 26, 22];
  autoTable(doc, {
    head: [snapshot.headers],
    body: snapshot.rows.map(row => row.cells.map((cell, index) => index === 0 && row.labels.length ? `${cell.text}\n${row.labels.join(' / ')}` : index === 1 ? cell.text.replace(/\s*\(GOA\)/, '') : cell.text)),
    theme: 'grid', startY: 42, margin: { top: 42, bottom: 17, left: 10, right: 10 },
    styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1, textColor: [28, 45, 68], lineColor: [221, 229, 239], lineWidth: 0.15, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [27, 58, 99], textColor: [255, 255, 255], fontSize: 7.1, fontStyle: 'bold', cellPadding: 2.1 },
    columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index < 2 ? 'left' : 'right' }])),
    alternateRowStyles: { fillColor: [246, 249, 253] },
    rowPageBreak: 'avoid', showHead: 'everyPage',
    didParseCell(data) {
      if (data.section !== 'body') return;
      const row = snapshot.rows[data.row.index];
      const cell = row.cells[data.column.index];
      if (row.route) data.cell.styles.fillColor = [224, 245, 231];
      if (cell.modified) data.cell.styles.fillColor = [255, 240, 181];
      if (data.column.index === 0 || data.column.index >= snapshot.headers.length - 3) data.cell.styles.fontStyle = 'bold';
      if (data.column.index === snapshot.headers.length - 1 && cell.text.startsWith('-')) data.cell.styles.textColor = [174, 47, 64];
    },
    willDrawPage() {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(27, 58, 99);
      doc.text('AREA117', 10, 14);
      doc.setDrawColor(197, 54, 71); doc.setLineWidth(0.8); doc.line(10, 18, width - 10, 18);
      doc.setFontSize(12); doc.text(info.title, 10, 25);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 99, 124);
      doc.text(`${info.product} | ${snapshot.rows.length} filas`, 10, 31);
      doc.text(`Resumen: ${formatDate(info.date)} | Válido a partir de: ${formatDate(info.validFrom)}`, width - 10, 13, { align: 'right' });
      doc.setFillColor(224, 245, 231); doc.rect(10, 34, 3, 3, 'F'); doc.text('Ruta activa', 15, 36.5);
      doc.setFillColor(255, 240, 181); doc.rect(41, 34, 3, 3, 'F'); doc.text('Dato modificado', 46, 36.5);
      doc.text('Margen = Venta sugerida - Venta anterior', width - 10, 36.5, { align: 'right' });
    },
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setDrawColor(221, 229, 239); doc.setLineWidth(0.2); doc.line(10, height - 13, width - 10, height - 13);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(80, 99, 124);
    doc.text('Compras | Datos visibles al descargar', 10, height - 8);
    doc.text(`Página ${page} / ${doc.getNumberOfPages()}`, width - 10, height - 8, { align: 'right' });
  }
  const filename = info.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '_').replace(/_$/, '');
  doc.save(`Compras_${filename}_${info.date.replace(/[^0-9]/g, '-')}.pdf`);
}
