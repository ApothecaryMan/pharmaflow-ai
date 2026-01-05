import React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';
import { Modal } from './Modal';

export interface HelpSection {
  title: string;
  steps?: string[];
  items?: string[];
  description?: string;
}

export interface HelpContent {
  title: string;
  overview: {
    title: string;
    description: string;
  };
  usage: {
    title: string;
    [key: string]: HelpSection | string;
  };
  features: {
    title: string;
    items: string[];
  };
  understanding?: {
    title: string;
    columns?: string[];
    cards?: string[];
    expandedView?: string;
    expandInfo?: string;
    modalDetails?: string;
    liveUpdate?: string;
  };
  tips: {
    title: string;
    items: string[];
  };
}

interface HelpModalProps {
  show: boolean;
  onClose: () => void;
  helpContent: HelpContent;
  color: string;
  language: string;
}

// Color mapping for usage sections
const usageColors = [
  'blue', 'purple', 'green', 'indigo', 'teal', 'cyan', 'pink', 'amber', 'orange', 'red'
];

export const HelpModal: React.FC<HelpModalProps> = ({ show, onClose, helpContent, color, language }) => {
  // Get usage sections (excluding 'title')
  const usageSections = Object.entries(helpContent.usage).filter(([key]) => key !== 'title');

  return (
    <Modal
        isOpen={show}
        onClose={onClose}
        size="4xl"
        zIndex={50}
        title={helpContent.title}
        icon="help"
    >

        {/* Content */}
        <div className="space-y-6">
          {/* Overview */}
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 className="text-xl font-bold mb-3">{helpContent.overview.title}</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{helpContent.overview.description}</p>
          </div>

          {/* Usage */}
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className={`material-symbols-rounded text-${color}-600`}>menu_book</span>
              {helpContent.usage.title}
            </h3>
            
            <div className="space-y-4">
              {usageSections.map(([key, section], idx) => {
                if (typeof section === 'string') return null;
                const sectionData = section as HelpSection;
                const colorClass = usageColors[idx % usageColors.length];
                
                return (
                  <div key={key}>
                    <h4 className={`font-semibold text-${colorClass}-700 dark:text-${colorClass}-400 mb-2`}>
                      {sectionData.title}
                    </h4>
                    <ol className="space-y-1.5 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 ml-3">
                      {sectionData.steps?.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Features */}
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
              <span className={`material-symbols-rounded text-${color}-600`}>featured_play_list</span>
              {helpContent.features.title}
            </h3>
            <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm columns-1 md:columns-2">
              {helpContent.features.items.map((item: string, i: number) => (
                <li key={i} className="leading-relaxed break-inside-avoid">{item}</li>
              ))}
            </ul>
          </div>

          {/* Understanding (if exists) */}
          {helpContent.understanding && (
            <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
              <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
                <span className={`material-symbols-rounded text-${color}-600`}>info</span>
                {helpContent.understanding.title}
              </h3>
              <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm mb-3">
                {(helpContent.understanding.columns || helpContent.understanding.cards || []).map((item: string, i: number) => (
                  <li key={i} className="leading-relaxed">{item}</li>
                ))}
              </ul>
              {(helpContent.understanding.expandedView || helpContent.understanding.expandInfo || helpContent.understanding.modalDetails || helpContent.understanding.liveUpdate) && (
                <p className="text-sm text-gray-600 dark:text-gray-400 italic">
                  {helpContent.understanding.expandedView || helpContent.understanding.expandInfo || helpContent.understanding.modalDetails || helpContent.understanding.liveUpdate}
                </p>
              )}
            </div>
          )}

          {/* Tips */}
          <div className="p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900">
            <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-yellow-900 dark:text-yellow-100">
              <span className="material-symbols-rounded text-yellow-600">lightbulb</span>
              {helpContent.tips.title}
            </h3>
            <ul className="space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm columns-1 md:columns-2">
              {helpContent.tips.items.map((tip: string, i: number) => (
                <li key={i} className="leading-relaxed break-inside-avoid">{tip}</li>
              ))}
            </ul>
          </div>
        </div>
    </Modal>
  );
};

// Help Button Component
interface HelpButtonProps {
  onClick: () => void;
  title: string;
  color: string;
  isRTL?: boolean;
}

export const HelpButton: React.FC<HelpButtonProps> = ({ onClick, title, color, isRTL = false }) => (
  <button
    onClick={onClick}
    className={`fixed ${isRTL ? 'left-6' : 'right-6'} bottom-6 w-10 h-10 rounded-full bg-${color}-600 text-white shadow-md transition-colors flex items-center justify-center z-40 hover:bg-${color}-700`}
    title={title}
  >
    <span className="material-symbols-rounded text-lg">help</span>
  </button>
);
