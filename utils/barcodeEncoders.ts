
/**
 * Encodes a string into Code 128 Format B for use with "Libre Barcode 128" font.
 * This implementation focuses on Code Set B (Standard ASCII 32-126).
 * 
 * Logic based on standard Code 128 algorithm:
 * 1. Start Code B (Value 104)
 * 2. Data characters
 * 3. Checksum
 * 4. Stop Code (Value 106)
 */
export const encodeCode128 = (text: string): string => {
  if (!text) return '';

  // Filter for valid Code 128B characters (ASCII 32-126)
  // We can't easily switch to A or C in this simple implementation, so we strip invalid chars
  const validText = text.replace(/[^\x20-\x7E]/g, '');
  if (!validText) return '';

  let checksum = 104; // Start Code B value
  let encoded = '';

  // 1. Add Start Code B
  // Value 104 maps to char 'Ì' (ASCII 204) in typical font mapping, 
  // but Libre Barcode 128 often uses specific mapping.
  // Standard mapping for values 0-94 is ASCII 32-126.
  // Values 95-106 map to ASCII 195-206.
  // Start B (104) -> 104 + 100 = 204 (Ì)
  encoded += String.fromCharCode(204); 

  // 2. Encode Data
  for (let i = 0; i < validText.length; i++) {
    const charCode = validText.charCodeAt(i);
    const value = charCode - 32;
    
    // Checksum calculation: sum += value * position
    checksum += value * (i + 1);
    
    encoded += validText[i];
  }

  // 3. Calculate Checksum Character
  const checksumValue = checksum % 103;
  
  // Map checksum value to character
  let checksumChar = '';
  if (checksumValue < 95) {
      checksumChar = String.fromCharCode(checksumValue + 32);
  } else {
      checksumChar = String.fromCharCode(checksumValue + 100);
  }
  encoded += checksumChar;

  // 4. Add Stop Code
  // Value 106 -> 106 + 100 = 206 (Î)
  encoded += String.fromCharCode(206);

  return encoded;
};
