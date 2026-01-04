/**
 * LabelPrinter - Reusable Label Printing Utility
 * 
 * Provides batch printing functionality using templates from BarcodeStudio.
 * Can print single drugs with quantities or multiple drugs with different expiry dates.
 */

import { Drug } from '../../types';
import { encodeCode128 } from '../../utils/barcodeEncoders';

// --- Types ---

export interface LabelElement {
    id: string;
    type: 'text' | 'barcode' | 'qrcode' | 'image';
    label: string;
    x: number; // mm
    y: number; // mm
    width?: number; // mm
    height?: number; // mm
    fontSize?: number; // px
    fontWeight?: string;
    align?: 'left' | 'center' | 'right';
    content?: string;
    isVisible: boolean;
    color?: string;
    field?: keyof Drug | 'unit' | 'store' | 'hotline';
    locked?: boolean;
    barcodeFormat?: 'code39' | 'code39-text' | 'code128' | 'code128-text';
    // Hitbox calibration (manual adjustment for selection accuracy)
    hitboxOffsetX?: number; // mm offset for selection box
    hitboxOffsetY?: number; // mm offset for selection box
    hitboxWidth?: number;   // mm width override for selection box
    hitboxHeight?: number;  // mm height override for selection box
}

export interface LabelDesign {
    elements: LabelElement[];
    selectedPreset: string;
    customDims?: { w: number; h: number };
    barcodeSource?: 'global' | 'internal';
    showPrintBorders?: boolean;
    printOffsetX?: number;
    printOffsetY?: number;
}

export interface PrintLabelItem {
    drug: Drug;
    quantity: number;
    expiryDateOverride?: string; // Optional override for expiry date
}

export interface PrintOptions {
    forceBasicTemplate?: boolean;
    showBorders?: boolean;
    pairedLabels?: boolean; // Print 2 labels per page (for dual-roll printers)
    design?: LabelDesign;   // Explicit design to use (overrides default/autosave lookup)
}

// --- Constants ---

export const LABEL_PRESETS: Record<string, { w: number; h: number; label: string }> = {
    '38x12': { w: 38, h: 12, label: '38×12 mm (Single)' },
    '38x25': { w: 38, h: 25, label: '38×25 mm (Double)' }
};

/**
 * Get dimensions for a preset with fallback support
 */
export const getPresetDimensions = (
    presetKey: string, 
    customDims?: { w: number; h: number }
): { w: number; h: number } => {
    if (presetKey === 'custom' && customDims) return customDims;
    return LABEL_PRESETS[presetKey] || LABEL_PRESETS['38x12'];
};

const PRINT_WINDOW_CONFIG = {
    width: 800,
    height: 1000,
    features: 'width=800,height=1000,scrollbars=yes,resizable=yes'
} as const;

// --- Helper Functions ---

/**
 * Escape HTML characters to prevent XSS
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
 * Validate drug data before printing
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
 * Get content for a label element (reusable logic)
 */
export const getLabelElementContent = (
    el: LabelElement,
    drug: Drug,
    receiptSettings: { storeName: string; hotline: string },
    expiryOverride?: string
): string => {
    if (el.content && el.type === 'text' && !el.field) return el.content;
    
    const expiryDate = expiryOverride || drug.expiryDate;
    
    switch (el.field) {
        case 'name':
            if (drug.dosageForm) {
                return `${drug.name} ${drug.dosageForm}`;
            }
            return drug.name;
        case 'price': return `${drug.price.toFixed(2)}`;
        case 'store': return receiptSettings.storeName;
        case 'hotline': return receiptSettings.hotline ? `${receiptSettings.hotline}` : '';
        case 'internalCode': return drug.internalCode || '';
        case 'barcode': return drug.internalCode || drug.barcode || '';
        case 'expiryDate':
            if (expiryDate) {
                const d = new Date(expiryDate);
                return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            }
            return '';
        case 'genericName': return drug.genericName || '';
        default: return el.content || el.label || '';
    }
};

/**
 * Get receipt settings (store name, hotline) from localStorage
 */
/**
 * Get receipt settings (store name, hotline) from localStorage with robust error handling
 */
