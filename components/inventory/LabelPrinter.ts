/**
 * LabelPrinter - Reusable Label Printing Utility
 * 
 * Provides batch printing functionality using templates from BarcodeStudio.
 * Can print single drugs with quantities or multiple drugs with different expiry dates.
 */

import { Drug } from '../../types';
import { encodeCode128 } from '../../utils/barcodeEncoders';
import { getPrinterSettings, printLabelSilently } from '../../utils/qzPrinter';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';

// --- Types ---

/**
 * Represents a single visual element within a label design.
 */
export interface LabelElement {
    /** Unique identifier for the element (e.g., 'drugName', 'barcode') */
    id: string;
    /** The type of content to render */
    type: 'text' | 'barcode' | 'qrcode' | 'image';
    /** Human-readable name for the element in the UI */
    label: string;
    /** Horizontal position in millimeters */
    x: number;
    /** Vertical position in millimeters */
    y: number;
    /** Width in millimeters (required for images/shapes) */
    width?: number;
    /** Height in millimeters (required for images/shapes) */
    height?: number;
    /** Font size in pixels */
    fontSize?: number;
    /** CSS font-weight value (e.g., 'bold', '700') */
    fontWeight?: string;
    /** Text alignment relative to the x/y coordinates */
    align?: 'left' | 'center' | 'right';
    /** Static content for text/images, or specific identifier */
    content?: string;
    /** Whether the element should be rendered or hidden */
    isVisible: boolean;
    /** hex or named color for the element */
    color?: string;
    /** Mapping to a data field from the Drug object or system settings */
    field?: keyof Drug | 'unit' | 'store' | 'hotline';
    /** Prevents the element from being moved in the UI editor */
    locked?: boolean;
    /** Specific barcode symbology and styling options */
    barcodeFormat?: 'code39' | 'code39-text' | 'code128' | 'code128-text';
    /** Rotation angle in degrees (currently only 0 or 90 supported) */
    rotation?: 0 | 90;
    
    // Hitbox calibration (manual adjustment for selection accuracy in BarcodeStudio)
    /** Horizontal offset for the selection hitbox in mm */
    hitboxOffsetX?: number;
    /** Vertical offset for the selection hitbox in mm */
    hitboxOffsetY?: number;
    /** Width override for the selection hitbox in mm */
    hitboxWidth?: number;
    /** Height override for the selection hitbox in mm */
    hitboxHeight?: number;
}

/**
 * Container for a complete label layout design.
 */
export interface LabelDesign {
    /** List of all elements included in this design */
    elements: LabelElement[];
    /** Key referencing a preset in LABEL_PRESETS */
    selectedPreset: string;
    /** Physical dimensions if selectedPreset is 'custom' */
    customDims?: { w: number; h: number };
    /** Rule for which barcode value to prioritize */
    barcodeSource?: 'global' | 'internal';
    /** UI helper to show boxes around elements for layout debugging */
    showPrintBorders?: boolean;
    /** Global horizontal print offset (calibration) in mm */
    printOffsetX?: number;
    /** Global vertical print offset (calibration) in mm */
    printOffsetY?: number;
    /** Vertical gap between labels on the same page in mm */
    labelGap?: 0 | 0.5 | 1;
    /** Currency symbol preference */
    currency?: 'EGP' | 'USD';
}

/**
 * Data required to print a label for a specific item.
 */
export interface PrintLabelItem {
    /** The drug entity containing data to be rendered */
    drug: Drug;
    /** Number of copies to print */
    quantity: number;
    /** Optional date string to override the drug's default expiry */
    expiryDateOverride?: string;
}

/**
 * Global configuration options for the printing process.
 */
export interface PrintOptions {
    /** Skip local storage lookups and use hardcoded basic style */
    forceBasicTemplate?: boolean;
    /** Enable visualization of label boundaries (useful for testing) */
    showBorders?: boolean;
    /** UNUSED: Legacy property for dual-roll grouping (now handled automatically) */
    pairedLabels?: boolean;
    /** Use a specific design instead of searching local storage */
    design?: LabelDesign;
    /** Overrides for specific element visibility by ID */
    elementVisibility?: Record<string, boolean>;
}

