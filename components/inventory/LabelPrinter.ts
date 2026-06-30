/**
 * LabelPrinter - Reusable Label Printing Utility
 *
 * Provides batch printing functionality using templates from BarcodeStudio.
 * Can print single drugs with quantities or multiple drugs with different expiry dates.
 */

import { StorageKeys } from '../../config/storageKeys';
import type { Drug } from '../../types';
import { encodeCode128 } from '../../utils/barcodeEncoders';
import { getDisplayName } from '../../utils/drugDisplayName';
import { formatExpiryDate } from '../../utils/expiryUtils';
import { escapeHtml, deriveOrientation, wrapPrintHTML, printDocument } from '../../utils/printing';
import { getBarcodeFontsCSS } from './barcodeFonts';
import type { LabelDesign, LabelElement, SavedTemplate } from './studio/types';

export type { LabelElement, LabelDesign, SavedTemplate };

// --- Types ---

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
  /** Optional active branch ID for scoping receipt settings */
  activeBranchId?: string;
  /** Optional active branch name for fallback store name */
  activeBranchName?: string;
  /** Optional active branch phone number for fallback hotline */
  activeBranchPhone?: string;
  /** DB-backed print settings for the active branch */
  printSettings?: Record<string, any>;
}

// --- Constants ---

/**
 * Industry-standard physical dimensions for common thermal label sizes.
 * Values are in millimeters (mm).
 */
export const LABEL_PRESETS: Record<string, { w: number; h: number; label: string }> = {
  '38x25': { w: 38, h: 25, label: '38×25 mm (Double)' },
};

/**
 * Retrieves physical dimensions for a preset, with automatic fallback.
 * @param presetKey - The key to look up (e.g., '38x25')
 * @param customDims - Custom dimensions to return if key is 'custom'
 * @returns Object with width (w) and height (h) in mm
 */
export const getPresetDimensions = (
  presetKey: string,
  customDims?: { w: number; h: number }
): { w: number; h: number } => {
  if (presetKey === 'custom' && customDims) return customDims;
  return LABEL_PRESETS[presetKey] || LABEL_PRESETS['38x25'];
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
    typeof drug.publicPrice === 'number'
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
  currency: 'L.E' | 'USD' = 'L.E',
  barcodeSource: 'global' | 'internal' = 'global'
): string => {
  if (el.content) return el.content;
  if (!el.field) return el.label;

  switch (el.field as string) {
    case 'store':
      return receiptSettings.storeName;
    case 'hotline':
      return receiptSettings.hotline || '19099';
    case 'name':
      return getDisplayName(drug);
    case 'publicPrice':
      return `${Number(drug.publicPrice).toFixed(2)} ${currency === 'L.E' ? 'L.E' : '$'}`;
    case 'barcode':
      return barcodeSource === 'internal' ? drug.internalCode || drug.id : drug.barcode || drug.id;
    case 'type':
      return (drug as any).type || '';
    case 'unit':
      return (drug as any).unit || '';
    case 'expiryDate':
      if (expiryOverride) return expiryOverride;
      return drug.expiryDate ? formatExpiryDate(drug.expiryDate) : 'MM/YY';
    case 'genericName':
      return Array.isArray(drug.genericName)
        ? drug.genericName.join(' + ')
        : drug.genericName || '';
    default:
      return el.content || el.label || '';
  }
};

/**
 * Retrieves global store branding from Storage (receipt module shared settings).
 * Used to populate 'store' and 'hotline' fields on labels.
 * @returns Object with storeName and hotline
 */
export const getReceiptSettings = (
  activeBranchId?: string,
  activeBranchName?: string,
  activeBranchPhone?: string,
  printSettings?: Record<string, any>
): { storeName: string; hotline: string } => {
  const defaultSettings = {
    storeName: activeBranchName || 'ZINC',
    hotline: activeBranchPhone || '19099',
  };

  if (!printSettings) return defaultSettings;

  try {
    const templates = printSettings[StorageKeys.RECEIPT_TEMPLATES] || [];

    if (templates.length === 0) {
      return defaultSettings;
    }

    const activeId = printSettings[StorageKeys.RECEIPT_ACTIVE_TEMPLATE_ID] || null;
    const activeTemplate =
      templates.find((t: any) => t?.id === activeId) ||
      templates.find((t: any) => t?.isDefault) ||
      templates[0];

    if (activeTemplate?.options) {
      return {
        storeName: activeTemplate.options.storeName || defaultSettings.storeName,
        hotline: activeTemplate.options.headerHotline || defaultSettings.hotline,
      };
    }
  } catch (e) {
    console.error('Failed to read receipt settings:', e);
  }

  return defaultSettings;
};

