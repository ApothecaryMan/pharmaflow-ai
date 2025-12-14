/**
 * ESC/POS Commands Reference
 * 
 * This module contains ESC/POS command constants for thermal printers.
 * Compatible with most ESC/POS printers (Epson, Star, Bixolon, etc.)
 */

// Initialize Printer
export const ESC = 0x1B;
export const GS = 0x1D;
export const FS = 0x1C;
export const DLE = 0x10;

// Printer Commands
export const COMMANDS = {
  // Initialize
  INIT: [ESC, 0x40], // ESC @
  
  // Text Formatting
  BOLD_ON: [ESC, 0x45, 0x01],      // ESC E 1
  BOLD_OFF: [ESC, 0x45, 0x00],     // ESC E 0
  UNDERLINE_ON: [ESC, 0x2D, 0x01], // ESC - 1
  UNDERLINE_OFF: [ESC, 0x2D, 0x00],// ESC - 0
  DOUBLE_HEIGHT_ON: [ESC, 0x21, 0x10],  // ESC ! 16
  DOUBLE_WIDTH_ON: [ESC, 0x21, 0x20],   // ESC ! 32
  DOUBLE_SIZE_ON: [ESC, 0x21, 0x30],    // ESC ! 48
  NORMAL_SIZE: [ESC, 0x21, 0x00],       // ESC ! 0
  
  // Alignment
  ALIGN_LEFT: [ESC, 0x61, 0x00],   // ESC a 0
  ALIGN_CENTER: [ESC, 0x61, 0x01], // ESC a 1
  ALIGN_RIGHT: [ESC, 0x61, 0x02],  // ESC a 2
  
  // Line Spacing
  LINE_SPACING_DEFAULT: [ESC, 0x32], // ESC 2
  LINE_SPACING_SET: (n: number) => [ESC, 0x33, n], // ESC 3 n
  
  // Feed
  LINE_FEED: [0x0A],              // LF
  FEED_LINES: (n: number) => [ESC, 0x64, n], // ESC d n
  FEED_PAPER: (n: number) => [ESC, 0x4A, n], // ESC J n (feeds n/200 inches)
  
  // Cut Paper
  CUT_PARTIAL: [GS, 0x56, 0x01],  // GS V 1
  CUT_FULL: [GS, 0x56, 0x00],     // GS V 0
  CUT_FEED_PARTIAL: [GS, 0x56, 0x42, 0x00], // GS V B 0
  
  // Cash Drawer
  CASH_DRAWER_KICK: [ESC, 0x70, 0x00, 0x19, 0xFA], // ESC p 0 25 250
  
  // Character Set
  CHARSET_PC437: [ESC, 0x74, 0x00],     // ESC t 0 (USA)
  CHARSET_KATAKANA: [ESC, 0x74, 0x01],  // ESC t 1
  CHARSET_PC850: [ESC, 0x74, 0x02],     // ESC t 2 (Multilingual)
  CHARSET_PC860: [ESC, 0x74, 0x03],     // ESC t 3 (Portuguese)
  CHARSET_PC863: [ESC, 0x74, 0x04],     // ESC t 4 (Canadian-French)
  CHARSET_PC865: [ESC, 0x74, 0x05],     // ESC t 5 (Nordic)
  CHARSET_WPC1252: [ESC, 0x74, 0x10],   // ESC t 16 (Western European)
  CHARSET_PC866: [ESC, 0x74, 0x11],     // ESC t 17 (Cyrillic)
  CHARSET_PC852: [ESC, 0x74, 0x12],     // ESC t 18 (Latin2)
  CHARSET_PC858: [ESC, 0x74, 0x13],     // ESC t 19 (Euro)
  CHARSET_ARABIC: [ESC, 0x74, 0x1C],    // ESC t 28 (Arabic)
  
  // Barcode
  BARCODE_HEIGHT: (n: number) => [GS, 0x68, n],        // GS h n
  BARCODE_WIDTH: (n: number) => [GS, 0x77, n],         // GS w n (1-6)
  BARCODE_TEXT_BELOW: [GS, 0x48, 0x02],                // GS H 2
  BARCODE_TEXT_ABOVE: [GS, 0x48, 0x01],                // GS H 1
  BARCODE_TEXT_NONE: [GS, 0x48, 0x00],                 // GS H 0
  BARCODE_CODE128: (data: string) => [GS, 0x6B, 0x49, data.length + 2, 0x7B, 0x42, ...stringToBytes(data)], // GS k 73 n {B data
  BARCODE_CODE39: (data: string) => [GS, 0x6B, 0x04, ...stringToBytes(data), 0x00], // GS k 4 data NUL
  BARCODE_EAN13: (data: string) => [GS, 0x6B, 0x02, ...stringToBytes(data), 0x00],  // GS k 2 data NUL
  
  // QR Code
  QR_MODEL: [GS, 0x28, 0x6B, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00], // Model 2
  QR_SIZE: (n: number) => [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x43, n], // Size 1-16
  QR_ERROR_LEVEL: (level: 'L' | 'M' | 'Q' | 'H') => {
    const levels = { L: 48, M: 49, Q: 50, H: 51 };
    return [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x45, levels[level]];
  },
  QR_STORE: (data: string) => {
    const bytes = stringToBytes(data);
    const len = bytes.length + 3;
    return [GS, 0x28, 0x6B, len & 0xFF, (len >> 8) & 0xFF, 0x31, 0x50, 0x30, ...bytes];
  },
  QR_PRINT: [GS, 0x28, 0x6B, 0x03, 0x00, 0x31, 0x51, 0x30],
};

/**
 * Convert string to byte array
 */
export function stringToBytes(str: string): number[] {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    bytes.push(str.charCodeAt(i));
  }
  return bytes;
}

/**
 * Paper widths in characters for different roll sizes
 */
export const PAPER_WIDTHS = {
  '58mm': 32,  // 32 characters
  '79mm': 42,  // 42 characters  
  '80mm': 48,  // 48 characters
};

export type PaperSize = keyof typeof PAPER_WIDTHS;
