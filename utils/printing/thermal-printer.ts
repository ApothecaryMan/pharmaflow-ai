/**
 * Thermal Printer Service
 * 
 * Provides methods to connect and print to thermal printers.
 * Supports Web Serial API, WebUSB, and network printing.
 */

import { ReceiptBuilder, ReceiptOptions } from './receipt-builder';
import { PaperSize } from './escpos-commands';
import { Sale } from '../../types';

export type PrinterConnectionType = 'serial' | 'usb' | 'network' | 'browser';

export interface PrinterConfig {
  connectionType: PrinterConnectionType;
  name?: string;
  // Serial options
  baudRate?: number;
  // Network options
  ipAddress?: string;
  port?: number;
  // Paper options
  paperSize?: PaperSize;
}

export interface PrintResult {
  success: boolean;
  message: string;
  error?: Error;
}

/**
 * Check if Web Serial API is available
 */
export function isSerialAvailable(): boolean {
  return 'serial' in navigator;
}

/**
 * Check if WebUSB API is available
 */
export function isUSBAvailable(): boolean {
  return 'usb' in navigator;
}

/**
 * Thermal Printer Service Class
 */
export class ThermalPrinterService {
  private config: PrinterConfig;
  // Using 'any' for experimental Web Serial and WebUSB APIs
  private serialPort: any = null;
  private usbDevice: any = null;
  private writer: WritableStreamDefaultWriter | null = null;

  constructor(config: PrinterConfig = { connectionType: 'browser' }) {
    this.config = {
      baudRate: 9600,
      paperSize: '79mm',
      ...config,
    };
  }

  /**
   * Connect to printer via Web Serial API
   */
  async connectSerial(): Promise<PrintResult> {
    if (!isSerialAvailable()) {
      return {
        success: false,
        message: 'Web Serial API not available. Use Chrome or Edge browser.',
      };
    }

    try {
      // Request port from user
      this.serialPort = await (navigator as any).serial.requestPort();
      
      // Open the port
      await this.serialPort.open({ 
        baudRate: this.config.baudRate || 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      });

      return {
        success: true,
        message: 'Connected to serial printer successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to serial printer',
        error: error as Error,
      };
    }
  }

  /**
   * Connect to printer via WebUSB API
   */
  async connectUSB(): Promise<PrintResult> {
    if (!isUSBAvailable()) {
      return {
        success: false,
        message: 'WebUSB API not available. Use Chrome or Edge browser.',
      };
    }

    try {
      // Request USB device from user
      this.usbDevice = await (navigator as any).usb.requestDevice({
        filters: [
          { vendorId: 0x04B8 }, // Epson
          { vendorId: 0x0519 }, // Star Micronics
          { vendorId: 0x0DD4 }, // Bixolon
          { vendorId: 0x0FE6 }, // Citizen
          { vendorId: 0x0416 }, // Sewoo
        ],
      });

      await this.usbDevice.open();
      
      if (this.usbDevice.configuration === null) {
        await this.usbDevice.selectConfiguration(1);
      }
      
      await this.usbDevice.claimInterface(0);

      return {
        success: true,
        message: `Connected to USB printer: ${this.usbDevice.productName}`,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to connect to USB printer',
        error: error as Error,
      };
    }
  }

  /**
   * Disconnect from printer
   */
  async disconnect(): Promise<void> {
    try {
      if (this.writer) {
        await this.writer.close();
        this.writer = null;
      }
      
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
      
      if (this.usbDevice) {
        await this.usbDevice.close();
        this.usbDevice = null;
      }
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }

  /**
   * Print raw ESC/POS data via Serial
   */
  async printSerial(data: Uint8Array): Promise<PrintResult> {
    if (!this.serialPort || !this.serialPort.writable) {
      return { success: false, message: 'Serial port not connected' };
    }

    try {
      const writer = this.serialPort.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
      
      return { success: true, message: 'Printed successfully via Serial' };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to print via Serial',
        error: error as Error,
      };
    }
  }

  /**
   * Print raw ESC/POS data via USB
   */
  async printUSB(data: Uint8Array): Promise<PrintResult> {
    if (!this.usbDevice) {
      return { success: false, message: 'USB device not connected' };
    }

    try {
      // Find the correct endpoint
      const interfaces = this.usbDevice.configuration?.interfaces || [];
      let endpointNumber = 1; // Default

      for (const iface of interfaces) {
        for (const alt of iface.alternates) {
          for (const endpoint of alt.endpoints) {
            if (endpoint.direction === 'out' && endpoint.type === 'bulk') {
              endpointNumber = endpoint.endpointNumber;
              break;
            }
          }
        }
      }

      await this.usbDevice.transferOut(endpointNumber, data);
      
      return { success: true, message: 'Printed successfully via USB' };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to print via USB',
        error: error as Error,
      };
    }
  }

  /**
   * Print receipt using browser print dialog (fallback)
   */
  printBrowser(sale: Sale, options: ReceiptOptions = {}): void {
    // This uses the existing HTML template approach
    // Import and use the printInvoice function from InvoiceTemplate
    import('../../components/sales/InvoiceTemplate').then(({ printInvoice }) => {
      printInvoice(sale, options);
    });
  }

  /**
   * Print a sale receipt
   */
  async printReceipt(sale: Sale, options: ReceiptOptions = {}): Promise<PrintResult> {
    const receiptOptions: ReceiptOptions = {
      paperSize: this.config.paperSize,
      ...options,
    };

    switch (this.config.connectionType) {
      case 'serial': {
        if (!this.serialPort) {
          const connectResult = await this.connectSerial();
          if (!connectResult.success) return connectResult;
        }
        const builder = ReceiptBuilder.fromSale(sale, receiptOptions);
        return this.printSerial(builder.build());
      }
      
      case 'usb': {
        if (!this.usbDevice) {
          const connectResult = await this.connectUSB();
          if (!connectResult.success) return connectResult;
        }
        const builder = ReceiptBuilder.fromSale(sale, receiptOptions);
        return this.printUSB(builder.build());
      }
      
      case 'network': {
        // Network printing requires a backend server
        return {
          success: false,
          message: 'Network printing requires a backend proxy. Use /api/print endpoint.',
        };
      }
      
      case 'browser':
      default: {
        this.printBrowser(sale, receiptOptions);
        return { success: true, message: 'Opened browser print dialog' };
      }
    }
  }

  /**
   * Get available printer connection types
   */
  static getAvailableConnectionTypes(): PrinterConnectionType[] {
    const types: PrinterConnectionType[] = ['browser'];
    
    if (isSerialAvailable()) {
      types.push('serial');
    }
    
    if (isUSBAvailable()) {
      types.push('usb');
    }
    
    return types;
  }
}

export default ThermalPrinterService;