/**
 * Resolves the preferred label design from printSettings.
 * Prioritizes: Default Template ID > Autosaved Studio Design.
 * @returns The saved design or null if no custom design is found
 */
const getDefaultTemplate = (
  printSettings?: Record<string, any>
): { design: LabelDesign } | null => {
  if (!printSettings) return null;
  try {
    const defaultTemplateId = printSettings[StorageKeys.LABEL_DEFAULT_TEMPLATE] || null;
    const savedTemplates = printSettings[StorageKeys.LABEL_TEMPLATES] || [];

    if (defaultTemplateId && savedTemplates.length > 0) {
      const defaultTemplate = savedTemplates.find((t: any) => t.id === defaultTemplateId);
      if (defaultTemplate?.design) {
        return defaultTemplate;
      }
    }

    // Fallback to autosaved design
    const savedDesign = printSettings[StorageKeys.LABEL_DESIGN] || null;
    if (savedDesign) {
      // parsed is already an object because it's JSONB
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
const getPrintOffsets = (printSettings?: Record<string, any>): { x: number; y: number } => {
  if (!printSettings) return { x: 0, y: 0 };
  try {
    const savedDesign = printSettings[StorageKeys.LABEL_DESIGN] || null;
    if (savedDesign) {
      return {
        x: savedDesign.printOffsetX || 0,
        y: savedDesign.printOffsetY || 0,
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
export const generateTemplateCSS = (
  design: LabelDesign
): { css: string; classNameMap: Record<string, string> } => {
  let css = '';
  const classNameMap: Record<string, string> = {};

  design.elements.forEach((el) => {
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
                text-align: ${el.align || 'left'};
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
      else if (format.startsWith('code128'))
        fontFamily = format === 'code128-text' ? 'Libre Barcode 128 Text' : 'Libre Barcode 128';

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
  const barcodeValue =
    barcodeSource === 'internal' ? drug.internalCode || drug.id : drug.barcode || drug.id;
  const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

  const getElementContent = (el: LabelElement): string => {
    return getLabelElementContent(
      el,
      drug,
      receiptSettings,
      expiryOverride,
      design.currency || 'L.E',
      design.barcodeSource
    );
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
        else if (format.startsWith('code128'))
          fontFamily = format === 'code128-text' ? 'Libre Barcode 128 Text' : 'Libre Barcode 128';
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
        const rawVal =
          barcodeSource === 'internal' ? drug.internalCode || drug.id : drug.barcode || drug.id;
        encoded = encodeCode128(rawVal);
      }
      return `<div ${classAttr} ${styleAttr}>${encoded}</div>`;
    }
    if (el.type === 'qrcode' && qrDataUrl) {
      return `<img src="${qrDataUrl}" ${classAttr} ${styleAttr} />`;
    }
    if (el.type === 'image') {
      const src = el.id === 'logo' && logoDataUrl ? logoDataUrl : el.content;
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
 * Standard factory fallback design for 38x25mm labels.
 */
export const DEFAULT_LABEL_DESIGN: LabelDesign = {
  selectedPreset: '38x25',
  elements: [
    {
      id: 'store',
      type: 'text',
      label: 'Store Name',
      x: 19,
      y: 1.1,
      fontSize: 6,
      fontWeight: 'bold',
      align: 'center',
      isVisible: true,
      field: 'store',
      hitboxOffsetX: 0.0,
      hitboxOffsetY: -1.0,
      hitboxWidth: 10,
      hitboxHeight: 2,
    },
    {
      id: 'name',
      type: 'text',
      label: 'Drug Name',
      x: 19,
      y: 3.1,
      fontSize: 7,
      fontWeight: 'bold',
      align: 'center',
      isVisible: true,
      field: 'name',
      hitboxOffsetX: 0.0,
      hitboxOffsetY: -0.9,
      hitboxWidth: 14,
      hitboxHeight: 2,
    },
    {
      id: 'barcode',
      type: 'barcode',
      label: 'Barcode',
      x: 19,
      y: 4.9,
      fontSize: 32,
      align: 'center',
      isVisible: true,
      width: 36,
      barcodeFormat: 'code128',
      hitboxOffsetX: 0.0,
      hitboxOffsetY: -0.5,
      hitboxWidth: 36,
      hitboxHeight: 5,
    },
    {
      id: 'barcodeNumber',
      type: 'text',
      label: 'Barcode Number',
      x: 19,
      y: 8.5,
      fontSize: 4,
      align: 'center',
      isVisible: false,
      field: 'barcode',
    },
    {
      id: 'price',
      type: 'text',
      label: 'Price',
      x: 1.5,
      y: 10.4,
      fontSize: 8,
      fontWeight: 'bold',
      align: 'left',
      isVisible: true,
      field: 'publicPrice',
      hitboxOffsetX: 0.0,
      hitboxOffsetY: -1.3,
      hitboxWidth: 10,
      hitboxHeight: 3,
    },
    {
      id: 'expiry',
      type: 'text',
      label: 'Expiry',
      x: 36.6,
      y: 10.4,
      fontSize: 8,
      fontWeight: 'bold',
      align: 'right',
      isVisible: true,
      field: 'expiryDate',
      hitboxOffsetX: 0.0,
      hitboxOffsetY: -1.3,
      hitboxWidth: 10,
      hitboxHeight: 3,
    },
    {
      id: 'hotline',
      type: 'text',
      label: 'Hotline',
      x: 19,
      y: 10.4,
      fontSize: 9,
      fontWeight: 'bold',
      align: 'center',
      isVisible: false,
      field: 'hotline',
    },
  ],
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

/**
 * Builds label-specific CSS + container HTML (body content only, no shell).
 * The caller wraps this with `wrapPrintHTML` to get a complete document.
 */const buildLabelPageContent = (
  contentHTML: string,
  templateCSS: string,
  dims: { w: number; h: number },
  pageHeight: number,
  offsets: { x: number; y: number } = { x: 0, y: 0 }
): { css: string; bodyHTML: string } => {
  const css = `
    ${templateCSS}
    .print-container {
      width: ${dims.w}mm;
      height: ${pageHeight}mm;
      background: white;
      font-size: 0;
      line-height: 0;
      transform: translate(${offsets.x}mm, ${offsets.y}mm);
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
      overflow: hidden;
    }
  `;

  // If contentHTML already has page-container (from printLabels batch), use it directly.
  // Otherwise (from preview), wrap it in page-container and print-container.
  const bodyHTML = contentHTML.includes('class="page-container"')
    ? contentHTML
    : `<div class="page-container"><div class="print-container">${contentHTML}</div></div>`;

  return { css, bodyHTML };
};

/**
 * Builds a complete print-ready HTML document for a batch of label pages,
 * using the shared \`wrapPrintHTML\` shell for consistent @page / reset / font
 * loading / auto-print behaviour.
 */
const buildLabelDocument = (
  contentHTML: string,
  templateCSS: string,
  dims: { w: number; h: number },
  pageHeight: number,
  offsets: { x: number; y: number },
  autoPrint: boolean,
  hardwarePageHeight?: number
): string => {
  const { css, bodyHTML } = buildLabelPageContent(contentHTML, templateCSS, dims, pageHeight, offsets);
  
  const physicalHeight = hardwarePageHeight || pageHeight;
  const pageW = dims.w;
  const pageH = physicalHeight;
  const orientation = deriveOrientation(pageW, pageH);

  return wrapPrintHTML({
    bodyHTML,
    css,
    width: pageW,
    height: pageH,
    orientation,
    fontsCSS: getBarcodeFontsCSS(),
    autoPrint,
    title: 'Print Labels',
  });
};

/**
 * Public-facing wrapper for generating a complete label page HTML document.
 * Used by BarcodePreview, BarcodePrinter, BarcodeStudio and TemplateGalleryModal
 * for live preview rendering (no auto-print).
 */
export const generatePageHTML = (
  contentHTML: string,
  templateCSS: string,
  dims: { w: number; h: number },
  pageHeight: number,
  offsets?: { x: number; y: number },
  hardwarePageHeight?: number
): string => {
  return buildLabelDocument(
    contentHTML,
    templateCSS,
    dims,
    pageHeight,
    offsets ?? { x: 0, y: 0 },
    false,
    hardwarePageHeight
  );
};;

export const printLabels = async (
  items: PrintLabelItem[],
  options: PrintOptions = {}
): Promise<void> => {
  const validItems = items.filter((item) => {
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

  // 1. Ensure fonts are fully loaded in the main window context before starting.
  try {
    await document.fonts.ready;
  } catch (fontErr) {
    console.warn('Font loading check failed, proceeding anyway:', fontErr);
  }

  // printDocument below handles silent→fallback policy

  try {
    const template = options.forceBasicTemplate ? null : getDefaultTemplate(options.printSettings);
    // Deep clone to prevent mutation when applying overrides
    const design = JSON.parse(
      JSON.stringify(options.design || (template?.design as LabelDesign) || DEFAULT_LABEL_DESIGN)
    );

    if (
      !design.selectedPreset ||
      (design.selectedPreset !== 'custom' && !LABEL_PRESETS[design.selectedPreset])
    ) {
      design.selectedPreset = DEFAULT_LABEL_DESIGN.selectedPreset;
    }

    // Apply dynamic visibility overrides
    if (options.elementVisibility) {
      design.elements.forEach((el: LabelElement) => {
        if (options.elementVisibility![el.id] !== undefined) {
          el.isVisible = options.elementVisibility![el.id];
        }
      });
    }

    const dims =
      design.selectedPreset === 'custom'
        ? design.customDims || { w: 38, h: 25 }
        : LABEL_PRESETS[design.selectedPreset] || { w: 38, h: 25 };

    const receiptSettings = getReceiptSettings(
      options.activeBranchId,
      options.activeBranchName,
      options.activeBranchPhone,
      options.printSettings
    );
    const offsets = getPrintOffsets(options.printSettings);
    const printOffsetX = offsets.x;
    const printOffsetY = offsets.y;

    // Hardware orientation will be calculated after pageHeight
    // Dimensions and Pitch logic
    const isDouble = design.selectedPreset === '38x25';
    const labelsPerPage = isDouble ? 2 : 1;

    const labelHeight = isDouble ? 12 : dims.h;
    const innerGap = isDouble ? 1 : 0;
    const outerGap = isDouble ? 3 : design.labelGap || 0;

    const pageHeight = isDouble
      ? labelHeight * 2 + innerGap + outerGap
      : labelHeight + outerGap;

    const printablePageHeight = isDouble
      ? labelHeight * 2 + innerGap
      : labelHeight;

    const renderDims = { w: dims.w, h: labelHeight };

    const hwPageW = dims.w;
    const hwPageH = pageHeight;
    const effectiveOrientation = deriveOrientation(hwPageW, hwPageH);

    const { css: templateCSS, classNameMap } = generateTemplateCSS(design);

    const labelFragments: string[] = [];

    // Process HTML generation asynchronously to avoid freezing UI for large volumes
    let currentItemIdx = 0;
    let currentQtyIdx = 0;

    await new Promise<void>((resolve) => {
      const processChunk = () => {
        const chunkStartTime = performance.now();

        while (currentItemIdx < validItems.length) {
          const item = validItems[currentItemIdx];
          const singleLabel = generateLabelHTML(
            item.drug,
            design,
            renderDims,
            receiptSettings,
            item.expiryDateOverride,
            undefined,
            undefined,
            classNameMap
          );

          while (currentQtyIdx < item.quantity) {
            labelFragments.push(singleLabel);
            currentQtyIdx++;

            if (performance.now() - chunkStartTime > 30) {
              requestAnimationFrame(processChunk);
              return;
            }
          }
          currentQtyIdx = 0;
          currentItemIdx++;
        }
        resolve();
      };
      processChunk();
    });

    const innerGapDivider = innerGap > 0 ? `<div style="height: ${innerGap}mm;"></div>` : '';
    const pages: string[] = [];

    for (let i = 0; i < labelFragments.length; i += labelsPerPage) {
      const pageLabels = labelFragments.slice(i, i + labelsPerPage);
      const isLastPage = i + labelsPerPage >= labelFragments.length;
      const isPartialPage = pageLabels.length < labelsPerPage;

      const labelsContent = pageLabels.join(innerGapDivider);
      const actualContentHeight = isPartialPage
        ? pageLabels.length * labelHeight + Math.max(0, pageLabels.length - 1) * innerGap
        : printablePageHeight;

      const pageHTML = `<div class="page-container" style="height: ${actualContentHeight}mm; width: ${dims.w}mm; page-break-after: ${isLastPage ? 'auto' : 'always'};">
                <div class="print-container">
                    ${labelsContent}
                </div>
            </div>`;
      pages.push(pageHTML);
    }

    const allPagesHTML = pages.join('');

    // Single unified print: printDocument handles silent→fallback policy.
    // Labels are wrapped via wrapPrintHTML (ships its own auto-print script),
    // so autoPrintFallback stays false.
    const htmlContent = buildLabelDocument(
      allPagesHTML,
      templateCSS,
      dims,
      printablePageHeight,
      { x: printOffsetX, y: printOffsetY },
      true, // auto-print via the shell's embedded script
      pageHeight
    );

    await printDocument({
      html: htmlContent,
      width: hwPageW,
      height: hwPageH,
      kind: 'label',
      orientation: effectiveOrientation,
      autoPrintFallback: false,
    });
  } catch (e: any) {
    console.error('Print process failed:', e);
    alert(`An unexpected error occurred during printing: ${e?.message || 'Unknown error'}`);
  }
};

/**
 * Convenience wrapper to print labels for a single drug.
 * @param drug - The drug to print
 * @param quantity - Number of labels (defaults to 1)
 * @param expiryDateOverride - Optional custom expiry date
 */
export const printSingleLabel = (
  drug: Drug,
  quantity: number = 1,
  expiryDateOverride?: string
): void => {
  printLabels([{ drug, quantity, expiryDateOverride }]);
};
