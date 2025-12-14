/**
 * ESC/POS Receipt Builder
 * 
 * Builds thermal receipt data in ESC/POS format.
 * Can be used to generate raw print data for direct printing.
 */

import { COMMANDS, stringToBytes, PAPER_WIDTHS, PaperSize } from './escpos-commands';
import { Sale } from '../../types';

export interface ReceiptOptions {
  paperSize?: PaperSize;
  storeName?: string;
  storeSubtitle?: string;
  footerMessage?: string;
  printBarcode?: boolean;
  cutPaper?: boolean;
  openCashDrawer?: boolean;
}

const defaultOptions: ReceiptOptions = {
  paperSize: '79mm',
  storeName: 'PharmaFlow',
  storeSubtitle: 'Pharmacy Management System',
  footerMessage: 'THANKS FOR CHOOSING PHARMAFLOW',
  printBarcode: true,
  cutPaper: true,
  openCashDrawer: false,
};

/**
 * ESC/POS Receipt Builder Class
 */
export class ReceiptBuilder {
  private buffer: number[] = [];
  private width: number;
  private options: ReceiptOptions;

  constructor(options: ReceiptOptions = {}) {
    this.options = { ...defaultOptions, ...options };
    this.width = PAPER_WIDTHS[this.options.paperSize || '79mm'];
    this.initialize();
  }

  /**
   * Initialize printer
   */
  private initialize(): this {
    this.buffer.push(...COMMANDS.INIT);
    this.buffer.push(...COMMANDS.CHARSET_WPC1252); // Western European for Arabic support
    return this;
  }

  /**
   * Add raw bytes
   */
  raw(bytes: number[]): this {
    this.buffer.push(...bytes);
    return this;
  }

  /**
   * Add text
   */
  text(str: string): this {
    this.buffer.push(...stringToBytes(str));
    return this;
  }

  /**
   * Add new line
   */
  newLine(count: number = 1): this {
    for (let i = 0; i < count; i++) {
      this.buffer.push(...COMMANDS.LINE_FEED);
    }
    return this;
  }

  /**
   * Align text
   */
  align(position: 'left' | 'center' | 'right'): this {
    const commands = {
      left: COMMANDS.ALIGN_LEFT,
      center: COMMANDS.ALIGN_CENTER,
      right: COMMANDS.ALIGN_RIGHT,
    };
    this.buffer.push(...commands[position]);
    return this;
  }

  /**
   * Bold text
   */
  bold(enabled: boolean = true): this {
    this.buffer.push(...(enabled ? COMMANDS.BOLD_ON : COMMANDS.BOLD_OFF));
    return this;
  }

  /**
   * Double size text
   */
  doubleSize(enabled: boolean = true): this {
    this.buffer.push(...(enabled ? COMMANDS.DOUBLE_SIZE_ON : COMMANDS.NORMAL_SIZE));
    return this;
  }

  /**
   * Double height text
   */
  doubleHeight(enabled: boolean = true): this {
    this.buffer.push(...(enabled ? COMMANDS.DOUBLE_HEIGHT_ON : COMMANDS.NORMAL_SIZE));
    return this;
  }

  /**
   * Print a line of dashes
   */
  divider(char: string = '-'): this {
    this.text(char.repeat(this.width));
    this.newLine();
    return this;
  }

  /**
   * Print a row with left and right aligned text
   */
  row(left: string, right: string): this {
    const spaces = this.width - left.length - right.length;
    if (spaces > 0) {
      this.text(left + ' '.repeat(spaces) + right);
    } else {
      this.text(left.substring(0, this.width - right.length - 1) + ' ' + right);
    }
    this.newLine();
    return this;
  }

  /**
   * Print centered text
   */
  center(str: string): this {
    this.align('center');
    this.text(str);
    this.newLine();
    this.align('left');
    return this;
  }

  /**
   * Print barcode
   */
  barcode(data: string, type: 'CODE128' | 'CODE39' | 'EAN13' = 'CODE128'): this {
    this.align('center');
    this.buffer.push(...COMMANDS.BARCODE_HEIGHT(50));
    this.buffer.push(...COMMANDS.BARCODE_WIDTH(2));
    this.buffer.push(...COMMANDS.BARCODE_TEXT_BELOW);
    
    switch (type) {
      case 'CODE128':
        this.buffer.push(...COMMANDS.BARCODE_CODE128(data));
        break;
      case 'CODE39':
        this.buffer.push(...COMMANDS.BARCODE_CODE39(data));
        break;
      case 'EAN13':
        this.buffer.push(...COMMANDS.BARCODE_EAN13(data));
        break;
    }
    
    this.newLine(2);
    this.align('left');
    return this;
  }

