/**
 * DataPortButton — Universal Export / Import Button
 *
 * A reusable dropdown button that can be placed anywhere in the app
 * to export data (CSV, Excel, PDF) or import data (CSV, Excel).
 *
 * Features:
 *   - 3 export formats: CSV, Excel (.xlsx), PDF (browser print)
 *   - Import: auto-detects CSV vs Excel
 *   - Compact dropdown design — fits in any toolbar/header
 *   - RTL/LTR aware, bilingual (AR/EN)
 *   - Fully typed with generic DataColumn definitions
 *
 * Usage:
 *   <DataPortButton
 *     language={language}
 *     data={filteredRows}
 *     columns={columnDefs}
 *     filename="employee-report"
 *     onImport={(result) => console.log(result.data)}
 *   />
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { TRANSLATIONS } from '../../i18n/translations';
import {
  exportToCSV,
  exportToExcel,
  exportToPDF,
  importFile,
  type DataColumn,
  type ImportResult,
  type PDFOptions,
} from '../../utils/exportUtils';

// ═══════════════════════════════════════════
// Props
// ═══════════════════════════════════════════

interface DataPortButtonProps<T extends Record<string, any>> {
  /** Current language */
  language: 'EN' | 'AR';
  /** Data rows to export */
  data: T[];
  /** Column definitions for export headers + mapping */
  columns: DataColumn<T>[];
  /** File name (without extension) */
  filename?: string;
  /** Enable/disable specific formats */
  formats?: {
    csv?: boolean;
    excel?: boolean;
    pdf?: boolean;
    import?: boolean;
  };
  /** PDF-specific options */
  pdfOptions?: PDFOptions;
  /** Callback when file is imported */
  onImport?: (result: ImportResult) => void;
  /** Button size variant */
  size?: 'sm' | 'md';
  /** Additional class for outer container */
  className?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Show only icon */
  iconOnly?: boolean;
}

// ═══════════════════════════════════════════
// Component
// ═══════════════════════════════════════════