// --- Constants ---

/**
 * Industry-standard physical dimensions for common thermal label sizes.
 * Values are in millimeters (mm).
 */
export const LABEL_PRESETS: Record<string, { w: number; h: number; label: string }> = {
    '38x12': { w: 38, h: 12, label: '38×12 mm (Single)' },
    '38x25': { w: 38, h: 25, label: '38×25 mm (Double)' }
};

/**
 * Retrieves physical dimensions for a preset, with automatic fallback.
 * @param presetKey - The key to look up (e.g., '38x12')
 * @param customDims - Custom dimensions to return if key is 'custom'
 * @returns Object with width (w) and height (h) in mm
 */
export const getPresetDimensions = (
    presetKey: string, 
    customDims?: { w: number; h: number }
): { w: number; h: number } => {
    if (presetKey === 'custom' && customDims) return customDims;
    return LABEL_PRESETS[presetKey] || LABEL_PRESETS['38x12'];
};

/** Configuration for the popup window used to trigger the browser's print dialog */
const PRINT_WINDOW_CONFIG = {
    width: 800,
    height: 1000,
    features: 'width=800,height=1000,scrollbars=yes,resizable=yes'
} as const;

/**
 * Escapes special HTML characters to prevent XSS when rendering drug data.
 * @param text - Raw text to escape
 * @returns HTML-safe string
 */
const escapeHtml = (text: string): string => {
    const map: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
};

/**
 * Ensures minimal required data exists for a drug before attempting to print.
 * @param drug - The drug object to validate
 * @returns True if valid, false otherwise
 */
const validateDrug = (drug: Drug): boolean => {
    return !!(
        drug &&
        (drug.id || drug.internalCode) &&
        drug.name &&
        typeof drug.price === 'number'
    );
};

/**
 * Resolves the final content for a label element, handling dynamic fields.
 * Bridges the gap between a design element and actual drug/system data.
 * @param el - The visual element definition
 * @param drug - Source drug data
 * @param receiptSettings - Global settings (store name, etc.)
 * @param expiryOverride - Optional manual expiry date
 * @returns The final string content to display in the element
 */
export const getLabelElementContent = (
    el: LabelElement,
    drug: Drug,
    receiptSettings: { storeName: string; hotline: string },
    expiryOverride?: string,
    currency: 'EGP' | 'USD' = 'EGP',
    barcodeSource: 'global' | 'internal' = 'global'
): string => {
    if (el.content) return el.content;
    if (!el.field) return el.label;

    switch (el.field as string) {
        case 'store': return receiptSettings.storeName;
        case 'hotline': return receiptSettings.hotline || '19099';
        case 'name': return drug.name;
        case 'price': return `${Number(drug.price).toFixed(2)} ${currency === 'EGP' ? 'EGP' : '$'}`;
        case 'barcode': return barcodeSource === 'internal' 
            ? (drug.internalCode || drug.id) 
            : (drug.barcode || drug.id);
        case 'type': return (drug as any).type || '';
        case 'unit': return (drug as any).unit || '';
        case 'expiryDate': 
            if (expiryOverride) return expiryOverride;
             // If drug has expiry date, use it, otherwise show generic format MM/YYYY
            return drug.expiryDate ? new Date(drug.expiryDate).toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }) : 'MM/YYYY';
        case 'genericName': return drug.genericName || '';
        default: return el.content || el.label || '';
    }
};



/**
 * Retrieves global store branding from Storage (receipt module shared settings).
 * Used to populate 'store' and 'hotline' fields on labels.
 * @returns Object with storeName and hotline
 */
export const getReceiptSettings = (): { storeName: string; hotline: string } => {
    const defaultSettings = { storeName: 'PharmaFlow', hotline: '19099' };
    
    try {
        const templates = storage.get<any[]>(StorageKeys.RECEIPT_TEMPLATES, []);
        if (templates.length === 0) {
            return defaultSettings;
        }
        
        const activeId = storage.get<string | null>(StorageKeys.RECEIPT_ACTIVE_TEMPLATE_ID, null);
        const activeTemplate = templates.find((t: any) => t?.id === activeId) ||
            templates.find((t: any) => t?.isDefault) ||
            templates[0];
        
        if (activeTemplate?.options) {
            return {
                storeName: activeTemplate.options.storeName || defaultSettings.storeName,
                hotline: activeTemplate.options.headerHotline || defaultSettings.hotline
            };
        }
    } catch (e) { 
        console.error('Failed to read receipt settings:', e);
    }
    
    return defaultSettings;
};

