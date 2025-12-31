/**
 * PrinterService - WebUSB Printer Management
 * 
 * Provides direct browser-to-printer communication for silent printing.
 * Supports USB thermal printers (ESC/POS protocol).
 */

// WebUSB Type Declarations (for TypeScript)
declare global {
    interface Navigator {
        usb: USB;
    }
    interface USB {
        requestDevice(options: USBDeviceRequestOptions): Promise<USBDevice>;
        getDevices(): Promise<USBDevice[]>;
    }
    interface USBDeviceRequestOptions {
        filters: USBDeviceFilter[];
    }
    interface USBDeviceFilter {
        vendorId?: number;
        productId?: number;
    }
    interface USBDevice {
        vendorId: number;
        productId: number;
        productName?: string;
        serialNumber?: string;
        opened: boolean;
        configuration: USBConfiguration | null;
        open(): Promise<void>;
        close(): Promise<void>;
        selectConfiguration(configurationValue: number): Promise<void>;
        claimInterface(interfaceNumber: number): Promise<void>;
        transferOut(endpointNumber: number, data: BufferSource): Promise<USBOutTransferResult>;
    }
    interface USBConfiguration {
        interfaces: USBInterface[];
    }
    interface USBInterface {
        interfaceNumber: number;
        alternates: USBAlternateInterface[];
    }
    interface USBAlternateInterface {
        endpoints: USBEndpoint[];
    }
    interface USBEndpoint {
        endpointNumber: number;
        direction: 'in' | 'out';
    }
    interface USBOutTransferResult {
        bytesWritten: number;
        status: string;
    }
}

// --- Types ---

export interface PrinterDevice {
    id: string;
    name: string;
    vendorId: number;
    productId: number;
    connected: boolean;
    usbDevice?: USBDevice;
}

export interface PrinterSettings {
    barcodePrinter: PrinterDevice | null;
    receiptPrinter: PrinterDevice | null;
}

export type PrinterType = 'barcode' | 'receipt';

// --- Constants ---

const STORAGE_KEY = 'pharma_printer_settings';
const PRINTER_DEVICES_KEY = 'pharma_saved_printers';

// Common thermal printer vendor IDs
const KNOWN_PRINTER_VENDORS: Record<number, string> = {
    0x0483: 'STMicroelectronics',
    0x0525: 'PLX Technology',
    0x04B8: 'Epson',
    0x0519: 'Star Micronics',
    0x0DD4: 'Custom Engineering',
    0x0FE6: 'Kontron/ICS',
    0x1504: 'Citizen',
    0x1A86: 'QinHeng Electronics',
    0x1FC9: 'NXP',
    0x20D1: 'Xprinter',
    0x0416: 'TSC',
    0x0B00: 'Sewoo',
    0x0485: 'Nokia',
    0x28E9: 'Gainscha',
    0x154F: 'SNBC',
    0x6868: 'Rongta',
};

// ESC/POS Commands
export const ESCPOS = {
    INIT: new Uint8Array([0x1B, 0x40]),           // Initialize printer
    CUT: new Uint8Array([0x1D, 0x56, 0x00]),      // Full cut
    PARTIAL_CUT: new Uint8Array([0x1D, 0x56, 0x01]), // Partial cut
    FEED_LINE: new Uint8Array([0x0A]),           // Line feed
    FEED_LINES: (n: number) => new Uint8Array([0x1B, 0x64, n]), // Feed n lines
    ALIGN_LEFT: new Uint8Array([0x1B, 0x61, 0x00]),
    ALIGN_CENTER: new Uint8Array([0x1B, 0x61, 0x01]),
    ALIGN_RIGHT: new Uint8Array([0x1B, 0x61, 0x02]),
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]),
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]),
    DOUBLE_WIDTH: new Uint8Array([0x1B, 0x21, 0x20]),
    DOUBLE_HEIGHT: new Uint8Array([0x1B, 0x21, 0x10]),
    NORMAL_SIZE: new Uint8Array([0x1B, 0x21, 0x00]),
};

// --- Helper Functions ---

/**
 * Check if WebUSB is supported in the current browser
 */
export const isWebUSBSupported = (): boolean => {
    return 'usb' in navigator;
};

/**
 * Generate a unique ID for a USB device
 */
const generateDeviceId = (device: USBDevice): string => {
    return `${device.vendorId.toString(16)}-${device.productId.toString(16)}-${device.serialNumber || 'unknown'}`;
};

/**
 * Get a human-readable name for a USB device
 */
const getDeviceName = (device: USBDevice): string => {
    if (device.productName) {
        return device.productName;
    }
    const vendorName = KNOWN_PRINTER_VENDORS[device.vendorId] || 'Unknown';
    return `${vendorName} Printer (${device.vendorId.toString(16)}:${device.productId.toString(16)})`;
};

