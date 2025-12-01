
import React, { useState, useEffect, useRef } from 'react';
import { Drug } from '../types';
import * as QRCode from 'qrcode';

interface BarcodeStudioProps {
  inventory: Drug[];
  color: string;
  t: any;
}

// 1mm approx 3.78px at 96 DPI
const MM_TO_PX = 3.78;

// Industry Standard Thermal Label Sizes
const LABEL_PRESETS: Record<string, { w: number, h: number, label: string }> = {
    '38x12': { w: 38, h: 12, label: '38×12 mm (Default)' },
    '25x15': { w: 25, h: 15, label: '25×15 mm (Mini)' },
    '30x20': { w: 30, h: 20, label: '30×20 mm' },
    '32x25': { w: 32, h: 25, label: '32×25 mm' },
    '40x20': { w: 40, h: 20, label: '40×20 mm' },
    '40x30': { w: 40, h: 30, label: '40×30 mm' },
    '50x25': { w: 50, h: 25, label: '50×25 mm' },
    '50x30': { w: 50, h: 30, label: '50×30 mm' },
    'custom': { w: 0, h: 0, label: 'Custom Size' }
};

interface LabelElement {
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
}

interface SavedTemplate {
    id: string;
    name: string;
    design: any;
}

export const BarcodeStudio: React.FC<BarcodeStudioProps> = ({ inventory, color, t }) => {
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Canvas State
  const [elements, setElements] = useState<LabelElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // History
  const [history, setHistory] = useState<LabelElement[][]>([]);
  const [redoStack, setRedoStack] = useState<LabelElement[][]>([]);

  // Guidelines
  const [showVGuide, setShowVGuide] = useState(false);
  const [showHGuide, setShowHGuide] = useState(false);

  // Global Settings
  const [selectedPreset, setSelectedPreset] = useState<string>('38x12');
  const [customDims, setCustomDims] = useState<{ w: number, h: number }>({ w: 38, h: 12 });
  const [zoom, setZoom] = useState(2);
  const [borderStyle, setBorderStyle] = useState<'none' | 'solid' | 'dashed'>('none');
  const [printMode, setPrintMode] = useState<'single' | 'sheet'>('single');
  const [barcodeSource, setBarcodeSource] = useState<'global' | 'internal'>('global');
  
  // Data State
  const [storeName, setStoreName] = useState('PharmaFlow');
  const [hotline, setHotline] = useState('16999');
  const [uploadedLogo, setUploadedLogo] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Template System
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // Dragging Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialElemPos = useRef({ x: 0, y: 0 });
  const dragStartSnapshot = useRef<LabelElement[]>([]);

  const dims = selectedPreset === 'custom' ? customDims : (LABEL_PRESETS[selectedPreset] || LABEL_PRESETS['38x12']);

  // Load Templates & Last State
  useEffect(() => {
    // Load Templates
    const savedTemplates = localStorage.getItem('pharma_label_templates');
    if (savedTemplates) {
        try {
            setTemplates(JSON.parse(savedTemplates));
        } catch (e) { console.error("Error loading templates", e); }
    }

    // Load Last Session (Autosave)
    const savedDesign = localStorage.getItem('pharma_label_design');
    if (savedDesign) {
        try {
            const parsed = JSON.parse(savedDesign);
            if (parsed.elements && parsed.elements.length > 0) {
                applyDesignState(parsed);
            } else {
                initializeLayout('38x12');
            }
        } catch (e) {
            console.error("Failed to load design", e);
            initializeLayout('38x12');
        }
    } else {
        initializeLayout('38x12');
    }
  }, []);

  // Autosave current workspace
  useEffect(() => {
    const designState = getDesignState();
    localStorage.setItem('pharma_label_design', JSON.stringify(designState));
  }, [elements, selectedPreset, customDims, borderStyle, storeName, hotline, uploadedLogo, barcodeSource, activeTemplateId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            e.shiftKey ? handleRedo() : handleUndo();
            e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            handleRedo();
            e.preventDefault();
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, redoStack, elements]);

  const getDesignState = () => ({
      selectedPreset, customDims, elements, borderStyle, storeName, hotline, uploadedLogo, barcodeSource, activeTemplateId
  });

  const applyDesignState = (state: any) => {
      if (state.selectedPreset) setSelectedPreset(state.selectedPreset);
      if (state.customDims) setCustomDims(state.customDims);
      if (state.elements) setElements(state.elements);
      if (state.borderStyle) setBorderStyle(state.borderStyle);
      if (state.storeName) setStoreName(state.storeName);
      if (state.hotline) setHotline(state.hotline);
      if (state.uploadedLogo) setUploadedLogo(state.uploadedLogo);
      if (state.barcodeSource) setBarcodeSource(state.barcodeSource);
      if (state.activeTemplateId) setActiveTemplateId(state.activeTemplateId);
  };

  const initializeLayout = (presetKey: string) => {
      const { w, h } = presetKey === 'custom' ? customDims : (LABEL_PRESETS[presetKey] || LABEL_PRESETS['38x12']);
      
      const newElements: LabelElement[] = [
          { id: 'store', type: 'text', label: 'Store Name', x: w/2, y: 1, fontSize: 6, align: 'center', isVisible: true, field: 'store', color: '#64748b' },
          { id: 'name', type: 'text', label: 'Drug Name', x: w/2, y: 3.5, fontSize: 8, fontWeight: 'bold', align: 'center', isVisible: true, field: 'name' },
          { id: 'barcode', type: 'barcode', label: 'Barcode', x: w/2, y: 6.5, fontSize: 19, align: 'center', isVisible: true, width: w * 0.9 },
          { id: 'price', type: 'text', label: 'Price', x: 1, y: h - 2.5, fontSize: 6, align: 'left', isVisible: true, field: 'price' },
          // Removed 'internal' text element from default layout
          { id: 'expiry', type: 'text', label: 'Expiry', x: w - 1, y: h - 2.5, fontSize: 6, align: 'right', isVisible: true, field: 'expiryDate' },
          { id: 'hotline', type: 'text', label: 'Hotline', x: w/2, y: 2, fontSize: 5, align: 'center', isVisible: false, field: 'hotline' },
          { id: 'generic', type: 'text', label: 'Generic Name', x: w/2, y: 4.5, fontSize: 6, align: 'center', isVisible: false, field: 'genericName' }
      ];
      setElements(newElements);
      setHistory([]);
      setRedoStack([]);
      setActiveTemplateId(null); // Reset active template on fresh layout
  };

  const saveToHistory = () => {
      setHistory(prev => [...prev, elements]);
      setRedoStack([]);
  };

  const handleUndo = () => {
      if (history.length === 0) return;
      const previous = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setRedoStack(prev => [elements, ...prev]);
      setElements(previous);
      setHistory(newHistory);
  };

  const handleRedo = () => {
      if (redoStack.length === 0) return;
      const next = redoStack[0];
      const newRedo = redoStack.slice(1);
      setHistory(prev => [...prev, elements]);
      setElements(next);
      setRedoStack(newRedo);
  };

  // Template Management
  const handleSaveClick = () => {
      if (activeTemplateId) {
          // Update Existing
          updateTemplate(activeTemplateId, templates.find(t => t.id === activeTemplateId)?.name || 'Untitled');
      } else {
          // Save As New
          setNewTemplateName('');
          setShowSaveModal(true);
      }
  };

  const saveNewTemplate = () => {
      if (!newTemplateName.trim()) return;
      const newId = Date.now().toString();
      const design = getDesignState();
      design.activeTemplateId = newId;

      const newTemplate: SavedTemplate = {
          id: newId,
          name: newTemplateName,
          design: design
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      localStorage.setItem('pharma_label_templates', JSON.stringify(updatedTemplates));
      
      setActiveTemplateId(newId);
      setShowSaveModal(false);
      setSaveStatus(t.templateSaved);
      setTimeout(() => setSaveStatus(''), 2000);
  };

  const updateTemplate = (id: string, name: string) => {
      const design = getDesignState();
      const updatedTemplates = templates.map(t => 
          t.id === id ? { ...t, design } : t
      );
      setTemplates(updatedTemplates);
      localStorage.setItem('pharma_label_templates', JSON.stringify(updatedTemplates));
      setSaveStatus(t.templateSaved);
      setTimeout(() => setSaveStatus(''), 2000);
  };

  const loadTemplate = (id: string) => {
      if (!id) {
          initializeLayout(selectedPreset);
          return;
      }
      const template = templates.find(t => t.id === id);
      if (template) {
          applyDesignState(template.design);
          setActiveTemplateId(id);
      }
  };

  const deleteTemplate = (id: string) => {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      localStorage.setItem('pharma_label_templates', JSON.stringify(updated));
      if (activeTemplateId === id) {
          initializeLayout(selectedPreset);
      }
  };

  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newPreset = e.target.value;
      setSelectedPreset(newPreset);
      initializeLayout(newPreset);
  };

  const addElement = (type: 'text' | 'image' | 'qrcode') => {
      const id = `custom-${Date.now()}`;
      const newEl: LabelElement = {
          id,
          type,
          label: type === 'text' ? 'Text' : type === 'image' ? 'Image' : 'QR',
          x: dims.w / 2,
          y: dims.h / 2,
          fontSize: 8,
          align: 'center',
          isVisible: true,
          content: type === 'text' ? 'New Text' : undefined,
          width: type === 'image' || type === 'qrcode' ? 10 : undefined,
          height: type === 'image' || type === 'qrcode' ? 10 : undefined
      };
      saveToHistory();
      setElements(prev => [...prev, newEl]);
      setSelectedElementId(id);
  };

  const handleAddImageElement = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const result = event.target?.result as string;
              const id = `img-${Date.now()}`;
              const newEl: LabelElement = {
                  id,
                  type: 'image',
                  label: 'Image',
                  x: dims.w / 2,
                  y: dims.h / 2,
                  width: 10,
                  height: 10,
                  isVisible: true,
                  content: result
              };
              saveToHistory();
              setElements(prev => [...prev, newEl]);
              setSelectedElementId(id);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleMove = (clientX: number, clientY: number) => {
      if (!isDragging.current || !selectedElementId) return;
      
      const dxPx = clientX - dragStart.current.x;
      const dyPx = clientY - dragStart.current.y;
      
      const dxMm = dxPx / (MM_TO_PX * zoom);
      const dyMm = dyPx / (MM_TO_PX * zoom);

      let newX = Number((initialElemPos.current.x + dxMm).toFixed(1));
      let newY = Number((initialElemPos.current.y + dyMm).toFixed(1));

      // Snap to center logic
      const centerX = dims.w / 2;
      const centerY = dims.h / 2;
      const snapThreshold = 1.0; 

      if (Math.abs(newX - centerX) < snapThreshold) { newX = centerX; setShowVGuide(true); } else { setShowVGuide(false); }
      if (Math.abs(newY - centerY) < snapThreshold) { newY = centerY; setShowHGuide(true); } else { setShowHGuide(false); }

      setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, x: newX, y: newY } : el));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedElementId(id);
      dragStartSnapshot.current = elements;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const elem = elements.find(el => el.id === id);
      if (elem) initialElemPos.current = { x: elem.x, y: elem.y };
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
      e.stopPropagation();
      setSelectedElementId(id);
      dragStartSnapshot.current = elements;
      isDragging.current = true;
      const touch = e.touches[0];
      dragStart.current = { x: touch.clientX, y: touch.clientY };
      const elem = elements.find(el => el.id === id);
      if (elem) initialElemPos.current = { x: elem.x, y: elem.y };
  };

  const handleEnd = () => {
      if (isDragging.current) {
          isDragging.current = false;
          setShowVGuide(false);
          setShowHGuide(false);
          if (JSON.stringify(dragStartSnapshot.current) !== JSON.stringify(elements)) {
              setHistory(prev => [...prev, dragStartSnapshot.current]);
              setRedoStack([]);
          }
      }
  };

  const handleMouseMove = (e: React.MouseEvent) => handleMove(e.clientX, e.clientY);
  const handleTouchMove = (e: React.TouchEvent) => handleMove(e.touches[0].clientX, e.touches[0].clientY);

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (event) => {
              const result = event.target?.result as string;
              setUploadedLogo(result);
              
              if (canvasRef.current) {
                  const rect = canvasRef.current.getBoundingClientRect();
                  const x = (e.clientX - rect.left) / (MM_TO_PX * zoom);
                  const y = (e.clientY - rect.top) / (MM_TO_PX * zoom);
                  
                  saveToHistory();
                  setElements(prev => prev.map(el => 
                      el.id === 'logo' ? { ...el, isVisible: true, x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) } : el
                  ));
                  setSelectedElementId('logo');
              }
          };
          reader.readAsDataURL(file);
      }
  };

  const getUnitLabel = (drug: Drug): string => {
      const text = (drug.name + " " + drug.description + " " + drug.category).toLowerCase();
      if (text.includes('tablet') || text.includes('pill')) return 'Tab';
      if (text.includes('capsule')) return 'Cap';
      if (text.includes('syrup') || text.includes('liquid')) return 'Btl';
      if (text.includes('cream') || text.includes('gel')) return 'Tube';
      if (text.includes('injection') || text.includes('ampoule')) return 'Amp';
      if (text.includes('vial')) return 'Vial';
      if (text.includes('mask') || text.includes('glove')) return 'Box';
      return 'Unit';
  };

  const getElementContent = (el: LabelElement) => {
      if (!selectedDrug) return el.content || el.label;
      if (el.content && el.type === 'text' && !el.field) return el.content;
      switch (el.field) {
          case 'name': return selectedDrug.name;
          case 'price': 
            const unit = getUnitLabel(selectedDrug);
            return `$${selectedDrug.price.toFixed(2)}`;
          case 'store': return storeName;
          case 'hotline': return `Tel: ${hotline}`;
          case 'internalCode': return selectedDrug.internalCode || '';
          case 'barcode': return barcodeSource === 'internal' ? (selectedDrug.internalCode || selectedDrug.id) : (selectedDrug.barcode || selectedDrug.id);
          case 'expiryDate': return new Date(selectedDrug.expiryDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
          case 'category': return selectedDrug.category;
          case 'genericName': return selectedDrug.genericName || '';
          default: return el.content || el.label;
      }
  };

  const handlePropertyChange = (key: keyof LabelElement, value: any) => {
      if (!selectedElementId) return;
      saveToHistory();
      setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, [key]: value } : el));
  };
  const toggleVisibility = (id: string) => {
      saveToHistory();
      setElements(prev => prev.map(el => el.id === id ? { ...el, isVisible: !el.isVisible } : el));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onload = (end) => setUploadedLogo(end.target?.result as string);
          reader.readAsDataURL(file);
      }
  };

  // Re-render QR on change
  useEffect(() => {
    if (selectedDrug) {
        const text = barcodeSource === 'internal' ? (selectedDrug.internalCode || selectedDrug.id) : (selectedDrug.barcode || selectedDrug.id);
        QRCode.toDataURL(text, { width: 100, margin: 0 }).then(setQrCodeDataUrl).catch(console.error);
    }
  }, [selectedDrug, barcodeSource]);
  
  const handleCanvasMouseDown = () => {
      setSelectedElementId(null);
  };

  const filteredDrugs = inventory.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) || (d.barcode && d.barcode.includes(searchTerm))
  );

  const selectedElement = elements.find(el => el.id === selectedElementId);

  const handlePrint = () => {
      if (!selectedDrug) return;
      const printWindow = window.open('', '', 'width=800,height=1000');
      if (!printWindow) return;

      const barcodeValue = barcodeSource === 'internal' ? (selectedDrug.internalCode || selectedDrug.id) : (selectedDrug.barcode || selectedDrug.id);
      const barcodeText = `*${barcodeValue.replace(/\s/g, '').toUpperCase()}*`;

      const generateElementHTML = (el: LabelElement) => {
          if (!el.isVisible) return '';
          const content = getElementContent(el);
          const commonStyle = `position: absolute; left: ${el.x}mm; top: ${el.y}mm; transform: translate(${el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0'}, 0);`;
          
          if (el.type === 'text') {
              return `<div style="${commonStyle} font-size: ${el.fontSize}px; font-weight: ${el.fontWeight || 'normal'}; color: ${el.color || 'black'}; white-space: nowrap;">${content}</div>`;
          }
          if (el.type === 'barcode') {
              return `<div style="${commonStyle} font-family: 'Libre Barcode 39 Text'; font-size: ${el.fontSize}px; line-height: 0.8; padding-top: 1px;">${barcodeText}</div>`;
          }
          if (el.type === 'qrcode') {
              return `<img src="${qrCodeDataUrl}" style="${commonStyle} width: ${el.width}mm; height: ${el.height}mm;" />`;
          }
          if (el.type === 'image') {
              const src = el.id === 'logo' ? uploadedLogo : el.content;
              if (src) return `<img src="${src}" style="${commonStyle} width: ${el.width}mm; height: ${el.height}mm; object-fit: contain;" />`;
          }
          return '';
      };

      const labelHTML = `
        <div class="label-container">
            ${elements.map(generateElementHTML).join('')}
        </div>
      `;

      const css = `
        @page { size: ${printMode === 'single' ? `${dims.w}mm ${dims.h}mm` : 'A4'}; margin: ${printMode === 'single' ? '0' : '10mm'}; }
        body { margin: 0; padding: 0; font-family: 'Roboto', sans-serif; }
        .label-container {
            width: ${dims.w}mm; height: ${dims.h}mm;
            position: relative; overflow: hidden;
            background: white;
            border: ${borderStyle === 'none' ? 'none' : `1px ${borderStyle} #000`};
            box-sizing: border-box;
            page-break-inside: avoid;
        }
        .sheet { display: grid; grid-template-columns: repeat(auto-fill, ${dims.w}mm); gap: 5mm; }
      `;

      printWindow.document.write(`
        <html><head><title>Print</title>
        <link href="https://fonts.googleapis.com/css2?family=Libre+Barcode+39+Text&family=Roboto:wght@400;700&display=swap" rel="stylesheet">
        <style>${css}</style></head><body>
        ${printMode === 'single' ? labelHTML : `<div class="sheet">${Array(30).fill(labelHTML).join('')}</div>`}
        <script>document.fonts.ready.then(() => window.print());</script></body></html>
      `);
      printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in pb-10" 
         onMouseMove={handleMouseMove} onMouseUp={handleEnd} onTouchMove={handleTouchMove} onTouchEnd={handleEnd}>
        
        {/* Header */}
        <div className="flex justify-between items-end">
            <div>
                <h2 className="text-2xl font-medium tracking-tight">{t.title}</h2>
                <div className="flex items-center gap-2">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{t.subtitle}</p>
                    {activeTemplateId && (
                         <span className={`px-2 py-0.5 rounded text-[10px] bg-${color}-100 text-${color}-700 font-bold uppercase`}>
                             {templates.find(t => t.id === activeTemplateId)?.name}
                         </span>
                    )}
                </div>
            </div>
             <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                {/* History Group */}
                <div className="flex items-center gap-1 pr-2 border-e border-slate-200 dark:border-slate-800">
                    <button onClick={handleUndo} disabled={history.length === 0} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-500 transition-colors" title={t.undo}>
                        <span className="material-symbols-rounded text-[20px]">undo</span>
                    </button>
                    <button onClick={handleRedo} disabled={redoStack.length === 0} className="p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30 text-slate-500 transition-colors" title={t.redo}>
                        <span className="material-symbols-rounded text-[20px]">redo</span>
                    </button>
                    <button onClick={() => initializeLayout(selectedPreset)} className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-500 hover:text-red-500 transition-colors" title="Reset Layout">
                        <span className="material-symbols-rounded text-[20px]">restart_alt</span>
                    </button>
                </div>
                
                {/* Actions Group */}
                <div className="flex items-center gap-1 pl-1">
                    <button onClick={handleSaveClick} className={`p-2 px-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 text-${color}-600 font-medium text-xs flex items-center gap-2 transition-colors`}>
                         <span className="material-symbols-rounded text-[20px]">save</span>
                         <span className="hidden sm:inline">{saveStatus || t.saveTemplate}</span>
                    </button>
                    
                     <button onClick={handlePrint} disabled={!selectedDrug} className={`py-2 px-4 rounded-xl bg-${color}-600 hover:bg-${color}-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-sm shadow-sm transition-all active:scale-95 flex items-center gap-2`}>
                         <span className="material-symbols-rounded text-[20px]">print</span>
                         <span>{t.print}</span>
                    </button>
                </div>
             </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
            {/* LEFT: Canvas */}
            <div className="flex-1 flex flex-col gap-4">
                 {/* Top Toolbar */}
                 <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-3 shadow-sm">
                    <div className="flex items-center gap-2 px-2 border-e border-slate-200 dark:border-slate-800">
                        <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="p-1 hover:bg-slate-100 rounded text-slate-500"><span className="material-symbols-rounded">remove</span></button>
                        <span className="text-xs font-bold w-8 text-center">{Math.round(zoom * 100)}%</span>
                        <button onClick={() => setZoom(Math.min(5, zoom + 0.5))} className="p-1 hover:bg-slate-100 rounded text-slate-500"><span className="material-symbols-rounded">add</span></button>
                    </div>
                    
                    <div className="flex items-center gap-1 px-2 border-e border-slate-200 dark:border-slate-800">
                        <button onClick={() => addElement('text')} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Add Text">
                            <span className="material-symbols-rounded">title</span>
                        </button>
                        <button onClick={() => document.getElementById('img-upload-hidden')?.click()} className="p-1 hover:bg-slate-100 rounded text-slate-500" title="Add Image">
                            <span className="material-symbols-rounded">image</span>
                        </button>
                        <input type="file" id="img-upload-hidden" className="hidden" accept="image/*" onChange={handleAddImageElement} />
                    </div>

                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                        {elements.map(el => (
                            <button key={el.id} onClick={() => toggleVisibility(el.id)} className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${el.isVisible ? `bg-${color}-50 border-${color}-200 text-${color}-700` : 'bg-slate-50 border-transparent text-slate-400'}`}>
                                {el.label}
                            </button>
                        ))}
                    </div>
                 </div>

                 {/* Canvas */}
                 <div 
                    className="flex-1 bg-slate-100 dark:bg-slate-950 rounded-3xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)]"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                 >
                    {!selectedDrug ? (
                        <div className="text-center text-slate-400"><span className="material-symbols-rounded text-6xl opacity-20 mb-2">touch_app</span><p>{t.noProductSelected}</p></div>
                    ) : (
                        <div 
                            ref={canvasRef} onMouseDown={() => setSelectedElementId(null)} onTouchStart={() => setSelectedElementId(null)}
                            className="bg-white shadow-2xl relative transition-transform duration-75 ease-linear"
                            style={{
                                width: `${dims.w * MM_TO_PX}px`, height: `${dims.h * MM_TO_PX}px`, transform: `scale(${zoom})`, transformOrigin: 'center',
                                border: borderStyle === 'none' ? '1px dashed #e2e8f0' : `1px ${borderStyle} #000`
                            }}
                        >
                            {/* Guidelines */}
                            {showVGuide && <div className="absolute top-0 bottom-0 left-1/2 w-px bg-red-500 border-l border-dashed border-red-500 z-50 pointer-events-none" style={{ transform: 'translateX(-0.5px)' }}></div>}
                            {showHGuide && <div className="absolute left-0 right-0 top-1/2 h-px bg-red-500 border-t border-dashed border-red-500 z-50 pointer-events-none" style={{ transform: 'translateY(-0.5px)' }}></div>}

                            {elements.filter(el => el.isVisible).map(el => (
                                <div key={el.id} onMouseDown={(e) => handleMouseDown(e, el.id)} onTouchStart={(e) => handleTouchStart(e, el.id)}
                                    className={`absolute cursor-move select-none touch-none ${selectedElementId === el.id ? 'ring-1 ring-blue-500 z-10' : ''}`}
                                    style={{
                                        left: `${el.x * MM_TO_PX}px`, top: `${el.y * MM_TO_PX}px`,
                                        transform: `translate(${el.align === 'center' ? '-50%' : el.align === 'right' ? '-100%' : '0'}, 0)`,
                                        fontSize: `${el.fontSize}px`, fontWeight: el.fontWeight, color: el.color || 'black', whiteSpace: 'nowrap'
                                    }}
                                >
                                    {el.type === 'text' && getElementContent(el)}
                                    {el.type === 'barcode' && <div style={{ fontFamily: '"Libre Barcode 39 Text", cursive', lineHeight: 0.8, paddingTop: '1px' }}>{`*${(barcodeSource === 'internal' ? (selectedDrug.internalCode || selectedDrug.id) : (selectedDrug.barcode || selectedDrug.id)).replace(/\s/g, '').toUpperCase()}*`}</div>}
                                    {el.type === 'qrcode' && qrCodeDataUrl && <img src={qrCodeDataUrl} style={{ width: `${(el.width || 10) * MM_TO_PX}px`, height: `${(el.height || 10) * MM_TO_PX}px` }} draggable={false} />}
                                    {el.type === 'image' && (el.id === 'logo' ? uploadedLogo : el.content) && <img src={el.id === 'logo' ? uploadedLogo : el.content} style={{ width: `${(el.width || 10) * MM_TO_PX}px`, height: `${(el.height || 10) * MM_TO_PX}px`, objectFit: 'contain' }} draggable={false} />}
                                </div>
                            ))}
                        </div>
                    )}
                 </div>
            </div>

            {/* RIGHT: Inspector */}
            <div className="w-full lg:w-80 bg-white dark:bg-slate-900 border-s border-slate-200 dark:border-slate-800 flex flex-col">
                <div className={`p-4 border-b border-slate-100 dark:border-slate-800 bg-${color}-50 dark:bg-${color}-900/10`}>
                    <h3 className={`font-bold text-sm uppercase text-${color}-700 dark:text-${color}-300`}>
                        {selectedElementId ? t.inspector.properties : t.inspector.noSelection}
                    </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {!selectedElementId ? (
                        <>
                             {/* Templates Section */}
                             <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t.templates}</label>
                                <select 
                                    className="w-full p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm mb-2"
                                    value={activeTemplateId || ''}
                                    onChange={(e) => loadTemplate(e.target.value)}
                                >
                                    <option value="">{t.createNew}</option>
                                    {templates.map(tmp => <option key={tmp.id} value={tmp.id}>{tmp.name}</option>)}
                                </select>
                                {activeTemplateId && (
                                     <button onClick={() => deleteTemplate(activeTemplateId)} className="text-xs text-red-500 hover:text-red-600 font-bold">{t.deleteTemplate}</button>
                                )}
                             </div>

                             <hr className="border-slate-100 dark:border-slate-800"/>

                             {/* Global Settings (Product, Size, etc.) */}
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t.selectProduct}</label>
                                <div className="relative">
                                    <input type="text" placeholder={t.searchPlaceholder} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm focus:outline-none focus:ring-2" style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any} />
                                    {searchTerm && !selectedDrug && (
                                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                                             {filteredDrugs.map(d => <div key={d.id} onClick={() => { setSelectedDrug(d); setSearchTerm(''); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-sm">{d.name}</div>)}
                                        </div>
                                    )}
                                </div>
                                {selectedDrug && (
                                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex justify-between items-center">
                                        <span className="text-sm font-bold text-blue-700 dark:text-blue-300">{selectedDrug.name}</span>
                                        <button onClick={() => setSelectedDrug(null)}><span className="material-symbols-rounded text-sm">close</span></button>
                                    </div>
                                )}
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t.labelSize}</label>
                                <select value={selectedPreset} onChange={handlePresetChange} className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm">
                                    {Object.entries(LABEL_PRESETS).map(([key, val]) => <option key={key} value={key}>{val.label}</option>)}
                                </select>
                            </div>

                            {/* Inputs for Store/Hotline */}
                            <div className="space-y-3">
                                <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t.elements.storeName}</label><input type="text" value={storeName} onChange={e => setStoreName(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm" /></div>
                                <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t.elements.hotline}</label><input type="text" value={hotline} onChange={e => setHotline(e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm" /></div>
                                <div><label className="text-[10px] uppercase font-bold text-slate-400 block mb-1">{t.elements.image}</label><input type="file" accept="image/*" onChange={handleLogoUpload} className="text-xs w-full text-slate-500"/></div>
                            </div>

                             {/* Border */}
                             <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t.borderStyle}</label>
                                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                                    {(['none', 'solid', 'dashed'] as const).map(style => <button key={style} onClick={() => setBorderStyle(style)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${borderStyle === style ? 'bg-white shadow-sm' : 'text-slate-500'}`}>{style}</button>)}
                                </div>
                            </div>
                        </>
                    ) : (
                         /* Element Properties */
                        selectedElement && (
                            <>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.x}</label><input type="number" step="0.5" value={selectedElement.x} onChange={(e) => handlePropertyChange('x', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.y}</label><input type="number" step="0.5" value={selectedElement.y} onChange={(e) => handlePropertyChange('y', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                </div>
                                {(selectedElement.type === 'text' || selectedElement.type === 'barcode') && (
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.fontSize}</label><input type="number" value={selectedElement.fontSize} onChange={(e) => handlePropertyChange('fontSize', parseInt(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                )}
                                {(selectedElement.type === 'text') && (
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t.inspector.fontWeight || 'Font Weight'}</label>
                                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                            <button onClick={() => handlePropertyChange('fontWeight', 'normal')} className={`flex-1 py-1 rounded text-xs transition-all ${!selectedElement.fontWeight || selectedElement.fontWeight === 'normal' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}>Normal</button>
                                            <button onClick={() => handlePropertyChange('fontWeight', 'bold')} className={`flex-1 py-1 rounded text-xs transition-all ${selectedElement.fontWeight === 'bold' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}>Bold</button>
                                        </div>
                                    </div>
                                )}
                                {selectedElement.type === 'text' && !selectedElement.field && (
                                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.content}</label><input type="text" value={selectedElement.content || ''} onChange={(e) => handlePropertyChange('content', e.target.value)} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                )}
                                {(selectedElement.type === 'qrcode' || selectedElement.type === 'image') && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.width}</label><input type="number" value={selectedElement.width} onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                        <div><label className="text-[10px] font-bold text-slate-400 uppercase">{t.inspector.height}</label><input type="number" value={selectedElement.height} onChange={(e) => handlePropertyChange('height', parseFloat(e.target.value))} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm"/></div>
                                    </div>
                                )}
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t.inspector.align}</label>
                                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                        {(['left', 'center', 'right'] as const).map(align => (
                                            <button key={align} onClick={() => handlePropertyChange('align', align)} className={`flex-1 py-1 rounded text-xs transition-all ${selectedElement.align === align ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}>
                                                <span className="material-symbols-rounded text-sm">{align === 'left' ? 'format_align_left' : align === 'center' ? 'format_align_center' : 'format_align_right'}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {selectedElement.type === 'barcode' && (
                                    <div>
                                         <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">{t.barcodeSource}</label>
                                         <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                                             <button onClick={() => setBarcodeSource('global')} className={`flex-1 py-1 rounded text-xs transition-all ${barcodeSource === 'global' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}>Global</button>
                                             <button onClick={() => setBarcodeSource('internal')} className={`flex-1 py-1 rounded text-xs transition-all ${barcodeSource === 'internal' ? 'bg-white shadow-sm font-bold' : 'text-slate-500'}`}>Internal</button>
                                         </div>
                                    </div>
                                )}
                                {selectedElement.type === 'qrcode' && (
                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl text-xs text-blue-700 dark:text-blue-300">
                                        QR Code content is automatically generated from the selected barcode source.
                                    </div>
                                )}
                                <button onClick={() => toggleVisibility(selectedElement.id)} className="w-full py-2 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100">{t.inspector.remove}</button>
                            </>
                        )
                    )}
                </div>
            </div>
        </div>

        {/* Save Modal */}
        {showSaveModal && (
             <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                 <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl shadow-2xl p-6">
                     <h3 className="font-bold text-lg mb-4">{t.saveAsNew}</h3>
                     <label className="text-xs font-bold text-slate-500 uppercase block mb-2">{t.templateName}</label>
                     <input 
                        autoFocus
                        type="text" 
                        value={newTemplateName} 
                        onChange={e => setNewTemplateName(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 mb-4"
                     />
                     <div className="flex gap-3">
                         <button onClick={() => setShowSaveModal(false)} className="flex-1 py-2 rounded-full font-bold text-slate-500 hover:bg-slate-100">{t.modal.cancel}</button>
                         <button onClick={saveNewTemplate} disabled={!newTemplateName.trim()} className={`flex-1 py-2 rounded-full font-bold text-white bg-${color}-600 hover:bg-${color}-700 disabled:opacity-50`}>{t.modal.save}</button>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};
