import { type React, useState, useMemo } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';

interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'national' | 'religious' | 'observance';
  nameEN: string;
  nameAR: string;
  isDayOff: boolean;
  alertEN?: string;
  alertAR?: string;
}

const EGYPT_HOLIDAYS_2026: Holiday[] = [
  {
    id: 'coptic-christmas',
    date: '2026-01-07',
    type: 'religious',
    nameEN: 'Coptic Christmas',
    nameAR: 'عيد الميلاد المجيد',
    isDayOff: true,
    alertEN: 'Suppliers closed. Order cold-chain items in advance.',
    alertAR: 'إغلاق للموردين. يُنصح بطلب أدوية سلسلة التبريد مبكراً.',
  },
  {
    id: 'revolution-25-jan',
    date: '2026-01-25',
    type: 'national',
    nameEN: '25 Jan Revolution & Police Day',
    nameAR: 'ثورة ٢٥ يناير وعيد الشرطة',
    isDayOff: true,
  },
  {
    id: 'ramadan-start',
    date: '2026-02-18',
    type: 'observance',
    nameEN: 'Ramadan Holy Month Start',
    nameAR: 'بداية شهر رمضان المبارك',
    isDayOff: false,
    alertEN: 'High sales spike for chronic medications & digestion aids before Ramadan.',
    alertAR: 'ارتفاع حاد في الطلب على أدوية الأمراض المزمنة ومساعدات الهضم.',
  },
  {
    id: 'eid-fitr-1',
    date: '2026-03-20',
    type: 'religious',
    nameEN: 'Eid al-Fitr - Day 1',
    nameAR: 'عيد الفطر المبارك - اليوم الأول',
    isDayOff: true,
    alertEN: '3-day full clinical supply chain freeze. Double warehouse backup.',
    alertAR: 'توقف كامل لسلسلة التوريد الطبية لمدة ٣ أيام. ضاعف مخزون الطوارئ.',
  },
  {
    id: 'eid-fitr-2',
    date: '2026-03-21',
    type: 'religious',
    nameEN: 'Eid al-Fitr - Day 2',
    nameAR: 'عيد الفطر المبارك - اليوم الثاني',
    isDayOff: true,
  },
  {
    id: 'eid-fitr-3',
    date: '2026-03-22',
    type: 'religious',
    nameEN: 'Eid al-Fitr - Day 3',
    nameAR: 'عيد الفطر المبارك - اليوم الثالث',
    isDayOff: true,
  },
  {
    id: 'sinai-liberation',
    date: '2026-04-25',
    type: 'national',
    nameEN: 'Sinai Liberation Day',
    nameAR: 'عيد تحرير سيناء',
    isDayOff: true,
  },
  {
    id: 'labor-day',
    date: '2026-05-01',
    type: 'national',
    nameEN: 'Labor Day',
    nameAR: 'عيد العمال',
    isDayOff: true,
  },
  {
    id: 'sham-nessim',
    date: '2026-05-11',
    type: 'religious',
    nameEN: 'Sham El-Nessim',
    nameAR: 'شم النسيم',
    isDayOff: true,
    alertEN: 'High demand for allergy medications.',
    alertAR: 'زيادة متوقعة في الطلب على مضادات الحساسية.',
  },
  {
    id: 'arafat-day',
    date: '2026-05-26',
    type: 'religious',
    nameEN: 'Waqfat Arafat',
    nameAR: 'وقفة عرفات',
    isDayOff: true,
    alertEN: 'Distributors close early. Order pharmacy essentials now.',
    alertAR: 'الموزعون يغلقون مبكراً. اطلب النواقص الصيدلانية الآن.',
  },
  {
    id: 'eid-adha-1',
    date: '2026-05-27',
    type: 'religious',
    nameEN: 'Eid al-Adha - Day 1',
    nameAR: 'عيد الأضحى المبارك - اليوم الأول',
    isDayOff: true,
    alertEN: '4-day pharmaceutical supply freeze. High emergency demand.',
    alertAR: 'توقف كامل للتوريد لمدة ٤ أيام. تأمين أدوية الطوارئ والمحاليل.',
  },
  {
    id: 'eid-adha-2',
    date: '2026-05-28',
    type: 'religious',
    nameEN: 'Eid al-Adha - Day 2',
    nameAR: 'عيد الأضحى المبارك - اليوم الثاني',
    isDayOff: true,
  },
  {
    id: 'eid-adha-3',
    date: '2026-05-29',
    type: 'religious',
    nameEN: 'Eid al-Adha - Day 3',
    nameAR: 'عيد الأضحى المبارك - اليوم الثالث',
    isDayOff: true,
  },
  {
    id: 'eid-adha-4',
    date: '2026-05-30',
    type: 'religious',
    nameEN: 'Eid al-Adha - Day 4',
    nameAR: 'عيد الأضحى المبارك - اليوم الرابع',
    isDayOff: true,
  },
  {
    id: 'islamic-new-year',
    date: '2026-06-16',
    type: 'religious',
    nameEN: 'Islamic New Year',
    nameAR: 'رأس السنة الهجرية',
    isDayOff: true,
  },
  {
    id: 'revolution-30-june',
    date: '2026-06-30',
    type: 'national',
    nameEN: '30 June Revolution',
    nameAR: 'ثورة ٣٠ يونيو',
    isDayOff: true,
  },
  {
    id: 'revolution-23-july',
    date: '2026-07-23',
    type: 'national',
    nameEN: '23 July Revolution',
    nameAR: 'ثورة ٢٣ يوليو',
    isDayOff: true,
  },
  {
    id: 'prophet-birthday',
    date: '2026-08-25',
    type: 'religious',
    nameEN: 'Prophet Birthday (Mawlid)',
    nameAR: 'المولد النبوي الشريف',
    isDayOff: true,
  },
  {
    id: 'armed-forces-day',
    date: '2026-10-06',
    type: 'national',
    nameEN: 'Armed Forces Day (6 Oct)',
    nameAR: 'عيد القوات المسلحة (٦ أكتوبر)',
    isDayOff: true,
  },
];

