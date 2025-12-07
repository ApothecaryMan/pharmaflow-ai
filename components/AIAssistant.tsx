

import React, { useState } from 'react';
import { analyzeDrugInteraction } from '../services/geminiService';

interface AIAssistantProps {
  color: string;
  t: any;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ color, t }) => {
  const [drugName, setDrugName] = useState('');
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!drugName) return;
    
    setLoading(true);
    setResponse('');
    try {
      const result = await analyzeDrugInteraction(drugName, query || "General safety information");
      setResponse(result);
    } catch (err) {
      setResponse(t.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto animate-fade-in">
      <div className={`w-full bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-xl border border-gray-200 dark:border-gray-800`}>
        <div className="flex flex-col items-center mb-6 text-center">
            <div className={`w-14 h-14 rounded-full bg-${color}-100 dark:bg-${color}-900 flex items-center justify-center mb-3`}>
                <span className={`material-symbols-rounded text-3xl text-${color}-600 dark:text-${color}-400`}>smart_toy</span>
            </div>
            <h2 className="text-2xl font-medium tracking-tight text-gray-900 dark:text-gray-50">{t.title}</h2>
            <p className="text-gray-500 max-w-sm mt-1 text-sm">{t.subtitle}</p>
        </div>

        <form onSubmit={handleAnalyze} className="space-y-4 w-full">
            <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 ms-4">{t.drugLabel}</label>
                <input 
                    type="text" 
                    required
                    value={drugName}
                    onChange={(e) => setDrugName(e.target.value)}
                    placeholder={t.placeholderDrug}
                    className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                />
            </div>
            <div>
                <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1 ms-4">{t.questionLabel}</label>
                <input 
                    type="text" 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.placeholderQuestion}
                    className="w-full p-3 rounded-2xl bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-800 focus:outline-none focus:ring-2 transition-all"
                    style={{ '--tw-ring-color': `var(--color-${color}-500)` } as any}
                />
            </div>

            <button 
                type="submit" 
                disabled={loading}
                className={`w-full py-3 rounded-2xl bg-${color}-600 hover:bg-${color}-700 text-white font-bold text-base shadow-lg shadow-${color}-200 dark:shadow-none transition-all active:scale-95 flex justify-center items-center gap-2`}
            >
                {loading ? (
                    <>
                        <span className="animate-spin material-symbols-rounded text-xl">progress_activity</span>
                        {t.btnAnalyzing}
                    </>
                ) : (
                    <>
                        <span className="material-symbols-rounded text-xl">auto_awesome</span>
                        {t.btnAsk}
                    </>
                )}
            </button>
        </form>

        {response && (
            <div className="mt-6 p-5 bg-gray-50 dark:bg-gray-950 rounded-3xl border border-gray-200 dark:border-gray-800 animate-fade-in">
                <div className="flex items-start gap-3">
                    <span className={`material-symbols-rounded text-${color}-600 mt-0.5 text-xl`}>info</span>
                    <div className="prose dark:prose-invert text-gray-700 dark:text-gray-300 text-sm leading-relaxed whitespace-pre-line">
                        {response}
                    </div>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