export function DataPortButton<T extends Record<string, any>>({
  language,
  data,
  columns,
  filename = 'export',
  formats = { csv: true, excel: true, pdf: true, import: true },
  pdfOptions,
  onImport,
  size = 'sm',
  className = '',
  disabled = false,
  iconOnly = false,
}: DataPortButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[language];
  const isAR = language === 'AR';

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Clear feedback after 3s
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // ─── Export Handlers ───
  const handleCSV = useCallback(() => {
    setIsExporting('csv');
    try {
      exportToCSV(data, columns, filename);
      setFeedback({ type: 'success', msg: `${filename}.csv ✓` });
    } catch (err) {
      setFeedback({ type: 'error', msg: 'CSV export failed' });
    }
    setIsExporting(null);
    setIsOpen(false);
  }, [data, columns, filename]);

  const handleExcel = useCallback(async () => {
    setIsExporting('excel');
    try {
      await exportToExcel(data, columns, filename);
      setFeedback({ type: 'success', msg: `${filename}.xlsx ✓` });
    } catch (err) {
      setFeedback({ type: 'error', msg: 'Excel export failed' });
    }
    setIsExporting(null);
    setIsOpen(false);
  }, [data, columns, filename]);

  const handlePDF = useCallback(() => {
    setIsExporting('pdf');
    try {
      exportToPDF(data, columns, filename, {
        rtl: isAR,
        ...pdfOptions,
      });
      setFeedback({ type: 'success', msg: `PDF ✓` });
    } catch (err) {
      setFeedback({ type: 'error', msg: 'PDF export failed' });
    }
    setIsExporting(null);
    setIsOpen(false);
  }, [data, columns, filename, isAR, pdfOptions]);

  // ─── Import Handler ───
  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importFile(file);
      onImport?.(result);
      setFeedback({
        type: 'success',
        msg: `${result.rowCount} ${t.global.actions.rowsImported} ✓`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', msg: t.global.actions.importError });
    }

    // Reset input so same file can be re-selected
    e.target.value = '';
    setIsOpen(false);
  }, [onImport, t]);

  // ─── UI ───
  const isSm = size === 'sm';

  return (
    <div ref={dropdownRef} className={`relative inline-flex ${className}`}>
      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleImport}
        className="hidden"
      />

      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 transition-colors disabled:opacity-40 ${
          iconOnly 
            ? 'p-2.5' 
            : isSm ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm'
        }`}
      >
        <span className={`material-symbols-rounded ${isSm ? 'text-sm' : 'text-base'}`}>
          {isExporting ? 'progress_activity' : 'swap_vert'}
        </span>
        {!iconOnly && (
          <span className="font-semibold">
            {isAR ? 'بيانات' : 'Data'}
          </span>
        )}
        <span className={`material-symbols-rounded ${isSm ? 'text-xs' : 'text-sm'} opacity-50`}>
          expand_more
        </span>
      </button>

      {/* Feedback Badge */}
      {feedback && (
        <div
          className={`absolute -top-8 ${isAR ? 'right-0' : 'left-0'} px-2 py-1 rounded-md text-[10px] font-bold whitespace-nowrap animate-in fade-in slide-in-from-bottom-1 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600'
              : 'bg-rose-50 dark:bg-rose-900/20 text-rose-500'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute top-full mt-2 ${isAR ? 'left-0' : 'right-0'} min-w-[200px] rounded-2xl bg-white dark:bg-(--bg-menu) border border-gray-200 dark:border-white/10 shadow-2xl shadow-black/10 dark:shadow-black/40 py-2 z-50 animate-in fade-in zoom-in-95 duration-200`}
        >
          {/* Export Section Header */}
          <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
            {t.global.actions.exportData}
          </div>

          {/* CSV */}
          {formats.csv !== false && (
            <button
              onClick={handleCSV}
              disabled={data.length === 0}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all disabled:opacity-30 group"
            >
              <span className="material-symbols-rounded text-base text-emerald-500">csv</span>
              <span>{t.global.actions.exportCSV}</span>
              <span className="flex-1" />
              <span className="text-[10px] text-gray-400 tabular-nums">.csv</span>
            </button>
          )}

          {/* Excel */}
          {formats.excel !== false && (
            <button
              onClick={handleExcel}
              disabled={data.length === 0}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all disabled:opacity-30 group"
            >
              <span className="material-symbols-rounded text-base text-green-600">table_chart</span>
              <span>{t.global.actions.exportExcel}</span>
              <span className="flex-1" />
              <span className="text-[10px] text-gray-400 tabular-nums">.xlsx</span>
            </button>
          )}

          {/* PDF */}
          {formats.pdf !== false && (
            <button
              onClick={handlePDF}
              disabled={data.length === 0}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all disabled:opacity-30 group"
            >
              <span className="material-symbols-rounded text-base text-rose-500">picture_as_pdf</span>
              <span>{t.global.actions.exportPDF}</span>
              <span className="flex-1" />
              <span className="text-[10px] text-gray-400 tabular-nums">.pdf</span>
            </button>
          )}

          {/* Divider + Import */}
          {formats.import !== false && onImport && (
            <>
              <div className="h-px bg-gray-100 dark:bg-white/5 my-1.5" />
              <div className="px-3 py-1.5 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {t.global.actions.importData}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100/50 dark:hover:bg-white/10 transition-all group"
              >
                <span className="material-symbols-rounded text-base text-blue-500">upload_file</span>
                <span>{t.global.actions.importCSV}</span>
                <span className="flex-1" />
                <span className="text-[10px] text-gray-400">.csv .xlsx</span>
              </button>
            </>
          )}

          {/* Data count footer */}
          <div className="h-px bg-gray-100 dark:bg-white/5 mt-1.5" />
          <div className="px-3 py-1.5 text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-center">
            {data.length} {isAR ? 'صف' : 'rows'}
          </div>
        </div>
      )}
    </div>
  );
}

export default DataPortButton;
