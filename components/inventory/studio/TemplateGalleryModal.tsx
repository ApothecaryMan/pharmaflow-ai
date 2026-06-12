import type React from 'react';
import { useMemo } from 'react';
import { Modal } from '../../common/Modal';
import { generateLabelHTML, generatePageHTML, generateTemplateCSS, LABEL_PRESETS } from '../LabelPrinter';
import type { SavedTemplate, LabelDesign } from './types';
import type { Drug } from '../../../types';

interface TemplateGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: SavedTemplate[];
  onSelectTemplate: (id: string) => void;
  onDeleteTemplate: (id: string) => void;
  selectedDrug: Drug | null;
  receiptSettings: { storeName: string; hotline: string };
  t: any;
  color: string;
}

export const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
  onDeleteTemplate,
  selectedDrug,
  receiptSettings,
  t,
  color,
}) => {
  const generatePreview = (template: SavedTemplate) => {
    if (!selectedDrug || !template.design) return '';
    try {
      const design = template.design as LabelDesign;
      const dims = design.selectedPreset === 'custom'
        ? design.customDims || { w: 38, h: 25 }
        : LABEL_PRESETS[design.selectedPreset] || { w: 38, h: 25 };

      const isDouble = design.selectedPreset === '38x25';
      const labelHeight = isDouble ? 12 : dims.h;
      const renderDims = { w: dims.w, h: labelHeight };

      const { css: templateCSS, classNameMap } = generateTemplateCSS(design);

      const labelHTML = generateLabelHTML(
        selectedDrug,
        design,
        renderDims,
        receiptSettings,
        undefined,
        undefined,
        design.uploadedLogo,
        classNameMap
      );

      return generatePageHTML(labelHTML, templateCSS, renderDims, labelHeight);
    } catch (e) {
      console.error('Failed to generate preview', e);
      return '';
    }
  };

  const myTemplates = templates.filter(t => t.id !== 'default' && t.author !== 'ZINC Designer');
  const storeTemplates = templates.filter(t => t.id === 'default' || t.author === 'ZINC Designer');

  const renderTemplateCard = (template: SavedTemplate) => {
    const html = generatePreview(template);
    
    const design = template.design as LabelDesign;
    const dims = design?.selectedPreset === 'custom'
      ? design.customDims || { w: 38, h: 25 }
      : LABEL_PRESETS[design?.selectedPreset || '38x25'] || { w: 38, h: 25 };

    const isDouble = design?.selectedPreset === '38x25';
    const labelHeight = isDouble ? 12 : dims.h;

    return (
      <div 
        key={template.id}
        className="group bg-white dark:bg-card border border-gray-200 dark:border-border/60 rounded-2xl overflow-hidden hover:border-primary-200 dark:hover:border-primary-500/30 transition-all duration-300 flex flex-col"
      >
        {/* Preview Area */}
        <div 
          className="h-44 bg-gray-100 dark:bg-black/20 flex items-center justify-center p-4 relative overflow-hidden bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] bg-size-[10px_10px] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] cursor-pointer"
          onClick={() => {
            onSelectTemplate(template.id);
            onClose();
          }}
        >
          {html ? (
             <div 
               className="flex flex-col bg-white border border-gray-200 dark:border-gray-700 transition-transform duration-500 group-hover:scale-110 items-center overflow-hidden rounded-sm shadow-sm"
               style={{ 
                 transform: `scale(1.4)`,
                 transformOrigin: 'center',
                 width: `${dims.w}mm`,
                 height: `${isDouble ? 24 : labelHeight}mm`
               }}
             >
               <div
                 className={`w-full overflow-hidden ${isDouble ? 'border-b border-dashed border-gray-200 dark:border-gray-700' : ''}`}
                 style={{ 
                   height: `${labelHeight}mm`,
                 }}
               >
                 <iframe
                   srcDoc={html}
                   scrolling="no"
                   className="w-full h-full border-none pointer-events-none"
                   title={template.name}
                 />
               </div>

               {isDouble && (
                 <div
                   className="w-full overflow-hidden"
                   style={{ 
                     height: `${labelHeight}mm`,
                   }}
                 >
                   <iframe
                     srcDoc={html}
                     scrolling="no"
                     className="w-full h-full border-none pointer-events-none"
                     title={`${template.name} (bottom)`}
                   />
                 </div>
               )}
             </div>
          ) : (
            <span className="material-symbols-rounded text-4xl text-gray-300">broken_image</span>
          )}

          {/* Overlay Action */}
          <div className="absolute inset-0 bg-primary-600/0 group-hover:bg-primary-600/10 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px]">
            <span className="px-5 py-2.5 bg-primary-600 text-white rounded-xl font-bold shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-2">
              <span className="material-symbols-rounded text-sm">check_circle</span>
              {t.gallery?.apply}
            </span>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-4 flex-1 flex flex-col gap-3 relative bg-white dark:bg-card border-t border-gray-100 dark:border-border/50">
          <div className="flex justify-between items-start gap-2">
            <h3 className="font-bold text-gray-900 dark:text-gray-100 text-sm leading-tight group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {template.name || t.createNew || 'قالب جديد'}
            </h3>
            {template.id && template.id !== 'default' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTemplate(template.id);
                }}
                className="w-8 h-8 shrink-0 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                title={t.delete}
              >
                <span className="material-symbols-rounded text-[18px]">delete</span>
              </button>
            )}
          </div>

          <div className="mt-auto flex items-center justify-between text-xs text-gray-500 dark:text-muted-foreground">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="badge-indigo gap-1.5 px-2 py-1">
                <span className="material-symbols-rounded text-[14px]">brush</span>
                <span className="uppercase tracking-wider">{template.author || 'ZINC Designer'}</span>
              </div>
              <div className="badge-neutral gap-1.5 px-2 py-1 font-mono" dir="ltr">
                {dims.w} × {dims.h} mm
              </div>
              {isDouble && (
                <div className="badge-purple px-2 py-1 font-bold">
                  <span>{t.gallery?.double}</span>
                </div>
              )}
            </div>
            
            {template.createdAt && (
              <div className="flex items-center gap-1 text-[11px] opacity-70 font-mono text-gray-400 dark:text-gray-500">
                <span className="material-symbols-rounded text-[14px]">calendar_today</span>
                <span>{new Date(template.createdAt).toLocaleDateString('en-GB')}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      size="4xl" 
      zIndex={50}
      title={t.gallery?.title}
      icon="view_carousel"
      height="80vh"
      bodyClassName="p-6 bg-gray-50/30 dark:bg-muted/5 custom-scrollbar"
    >
      <div className="flex flex-col gap-10">
        {/* User Templates */}
        {myTemplates.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <span className="material-symbols-rounded">folder_special</span>
              {t.gallery?.myTemplates}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {myTemplates.map(renderTemplateCard)}
            </div>
          </div>
        )}

        {/* Store / Official Templates */}
        {storeTemplates.length > 0 && (
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-border/50">
              <span className="material-symbols-rounded">storefront</span>
              {t.gallery?.store}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {storeTemplates.map(renderTemplateCard)}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
