import { AnimatePresence, motion } from 'framer-motion';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type FdaDrugLabel, openFdaService } from '../../services/inventory/openFdaService';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import type { Drug } from '../../types';
import { PageHeader } from '../common/PageHeader';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { getDisplayName } from '../../utils/drugDisplayName';
import { CARD_BASE } from '../../utils/themeStyles';
import { FDA } from '../common/Icons';

interface DrugInteractionsPageProps {
  t: Translations;
  language?: string;
  inventory?: Drug[];
  color?: string;
}

type TabType = 'interactions' | 'warnings' | 'contraindications' | 'usage';
type TabDef = { id: TabType; label: string };

const TAB_ICONS: Record<TabType, string> = {
  interactions: 'sync_alt',
  warnings: 'warning_amber',
  contraindications: 'block',
  usage: 'info',
};

export const DrugInteractionsPage: React.FC<DrugInteractionsPageProps> = ({
  t,
  inventory = [],
  color = '#3b82f6',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [fdaData, setFdaData] = useState<Map<string, FdaDrugLabel | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('interactions');
  const [results, setResults] = useState<Drug[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  const tabs = useMemo<TabDef[]>(
    () => [
      { id: 'interactions' as TabType, label: 'Interactions' },
      { id: 'warnings' as TabType, label: 'Warnings' },
      { id: 'contraindications' as TabType, label: 'Contraindications' },
      { id: 'usage' as TabType, label: 'Usage' },
    ],
    []
  );

  useEffect(() => {
    if (inventory.length > 0) {
      inventorySearchEngine.indexData(inventory);
    }
  }, [inventory]);

  useEffect(() => {
    const fetchAllData = async () => {
      if (selectedDrugs.length === 0) {
        setFdaData(new Map());
        return;
      }
      setLoading(true);
      const allIngredients = new Set<string>();
      for (const drug of selectedDrugs) {
        const ingredients = Array.isArray(drug.genericName)
          ? drug.genericName
          : [drug.genericName].filter(Boolean);
        for (const ing of ingredients) {
          allIngredients.add(ing);
        }
      }
      try {
        const results = await openFdaService.fetchInteractionsForIngredients(
          Array.from(allIngredients)
        );
        setFdaData(results);
      } catch (err) {
        console.error('Failed to fetch aggregated FDA data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllData();
  }, [selectedDrugs]);

  const handleDrugToggle = (drug: Drug) => {
    setSelectedDrugs((prev) => {
      const isSelected = prev.find((d) => d.id === drug.id);
      if (isSelected) return prev.filter((d) => d.id !== drug.id);
      return [...prev, drug];
    });
  };

  const hasAnyData = useMemo(
    () => [...fdaData.values()].some((data) => data !== null),
    [fdaData]
  );

  const ingredientResults = useMemo(
    () => [...fdaData.entries()].map(([name, data]) => ({ name, data })),
    [fdaData]
  );

  const detectedIssues = useMemo(() => {
    const issues: { source: string; target: string; snippet: string }[] = [];
    const allIngredients: string[] = Array.from(fdaData.keys());
    fdaData.forEach((data: FdaDrugLabel | null, ingName: string) => {
      const interactions = data?.drug_interactions;
      if (!interactions?.[0]) return;
      const text = (interactions[0] as string).toLowerCase();
      allIngredients.forEach((otherIng) => {
        if (ingName === otherIng) return;
        if (text.includes(otherIng.toLowerCase())) {
          const idx = text.indexOf(otherIng.toLowerCase());
          const fullText = interactions[0] as string;
          const snippet = fullText.substring(
            Math.max(0, idx - 150),
            Math.min(fullText.length, idx + 450)
          );
          issues.push({
            source: ingName,
            target: otherIng,
            snippet: `${idx > 150 ? '...' : ''}${snippet}${idx + 450 < fullText.length ? '...' : ''}`,
          });
        }
      });
    });
    return issues;
  }, [fdaData]);

  const formatClinicalText = (text: string) => {
    if (!text) return null;

    const renderWithSources = (content: string) => {
      if (!content) return null;
      const regex = /(\[[^\]]+\]|\(see\s+[^)]+\)|\(\s*\d+(?:\.\d+)?(?:\s*,\s*\d+(?:\.\d+)?)*\s*\)|\b(?:Tables?|Figures?|Sections?)\s+\d+(?:\.\d+)?(?:\s*(?:,|and|or|to|-)\s*\d+(?:\.\d+)?)*\b|\(\s*e\.?g\.?,?\s+[^)]+\)|\bSee\s+(?:the\s+)?prescribing\s+information\b)/gi;
      return content.split(regex).map((part, i) => {
        if (i % 2 !== 0) {
          const isCrossReference = /^(?:Table|Figure|Section)s?\s/i.test(part);
          const isExample = /^\(\s*e\.?g\.?/i.test(part);

          if (isCrossReference) {
            return (
              <span key={i} className='font-bold text-(--text-primary) bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-md mx-0.5'>
                {part}
              </span>
            );
          }
          if (isExample) {
            return (
              <span key={i} className='font-semibold text-(--text-primary) italic'>
                {part}
              </span>
            );
          }
          return (
             <span key={i} className='text-[10px] font-bold text-(--text-tertiary) bg-black/5 dark:bg-white/10 px-1.5 py-0.5 rounded-sm mx-1 tracking-tight inline-block leading-none translate-y-[-1px]'>
              {part}
            </span>
          );
        }
        return part;
      });
    };

    const renderStructuredText = (rawText: string, textClassName: string = 'font-medium text-(--text-secondary)') => {
      const trueParagraphs = rawText.split(/(?:\n\s*){2,}/);
      const paragraphs: string[] = [];
      
      trueParagraphs.forEach(trueP => {
        const units = trueP.split(/\s+(?=\d+\.\d+\s+[A-Z])|(?<=[.!?\])])\s+(?=[A-Z])/);
        let currentPara = '';
        
        units.forEach(unit => {
          const trimmed = unit.trim();
          if (!trimmed) return;
          
          const isHeader = /^(\d+\.\d+)\s+/.test(trimmed);
          const isBullet = /^[•\-*]/.test(trimmed);
          const endsWithRef = /[\])]$/.test(trimmed);
          
          const colonSubtitle = /^[^:.!?]{3,60}\s*:/s.test(trimmed);
          const titleSubtitle = /^(?!The\s|This\s|These\s|In\s|A\s|An\s|For\s|See\s|Use\s|Avoid\s|Consult\s|Monitor\s|Consider\s|Evaluate\s|Do\snot\s|If\s|Take\s|Administer\s|Discontinue\s|Reduce\s|Increase\s|Adjust\s|Initiate\s|Stop\s|Advise\s|Instruct\s|Counsel\s|Start\s|Give\s|Ensure\s|Maintain\s|Hold\s|Interrupt\s|Resume\s|When\s)([A-Z][A-Za-z0-9/-]+(?:\s+(?:and|or|with|in|of)\s+[A-Z][A-Za-z0-9/-]+|\s+[A-Z][A-Za-z0-9/-]+){0,3})\s+(?=[A-Z][a-z])/s.test(trimmed);
          
          if (isHeader || isBullet || endsWithRef || colonSubtitle || titleSubtitle) {
            if (currentPara) paragraphs.push(currentPara.trim());
            currentPara = '';
            
            if (isHeader || isBullet || endsWithRef) {
              paragraphs.push(trimmed);
            } else {
              currentPara = trimmed + ' ';
            }
            return;
          }
          
          if (currentPara.length + trimmed.length > 400 && currentPara.length > 0) {
            paragraphs.push(currentPara.trim());
            currentPara = trimmed + ' ';
          } else {
            currentPara += trimmed + ' ';
          }
        });
        if (currentPara) paragraphs.push(currentPara.trim());
      });

      return (
        <div className='space-y-4 pt-1'>
          {paragraphs.map((p, i) => {
            const match = p.match(/^(\d+\.\d+)\s+(.*)/is);
            if (match) {
              return (
                <div key={i} className='mt-6 mb-2 first:mt-0 flex gap-3'>
                  <span className='font-black text-(--text-primary) bg-black/5 dark:bg-white/10 px-2.5 py-1 rounded-md text-xs h-fit shrink-0 mt-0.5 border border-black/5 dark:border-white/10'>
                    {match[1]}
                  </span>
                  <p className={`text-sm leading-[1.75] text-left ${textClassName}`} dir='auto'>
                    {renderWithSources(match[2].trim())}
                  </p>
                </div>
              );
            }

            let subtitle = '';
            let contentToRender = p;
            
            const colonMatch = p.match(/^([^:.!?]{3,60})\s*:\s*(.*)/s);
            if (colonMatch) {
              subtitle = colonMatch[1].trim();
              contentToRender = colonMatch[2].trim();
            } else {
              const titleMatch = p.match(/^(?!The\s|This\s|These\s|In\s|A\s|An\s|For\s|See\s|Use\s|Avoid\s|Consult\s|Monitor\s|Consider\s|Evaluate\s|Do\snot\s|If\s|Take\s|Administer\s|Discontinue\s|Reduce\s|Increase\s|Adjust\s|Initiate\s|Stop\s|Advise\s|Instruct\s|Counsel\s|Start\s|Give\s|Ensure\s|Maintain\s|Hold\s|Interrupt\s|Resume\s|When\s)([A-Z][A-Za-z0-9/-]+(?:\s+(?:and|or|with|in|of)\s+[A-Z][A-Za-z0-9/-]+|\s+[A-Z][A-Za-z0-9/-]+){0,3})\s+(?=[A-Z][a-z])/s);
              if (titleMatch && titleMatch[1].length < 60) {
                subtitle = titleMatch[1].trim();
                contentToRender = p.substring(titleMatch[1].length).trim();
              }
            }

            return (
              <p
                key={i}
                className={`text-sm leading-[1.75] text-left ${p.startsWith('•') || p.startsWith('-') ? 'ps-4' : ''} ${textClassName}`}
                dir='auto'
              >
                {subtitle && <strong className='text-(--text-primary) font-bold block mb-0.5'>{subtitle}</strong>}
                {renderWithSources(contentToRender)}
              </p>
            );
          })}
        </div>
      );
    };
    const cleanedText = text
      .replace(/^(?:[0-9.]+\s*)?DRUG INTERACTIONS\s*/i, '')
      .replace(/^(?:[0-9.]+\s*)?WARNINGS\s*/i, '')
      .replace(/^(?:[0-9.]+\s*)?CONTRAINDICATIONS\s*/i, '')
      .replace(/^(?:[0-9.]+\s*)?INDICATIONS AND USAGE\s*/i, '');
    const blocks = cleanedText.split(/(?<=\n|\.\s+)(?=[A-Z][A-Za-z\s,()-]+Clinical Impact\s*:)/g);
    if (blocks.length <= 1) {
      return renderStructuredText(cleanedText);
    }

    return (
      <div className='flex flex-col'>
        {blocks.map((block, i) => {
          const impactMatch = block.match(
            /(.*?)\s*Clinical Impact\s*:\s*(.*?)(?=\s*Intervention\s*:|$)/is
          );
          const interventionMatch = block.match(/Intervention\s*:\s*(.*)/is);
          const header = impactMatch?.[1]?.trim();
          const impact = impactMatch?.[2]?.trim();
          const intervention = interventionMatch?.[1]?.trim();

          if (!impact && !intervention) {
            return (
              <div key={i} className='max-w-4xl'>
                {renderStructuredText(block.trim())}
              </div>
            );
          }

          return (
            <div
              key={i}
              className='group relative border-s-[3px] border-(--border-divider) ps-6 pt-1 pb-12 transition-all duration-300 hover:border-(--text-primary)'
            >
              {header && (
                <div className='sticky top-[92px] z-10 bg-(--bg-card) py-3 -ms-4 ps-4 -me-2 pe-2'>
                  <h5 className='text-sm font-black uppercase tracking-[0.08em] text-(--text-primary)'>
                    {header}
                  </h5>
                </div>
              )}
              <div className='flex flex-col gap-4 mt-4'>
                {impact && (
                  <div className='space-y-1'>
                    <span className='inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-red-500/80'>
                      <span className='w-1 h-1 rounded-full bg-red-500/60' />
                      Clinical Impact
                    </span>
                    <div className='max-w-4xl'>
                      {renderStructuredText(impact)}
                    </div>
                  </div>
                )}
                {intervention && (
                  <div className='space-y-1'>
                    <span className='inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.15em] text-blue-500/80'>
                      <span className='w-1 h-1 rounded-full bg-blue-500/60' />
                      Intervention
                    </span>
                    <div className='max-w-4xl'>
                      {renderStructuredText(intervention)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderLoadingSkeleton = () => (
    <div className='space-y-10 pt-8'>
      {[1, 2].map((i) => (
        <div key={i} className='space-y-5 animate-pulse'>
          <div className='flex items-center gap-3'>
            <div className='h-4 w-16 bg-(--border-divider) rounded' />
            <div className='h-6 w-48 bg-(--border-divider) rounded' />
          </div>
          <div className='space-y-3 ps-4 border-s-[3px] border-(--border-divider)'>
            <div className='h-3 w-20 bg-(--border-divider) rounded' />
            <div className='h-4 w-full bg-(--border-divider) rounded' />
            <div className='h-4 w-4/5 bg-(--border-divider) rounded' />
            <div className='h-4 w-3/5 bg-(--border-divider) rounded mt-4' />
            <div className='h-3 w-16 bg-(--border-divider) rounded' />
            <div className='h-4 w-5/6 bg-(--border-divider) rounded' />
          </div>
        </div>
      ))}
    </div>
  );

  const renderEmptyState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='h-full flex items-center justify-center pt-24'
    >
      <div className='text-center max-w-xs'>
        <div className='relative mx-auto mb-8 w-32 h-32 flex items-center justify-center'>
          <div className='absolute inset-0 rounded-full bg-(--border-divider) opacity-30' />
          <span
            className='material-symbols-rounded text-(--border-color) relative z-10'
            style={{ fontSize: '72px' }}
          >
            medication
          </span>
        </div>
        <p className='text-sm font-black text-(--text-tertiary) uppercase tracking-[0.12em] leading-relaxed' dir='auto'>
          {t.selectMultipleDrugs}
        </p>
        <p className='mt-3 text-[11px] font-medium text-(--text-tertiary) opacity-60 leading-relaxed' dir='auto'>
          {t.searchAndAddDrugs}
        </p>
      </div>
    </motion.div>
  );

  const renderNoDataState = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className='py-20 text-center'
    >
      <div className='inline-flex items-center justify-center w-14 h-14 rounded-full bg-(--border-divider) mb-5'>
        <span className='material-symbols-rounded text-(--text-tertiary)' style={{ fontSize: '24px' }}>
          description
        </span>
      </div>
      <h4 className='text-sm font-black text-(--text-primary) uppercase tracking-[0.06em] mb-2' dir='auto'>
        No FDA data available for this drug
      </h4>
      <p className='text-xs font-medium text-(--text-tertiary)' dir='auto'>
        This drug may not be FDA-registered (e.g., generic local version)
      </p>
    </motion.div>
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
    },
  };

  const renderFdaContent = () => {
    if (loading) return renderLoadingSkeleton();
    if (selectedDrugs.length === 0) return renderEmptyState();
    if (!hasAnyData) return renderNoDataState();

    return (
      <motion.div
        variants={containerVariants}
        initial='hidden'
        animate='visible'
        key={`${selectedDrugs.map((d) => d.id).join('-')}-${activeTab}`}
        className='flex flex-col pt-4'
      >
        {detectedIssues.length > 0 && activeTab === 'interactions' && (
          <motion.div variants={itemVariants} className='relative overflow-hidden'>
            <div className='absolute inset-0 bg-gradient-to-r from-red-500/[0.04] to-transparent pointer-events-none' />
            <div className='relative border-s-[3px] border-red-500 ps-6 py-5 space-y-5'>
              <div className='flex items-center gap-3'>
                <span className='inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-500/10 text-red-500'>
                  <span className='material-symbols-rounded' style={{ fontSize: '18px' }}>
                    warning
                  </span>
                </span>
                <div>
                  <h3 className='text-sm font-black uppercase tracking-[0.06em] text-red-500'>
                    Direct Clinical Conflict Detected
                  </h3>
                  <p className='text-[10px] font-medium text-(--text-tertiary) mt-0.5'>
                    {detectedIssues.length} conflict{detectedIssues.length > 1 ? 's' : ''} found across selected ingredients
                  </p>
                </div>
              </div>
              <div className='grid gap-4'>
                {detectedIssues.map((issue, i) => (
                  <div key={i} className='flex flex-col gap-1.5'>
                    <div className='flex items-center gap-2 text-xs font-black uppercase tracking-[0.04em] text-(--text-primary)'>
                      <span>{issue.source}</span>
                      <span className='material-symbols-rounded text-(--text-tertiary)' style={{ fontSize: '14px' }}>
                        arrow_forward
                      </span>
                      <span className='text-red-500'>{issue.target}</span>
                    </div>
                    <p className='text-[13px] font-medium leading-relaxed text-(--text-secondary) italic text-left' dir='auto'>
                      {issue.snippet}
                    </p>
                  </div>
                ))}
              </div>
              <div className='flex items-center gap-2 pt-4 border-t border-(--border-divider)'>
                <span className='material-symbols-rounded text-(--text-tertiary)' style={{ fontSize: '12px' }}>
                  database
                </span>
                <span className='text-[10px] font-bold text-(--text-tertiary) uppercase tracking-[0.1em]'>
                  Source: FDA Clinical Data Retrieval
                </span>
              </div>
            </div>
          </motion.div>
        )}

        {ingredientResults.map(({ name, data }, idx) => (
          <motion.div key={`${name}-${idx}`} variants={itemVariants} className='pb-16'>
            <div className='sticky top-0 z-20 bg-(--bg-card) py-4 -mx-8 px-8'>
              <div className='flex items-center gap-3'>
                <div className='flex items-baseline gap-2 shrink-0'>
                  <span className='text-[10px] font-black text-(--text-tertiary) tabular-nums tracking-[0.12em]'>
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className='text-[9px] font-black text-(--text-tertiary) uppercase tracking-[0.15em]'>
                    Ingredient
                  </span>
                </div>
                <div className='h-px flex-1 bg-(--border-divider)' />
              </div>
              <h4 className='text-2xl font-black text-(--text-primary) uppercase tracking-[-0.02em] leading-tight mt-4'>
                {name}
              </h4>
            </div>
            <div className='ps-2 mt-2'>
              {data ? (
                <div className='w-full'>
                  {activeTab === 'interactions' &&
                    formatClinicalText(data.drug_interactions?.[0] || t.noInteractions)}
                  {activeTab === 'warnings' &&
                    formatClinicalText(data.warnings?.[0] || 'No specific warnings.')}
                  {activeTab === 'contraindications' &&
                    formatClinicalText(data.contraindications?.[0] || 'No contraindications.')}
                  {activeTab === 'usage' &&
                    formatClinicalText(data.indications_and_usage?.[0] || 'No usage data.')}
                </div>
              ) : (
                <div className='text-xs font-medium text-(--text-tertiary) italic flex items-center gap-2 text-left' dir='auto'>
                  <span className='w-1 h-1 rounded-full bg-(--text-tertiary)' />
                  No FDA data available for this drug
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>
    );
  };

  return (
    <div className='h-full flex flex-col bg-(--bg-page-surface) selection:bg-(--text-primary)/10'>
      <PageHeader
        leftContent={
          <div className='flex flex-col items-start'>
            <h1 className={"text-2xl !font-['GraphicSansFont'] tracking-tight text-(--text-primary) flex items-center gap-2 truncate"} style={{ fontFeatureSettings: '"jalt" 1, "dlig" 1, "ss01" 1, "ss02" 1, "ss03" 1, "swsh" 1, "cswh" 1, "salt" 1' }}>
              <span className="flex items-center justify-center shrink-0 text-[#002D72] dark:text-blue-300 translate-y-[1px]">
                <FDA size={22} className="opacity-95" />
              </span>
              {t.interactionAnalysis}
            </h1>
          </div>
        }
        centerContent={
          <div className='w-full max-w-[560px] mx-auto'>
            <SearchEngineInput
              value={searchQuery}
              onSearchChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              inventory={inventory}
              onResultsChange={setResults}
              placeholder={t.searchPlaceholder}
              autoFocus
              className={"!font-['GraphicSansFont'] bg-transparent border-0 focus:ring-0 text-sm font-normal tracking-tight"}
            />
          </div>
        }
        rightContent={
          <div className='flex items-center gap-3'>
            {selectedDrugs.length > 0 && (
              <motion.button
                type='button'
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedDrugs([])}
                className={"!font-['GraphicSansFont'] text-[10px] font-normal uppercase tracking-[0.12em] text-red-500 px-3 py-1.5 border border-red-500/30"}
              >
                {t.clearCocktail}
              </motion.button>
            )}
          </div>
        }
      />

      <div className='flex-1 flex overflow-hidden gap-3'>
        <div
          className={`w-[360px] hidden lg:flex flex-col ${CARD_BASE} rounded-xl`}
          dir='ltr'
        >
          <div className='flex-1 overflow-y-auto scrollbar-hide p-3 space-y-1.5'>
            {results.length === 0 && searchQuery.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='px-4 py-12 text-center'
              >
                <p className='text-xs font-medium text-(--text-tertiary) italic'>
                  {t.noResults}
                </p>
              </motion.div>
            )}
            {searchQuery.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className='h-full flex flex-col items-center justify-center px-6'
              >
                <div className='relative mb-5 w-16 h-16 flex items-center justify-center'>
                  <div className='absolute inset-0 rounded-full bg-(--border-divider) opacity-30' />
                  <span
                    className='material-symbols-rounded text-(--border-color) relative z-10'
                    style={{ fontSize: '36px' }}
                  >
                    search
                  </span>
                </div>
                <p className='text-xs font-medium text-(--text-tertiary) italic text-center' dir='auto'>
                  {t.sidebarPlaceholder}
                </p>
              </motion.div>
            )}
            <AnimatePresence mode='popLayout'>
              {results.map((drug, index) => {
                const isSelected = selectedDrugs.some((d) => d.id === drug.id);
                return (
                  <motion.button
                    type='button'
                    key={drug.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9, filter: 'blur(4px)' }}
                    transition={{
                      layout: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
                      opacity: { duration: 0.25, delay: index * 0.035 },
                      y: { duration: 0.25, delay: index * 0.035, ease: [0.25, 0.1, 0.25, 1] },
                      scale: { duration: 0.25, delay: index * 0.035 },
                    }}
                    onClick={() => handleDrugToggle(drug)}
                    className={`w-full text-start rounded-xl border transition-all duration-200 relative overflow-hidden ${
                      isSelected
                        ? 'border-transparent bg-(--bg-page-surface)'
                        : '!border-[--accent-color]/40 !bg-[--accent-color]/8'
                    }`}
                    style={!isSelected ? ({ '--accent-color': color } as React.CSSProperties) : undefined}
                  >
                    <div className='px-4 h-[48px] flex flex-col justify-center'>
                      <div
                        className='flex items-baseline gap-1.5 text-sm font-bold tracking-tight w-full min-w-0'
                        dir='ltr'
                      >
                        <span className='truncate text-(--text-primary) uppercase'>
                          {(Array.isArray(drug.genericName) ? drug.genericName[0] : drug.genericName) || drug.name}
                        </span>
                      </div>
                      <span className='text-[11px] font-medium text-(--text-tertiary) truncate mt-0.5' dir='ltr'>
                        {getDisplayName(drug)}
                      </span>
                    </div>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        <div className={`flex-1 flex flex-col overflow-hidden ${CARD_BASE} rounded-xl`} dir='ltr'>
          <AnimatePresence mode='wait'>
            {selectedDrugs.length > 0 ? (
              <motion.div
                key='selected-content'
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className='flex-1 flex flex-col overflow-hidden'
              >
                <div className='shrink-0 z-20 bg-(--bg-card) border-b border-(--border-divider)'>
                  <div className='flex flex-wrap gap-2 px-4 pt-3 pb-0' dir='ltr'>
                      {(
                        Array.from(
                          new Map(
                            selectedDrugs.map((drug) => {
                              const gen = (Array.isArray(drug.genericName) ? drug.genericName[0] : drug.genericName) || drug.name;
                              return [gen, drug];
                            })
                          ).values()
                        ) as Drug[]
                      ).map((drug) => {
                        const gen = (Array.isArray(drug.genericName) ? drug.genericName[0] : drug.genericName) || drug.name;
                        return (
                          <motion.div
                            key={gen}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                            className='group flex items-center gap-2 px-3 py-1.5 text-xs font-bold tracking-tight rounded-lg border border-(--border-divider) bg-(--bg-page-surface) text-(--text-primary) cursor-default select-none'
                          >
                            <span className='truncate max-w-[120px]'>{gen}</span>
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDrugs((prev: Drug[]) => prev.filter((d: Drug) => {
                                  const g = (Array.isArray(d.genericName) ? d.genericName[0] : d.genericName) || d.name;
                                  return g !== gen;
                                }));
                              }}
                              className='material-symbols-rounded text-(--text-tertiary) opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all duration-200 shrink-0'
                              style={{ fontSize: '12px' }}
                            >
                              close
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>

                    {hasAnyData && (
                      <div className='flex gap-0 px-3 justify-center'>
                        {tabs.map((tab) => {
                          const isActive = activeTab === tab.id;
                          return (
                            <button
                              type='button'
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id)}
                              className={`relative px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.12em] transition-colors duration-200 flex items-center gap-1.5 ${
                                isActive
                                  ? 'text-(--text-primary)'
                                  : 'text-(--text-tertiary) hover:text-(--text-secondary)'
                              }`}
                            >
                              <span
                                className='material-symbols-rounded'
                                style={{ fontSize: '14px', fontWeight: 200 }}
                              >
                                {TAB_ICONS[tab.id]}
                              </span>
                              {tab.label}
                              {isActive && (
                                <motion.div
                                  layoutId='tab-indicator'
                                  className='absolute bottom-0 inset-x-0 h-[2px] bg-(--text-primary)'
                                  transition={{
                                    type: 'spring',
                                    stiffness: 500,
                                    damping: 35,
                                  }}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className='flex-1 overflow-y-auto scrollbar-hide px-8 pb-16' ref={contentRef}>
                    <AnimatePresence mode='wait'>
                      <motion.div
                        key={`${selectedDrugs.map((d) => d.id).join('-')}-${activeTab}`}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                      >
                        {renderFdaContent()}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key='empty-content'
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className='flex-1 flex flex-col'
                >
                  {renderEmptyState()}
                </motion.div>
              )}
            </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default DrugInteractionsPage;
