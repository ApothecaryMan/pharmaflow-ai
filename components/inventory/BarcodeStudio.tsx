import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ScreenCalibration } from '../common/ScreenCalibration';
import { BarcodePreview } from './BarcodePreview';
import { useContextMenu } from '../common/ContextMenu';
import { storage } from '../../utils/storage';
import { StorageKeys } from '../../config/storageKeys';
import { Drug } from '../../types';
import * as QRCode from 'qrcode';
import { useSmartDirection } from '../common/SmartInputs';

import { encodeCode128 } from '../../utils/barcodeEncoders';
import { CARD_BASE } from '../../utils/themeStyles';
import { Modal } from '../common/Modal';
import { TRANSLATIONS } from '../../i18n/translations';

import { generateLabelHTML, getLabelElementContent, generateTemplateCSS, getReceiptSettings, DEFAULT_LABEL_DESIGN, LABEL_PRESETS, generatePageHTML } from './LabelPrinter';
import { PropertyInspector } from './studio/PropertyInspector';
import { useDebounce } from '../../hooks/useDebounce';
import { FilterDropdown } from '../common/FilterDropdown';
import { useStatusBar } from '../layout/StatusBar';





interface BarcodeStudioProps {
  inventory: Drug[];
  color: string;
  t: typeof TRANSLATIONS.EN.barcodeStudio;
}



// Default: 1mm approx 3.78px at 96 DPI
const DEFAULT_MM_TO_PX = 3.78;

import { LabelElement, SavedTemplate, LabelDesign } from './studio/types';

