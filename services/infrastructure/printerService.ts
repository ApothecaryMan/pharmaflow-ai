import { isTauri } from '@/utils/platform';

/**
 * Receipt Printer Service
 * 
 * Handles direct printing for POS receipts.
 * Falls back to standard window.print() if not running in Tauri (desktop mode).
 */

export const printerService = {
  /**
   * Print a POS receipt
   * @param data Receipt structure for tauri-plugin-thermal-printer
   */
  async printReceipt(data: any): Promise<boolean> {
    if (isTauri()) {
      try {
        // Dynamically import the plugin only when running in Tauri
        const { print_thermal_printer, list_thermal_printers } = await import('tauri-plugin-thermal-printer');
        
        const printers = await list_thermal_printers();
        if (!printers || printers.length === 0) {
          console.warn('No printers found for direct printing');
          return false;
        }

        // Use the first printer by default or logic to pick the correct one
        await print_thermal_printer({
          printer: printers[0].name,
          sections: data.sections,
          options: { code_page: 0 },
          paper_size: 'Mm80'
        });
        return true;
      } catch (error) {
        console.error('Failed to print via Tauri:', error);
        return false;
      }
    } else {
      // Fallback for web mode: standard window print
      console.log('Running in web mode, using browser print dialog');
      window.print();
      return true;
    }
  },

  /**
   * List available printers (Desktop only)
   */
  async getPrinters(): Promise<any[]> {
    if (isTauri()) {
      try {
        const { list_thermal_printers } = await import('tauri-plugin-thermal-printer');
        return await list_thermal_printers();
      } catch (error) {
        console.error('Failed to list printers:', error);
        return [];
      }
    }
    return [];
  }
};
