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

  // Sanitize: Only allow ASCII 32-126
  const validText = text.replace(/[^\x20-\x7E]/g, '');
  if (!validText) return '';

  let checksum = 0;
  let encoded = '';
  let position = 1;

  const isDigit = (c: string) => c >= '0' && c <= '9';
  const countDigits = (pos: number) => {
    let c = 0;
    while (pos + c < validText.length && isDigit(validText[pos + c])) c++;
    return c;
  };

  let i = 0;
  let currentSet = '';

  const initialDigits = countDigits(0);
  // Start with Subset C if we have >= 4 digits, or exactly 2 digits for the whole string
  if (initialDigits >= 4 || (initialDigits >= 2 && initialDigits === validText.length && validText.length % 2 === 0)) {
    currentSet = 'C';
    const startValue = START_CODE_C;
    encoded += mapValueToChar(startValue);
    checksum = startValue;
  } else {
    currentSet = 'B';
    const startValue = START_CODE_B;
    encoded += mapValueToChar(startValue);
    checksum = startValue;
  }

  while (i < validText.length) {
    if (currentSet === 'C') {
      const digitsRemaining = countDigits(i);
      if (digitsRemaining >= 2) {
        const pair = validText.substring(i, i + 2);
        const value = parseInt(pair, 10);
        encoded += mapValueToChar(value);
        checksum += value * position++;
        i += 2;
      } else {
        // Switch to Subset B
        currentSet = 'B';
        const value = 100; // CODE B
        encoded += mapValueToChar(value);
        checksum += value * position++;
      }
    } else {
      // currentSet === 'B'
      const digitsRemaining = countDigits(i);
      // Switch to Subset C if we have 4+ consecutive digits
      if (digitsRemaining >= 4) {
        // If odd number of digits, encode the first one in Subset B to leave an even pair
        if (digitsRemaining % 2 !== 0) {
          const charCode = validText.charCodeAt(i);
          const value = charCode - 32;
          encoded += mapValueToChar(value);
          checksum += value * position++;
          i++;
        }
        currentSet = 'C';
        const value = 99; // CODE C
        encoded += mapValueToChar(value);
        checksum += value * position++;
      } else {
        const charCode = validText.charCodeAt(i);
        const value = charCode - 32;
        encoded += mapValueToChar(value);
        checksum += value * position++;
        i++;
      }
    }
  }

  // 3. Append Checksum
  const checksumValue = checksum % 103;
  encoded += mapValueToChar(checksumValue);

  // 4. Append Stop Code
  encoded += mapValueToChar(STOP_CODE);

  return encoded;
};