// Reference date is May 17, 2026
const TODAY_REFERENCE = new Date('2026-05-17');

const getDayNameAR = (dayIndex: number): string => {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  return days[dayIndex];
};

const getDayNameEN = (dayIndex: number): string => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dayIndex];
};

const getMonthNameAR = (monthIndex: number): string => {
  const months = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];
  return months[monthIndex];
};

const getMonthNameEN = (monthIndex: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[monthIndex];
};

export const HolidaysTracker: React.FC = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showShiftRules, setShowShiftRules] = useState(true);

  const t = TRANSLATIONS[language].settings;
  const hT = t.holidays;
  const isAR = language === 'AR';

  const processedHolidays = useMemo(() => {
    // Rescheduling calculation rules for Egypt
    const calculateEgyptShift = (dateStr: string, isDayOff: boolean) => {
      const origDate = new Date(dateStr);
      const dayOfWeek = origDate.getDay();

      if (!isDayOff) {
        return {
          isShifted: false,
          originalDayName: isAR ? getDayNameAR(dayOfWeek) : getDayNameEN(dayOfWeek),
          actualDateStr: dateStr,
          actualDayName: isAR ? getDayNameAR(dayOfWeek) : getDayNameEN(dayOfWeek),
        };
      }

      // Mid-week holiday shifting rule: Sunday (0) to Wednesday (3) shifts to Thursday (4) of the same week
      if (dayOfWeek >= 0 && dayOfWeek <= 3) {
        const diff = 4 - dayOfWeek;
        const shiftedDate = new Date(origDate);
        shiftedDate.setDate(origDate.getDate() + diff);
        const shiftedDateStr = shiftedDate.toISOString().split('T')[0];
        return {
          isShifted: true,
          originalDayName: isAR ? getDayNameAR(dayOfWeek) : getDayNameEN(dayOfWeek),
          actualDateStr: shiftedDateStr,
          actualDayName: isAR ? getDayNameAR(4) : getDayNameEN(4),
        };
      }

      // Friday (5) shifts backward to Thursday (4)
      if (dayOfWeek === 5) {
        const shiftedDate = new Date(origDate);
        shiftedDate.setDate(origDate.getDate() - 1);
        const shiftedDateStr = shiftedDate.toISOString().split('T')[0];
        return {
          isShifted: true,
          originalDayName: isAR ? getDayNameAR(5) : getDayNameEN(5),
          actualDateStr: shiftedDateStr,
          actualDayName: isAR ? getDayNameAR(4) : getDayNameEN(4),
        };
      }

      // Saturday (6) shifts forward to Sunday (0) of the next week
      if (dayOfWeek === 6) {
        const shiftedDate = new Date(origDate);
        shiftedDate.setDate(origDate.getDate() + 1);
        const shiftedDateStr = shiftedDate.toISOString().split('T')[0];
        return {
          isShifted: true,
          originalDayName: isAR ? getDayNameAR(6) : getDayNameEN(6),
          actualDateStr: shiftedDateStr,
          actualDayName: isAR ? getDayNameAR(0) : getDayNameEN(0),
        };
      }

      return {
        isShifted: false,
        originalDayName: isAR ? getDayNameAR(dayOfWeek) : getDayNameEN(dayOfWeek),
        actualDateStr: dateStr,
        actualDayName: isAR ? getDayNameAR(dayOfWeek) : getDayNameEN(dayOfWeek),
      };
    };

    return EGYPT_HOLIDAYS_2026.map(h => {
      const { isShifted, originalDayName, actualDateStr, actualDayName } = calculateEgyptShift(h.date, h.isDayOff);
      
      const actualDate = new Date(actualDateStr);
      const timeDiff = actualDate.getTime() - TODAY_REFERENCE.getTime();
      const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
      
      const isPast = diffDays < 0;
      const isToday = diffDays === 0;
      const isTomorrow = diffDays === 1;

      return {
        ...h,
        isShifted,
        originalDayName,
        actualDateStr,
        actualDayName,
        isPast,
        isToday,
        isTomorrow,
        diffDays: Math.abs(diffDays),
      };
    });
  }, [isAR]);

  const filteredHolidays = useMemo(() => {
    return processedHolidays.filter(h => {
      if (activeTab === 'upcoming') return !h.isPast;
      if (activeTab === 'past') return h.isPast;
      return true;
    });
  }, [processedHolidays, activeTab]);

  const remainingHolidaysCount = useMemo(() => {
    return processedHolidays.filter(h => !h.isPast && h.isDayOff).length;
  }, [processedHolidays]);

  const formatDateText = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = isAR ? getMonthNameAR(d.getMonth()) : getMonthNameEN(d.getMonth());
    return `${day} ${month}`;
  };

  const getCountdownLabel = (h: typeof processedHolidays[0]) => {
    if (h.isToday) return hT?.today || 'Today';
    if (h.isTomorrow) return hT?.tomorrow || 'Tomorrow';
    
    if (h.isPast) {
      return isAR ? `منذ ${h.diffDays} يوم` : `${h.diffDays} ${hT?.daysAgo || 'days ago'}`;
    }
    return isAR ? `بعد ${h.diffDays} يوم` : `in ${h.diffDays} ${hT?.daysLeft || 'days left'}`;
  };

  const getTypeLabel = (type: Holiday['type']) => {
    if (type === 'national') return hT?.nationalType || 'National Holiday';
    if (type === 'religious') return hT?.religiousType || 'Religious';
    return hT?.observanceType || 'Observance';
  };

  const getTypeStyle = (type: Holiday['type']) => {
    if (type === 'national') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (type === 'religious') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  };

  const getTypeIcon = (type: Holiday['type']) => {
    if (type === 'national') return 'flag';
    if (type === 'religious') return 'mosque';
    return 'celebration';
  };

  return (
    <div className="space-y-2.5 font-sans">
      {/* Today & Remaining Summary */}
      <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border-divider)">
        <div className="flex flex-col text-start">
          <span className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">
            {isAR ? 'اليوم' : 'TODAY'}
          </span>
          <span className="text-xs font-black text-primary-500 flex items-center gap-1 font-mono">
            {isAR ? getDayNameAR(TODAY_REFERENCE.getDay()) : getDayNameEN(TODAY_REFERENCE.getDay())}، {formatDateText('2026-05-17')}
          </span>
        </div>
        <div className="flex flex-col text-end">
          <span className="text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider">
            {isAR ? 'المتبقي' : 'REMAINING'}
          </span>
          <span className="text-xs font-black text-(--text-primary) font-mono">
            {remainingHolidaysCount} {isAR ? 'إجازات رسمية' : 'official days off'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-black/5 dark:bg-white/5 p-0.5 rounded-lg border border-(--border-divider)">
        {(['upcoming', 'past', 'all'] as const).map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1 text-[10px] font-bold rounded-md transition-all duration-200 ${
              activeTab === tab
                ? 'bg-white dark:bg-white/10 text-primary-500 shadow-xs'
                : 'text-(--text-secondary) hover:text-(--text-primary)'
            }`}
          >
            {tab === 'all' ? hT?.all : tab === 'upcoming' ? hT?.upcoming : hT?.past}
          </button>
        ))}
      </div>

      {/* Toggle Shift Rules description */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setShowShiftRules(!showShiftRules)}
          className="text-[9px] font-bold text-primary-500 flex items-center gap-0.5 hover:underline focus:outline-none"
        >
          <span className="material-symbols-rounded text-xs">
            {showShiftRules ? 'visibility_off' : 'info'}
          </span>
          <span>{hT?.rescheduleRule}</span>
        </button>
      </div>

      {showShiftRules && (
        <div className="text-[9px] text-(--text-tertiary) bg-primary-500/5 rounded-md p-1.5 text-start leading-relaxed border border-primary-500/10">
          {isAR ? (
            <p>💡 <b>قاعدة ترحيل الإجازات بمصر:</b> عند وقوع الإجازة الرسمية في منتصف الأسبوع (الأحد إلى الأربعاء)، تُرَحّل تلقائياً إلى <b>يوم الخميس</b> بقرار مجلس الوزراء لمنح عطلة متصلة.</p>
          ) : (
            <p>💡 <b>Egypt Thursday Shift Rule:</b> Official mid-week holidays (Sun-Wed) are automatically shifted to <b>Thursday</b> of the same week for a long weekend.</p>
          )}
        </div>
      )}

      {/* Scrollable Holiday List */}
      <div className="max-h-[190px] overflow-y-auto pr-0.5 space-y-1.5 scrollbar-thin scrollbar-thumb-black/10 dark:scrollbar-thumb-white/10">
        {filteredHolidays.length === 0 ? (
          <div className="text-center py-6 text-xs text-(--text-tertiary)">
            <span className="material-symbols-rounded text-2xl block mb-1 opacity-40">calendar_today</span>
            <span>{isAR ? 'لا يوجد مناسبات حالية' : 'No events found'}</span>
          </div>
        ) : (
          filteredHolidays.map(h => (
            <div
              key={h.id}
              className={`p-2 rounded-lg text-start transition-all duration-200 border relative flex flex-col justify-between gap-1 ${
                h.isPast 
                  ? 'bg-black/[0.02] dark:bg-white/[0.01] border-(--border-divider) opacity-65'
                  : h.isToday
                    ? 'bg-primary-500/10 border-primary-500'
                    : 'bg-black/5 dark:bg-white/5 border-(--border-divider) hover:border-black/10 dark:hover:border-white/10'
              }`}
            >
              {/* Top Row: Name and Type Icon */}
              <div className="flex items-start justify-between gap-1.5">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-(--text-primary) leading-tight">
                    {isAR ? h.nameAR : h.nameEN}
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className={`text-[8px] font-black uppercase px-1 rounded-sm ${getTypeStyle(h.type)}`}>
                      {getTypeLabel(h.type)}
                    </span>
                    {h.isShifted && h.isDayOff && (
                      <span className="text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1 rounded-sm flex items-center gap-0.5">
                        <span className="material-symbols-rounded text-[8px] animate-spin-slow">sync</span>
                        {hT?.shifted}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`material-symbols-rounded text-xs p-1 rounded-md ${getTypeStyle(h.type)}`}>
                  {getTypeIcon(h.type)}
                </span>
              </div>

              {/* Bottom Row: Date information and Countdown */}
              <div className="flex items-end justify-between border-t border-(--border-divider)/50 pt-1 mt-0.5">
                <div className="flex flex-col">
                  {h.isShifted && h.isDayOff ? (
                    <div className="text-[9px] text-(--text-tertiary) flex flex-col font-mono leading-none">
                      <span className="line-through opacity-60">
                        {h.originalDayName}، {formatDateText(h.date)}
                      </span>
                      <span className="text-amber-500 font-bold flex items-center gap-0.5 mt-0.5">
                        <span>➔</span>
                        <span>{h.actualDayName}، {formatDateText(h.actualDateStr)}</span>
                      </span>
                    </div>
                  ) : (
                    <span className="text-[9px] text-(--text-tertiary) font-mono">
                      {h.originalDayName}، {formatDateText(h.date)}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm ${
                  h.isToday
                    ? 'bg-green-500 text-white animate-pulse'
                    : h.isPast
                      ? 'bg-black/10 dark:bg-white/10 text-(--text-tertiary)'
                      : 'bg-primary-500/10 text-primary-500'
                }`}>
                  {getCountdownLabel(h)}
                </span>
              </div>

              {/* Smart Clinical Purchasing Alert */}
              {(h.alertAR || h.alertEN) && !h.isPast && (
                <div className="mt-1 p-1 bg-primary-500/5 dark:bg-primary-500/10 rounded border border-primary-500/10 text-[8.5px] leading-relaxed text-(--text-secondary) flex items-start gap-1">
                  <span className="material-symbols-rounded text-[10px] text-primary-500 mt-0.5">local_shipping</span>
                  <span>{isAR ? h.alertAR : h.alertEN}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HolidaysTracker;
