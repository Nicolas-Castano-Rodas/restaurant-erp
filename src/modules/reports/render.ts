import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Report } from "./types";

function safeCell(value: string | number | null, numeric: boolean) {
  if (value === null) return null;
  if (numeric && /^-?\d+(\.\d+)?$/.test(String(value)) && String(value).replace(/[^0-9]/g, "").replace(/^0+/, "").length <= 15) return Number(value);
  // Explicit string cells, never formulas, including values beginning with '='.
  return String(value);
}

export async function renderExcel(report: Report): Promise<Uint8Array> {
  const book = new ExcelJS.Workbook();
  book.creator = "Restaurant ERP";
  book.created = new Date(report.generatedAt);
  const intro = book.addWorksheet("Información");
  intro.columns = [{ width: 27 }, { width: 100 }];
  for (const row of [["Reporte", report.title], ["Organización", report.organization], ["Sucursal", report.branch], ["Desde", report.from], ["Hasta", report.to], ["Moneda de referencia", report.currency], ["Zona horaria", report.timeZone], ["Generado (UTC)", report.generatedAt], ...report.notes.map((note) => ["Nota", note]), ["Precisión", "Los importes que exceden 15 dígitos se conservan como texto. Los datos vacíos representan valores desconocidos."]]) intro.addRow(row);
  intro.getColumn(1).font = { bold: true, color: { argb: "FF172B4D" } };
  intro.getColumn(2).alignment = { wrapText: true, vertical: "top" };
  intro.eachRow((row) => { row.height = 32; });
  for (const [index, table] of report.tables.entries()) {
    const sheet = book.addWorksheet(`${index + 1} ${table.title.replace(/[:\\/?*[\]]/g, "").slice(0, 27)}`, { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = table.columns.map((column) => ({ width: column.numeric ? 21 : Math.max(19, Math.min(40, column.label.length + 8)) }));
    const header = sheet.addRow(table.columns.map((column) => column.label));
    header.height = 30;
    header.eachCell((cell) => { cell.font = { bold: true, color: { argb: "FFFFFFFF" } }; cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF172B4D" } }; cell.alignment = { vertical: "middle", wrapText: true }; });
    for (const [rowIndex, values] of table.rows.entries()) {
      const row = sheet.addRow(values.map((value, i) => safeCell(value, !!table.columns[i].numeric)));
      row.eachCell((cell, i) => {
        cell.alignment = { vertical: "top", wrapText: true };
        if (rowIndex % 2 === 1) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF6F3EF" } };
        if (table.columns[i - 1].numeric && typeof cell.value === "number") cell.numFmt = "#,##0.###";
      });
      row.height = 32;
    }
    if (table.rows.length) sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: table.rows.length + 1, column: table.columns.length } };
  }
  return Uint8Array.from(new Uint8Array(await book.xlsx.writeBuffer()));
}

function printable(value: string, font: PDFFont) {
  return Array.from(value.normalize("NFC").replace(/\s+/g, " ")).map((char) => {
    try { font.encodeText(char); return char; } catch { return "?"; }
  }).join("");
}

function wrap(value: string, font: PDFFont, width: number, size: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of printable(value, font).split(" ")) {
    if (font.widthOfTextAtSize(line ? `${line} ${word}` : word, size) <= width) { line = line ? `${line} ${word}` : word; continue; }
    if (line) lines.push(line);
    line = "";
    for (const char of word) {
      if (font.widthOfTextAtSize(line + char, size) > width && line) { lines.push(line); line = ""; }
      line += char;
    }
  }
  if (line || !lines.length) lines.push(line);
  return lines;
}

export async function renderPdf(report: Report): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const normal = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.09, 0.17, 0.30);
  const muted = rgb(0.29, 0.34, 0.42);
  const brand = rgb(0.76, 0.25, 0.05);
  const width = 842, height = 595, margin = 32, bottom = 48, available = width - margin * 2;
  const size = 9, leading = 12;
  let page: PDFPage = doc.addPage([width, height]);
  let y = height - 40;
  doc.setTitle(report.title);
  doc.setAuthor("Restaurant ERP");

  function line(text: string, font = normal, fontSize = size, color = ink) {
    for (const part of wrap(text, font, available, fontSize)) {
      page.drawText(part, { x: margin, y, font, size: fontSize, color });
      y -= fontSize + 4;
    }
  }

  function header() {
    y = height - 32;
    line("RESTAURANT ERP  |  REPORTES EMPRESARIALES", bold, 10, brand);
    line(report.title, bold, 19);
    line(`${report.organization}  |  ${report.branch}`, normal, 10, muted);
    line(`${report.from} a ${report.to}  |  ${report.currency}  |  ${report.timeZone}`, normal, 9, muted);
    y -= 8;
  }
  function nextPage() { page = doc.addPage([width, height]); header(); }
  header();
  line(`Generado (UTC): ${report.generatedAt}`, normal, 9, muted);
  for (const note of [...report.notes, "Los caracteres no admitidos por la fuente PDF se reemplazan por ?. El Excel conserva el texto original."]) {
    if (y < bottom + 80) nextPage();
    line(note, normal, 9, muted);
  }
  for (const table of report.tables) {
    const weights = table.columns.map((column) => column.numeric ? 0.95 : 1.35);
    const sum = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map((weight) => weight / sum * available);
    function drawHeader() {
      line(table.title, bold, 13);
      const cells = table.columns.map((column, i) => wrap(column.label, bold, widths[i] - 12, size));
      const rowHeight = Math.max(...cells.map((cell) => cell.length)) * leading + 12;
      page.drawRectangle({ x: margin, y: y - rowHeight + 5, width: available, height: rowHeight, color: ink });
      let x = margin;
      for (const [i, cell] of cells.entries()) {
        cell.forEach((part, j) => { page.drawText(part, { x: x + 6, y: y - 8 - j * leading, size, font: bold, color: rgb(1, 1, 1) }); });
        x += widths[i];
      }
      y -= rowHeight;
    }
    if (y < bottom + 85) nextPage();
    drawHeader();
    if (!table.rows.length) line("Sin registros en este período.", normal, 9, muted);
    for (const [rowIndex, row] of table.rows.entries()) {
      const cells = row.map((value, i) => wrap(value === null ? "Sin dato" : String(value), normal, widths[i] - 12, size));
      const totalLines = Math.max(...cells.map((cell) => cell.length));
      let offset = 0;
      while (offset < totalLines) {
        if (y < bottom + leading + 12) { nextPage(); drawHeader(); }
        const count = Math.min(totalLines - offset, Math.max(1, Math.floor((y - bottom - 12) / leading)));
        const rowHeight = count * leading + 12;
        if (rowIndex % 2) page.drawRectangle({ x: margin, y: y - rowHeight + 5, width: available, height: rowHeight, color: rgb(0.97, 0.96, 0.94) });
        let x = margin;
        for (const [i, cell] of cells.entries()) {
          cell.slice(offset, offset + count).forEach((part, j) => { page.drawText(part, { x: x + 6, y: y - 8 - j * leading, font: normal, size, color: ink }); });
          x += widths[i];
        }
        y -= rowHeight;
        offset += count;
      }
    }
    y -= 16;
  }
  const pages = doc.getPages();
  pages.forEach((item, index) => {
    item.drawLine({ start: { x: margin, y: 35 }, end: { x: width - margin, y: 35 }, color: muted, thickness: 0.5 });
    item.drawText(`Documento interno  |  Página ${index + 1} de ${pages.length}`, { x: margin, y: 20, font: normal, size: 8, color: muted });
  });
  return doc.save();
}
