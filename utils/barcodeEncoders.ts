/**
 * Barcode Encoder Utilities
 * 
 * Specifically designed for "Libre Barcode 128" font.
 * 
 * Supports:
 * - Code 128 Set B (Standard ASCII 32-126)
 * - Code 128 Set C (Numeric Pairs 00-99, High Density)
 * 
 * Logic:
 * Automatically selects Set C if the input is purely numeric and has an even length (>= 4 digits).
 * Otherwise, falls back to Set B.
 */

const START_CODE_B = 104;
const START_CODE_C = 105;
const STOP_CODE = 106;

/**
 * Maps a Code 128 value (0-106) to the specific character used by the 
 * "Libre Barcode 128" font.
 * 
 * Mapping Reference:
 * Values 0-94   -> ASCII 32-126 (' ' to '~')
 * Values 95-106 -> ASCII 195-206 (Ã to Î)
 */
const mapValueToChar = (value: number): string => {
  if (value >= 0 && value <= 94) {
    return String.fromCharCode(value + 32);
  }
  if (value >= 95 && value <= 106) {
    return String.fromCharCode(value + 100);
  }
  return '';
};

/**
 * Encodes a string into Code 128 (Set B or C) for use with "Libre Barcode 128" font.
 * 
 * @param text - The content to encode
 * @returns The encoded string ready for display with the barcode font
 */
export const encodeCode128 = (text: string): string => {
  if (!text) return '';

  // 1. Determine optimized set
  // Use Set C if the text is numeric, even length, and long enough to benefit (>= 4 digits)
  const isNumeric = /^\d+$/.test(text);
  const useSetC = isNumeric && text.length >= 4 && text.length % 2 === 0;

  let checksum = 0;
  let encoded = '';
  let position = 1; // Checksum weighting starts at 1 for data characters

  if (useSetC) {
    // --- Set C Encoding (Numeric Pairs) ---
    const startValue = START_CODE_C;
    encoded += mapValueToChar(startValue);
    checksum = startValue;

    for (let i = 0; i < text.length; i += 2) {
      const pair = text.substring(i, i + 2);
      const value = parseInt(pair, 10);
      
      encoded += mapValueToChar(value);
      checksum += value * position;
      position++;
    }

  } else {
    // --- Set B Encoding (Standard ASCII) ---
    // Sanitize: Only allow ASCII 32-126
    const validText = text.replace(/[^\x20-\x7E]/g, '');
    if (!validText) return '';

    const startValue = START_CODE_B;
    encoded += mapValueToChar(startValue);
    checksum = startValue;

    for (let i = 0; i < validText.length; i++) {
      const charCode = validText.charCodeAt(i);
      const value = charCode - 32;

      encoded += mapValueToChar(value);
      checksum += value * position;
      position++;
    }
  }

  // 3. Append Checksum
  const checksumValue = checksum % 103;
  encoded += mapValueToChar(checksumValue);

  // 4. Append Stop Code
  encoded += mapValueToChar(STOP_CODE);

  return encoded;
};
