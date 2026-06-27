import React, { useState } from 'react';

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
    title: language === 'AR' ? 'إعداد الطباعة الصامتة (تخطي رسالة التأكيد)' : 'Silent Print Setup (Bypass Confirmation)',
    desc: language === 'AR' ? 'قم بإلغاء النوافذ المنبثقة المزعجة لتسريع عملية البيع في نقطة البيع.' : 'Remove annoying popups to speed up the sales process in POS.',
    step1: language === 'AR' ? 'تحميل شهادة الأمان' : 'Download Security Certificate',
    step1Desc: language === 'AR' ? 'هذا الملف يخبر برنامج QZ Tray أن نظام PharmaFlow آمن ومصرح له بالطباعة.' : 'This file tells QZ Tray that PharmaFlow is safe and authorized to print.',
    downloadBtn: language === 'AR' ? 'تحميل ملف الترخيص (digital-certificate.txt)' : 'Download License File (digital-certificate.txt)',
    step2: language === 'AR' ? 'تثبيت الشهادة في QZ Tray' : 'Install Certificate in QZ Tray',
    step2Inst1: language === 'AR' ? 'انقر بزر الماوس الأيمن على أيقونة QZ الأخضر بجوار الساعة.' : 'Right-click on the green QZ icon near the clock.',
    step2Inst2: language === 'AR' ? 'اختر Advanced (متقدم) ثم Certificates (الشهادات).' : 'Select Advanced then Certificates.',
    step2Inst3: language === 'AR' ? 'اضغط على زر Add (إضافة) واختر الملف الذي حملته.' : 'Click Add and select the downloaded file.',
    step3: language === 'AR' ? 'اختبار الإعداد' : 'Test Setup',
    testBtn: language === 'AR' ? 'اختبار الطباعة الصامتة' : 'Test Silent Print',
    testDesc: language === 'AR' ? 'إذا لم تظهر لك نافذة تطلب السماح بالطباعة، فهذا يعني أنك أتممت الإعداد بنجاح!' : 'If no permission dialog appears, you have set it up successfully!',
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
    <div className={`rounded-xl border border-${color}-200 dark:border-${color}-900/50 bg-${color}-50/30 dark:bg-${color}-900/10 overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between p-4 hover:bg-${color}-50/50 dark:hover:bg-${color}-900/20 transition-colors text-left`}
        dir={language === 'AR' ? 'rtl' : 'ltr'}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg bg-${color}-100 dark:bg-${color}-900/50 text-${color}-600 dark:text-${color}-400`}>
            <span className="material-symbols-rounded text-[20px]">rocket_launch</span>
          </div>
          <div>
            <h4 className={`text-sm font-bold text-${color}-900 dark:text-${color}-100`}>
              {t.title}
            </h4>
            <p className={`text-xs text-${color}-700/70 dark:text-${color}-300/70 mt-1`}>
              {t.desc}
            </p>
          </div>
        </div>
        <span className={`material-symbols-rounded text-${color}-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isExpanded && (
        <div className={`p-4 pt-0 border-t border-${color}-100 dark:border-${color}-900/30`} dir={language === 'AR' ? 'rtl' : 'ltr'}>
          <div className="space-y-6 mt-4">
            
            {/* Step 1 */}
            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 font-bold text-sm`}>
                1
              </div>
              <div className="space-y-2 flex-1">
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                  {t.step1}
                  <span className="material-symbols-rounded text-[18px] text-gray-400">download</span>
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.step1Desc}
                </p>
                <button
                  onClick={handleDownload}
                  className={`mt-2 px-4 py-2 bg-${color}-600 hover:bg-${color}-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2`}
                >
                  <span className="material-symbols-rounded text-[16px]">file_download</span>
                  {t.downloadBtn}
                </button>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 font-bold text-sm`}>
                2
              </div>
              <div className="space-y-2 flex-1">
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                  {t.step2}
                  <span className="material-symbols-rounded text-[18px] text-gray-400">settings</span>
                </h5>
                <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-2 list-disc list-inside mt-2">
                  <li>{t.step2Inst1}</li>
                  <li>{t.step2Inst2}</li>
                  <li>{t.step2Inst3}</li>
                </ul>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-${color}-100 dark:bg-${color}-900/50 flex items-center justify-center text-${color}-600 font-bold text-sm`}>
                3
              </div>
              <div className="space-y-2 flex-1">
                <h5 className="font-bold text-gray-800 dark:text-gray-200 text-sm flex items-center gap-2">
                  {t.step3}
                  <span className="material-symbols-rounded text-[18px] text-gray-400">science</span>
                </h5>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {t.testDesc}
                </p>
                
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleTest}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 text-xs font-bold rounded-lg transition-colors flex items-center gap-2 border border-gray-200 dark:border-zinc-700"
                  >
                    <span className="material-symbols-rounded text-[16px]">print</span>
                    {t.testBtn}
                  </button>

                  {testSuccess && (
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in zoom-in duration-300">
                      <span className="material-symbols-rounded text-[16px]">check_circle</span>
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
