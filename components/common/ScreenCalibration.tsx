import type React from 'react';
import { useEffect, useState } from 'react';
import { Modal } from './Modal';

interface ScreenCalibrationProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (mmToPx: number) => void;
  initialValue?: number;
  t: any; // Translations
}

// Standard Credit Card Width: 85.60 mm
const CREDIT_CARD_WIDTH_MM = 85.6;
const DEFAULT_MM_TO_PX = 3.78; // approx 96 DPI

export const ScreenCalibration: React.FC<ScreenCalibrationProps> = ({
  isOpen,
  onClose,
  onSave,
  initialValue,
  t,
}) => {
  // We control the slider in "pixels", representing the total width of the on-screen card
  // default width = 85.6 * 3.78 ~= 323.5 px
  const [sliderValue, setSliderValue] = useState<number>(324);

  useEffect(() => {
    if (isOpen) {
      const startVal = initialValue || DEFAULT_MM_TO_PX;
      setSliderValue(startVal * CREDIT_CARD_WIDTH_MM);
    }
  }, [isOpen, initialValue]);

  const handleSave = () => {
    const newRatio = sliderValue / CREDIT_CARD_WIDTH_MM;
    onSave(newRatio);
    onClose();
  };

  const handleReset = () => {
    setSliderValue(DEFAULT_MM_TO_PX * CREDIT_CARD_WIDTH_MM);
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size='3xl' zIndex={60}>
      <div className='bg-white dark:bg-gray-900 overflow-hidden border border-gray-100 dark:border-gray-800'>
        <div className='p-6 border-b border-gray-100 dark:border-gray-800'>
          <h3 className='font-bold text-xl text-gray-900 dark:text-white flex items-center gap-2'>
            <span className='material-symbols-rounded text-blue-600'>aspect_ratio</span>
            {t.calibration?.title || 'Screen Calibration'}
          </h3>
          <p className='text-sm text-gray-500 mt-1'>
            {t.calibration?.subtitle ||
              'Adjust the slider until the green box matches the width of a real credit card.'}
          </p>
        </div>

        <div className='p-8 flex flex-col items-center gap-8 bg-gray-50 dark:bg-gray-950/50'>
          {/* Reference Object (Credit Card) */}
          <div
            className='bg-emerald-500 rounded-xl shadow-lg relative transition-all duration-75 ease-out flex items-center justify-center border-2 border-emerald-600/30'
            style={{
              width: `${sliderValue}px`,
              height: `${sliderValue * (53.98 / 85.6)}px`, // Maintain credit card aspect ratio
            }}
          >
            <div className='text-white font-mono font-bold text-lg opacity-80 tracking-widest text-center'>
              CREDIT CARD
              <br />
              <span className='text-xs font-normal opacity-70'>85.60 mm</span>
            </div>

            {/* Ruler marks simulation */}
            <div className='absolute bottom-0 left-0 right-0 h-4 flex justify-between px-2'>
              {[...Array(10)].map((_, i) => (
                <div key={i} className='w-px h-full bg-white/30'></div>
              ))}
            </div>
          </div>

          {/* Slider Control */}
          <div className='w-full max-w-sm space-y-4'>
            <input
              type='range'
              min='200'
              max='600'
              step='0.5'
              value={sliderValue}
              onChange={(e) => setSliderValue(parseFloat(e.target.value))}
              className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600'
            />
            <div className='flex justify-between text-xs text-gray-500'>
              <span>Smaller</span>
              <span>Larger</span>
            </div>
          </div>
        </div>

        <div className='p-4 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2'>
          <button
            onClick={handleReset}
            className='px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 font-medium text-sm'
          >
            {t.calibration?.reset || 'Reset Default'}
          </button>
          <button
            onClick={onClose}
            className='px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 rounded-xl font-bold text-sm'
          >
            {t.cancel || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            className='px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30'
          >
            {t.save || 'Save Calibration'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
