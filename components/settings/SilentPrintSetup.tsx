import type React from 'react';
import { useState } from 'react';

interface SilentPrintSetupProps {
  color?: string;
  language?: 'EN' | 'AR';
  onTestPrint?: () => Promise<void>;
}

export const SilentPrintSetup: React.FC<SilentPrintSetupProps> = ({
  color = 'emerald',
  language = 'AR',
  onTestPrint,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [testSuccess, setTestSuccess] = useState<boolean | null>(null);

  const t = {
    title:
      language === 'AR'
        ? 'إعداد الطباعة الصامتة (تخطي رسالة التأكيد)'
        : 'Silent Print Setup (Bypass Confirmation)',
    desc:
      language === 'AR'
        ? 'قم بإلغاء النوافذ المنبثقة المزعجة لتسريع عملية البيع في نقطة البيع.'
        : 'Remove annoying popups to speed up the sales process in POS.',
    step1: language === 'AR' ? 'تحميل شهادة الأمان' : 'Download Security Certificate',
    step1Desc:
      language === 'AR'
        ? 'هذا الملف يخبر برنامج QZ Tray أن نظام PharmaFlow آمن ومصرح له بالطباعة.'
        : 'This file tells QZ Tray that PharmaFlow is safe and authorized to print.',
    downloadBtn:
      language === 'AR'
        ? 'تحميل ملف الترخيص (digital-certificate.txt)'
        : 'Download License File (digital-certificate.txt)',
    step2: language === 'AR' ? 'تثبيت الشهادة في QZ Tray' : 'Install Certificate in QZ Tray',
    step2Inst1:
      language === 'AR'
        ? 'انقر بزر الماوس الأيمن على أيقونة QZ الأخضر بجوار الساعة.'
        : 'Right-click on the green QZ icon near the clock.',
    step2Inst2:
      language === 'AR'
        ? 'اختر Advanced (متقدم) ثم Site Manager.'
        : 'Select Advanced then Site Manager.',
    step2Inst3:
      language === 'AR'
        ? 'ستظهر نافذة بها علامتي (+ و -)، اضغط على (+) واختر ملف الترخيص من مجلد التنزيلات.'
        : 'A window with (+ and -) will appear, click (+) and select the downloaded license file.',
    step3: language === 'AR' ? 'اختبار الإعداد' : 'Test Setup',
    testBtn: language === 'AR' ? 'اختبار الطباعة الصامتة' : 'Test Silent Print',
    testDesc:
      language === 'AR'
        ? 'إذا لم تظهر لك نافذة تطلب السماح بالطباعة، فهذا يعني أنك أتممت الإعداد بنجاح!'
        : 'If no permission dialog appears, you have set it up successfully!',
    successMsg: language === 'AR' ? 'جاهز للعمل السريع!' : 'Ready for fast operations!',
    showSteps: language === 'AR' ? 'عرض خطوات التفعيل' : 'Show Setup Steps',
    hideSteps: language === 'AR' ? 'إخفاء خطوات التفعيل' : 'Hide Setup Steps',
  };

  const handleDownload = () => {
    import('../../utils/qzSecurity').then(({ QZ_CERTIFICATE }) => {
      const blob = new Blob([QZ_CERTIFICATE], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'digital-certificate.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  };

  const handleTest = async () => {
    if (onTestPrint) {
      try {
        await onTestPrint();
        setTestSuccess(true);
        setTimeout(() => setTestSuccess(null), 5000);
      } catch (err) {
        console.error('Test print failed:', err);
        setTestSuccess(false);
        setTimeout(() => setTestSuccess(null), 5000);
      }
    } else {
      setTestSuccess(true);
      setTimeout(() => setTestSuccess(null), 5000);
    }
  };

  return (
    <div className='rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden'>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className='w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors text-start'
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        <div className='flex items-center gap-3'>
          <div className='p-1.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300'>
            <span className='material-symbols-rounded text-[20px]'>rocket_launch</span>
          </div>
          <div>
            <h4 className='text-sm font-bold text-gray-900 dark:text-white'>{t.title}</h4>
            <p className='text-xs text-gray-500 dark:text-gray-400 mt-1'>{t.desc}</p>
          </div>
        </div>
        <span
          className={`material-symbols-rounded text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {isExpanded && (
        <div
          className='p-3 pt-0 border-t border-gray-100 dark:border-zinc-800'
          dir={language === 'AR' ? 'rtl' : 'ltr'}
        >
          <div className='space-y-4 mt-3'>
            {/* Step 1 */}
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-xs'>
                1
              </div>
              <div className='space-y-1.5 flex-1'>
                <h5 className='font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2'>
                  {t.step1}
                  <span className='material-symbols-rounded text-[18px] text-gray-400'>
                    download
                  </span>
                </h5>
                <p className='text-xs text-gray-500 dark:text-gray-400'>{t.step1Desc}</p>
                <button
                  onClick={handleDownload}
                  className='mt-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-gray-100 text-xs font-bold rounded-sm transition-colors flex items-center gap-2'
                >
                  <span className='material-symbols-rounded text-[16px]'>file_download</span>
                  {t.downloadBtn}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-xs'>
                2
              </div>
              <div className='space-y-1.5 flex-1'>
                <h5 className='font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2'>
                  {t.step2}
                  <span className='material-symbols-rounded text-[18px] text-gray-400'>
                    settings
                  </span>
                </h5>
                <ul className='text-xs text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside mt-2'>
                  <li>{t.step2Inst1}</li>
                  <li>{t.step2Inst2}</li>
                  <li>{t.step2Inst3}</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className='flex gap-3'>
              <div className='flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-800 dark:text-gray-200 font-bold text-xs'>
                3
              </div>
              <div className='space-y-1.5 flex-1'>
                <h5 className='font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2'>
                  {t.step3}
                  <span className='material-symbols-rounded text-[18px] text-gray-400'>
                    science
                  </span>
                </h5>
                <p className='text-xs text-gray-500 dark:text-gray-400'>{t.testDesc}</p>

                <div className='flex items-center gap-3 mt-2'>
                  <button
                    onClick={handleTest}
                    className='px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-gray-100 text-xs font-bold rounded-sm transition-colors flex items-center gap-2'
                  >
                    <span className='material-symbols-rounded text-[16px]'>print</span>
                    {t.testBtn}
                  </button>

                  {testSuccess && (
                    <span className='text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in zoom-in duration-300'>
                      <span className='material-symbols-rounded text-[16px]'>check_circle</span>
                      {t.successMsg}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
