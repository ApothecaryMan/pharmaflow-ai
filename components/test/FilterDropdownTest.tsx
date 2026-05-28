import type React from 'react';
import { useState } from 'react';
import { FilterDropdownPlayground as FilterDropdown } from './FilterDropdownPlayground';
import { CARD_BASE } from '../../utils/themeStyles';
import { ComboBox } from './ComboBox';

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
    { id: '3', name: 'North Clinic Outlet', nameAr: 'منفذ العيادة الشمالي', icon: 'local_hospital' },
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
  const [selectedSingle, setSelectedSingle] = useState<SimpleItem>({ id: 'alone', name: 'Single Item Only', nameAr: 'عنصر وحيد فقط', icon: 'info' });
  const [selectedLong, setSelectedLong] = useState<SimpleItem>({ id: 'long', name: 'Extremely Long Category Name That Might Overflow Sibling Boundaries', nameAr: 'اسم طويل جداً', icon: 'text_fields' });

  return (
    <div className='p-6 max-w-5xl mx-auto space-y-10 min-h-screen pb-48'>
      {/* Header */}
      <div className='flex flex-col gap-2'>
        <h1 className='text-2xl font-black text-gray-800 dark:text-gray-100'>
          FilterDropdown & ComboBox Playground Panel
        </h1>
        <p className='text-sm text-gray-500 dark:text-gray-400'>
          Comprehensive visual design verification and edge-case behaviors container.
        </p>
      </div>

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
                    <span className='material-symbols-rounded text-[14px] ml-1 shrink-0'>expand_more</span>
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
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>A. Disabled State</span>
              <p className='text-[10px] text-gray-400 mt-0.5'>Locks selection and prevent clicks.</p>
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
                renderSelected={(item) => <span className='truncate block'>{item?.name} (Disabled)</span>}
                renderItem={(item) => <span>{item.name}</span>}
              />
            </div>
          </div>

          {/* Test Case B: Single Item */}
          <div className='flex flex-col gap-3'>
            <div>
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>B. Single Item</span>
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
              <span className='text-xs font-bold text-gray-600 dark:text-gray-400'>C. Long Text & Auto-Hide</span>
              <p className='text-[10px] text-gray-400 mt-0.5'>Hides arrow when text length is {`> 3`}.</p>
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
  );
};
