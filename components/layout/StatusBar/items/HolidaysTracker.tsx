import { Fragment, type React, useEffect, useMemo, useState } from 'react';
import { useSettings } from '../../../../context';
import { TRANSLATIONS } from '../../../../i18n/translations';
import { type Holiday, holidaysService } from '../../../../services';

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
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ];
  return months[monthIndex];
};

const getMonthNameEN = (monthIndex: number): string => {
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  return months[monthIndex];
};

const translateToArabic = (nameEN: string, fallbackAR: string) => {
  const hasArabic = /[\u0600-\u06FF]/.test(fallbackAR);
  if (hasArabic && fallbackAR !== nameEN) {
    return fallbackAR;
  }

  const normalized = nameEN.toLowerCase();

  if (normalized.includes('coptic christmas')) return 'عيد الميلاد المجيد';
  if (normalized.includes('25 january') || normalized.includes('january 25'))
    return 'ثورة ٢٥ يناير وعيد الشرطة';
  if (normalized.includes('sinai liberation')) return 'عيد تحرير سيناء';
  if (normalized.includes('labor day')) return 'عيد العمال';
  if (normalized.includes('spring festival') || normalized.includes('sham el-nessim'))
    return 'شم النسيم';
  if (normalized.includes('june 30') || normalized.includes('30 june')) return 'ثورة ٣٠ يونيو';
  if (normalized.includes('july 23') || normalized.includes('23 july')) return 'ثورة ٢٣ يوليو';
  if (
    normalized.includes('armed forces') ||
    normalized.includes('6 october') ||
    normalized.includes('october 6')
  )
    return 'عيد القوات المسلحة (٦ أكتوبر)';
  if (normalized.includes('ramadan')) return 'بداية شهر رمضان المبارك';
  if (normalized.includes('fitr')) {
    if (normalized.includes('day 1') || normalized.includes('holiday'))
      return 'عيد الفطر المبارك - إجازة رسمية';
    return 'عيد الفطر المبارك';
  }
  if (normalized.includes('arafat')) return 'وقفة عرفات';
  if (normalized.includes('adha')) {
    if (normalized.includes('day 1') || normalized.includes('holiday'))
      return 'عيد الأضحى المبارك - إجازة رسمية';
    return 'عيد الأضحى المبارك';
  }
  if (normalized.includes('muharram') || normalized.includes('islamic new year'))
    return 'رأس السنة الهجرية';
  if (normalized.includes('prophet') || normalized.includes('mawlid'))
    return 'المولد النبوي الشريف';
  if (normalized.includes('ashura')) return 'يوم عاشوراء';
  if (normalized.includes('flooding of the nile') || normalized.includes('nile flood'))
    return 'عيد وفاء النيل';
  if (normalized.includes('nayrouz')) return 'عيد النيروز القبطي';
  if (normalized.includes('good friday')) return 'الجمعة العظيمة';
  if (normalized.includes('holy saturday') || normalized.includes('light saturday'))
    return 'سبت النور';
  if (normalized.includes('easter sunday') || normalized.includes('coptic easter'))
    return 'عيد القيامة المجيد';

  return fallbackAR || nameEN;
};

