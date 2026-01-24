import React from 'react';
import { Drug } from '../../../types';
import { LabelElement } from './types';
import { SidebarSection } from './SidebarSection';
import { SearchInput } from '../../common/SearchInput';
import { SegmentedControl } from '../../common/SegmentedControl';
import { CARD_BASE } from '../../../utils/themeStyles';

interface PropertyInspectorProps {
    color: string;
    t: any;
    selectedElementId: string | null;
    selectedElement?: LabelElement;
    inventory: Drug[];
    selectedDrug: Drug | null;
    searchTerm: string;
    onSearchChange: (term: string) => void;
    onSelectDrug: (drug: Drug) => void;
    filteredDrugs: Drug[];
    
    showPairedPreview: boolean;
    setShowPairedPreview: (val: boolean) => void;
    showPrintBorders: boolean;
    setShowPrintBorders: (val: boolean) => void;
    
    // Calibration
    printOffsetX: number;
    printOffsetY: number;
    setPrintOffsetX: (val: number) => void;
    setPrintOffsetY: (val: number) => void;
    labelGap: number;
    setLabelGap: (val: 0 | 0.5 | 1) => void;
    currency: 'L.E' | 'USD';
    setCurrency: (val: 'L.E' | 'USD') => void;

    // Element Actions
    handlePropertyChange: (key: keyof LabelElement, value: any) => void;
    toggleVisibility: (id: string) => void;
    barcodeSource: 'global' | 'internal';
    setBarcodeSource: (val: 'global' | 'internal') => void;
    
    selectedContentDir: string;
    showHitboxCalibration: boolean;
    setShowHitboxCalibration: (val: boolean) => void;
}