export const BarcodeStudio: React.FC<BarcodeStudioProps> = ({ inventory, color, t }) => {
  const { getVerifiedDate } = useStatusBar();
  const { showMenu } = useContextMenu();
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
  const [alignmentGuides, setAlignmentGuides] = useState<{x?: number; y?: number}[]>([]);

  // Screen Calibration
  const [mmToPx, setMmToPx] = useState(DEFAULT_MM_TO_PX);
  const [showCalibrationModal, setShowCalibrationModal] = useState(false);

  // Unsaved Changes Tracking
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedState = useRef<string>('');
  const justLoaded = useRef(false);

  // Template Dropdown
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  useEffect(() => {
      const savedRatio = storage.get<string | null>(StorageKeys.SCREEN_CALIBRATION_RATIO, null);
      if (savedRatio) {
          setMmToPx(parseFloat(savedRatio));
      }
  }, []);

  // Global Settings
  const [selectedPreset, setSelectedPreset] = useState<string>('38x25');
  const [customDims, setCustomDims] = useState<{ w: number, h: number }>({ w: 38, h: 25 });
  const [zoom, setZoom] = useState(5);

  const [printMode, setPrintMode] = useState<'single' | 'sheet'>('single');
  const [barcodeSource, setBarcodeSource] = useState<'global' | 'internal'>('global');
  // Constants
  const [showPairedPreview, setShowPairedPreview] = useState(false);
  const [showPrintBorders, setShowPrintBorders] = useState(true);
  const [printOffsetX, setPrintOffsetX] = useState(0); 
  const [printOffsetY, setPrintOffsetY] = useState(0);
  const [labelGap, setLabelGap] = useState<0 | 0.5 | 1>(0);
  const [currency, setCurrency] = useState<'L.E' | 'USD'>('L.E');

  const [editingTemplateName, setEditingTemplateName] = useState(false);
  const [tempTemplateName, setTempTemplateName] = useState('');
  const [showHitboxCalibration, setShowHitboxCalibration] = useState(false);
  
  // Data State - Dynamically synced from ReceiptDesigner storage
  const [receiptSettings, setLocalReceiptSettings] = useState(getReceiptSettings);
  const [isLoaded, setIsLoaded] = useState(false);

  // --- Receipt Settings Polling (Optimized) ---
  useEffect(() => {
     // Initial load
     setLocalReceiptSettings(getReceiptSettings());

     // Check every 3 seconds for changes
     const interval = setInterval(() => {
         const newSettings = getReceiptSettings();
         setLocalReceiptSettings(current => {
             // Only update if changed to avoid re-renders
             if (current.storeName !== newSettings.storeName || current.hotline !== newSettings.hotline) {
                 return newSettings;
             }
             return current;
         });
     }, 3000);
     
     return () => clearInterval(interval);
  }, []);

  const storeName = receiptSettings.storeName;
  const hotline = receiptSettings.hotline;
  // For content input (dynamic selected element)
  const selectedContentDir = useSmartDirection(selectedElementId && elements.find(e => e.id === selectedElementId)?.content || '', 'Content');

  const [uploadedLogo, setUploadedLogo] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('');
  
  // Template System
  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [defaultTemplateId, setDefaultTemplateId] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  // --- Improvements: Debounced State for Autosave ---
  // Debounce critical state saved to local storage
  const debouncedElements = useDebounce(elements, 500);
  const debouncedSelectedPreset = useDebounce(selectedPreset, 500);
  const debouncedCustomDims = useDebounce(customDims, 500);
  const debouncedBarcodeSource = useDebounce(barcodeSource, 500);
  const debouncedShowPrintBorders = useDebounce(showPrintBorders, 500);
  const debouncedPrintOffsets = useDebounce({ x: printOffsetX, y: printOffsetY }, 500);
  const debouncedUploadedLogo = useDebounce(uploadedLogo, 500);
  
  // --- Autosave Effect (Performance Optimized) ---
  useEffect(() => {
    if (!isLoaded) return; // Guard: Don't save before initial load

    const designState = {
        elements: debouncedElements,
        selectedPreset: debouncedSelectedPreset,
        customDims: debouncedCustomDims,
        uploadedLogo: debouncedUploadedLogo,
        barcodeSource: debouncedBarcodeSource,
        activeTemplateId: activeTemplateId ? activeTemplateId : null,
        showPrintBorders: debouncedShowPrintBorders,
        printOffsetX: debouncedPrintOffsets.x,
        printOffsetY: debouncedPrintOffsets.y
    };
    storage.set(StorageKeys.LABEL_DESIGN, designState);
  }, [
    debouncedElements, 
    debouncedSelectedPreset, 
    debouncedCustomDims, 
    debouncedUploadedLogo, 
    debouncedBarcodeSource, 
    activeTemplateId, 
    debouncedShowPrintBorders, 
    debouncedPrintOffsets,
    isLoaded
  ]);

  // Dragging Refs
  const canvasRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const initialElemPos = useRef({ x: 0, y: 0 });
  const dragStartSnapshot = useRef<LabelElement[]>([]);

  const dims = selectedPreset === 'custom' ? customDims : (LABEL_PRESETS[selectedPreset] || LABEL_PRESETS['38x25']);

  // Load Templates & Last State
  useEffect(() => {
    // Load Templates
    const loadedTemplates = storage.get<SavedTemplate[]>(StorageKeys.LABEL_TEMPLATES, []);
    setTemplates(loadedTemplates);

    // Load Default Template ID
    const savedDefaultId = storage.get<string | null>(StorageKeys.LABEL_DEFAULT_TEMPLATE, null);
    if (savedDefaultId) {
        setDefaultTemplateId(savedDefaultId);
    }

    // Load Last Session (Autosave) or Default Template
    const savedDesign = storage.get<any | null>(StorageKeys.LABEL_DESIGN, null);
    
    if (savedDesign) {
        try {
             // savedDesign is already parsed by storage.get
            if (savedDesign.elements && savedDesign.elements.length > 0) {
                applyDesignState(savedDesign);
            } else if (savedDefaultId && loadedTemplates.length > 0) {
                const defaultTemplate = loadedTemplates.find(t => t.id === savedDefaultId);
                if (defaultTemplate) {
                    applyDesignState(defaultTemplate.design);
                    setActiveTemplateId(savedDefaultId);
                } else {
                    initializeLayout('38x25');
                }
            } else {
                initializeLayout('38x25');
            }
        } catch (e) {
            console.error("Failed to load design", e);
            initializeLayout('38x25');
        }
    } else if (savedDefaultId && loadedTemplates.length > 0) {
        const defaultTemplate = loadedTemplates.find(t => t.id === savedDefaultId);
        if (defaultTemplate) {
            applyDesignState(defaultTemplate.design);
            setActiveTemplateId(savedDefaultId);
        } else {
            initializeLayout('38x25');
        }
    } else {
        initializeLayout('38x25');
    }
    
    setIsLoaded(true); // Enable autosave
  }, []);

  // Auto-select first drug if none selected
  useEffect(() => {
    if (!selectedDrug && inventory.length > 0) {
        setSelectedDrug(inventory[0]);
    }
  }, [inventory, selectedDrug]);

  // Autosave current workspace


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
      selectedPreset, customDims, elements, storeName, hotline, uploadedLogo, barcodeSource, activeTemplateId, showPrintBorders, printOffsetX, printOffsetY, labelGap, currency
  });

  const applyDesignState = (state: any) => {
      if (state.selectedPreset) setSelectedPreset(state.selectedPreset);
      if (state.customDims) setCustomDims(state.customDims);
      if (state.elements) {
          // Merge missing elements from DEFAULT_LABEL_DESIGN
          const existingIds = new Set(state.elements.map((el: any) => el.id));
          const missingElements = DEFAULT_LABEL_DESIGN.elements.filter(el => !existingIds.has(el.id));
          setElements([...state.elements, ...missingElements]);
      }

      // storeName and hotline are now read from ReceiptDesigner storage
      if (state.uploadedLogo) setUploadedLogo(state.uploadedLogo);
      if (state.barcodeSource) setBarcodeSource(state.barcodeSource);
      if (state.activeTemplateId) setActiveTemplateId(state.activeTemplateId);
      if (typeof state.showPrintBorders !== 'undefined') setShowPrintBorders(state.showPrintBorders);
      if (typeof state.printOffsetX !== 'undefined') setPrintOffsetX(state.printOffsetX);
      if (typeof state.printOffsetY !== 'undefined') setPrintOffsetY(state.printOffsetY);
      if (typeof state.labelGap !== 'undefined') setLabelGap(state.labelGap);
      if (state.currency) setCurrency(state.currency);
  };

  // Track unsaved changes
  useEffect(() => {
    const currentState = JSON.stringify(getDesignState());
    if (justLoaded.current) {
        lastSavedState.current = currentState;
        justLoaded.current = false;
    }
    setHasUnsavedChanges(currentState !== lastSavedState.current);
  }, [
    selectedPreset, customDims, elements, storeName, hotline, 
    uploadedLogo, barcodeSource, activeTemplateId, showPrintBorders, 
    printOffsetX, printOffsetY, labelGap, currency
  ]);

  const initializeLayout = (presetKey: string) => {
      const { w, h } = presetKey === 'custom' ? customDims : (LABEL_PRESETS[presetKey] || LABEL_PRESETS['38x25']);
      
      const newElements = [...DEFAULT_LABEL_DESIGN.elements];
      setElements(newElements);
      setHistory([]);
      setRedoStack([]);
      setHistory([]);
      setRedoStack([]);
      setActiveTemplateId(null); // Reset active template on fresh layout
      justLoaded.current = true;
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
      const newId = getVerifiedDate().getTime().toString();
      const design = getDesignState();
      design.activeTemplateId = newId;

      const newTemplate: SavedTemplate = {
          id: newId,
          name: newTemplateName,
          design: design
      };

      const updatedTemplates = [...templates, newTemplate];
      setTemplates(updatedTemplates);
      storage.set(StorageKeys.LABEL_TEMPLATES, updatedTemplates);
      
      
      setActiveTemplateId(newId);
      justLoaded.current = true;
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
      storage.set(StorageKeys.LABEL_TEMPLATES, updatedTemplates);
      justLoaded.current = true;
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
          justLoaded.current = true;
      }
  };

  const deleteTemplate = (id: string) => {
      const updated = templates.filter(t => t.id !== id);
      setTemplates(updated);
      storage.set(StorageKeys.LABEL_TEMPLATES, updated);
      if (activeTemplateId === id) {
          initializeLayout(selectedPreset);
      }
  };


  const addElement = (type: 'text' | 'image' | 'qrcode') => {
      // Toggle logic: If a custom/temporary element of this type already exists, remove it
      const existingCustom = elements.find(el => el.type === type && el.id.startsWith('custom-'));
      
      if (existingCustom) {
          saveToHistory();
          setElements(prev => prev.filter(el => el.id !== existingCustom.id));
          if (selectedElementId === existingCustom.id) setSelectedElementId(null);
          return;
      }

      const id = `custom-${getVerifiedDate().getTime()}`;
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
              const id = `img-${getVerifiedDate().getTime()}`;
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
      
      const dxMm = dxPx / (mmToPx * zoom);
      const dyMm = dyPx / (mmToPx * zoom);

      let newX = Number((initialElemPos.current.x + dxMm).toFixed(1));
      let newY = Number((initialElemPos.current.y + dyMm).toFixed(1));

      // Snap to center logic
      const centerX = dims.w / 2;
      const centerY = dims.h / 2;
      const snapThreshold = 0.5; 

      if (Math.abs(newX - centerX) < snapThreshold) { newX = centerX; setShowVGuide(true); } else { setShowVGuide(false); }
      if (Math.abs(newY - centerY) < snapThreshold) { newY = centerY; setShowHGuide(true); } else { setShowHGuide(false); }

      // Element-to-element alignment detection
      const otherElements = elements.filter(el => el.id !== selectedElementId && el.isVisible);
      const guides: {x?: number; y?: number}[] = [];
      
      for (const other of otherElements) {
          // Horizontal alignment (same Y)
          if (Math.abs(newY - other.y) < snapThreshold) {
              newY = other.y;
              guides.push({ y: other.y });
          }
          // Vertical alignment (same X)
          if (Math.abs(newX - other.x) < snapThreshold) {
              newX = other.x;
              guides.push({ x: other.x });
          }
      }
      setAlignmentGuides(guides);

      setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, x: newX, y: newY } : el));
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (elements.find(el => el.id === id)?.locked) return;
      setSelectedElementId(id);
      dragStartSnapshot.current = elements;
      isDragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      const elem = elements.find(el => el.id === id);
      if (elem) initialElemPos.current = { x: elem.x, y: elem.y };
  };

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
      if (elements.find(el => el.id === id)?.locked) return;
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
          setAlignmentGuides([]);
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
                  const x = (e.clientX - rect.left) / (mmToPx * zoom);
                  const y = (e.clientY - rect.top) / (mmToPx * zoom);
                  
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

  const getElementContent = (el: LabelElement) => {
      if (!selectedDrug) return el.content || el.label;
      return getLabelElementContent(el, selectedDrug, { storeName, hotline });
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

  // Helper: Get context menu actions for a label element
  const getElementActions = (el: LabelElement) => [
    { label: t.inspector.remove, icon: 'delete', action: () => setElements(prev => prev.filter(item => item.id !== el.id)), danger: true },
    { separator: true },
    { label: t.inspector.duplicate, icon: 'content_copy', action: () => {
      saveToHistory();
      const newEl = { ...el, id: getVerifiedDate().getTime().toString(), x: el.x + 2, y: el.y + 2 };
      setElements(prev => [...prev, newEl]);
    }},
    { label: el.locked ? t.inspector.unlock : t.inspector.lock, icon: el.locked ? 'lock_open' : 'lock', action: () => {
      saveToHistory();
      setElements(prev => prev.map(item => item.id === el.id ? { ...item, locked: !item.locked } : item));
    }},
    { label: t.inspector.rotate90, icon: 'rotate_right', action: () => {
      saveToHistory();
      setElements(prev => prev.map(item => item.id === el.id ? { ...item, rotation: item.rotation === 90 ? 0 : 90 } : item));
    }},
    { separator: true },
    { label: t.inspector.bringToFront, icon: 'flip_to_front', action: () => {
      saveToHistory();
      setElements(prev => [...prev.filter(item => item.id !== el.id), el]);
    }},
    { label: t.inspector.sendToBack, icon: 'flip_to_back', action: () => {
      saveToHistory();
      setElements(prev => [el, ...prev.filter(item => item.id !== el.id)]);
    }}
  ];

  // Shared HTML generator - used by BOTH print and preview to ensure 100% match
  const generatePrintHTML = (forPrint: boolean = false, isSingleLabel: boolean = false) => {
      if (!selectedDrug) return '';
      const design: LabelDesign = { elements, selectedPreset, customDims, barcodeSource, showPrintBorders, printOffsetX, printOffsetY, labelGap };
      const receiptSettings = { storeName, hotline };

      const isDouble = selectedPreset === '38x25';
      const labelHeight = isDouble ? 12 : dims.h;
      const innerGap = isDouble ? 1 : 0;
      const outerGap = labelGap || 3;
      const pageHeight = isDouble ? (labelHeight * 2) + innerGap + outerGap : labelHeight + outerGap;
      const renderDims = { w: dims.w, h: labelHeight };

      const { css: templateCSS, classNameMap } = generateTemplateCSS(design);
      const singleLabelHTML = generateLabelHTML(selectedDrug, design, renderDims, receiptSettings, undefined, qrCodeDataUrl, uploadedLogo, classNameMap);

      const labelsCount = (!isSingleLabel && isDouble) ? 2 : 1;
      let finalHTML = labelsCount === 2 ? `<div class="pair-container">${singleLabelHTML}<div style="height: ${innerGap}mm;"></div>${singleLabelHTML}</div>` : singleLabelHTML;

      let html = generatePageHTML(finalHTML, templateCSS, dims, pageHeight, { x: printOffsetX, y: printOffsetY });
      if (forPrint) html = html.replace('</body>', '<script>document.fonts.ready.then(() => window.print());</script></body>');
      return html;
  };

  const payloadSize = useMemo(() => {
      if (!selectedDrug || !isLoaded) return '0 B';
      try {
          const html = generatePrintHTML(false, false);
          const bytes = (new TextEncoder().encode(html)).length;
          if (bytes < 1024) return `${bytes} B`;
          return `${(bytes / 1024).toFixed(1)} KB`;
      } catch (e) {
          return '0 B';
      }
  }, [elements, selectedDrug, isLoaded, selectedPreset, customDims, barcodeSource, showPrintBorders, printOffsetX, printOffsetY, labelGap, qrCodeDataUrl, uploadedLogo, storeName, hotline]);

  const handlePrint = () => {
      if (!selectedDrug) return;
      const printWindow = window.open('', '', 'width=800,height=1000');
      if (!printWindow) return;
      printWindow.document.write(generatePrintHTML(true, false));
      printWindow.document.close();
  };

  return (
    <div className="h-full flex flex-col space-y-4 animate-fade-in pb-10" 
         onMouseMove={handleMouseMove} onMouseUp={handleEnd} onTouchMove={handleTouchMove} onTouchEnd={handleEnd}>
        
        {/* Unified Control Bar */}
        <div className={`${CARD_BASE} p-2 px-4 rounded-2xl flex flex-wrap lg:flex-nowrap items-center justify-between gap-4 sticky top-0 z-[30] backdrop-blur-md bg-white/90 dark:bg-gray-900/90 border border-gray-100 dark:border-gray-800/50 shadow-lg shadow-gray-200/20 dark:shadow-black/20`}>
            {/* Left Side: Branding & Templates */}
            <div className="flex items-center gap-3">
                <div className="hidden xl:flex flex-col border-e border-gray-200 dark:border-gray-800 pe-4 leading-tight">
                    <h2 className="text-[14px] font-black text-gray-800 dark:text-gray-100 tracking-tight">{t.title}</h2>
                </div>

                <div className="flex items-center gap-1.5">
                    {/* Compact Template Selector */}
                    <div className="relative w-36 h-8">
                        <FilterDropdown
                            items={[{ id: '', name: t.createNew, design: null } as any, ...templates]}
                            selectedItem={activeTemplateId ? templates.find(tmp => tmp.id === activeTemplateId) : { id: '', name: t.createNew, design: null } as any}
                            isOpen={isTemplateDropdownOpen}
                            onToggle={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
                            onSelect={(item) => {
                                setIsTemplateDropdownOpen(false);
                                loadTemplate(item.id);
                            }}
                            keyExtractor={(item) => item.id}
                            renderSelected={(item) => (
                                <div className="flex items-center gap-1 px-1">
                                    <span className={`material-symbols-rounded text-sm ${!item?.id ? 'text-blue-500' : (item.id === defaultTemplateId ? 'text-green-500' : 'text-gray-400')}`}>
                                        {!item?.id ? 'add_circle' : (item.id === defaultTemplateId ? 'check_circle' : 'article')}
                                    </span>
                                    <span className="text-[10px] font-bold text-gray-700 dark:text-gray-200 truncate">
                                        {item?.name || t.createNew}
                                    </span>
                                </div>
                            )}
                            renderItem={(item, isSelected) => (
                                <div className="flex items-center gap-2">
                                    <span className={`material-symbols-rounded text-lg ${!item.id ? 'text-blue-500' : (item.id === defaultTemplateId ? 'text-green-500' : 'text-gray-400')}`}>
                                        {!item.id ? 'add_circle' : (item.id === defaultTemplateId ? 'check_circle' : 'article')}
                                    </span>
                                    <span className={`text-xs ${!item.id ? 'text-blue-600 font-bold' : 'text-gray-700 dark:text-gray-300'}`}>
                                        {item.name}
                                    </span>
                                </div>
                            )}
                            variant="input"
                            className="absolute top-0 left-0 w-full"
                            color={color}
                            rounded="xl"
                            minHeight={32}
                        />
                    </div>

                    {/* Ultra-Compact Quick Tools */}
                    <div className="flex items-center bg-gray-50/50 dark:bg-gray-800/30 p-0.5 rounded-lg border border-gray-100 dark:border-gray-800/50">
                        <button 
                            onClick={handleUndo} 
                            disabled={history.length === 0} 
                            className={`w-6 h-6 flex items-center justify-center rounded-md text-gray-400 transition-all ${history.length !== 0 ? 'hover:bg-white dark:hover:bg-gray-800 hover:text-blue-500' : 'opacity-20 cursor-default'}`} 
                            title={t.undo}
                        >
                            <span className="material-symbols-rounded text-sm">undo</span>
                        </button>
                        <button 
                            onClick={handleRedo} 
                            disabled={redoStack.length === 0} 
                            className={`w-6 h-6 flex items-center justify-center rounded-md text-gray-400 transition-all ${redoStack.length !== 0 ? 'hover:bg-white dark:hover:bg-gray-800 hover:text-blue-500' : 'opacity-20 cursor-default'}`} 
                            title={t.redo}
                        >
                            <span className="material-symbols-rounded text-sm">redo</span>
                        </button>
                        <button 
                            onClick={handleSaveClick} 
                            disabled={!hasUnsavedChanges}
                            className={`w-6 h-6 flex items-center justify-center rounded-md text-gray-400 transition-all ${hasUnsavedChanges ? 'hover:bg-white dark:hover:bg-gray-800 hover:text-green-500' : 'opacity-20 cursor-default'}`} 
                            title={t.saveTemplate}
                        >
                            <span className="material-symbols-rounded text-sm">{hasUnsavedChanges ? 'save' : 'check'}</span>
                        </button>
                        <button onClick={() => initializeLayout(selectedPreset)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-all" title={t.toolbar.resetLayout}>
                            <span className="material-symbols-rounded text-sm">restart_alt</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Center: Element Toggles (Compacted) */}
            <div className="flex-1 flex justify-center min-w-0">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-100/50 dark:bg-gray-950/30 rounded-2xl border border-gray-200/50 dark:border-gray-800/50 overflow-x-auto scrollbar-hide">
                    {elements.map(el => (
                        <button 
                            key={el.id} 
                            onClick={() => toggleVisibility(el.id)} 
                            className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all border ${
                                el.isVisible 
                                    ? `bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 border-${color}-200/50 dark:border-${color}-800/50` 
                                    : 'bg-transparent text-gray-400 border-transparent opacity-60'
                            }`}
                        >
                            {el.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Right Side: Actions (Add, Zoom, Print) */}
            <div className="flex items-center gap-2">
                {/* Ultra-Compact Element Inserts */}
                <div className="flex items-center bg-gray-50/50 dark:bg-gray-800/30 p-0.5 rounded-lg border border-gray-100 dark:border-gray-800/50">
                    <button 
                        onClick={() => addElement('text')} 
                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${
                            elements.some(el => el.type === 'text' && el.id.startsWith('custom-'))
                                ? `bg-${color}-500 text-white shadow-sm`
                                : 'hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500'
                        }`} 
                        title={t.toolbar.addText}
                    >
                        <span className="material-symbols-rounded text-[18px] leading-none">title</span>
                    </button>
                    <button 
                        onClick={() => {
                            const existingImg = elements.find(el => el.type === 'image' && el.id.startsWith('img-'));
                            if (existingImg) {
                                saveToHistory();
                                setElements(prev => prev.filter(el => el.id !== existingImg.id));
                                if (selectedElementId === existingImg.id) setSelectedElementId(null);
                            } else {
                                document.getElementById('img-upload-hidden')?.click();
                            }
                        }} 
                        className={`w-6 h-6 flex items-center justify-center rounded-md transition-all ${
                            elements.some(el => el.type === 'image' && el.id.startsWith('img-'))
                                ? `bg-${color}-500 text-white shadow-sm`
                                : 'hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500'
                        }`} 
                        title={t.toolbar.addImage}
                    >
                        <span className="material-symbols-rounded text-[18px] leading-none">image</span>
                    </button>
                    <input type="file" id="img-upload-hidden" className="hidden" accept="image/*" onChange={handleAddImageElement} />
                    <button onClick={() => setShowCalibrationModal(true)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-all" title="Calibrate Orientation">
                        <span className="material-symbols-rounded text-[18px] leading-none">aspect_ratio</span>
                    </button>
                </div>

                {/* Payload Size Badge */}
                {isLoaded && selectedDrug && (
                    <div className="hidden sm:flex items-center px-2 h-7 bg-gray-50/50 dark:bg-gray-800/30 rounded-lg border border-gray-100 dark:border-gray-800/50 text-[10px] font-bold text-gray-500 gap-1.5" title="Estimated Printing Payload Size">
                        <span className="material-symbols-rounded text-sm text-gray-400">database</span>
                        <span>{payloadSize}</span>
                    </div>
                )}

                {/* Ultra-Compact Zoom Controls */}
                <div className="flex items-center bg-gray-50/50 dark:bg-gray-800/30 p-0.5 rounded-lg border border-gray-100 dark:border-gray-800/50">
                    <button onClick={() => setZoom(Math.max(1, zoom - 0.5))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-all">
                        <span className="material-symbols-rounded text-sm">remove</span>
                    </button>
                    <div className="w-5 h-6 flex items-center justify-center text-gray-300 dark:text-gray-600">
                        <span className="material-symbols-rounded text-[14px]">zoom_in</span>
                    </div>
                    <button onClick={() => setZoom(Math.min(8, zoom + 0.5))} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white dark:hover:bg-gray-800 text-gray-400 hover:text-blue-500 transition-all">
                        <span className="material-symbols-rounded text-sm">add</span>
                    </button>
                </div>

                {/* Print Action */}
                <button 
                    onClick={handlePrint} 
                    disabled={!selectedDrug} 
                    className={`h-9 w-9 flex items-center justify-center rounded-xl bg-${color}-600 text-white font-black hover:opacity-90 shadow-lg shadow-${color}-600/20 disabled:grayscale disabled:opacity-50 transition-all ml-1`}
                    title={t.print}
                >
                    <span className="material-symbols-rounded text-lg">print</span>
                </button>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
            {/* LEFT: Canvas */}
            <div className="flex-1 flex flex-col gap-4">
                 {/* Canvas Toolbar Removed (Moved to Unified Bar) */}

                 {/* Canvas */}
                 <div 
                    className={`flex-1 bg-gray-100 dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 relative flex items-center justify-center bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] overflow-hidden`}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                 >
                    {!selectedDrug ? (
                        <div className="text-center text-gray-400 dark:text-gray-500"><span className="material-symbols-rounded text-6xl opacity-20 mb-2">touch_app</span><p>{t.noProductSelected}</p></div>
                    ) : (
                        <BarcodePreview
                            elements={elements}
                            selectedElementId={selectedElementId}
                            zoom={zoom}
                            dims={dims}
                            showPairedPreview={showPairedPreview}
                            drug={selectedDrug!} // Safe assertion as check is above
                            receiptSettings={receiptSettings}
                            barcodeSource={barcodeSource}
                            showPrintBorders={showPrintBorders}
                            uploadedLogo={uploadedLogo}
                            qrCodeDataUrl={qrCodeDataUrl}
                            printOffsetX={printOffsetX}
                            printOffsetY={printOffsetY}
                            showVCenterGuide={showVGuide}
                            showHCenterGuide={showHGuide}
                            alignmentGuides={alignmentGuides}
                            onSelect={setSelectedElementId}
                            onDragStart={(e, id) => {
                                handleMouseDown(e as React.MouseEvent, id);
                            }}
                        />
                    )}
                 </div>
            </div>

            {/* RIGHT: Inspector */}
            <PropertyInspector
                color={color}
                t={t}
                selectedElementId={selectedElementId}
                selectedElement={selectedElement}
                inventory={inventory}
                selectedDrug={selectedDrug}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                onSelectDrug={(d) => { setSelectedDrug(d); setSearchTerm(''); }}
                filteredDrugs={filteredDrugs}
                
                showPairedPreview={showPairedPreview}
                setShowPairedPreview={setShowPairedPreview}
                showPrintBorders={showPrintBorders}
                setShowPrintBorders={setShowPrintBorders}
                
                printOffsetX={printOffsetX}
                setPrintOffsetX={setPrintOffsetX}
                printOffsetY={printOffsetY}
                setPrintOffsetY={setPrintOffsetY}
                labelGap={labelGap as any}
                setLabelGap={setLabelGap}
                currency={currency}
                setCurrency={setCurrency}
                
                handlePropertyChange={handlePropertyChange}
                toggleVisibility={toggleVisibility}
                barcodeSource={barcodeSource}
                setBarcodeSource={setBarcodeSource}
                
                selectedContentDir={selectedContentDir}
                showHitboxCalibration={showHitboxCalibration}
                setShowHitboxCalibration={setShowHitboxCalibration}
            />
        </div>

        {/* Save Modal */}
        <Modal
            isOpen={showSaveModal}
            onClose={() => setShowSaveModal(false)}
            size="sm"
            zIndex={50}
        >
            <div className="p-6 space-y-4">
                <h3 className="text-lg font-bold text-center text-gray-900 dark:text-gray-100 flex items-center justify-center gap-2">
                    <span className="material-symbols-rounded">bookmark_add</span>
                    {t.saveAsNew}
                </h3>
                
                <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t.templateName}</label>
                    <input 
                        autoFocus
                        type="text" 
                        value={newTemplateName} 
                        onChange={e => setNewTemplateName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && newTemplateName.trim()) saveNewTemplate(); }}
                        placeholder={t.templatePlaceholder}
                        className="w-full px-3 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                </div>
                
                <div className="flex gap-3 pt-2">
                    <button 
                        type="button"
                        onClick={() => setShowSaveModal(false)} 
                        className="flex-1 py-3 rounded-xl font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800 transition-colors"
                    >
                        {t.modal.cancel}
                    </button>
                    <button 
                        type="button"
                        onClick={saveNewTemplate} 
                        disabled={!newTemplateName.trim()} 
                        className={`flex-1 py-3 rounded-xl font-medium text-white bg-${color}-600 hover:bg-${color}-700 shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                    >
                        <span className="material-symbols-rounded text-lg">save</span>
                        {t.modal.save}
                    </button>
                </div>
            </div>
        </Modal>
        
        {/* Calibration Modal */}
        <ScreenCalibration 
            isOpen={showCalibrationModal} 
            onClose={() => setShowCalibrationModal(false)}
            onSave={(ratio) => {
                setMmToPx(ratio);
                localStorage.setItem('pharma_screen_calibration_ratio', ratio.toString());
            }}
            initialValue={mmToPx}
            t={t}
        />
    </div>
  );
};