export const HolidaysTracker: React.FC = () => {
  const { language } = useSettings();
  const [activeTab, setActiveTab] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [showShiftRules, setShowShiftRules] = useState(false);

  // Dynamic State loaded from Supabase / Offline Generator
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const t = TRANSLATIONS[language].settings;
  const hT = t.holidays;
  const isAR = language === 'AR';

  // Dynamic Today reference date
  const TODAY_REFERENCE = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Fetch holidays and subscribe to realtime updates
  useEffect(() => {
    let active = true;
    const activeYear = TODAY_REFERENCE.getFullYear();

    const fetchHolidays = async () => {
      setIsLoading(true);
      try {
        const data = await holidaysService.getHolidays(activeYear);
        if (active) {
          setHolidays(data);
        }
      } catch (error) {
        console.error('[HolidaysTracker] Error fetching holidays:', error);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchHolidays();

    // Subscribe to realtime updates from Supabase
    const unsubscribe = holidaysService.subscribeToHolidays(() => {
      fetchHolidays();
    });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [TODAY_REFERENCE]);

  const processedHolidays = useMemo(() => {
    // Rescheduling calculation rules for Egypt
    const calculateEgyptShift = (dateStr: string, isDayOff: boolean, nameEN: string) => {
      const origDate = new Date(dateStr);
      const dayOfWeek = origDate.getDay();

      const normalized = nameEN.toLowerCase();
      // Eid al-Fitr, Eid al-Adha, Coptic Christmas, and Coptic Easter NEVER shift to Thursday!
      const isMultiDayOrFixed =
        normalized.includes('fitr') ||
        normalized.includes('adha') ||
        normalized.includes('christmas') ||
        normalized.includes('easter');

      if (!isDayOff || isMultiDayOrFixed) {
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

    const processed = holidays
      .filter((h) => {
        // Filter out Calendarific's duplicate "Day off for..." rows because we shift original holidays manually!
        return !h.nameEN.toLowerCase().includes('day off for');
      })
      .map((h) => {
        const { isShifted, originalDayName, actualDateStr, actualDayName } = calculateEgyptShift(
          h.date,
          h.isDayOff,
          h.nameEN
        );

        const actualDate = new Date(actualDateStr);
        actualDate.setHours(0, 0, 0, 0);
        const timeDiff = actualDate.getTime() - TODAY_REFERENCE.getTime();
        const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));

        const isPast = diffDays < 0;
        const isToday = diffDays === 0;
        const isTomorrow = diffDays === 1;

        let refinedType = h.type;
        const normalizedName = h.nameEN.toLowerCase();
        if (
          normalizedName.includes('fitr') ||
          normalizedName.includes('adha') ||
          normalizedName.includes('arafat') ||
          normalizedName.includes('coptic') ||
          normalizedName.includes('prophet') ||
          normalizedName.includes('mawlid') ||
          normalizedName.includes('muharram') ||
          normalizedName.includes('islamic new year')
        ) {
          refinedType = 'religious';
        } else if (normalizedName.includes('ramadan')) {
          refinedType = 'observance';
        }

        return {
          ...h,
          type: refinedType,
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

    const seen = new Set<string>();
    return processed.filter((h) => {
      const key = `${h.actualDateStr}_${h.nameEN.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [holidays, isAR, TODAY_REFERENCE]);

  const filteredHolidays = useMemo(() => {
    return processedHolidays.filter((h) => {
      if (activeTab === 'upcoming') return !h.isPast;
      if (activeTab === 'past') return h.isPast;
      return true;
    });
  }, [processedHolidays, activeTab]);

  const remainingHolidaysCount = useMemo(() => {
    return processedHolidays.filter((h) => !h.isPast && h.isDayOff).length;
  }, [processedHolidays]);

  const formatDateText = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate();
    const month = isAR ? getMonthNameAR(d.getMonth()) : getMonthNameEN(d.getMonth());
    return `${day} ${month}`;
  };

  const getCountdownLabel = (h: (typeof processedHolidays)[0]) => {
    if (h.isToday) return hT?.today || 'Today';
    if (h.isTomorrow) return hT?.tomorrow || 'Tomorrow';

    const days = h.diffDays;

    if (isAR) {
      if (h.isPast) {
        if (days === 1) return 'منذ يوم';
        if (days === 2) return 'منذ يومين';
        if (days >= 3 && days <= 10) return `منذ ${days} أيام`;
        return `منذ ${days} يوم`;
      }
      if (days === 1) return 'غداً';
      if (days === 2) return 'بعد يومين';
      if (days >= 3 && days <= 10) return `بعد ${days} أيام`;
      return `بعد ${days} يوم`;
    }

    // English
    if (h.isPast) {
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    }
    return `${days} ${days === 1 ? 'day' : 'days'} left`;
  };

  const getTypeStyle = (type: Holiday['type']) => {
    if (type === 'national') return 'bg-blue-500/10 text-blue-600 dark:text-blue-400';
    if (type === 'religious') return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400';
    return 'bg-amber-500/10 text-amber-600 dark:text-amber-400';
  };

  const getTypeIconStyle = (type: Holiday['type']) => {
    if (type === 'national') return 'text-blue-600 dark:text-blue-400';
    if (type === 'religious') return 'text-emerald-600 dark:text-emerald-400';
    return 'text-amber-600 dark:text-amber-400';
  };

  const getTodayCardStyle = (type: Holiday['type']) => {
    if (type === 'national') return 'bg-blue-500/10 border-blue-500/50 dark:border-blue-400/50';
    if (type === 'religious')
      return 'bg-emerald-500/10 border-emerald-500/50 dark:border-emerald-400/50';
    return 'bg-amber-500/10 border-amber-500/50 dark:border-amber-400/50';
  };

  const getTypeIcon = (type: Holiday['type']) => {
    if (type === 'national') return 'flag';
    if (type === 'religious') return 'mosque';
    return 'celebration';
  };

  return (
    <div className='space-y-2.5 font-sans'>
      {/* Today & Remaining Summary */}
      <div className='flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5 border border-(--border-divider)'>
        <div className='flex flex-col text-start'>
          <span className='text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider'>
            {isAR ? 'اليوم' : 'TODAY'}
          </span>
          <span className='text-xs font-black text-(--text-primary) flex items-center gap-1 font-mono'>
            {isAR ? getDayNameAR(TODAY_REFERENCE.getDay()) : getDayNameEN(TODAY_REFERENCE.getDay())}
            ، {formatDateText(TODAY_REFERENCE.toISOString())}
          </span>
        </div>
        <div className='flex flex-col text-end'>
          <span className='text-[10px] text-(--text-tertiary) font-bold uppercase tracking-wider'>
            {isAR ? 'المتبقي' : 'REMAINING'}
          </span>
          <span className='text-xs font-black text-(--text-primary) font-mono'>
            {remainingHolidaysCount} {isAR ? 'إجازات رسمية' : 'official days off'}
          </span>
        </div>
      </div>

      {/* Control Row: Micro Inline Tabs & Toggle Shift Rules */}
      <div className='flex items-center justify-between gap-2 px-1 py-1 border-b border-(--border-divider)/30 pb-2 shrink-0'>
        {/* Micro Inline Tabs */}
        <div className='flex items-center gap-3 text-[9px] font-bold text-(--text-tertiary)'>
          {(['upcoming', 'past', 'all'] as const).map((tab, idx) => (
            <Fragment key={tab}>
              {idx > 0 && <span className='opacity-30'>•</span>}
              <button
                type='button'
                onClick={() => setActiveTab(tab)}
                className={`transition-colors focus:outline-none ${
                  activeTab === tab
                    ? 'text-(--text-primary) font-black'
                    : 'text-(--text-tertiary) hover:text-(--text-primary)'
                }`}
              >
                {tab === 'all' ? hT?.all : tab === 'upcoming' ? hT?.upcoming : hT?.past}
              </button>
            </Fragment>
          ))}
        </div>

        {/* Toggle Shift Rules Button */}
        <button
          type='button'
          onClick={() => setShowShiftRules(!showShiftRules)}
          className='text-[9px] font-bold text-amber-500 flex items-center gap-0.5 focus:outline-none hover:text-amber-600 dark:hover:text-amber-400 shrink-0'
        >
          <span
            className='material-symbols-rounded text-xs'
            style={{
              fontSize: '12px',
              width: '12px',
              height: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {showShiftRules ? 'visibility_off' : 'info'}
          </span>
          <span className='hover:underline'>{hT?.rescheduleRule}</span>
        </button>
      </div>

      {showShiftRules && (
        <div className='text-[9px] text-(--text-tertiary) bg-amber-500/5 rounded-md p-1.5 text-start leading-relaxed border border-amber-500/10'>
          {isAR ? (
            <p>
              💡 <b>قاعدة ترحيل الإجازات بمصر:</b> عند وقوع الإجازة الرسمية في منتصف الأسبوع (الأحد
              إلى الأربعاء)، تُرَحّل تلقائياً إلى <b>يوم الخميس</b> بقرار مجلس الوزراء لمنح عطلة متصلة.
            </p>
          ) : (
            <p>
              💡 <b>Egypt Thursday Shift Rule:</b> Official mid-week holidays (Sun-Wed) are
              automatically shifted to <b>Thursday</b> of the same week for a long weekend.
            </p>
          )}
        </div>
      )}

      {/* Dynamic Loader */}
      {isLoading && holidays.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-10 text-xs text-(--text-tertiary)'>
          <span
            className='material-symbols-rounded text-2xl animate-spin text-amber-500 mb-2'
            style={{
              fontSize: '24px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            sync
          </span>
          <span>{isAR ? 'جاري تحديث جدول الإجازات...' : 'Syncing holiday schedule...'}</span>
        </div>
      ) : (
        <div className='max-h-[300px] overflow-y-auto space-y-1.5 scrollbar-hide'>
          {filteredHolidays.length === 0 ? (
            <div className='text-center py-6 text-xs text-(--text-tertiary)'>
              <span
                className='material-symbols-rounded text-2xl block mb-1 opacity-40'
                style={{
                  fontSize: '24px',
                  width: '24px',
                  height: '24px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                calendar_today
              </span>
              <span>{isAR ? 'لا يوجد مناسبات حالية' : 'No events found'}</span>
            </div>
          ) : (
            filteredHolidays.map((h) => (
              <div
                key={h.id}
                className={`p-2 rounded-lg text-start transition-all duration-200 border relative flex flex-col justify-between gap-1 ${
                  h.isPast
                    ? 'bg-black/[0.02] dark:bg-white/[0.01] border-(--border-divider) opacity-65'
                    : h.isToday
                      ? getTodayCardStyle(h.type)
                      : 'bg-black/5 dark:bg-white/5 border-(--border-divider) hover:border-black/10 dark:hover:border-white/10'
                }`}
              >
                {/* Top Row: Name and Type Icon */}
                <div className='flex items-start justify-between gap-1.5'>
                  <div className='flex flex-col'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <span className='text-[11px] font-bold text-(--text-primary) leading-tight'>
                        {isAR ? translateToArabic(h.nameEN, h.nameAR) : h.nameEN}
                      </span>
                      {h.isShifted && h.isDayOff && (
                        <span className='text-[8px] font-bold text-amber-500 bg-amber-500/10 px-1 rounded-sm flex items-center shrink-0'>
                          {hT?.shifted}
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`material-symbols-rounded text-xs ${getTypeIconStyle(h.type)}`}
                    style={{
                      fontSize: '25px',
                      width: '25px',
                      height: '25px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {getTypeIcon(h.type)}
                  </span>
                </div>

                {/* Bottom Row: Date information and Countdown */}
                <div className='flex items-end justify-between border-t border-(--border-divider)/50 pt-1 mt-0.5'>
                  <div className='flex flex-col'>
                    {h.isShifted && h.isDayOff ? (
                      <div className='text-[9px] text-(--text-tertiary) flex flex-col font-mono leading-none'>
                        <span className='line-through opacity-60'>
                          {h.originalDayName}، {formatDateText(h.date)}
                        </span>
                        <span className='text-amber-500 font-bold flex items-center gap-0.5 mt-0.5'>
                          <span>➔</span>
                          <span>
                            {h.actualDayName}، {formatDateText(h.actualDateStr)}
                          </span>
                        </span>
                      </div>
                    ) : (
                      <span className='text-[9px] text-(--text-tertiary) font-mono'>
                        {h.originalDayName}، {formatDateText(h.date)}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-sm ${
                      h.isToday
                        ? 'bg-green-500 text-white animate-pulse'
                        : h.isPast
                          ? 'bg-black/10 dark:bg-white/10 text-(--text-tertiary)'
                          : getTypeStyle(h.type)
                    }`}
                  >
                    {getCountdownLabel(h)}
                  </span>
                </div>

                {/* Smart Clinical Purchasing Alert */}
                {(h.alertAR || h.alertEN) && !h.isPast && (
                  <div className='mt-1 p-1 bg-amber-500/5 dark:bg-amber-500/10 rounded border border-amber-500/10 text-[8.5px] leading-relaxed text-(--text-secondary) dark:text-(--text-tertiary) flex items-start gap-1'>
                    <span
                      className='material-symbols-rounded text-[10px] text-amber-500 mt-0.5'
                      style={{
                        fontSize: '10px',
                        width: '10px',
                        height: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      local_shipping
                    </span>
                    <span>{isAR ? h.alertAR : h.alertEN}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default HolidaysTracker;