/**
 * Resolves the preferred label design from Storage.
 * Prioritizes: Default Template ID > Autosaved Studio Design.
 * @returns The saved design or null if no custom design is found
 */
const getDefaultTemplate = (): { design: LabelDesign } | null => {
    try {
        const defaultTemplateId = storage.get<string | null>(StorageKeys.LABEL_DEFAULT_TEMPLATE, null);
        const savedTemplates = storage.get<any[]>(StorageKeys.LABEL_TEMPLATES, []);
        
        if (defaultTemplateId && savedTemplates.length > 0) {
            const defaultTemplate = savedTemplates.find((t: any) => t.id === defaultTemplateId);
            if (defaultTemplate?.design) {
                return defaultTemplate;
            }
        }
        
        // Fallback to autosaved design
        const savedDesign = storage.get<any | null>(StorageKeys.LABEL_DESIGN, null);
        if (savedDesign) {
             // parsed is already an object because storage.get parses JSON
            if (savedDesign.elements && savedDesign.elements.length > 0) {
                return { design: savedDesign };
            }
        }
    } catch (e) {
        console.error('Error loading template', e);
    }
    return null;
};

/**
 * Reads printer calibration settings (X/Y offsets) from the saved design.
 * @returns Offset object in millimeters
 */
const getPrintOffsets = (): { x: number; y: number } => {
    try {
        const savedDesign = storage.get<any | null>(StorageKeys.LABEL_DESIGN, null);
        if (savedDesign) {
            return {
                x: savedDesign.printOffsetX || 0,
                y: savedDesign.printOffsetY || 0
            };
        }
    } catch (e) {}
    return { x: 0, y: 0 };
};

/**
 * Generates the CSS rules for a specific label design.
 * Uses absolute positioning with millimeter units to ensure physical accuracy.
 * @param design - The design to generate CSS for
 * @returns Object containing the CSS string and a map of element IDs to class names
 */
export const generateTemplateCSS = (design: LabelDesign): { css: string, classNameMap: Record<string, string> } => {
    let css = '';
    const classNameMap: Record<string, string> = {};

    design.elements.forEach(el => {
        const className = `lbl-el-${el.id}`;
        classNameMap[el.id] = className;

        const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
        const rotationCSS = el.rotation ? ` rotate(${el.rotation}deg)` : '';
        
        css += `
            .${className} {
                position: absolute;
                left: ${el.x}mm;
                top: ${el.y}mm;
                transform: translate(${alignTransform}, 0)${rotationCSS};
                transform-origin: left top;
                ${el.fontSize ? `font-size: ${el.fontSize}px;` : ''}
                ${el.fontWeight ? `font-weight: ${el.fontWeight};` : ''}
                ${el.color ? `color: ${el.color};` : ''}
                white-space: nowrap;
                ${el.width ? `width: ${el.width}mm;` : ''}
                ${el.height ? `height: ${el.height}mm;` : ''}
                ${el.type === 'image' || el.type === 'qrcode' ? 'object-fit: contain;' : ''}
            }
        `;

        if (el.type === 'barcode') {
             const format = el.barcodeFormat || 'code128';
             let fontFamily = 'Libre Barcode 39 Text';
             if (format === 'code39') fontFamily = 'Libre Barcode 39';
             else if (format === 'code39-text') fontFamily = 'Libre Barcode 39 Text';
             else if (format.startsWith('code128')) fontFamily = format === 'code128-text' ? 'Libre Barcode 128 Text' : 'Libre Barcode 128';
             
             css += `.${className} { font-family: '${fontFamily}'; line-height: 0.8; padding-top: 1px; }`;
        }
    });

    return { css, classNameMap };
};