export const PropertyInspector: React.FC<PropertyInspectorProps> = ({
    color, t, selectedElementId, selectedElement,
    inventory, selectedDrug, searchTerm, onSearchChange, onSelectDrug, filteredDrugs,
    showPairedPreview, setShowPairedPreview, showPrintBorders, setShowPrintBorders,
    printOffsetX, setPrintOffsetX, printOffsetY, setPrintOffsetY, labelGap, setLabelGap, currency, setCurrency,
    handlePropertyChange, toggleVisibility, barcodeSource, setBarcodeSource,
    selectedContentDir, showHitboxCalibration, setShowHitboxCalibration
}) => {
    return (
        <div className={`w-full lg:w-80 ${CARD_BASE} rounded-3xl flex flex-col overflow-hidden`}>
            <div className={`p-4 border-b border-gray-100 dark:border-gray-800 bg-${color}-50 dark:bg-${color}-900/10`}>
                <h3 className={`font-bold text-sm uppercase text-${color}-700 dark:text-${color}-300`}>
                    {selectedElementId ? t.inspector.properties : t.inspector.noSelection}
                </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {!selectedElementId ? (
                    <>
                        <SidebarSection title="General Settings" icon="settings" color={color}>
                            {inventory.length > 1 && (
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase block mb-2">{t.selectProduct}</label>
                                    <div className="relative">
                                        <SearchInput
                                            value={searchTerm}
                                            onSearchChange={onSearchChange}
                                            placeholder={t.searchPlaceholder}
                                            className="p-2.5 rounded-xl border-gray-200 dark:border-gray-800 ps-10"
                                            style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                                        />
                                        {searchTerm && (
                                            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                                {filteredDrugs.map(d => <div key={d.id} onClick={() => onSelectDrug(d)} className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer text-sm">{d.name}</div>)}
                                            </div>
                                        )}
                                    </div>
                                    {selectedDrug && (
                                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex justify-between items-center">
                                            <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{selectedDrug.name}</span>
                                            <span className="material-symbols-rounded text-sm text-blue-500">check_circle</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-2 space-y-3">
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={showPairedPreview} 
                                            onChange={e => setShowPairedPreview(e.target.checked)}
                                            className={`w-4 h-4 rounded text-${color}-600 focus:ring-${color}-500`}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t.printSettings.pairedPreview}
                                        </span>
                                    </label>
                                    <p className="text-[10px] text-gray-500 mt-1 px-1">
                                        {t.printSettings.pairedPreviewDesc}
                                    </p>
                                </div>

                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-gray-50 dark:bg-gray-950 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={showPrintBorders} 
                                            onChange={e => setShowPrintBorders(e.target.checked)}
                                            className={`w-4 h-4 rounded text-${color}-600 focus:ring-${color}-500`}
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            {t.printSettings.showBorders}
                                        </span>
                                    </label>
                                    <p className="text-[10px] text-gray-500 mt-1 px-1">
                                        {t.printSettings.showBordersDesc}
                                    </p>
                                </div>
                            </div>
                        </SidebarSection>
                        
                        <SidebarSection title={t.printSettings.printCalibration} icon="tune" color={color}>
                            <div className="space-y-4">
                                {/* Horizontal Offset */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-sm text-gray-400">swap_horiz</span>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.printSettings.horizontalOffset}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${color}-100 dark:bg-${color}-900/40 text-${color}-700 dark:text-${color}-300`}>
                                            {printOffsetX > 0 ? '+' : ''}{printOffsetX}mm
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="-5" max="5" step="0.5"
                                        value={printOffsetX}
                                        onChange={e => setPrintOffsetX(parseFloat(e.target.value))}
                                        className={`w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-${color}-500`}
                                    />
                                </div>
                                
                                {/* Vertical Offset */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-rounded text-sm text-gray-400">swap_vert</span>
                                            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.printSettings.verticalOffset}</span>
                                        </div>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-${color}-100 dark:bg-${color}-900/40 text-${color}-700 dark:text-${color}-300`}>
                                            {printOffsetY > 0 ? '+' : ''}{printOffsetY}mm
                                        </span>
                                    </div>
                                    <input 
                                        type="range" 
                                        min="-5" max="5" step="0.5"
                                        value={printOffsetY}
                                        onChange={e => setPrintOffsetY(parseFloat(e.target.value))}
                                        className={`w-full h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full appearance-none cursor-pointer accent-${color}-500`}
                                    />
                                </div>
                            </div>
                            
                            {/* Reset Button */}
                            <button 
                                onClick={() => { setPrintOffsetX(0); setPrintOffsetY(0); }}
                                disabled={printOffsetX === 0 && printOffsetY === 0}
                                className={`w-full py-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center gap-1.5 ${
                                    printOffsetX === 0 && printOffsetY === 0 
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed' 
                                        : `bg-${color}-100 dark:bg-${color}-900/30 text-${color}-700 dark:text-${color}-300 hover:bg-${color}-200 dark:hover:bg-${color}-800/40`
                                }`}
                            >
                                <span className="material-symbols-rounded text-sm">restart_alt</span>
                                {t.printSettings.resetCalibration}
                            </button>
                            
                            {/* Label Gap Control */}
                            <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-rounded text-sm text-gray-400">vertical_distribute</span>
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.printSettings.labelGap}</span>
                                    </div>
                                </div>
                                <SegmentedControl
                                    value={labelGap || 0}
                                    onChange={(val) => setLabelGap(val as 0 | 0.5 | 1)}
                                    options={[
                                        { label: '0mm', value: 0 },
                                        { label: '0.5mm', value: 0.5 },
                                        { label: '1mm', value: 1 }
                                    ]}
                                    color={color}
                                    size="xs"
                                />
                                <p className="text-[10px] text-gray-500 mt-1.5 px-1">{t.printSettings.labelGapDesc}</p>
                            </div>
                            
                            {/* Currency Selector */}
                            <div className="pt-4 border-t border-gray-200/50 dark:border-gray-700/50">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-rounded text-sm text-gray-400">paid</span>
                                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{t.printSettings.currency}</span>
                                </div>
                                <SegmentedControl
                                    value={currency || 'L.E'}
                                    onChange={(val) => setCurrency(val as 'L.E' | 'USD')}
                                    options={[
                                        { label: t.printSettings.currencyEGP, value: 'L.E' },
                                        { label: t.printSettings.currencyUSD, value: 'USD' }
                                    ]}
                                    color={color}
                                    size="xs"
                                />
                            </div>
                        </SidebarSection>
                    </>
                ) : (
                        /* Element Properties */
                    selectedElement && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.x}</label><input type="number" step="0.5" value={selectedElement.x} onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.y}</label><input type="number" step="0.5" value={selectedElement.y} onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                            </div>
                            {(selectedElement.type === 'text' || selectedElement.type === 'barcode') && (
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.fontSize}</label><input type="number" value={selectedElement.fontSize} onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                            )}
                            {selectedElement.type === 'barcode' && (
                                <div className="mt-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Barcode Style</label>
                                    <select 
                                        value={selectedElement.barcodeFormat || 'code128'} 
                                        onChange={(e) => handlePropertyChange('barcodeFormat', e.target.value)}
                                        className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"
                                    >
                                        <option value="code128">Code 128</option>
                                        <option value="code39">Code 39</option>
                                    </select>
                                </div>
                            )}
                            {(selectedElement.type === 'text') && (
                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase block mb-1">{t.inspector.fontWeight || 'Font Weight'}</label>
                                    <SegmentedControl
                                        value={selectedElement.fontWeight || 'normal'}
                                        onChange={(val) => handlePropertyChange('fontWeight', val)}
                                        options={[
                                            { label: 'Normal', value: 'normal' },
                                            { label: 'Bold', value: 'bold' }
                                        ]}
                                        color={color}
                                        size="xs"
                                    />
                                </div>
                            )}
                            {selectedElement.type === 'text' && !selectedElement.field && (
                                <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.content}</label><input type="text" value={selectedElement.content || ''} onChange={(e) => handlePropertyChange('content', e.target.value)} dir={selectedContentDir} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                            )}
                            {(selectedElement.type === 'qrcode' || selectedElement.type === 'image') && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.width}</label><input type="number" value={selectedElement.width} onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                                    <div><label className="text-[10px] font-bold text-gray-400 uppercase">{t.inspector.height}</label><input type="number" value={selectedElement.height} onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 text-sm"/></div>
                                </div>
                            )}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">{t.inspector.align}</label>
                                <SegmentedControl
                                    value={selectedElement.align || 'center'}
                                    onChange={(val) => handlePropertyChange('align', val)}
                                    options={[
                                        { label: '', value: 'left', icon: 'format_align_left' },
                                        { label: '', value: 'center', icon: 'format_align_center' },
                                        { label: '', value: 'right', icon: 'format_align_right' }
                                    ]}
                                    color={color}
                                    size="xs"
                                    fullWidth
                                />
                                </div>
                            {/* Rotation Toggle */}
                            <div>
                                <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">{t.inspector.rotate90}</label>
                                <SegmentedControl
                                    value={selectedElement.rotation || 0}
                                    onChange={(val) => handlePropertyChange('rotation', val)}
                                    options={[
                                        { label: '0°', value: 0 },
                                        { label: '90°', value: 90, icon: 'rotate_right' }
                                    ]}
                                    color={color}
                                    size="xs"
                                />
                            </div>
                            {selectedElement.type === 'barcode' && (
                                <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-2 block">{t.barcodeSource}</label>
                                        <SegmentedControl
                                            value={barcodeSource}
                                            onChange={(val) => setBarcodeSource(val as 'global' | 'internal')}
                                            options={[
                                                { label: 'Global', value: 'global' },
                                                { label: 'Internal', value: 'internal' }
                                            ]}
                                            color={color}
                                            size="xs"
                                        />
                                </div>
                            )}
                            {selectedElement.type === 'qrcode' && (
                                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                                    QR Code content is automatically generated from the selected barcode source.
                                </div>
                            )}
                            {/* Hitbox Calibration */}
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-100 dark:border-amber-800/30">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase flex items-center gap-1">
                                        <span className="material-symbols-rounded text-xs">tune</span>
                                        Hitbox Calibration
                                    </label>
                                    <div className="flex gap-1">
                                        <button 
                                            onClick={() => setShowHitboxCalibration(!showHitboxCalibration)}
                                            className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                                        >
                                            <span className="material-symbols-rounded text-sm">{showHitboxCalibration ? 'expand_less' : 'expand_more'}</span>
                                        </button>
                                        <button 
                                            onClick={() => { 
                                                handlePropertyChange('hitboxOffsetX' as any, 0); 
                                                handlePropertyChange('hitboxOffsetY' as any, 0); 
                                                handlePropertyChange('hitboxWidth' as any, undefined); 
                                                handlePropertyChange('hitboxHeight' as any, undefined); 
                                            }}
                                            className="p-1 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded transition-colors"
                                            title="Reset Calibration"
                                        >
                                            <span className="material-symbols-rounded text-sm">restart_alt</span>
                                        </button>
                                    </div>
                                </div>
                                {showHitboxCalibration && (
                                    <div className="space-y-2 mt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Offset X</span>
                                                    <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{((selectedElement as any).hitboxOffsetX || 0).toFixed(1)}mm</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="-5" max="5" step="0.1"
                                                    value={(selectedElement as any).hitboxOffsetX || 0}
                                                    onChange={e => handlePropertyChange('hitboxOffsetX' as any, parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Offset Y</span>
                                                    <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{((selectedElement as any).hitboxOffsetY || 0).toFixed(1)}mm</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="-5" max="5" step="0.1"
                                                    value={(selectedElement as any).hitboxOffsetY || 0}
                                                    onChange={e => handlePropertyChange('hitboxOffsetY' as any, parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Width</span>
                                                    <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{((selectedElement as any).hitboxWidth || (selectedElement.type === 'barcode' ? 30 : 10)).toFixed(0)}mm</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="5" max="50" step="1"
                                                    value={(selectedElement as any).hitboxWidth || (selectedElement.type === 'barcode' ? 30 : 10)}
                                                    onChange={e => handlePropertyChange('hitboxWidth' as any, parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>
                                            <div>
                                                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                                                    <span>Height</span>
                                                    <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{((selectedElement as any).hitboxHeight || (selectedElement.type === 'barcode' ? 8 : 4)).toFixed(0)}mm</span>
                                                </div>
                                                <input 
                                                    type="range" 
                                                    min="2" max="20" step="0.5"
                                                    value={(selectedElement as any).hitboxHeight || (selectedElement.type === 'barcode' ? 8 : 4)}
                                                    onChange={e => handlePropertyChange('hitboxHeight' as any, parseFloat(e.target.value))}
                                                    className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button onClick={() => toggleVisibility(selectedElement.id)} className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">{t.inspector.remove}</button>
                        </>
                    )
                )}
            </div>
        </div>
    );
};