/**
 * Convert a string to Uint8Array for printing
 */
export const textToBytes = (text: string): Uint8Array => {
    const encoder = new TextEncoder();
    return encoder.encode(text);
};

// --- Storage Functions ---

/**
 * Load saved printer settings from localStorage
 */
export const loadPrinterSettings = (): PrinterSettings => {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load printer settings:', e);
    }
    return { barcodePrinter: null, receiptPrinter: null };
};

/**
 * Save printer settings to localStorage
 */
export const savePrinterSettings = (settings: PrinterSettings): void => {
    try {
        // Remove usbDevice reference before saving (not serializable)
        const cleanSettings: PrinterSettings = {
            barcodePrinter: settings.barcodePrinter ? {
                ...settings.barcodePrinter,
                usbDevice: undefined,
                connected: false
            } : null,
            receiptPrinter: settings.receiptPrinter ? {
                ...settings.receiptPrinter,
                usbDevice: undefined,
                connected: false
            } : null
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanSettings));
    } catch (e) {
        console.error('Failed to save printer settings:', e);
    }
};

/**
 * Load saved printer devices from localStorage
 */
export const loadSavedPrinters = (): PrinterDevice[] => {
    try {
        const saved = localStorage.getItem(PRINTER_DEVICES_KEY);
        if (saved) {
            return JSON.parse(saved);
        }
    } catch (e) {
        console.error('Failed to load saved printers:', e);
    }
    return [];
};

/**
 * Save printer devices to localStorage
 */
export const savePrinterDevices = (devices: PrinterDevice[]): void => {
    try {
        const cleanDevices = devices.map(d => ({
            ...d,
            usbDevice: undefined,
            connected: false
        }));
        localStorage.setItem(PRINTER_DEVICES_KEY, JSON.stringify(cleanDevices));
    } catch (e) {
        console.error('Failed to save printer devices:', e);
    }
};

// --- WebUSB Functions ---

/**
 * Request user to select a USB printer device
 * This will show the browser's device picker dialog
 */
export const requestPrinter = async (): Promise<PrinterDevice | null> => {
    if (!isWebUSBSupported()) {
        throw new Error('WebUSB is not supported in this browser');
    }

    try {
        // Request any USB device (user will see a picker)
        const device = await navigator.usb.requestDevice({
            filters: [] // Empty filter shows all devices
        });

        const printerDevice: PrinterDevice = {
            id: generateDeviceId(device),
            name: getDeviceName(device),
            vendorId: device.vendorId,
            productId: device.productId,
            connected: false,
            usbDevice: device
        };

        // Save to known devices
        const savedDevices = loadSavedPrinters();
        if (!savedDevices.find(d => d.id === printerDevice.id)) {
            savePrinterDevices([...savedDevices, printerDevice]);
        }

        return printerDevice;
    } catch (e: any) {
        if (e.name === 'NotFoundError') {
            // User cancelled the picker
            return null;
        }
        throw e;
    }
};

/**
 * Get all previously granted USB devices
 */
export const getGrantedPrinters = async (): Promise<PrinterDevice[]> => {
    if (!isWebUSBSupported()) {
        return [];
    }

    try {
        const devices = await navigator.usb.getDevices();
        return devices.map(device => ({
            id: generateDeviceId(device),
            name: getDeviceName(device),
            vendorId: device.vendorId,
            productId: device.productId,
            connected: device.opened,
            usbDevice: device
        }));
    } catch (e) {
        console.error('Failed to get granted printers:', e);
        return [];
    }
};

/**
 * Connect to a USB printer
 */
export const connectPrinter = async (printer: PrinterDevice): Promise<boolean> => {
    if (!printer.usbDevice) {
        // Try to find the device again
        const devices = await getGrantedPrinters();
        const found = devices.find(d => d.id === printer.id);
        if (!found?.usbDevice) {
            throw new Error('Printer not found. Please re-add it.');
        }
        printer.usbDevice = found.usbDevice;
    }

    try {
        const device = printer.usbDevice;
        
        if (!device.opened) {
            await device.open();
        }

        // Select configuration if needed
        if (device.configuration === null) {
            await device.selectConfiguration(1);
        }

        // Claim the interface (usually interface 0 for printers)
        const interfaceNum = device.configuration?.interfaces[0]?.interfaceNumber ?? 0;
        await device.claimInterface(interfaceNum);

        printer.connected = true;
        return true;
    } catch (e: any) {
        console.error('Failed to connect to printer:', e);
        printer.connected = false;
        throw new Error(`Failed to connect: ${e.message}`);
    }
};

/**
 * Disconnect from a USB printer
 */