/**
 * Generates the complete HTML string for a single label instance.
 * @param drug - Source drug data
 * @param design - Layout design to use
 * @param dims - Physical dimensions of the label
 * @param receiptSettings - Global branding settings
 * @param expiryOverride - Manual expiry date override
 * @param qrDataUrl - Pre-generated QR code image data
 * @param logoDataUrl - Pre-generated logo image data
 * @param classNameMap - Map of element IDs to CSS classes (from generateTemplateCSS)
 * @returns HTML string for the individual label
 */
export const generateLabelHTML = (
    drug: Drug,
    design: LabelDesign,
    dims: { w: number; h: number },
    receiptSettings: { storeName: string; hotline: string },
    expiryOverride?: string,
    qrDataUrl?: string,
    logoDataUrl?: string,
    classNameMap?: Record<string, string>
): string => {
    const barcodeSource = design.barcodeSource || 'global';
    const barcodeValue = barcodeSource === 'internal'
        ? (drug.internalCode || drug.id)
        : (drug.barcode || drug.id);
    const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

    const getElementContent = (el: LabelElement): string => {
        return getLabelElementContent(el, drug, receiptSettings, expiryOverride, design.currency, design.barcodeSource);
    };

    const generateElementHTML = (el: LabelElement): string => {
        if (!el.isVisible) return '';
        const content = getElementContent(el);
        
        let styleAttr = '';
        let classAttr = '';

        if (classNameMap && classNameMap[el.id]) {
            classAttr = `class="${classNameMap[el.id]}"`;
        } else {
             const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
             styleAttr = `style="position: absolute; left: ${el.x}mm; top: ${el.y}mm; transform: translate(${alignTransform}, 0); `;
             
             if (el.type === 'text') {
                 styleAttr += `font-size: ${el.fontSize}px; font-weight: ${el.fontWeight || 'normal'}; color: ${el.color || 'black'}; white-space: nowrap;"`;
             } else if (el.type === 'barcode') {
                const format = el.barcodeFormat || 'code128';
                let fontFamily = 'Libre Barcode 39 Text';
                if (format === 'code39') fontFamily = 'Libre Barcode 39';
                else if (format === 'code39-text') fontFamily = 'Libre Barcode 39 Text';
                else if (format.startsWith('code128')) fontFamily = format === 'code128-text' ? 'Libre Barcode 128 Text' : 'Libre Barcode 128';
                styleAttr += `font-family: '${fontFamily}'; font-size: ${el.fontSize}px; line-height: 0.8; padding-top: 1px; white-space: nowrap;"`;
             } else {
                styleAttr += `width: ${el.width || 10}mm; height: ${el.height || 10}mm; object-fit: contain;"`;
             }
        }

        if (el.type === 'text') {
            return `<div ${classAttr} ${styleAttr}>${escapeHtml(content)}</div>`;
        }
        if (el.type === 'barcode') {
             const format = el.barcodeFormat || 'code128';
             let encoded = barcodeText;
             if (format.startsWith('code128')) {
                  const rawVal = barcodeSource === 'internal' ? (drug.internalCode || drug.id) : (drug.barcode || drug.id);
                  encoded = encodeCode128(rawVal);
             }
            return `<div ${classAttr} ${styleAttr}>${encoded}</div>`;
        }
        if (el.type === 'qrcode' && qrDataUrl) {
            return `<img src="${qrDataUrl}" ${classAttr} ${styleAttr} />`;
        }
        if (el.type === 'image') {
            const src = el.id === 'logo' ? logoDataUrl : el.content;
            if (src) return `<img src="${src}" ${classAttr} ${styleAttr} />`;
        }
        return '';
    };

    const showBorders = design.showPrintBorders ?? false;
    const labelContainerStyle = `
        width: ${dims.w}mm; height: ${dims.h}mm;
        position: relative; overflow: hidden;
        background: white;
        border: ${showBorders ? '1px solid #000' : 'none'};
        box-sizing: border-box;
        page-break-inside: avoid;
        display: inline-block;
        font-size: 0;
        line-height: 0;
    `;

    return `<div style="${labelContainerStyle}">${design.elements.map(generateElementHTML).join('')}</div>`;
};

