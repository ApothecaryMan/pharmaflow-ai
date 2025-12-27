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
}

// --- Constants ---

const LABEL_PRESETS: Record<string, { w: number; h: number }> = {
    '38x12': { w: 38, h: 12 }
};

// --- Helper Functions ---

/**
 * Get receipt settings (store name, hotline) from localStorage
 */
const getReceiptSettings = (): { storeName: string; hotline: string } => {
    try {
        const templatesJson = localStorage.getItem('receipt_templates');
        const activeId = localStorage.getItem('receipt_active_template_id');
        if (templatesJson) {
            const templates = JSON.parse(templatesJson);
            const activeTemplate = templates.find((t: any) => t.id === activeId) ||
                templates.find((t: any) => t.isDefault) ||
                templates[0];
            if (activeTemplate?.options) {
                return {
                    storeName: activeTemplate.options.storeName || 'PharmaFlow',
                    hotline: activeTemplate.options.headerHotline || '19099'
                };
            }
        }
    } catch (e) { console.error('Failed to read receipt settings', e); }
    return { storeName: 'PharmaFlow', hotline: '19099' };
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
 * Generate HTML for a single label using the template
 */
const generateLabelHTML = (
    drug: Drug,
    design: LabelDesign,
    dims: { w: number; h: number },
    receiptSettings: { storeName: string; hotline: string },
    expiryOverride?: string
): string => {
    const barcodeSource = design.barcodeSource || 'global';
    const barcodeValue = barcodeSource === 'internal'
        ? (drug.internalCode || drug.id)
        : (drug.barcode || drug.id);
    const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

    const getElementContent = (el: LabelElement): string => {
        if (el.content && el.type === 'text' && !el.field) return el.content;
        
        const expiryDate = expiryOverride || drug.expiryDate;
        
        switch (el.field) {
            case 'name': return drug.name;
            case 'price': return `${drug.price.toFixed(2)}`;
            case 'store': return receiptSettings.storeName;
            case 'hotline': return receiptSettings.hotline ? `${receiptSettings.hotline}` : '';
            case 'internalCode': return drug.internalCode || '';
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

    const generateElementHTML = (el: LabelElement): string => {
        if (!el.isVisible) return '';
        const content = getElementContent(el);
        const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
        const commonStyle = `position: absolute; left: ${el.x}mm; top: ${el.y}mm; transform: translate(${alignTransform}, 0);`;

        if (el.type === 'text') {
            return `<div style="${commonStyle} font-size: ${el.fontSize}px; font-weight: ${el.fontWeight || 'normal'}; color: ${el.color || 'black'}; white-space: nowrap;">${content}</div>`;
        }
        if (el.type === 'barcode') {
            const format = el.barcodeFormat || 'code128';
            let encoded = barcodeText;
            let fontFamily = 'Libre Barcode 39 Text';

            if (format === 'code39') { encoded = barcodeText; fontFamily = 'Libre Barcode 39'; }
            else if (format === 'code39-text') { encoded = barcodeText; fontFamily = 'Libre Barcode 39 Text'; }
            else if (format.startsWith('code128')) {
                const rawVal = barcodeSource === 'internal' ? (drug.internalCode || drug.id) : (drug.barcode || drug.id);
                encoded = encodeCode128(rawVal);
                fontFamily = format === 'code128-text' ? 'Libre Barcode 128 Text' : 'Libre Barcode 128';
            }

            return `<div style="${commonStyle} font-family: '${fontFamily}'; font-size: ${el.fontSize}px; line-height: 0.8; padding-top: 1px; white-space: nowrap;">${encoded}</div>`;
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

/**
 * Generate basic fallback label HTML when no template is available
 */
const generateBasicLabelHTML = (drug: Drug, quantity: number): string => {
    const barcodeValue = drug.barcode || drug.internalCode || drug.id;
    const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

    const labelHTML = `
        <div class="label">
            <div class="store-name">PharmaFlow Property</div>
            <div class="name">${drug.name}</div>
            <div class="meta">${drug.genericName} | Exp: ${drug.expiryDate}</div>
            <div class="barcode">${barcodeText}</div>
            <div class="price-tag">$${drug.price.toFixed(2)}</div>
        </div>
    `;

    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Barcode: ${drug.name}</title>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                body { 
                    font-family: 'Roboto', sans-serif; 
                    text-align: center; 
                    padding: 20px; 
                    display: flex; 
                    flex-direction: column; 
                    align-items: center; 
                    justify-content: center;
                    gap: 10px;
                }
                .label { 
                    border: 2px solid #000; 
                    padding: 15px; 
                    display: inline-block; 
                    border-radius: 8px; 
                    width: 300px;
                    page-break-inside: avoid;
                }
                .store-name { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px; color: #555; }
                .name { font-weight: 700; font-size: 16px; margin-bottom: 2px; line-height: 1.2; }
                .meta { font-size: 11px; color: #444; margin-bottom: 10px; }
                .barcode { 
                    font-family: 'Libre Barcode 39 Text', cursive; 
                    font-size: 52px; 
                    line-height: 1; 
                    margin: 5px 0 10px 0; 
                    white-space: nowrap; 
                    overflow: hidden;
                }
                .price-tag { 
                    font-size: 24px; 
                    font-weight: 800; 
                    margin-top: 5px; 
                    border-top: 1px dashed #999;
                    padding-top: 5px;
                }
            </style>
        </head>
        <body>
            ${Array(quantity).fill(labelHTML).join('')}
            <script>window.onload = function() { window.print(); }</script>
        </body>
        </html>
    `;
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
    if (items.length === 0) return;

    const printWindow = window.open('', '', 'width=800,height=1000');
    if (!printWindow) {
        alert('Popup blocked. Please allow popups for this site.');
        return;
    }

    // Check for template
    const template = options.forceBasicTemplate ? null : getDefaultTemplate();

    if (!template) {
        // Fallback to basic template for first drug only
        const firstItem = items[0];
        printWindow.document.write(generateBasicLabelHTML(firstItem.drug, firstItem.quantity));
        printWindow.document.close();
        return;
    }

    // Use template
    const design = template.design as LabelDesign;
    const dims = design.selectedPreset === 'custom'
        ? (design.customDims || { w: 38, h: 12 })
        : (LABEL_PRESETS[design.selectedPreset] || LABEL_PRESETS['38x12']);

    const receiptSettings = getReceiptSettings();
    const offsets = getPrintOffsets();
    const printOffsetX = offsets.x;
    const printOffsetY = offsets.y;
    const pairedLabels = options.pairedLabels ?? false;

    // Calculate total labels
    const totalLabels = items.reduce((sum, item) => sum + item.quantity, 0);
    const labelsPerPage = pairedLabels ? 2 : 1;
    
    // Generate all label HTML
    let allLabelsHTML = '';
    for (const item of items) {
        for (let i = 0; i < item.quantity; i++) {
            allLabelsHTML += generateLabelHTML(
                item.drug,
                design,
                dims,
                receiptSettings,
                item.expiryDateOverride
            );
        }
    }

    // Calculate page height
    const heightPerPage = dims.h * labelsPerPage;

    const css = `
        @page { size: ${dims.w}mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            margin: 0; 
            padding: 0; 
            font-family: 'Roboto', sans-serif; 
        }
        .print-container {
            width: ${dims.w}mm; 
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
<script>document.fonts.ready.then(() => window.print());</script>
</body></html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};

/**
 * Print a single drug label (convenience function)
 */
export const printSingleLabel = (drug: Drug, quantity: number = 1, expiryDateOverride?: string): void => {
    printLabels([{ drug, quantity, expiryDateOverride }]);
};
