/**
 * Export / Import Utilities
 * Zero-dependency CSV + SheetJS-powered Excel + Browser-print PDF.
 *
 * Usage:
 *   exportToCSV(rows, columns, 'report');
 *   exportToExcel(rows, columns, 'report');
 *   exportToPDF(rows, columns, 'report', { title: 'Sales Report' });
 *   const data = await importFile(file); // auto-detects CSV or Excel
 *
 * Design Decisions:
 *   - CSV: Native Blob API with BOM for Arabic support in Excel
 *   - Excel: SheetJS (xlsx) for proper .xlsx formatting + auto-width
 *   - PDF: Hidden iframe + window.print() — no jsPDF dependency needed
 *   - Import: SheetJS for both CSV and Excel parsing
 */

// ═══════════════════════════════════════════
// Types
// ═══════════════════════════════════════════

/** Column definition for export/import */
export interface DataColumn<T = any> {
  /** Key of the data object */
  key: keyof T & string;
  /** Display header (used in file headers) */
  header: string;
  /** Optional width in characters (for Excel auto-width) */
  width?: number;
  /** Optional formatter for export display */
  format?: (value: any, row: T) => string;
}

/** Options for PDF export */
export interface PDFOptions {
  /** Document title shown at top */
  title?: string;
  /** Subtitle (e.g., date range) */
  subtitle?: string;
  /** Page orientation */
  orientation?: 'portrait' | 'landscape';
  /** RTL layout */
  rtl?: boolean;
}

/** Result from file import */
export interface ImportResult<T = Record<string, any>> {
  data: T[];
  headers: string[];
  fileName: string;
  rowCount: number;
}

// ═══════════════════════════════════════════
// CSV Export
// ═══════════════════════════════════════════

/**
 * Export data as CSV and trigger browser download.
 * Includes BOM for proper Arabic display in Excel.
 */
export function exportToCSV<T extends Record<string, any>>(
  rows: T[],
  columns: DataColumn<T>[],
  filename: string
): void {
  // BOM for Excel Arabic support
  const BOM = '\uFEFF';

  // Header row
  const headerLine = columns.map((c) => `"${c.header}"`).join(',');

  // Data rows
  const dataLines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = row[col.key];
        const val = col.format ? col.format(raw, row) : raw;
        if (val === null || val === undefined) return '""';
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(',')
  );

  const csv = BOM + [headerLine, ...dataLines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });

  triggerDownload(blob, `${filename}.csv`);
}

// ═══════════════════════════════════════════
// Excel Export (ExcelJS)
// ═══════════════════════════════════════════

/**
 * Export data as Excel (.xlsx) with auto-width columns.
 * Uses ExcelJS loaded dynamically to keep bundle small.
 */
export async function exportToExcel<T extends Record<string, any>>(
  rows: T[],
  columns: DataColumn<T>[],
  filename: string
): Promise<void> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');

  // Add headers
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15, // Default width if not provided
  }));

  // Add data rows
  rows.forEach((row) => {
    const rowData: Record<string, any> = {};
    columns.forEach((col) => {
      const raw = row[col.key];
      rowData[col.key] = col.format ? col.format(raw, row) : raw ?? '';
    });
    worksheet.addRow(rowData);
  });

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF5F5F5' },
  };

  // Auto-width adjustment based on content
  worksheet.columns.forEach((column) => {
    let maxColumnLength = 0;
    if (column.header) maxColumnLength = column.header.length;
    
    column.eachCell?.({ includeEmpty: true }, (cell) => {
      const columnLength = cell.value ? String(cell.value).length : 0;
      if (columnLength > maxColumnLength) {
        maxColumnLength = columnLength;
      }
    });
    column.width = Math.min(Math.max(maxColumnLength + 2, 10), 50);
  });

  // Generate buffer and trigger download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  triggerDownload(blob, `${filename}.xlsx`);
}

// ═══════════════════════════════════════════
// PDF Export (Browser Print)
// ═══════════════════════════════════════════

