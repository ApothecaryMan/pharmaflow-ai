import type React from 'react';
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

  // NEW EXPERT STRUCTURE (Action-Oriented)
  purpose?: {
    title: string;
    description: string;
  };
  quickTasks?: {
    title: string;
    [key: string]: HelpSection | string;
  };
  shortcuts?: {
    title: string;
    items: string[];
  };
  visualCues?: {
    title: string;
    items?: string[];
  };
  troubleshooting?: {
    title: string;
    items: string[];
  };

  // LEGACY STRUCTURE
  overview?: {
    title: string;
    description: string;
  };
  usage?: {
    title: string;
    [key: string]: HelpSection | string;
  };
  features?: {
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
  tips?: {
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
  'blue',
  'purple',
  'green',
  'indigo',
  'teal',
  'cyan',
  'pink',
  'amber',
  'orange',
  'red',
];

const TITLE_FONT_CLASS = "!font-['GraphicSansFont']";
const TITLE_FONT_STYLE = { fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' };

export const HelpModal: React.FC<HelpModalProps> = ({
  show,
  onClose,
  helpContent,
  color,
  language,
}) => {

  return (
    <Modal
      isOpen={show}
      onClose={onClose}
      size='4xl'
      zIndex={50}
      title={helpContent.title}
      icon='help'
    >
      <div className='space-y-6'>
        
        {/* NEW EXPERT STRUCTURE */}

        {/* Purpose */}
        {helpContent.purpose && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-2 flex items-center gap-2 text-primary-700 dark:text-primary-400 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded'>flag</span>
              {helpContent.purpose.title}
            </h3>
            <p className='text-gray-700 dark:text-gray-300 text-sm leading-relaxed'>
              {helpContent.purpose.description}
            </p>
          </div>
        )}

        {/* Quick Tasks */}
        {helpContent.quickTasks && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-4 flex items-center gap-2 text-blue-700 dark:text-blue-400 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-blue-600 dark:text-blue-400'>bolt</span>
              {helpContent.quickTasks.title}
            </h3>
            <div className='flex flex-col gap-y-6'>
              {Object.entries(helpContent.quickTasks).filter(([k]) => k !== 'title').map(([key, section], idx) => {
                if (typeof section === 'string') return null;
                const sectionData = section as HelpSection;
                const colorClass = usageColors[idx % usageColors.length];
                return (
                  <div key={key} className='w-full'>
                    <h4 className={`font-bold text-${colorClass}-700 dark:text-${colorClass}-400 mb-2 flex items-center gap-2`}>
                      <span className='material-symbols-rounded text-sm'>check_circle</span>
                      {sectionData.title}
                    </h4>
                    <ol className='space-y-1.5 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 ml-1'>
                      {sectionData.steps?.map((step: string, i: number) => (
                        <li key={i} className='leading-relaxed'>{step}</li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Shortcuts */}
        {helpContent.shortcuts && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-4 flex items-center gap-2 text-indigo-700 dark:text-indigo-400 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded'>keyboard</span>
              {helpContent.shortcuts.title}
            </h3>
            <div className='flex flex-wrap gap-4'>
              {helpContent.shortcuts.items.map((shortcut: string, i: number) => {
                const parts = shortcut.split(':');
                if (parts.length === 2) {
                   return (
                     <div key={i} className='flex items-center gap-3'>
                       <kbd className='px-3 py-1.5 bg-gradient-to-b from-white to-gray-100 dark:from-gray-700 dark:to-gray-800 border border-gray-200 dark:border-gray-600 border-b-[3px] rounded-lg text-sm font-mono font-extrabold text-indigo-700 dark:text-indigo-300 shadow-sm'>
                         {parts[0].trim()}
                       </kbd>
                       <span className='text-sm font-medium text-gray-700 dark:text-gray-300'>{parts[1].trim()}</span>
                     </div>
                   );
                }
                return <li key={i}>{shortcut}</li>;
              })}
            </div>
          </div>
        )}

        {/* Visual Cues */}
        {helpContent.visualCues && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-4 flex items-center gap-2 text-pink-600 dark:text-pink-400 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded'>palette</span>
              {helpContent.visualCues.title}
            </h3>
            <ul className='space-y-3 list-none'>
              {helpContent.visualCues.items?.map((item: string, i: number) => (
                <li key={i} className='flex items-start gap-3 text-sm text-gray-700 dark:text-gray-300'>
                  <span className='material-symbols-rounded text-pink-500 text-lg mt-0.5'>info</span>
                  <span className='leading-relaxed'>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Troubleshooting */}
        {helpContent.troubleshooting && (
          <div className='p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900'>
            <h3 
              className={`text-xl font-bold mb-3 flex items-center gap-2 text-amber-900 dark:text-amber-100 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-amber-600'>build</span>
              {helpContent.troubleshooting.title}
            </h3>
            <ul className='space-y-3 text-sm text-gray-800 dark:text-gray-200'>
              {helpContent.troubleshooting.items.map((tip: string, i: number) => {
                 const isQA = tip.includes('?') && tip.includes(':');
                 if (isQA) {
                    const [q, a] = tip.split(':');
                    return (
                       <li key={i} className='bg-white/60 dark:bg-black/20 p-3 rounded-lg'>
                         <strong className='block text-amber-900 dark:text-amber-400 mb-1'>{q.trim()}:</strong>
                         <span>{a.trim()}</span>
                       </li>
                    );
                 }
                 return (
                   <li key={i} className='flex items-start gap-2'>
                     <span className='text-amber-500 mt-1'>•</span>
                     <span className='leading-relaxed'>{tip}</span>
                   </li>
                 );
              })}
            </ul>
          </div>
        )}

        {/* LEGACY STRUCTURE FALLBACK */}

        {helpContent.overview && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-3 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              {helpContent.overview.title}
            </h3>
            <p className='text-gray-700 dark:text-gray-300 leading-relaxed'>
              {helpContent.overview.description}
            </p>
          </div>
        )}

        {helpContent.usage && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-4 flex items-center gap-2 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-primary-600'>menu_book</span>
              {helpContent.usage.title}
            </h3>
            <div className='space-y-4'>
              {Object.entries(helpContent.usage).filter(([k]) => k !== 'title').map(([key, section], idx) => {
                if (typeof section === 'string') return null;
                const sectionData = section as HelpSection;
                const colorClass = usageColors[idx % usageColors.length];
                return (
                  <div key={key}>
                    <h4 className={`font-semibold text-${colorClass}-700 dark:text-${colorClass}-400 mb-2`}>
                      {sectionData.title}
                    </h4>
                    <ol className='space-y-1.5 list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 ml-3'>
                      {sectionData.steps?.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {helpContent.features && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-3 flex items-center gap-2 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-primary-600'>featured_play_list</span>
              {helpContent.features.title}
            </h3>
            <ul className='space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm columns-1 md:columns-2'>
              {helpContent.features.items.map((item: string, i: number) => (
                <li key={i} className='leading-relaxed break-inside-avoid'>{item}</li>
              ))}
            </ul>
          </div>
        )}

        {helpContent.understanding && (
          <div className={`p-5 rounded-2xl ${CARD_BASE}`}>
            <h3 
              className={`text-xl font-bold mb-3 flex items-center gap-2 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-primary-600'>info</span>
              {helpContent.understanding.title}
            </h3>
            <ul className='space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm mb-3'>
              {(helpContent.understanding.columns || helpContent.understanding.cards || []).map((item: string, i: number) => (
                <li key={i} className='leading-relaxed'>{item}</li>
              ))}
            </ul>
            {(helpContent.understanding.expandedView ||
              helpContent.understanding.expandInfo ||
              helpContent.understanding.modalDetails ||
              helpContent.understanding.liveUpdate) && (
              <p className='text-sm text-gray-600 dark:text-gray-400 italic'>
                {helpContent.understanding.expandedView ||
                  helpContent.understanding.expandInfo ||
                  helpContent.understanding.modalDetails ||
                  helpContent.understanding.liveUpdate}
              </p>
            )}
          </div>
        )}

        {helpContent.tips && (
          <div className='p-5 rounded-2xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900'>
            <h3 
              className={`text-xl font-bold mb-3 flex items-center gap-2 text-yellow-900 dark:text-yellow-100 ${TITLE_FONT_CLASS}`}
              style={TITLE_FONT_STYLE}
            >
              <span className='material-symbols-rounded text-yellow-600'>lightbulb</span>
              {helpContent.tips.title}
            </h3>
            <ul className='space-y-2 list-disc list-inside text-gray-700 dark:text-gray-300 text-sm columns-1 md:columns-2'>
              {helpContent.tips.items.map((tip: string, i: number) => (
                <li key={i} className='leading-relaxed break-inside-avoid'>{tip}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Modal>
  );
};
