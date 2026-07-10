import type { LabelDesign, LabelElement } from '../../components/inventory/studio/types';
import type { Drug } from '../../types';

// Helper to convert mm to dots based on DPI
const mmToDots = (mm: number, dpi: number = 203): number => {
  // 203 DPI = 8 dots per mm
  const dotsPerMm = dpi === 203 ? 8 : 11.81;
  return Math.round(mm * dotsPerMm);
};

// Simple text resolver so we don't depend on HTML generation files
export const resolveElementText = (
  el: LabelElement,
  drug: Drug,
  settings: { storeName: string; hotline: string },
  expiryOverride?: string,
  currency: string = 'L.E'
): string => {
  if (el.content) return el.content;
  if (!el.field) return '';

  switch (el.field) {
    case 'name':
      return drug.name || '';
    case 'publicPrice':
      return `${drug.publicPrice} ${currency}`;
    case 'expiryDate':
      return expiryOverride || drug.expiryDate || '';
    case 'store':
      return settings.storeName || '';
    case 'hotline':
      return settings.hotline || '';
    case 'unit':
      return drug.dosageForm || (drug.unitsPerPack ? `${drug.unitsPerPack}` : '');
    default:
      return (drug[el.field as keyof Drug] as string) || '';
  }
};

/**
 * Generates TSPL commands for a specific label design.
 */
export const generateTSPL = (
  design: LabelDesign,
  drug: Drug,
  settings: { storeName: string; hotline: string },
  expiryOverride?: string
): string[] => {
  const commands: string[] = [];
  const dims =
    design.selectedPreset === 'custom' && design.customDims ? design.customDims : { w: 38, h: 25 };

  const isDouble = design.selectedPreset === '38x25';
  const labelHeight = isDouble ? 12 : dims.h;
  const outerGap = isDouble ? 2 : design.labelGap || 0;

  commands.push(`SIZE ${dims.w} mm,${isDouble ? 24 : dims.h} mm`);
  commands.push(`GAP ${outerGap} mm,0 mm`);
  commands.push('DIRECTION 1,0');
  commands.push('REFERENCE 0,0');
  commands.push('OFFSET 0 mm');
  commands.push('SET PEEL OFF');
  commands.push('SET CUTTER OFF');
  commands.push('SET TEAR ON');
  commands.push('CLS');

  const generateCommandsForElement = (el: LabelElement, yOffsetMm: number) => {
    if (!el.isVisible) return;

    const x = mmToDots(el.x);
    const y = mmToDots(el.y + yOffsetMm);

    if (el.type === 'text') {
      const text = resolveElementText(el, drug, settings, expiryOverride, design.currency);
      if (!text) return;

      const fontSize = el.fontSize || 12;
      const tsplFont = fontSize > 14 ? '2' : fontSize < 10 ? '0' : '1';
      commands.push(`TEXT ${x},${y},"${tsplFont}",0,1,1,"${text}"`);
    } else if (el.type === 'barcode') {
      const barcodeValue =
        design.barcodeSource === 'internal'
          ? drug.internalCode || drug.id
          : drug.barcode || drug.id;

      const heightDots = mmToDots(el.height || 8);
      const format = el.barcodeFormat?.startsWith('code39') ? '39' : '128';
      const humanReadable = el.barcodeFormat?.includes('text') ? '1' : '0';

      commands.push(
        `BARCODE ${x},${y},"${format}",${heightDots},${humanReadable},0,2,2,"${barcodeValue}"`
      );
    } else if (el.type === 'qrcode') {
      const barcodeValue =
        design.barcodeSource === 'internal'
          ? drug.internalCode || drug.id
          : drug.barcode || drug.id;
      commands.push(`QRCODE ${x},${y},L,4,A,0,"${barcodeValue}"`);
    }
  };

  design.elements.forEach((el) => generateCommandsForElement(el, 0));

  if (isDouble) {
    design.elements.forEach((el) => generateCommandsForElement(el, labelHeight));
  }

  commands.push('PRINT 1,1');
  return commands;
};

/**
 * Generates ZPL commands for a specific label design.
 */
export const generateZPL = (
  design: LabelDesign,
  drug: Drug,
  settings: { storeName: string; hotline: string },
  expiryOverride?: string
): string[] => {
  const commands: string[] = [];
  const dims =
    design.selectedPreset === 'custom' && design.customDims ? design.customDims : { w: 38, h: 25 };

  const isDouble = design.selectedPreset === '38x25';
  const labelHeight = isDouble ? 12 : dims.h;

  const wDots = mmToDots(dims.w);
  const hDots = mmToDots(isDouble ? 24 : dims.h);

  commands.push('^XA');
  commands.push('^CI28');
  commands.push(`^PW${wDots}`);
  commands.push(`^LL${hDots}`);

  const generateCommandsForElement = (el: LabelElement, yOffsetMm: number) => {
    if (!el.isVisible) return;

    const x = mmToDots(el.x);
    const y = mmToDots(el.y + yOffsetMm);

    if (el.type === 'text') {
      const text = resolveElementText(el, drug, settings, expiryOverride, design.currency);
      if (!text) return;

      const fontHeight = Math.round((el.fontSize || 12) * 1.5);
      commands.push(`^FO${x},${y}^A0N,${fontHeight},${fontHeight}^FD${text}^FS`);
    } else if (el.type === 'barcode') {
      const barcodeValue =
        design.barcodeSource === 'internal'
          ? drug.internalCode || drug.id
          : drug.barcode || drug.id;

      const heightDots = mmToDots(el.height || 8);
      const humanReadable = el.barcodeFormat?.includes('text') ? 'Y' : 'N';
      const format = el.barcodeFormat?.startsWith('code39') ? '^B3N' : '^BCN';

      commands.push(
        `^FO${x},${y}${format},${heightDots},${humanReadable},N,N^FD${barcodeValue}^FS`
      );
    } else if (el.type === 'qrcode') {
      const barcodeValue =
        design.barcodeSource === 'internal'
          ? drug.internalCode || drug.id
          : drug.barcode || drug.id;
      commands.push(`^FO${x},${y}^BQN,2,4^FDQA,${barcodeValue}^FS`);
    }
  };

  design.elements.forEach((el) => generateCommandsForElement(el, 0));

  if (isDouble) {
    design.elements.forEach((el) => generateCommandsForElement(el, labelHeight));
  }

  commands.push('^XZ');
  return commands;
};
