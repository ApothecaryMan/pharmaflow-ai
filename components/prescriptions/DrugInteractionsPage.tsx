import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '../common/PageHeader';
import { SearchEngineInput } from '../common/SearchEngineInput';
import { SmallCard } from '../common/SmallCard';
import { SegmentedControl } from '../common/SegmentedControl';
import { CARD_BASE } from '../../utils/themeStyles';
import { openFdaService, FdaDrugLabel } from '../../services/inventory/openFdaService';
import { inventorySearchEngine } from '../../services/search/drugSearchService';
import type { Drug } from '../../types';

interface DrugInteractionsPageProps {
  t: any;
  language?: string;
  inventory?: Drug[];
}

type TabType = 'interactions' | 'warnings' | 'contraindications' | 'usage';

export const DrugInteractionsPage: React.FC<DrugInteractionsPageProps> = ({ t, language = 'ar', inventory = [] }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [fdaData, setFdaData] = useState<Map<string, FdaDrugLabel | null>>(new Map());
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('interactions');
  const [results, setResults] = useState<Drug[]>([]);

  // Initialize Search Engine with inventory if provided
  useEffect(() => {
    if (inventory.length > 0) {
      inventorySearchEngine.indexData(inventory);
    }
  }, [inventory]);

  const handleDrugSelect = async (drug: Drug) => {
    setSelectedDrug(drug);
    setLoading(true);
    
    // Generic names can be an array for combination drugs
    const genericNames = Array.isArray(drug.genericName) 
      ? drug.genericName 
      : [drug.genericName];
    
    try {
      const results = await openFdaService.fetchInteractionsForIngredients(genericNames);
      setFdaData(results);
    } catch (err) {
      console.error('Failed to fetch FDA data:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasAnyData = useMemo(() => {
    return Array.from(fdaData.values()).some(data => data !== null);
  }, [fdaData]);

  const ingredientResults = useMemo(() => {
    return Array.from(fdaData.entries()).map(([name, data]) => ({
      name,
      data
    }));
  }, [fdaData]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 border-4 border-primary-500/20 border-t-primary-500 rounded-full animate-spin" />
          <p className="text-gray-500 animate-pulse">{t.loading}</p>
        </div>
      );
    }

    if (!selectedDrug) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 opacity-60">
          <span className="material-symbols-rounded text-6xl mb-4">clinical_notes</span>
          <p className="text-lg">{t.selectDrug}</p>
        </div>
      );
    }

    if (!hasAnyData) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-amber-50 dark:bg-amber-900/20 text-amber-500 rounded-full flex items-center justify-center">
            <span className="material-symbols-rounded text-3xl">error</span>
          </div>
          <div>
            <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-1">{t.noFdaData}</h4>
            <p className="text-sm text-gray-500">{t.notApproved}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {ingredientResults.map(({ name, data }, idx) => (
              <div key={idx} className={`${CARD_BASE} rounded-2xl p-6 border-l-4 border-l-primary-500`}>
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100 dark:border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center text-primary-600">
                      <span className="material-symbols-rounded">science</span>
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-wider">{name}</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase">{t.activeIngredients}</p>
                    </div>
                  </div>
                  {data?.effective_time && (
                    <span className="text-[10px] text-gray-400 bg-gray-50 dark:bg-white/5 px-2 py-1 rounded">
                      FDA Update: {data.effective_time.substring(0, 4)}
                    </span>
                  )}
                </div>

                <div className="prose prose-sm dark:prose-invert max-w-none">
                  {data ? (
                    <div className="space-y-4">
                      {activeTab === 'interactions' && (
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {data.drug_interactions?.[0] || t.noInteractions}
                        </div>
                      )}
                      {activeTab === 'warnings' && (
                        <div className="text-amber-700 dark:text-amber-400 leading-relaxed whitespace-pre-wrap bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-xl border border-amber-100/50 dark:border-amber-500/10">
                          {data.warnings?.[0] || 'No specific warnings reported.'}
                        </div>
                      )}
                      {activeTab === 'contraindications' && (
                        <div className="text-red-700 dark:text-red-400 leading-relaxed whitespace-pre-wrap bg-red-50/50 dark:bg-red-900/10 p-4 rounded-xl border border-red-100/50 dark:border-red-500/10">
                          {data.contraindications?.[0] || 'No contraindications listed.'}
                        </div>
                      )}
                      {activeTab === 'usage' && (
                        <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {data.indications_and_usage?.[0] || 'No usage data available.'}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-gray-400 italic py-4">
                      {t.noFdaData}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-4">
          <span className="material-symbols-rounded text-[14px]">info</span>
          {t.source}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto pb-10 scrollbar-hide">
      <PageHeader
        mb="mb-6"
        centerContent={
          <div className="w-full max-w-2xl">
            <SearchEngineInput
              value={searchQuery}
              onSearchChange={setSearchQuery}
              inventory={inventory}
              onResultsChange={setResults}
              placeholder={t.searchPlaceholder}
              autoFocus
            />
          </div>
        }
        bottomContent={
          selectedDrug && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              <SmallCard
                title={selectedDrug.name}
                value={Array.isArray(selectedDrug.genericName) ? selectedDrug.genericName.length : 1}
                valueSuffix={` ${t.ingredientCount}`}
                icon="medication"
                iconColor="primary"
                isLoading={loading}
              />
              <SmallCard
                title={t.activeIngredients}
                value={selectedDrug.genericName.toString().substring(0, 30) + '...'}
                type="text"
                icon="science"
                iconColor="indigo"
                isLoading={loading}
              />
              <SmallCard
                title="FDA Data Status"
                value={hasAnyData ? 'Available' : 'Not Found'}
                type="text"
                icon={hasAnyData ? 'check_circle' : 'cancel'}
                iconColor={hasAnyData ? 'emerald' : 'amber'}
                isLoading={loading}
              />
            </div>
          )
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Search Results */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] px-2 flex items-center justify-between">
            {language.toLowerCase() === 'ar' ? 'نتائج البحث' : 'Search Results'}
            <span className="bg-gray-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{results.length}</span>
          </h3>
          
          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 scrollbar-hide">
            {results.map((drug) => (
              <button
                key={drug.id}
                onClick={() => handleDrugSelect(drug)}
                className={`w-full text-start p-3 rounded-xl transition-all border ${
                  selectedDrug?.id === drug.id
                    ? 'bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-500/30'
                    : 'bg-white border-gray-100 hover:border-gray-300 dark:bg-gray-900/40 dark:border-white/5 dark:hover:border-white/10'
                }`}
              >
                <div className="font-bold text-gray-900 dark:text-white truncate">{drug.name}</div>
                <div className="text-[10px] text-gray-500 font-medium truncate mt-1">
                  {Array.isArray(drug.genericName) ? drug.genericName.join(' + ') : drug.genericName}
                </div>
              </button>
            ))}
            
            {results.length === 0 && searchQuery && (
              <div className="text-center py-10 text-gray-400 text-sm">
                No products found
              </div>
            )}
          </div>
        </div>

        {/* Main Content: FDA Data */}
        <div className="lg:col-span-3 space-y-6">
          {selectedDrug && hasAnyData && (
            <div className="flex justify-center mb-6">
              <SegmentedControl
                options={[
                  { label: t.interactions, value: 'interactions' },
                  { label: t.warnings, value: 'warnings' },
                  { label: t.contraindications, value: 'contraindications' },
                  { label: t.usage || (language.toLowerCase() === 'ar' ? 'دواعي الاستعمال' : 'Usage'), value: 'usage' },
                ]}
                value={activeTab}
                onChange={(v) => setActiveTab(v as any)}
                size="md"
                shape="pill"
                className="w-full max-w-xl"
              />
            </div>
          )}

          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default DrugInteractionsPage;
