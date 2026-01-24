import React from 'react';
import { Drug } from '../../types';
import { generateTemplateCSS, getLabelElementContent, generateLabelHTML } from './LabelPrinter';
import { LabelElement, LabelDesign } from './studio/types';

interface BarcodePreviewProps {
    elements: LabelElement[];
    selectedElementId: string | null;
    zoom: number;
    dims: { w: number, h: number };
    showPairedPreview: boolean;
    // Data for generation
    drug: Drug;
    receiptSettings: { storeName: string; hotline: string };
    barcodeSource: 'global' | 'internal';
    showPrintBorders: boolean;
    uploadedLogo: string;
    qrCodeDataUrl: string;
    // Actions
    onSelect: (id: string | null) => void;
    onDragStart: (e: React.MouseEvent | React.TouchEvent, id: string) => void;
    printOffsetX?: number;
    printOffsetY?: number;
}

export const BarcodePreview: React.FC<BarcodePreviewProps> = ({
    elements,
    selectedElementId,
    zoom,
    dims,
    showPairedPreview,
    drug,
    receiptSettings,
    barcodeSource,
    showPrintBorders,
    uploadedLogo,
    qrCodeDataUrl,
    onSelect,
    onDragStart,
    printOffsetX = 0,
    printOffsetY = 0
}) => {
    
    // Generate the HTML for the iframe (THE TRUTH)
    const generatePrintHTML = (isSinglePreview: boolean, isSingleLabel: boolean) => {
        // Construct a temporary design object for the generator
        const tempDesign: LabelDesign = {
            selectedPreset: 'custom',
            elements: elements.filter(e => e.isVisible), // Only render visible
            customDims: dims,
            barcodeSource,
            showPrintBorders
        };

        const { css, classNameMap } = generateTemplateCSS(tempDesign);
        const singleLabelHTML = generateLabelHTML(
            drug,
            tempDesign,
            dims,
            receiptSettings,
            undefined, // expiryOverride
            qrCodeDataUrl,
            uploadedLogo,
            classNameMap
        );

        let finalHTML = singleLabelHTML;
        // If showing paired (2 labels), duplicate
        if (!isSingleLabel && showPairedPreview) {
            finalHTML += singleLabelHTML;
        }

        const pageHeight = showPairedPreview ? dims.h * 2 : dims.h;

        return `<!DOCTYPE html>
            <html><head>
            <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+128&family=Libre+Barcode+128+Text&family=Libre+Barcode+39&family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
            <style>
                ${css}
                body { margin: 0; padding: 0; overflow: hidden; background: white; }
                .preview-container {
                    width: ${dims.w}mm;
                    height: ${pageHeight}mm;
                    position: relative;
                }
            </style>
            </head><body>
            <div class="preview-container">
                ${finalHTML}
            </div>
            </body></html>`;
    };

    const renderPhantomElement = (el: LabelElement, offsetIndex: number = 0) => {
        const yOffset = offsetIndex * dims.h;
        const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
        
        // Apply hitbox calibration offsets (manual adjustment for selection accuracy)
        const hitboxX = el.x + (el.hitboxOffsetX || 0);
        const hitboxY = el.y + yOffset + (el.hitboxOffsetY || 0);
        
        // Default sizes based on element type (if not calibrated)
        const defaultWidth = (el.type === 'image' || el.type === 'qrcode') ? (el.width || 10) : (el.type === 'barcode' ? 30 : 10);
        const defaultHeight = (el.type === 'image' || el.type === 'qrcode') ? (el.height || 10) : (el.type === 'barcode' ? 8 : 4);
        
        // Base style - simple clickable area
        const style: React.CSSProperties = {
            position: 'absolute',
            left: `${hitboxX}mm`,
            top: `${hitboxY}mm`,
            transform: `translate(${alignTransform}, 0)`,
            // Use calibrated size or default
            width: `${el.hitboxWidth || defaultWidth}mm`,
            height: `${el.hitboxHeight || defaultHeight}mm`,
            userSelect: 'none',
            cursor: 'move',
            zIndex: 10,
            // Selection highlight - color only, no border
            background: selectedElementId === el.id ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
            borderRadius: '2px',
        };

        // Simple unified return for all element types - just a clickable hitbox
        return (
            <div
                key={`${el.id}-${offsetIndex}`}
                onMouseDown={(e) => onDragStart(e, el.id)}
                onClick={(e) => { e.stopPropagation(); onSelect(el.id); }}
                style={style}
                title={el.label}
            />
        );
    };

    return (
        <div 
            className="bg-white shadow-2xl overflow-hidden relative transition-transform duration-75 ease-linear"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
            onMouseDown={() => onSelect(null)} // Deselect on background click
        >
            {/* The Visual Truth (Iframe) */}
            <iframe
                srcDoc={generatePrintHTML(false, false)}
                scrolling="no"
                style={{ 
                    width: `${dims.w}mm`, 
                    height: `${showPairedPreview ? dims.h * 2 : dims.h}mm`,
                    border: 'none',
                    display: 'block',
                    overflow: 'hidden',
                    pointerEvents: 'none' // Interaction handled by phantom layer
                }}
                title="True Preview"
            />

            {/* Phantom Interaction Layer */}
            <div 
                className="absolute inset-0 z-10"
                style={{
                    // Mirror .print-container styles from LabelPrinter.ts
                    // This ensures the coordinate system matches the print output exactly
                    paddingLeft: printOffsetX > 0 ? `${printOffsetX}mm` : 0,
                    paddingRight: printOffsetX < 0 ? `${Math.abs(printOffsetX)}mm` : 0,
                    paddingTop: printOffsetY > 0 ? `${printOffsetY}mm` : 0,
                    paddingBottom: printOffsetY < 0 ? `${Math.abs(printOffsetY)}mm` : 0,
                    boxSizing: 'border-box',
                    fontSize: 0,
                    lineHeight: 0,
                }}
            >
                {[0, ...(showPairedPreview ? [1] : [])].map(offsetIndex => (
                     elements.filter(el => el.isVisible).map(el => renderPhantomElement(el, offsetIndex))
                ))}
            </div>
        </div>
    );
};