export const disconnectPrinter = async (printer: PrinterDevice): Promise<void> => {
    if (printer.usbDevice?.opened) {
        try {
            await printer.usbDevice.close();
        } catch (e) {
            console.error('Error closing device:', e);
        }
    }
    printer.connected = false;
};

/**
 * Send raw data to a USB printer
 */
export const printRaw = async (printer: PrinterDevice, data: Uint8Array): Promise<void> => {
    if (!printer.usbDevice) {
        throw new Error('Printer not connected');
    }

    // Ensure connected
    if (!printer.connected) {
        await connectPrinter(printer);
    }

    const device = printer.usbDevice;
    
    // Find the OUT endpoint
    const iface = device.configuration?.interfaces[0];
    const alternate = iface?.alternates[0];
    const endpoint = alternate?.endpoints.find(e => e.direction === 'out');

    if (!endpoint) {
        throw new Error('No output endpoint found on printer');
    }

    try {
        await device.transferOut(endpoint.endpointNumber, data.buffer as ArrayBuffer);
    } catch (e: any) {
        console.error('Print failed:', e);
        throw new Error(`Print failed: ${e.message}`);
    }
};

/**
 * Print text to a USB printer
 */
export const printText = async (printer: PrinterDevice, text: string): Promise<void> => {
    const data = new Uint8Array([
        ...ESCPOS.INIT,
        ...textToBytes(text),
        ...ESCPOS.FEED_LINES(3),
        ...ESCPOS.CUT
    ]);
    await printRaw(printer, data);
};

/**
 * Print a test page to verify printer connection
 */
export const printTestPage = async (printer: PrinterDevice): Promise<void> => {
    const testContent = [
        ESCPOS.INIT,
        ESCPOS.ALIGN_CENTER,
        ESCPOS.BOLD_ON,
        textToBytes('PharmaFlow Test Print\n'),
        ESCPOS.BOLD_OFF,
        textToBytes('------------------------\n'),
        ESCPOS.ALIGN_LEFT,
        textToBytes(`Printer: ${printer.name}\n`),
        textToBytes(`ID: ${printer.id}\n`),
        textToBytes(`Time: ${new Date().toLocaleString('ar-EG')}\n`),
        textToBytes('------------------------\n'),
        ESCPOS.ALIGN_CENTER,
        textToBytes('If you see this, printing works!\n'),
        textToBytes('اذا رأيت هذا، الطباعة تعمل!\n'),
        ESCPOS.FEED_LINES(4),
        ESCPOS.CUT
    ];

    const data = new Uint8Array(
        testContent.reduce((acc: number[], arr) => [...acc, ...Array.from(arr)], [])
    );

    await printRaw(printer, data);
};

// --- High-level API ---

/**
 * Get the assigned printer for a specific type
 */
export const getAssignedPrinter = (type: PrinterType): PrinterDevice | null => {
    const settings = loadPrinterSettings();
    return type === 'barcode' ? settings.barcodePrinter : settings.receiptPrinter;
};

/**
 * Assign a printer for a specific type
 */
export const assignPrinter = (type: PrinterType, printer: PrinterDevice | null): void => {
    const settings = loadPrinterSettings();
    if (type === 'barcode') {
        settings.barcodePrinter = printer;
    } else {
        settings.receiptPrinter = printer;
    }
    savePrinterSettings(settings);
};

/**
 * Remove a saved printer
 */
export const removeSavedPrinter = (printerId: string): void => {
    // Remove from saved devices
    const devices = loadSavedPrinters();
    savePrinterDevices(devices.filter(d => d.id !== printerId));
    
    // Remove from assignments if assigned
    const settings = loadPrinterSettings();
    if (settings.barcodePrinter?.id === printerId) {
        settings.barcodePrinter = null;
    }
    if (settings.receiptPrinter?.id === printerId) {
        settings.receiptPrinter = null;
    }
    savePrinterSettings(settings);
};

/**
 * Print using the assigned printer for a type, with fallback
 */
export const printWithAssignedPrinter = async (
    type: PrinterType,
    data: Uint8Array,
    fallback?: () => void
): Promise<boolean> => {
    const printer = getAssignedPrinter(type);
    
    if (!printer) {
        if (fallback) {
            fallback();
            return false;
        }
        throw new Error(`No ${type} printer assigned`);
    }

    try {
        // Reconnect to get the USB device reference
        const grantedPrinters = await getGrantedPrinters();
        const connectedPrinter = grantedPrinters.find(p => p.id === printer.id);
        
        if (!connectedPrinter) {
            if (fallback) {
                fallback();
                return false;
            }
            throw new Error('Printer not available. Please reconnect.');
        }

        await printRaw(connectedPrinter, data);
        return true;
    } catch (e) {
        console.error('WebUSB print failed:', e);
        if (fallback) {
            fallback();
            return false;
        }
        throw e;
    }
};
