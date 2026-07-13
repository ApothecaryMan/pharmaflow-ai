import type React from 'react';
import { useState } from 'react';
import { Sliders, Maximize, GitCommit, Sparkles, Layers, MinusSquare } from 'lucide-react';
import { CARD_BASE } from '../../utils/themeStyles';
import { ComboBox } from './ComboBox';
import { FilterDropdownPlayground as FilterDropdown } from './FilterDropdownPlayground';

interface SimpleItem {
  id: string;
  name: string;
  nameAr: string;
  icon: string;
}

export const FilterDropdownTest: React.FC = () => {
  const testItems: SimpleItem[] = [
    { id: '1', name: 'Main Pharmacy', nameAr: 'الصيدلية الرئيسية', icon: 'store' },
    { id: '2', name: 'Downtown Branch', nameAr: 'فرع وسط البلد', icon: 'location_on' },
    {
      id: '3',
      name: 'North Clinic Outlet',
      nameAr: 'منفذ العيادة الشمالي',
      icon: 'local_hospital',
    },
    { id: '4', name: 'Airport 24/7 Branch', nameAr: 'فرع المطار 24 ساعة', icon: 'schedule' },
  ];

  // State for Visual Variations
  const [selected1, setSelected1] = useState<SimpleItem>(testItems[0]);
  const [selected2, setSelected2] = useState<SimpleItem>(testItems[0]);
  const [selected3, setSelected3] = useState<SimpleItem>(testItems[0]);
  const [selected4, setSelected4] = useState<SimpleItem>(testItems[0]);

  // State for ComboBox Variations
  const [selectedCombo1, setSelectedCombo1] = useState<SimpleItem>(testItems[0]);
  const [selectedCombo2, setSelectedCombo2] = useState<SimpleItem>(testItems[0]);
  const [selectedCombo3, setSelectedCombo3] = useState<SimpleItem>(testItems[0]);

  // State for Behavioral Tests
  const [selectedDisabled, setSelectedDisabled] = useState<SimpleItem>(testItems[0]);
  const [selectedSingle, setSelectedSingle] = useState<SimpleItem>({
    id: 'alone',
    name: 'Single Item Only',
    nameAr: 'عنصر وحيد فقط',
    icon: 'info',
  });
  const [selectedLong, setSelectedLong] = useState<SimpleItem>({
    id: 'long',
    name: 'Extremely Long Category Name That Might Overflow Sibling Boundaries',
    nameAr: 'اسم طويل جداً',
    icon: 'text_fields',
  });

  // Slider States
  const [normal1, setNormal1] = useState(50);
  const [normal2, setNormal2] = useState(50);
  const [normal3, setNormal3] = useState(50);

  const limitValue = 75;
  const [limit1, setLimit1] = useState(30);
  const [limit2, setLimit2] = useState(30);
  const [limit3, setLimit3] = useState(30);

  const handleLimitChange = (setter: React.Dispatch<React.SetStateAction<number>>, val: number) => {
    setter(Math.min(val, limitValue));
  };

  const [step1, setStep1] = useState(25);
  const [step2, setStep2] = useState(50);
  const [step3, setStep3] = useState(75);

  // Dual Slider States
  const [dual1A, setDual1A] = useState(30);
  const [dual1B, setDual1B] = useState(70);
  const [dual2A, setDual2A] = useState(45);
  const [dual2B, setDual2B] = useState(85);
  const [dual3A, setDual3A] = useState(20);
  const [dual3B, setDual3B] = useState(60);

  return (
    <div className='p-6 max-w-[1800px] w-full mx-auto h-screen overflow-hidden flex flex-col'>
      {/* Header */}
      <div className='flex flex-col gap-2 mb-6 shrink-0'>
        <h1 className='text-2xl font-black text-gray-800 dark:text-gray-100'>
          Components Playground
        </h1>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Comprehensive visual design verification and edge-case behaviors container.
        </p>
      </div>

      <div className='flex flex-row gap-6 flex-1 min-h-0 overflow-hidden'>
        {/* Left Column: Filters */}
        <div className='w-1/2 flex flex-col gap-6 overflow-y-auto pr-2 pb-20 custom-scrollbar'>
          {/* CONTAINER 1: Visual Styles and Configurations */}
          <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-4'>
          {/* Variant 1: Input Variant */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              Input Variant
            </label>
            <div className='relative w-full h-10'>
              <FilterDropdown<SimpleItem>
                items={testItems}
                selectedItem={selected1}
                onSelect={setSelected1}
                variant='input'
                className='w-full'
                minHeight='40px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => (
                  <div className='flex items-center gap-2'>
                    <span className='material-symbols-rounded text-indigo-500 text-[18px]'>
                      {item?.icon || 'store'}
                    </span>
                    <span className='truncate'>{item ? item.name : 'Select...'}</span>
                  </div>
                )}
                renderItem={(item) => (
                  <div className='flex items-center justify-between w-full py-1 text-sm text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400'>
                    <div className='flex items-center gap-2'>
                      <span className='material-symbols-rounded text-[18px]'>{item.icon}</span>
                      <span>{item.name}</span>
                    </div>
                    <span className='text-xs text-gray-400'>{item.nameAr}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Variant 2: Minimal Centered */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              Minimal Variant
            </label>
            <div className='relative w-full h-8 flex justify-start'>
              <FilterDropdown<SimpleItem>
                items={testItems}
                selectedItem={selected2}
                onSelect={setSelected2}
                variant='minimal'
                rounded='full'
                className='w-full'
                minHeight='32px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => (
                  <div className='flex items-center gap-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold border border-indigo-200/50 dark:border-indigo-800/30 w-full justify-between'>
                    <div className='flex items-center gap-1.5 truncate'>
                      <span className='material-symbols-rounded text-[16px]'>{item?.icon}</span>
                      <span className='truncate'>{item?.name}</span>
                    </div>
                    <span className='material-symbols-rounded text-[14px] ml-1 shrink-0'>
                      expand_more
                    </span>
                  </div>
                )}
                renderItem={(item) => (
                  <div className='flex items-center gap-2 py-1 text-xs text-gray-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400'>
                    <span className='material-symbols-rounded text-[16px]'>{item.icon}</span>
                    <span>{item.name}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* Variant 3: Dense */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              Dense Variant
            </label>
            <div className='relative w-full h-8'>
              <FilterDropdown<SimpleItem>
                items={testItems}
                selectedItem={selected3}
                onSelect={setSelected3}
                variant='input'
                dense
                className='w-full'
                minHeight='32px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => (
                  <span className='text-xs font-semibold text-gray-700 dark:text-gray-200 truncate block'>
                    {item?.name}
                  </span>
                )}
                renderItem={(item) => (
                  <span className='text-xs py-0.5 text-gray-700 dark:text-gray-200 block truncate'>
                    {item.name}
                  </span>
                )}
              />
            </div>
          </div>

          {/* Variant 4: On Background */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              On Background variant
            </label>
            <div className='relative w-full h-10'>
              <div className='p-2 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-divider w-full h-14'>
                <FilterDropdown<SimpleItem>
                  items={testItems}
                  selectedItem={selected4}
                  onSelect={setSelected4}
                  variant='input'
                  onBackground
                  className='w-full'
                  minHeight='38px'
                  keyExtractor={(item) => item.id}
                  renderSelected={(item) => (
                    <span className='text-xs font-bold text-indigo-600 dark:text-indigo-400 truncate block'>
                      {item?.nameAr}
                    </span>
                  )}
                  renderItem={(item) => (
                    <span className='text-xs py-0.5 text-gray-700 dark:text-gray-200 block truncate'>
                      {item.nameAr}
                    </span>
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER 2: ComboBox Premium Glassmorphism Design */}
      <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 py-4'>
          {/* ComboBox Variant 1: Standard Input with Search Icon */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              ComboBox Standard (Input)
            </label>
            <div className='relative w-full h-10'>
              <ComboBox<SimpleItem>
                items={testItems}
                selectedItem={selectedCombo1}
                onSelect={setSelectedCombo1}
                variant='input'
                className='w-full'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => <span>{item?.name}</span>}
                renderItem={(item) => (
                  <div className='flex items-center justify-between w-full text-sm text-gray-700 dark:text-gray-200'>
                    <span>{item.name}</span>
                    <span className='text-xs text-indigo-500 font-medium'>{item.nameAr}</span>
                  </div>
                )}
              />
            </div>
          </div>

          {/* ComboBox Variant 2: Minimalist Design */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              ComboBox Minimal
            </label>
            <div className='relative w-full h-8'>
              <ComboBox<SimpleItem>
                items={testItems}
                selectedItem={selectedCombo2}
                onSelect={setSelectedCombo2}
                variant='minimal'
                className='w-full'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => (
                  <span className='text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-3 py-1.5 rounded-full'>
                    {item?.name}
                  </span>
                )}
                renderItem={(item) => <span className='text-xs'>{item.name}</span>}
              />
            </div>
          </div>

          {/* ComboBox Variant 3: Dense Design */}
          <div className='flex flex-col gap-3'>
            <label className='text-xs font-bold text-gray-600 dark:text-gray-400'>
              ComboBox Dense
            </label>
            <div className='relative w-full h-8'>
              <ComboBox<SimpleItem>
                items={testItems}
                selectedItem={selectedCombo3}
                onSelect={setSelectedCombo3}
                variant='input'
                dense
                className='w-full'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => <span>{item?.name}</span>}
                renderItem={(item) => <span className='text-xs'>{item.name}</span>}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER 3: Behavioral & Edge Case Testing */}
      <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 py-4'>
          {/* Test Case A: Disabled State */}
          <div className='flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>
                A. Disabled State
              </span>
              <p className='text-[10px] text-gray-400 mt-0.5'>
                Locks selection and prevent clicks.
              </p>
            </div>
            <div className='relative w-full h-10'>
              <FilterDropdown<SimpleItem>
                items={testItems}
                selectedItem={selectedDisabled}
                onSelect={setSelectedDisabled}
                variant='input'
                disabled={true}
                className='w-full'
                minHeight='40px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => (
                  <span className='truncate block'>{item?.name} (Disabled)</span>
                )}
                renderItem={(item) => <span>{item.name}</span>}
              />
            </div>
          </div>

          {/* Test Case B: Single Item */}
          <div className='flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>
                B. Single Item
              </span>
              <p className='text-[10px] text-gray-400 mt-0.5'>Removes borders/bg automatically.</p>
            </div>
            <div className='relative w-full h-10'>
              <FilterDropdown<SimpleItem>
                items={[selectedSingle]}
                selectedItem={selectedSingle}
                onSelect={setSelectedSingle}
                variant='input'
                className='w-full'
                minHeight='40px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => <span className='truncate block'>{item?.name}</span>}
                renderItem={(item) => <span>{item.name}</span>}
              />
            </div>
          </div>

          {/* Test Case C: Long Text Wrap / Auto-Hide Arrow */}
          <div className='flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>
                C. Long Text & Auto-Hide
              </span>
              <p className='text-[10px] text-gray-400 mt-0.5'>
                Hides arrow when text length is {`> 3`}.
              </p>
            </div>
            <div className='relative w-full h-10'>
              <FilterDropdown<SimpleItem>
                items={[selectedLong]}
                selectedItem={selectedLong}
                onSelect={setSelectedLong}
                variant='input'
                autoHideArrow={true}
                className='w-full'
                minHeight='40px'
                keyExtractor={(item) => item.id}
                renderSelected={(item) => <span className='truncate block pr-2'>{item?.name}</span>}
                renderItem={(item) => <span className='block py-1 truncate'>{item.name}</span>}
              />
            </div>
          </div>
        </div>
      </div>
        </div>

        {/* Right Column: Sliders */}
        <div className='w-1/2 flex flex-col gap-6 overflow-y-auto pl-2 pr-2 pb-20 custom-scrollbar border-l border-divider/50' dir='ltr'>
          {/* CONTAINER 4: Normal Sliders */}
          <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='flex items-center gap-3 border-b border-divider pb-4'>
          <div className='p-2 bg-blue-500/10 rounded-lg text-blue-500'>
            <Sliders size={24} />
          </div>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-100'>Slider UI: Normal (عادي)</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 py-4'>
          {/* Normal - Glow & Radius */}
          <div className='bg-slate-900 border border-slate-800 rounded-3xl p-6 relative overflow-hidden group hover:border-cyan-500/30 transition-colors'>
            <div className='absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500 opacity-50' />
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-medium text-cyan-400 flex items-center gap-2'>
                <Sparkles size={16} /> Neon Glow & Radius
              </span>
              <span className='text-2xl font-bold text-slate-100'>{normal1}</span>
            </div>
            <div className='relative w-full py-4'>
              <input
                type='range'
                min='0'
                max='100'
                value={normal1}
                onChange={(e) => setNormal1(Number(e.target.value))}
                className='w-full h-3 bg-slate-800 rounded-full appearance-none outline-none
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-6 
                  [&::-webkit-slider-thumb]:h-6 
                  [&::-webkit-slider-thumb]:bg-cyan-400 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-[0_0_20px_rgba(34,211,238,0.8)]
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-125'
                style={{ background: `linear-gradient(to right, #22d3ee ${normal1}%, #1e293b ${normal1}%)` }}
              />
            </div>
          </div>

          {/* Normal - Shadow & Square */}
          <div className='bg-slate-100 text-slate-900 p-6 relative group shadow-[8px_8px_0px_rgba(0,0,0,1)] border-2 border-slate-900'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-bold uppercase tracking-wider flex items-center gap-2'>
                <MinusSquare size={16} /> Brutalist & Flat
              </span>
              <span className='text-2xl font-black'>{normal2}</span>
            </div>
            <div className='relative w-full py-4'>
              <input
                type='range'
                min='0'
                max='100'
                value={normal2}
                onChange={(e) => setNormal2(Number(e.target.value))}
                className='w-full h-4 bg-slate-300 appearance-none outline-none border-2 border-slate-900
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-6 
                  [&::-webkit-slider-thumb]:h-8 
                  [&::-webkit-slider-thumb]:bg-orange-500 
                  [&::-webkit-slider-thumb]:border-2
                  [&::-webkit-slider-thumb]:border-slate-900
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-[4px_4px_0px_rgba(15,23,42,1)]
                  [&::-webkit-slider-thumb]:active:translate-y-[2px]
                  [&::-webkit-slider-thumb]:active:translate-x-[2px]
                  [&::-webkit-slider-thumb]:active:shadow-[2px_2px_0px_rgba(15,23,42,1)]'
                style={{ background: `linear-gradient(to right, #f97316 ${normal2}%, #cbd5e1 ${normal2}%)` }}
              />
            </div>
          </div>

          {/* Normal - Soft UI (Glassmorphism) */}
          <div className='bg-white/5 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-xl'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2'>
                <Layers size={16} /> Clean Soft
              </span>
              <span className='text-2xl font-light text-gray-900 dark:text-white'>{normal3}%</span>
            </div>
            <div className='relative w-full py-4'>
              <input
                type='range'
                min='0'
                max='100'
                value={normal3}
                onChange={(e) => setNormal3(Number(e.target.value))}
                className='w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-full appearance-none outline-none
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-5 
                  [&::-webkit-slider-thumb]:h-5 
                  [&::-webkit-slider-thumb]:bg-indigo-500 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:shadow-[0_4px_10px_rgba(0,0,0,0.2)]
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border
                  [&::-webkit-slider-thumb]:border-gray-200'
                style={{ background: `linear-gradient(to right, #6366f1 ${normal3}%, transparent ${normal3}%)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER 5: Limited Sliders */}
      <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='flex items-center gap-3 border-b border-divider pb-4'>
          <div className='p-2 bg-red-500/10 rounded-lg text-red-500'>
            <Maximize size={24} />
          </div>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-100'>Slider UI: Limited (رقم معين {limitValue})</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 py-4'>
          {/* Limited - Warning Indicator */}
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-6 relative'>
            <div className='flex justify-between items-end mb-6'>
              <div>
                <span className='text-sm font-medium text-slate-400'>Warning Glow</span>
                <div className='text-xs text-slate-500 mt-1'>Soft lock</div>
              </div>
              <div className={`text-3xl font-bold ${limit1 >= limitValue ? 'text-red-500' : 'text-slate-100'}`}>
                {limit1}
              </div>
            </div>
            <div className='relative w-full py-4'>
              <input
                type='range'
                min='0'
                max='100'
                value={limit1}
                onChange={(e) => handleLimitChange(setLimit1, Number(e.target.value))}
                className={`w-full h-2 bg-slate-800 rounded-full appearance-none outline-none
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-5 
                  [&::-webkit-slider-thumb]:h-5 
                  [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:ring-4
                  ${limit1 >= limitValue ? '[&::-webkit-slider-thumb]:ring-red-500/40 [&::-webkit-slider-thumb]:bg-red-400' : '[&::-webkit-slider-thumb]:ring-blue-500/20'}`}
                style={{ background: `linear-gradient(to right, ${limit1 >= limitValue ? '#ef4444' : '#3b82f6'} ${limit1}%, #1e293b ${limit1}%)` }}
              />
              <div className='absolute top-1/2 -translate-y-1/2 w-1 h-4 bg-red-500/80 rounded-full pointer-events-none' style={{ left: `${limitValue}%` }} />
            </div>
          </div>

          {/* Limited - Visual Segment */}
          <div className='bg-slate-900 border border-slate-800 rounded-lg p-6 relative'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-medium text-emerald-400'>Restricted Zone</span>
              <span className='text-2xl font-mono text-emerald-400'>{limit2}/{limitValue}</span>
            </div>
            <div className='relative w-full py-4'>
              <div className='absolute top-1/2 -translate-y-1/2 w-full h-3 rounded-md overflow-hidden flex pointer-events-none'>
                <div className='h-full bg-slate-800' style={{ width: `${limitValue}%` }} />
                <div className='h-full bg-red-950/40' style={{ width: `${100 - limitValue}%`, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(239,68,68,0.2) 5px, rgba(239,68,68,0.2) 10px)' }} />
              </div>
              <input
                type='range'
                min='0'
                max='100'
                value={limit2}
                onChange={(e) => handleLimitChange(setLimit2, Number(e.target.value))}
                className='w-full h-3 bg-transparent appearance-none outline-none relative z-10
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-4 
                  [&::-webkit-slider-thumb]:h-8 
                  [&::-webkit-slider-thumb]:bg-emerald-400 
                  [&::-webkit-slider-thumb]:rounded-sm
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-lg'
                style={{ background: `linear-gradient(to right, #34d399 ${limit2}%, transparent ${limit2}%)` }}
              />
            </div>
          </div>

          {/* Limited - Hard Input Max limit */}
          <div className='bg-gradient-to-b from-slate-800 to-slate-900 rounded-3xl p-6 relative shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] border border-slate-700'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-semibold text-purple-400'>Fixed End</span>
              <span className='text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500'>
                {limit3}
              </span>
            </div>
            <div className='relative w-full py-4'>
              <input
                type='range'
                min='0'
                max={limitValue} // HTML limit
                value={limit3}
                onChange={(e) => setLimit3(Number(e.target.value))}
                className='w-full h-2 bg-slate-800 rounded-full appearance-none outline-none
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-6 
                  [&::-webkit-slider-thumb]:h-6 
                  [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:border-4
                  [&::-webkit-slider-thumb]:border-purple-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(168,85,247,0.6)]'
                style={{ background: `linear-gradient(to right, #a855f7 ${(limit3 / limitValue) * 100}%, #1e293b ${(limit3 / limitValue) * 100}%)` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER 6: Stepped Sliders */}
      <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='flex items-center gap-3 border-b border-divider pb-4'>
          <div className='p-2 bg-amber-500/10 rounded-lg text-amber-500'>
            <GitCommit size={24} />
          </div>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-100'>Slider UI: Stepped (متدرج)</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 py-4'>
          {/* Stepped - Tick Marks */}
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-6 relative'>
            <div className='flex justify-between items-center mb-8'>
              <span className='text-sm font-medium text-slate-400'>Visual Ticks</span>
              <span className='text-2xl font-bold text-amber-400'>{step1}</span>
            </div>
            <div className='relative w-full pb-6'>
              <input
                type='range'
                min='0'
                max='100'
                step='25'
                value={step1}
                onChange={(e) => setStep1(Number(e.target.value))}
                className='w-full h-2 bg-slate-800 rounded-full appearance-none outline-none z-10 relative
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-5 
                  [&::-webkit-slider-thumb]:h-5 
                  [&::-webkit-slider-thumb]:bg-amber-400 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:ring-4
                  [&::-webkit-slider-thumb]:ring-slate-900'
                style={{ background: `linear-gradient(to right, #fbbf24 ${step1}%, transparent ${step1}%)` }}
              />
              <div className='absolute top-[18px] left-0 w-full flex justify-between px-[10px] pointer-events-none'>
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div key={tick} className='flex flex-col items-center'>
                    <div className={`w-1 h-2 rounded-full ${step1 >= tick ? 'bg-amber-400' : 'bg-slate-700'}`} />
                    <span className='text-[10px] text-slate-500 mt-1'>{tick}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stepped - Segmented Blocks */}
          <div className='bg-slate-100 text-slate-900 rounded-xl p-6 relative shadow-lg'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-sm font-bold uppercase tracking-wider text-slate-500'>Blocky</span>
              <span className='text-xl font-black bg-indigo-600 text-white px-3 py-1 rounded-md'>{step2}</span>
            </div>
            <div className='relative w-full py-4'>
              <div className='absolute top-1/2 -translate-y-1/2 w-full flex gap-1 pointer-events-none px-1'>
                {[20, 40, 60, 80, 100].map((tick) => (
                  <div key={tick} className={`flex-1 h-6 rounded-sm transition-colors ${step2 >= tick ? 'bg-indigo-500' : 'bg-slate-300'}`} />
                ))}
              </div>
              <input
                type='range'
                min='0'
                max='100'
                step='20'
                value={step2}
                onChange={(e) => setStep2(Number(e.target.value))}
                className='w-full h-6 bg-transparent appearance-none outline-none relative z-10 cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-2 
                  [&::-webkit-slider-thumb]:h-8 
                  [&::-webkit-slider-thumb]:bg-slate-900 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-md'
              />
            </div>
          </div>

          {/* Stepped - Glowing Nodes */}
          <div className='bg-slate-900 border border-slate-800 rounded-3xl p-6 relative flex flex-col justify-center'>
            <div className='flex justify-between items-center mb-8'>
              <span className='text-sm font-medium text-emerald-400'>Nodes</span>
              <span className='text-2xl font-bold text-emerald-400 shadow-emerald-400/50 drop-shadow-md'>{step3}</span>
            </div>
            <div className='relative w-full'>
              <div className='absolute top-1/2 -translate-y-1/2 w-full h-1 bg-slate-800 pointer-events-none' />
              <div className='absolute top-1/2 -translate-y-1/2 h-1 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] pointer-events-none transition-all duration-300' style={{ width: `${step3}%` }} />
              <div className='absolute top-1/2 -translate-y-1/2 w-full flex justify-between pointer-events-none'>
                {[0, 25, 50, 75, 100].map((tick) => (
                  <div 
                    key={tick} 
                    className={`w-3 h-3 rounded-full transition-all duration-300 ${
                      step3 >= tick ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)] scale-125' : 'bg-slate-700'
                    }`} 
                  />
                ))}
              </div>
              <input
                type='range'
                min='0'
                max='100'
                step='25'
                value={step3}
                onChange={(e) => setStep3(Number(e.target.value))}
                className='w-full h-8 bg-transparent appearance-none outline-none relative z-10
                  [&::-webkit-slider-thumb]:appearance-none 
                  [&::-webkit-slider-thumb]:w-6 
                  [&::-webkit-slider-thumb]:h-6 
                  [&::-webkit-slider-thumb]:bg-white 
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:border-4
                  [&::-webkit-slider-thumb]:border-emerald-500
                  [&::-webkit-slider-thumb]:shadow-lg'
              />
            </div>
          </div>
        </div>
      </div>

      {/* CONTAINER 7: Compact Dual Sliders */}
      <div className={`p-6 rounded-3xl ${CARD_BASE} border border-divider flex flex-col gap-6`}>
        <div className='flex items-center gap-3 border-b border-divider pb-4'>
          <div className='p-2 bg-pink-500/10 rounded-lg text-pink-500'>
            <Layers size={24} />
          </div>
          <h2 className='text-xl font-bold text-gray-800 dark:text-gray-100'>Slider UI: Compact Dual (مزدوج مدمج)</h2>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-3 gap-8 py-4'>
          
          {/* Dual - Unified Pill */}
          <div className='bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-center'>
            <div className='flex justify-between items-center mb-4'>
              <span className='text-xs font-medium text-slate-400'>Unified Pill</span>
              <div className='flex gap-2 text-xs font-bold'>
                <span className='text-blue-400'>{dual1A}</span>
                <span className='text-slate-600'>/</span>
                <span className='text-purple-400'>{dual1B}</span>
              </div>
            </div>
            <div className='w-full bg-slate-800 p-1.5 rounded-full flex flex-col gap-1'>
              <input type='range' min='0' max='100' value={dual1A} onChange={(e) => setDual1A(Number(e.target.value))} 
                className='w-full h-1.5 appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer' 
                style={{ background: `linear-gradient(to right, #60a5fa ${dual1A}%, transparent ${dual1A}%)` }} 
              />
              <input type='range' min='0' max='100' value={dual1B} onChange={(e) => setDual1B(Number(e.target.value))} 
                className='w-full h-1.5 appearance-none bg-transparent outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer' 
                style={{ background: `linear-gradient(to right, #c084fc ${dual1B}%, transparent ${dual1B}%)` }} 
              />
            </div>
          </div>

          {/* Dual - Micro HUD */}
          <div className='bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-center gap-3'>
            <div className='flex justify-between items-center'>
              <span className='text-[10px] font-mono text-emerald-400 uppercase tracking-widest'>Alpha</span>
              <span className='text-[10px] font-mono text-emerald-400'>{dual2A}%</span>
            </div>
            <input type='range' min='0' max='100' value={dual2A} onChange={(e) => setDual2A(Number(e.target.value))} 
              className='w-full h-0.5 appearance-none bg-slate-800 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-emerald-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(52,211,153,0.8)] [&::-webkit-slider-thumb]:cursor-pointer' 
              style={{ background: `linear-gradient(to right, #34d399 ${dual2A}%, transparent ${dual2A}%)` }} 
            />
            
            <div className='flex justify-between items-center mt-2'>
              <span className='text-[10px] font-mono text-cyan-400 uppercase tracking-widest'>Beta</span>
              <span className='text-[10px] font-mono text-cyan-400'>{dual2B}%</span>
            </div>
            <input type='range' min='0' max='100' value={dual2B} onChange={(e) => setDual2B(Number(e.target.value))} 
              className='w-full h-0.5 appearance-none bg-slate-800 outline-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-1.5 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,0.8)] [&::-webkit-slider-thumb]:cursor-pointer' 
              style={{ background: `linear-gradient(to right, #22d3ee ${dual2B}%, transparent ${dual2B}%)` }} 
            />
          </div>

          {/* Dual - Overlapped Axis */}
          <div className='bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex flex-col justify-center'>
            <div className='flex justify-between items-center mb-6'>
              <span className='text-xs font-medium text-slate-300'>Overlapped Axis</span>
            </div>
            <div className='relative w-full h-2 bg-slate-800 rounded-full flex items-center'>
              <input type='range' min='0' max='100' value={dual3A} onChange={(e) => setDual3A(Number(e.target.value))} 
                className='absolute w-full h-2 appearance-none bg-transparent outline-none z-20 pointer-events-none
                [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:rounded-t-md [&::-webkit-slider-thumb]:-translate-y-1.5 [&::-webkit-slider-thumb]:cursor-pointer' 
                style={{ background: `linear-gradient(to right, rgba(249,115,22,0.4) ${dual3A}%, transparent ${dual3A}%)` }} 
              />
              <input type='range' min='0' max='100' value={dual3B} onChange={(e) => setDual3B(Number(e.target.value))} 
                className='absolute w-full h-2 appearance-none bg-transparent outline-none z-10 pointer-events-none
                [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-pink-500 [&::-webkit-slider-thumb]:rounded-b-md [&::-webkit-slider-thumb]:translate-y-1.5 [&::-webkit-slider-thumb]:cursor-pointer' 
                style={{ background: `linear-gradient(to right, rgba(236,72,153,0.4) ${dual3B}%, transparent ${dual3B}%)` }} 
              />
            </div>
            <div className='flex justify-between mt-6 text-[10px] font-bold'>
              <span className='text-orange-400'>TOP: {dual3A}</span>
              <span className='text-pink-400'>BTM: {dual3B}</span>
            </div>
          </div>

        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

