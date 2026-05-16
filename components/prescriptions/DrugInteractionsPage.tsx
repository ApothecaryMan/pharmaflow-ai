import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../common/PageHeader';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { openFdaService, FdaDrugLabel } from '../../services/inventory/openFdaService';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import type { Drug } from '../../types';

interface DrugInteractionsPageProps {
  t: any;
  language?: string;
  inventory?: Drug[];
  color?: string;
}

type TabType = 'interactions' | 'warnings' | 'contraindications' | 'usage';

/**
 * DrugInteractionsPage - Ultra-Minimalist Clinical View.
 * Flat design, high-density typography, zero shadows, no thick borders.
 */
export const DrugInteractionsPage: React.FC<DrugInteractionsPageProps> = ({ 
  t, 
  language = 'AR', 
  inventory = [],
  color = 'primary'
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<Drug[]>([]);
  const [fdaData, setFdaData] = useState<Map<string, FdaDrugLabel | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('interactions');
  const [results, setResults] = useState<Drug[]>([]);

  // Initialize Search Engine
  useEffect(() => {
    if (inventory.length > 0) {
      inventorySearchEngine.indexData(inventory);
    }
  }, [inventory]);

  // Effect: Fetch FDA data for all unique ingredients in the selected drugs
  useEffect(() => {
    const fetchAllData = async () => {
      if (selectedDrugs.length === 0) {
        setFdaData(new Map());
        return;
      }

      setLoading(true);
      
      // Aggregate all unique ingredients
      const allIngredients = new Set<string>();
      selectedDrugs.forEach(drug => {
        const ingredients = Array.isArray(drug.genericName) 
          ? drug.genericName 
          : [drug.genericName].filter(Boolean);
        ingredients.forEach(ing => allIngredients.add(ing));
      });

      try {
        const results = await openFdaService.fetchInteractionsForIngredients(Array.from(allIngredients));
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
    setSelectedDrugs(prev => {
      const isSelected = prev.find(d => d.id === drug.id);
      if (isSelected) {
        return prev.filter(d => d.id !== drug.id);
      } else {
        return [...prev, drug];
      }
    });
  };

  const hasAnyData = useMemo(() => {
    return [...fdaData.values()].some(data => data !== null);
  }, [fdaData]);

  const ingredientResults = useMemo(() => {
    return [...fdaData.entries()].map(([name, data]) => ({
      name,
      data
    }));
  }, [fdaData]);

  // Real-time Cross-Interaction Analysis
  const detectedIssues = useMemo(() => {
    const issues: { source: string; target: string; snippet: string }[] = [];
    const allIngredients: string[] = Array.from(fdaData.keys());

    fdaData.forEach((data: FdaDrugLabel | null, ingName: string) => {
      const interactions = data?.drug_interactions;
      if (!interactions || !interactions[0]) return;
      const text = (interactions[0] as string).toLowerCase();

      allIngredients.forEach(otherIng => {
        if (ingName === otherIng) return; // Don't check against self
        
        // Simple but effective check for ingredient mentions
        if (text.includes(otherIng.toLowerCase())) {
          // Find a small snippet for context
          const idx = text.indexOf(otherIng.toLowerCase());
          const fullText = interactions[0] as string;
          const snippet = fullText.substring(
            Math.max(0, idx - 150),
            Math.min(fullText.length, idx + 450)
          );
          
          issues.push({
            source: ingName,
            target: otherIng,
            snippet: `${idx > 150 ? '...' : ''}${snippet}${idx + 450 < fullText.length ? '...' : ''}`
          });
        }
      });
    });

    return issues;
  }, [fdaData]);

  const formatClinicalText = (text: string) => {
    if (!text) return null;

    // Clean up common FDA headers
    const cleanedText = text.replace(/^[0-9.]+\s*DRUG INTERACTIONS\s*/i, '')
                           .replace(/^[0-9.]+\s*WARNINGS\s*/i, '')
                           .replace(/^[0-9.]+\s*CONTRAINDICATIONS\s*/i, '');

    // Pattern: [Header] Clinical Impact: [Impact] Intervention: [Intervention]
    // We look for "Clinical Impact:" as the primary separator
    const blocks = cleanedText.split(/(?=\b[A-Z][A-Za-z\s,()-]+Clinical Impact:)/g);

    if (blocks.length <= 1) {
      // Fallback: Split by paragraphs or long sentences
      const paragraphs = cleanedText.split(/\n\n|(?<=[.!?])\s+(?=[A-Z])/);
      return (
        <div className="space-y-6">
          {paragraphs.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed font-medium text-gray-600 dark:text-gray-400">
              {p.trim()}
            </p>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-6">
        {blocks.map((block, i) => {
          const impactMatch = block.match(/(.*?)\s*Clinical Impact:\s*(.*?)(?=\s*Intervention:|$)/is);
          const interventionMatch = block.match(/Intervention:\s*(.*)/is);

          const header = impactMatch?.[1]?.trim();
          const impact = impactMatch?.[2]?.trim();
          const intervention = interventionMatch?.[1]?.trim();

          if (!impact && !intervention) {
            return (
              <p key={i} className="text-sm leading-relaxed font-medium text-gray-600 dark:text-gray-400">
                {block.trim()}
              </p>
            );
          }

          return (
            <div key={i} className="group border-s-2 border-gray-100 dark:border-white/5 ps-5 py-1 transition-colors hover:border-gray-900 dark:hover:border-white">
              {header && (
                <h5 className="text-base font-black uppercase tracking-tight text-gray-900 dark:text-white mb-3">
                  {header}
                </h5>
              )}
              <div className="flex flex-col gap-3">
                {impact && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-red-500/80 block">Clinical Impact</span>
                    <p className="text-sm font-medium leading-relaxed text-gray-600 dark:text-gray-400 max-w-5xl">
                      {impact}
                    </p>
                  </div>
                )}
                {intervention && (
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-500/80 block">Intervention</span>
                    <p className="text-sm font-bold leading-relaxed text-gray-900 dark:text-gray-200 max-w-5xl">
                      {intervention}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderFdaContent = () => {
    if (loading) return (
      <div className="space-y-8 animate-pulse pt-10">
        <div className="h-4 w-1/3 bg-gray-100 dark:bg-white/5 rounded" />
        <div className="space-y-4">
          <div className="h-4 w-full bg-gray-100 dark:bg-white/5 rounded" />
          <div className="h-4 w-5/6 bg-gray-100 dark:bg-white/5 rounded" />
        </div>
      </div>
    );

    if (selectedDrugs.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-40 text-gray-300">
          <p className="text-[10px] font-black uppercase tracking-[0.4em]">{t.selectDrug}</p>
        </div>
      );
    }

    if (!hasAnyData) {
      return (
        <div className="py-20 text-center border-t border-gray-100 dark:border-white/5">
          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase mb-2" dir="auto">{t.noFdaData}</h4>
          <p className="text-xs text-gray-400 font-medium" dir="auto">{t.notApproved}</p>
        </div>
      );
    }

    return (
      <div className="space-y-8 py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${selectedDrugs.map(d => d.id).join('-')}-${activeTab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Direct Interaction Alerts */}
            {activeTab === 'interactions' && detectedIssues.length > 0 && (
              <div className="bg-red-500/5 dark:bg-red-500/10 border-s-4 border-red-500 p-6 space-y-4">
                <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                  <span className="material-symbols-rounded" style={{ fontSize: '24px' }}>warning</span>
                  <h3 className="text-lg font-black uppercase tracking-tighter">Direct Clinical Conflict Detected</h3>
                </div>
                
                <div className="grid gap-4">
                  {detectedIssues.map((issue, i) => (
                    <div key={i} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-black uppercase tracking-tight text-gray-900 dark:text-white">
                        <span>{issue.source}</span>
                        <span className="material-symbols-rounded text-gray-400" style={{ fontSize: '12px' }}>arrow_forward</span>
                        <span className="text-red-600 dark:text-red-400">{issue.target}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 italic leading-relaxed" dir="auto">
                        {issue.snippet}
                      </p>
                    </div>
                  ))}
                </div>
                
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-4 border-t border-red-500/10">
                  Source: FDA Clinical Data Retrieval
                </p>
              </div>
            )}

            {ingredientResults.map(({ name, data }, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="flex flex-col">
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                    {String(idx + 1).padStart(2, '0')} — Ingredient
                  </span>
                  <h4 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter leading-tight" dir="auto">{name}</h4>
                </div>

                <div className="pt-6">
                  {data ? (
                    <div className="w-full" dir="auto">
                      {activeTab === 'interactions' && formatClinicalText(data.drug_interactions?.[0] || t.noInteractions)}
                      {activeTab === 'warnings' && formatClinicalText(data.warnings?.[0] || 'No specific warnings.')}
                      {activeTab === 'contraindications' && formatClinicalText(data.contraindications?.[0] || 'No contraindications.')}
                      {activeTab === 'usage' && formatClinicalText(data.indications_and_usage?.[0] || 'No usage data.')}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">{t.noFdaData}</div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

      </div>
    );
  };

  return (
    <div className="h-full flex flex-col bg-(--bg-page-surface) selection:bg-gray-100 dark:selection:bg-white/10">
      <PageHeader
        leftContent={
          selectedDrugs.length > 0 && (
            <button 
              onClick={() => setSelectedDrugs([])}
              className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:text-red-600 underline underline-offset-4 px-4"
            >
              Clear Cocktail
            </button>
          )
        }
        centerContent={
          <div className="w-[600px]">
            <SearchEngineInput
              value={searchQuery}
              onSearchChange={setSearchQuery}
              onClear={() => setSearchQuery('')}
              inventory={inventory}
              onResultsChange={setResults}
              placeholder={t.searchPlaceholder}
              autoFocus
              className="bg-transparent border-0 focus:ring-0 text-sm font-black uppercase tracking-tight"
            />
          </div>
        }
        rightContent={
          <div className="flex flex-col items-end">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white truncate tracking-tight page-title">
              Interaction Analysis
            </h1>
            <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 truncate tracking-widest italic uppercase">
              {selectedDrugs.length > 0 ? `${selectedDrugs.length} Drugs Selected` : t.drugInteractions}
            </span>
          </div>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar: Flat List */}
        <div className="w-[280px] hidden lg:flex flex-col border-e border-gray-100 dark:border-white/5 bg-(--bg-card)" dir="ltr">

          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {results.map((drug) => {
              const isSelected = selectedDrugs.some(d => d.id === drug.id);
              return (
                <button
                  key={drug.id}
                  onClick={() => handleDrugToggle(drug)}
                  className={`w-full text-start p-3 transition-none border-b border-gray-50 dark:border-white/[0.05] ${
                    isSelected
                      ? 'bg-gray-100 dark:bg-white/[0.08]'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.03]'
                  }`}
                >
                  <div className={`text-sm font-black uppercase tracking-tight mb-0.5 ${isSelected ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                    {drug.name}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 truncate">
                    {Array.isArray(drug.genericName) ? drug.genericName[0] : drug.genericName}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Area: Brutalist Hierarchy */}
        <div className="flex-1 flex flex-col overflow-hidden bg-(--bg-page-surface)">
          <div className="flex-1 overflow-y-auto scrollbar-hide px-6 pt-0 text-left" dir="ltr">
            <div className="relative">
              {selectedDrugs.length > 0 && (
                <div className="sticky top-0 z-20 bg-(--bg-page-surface) pt-6 pb-6 border-b border-gray-100 dark:border-white/5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      {selectedDrugs.map(drug => (
                        <div 
                          key={drug.id}
                          className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-none group"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">
                              {drug.name}
                            </span>
                            <span className="text-[9px] font-medium text-gray-400 italic">
                              {drug.dosageForm}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleDrugToggle(drug)}
                            className="material-symbols-rounded text-gray-400 hover:text-red-500 transition-colors"
                            style={{ fontSize: '16px' }}
                          >
                            close
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Flat Navigation */}
                    {hasAnyData && (
                      <div className="flex justify-center gap-8 pt-2">
                        {[
                          { id: 'interactions', label: t.interactions },
                          { id: 'warnings', label: t.warnings },
                          { id: 'contraindications', label: t.contraindications },
                          { id: 'usage', label: t.usage },
                        ].map((tab) => (
                          <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-3 text-[10px] font-black uppercase tracking-[0.15em] transition-none relative ${
                              activeTab === tab.id 
                                ? 'text-gray-900 dark:text-white' 
                                : 'text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                          >
                            {tab.label}
                            {activeTab === tab.id && (
                              <div className="absolute bottom-0 inset-x-0 h-1 bg-gray-900 dark:bg-white" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Content Area */}
              <div className="w-full py-12">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${selectedDrugs.map(d => d.id).join('-')}-${activeTab}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                  >
                    {selectedDrugs.length > 0 ? renderFdaContent() : (
                      <div className="h-full flex items-center justify-center pt-20">
                        <div className="text-center">
                          <span className="material-symbols-rounded text-gray-200 dark:text-white/5" style={{ fontSize: '120px' }}>
                            medication
                          </span>
                          <p className="mt-4 text-sm font-black text-gray-400 uppercase tracking-widest">
                            Select multiple drugs to analyze interactions
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrugInteractionsPage;