export const getReceiptSettings = (): { storeName: string; hotline: string } => {
    const defaultSettings = { storeName: 'PharmaFlow', hotline: '19099' };
    
    try {
        const templatesJson = localStorage.getItem('receipt_templates');
        if (!templatesJson) return defaultSettings;
        
        const templates = JSON.parse(templatesJson);
        if (!Array.isArray(templates) || templates.length === 0) {
            return defaultSettings;
        }
        
        const activeId = localStorage.getItem('receipt_active_template_id');
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
 * Get default template from localStorage
 */
const getDefaultTemplate = (): { design: LabelDesign } | null => {
    try {
        const defaultTemplateId = localStorage.getItem('pharma_label_default_template');
        const savedTemplates = localStorage.getItem('pharma_label_templates');
        
        if (defaultTemplateId && savedTemplates) {
            const templates = JSON.parse(savedTemplates);
            const defaultTemplate = templates.find((t: any) => t.id === defaultTemplateId);
            if (defaultTemplate?.design) {
                return defaultTemplate;
            }
        }
        
        // Fallback to autosaved design
        const savedDesign = localStorage.getItem('pharma_label_design');
        if (savedDesign) {
            const parsed = JSON.parse(savedDesign);
            if (parsed.elements && parsed.elements.length > 0) {
                return { design: parsed };
            }
        }
    } catch (e) {
        console.error('Error loading template', e);
    }
    return null;
};

/**
 * Get print calibration offsets from localStorage
 */
const getPrintOffsets = (): { x: number; y: number } => {
    try {
        const savedDesign = localStorage.getItem('pharma_label_design');
        if (savedDesign) {
            const parsed = JSON.parse(savedDesign);
            return {
                x: parsed.printOffsetX || 0,
                y: parsed.printOffsetY || 0
            };
        }
    } catch (e) {}
    return { x: 0, y: 0 };
};

/**
 * Generate CSS for a design to optimize print size
 */
export const generateTemplateCSS = (design: LabelDesign): { css: string, classNameMap: Record<string, string> } => {
    let css = '';
    const classNameMap: Record<string, string> = {};

    design.elements.forEach(el => {
        const className = `lbl-el-${el.id}`;
        classNameMap[el.id] = className;

        const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
        
        css += `
            .${className} {
                position: absolute;
                left: ${el.x}mm;
                top: ${el.y}mm;
                transform: translate(${alignTransform}, 0);
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
 * Generate HTML for a single label using the template
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
        return getLabelElementContent(el, drug, receiptSettings, expiryOverride);
    };

    const generateElementHTML = (el: LabelElement): string => {
        if (!el.isVisible) return '';
        const content = getElementContent(el);
        
        // Use class if available, otherwise inline style (fallback/preview)
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
            // Recalculate encoded value here or reuse if passed? 
            // The class handles font, but content is dynamic.
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

// --- Constants ---
// --- Constants ---
export const DEFAULT_LABEL_DESIGN: LabelDesign = {
    selectedPreset: '38x12',
    elements: [
        { id: 'store', type: 'text', label: 'Store Name', x: 19, y: 0.7, fontSize: 4, align: 'center', isVisible: true, field: 'store' },
        { id: 'name', type: 'text', label: 'Drug Name', x: 19, y: 1.8, fontSize: 7, fontWeight: 'bold', align: 'center', isVisible: true, field: 'name' },
        { id: 'barcode', type: 'barcode', label: 'Barcode', x: 19, y: 5.5, fontSize: 24, align: 'center', isVisible: true, width: 36, barcodeFormat: 'code128' },
        { id: 'barcodeNumber', type: 'text', label: 'Barcode Number', x: 19, y: 8.5, fontSize: 4, align: 'center', isVisible: false, field: 'barcode' },
        { id: 'price', type: 'text', label: 'Price', x: 1.5, y: 9.8, fontSize: 6, fontWeight: 'bold', align: 'left', isVisible: true, field: 'price' },
        { id: 'expiry', type: 'text', label: 'Expiry', x: 36.5, y: 9.8, fontSize: 6, fontWeight: 'bold', align: 'right', isVisible: true, field: 'expiryDate' }
    ]
};

// --- Main API ---

/**
 * Print labels for one or more drugs
 * 
 * @param items - Array of drugs with quantities to print
 * @param options - Print options
 * 
 * @example
 * // Print 5 labels for a single drug
 * printLabels([{ drug: myDrug, quantity: 5 }]);
 * 
 * @example
 * // Print multiple drugs with different quantities
 * printLabels([
 *   { drug: drug1, quantity: 3 },
 *   { drug: drug2, quantity: 2, expiryDateOverride: '2025-06-01' }
 * ]);
 */
export const printLabels = (items: PrintLabelItem[], options: PrintOptions = {}): void => {
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

    let printWindow: Window | null = null;

    try {
        printWindow = window.open('', '', PRINT_WINDOW_CONFIG.features);
        if (!printWindow) {
            throw new Error('Popup blocked');
        }

        // Check for template
        const template = options.forceBasicTemplate ? null : getDefaultTemplate();

        // Use template (explicit > default > fallback to DEFAULT_LABEL_DESIGN)
        const design = options.design || (template?.design as LabelDesign) || DEFAULT_LABEL_DESIGN;
        const dims = design.selectedPreset === 'custom'
            ? (design.customDims || { w: 38, h: 12 })
            : (LABEL_PRESETS[design.selectedPreset] || LABEL_PRESETS['38x12']);

        const receiptSettings = getReceiptSettings();
        const offsets = getPrintOffsets();
        const printOffsetX = offsets.x;
        const printOffsetY = offsets.y;
        const pairedLabels = options.pairedLabels ?? false;

        const labelsPerPage = pairedLabels ? 2 : 1;
        
        const { css: templateCSS, classNameMap } = generateTemplateCSS(design);

        // Generate all label HTML using array join for performance
        const labelFragments: string[] = [];
        for (const item of validItems) {
            // Generate one label instance
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
            
            // Push n copies
            for (let i = 0; i < item.quantity; i++) {
                labelFragments.push(singleLabel);
            }
        }
        const allLabelsHTML = labelFragments.join('');

            /* Calculate total height for the print strip (matches BarcodeStudio behavior) */
            const totalQuantity = validItems.reduce((acc, item) => acc + item.quantity, 0);
            const totalHeight = dims.h * totalQuantity;

            const css = `
                ${templateCSS}
                @page { size: ${dims.w}mm ${totalHeight}mm; margin: 0; }
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    font-family: 'Roboto', sans-serif; 
                }
                .print-container {
                    width: ${dims.w}mm; 
                    height: ${totalHeight}mm;
                    position: relative;
                    background: white;
                    font-size: 0;
                    line-height: 0;
                    padding-left: ${printOffsetX > 0 ? printOffsetX : 0}mm;
                    padding-right: ${printOffsetX < 0 ? Math.abs(printOffsetX) : 0}mm;
                    padding-top: ${printOffsetY > 0 ? printOffsetY : 0}mm;
                    padding-bottom: ${printOffsetY < 0 ? Math.abs(printOffsetY) : 0}mm;
                    box-sizing: border-box;
                }
            `;

        const htmlContent = `<!DOCTYPE html>
    <html><head><title>Print Labels</title>
    <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Libre+Barcode+128+Text&family=Libre+Barcode+39&family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
    <style>${css}</style></head><body>
    <div class="print-container">${allLabelsHTML}</div>
    <script>
        document.fonts.ready.then(() => {
            window.print();
            // Optional: window.close() after print if needed, but risky if print dialog is open
        }).catch(e => {
            console.error('Font loading failed', e);
            window.print();
        });
    </script>
    </body></html>`;

        printWindow.document.write(htmlContent);
        printWindow.document.close();
    } catch (e) {
        console.error('Print failed', e);
        if (printWindow) printWindow.close();
        alert('Failed to initialize print window. Please allow popups.');
    }
};

/**
 * Print a single drug label (convenience function)
 */
export const printSingleLabel = (drug: Drug, quantity: number = 1, expiryDateOverride?: string): void => {
    printLabels([{ drug, quantity, expiryDateOverride }]);
};