  /**
   * Print QR code
   */
  qrCode(data: string, size: number = 6): this {
    this.align('center');
    this.buffer.push(...COMMANDS.QR_MODEL);
    this.buffer.push(...COMMANDS.QR_SIZE(size));
    this.buffer.push(...COMMANDS.QR_ERROR_LEVEL('M'));
    this.buffer.push(...COMMANDS.QR_STORE(data));
    this.buffer.push(...COMMANDS.QR_PRINT);
    this.newLine(2);
    this.align('left');
    return this;
  }

  /**
   * Cut paper
   */
  cut(partial: boolean = true): this {
    this.newLine(3);
    this.buffer.push(...(partial ? COMMANDS.CUT_PARTIAL : COMMANDS.CUT_FULL));
    return this;
  }

  /**
   * Open cash drawer
   */
  openCashDrawer(): this {
    this.buffer.push(...COMMANDS.CASH_DRAWER_KICK);
    return this;
  }

  /**
   * Get the built buffer as Uint8Array
   */
  build(): Uint8Array {
    return new Uint8Array(this.buffer);
  }

  /**
   * Get the built buffer as base64 string
   */
  toBase64(): string {
    const bytes = this.build();
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Build a complete receipt from a Sale object
   */
  static fromSale(sale: Sale, options: ReceiptOptions = {}): ReceiptBuilder {
    const opts = { ...defaultOptions, ...options };
    const builder = new ReceiptBuilder(opts);
    
    // Header
    builder
      .align('center')
      .bold(true)
      .doubleSize(true)
      .text(opts.storeName || 'PharmaFlow')
      .newLine()
      .doubleSize(false)
      .bold(false)
      .text(opts.storeSubtitle || '')
      .newLine(2)
      .align('left');

    // Divider
    builder.divider();

    // Customer & Order Info
    const customerDisplay = `${sale.customerCode || ''} ${sale.customerName || 'Guest'}`.trim();
    builder.row(customerDisplay, `SU ${sale.id.slice(-2)}`);
    
    // Date formatting: dd/mm/yyyy
    const date = new Date(sale.date);
    const dateStr = date.toLocaleDateString('en-GB');
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    builder.row(`ORDR ${sale.id}`, `${dateStr} ${timeStr}`);

    builder.divider();

    // Sale Type
    builder
      .align('center')
      .bold(true)
      .text(sale.saleType === 'delivery' ? 'DELIVERY' : 'DINE IN')
      .newLine();

    // Customer details for delivery
    if (sale.saleType === 'delivery') {
      if (sale.customerPhone) {
        builder.text(`Tel: ${sale.customerPhone}`).newLine();
      }
      if (sale.customerAddress) {
        builder.text(sale.customerAddress).newLine();
      }
    }
    
    builder.bold(false).align('left');
    builder.divider();

    // Items
    sale.items.forEach(item => {
      const effectivePrice = (item.isUnit && item.unitsPerPack)
        ? item.price / item.unitsPerPack
        : item.price;
      
      const itemName = `${item.name}${item.dosageForm ? ' ' + item.dosageForm : ''}${item.isUnit ? ' (UNIT)' : ''}`;
      builder.row(`${item.quantity} ${itemName}`, effectivePrice.toFixed(2));

      if (item.discount && item.discount > 0) {
        builder.text(`    -${item.discount}% DISC`).newLine();
      }
    });

    builder.divider();

    // Totals
    builder.row('* SUBTOTAL *', (sale.subtotal || 0).toFixed(2));
    
    if (sale.globalDiscount && sale.globalDiscount > 0) {
      const discountAmount = ((sale.subtotal || 0) * sale.globalDiscount / 100);
      builder.row(`DISCOUNT (${sale.globalDiscount}%)`, `-${discountAmount.toFixed(2)}`);
    }
    
    if (sale.deliveryFee && sale.deliveryFee > 0) {
      builder.row('DELIVERY', sale.deliveryFee.toFixed(2));
    }
    
    builder.row('TAX', '0.00');
    builder.row('PAYMENT', sale.total.toFixed(2));
    builder.row((sale.paymentMethod || 'CASH').toUpperCase(), sale.total.toFixed(2));
    builder.row('CHANGE DUE', '0.00');

    builder.divider();

    // Footer
    builder
      .align('center')
      .text(opts.footerMessage || 'THANKS FOR CHOOSING PHARMAFLOW')
      .newLine()
      .text('WE HOPE TO SEE YOU AGAIN SOON!!!')
      .newLine()
      .text(`TRN ${sale.id}`)
      .newLine(2);

    // Barcode
    if (opts.printBarcode) {
      builder.barcode(sale.id, 'CODE128');
    }

    // Order Number
    builder
      .align('center')
      .bold(true)
      .text(`ORDER # ${sale.id}`)
      .bold(false)
      .newLine();

    // Cut and cash drawer
    if (opts.cutPaper) {
      builder.cut();
    }
    
    if (opts.openCashDrawer) {
      builder.openCashDrawer();
    }

    return builder;
  }
}

export default ReceiptBuilder;
