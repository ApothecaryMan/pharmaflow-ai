import type React from 'react';
import type { MarketplaceTemplate } from '../../types/templates';
import { Modal } from './Modal';

interface TemplateMarketplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: MarketplaceTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  onUnlockPremium?: (id: string) => void;
  t: any;
  color: string;
}

export const TemplateMarketplaceModal: React.FC<TemplateMarketplaceModalProps> = ({
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t.gallery?.title || 'Template Marketplace'}
      size='6xl'
    >
      <div className='h-[85vh] flex flex-col'>
        <div className='flex-1 overflow-x-auto overflow-y-hidden custom-scrollbar flex items-start gap-6 p-4 w-full'>
          {templates.map((template) => {
            const isSelected = selectedId === template.id;
            return (
              <div
                key={template.id}
                className={`shrink-0 group bg-white dark:bg-card border-2 rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col relative ${
                  isSelected
                    ? `border-${color}-500 shadow-lg`
                    : 'border-gray-200 dark:border-border/60 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                style={{ width: 'calc(80mm + 4px)' }}
              >
                {/* Selected Badge */}
                {isSelected && (
                  <div
                    className={`absolute top-3 right-3 z-10 bg-${color}-500 text-white rounded-full w-6 h-6 flex items-center justify-center shadow-md`}
                  >
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
                    style={{ width: '100%' }}
                    onLoad={(e) => {
                      const iframe = e.target as HTMLIFrameElement;
                      if (iframe.contentWindow) {
                        iframe.style.height = `${iframe.contentWindow.document.body.scrollHeight + 10}px`;
                      }
                    }}
                    title={template.name}
                  />
                </div>

                {/* Template Info */}
                <div
                  className='p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/10'
                  dir='ltr'
                >
                  <div className='flex items-center justify-between'>
                    <h3 className='font-bold text-gray-800 dark:text-gray-200'>{template.name}</h3>
                    <div className='flex items-center gap-1.5'>
                      {template.isPremium ? (
                        <>
                          <span className='bg-amber-500/10 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap'>
                            PAID
                          </span>
                          <span className='text-xs font-bold text-amber-500'>
                            ${template.price}
                          </span>
                        </>
                      ) : (
                        <span className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap'>
                          {t.gallery?.free || 'FREE'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
