import React from 'react';
import { Modal } from './Modal';
import type { MarketplaceTemplate } from '../../types/templates';

interface PremiumTemplateGalleryProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MarketplaceTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUnlockPremium?: (id: string) => void;
  t: any;
  color: string;
}

export const PremiumTemplateGallery: React.FC<PremiumTemplateGalleryProps> = ({
  isOpen,
  onClose,
  templates,
  selectedId,
  onSelect,
  onUnlockPremium,
  t,
  color,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t.gallery?.title || 'Template Marketplace'} size='6xl'>
      <div className='h-[85vh] flex flex-col'>
        <div className='flex-1 overflow-y-auto custom-scrollbar flex flex-wrap justify-center gap-6 p-1'>
          {templates.map((template) => {
            const isSelected = selectedId === template.id;
            return (
              <div
                key={template.id}
                className={`w-[302px] shrink-0 group bg-white dark:bg-card border-2 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col relative ${
                  isSelected
                    ? `border-${color}-500 shadow-lg`
                    : 'border-gray-200 dark:border-border/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                {/* Premium Badge */}
                {template.isPremium && (
                  <div className='absolute top-3 left-3 z-10 bg-amber-500 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md'>
                    <span className='material-symbols-rounded text-[12px]'>workspace_premium</span>
                    {t.gallery?.premium || 'Premium'}
                  </div>
                )}
                
                {/* Selected Badge */}
                {isSelected && (
                  <div className={`absolute top-3 right-3 z-10 bg-${color}-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md`}>
                    <span className='material-symbols-rounded text-[14px]'>check</span>
                  </div>
                )}

                {/* Preview Area */}
                <div
                  className='flex-1 bg-white dark:bg-gray-900 overflow-y-auto custom-scrollbar flex justify-center cursor-pointer'
                  onClick={() => {
                    if (template.isPremium && onUnlockPremium) {
                      onUnlockPremium(template.id);
                    } else {
                      onSelect(template.id);
                      onClose();
                    }
                  }}
                >
                  <iframe
                    srcDoc={template.previewHtml}
                    scrolling='no'
                    className='border-none pointer-events-none'
                    style={{ width: '302px' }}
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      if (iframe.contentWindow) {
                        iframe.style.height = `${iframe.contentWindow.document.body.scrollHeight + 50}px`;
                      }
                    }}
                    title={template.name}
                  />
                </div>

                {/* Template Info */}
                <div className='p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10'>
                  <div className='flex items-center justify-between mb-1'>
                    <h3 className='font-bold text-gray-800 dark:text-gray-200'>
                      {template.name}
                    </h3>
                    <span className={`text-xs font-bold ${template.isPremium ? 'text-amber-500' : 'text-gray-500'}`}>
                      {template.isPremium ? (template.price ? `$${template.price}` : 'PRO') : (t.gallery?.free || 'Free')}
                    </span>
                  </div>
                  {template.description && (
                    <p className='text-xs text-gray-500 dark:text-gray-400 line-clamp-2'>
                      {template.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
