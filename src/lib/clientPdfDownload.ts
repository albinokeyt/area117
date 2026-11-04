import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { pdfValidityDate, type ClientPdfDocument } from './clientPdfModel';

const price = (value: number) => value.toFixed(3).replace('.', ',');

export function buildClientPdf(model: ClientPdfDocument, banner: Uint8Array) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: model.tariff, subject: `Válida a partir de ${pdfValidityDate(model.validFrom)}`, author: 'AREA117 - Inversiones Energéticas Coral S.L.' });
  const image = doc.getImageProperties(banner), imageHeight = 190 * image.height / image.width;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
  const title = doc.splitTextToSize(model.tariff, 124) as string[];
  const ruleY = Math.max(10 + imageHeight + 15, 10 + imageHeight + 6 + title.length * 5);
  const tableY = ruleY + (model.hvo ? 27 : 7);
  const hasLabels = model.rows.some(row => row.labels.length > 0);
  const head = ['Nº', 'E.E.S.S.', 'BANDERA', 'UBICACIÓN', ...(hasLabels ? ['ETIQUETA'] : []), 'SIN IVA', 'CON IVA'];
  const widths = hasLabels ? [7, 31, 20, 68, 23, 20.5, 20.5] : [7, 35, 21, 86, 20.5, 20.5];
  const labelLines = new WeakMap<object, string[]>();
  const hvoCard = (x: number, name: string, company: string, values: { sinIva: number; conIva: number }) => {
    const y = ruleY + 5;
    doc.setFillColor(255, 251, 235); doc.setDrawColor(245, 209, 109); doc.setLineWidth(.2); doc.roundedRect(x, y, 93, 17, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.6); doc.setTextColor(91, 54, 20); doc.text(name, x + 3, y + 5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(5.8); doc.text(company, x + 3, y + 9);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    doc.text(`SIN IVA: ${price(values.sinIva)} €/L`, x + 90, y + 9, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.text(`CON IVA: ${price(values.conIva)} €/L`, x + 90, y + 13.5, { align: 'right' });
  };
  autoTable(doc, {
    startY: tableY, margin: { top: 30, bottom: 16, left: 10, right: 10 },
    head: [head], body: model.rows.length ? model.rows.map((row, index) => [String(index + 1), row.station, row.bandera, row.ubicacion,
      ...(hasLabels ? [row.labels.join('\n')] : []), `${price(row.sinIva)} €`, `${price(row.conIva)} €`])
      : [[{ content: 'No hay estaciones activas para esta tarifa.', colSpan: head.length }]],
    theme: 'grid', showHead: 'everyPage', rowPageBreak: 'avoid',
    styles: { font: 'helvetica', fontSize: 7, cellPadding: 1.1, valign: 'middle', textColor: [28, 39, 56], lineColor: [221, 226, 233], lineWidth: .1, overflow: 'linebreak' },
    headStyles: { fontStyle: 'bold', fontSize: 6.4, fillColor: [15, 23, 42], textColor: [255, 255, 255], cellPadding: 2 },
    alternateRowStyles: { fillColor: [249, 250, 252] },
    columnStyles: Object.fromEntries(widths.map((cellWidth, index) => [index, { cellWidth, halign: index >= head.length - 2 ? 'right' : index === 0 ? 'center' : 'left' }])),
    willDrawPage(data) {
      doc.setTextColor(15, 23, 42);
      if (data.pageNumber === 1) {
        doc.addImage(banner, 'PNG', 10, 10, 190, imageHeight);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(title, 10, 10 + imageHeight + 8);
        doc.setFontSize(6); doc.setTextColor(100, 116, 139); doc.text('FECHA DE APLICACIÓN', 200, 10 + imageHeight + 4, { align: 'right' });
        doc.setFontSize(9); doc.setTextColor(15, 23, 42); doc.text(pdfValidityDate(model.validFrom), 200, 10 + imageHeight + 9, { align: 'right' });
        doc.setDrawColor(15, 23, 42); doc.setLineWidth(.4); doc.line(10, ruleY, 200, ruleY);
        if (model.hvo) { hvoCard(10, 'HVO ALFAJARÍN', 'Alfa Energía', model.hvo.alfajarin); hvoCard(107, 'HVO VALDEMORO', 'Área 117', model.hvo.valdemoro); }
      } else {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('AREA117', 10, 14);
        doc.setFontSize(7); doc.text(doc.splitTextToSize(model.tariff, 125), 40, 14);
        doc.setFont('helvetica', 'normal'); doc.text(pdfValidityDate(model.validFrom), 200, 14, { align: 'right' });
        doc.setDrawColor(15, 23, 42); doc.setLineWidth(.3); doc.line(10, 24, 200, 24);
      }
    },
    didParseCell(data) {
      if (data.section !== 'body' || !model.rows.length) return;
      const row = model.rows[data.row.index];
      if (row.labels.length) data.cell.styles.fillColor = [254, 249, 195];
      if (data.column.index === 1 || data.column.index >= head.length - 2) data.cell.styles.fontStyle = 'bold';
      if (data.column.index === head.length - 1) data.cell.styles.textColor = [4, 120, 87];
    },
    willDrawCell(data) {
      if (hasLabels && data.section === 'body' && data.column.index === 4 && model.rows[data.row.index]?.labels.length) {
        // Keep the measured height, but draw label text only once for PDF readers.
        labelLines.set(data.cell, [...data.cell.text]); data.cell.text = [];
      }
    },
    didDrawCell(data) {
      if (!hasLabels || data.section !== 'body' || data.column.index !== 4 || !model.rows[data.row.index]?.labels.length) return;
      const cell = data.cell;
      doc.setFillColor(249, 115, 22); doc.roundedRect(cell.x + .6, cell.y + .6, cell.width - 1.2, cell.height - 1.2, .8, .8, 'F');
      doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(6.2);
      const lines = labelLines.get(cell) || [];
      doc.text(lines, cell.x + cell.width / 2, cell.y + cell.height / 2 - (lines.length - 1) * 1.2, { align: 'center', baseline: 'middle' });
    },
  });
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    doc.setPage(page); doc.setDrawColor(210, 219, 229); doc.setLineWidth(.2); doc.line(10, 284, 200, 284);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.4); doc.setTextColor(100, 116, 139);
    doc.text('Inversiones Energéticas Coral S.L. | AREA117', 10, 290);
    doc.text(`Página ${page} / ${doc.getNumberOfPages()}`, 200, 290, { align: 'right' });
  }
  return new Uint8Array(doc.output('arraybuffer'));
}

export async function downloadClientPdfs(documents: ClientPdfDocument[], archive: boolean, progress: (done: number, total: number) => void) {
  if (!documents.length || new Set(documents.map(doc => doc.filename)).size !== documents.length) throw new Error('El catálogo contiene nombres duplicados o no tiene tarifas disponibles.');
  const response = await fetch('/area117_header_banner.png?v=2');
  if (!response.ok) throw new Error('No se pudo cargar el banner oficial. Vuelve a intentarlo.');
  const banner = new Uint8Array(await response.arrayBuffer()), files: Record<string, Uint8Array> = {};
  for (const [index, model] of documents.entries()) {
    files[model.filename] = buildClientPdf(model, banner);
    progress(index + 1, documents.length);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  const bytes = archive ? (await import('fflate')).zipSync(files, { level: 0 }) : files[documents[0].filename];
  const filename = archive ? `PDFs CLIENTES VALIDA A PARTIR DE ${pdfValidityDate(documents[0].validFrom, '-')}.zip` : documents[0].filename;
  const blob = new Blob([Uint8Array.from(bytes).buffer], { type: archive ? 'application/zip' : 'application/pdf' });
  const url = URL.createObjectURL(blob), link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return filename;
}
