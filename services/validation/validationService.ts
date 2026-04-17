/**
 * Validation Service - Centralized rules for data integrity
 */

export const validationService = {
  /**
   * Validates standard barcode formats (EAN-8, EAN-13, UPC-A)
   */
  isValidBarcode: (barcode: string): boolean => {
    if (!barcode) return false;
    // Standard barcode: 8 to 14 digits
    const barcodeRegex = /^\d{8,14}$/;
    return barcodeRegex.test(barcode);
  },

  /**
   * Validates entity codes (e.g., CUST-123456, DRUG-000001)
   */
  isValidEntityCode: (code: string, prefix: string): boolean => {
    if (!code) return false;
    const regex = new RegExp(`^${prefix}-\\d{6}$`);
    return regex.test(code);
  },

  /**
   * Validates Egyptian Phone Numbers
   */
  isValidPhone: (phone: string): boolean => {
    if (!phone) return false;
    // Matches: 010..., 011..., 012..., 015... with optional +2 or 002 prefix
    const phoneRegex = /^(?:\+2|002)?01[0125]\d{8}$/;
    return phoneRegex.test(phone);
  },

  /**
   * Validates Email
   */
  isValidEmail: (email: string): boolean => {
    if (!email) return true; // Optional by default in many forms
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};
