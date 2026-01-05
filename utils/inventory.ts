/**
 * Stock Validation and Formatting Utilities
 * 
 * This module provides utility functions for managing product stock in a warehouse/inventory system.
 * Stock is stored internally as total units, but displayed to users as a combination of packs and loose units.
 * 
 * Example: If unitsPerPack = 12 and stock = 50:
 * - Internal storage: 50 (total units)
 * - Display format: "4 Packs + 2 Units" (4×12 + 2 = 50)
 */

/**
 * Validates and sanitizes stock values to ensure they're non-negative integers.
 * 
 * This function handles edge cases in stock input:
 * - Converts floating point numbers to integers (rounds to nearest whole number)
 * - Treats negative values as zero (stock can't be negative)
 * - Handles NaN/invalid inputs by returning zero
 * 
 * @param stock - Raw stock number that may be invalid, negative, or fractional
 * @returns A valid non-negative integer representing total units in stock
 * 
 * @example
 * validateStock(15.7)  // Returns: 16 (rounded up)
 * validateStock(-5)    // Returns: 0 (negatives not allowed)
 * validateStock(NaN)   // Returns: 0 (invalid input)
 */
export const validateStock = (stock: number): number => {
    if (isNaN(stock) || stock < 0) return 0;
    return Math.round(stock);
};

/**
 * Converts total unit count into a human-readable format showing packs and loose units.
 * 
 * This function breaks down total units into full packs and remaining individual units,
 * making inventory levels easier to understand and communicate. The output format adapts
 * based on the stock composition:
 * - Only packs: "10 Packs"
 * - Only units: "5 Units"
 * - Both: "10 Packs + 5 Units"
 * - Empty: "Out of Stock"
 * 
 * @param stock - Total number of units in stock (should be non-negative integer)
 * @param unitsPerPack - Number of individual units that comprise one pack (default: 1)
 * @returns Formatted string describing stock in terms of packs and units
 * 
 * @example
 * formatStock(50, 12)  // Returns: "4 Packs + 2 Units" (4×12 + 2)
 * formatStock(48, 12)  // Returns: "4 Packs" (exactly 4 packs)
 * formatStock(5, 12)   // Returns: "5 Units" (less than 1 pack)
 * formatStock(0, 12)   // Returns: "Out of Stock"
 * formatStock(10, 1)   // Returns: "10 Packs" (when unitsPerPack=1, treats each unit as a pack)
 */
export const formatStock = (stock: number, unitsPerPack: number = 1): string => {
    if (stock <= 0) return 'Out of Stock';
    
    // If unit based (1 unit/pack), just show count
    if (unitsPerPack === 1) return `${stock} Packs`;
    
    // User request: Show stock as fractional packs visually (e.g. 5.5 Packs)
    const packs = stock / unitsPerPack;
    
    // If integer, show as integer
    if (Number.isInteger(packs)) return `${packs} Packs`;
    
    // Show up to 2 decimal places, stripping trailing zeros if possible (e.g. 5.50 -> 5.5)
    return `${parseFloat(packs.toFixed(2))} Packs`;
};

/**
 * Determines the visual status indicator (color classes) based on stock levels.
 * 
 * This function calculates stock health by converting total units to pack count
 * and comparing against a minimum threshold. Returns Tailwind CSS classes for
 * conditional styling based on three states:
 * 
 * Stock Status Levels:
 * - Critical (Red): Stock is completely depleted (0 units)
 * - Warning (Orange): Stock is below minimum threshold (low inventory)
 * - Healthy (Green): Stock meets or exceeds minimum threshold
 * 
 * Note: The minStock parameter represents the minimum number of PACKS, not units.
 * The function converts total units to packs before comparison.
 * 
 * @param stock - Total number of units currently in stock
 * @param minStock - Minimum acceptable number of packs before triggering warning (default: 10)
 * @param unitsPerPack - Number of units in one pack, used for conversion (default: 1)
 * @returns Tailwind CSS classes for text color and background color
 * 
 * @example
 * // Product with 12 units per pack, minimum 10 packs required
 * getStockStatusColor(0, 10, 12)    // Returns: "text-red-600 bg-red-50" (out of stock)
 * getStockStatusColor(100, 10, 12)  // Returns: "text-orange-600 bg-orange-50" (8.3 packs < 10)
 * getStockStatusColor(150, 10, 12)  // Returns: "text-green-600 bg-green-50" (12.5 packs >= 10)
 */
export const getStockStatusColor = (
    stock: number, 
    minStock: number = 10, 
    unitsPerPack: number = 1
): string => {
    // Convert total units to pack count for threshold comparison
    const totalPacks = stock / unitsPerPack;
    
    // Determine status level and return corresponding Tailwind classes
    if (stock <= 0) return 'text-red-600 bg-red-50';           // Critical: Empty
    if (totalPacks < minStock) return 'text-orange-600 bg-orange-50';  // Warning: Low
    return 'text-green-600 bg-green-50';                       // Healthy: Sufficient
};