// --- Default Design Configuration ---

/**
 * Standard factory fallback design for 38x12mm labels.
 */
export const DEFAULT_LABEL_DESIGN: LabelDesign = {
    selectedPreset: '38x12',
    elements: [
        { id: 'store', type: 'text', label: 'Store Name', x: 19, y: 0.7, fontSize: 4, align: 'center', isVisible: true, field: 'store' },
        { id: 'name', type: 'text', label: 'Drug Name', x: 19, y: 1.8, fontSize: 7, fontWeight: 'bold', align: 'center', isVisible: true, field: 'name' },
        { id: 'barcode', type: 'barcode', label: 'Barcode', x: 19, y: 5.5, fontSize: 24, align: 'center', isVisible: true, width: 36, barcodeFormat: 'code128' },
        { id: 'barcodeNumber', type: 'text', label: 'Barcode Number', x: 19, y: 8.5, fontSize: 4, align: 'center', isVisible: false, field: 'barcode' },
        { id: 'price', type: 'text', label: 'Price', x: 1.5, y: 9.8, fontSize: 6, fontWeight: 'bold', align: 'left', isVisible: true, field: 'price' },
        { id: 'expiry', type: 'text', label: 'Expiry', x: 36.5, y: 9.8, fontSize: 6, fontWeight: 'bold', align: 'right', isVisible: true, field: 'expiryDate' },
        { id: 'hotline', type: 'text', label: 'Hotline', x: 19, y: 11, fontSize: 4, align: 'center', isVisible: false, field: 'hotline' }
    ]
};

// --- Main API ---

/**
 * Triggers the browser's print dialog for a batch of drug labels.
 * 
 * Process:
 * 1. Validates input data
 * 2. Opens a blank popup window
 * 3. Resolves the correct label design (template or manual override)
 * 4. Generates HTML/CSS with grouping logic (2 labels per page for dual-roll)
 * 5. Writes content to window and calls window.print()
 * 
 * @param items - List of drugs and quantities to print
 * @param options - UI/Rendering overrides
 * 
 * @example
 * // Print 5 labels for a single drug
 * printLabels([{ drug: myDrug, quantity: 5 }]);
 */


