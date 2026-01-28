import React from 'react';
import { Drug } from '../../types';
import { generateTemplateCSS, getLabelElementContent, generateLabelHTML, generatePageHTML } from './LabelPrinter';
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
    // Guidelines
    showVCenterGuide?: boolean;
    showHCenterGuide?: boolean;
    alignmentGuides?: { x?: number; y?: number }[];
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
    printOffsetY = 0,
    showVCenterGuide = false,
    showHCenterGuide = false,
    alignmentGuides = []
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

        const currentDims = dims || { w: 38, h: 25 };
        const isDouble = currentDims.w === 38 && currentDims.h === 25; // Matching 38x25 logic
        const labelHeight = isDouble ? 12 : currentDims.h;
        const innerGap = isDouble ? 1 : 0;
        const outerGap = 3; // Standard gap as requested

        const renderDims = { w: currentDims.w, h: labelHeight };

        const { css: templateCSS, classNameMap } = generateTemplateCSS(tempDesign);
        const singleLabelHTML = generateLabelHTML(
            drug,
            tempDesign,
            renderDims,
            receiptSettings,
            undefined, // expiryOverride
            qrCodeDataUrl,
            uploadedLogo,
            classNameMap
        );

        let finalHTML = '';
        const labelsCount = (!isSingleLabel && showPairedPreview) ? 2 : 1;
        
        if (labelsCount === 2) {
            finalHTML = `
                <div class="pair-container">
                    ${singleLabelHTML}
                    <div style="height: ${innerGap}mm;"></div>
                    ${singleLabelHTML}
                </div>
            `;
        } else {
            finalHTML = singleLabelHTML;
        }

        const pageHeight = labelsCount === 2 ? (labelHeight * 2) + innerGap + outerGap : labelHeight + outerGap;
        
        // Use the SHARED generator to ensure identical output to the printer
        return generatePageHTML(
            finalHTML,
            templateCSS,
            dims,
            pageHeight,
            { x: printOffsetX, y: printOffsetY }
        );
    };

    const renderPhantomElement = (el: LabelElement, offsetIndex: number = 0) => {
        const currentDims = dims || { w: 38, h: 25 };
        const isDouble = currentDims.w === 38 && currentDims.h === 25;
        const labelHeight = isDouble ? 12 : currentDims.h;
        const innerGap = isDouble ? 1 : 0;
        
        // The vertical offset for the second label in a pair includes the 1mm gap
        const yOffset = offsetIndex * (labelHeight + innerGap);
        const alignTransform = el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0';
        
        // Apply hitbox calibration offsets (manual adjustment for selection accuracy)
        const hitboxX = el.x + (el.hitboxOffsetX || 0);
        const hitboxY = el.y + yOffset + (el.hitboxOffsetY || 0);
        
        // Default sizes based on element type (if not calibrated)
        const defaultWidth = (el.type === 'image' || el.type === 'qrcode' || el.type === 'barcode') ? (el.width || (el.type === 'barcode' ? 30 : 10)) : 10;
        const defaultHeight = (el.type === 'image' || el.type === 'qrcode' || el.type === 'barcode') ? (el.height || (el.type === 'barcode' ? 8 : 4)) : 4;
        
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
                    height: `${showPairedPreview ? (2 * 12 + 1 + 3) : 15}mm`, // Explicitly show the full pitch
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
                    transform: `translate(${printOffsetX}mm, ${printOffsetY}mm)`,
                    boxSizing: 'border-box',
                    fontSize: 0,
                    lineHeight: 0,
                }}
            >
                {/* Center Guidelines */}
                {showVCenterGuide && (
                    <div className="absolute top-0 bottom-0 border-l border-blue-500/50 border-dashed z-[20]" 
                         style={{ left: `${dims.w / 2}mm`, height: `${showPairedPreview ? dims.h * 2 : dims.h}mm` }} 
                    />
                )}
                {showHCenterGuide && (
                    <div className="absolute left-0 right-0 border-t border-blue-500/50 border-dashed z-[20]" 
                         style={{ top: `${dims.h / 2}mm`, width: `${dims.w}mm` }} 
                    />
                )}

                {/* Element-to-Element Guides */}
                {alignmentGuides.map((guide, idx) => (
                    guide.x !== undefined ? (
                        <div key={`v-${idx}`} className="absolute top-0 bottom-0 border-l border-emerald-500/40 border-dashed z-[20]" 
                             style={{ left: `${guide.x}mm`, height: `${showPairedPreview ? dims.h * 2 : dims.h}mm` }} 
                        />
                    ) : guide.y !== undefined ? (
                        <div key={`h-${idx}`} className="absolute left-0 right-0 border-t border-emerald-500/40 border-dashed z-[20]" 
                             style={{ top: `${guide.y}mm`, width: `${dims.w}mm` }} 
                        />
                    ) : null
                ))}

                {[0, ...(showPairedPreview ? [1] : [])].map(offsetIndex => (
                     elements.filter(el => el.isVisible).map(el => renderPhantomElement(el, offsetIndex))
                ))}
            </div>
        </div>
    );
};
