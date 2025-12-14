/**
 * Printing Utilities
 * 
 * This module exports all printing-related utilities for thermal receipt printers.
 * 
 * Features:
 * - ESC/POS command set for thermal printers
 * - Receipt builder for generating print data
 * - Thermal printer service for Serial, USB, and network printing
 * - Paper size support: 58mm, 79mm, 80mm
 * 
 * Usage:
 * ```typescript
 * import { ThermalPrinterService, ReceiptBuilder } from '@/utils/printing';
 * 
 * // Method 1: Use ThermalPrinterService (recommended)
 * const printer = new ThermalPrinterService({ 
 *   connectionType: 'serial',
 *   paperSize: '79mm' 
 * });
 * await printer.printReceipt(sale);
 * 
 * // Method 2: Build receipt data manually
 * const builder = ReceiptBuilder.fromSale(sale, { paperSize: '79mm' });
 * const rawData = builder.build();
 * ```
 */

// ESC/POS Commands
export { 
  COMMANDS, 
  ESC, 
  GS, 
  FS, 
  DLE,
  stringToBytes,
  PAPER_WIDTHS,
} from './escpos-commands';
export type { PaperSize } from './escpos-commands';

// Receipt Builder
export { ReceiptBuilder } from './receipt-builder';
export type { ReceiptOptions } from './receipt-builder';

// Thermal Printer Service
export { 
  ThermalPrinterService,
  isSerialAvailable,
  isUSBAvailable,
} from './thermal-printer';
export type { 
  PrinterConnectionType, 
  PrinterConfig, 
  PrintResult 
} from './thermal-printer';