/**
 * Export data as PDF via browser's print dialog.
 * Creates a styled HTML table in a hidden iframe, prints it,
 * then removes the iframe. Zero dependencies.
 */
export function exportToPDF<T extends Record<string, any>>(
  rows: T[],
  columns: DataColumn<T>[],
  filename: string,
  options: PDFOptions = {}
): void {
  const { title = filename, subtitle, orientation = 'landscape', rtl = false } = options;

  const dir = rtl ? 'rtl' : 'ltr';
  const textAlign = rtl ? 'right' : 'left';

  // Build HTML table
  const headerCells = columns
    .map((c) => `<th style="padding:6px 10px;border:1px solid #ddd;background:#f5f5f5;font-size:11px;white-space:nowrap">${c.header}</th>`)
    .join('');

  const bodyRows = rows
    .map(
      (row, i) =>
        `<tr style="background:${i % 2 === 0 ? '#fff' : '#fafafa'}">${columns
          .map((col) => {
            const raw = row[col.key];
            const val = col.format ? col.format(raw, row) : raw ?? '';
            return `<td style="padding:5px 10px;border:1px solid #eee;font-size:10px">${val}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html dir="${dir}">
    <head>
      <meta charset="utf-8" />
      <title>${title}</title>
      <style>
        @page { size: ${orientation}; margin: 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: ${dir}; color: #333; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        .subtitle { font-size: 11px; color: #666; margin-bottom: 12px; }
        table { border-collapse: collapse; width: 100%; text-align: ${textAlign}; }
        .footer { margin-top: 12px; font-size: 9px; color: #999; text-align: center; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
      <table>
        <thead><tr>${headerCells}</tr></thead>
        <tbody>${bodyRows}</tbody>
      </table>
      <div class="footer">${new Date().toLocaleDateString()} — ${rows.length} records</div>
    </body>
    </html>
  `;

  // Create hidden iframe, print, remove
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-10000px;left:-10000px;width:1px;height:1px;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (doc) {
    doc.open();
    doc.write(html);
    doc.close();

    // Wait for render then print
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Remove iframe after print dialog closes
      setTimeout(() => document.body.removeChild(iframe), 1000);
    }, 300);
  }
}

// ═══════════════════════════════════════════
// Import (CSV + Excel)
// ═══════════════════════════════════════════

/**
 * Import a CSV or Excel file and return parsed data.
 * Auto-detects format from file extension.
 */
export async function importFile<T = Record<string, any>>(
  file: File
): Promise<ImportResult<T>> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    return importCSV<T>(file);
  } else if (ext === 'xlsx' || ext === 'xls') {
    return importExcel<T>(file);
  }

  throw new Error(`Unsupported file type: .${ext}. Use .csv, .xlsx, or .xls`);
}

/** Parse a CSV file using FileReader */
async function importCSV<T>(file: File): Promise<ImportResult<T>> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length === 0) {
    return { data: [], headers: [], fileName: file.name, rowCount: 0 };
  }

  const headers = parseCSVLine(lines[0]);
  const data: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const obj: Record<string, any> = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? '';
    });
    data.push(obj as T);
  }

  return { data, headers, fileName: file.name, rowCount: data.length };
}

/** Parse a single CSV line handling quoted fields */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  // Remove BOM from first field if present
  if (result.length > 0) {
    result[0] = result[0].replace(/^\uFEFF/, '');
  }

  return result;
}

/** Parse an Excel file using ExcelJS */
async function importExcel<T>(file: File): Promise<ImportResult<T>> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const data: T[] = [];
  const headers: string[] = [];

  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    headers[colNumber - 1] = cell.text;
  });

  // Get data from subsequent rows
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header row

    const rowData: Record<string, any> = {};
    row.eachCell((cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) {
        rowData[header] = cell.value;
      }
    });
    data.push(rowData as T);
  });

  return {
    data,
    headers,
    fileName: file.name,
    rowCount: data.length,
  };
}

// ═══════════════════════════════════════════
// Internal Helpers
// ═══════════════════════════════════════════

/** Trigger a browser download from a Blob */
function triggerDownload(blob: Blob, filename: string): void {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