export const printLabels = async (items: PrintLabelItem[], options: PrintOptions = {}): Promise<void> => {
    const validItems = items.filter(item => {
        if (!validateDrug(item.drug)) {
            console.warn('Invalid drug data skipped:', item.drug);
            return false;
        }
        if (item.quantity <= 0) return false;
        return true;
    });

    if (validItems.length === 0) {
        console.warn('No valid items to print');
        return;
    }

    // Check if QZ Tray silent printing should be attempted
    const printerSettings = getPrinterSettings();
    const shouldTrySilent = printerSettings.enabled && printerSettings.silentMode !== 'off';

    let printWindow: Window | null = null;

    try {
        const template = options.forceBasicTemplate ? null : getDefaultTemplate();
        // Deep clone to prevent mutation when applying overrides
        let design = JSON.parse(JSON.stringify(
            options.design || (template?.design as LabelDesign) || DEFAULT_LABEL_DESIGN
        ));

        // Apply dynamic visibility overrides
        if (options.elementVisibility) {
            design.elements.forEach((el: LabelElement) => {
                if (options.elementVisibility![el.id] !== undefined) {
                    el.isVisible = options.elementVisibility![el.id];
                }
            });
        }

        const dims = design.selectedPreset === 'custom'
            ? (design.customDims || { w: 38, h: 12 })
            : (LABEL_PRESETS[design.selectedPreset] || LABEL_PRESETS['38x12']);

        const receiptSettings = getReceiptSettings();
        const offsets = getPrintOffsets();
        const printOffsetX = offsets.x;
        const printOffsetY = offsets.y;
        
        const { css: templateCSS, classNameMap } = generateTemplateCSS(design);

        const labelFragments: string[] = [];
        for (const item of validItems) {
            const singleLabel = generateLabelHTML(
                item.drug,
                design,
                dims,
                receiptSettings,
                item.expiryDateOverride,
                undefined,
                undefined,
                classNameMap
            );
            
            for (let i = 0; i < item.quantity; i++) {
                labelFragments.push(singleLabel);
            }
        }
        
        // Pagination logic: group labels into pages of 2
        const labelsPerPage = 2;
        const labelGap = design.labelGap || 0;
        // Total page height = (label height × 2) + gap between them
        const pageHeight = (dims.h * labelsPerPage) + labelGap;
        const gapDivider = labelGap > 0 ? `<div style="height: ${labelGap}mm;"></div>` : '';
        const pages: string[] = [];
        
        for (let i = 0; i < labelFragments.length; i += labelsPerPage) {
            const pageLabels = labelFragments.slice(i, i + labelsPerPage);
            const isLastPage = i + labelsPerPage >= labelFragments.length;
            
            // Join labels with gap divider (only between labels, not after last one)
            const labelsWithGap = pageLabels.join(gapDivider);
            const pageHTML = `<div class="page-container" style="page-break-after: ${isLastPage ? 'auto' : 'always'};">${labelsWithGap}</div>`;
            pages.push(pageHTML);
        }
        
        const allPagesHTML = pages.join('');

        const css = `
            ${templateCSS}
            @page { size: ${dims.w}mm ${pageHeight}mm; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                margin: 0; 
                padding: 0; 
                font-family: 'Roboto', sans-serif; 
            }
            .print-container {
                width: ${dims.w}mm;
                background: white;
                font-size: 0;
                line-height: 0;
                padding-left: ${printOffsetX > 0 ? printOffsetX : 0}mm;
                padding-right: ${printOffsetX < 0 ? Math.abs(printOffsetX) : 0}mm;
                padding-top: ${printOffsetY > 0 ? printOffsetY : 0}mm;
                padding-bottom: ${printOffsetY < 0 ? Math.abs(printOffsetY) : 0}mm;
                box-sizing: border-box;
            }
            .page-container {
                width: ${dims.w}mm;
                height: ${pageHeight}mm;
                position: relative;
                background: white;
                font-size: 0;
                line-height: 0;
                box-sizing: border-box;
            }
        `;

        const htmlContent = `<!DOCTYPE html>
            <html><head><title>Print Labels</title>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Libre+Barcode+128+Text&family=Libre+Barcode+39&family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>${css}</style></head><body>
            <div class="print-container">${allPagesHTML}</div>
            </body></html>`;

        // Try silent printing via QZ Tray first
        if (shouldTrySilent) {
            try {
                const silentPrinted = await printLabelSilently(htmlContent, { width: dims.w, height: dims.h });
                if (silentPrinted) {
                    console.log('Labels printed silently via QZ Tray');
                    return; // Success - no need for browser popup
                }
                // If silentPrinted is false, fallback mode is active - continue to browser print
            } catch (silentErr) {
                console.warn('QZ Tray silent print failed, falling back to browser print:', silentErr);
                // Only throw if not in fallback mode
                if (printerSettings.silentMode !== 'fallback') {
                    throw silentErr;
                }
            }
        }

        // Browser print fallback
        printWindow = window.open('', '', PRINT_WINDOW_CONFIG.features);
        if (!printWindow) {
            throw new Error('Popup blocked');
        }

        // Add the print script for browser print
        const browserHtmlContent = htmlContent.replace('</body></html>', `
            <script>
                document.fonts.ready.then(() => {
                    window.print();
                }).catch(e => {
                    console.error('Font loading failed', e);
                    window.print();
                });
            </script>
            </body></html>`);

        printWindow.document.write(browserHtmlContent);
        printWindow.document.close();
    } catch (e) {
        console.error('Print failed', e);
        if (printWindow) printWindow.close();
        alert('Failed to initialize print window. Please allow popups.');
    }
};

/**
 * Convenience wrapper to print labels for a single drug.
 * @param drug - The drug to print
 * @param quantity - Number of labels (defaults to 1)
 * @param expiryDateOverride - Optional custom expiry date
 */
export const printSingleLabel = (drug: Drug, quantity: number = 1, expiryDateOverride?: string): void => {
    printLabels([{ drug, quantity, expiryDateOverride }]);
};
