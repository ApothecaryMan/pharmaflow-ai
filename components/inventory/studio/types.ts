import type { Drug } from '../../../types';

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
  rotation?: 0 | 90;

  // Hitbox calibration
  hitboxOffsetX?: number;
  hitboxOffsetY?: number;
  hitboxWidth?: number;
  hitboxHeight?: number;
}

export interface LabelDesign {
  elements: LabelElement[];
  selectedPreset: string;
  customDims?: { w: number; h: number };
  barcodeSource?: 'global' | 'internal';
  showPrintBorders?: boolean;
  printOffsetX?: number;
  printOffsetY?: number;
  labelGap?: 0 | 0.5 | 1 | 2; // Added 2 for double labels without physical gap
  currency?: 'L.E' | 'USD';
  uploadedLogo?: string;
  activeTemplateId?: string | null;
  printerLanguage?: 'html' | 'tspl' | 'zpl';
  tsplOptions?: {
    darkness?: number; // 0-15
    speed?: number; // 1-6
  };
}

export interface SavedTemplate {
  id: string;
  name: string;
  design: any; // Using any for now to avoid migration issues, but really LabelDesign
  author?: string;
  createdAt?: number;
}
