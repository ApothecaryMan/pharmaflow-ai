/**
 * Holidays Service - Manages national, religious, and observance holidays for Egypt
 * Scopes data dynamically from Supabase database with automatic offline fallback.
 */

import { supabase } from '../../lib/supabase';

export interface Holiday {
  id: string;
  date: string; // YYYY-MM-DD
  type: 'national' | 'religious' | 'observance';
  nameEN: string;
  nameAR: string;
  isDayOff: boolean;
  alertEN?: string;
  alertAR?: string;
}

// Egypt Coptic Easter Monday (Sham El-Nessim) dynamic mapping (2025 - 2030)
const SHAM_EL_NESSIM_MATRIX: Record<number, string> = {
  2025: '04-21',
  2026: '05-11',
  2027: '05-03',
  2028: '04-17',
  2029: '04-09',
  2030: '04-29',
};

// Hijri Shift Matrix - Dynamic Islamic/Hijri holidays in Gregorian calendar (2025 - 2030)
const HIJRI_HOLIDAYS_MATRIX: Record<
  number,
  {
    ramadanStart: string;
    eidFitrStart: string; // Day 1
    waqfatArafat: string;
    eidAdhaStart: string; // Day 1
    islamicNewYear: string;
    prophetBirthday: string;
  }
> = {
  2025: {
    ramadanStart: '03-01',
    eidFitrStart: '03-30',
    waqfatArafat: '06-05',
    eidAdhaStart: '06-06',
    islamicNewYear: '06-26',
    prophetBirthday: '09-04',
  },
  2026: {
    ramadanStart: '02-18',
    eidFitrStart: '03-20',
    waqfatArafat: '05-26',
    eidAdhaStart: '05-27',
    islamicNewYear: '06-16',
    prophetBirthday: '08-25',
  },
  2027: {
    ramadanStart: '02-07',
    eidFitrStart: '03-09',
    waqfatArafat: '05-16',
    eidAdhaStart: '05-17',
    islamicNewYear: '06-06',
    prophetBirthday: '08-15',
  },
  2028: {
    ramadanStart: '01-27',
    eidFitrStart: '02-26',
    waqfatArafat: '05-04',
    eidAdhaStart: '05-05',
    islamicNewYear: '05-25',
    prophetBirthday: '08-03',
  },
  2029: {
    ramadanStart: '01-16',
    eidFitrStart: '02-15',
    waqfatArafat: '04-23',
    eidAdhaStart: '04-24',
    islamicNewYear: '05-14',
    prophetBirthday: '07-23',
  },
  2030: {
    ramadanStart: '01-05', // Note: 2030 has two Ramadans (second is late Dec), mapping first one
    eidFitrStart: '02-04',
    waqfatArafat: '04-12',
    eidAdhaStart: '04-13',
    islamicNewYear: '05-03',
    prophetBirthday: '07-12',
  },
};

export const holidaysService = {
  /**
   * Generates the list of official Egyptian holidays offline for a given year.
   * Useful as a fallback when database is unconfigured or offline.
   */
  generateOfflineHolidays(year: number): Holiday[] {
    const list: Holiday[] = [
      {
        id: `coptic-christmas-${year}`,
        date: `${year}-01-07`,
        type: 'religious',
        nameEN: 'Coptic Christmas',
        nameAR: 'عيد الميلاد المجيد',
        isDayOff: true,
        alertEN: 'Suppliers closed. Order cold-chain items in advance.',
        alertAR: 'إغلاق للموردين. يُنصح بطلب أدوية سلسلة التبريد مبكراً.',
      },
      {
        id: `revolution-25-jan-${year}`,
        date: `${year}-01-25`,
        type: 'national',
        nameEN: '25 Jan Revolution & Police Day',
        nameAR: 'ثورة ٢٥ يناير وعيد الشرطة',
        isDayOff: true,
      },
      {
        id: `sinai-liberation-${year}`,
        date: `${year}-04-25`,
        type: 'national',
        nameEN: 'Sinai Liberation Day',
        nameAR: 'عيد تحرير سيناء',
        isDayOff: true,
      },
      {
        id: `labor-day-${year}`,
        date: `${year}-05-01`,
        type: 'national',
        nameEN: 'Labor Day',
        nameAR: 'عيد العمال',
        isDayOff: true,
      },
      {
        id: `revolution-30-june-${year}`,
        date: `${year}-06-30`,
        type: 'national',
        nameEN: '30 June Revolution',
        nameAR: 'ثورة ٣٠ يونيو',
        isDayOff: true,
      },
      {
        id: `revolution-23-july-${year}`,
        date: `${year}-07-23`,
        type: 'national',
        nameEN: '23 July Revolution',
        nameAR: 'ثورة ٢٣ يوليو',
        isDayOff: true,
      },
      {
        id: `armed-forces-day-${year}`,
        date: `${year}-10-06`,
        type: 'national',
        nameEN: 'Armed Forces Day (6 Oct)',
        nameAR: 'عيد القوات المسلحة (٦ أكتوبر)',
        isDayOff: true,
      },
    ];

    // Add Sham El-Nessim (Easter Monday)
    const shamElNessimDate = SHAM_EL_NESSIM_MATRIX[year];
    if (shamElNessimDate) {
      list.push({
        id: `sham-nessim-${year}`,
        date: `${year}-${shamElNessimDate}`,
        type: 'religious',
        nameEN: 'Sham El-Nessim',
        nameAR: 'شم النسيم',
        isDayOff: true,
        alertEN: 'High demand for allergy medications.',
        alertAR: 'زيادة متوقعة في الطلب على مضادات الحساسية.',
      });
    }

    // Add Hijri/Islamic holidays dynamically from matrix
    const hijri = HIJRI_HOLIDAYS_MATRIX[year];
    if (hijri) {
      list.push(
        {
          id: `ramadan-start-${year}`,
          date: `${year}-${hijri.ramadanStart}`,
          type: 'observance',
          nameEN: 'Ramadan Holy Month Start',
          nameAR: 'بداية شهر رمضان المبارك',
          isDayOff: false,
          alertEN: 'High sales spike for chronic medications & digestion aids before Ramadan.',
          alertAR: 'ارتفاع حاد في الطلب على أدوية الأمراض المزمنة ومساعدات الهضم.',
        },
        // Eid al-Fitr (3 days)
        ...Array.from({ length: 3 }, (_, i) => {
          const baseDate = new Date(`${year}-${hijri.eidFitrStart}`);
          baseDate.setDate(baseDate.getDate() + i);
          const dateStr = baseDate.toISOString().split('T')[0];
          return {
            id: `eid-fitr-${i + 1}-${year}`,
            date: dateStr,
            type: 'religious' as const,
            nameEN: `Eid al-Fitr - Day ${i + 1}`,
            nameAR: `عيد الفطر المبارك - اليوم ${i === 0 ? 'الأول' : i === 1 ? 'الثاني' : 'الثالث'}`,
            isDayOff: true,
            ...(i === 0
              ? {
                  alertEN: '3-day full clinical supply chain freeze. Double warehouse backup.',
                  alertAR: 'توقف كامل لسلسلة التوريد الطبية لمدة ٣ أيام. ضاعف مخزون الطوارئ.',
                }
              : {}),
          };
        }),
        {
          id: `arafat-day-${year}`,
          date: `${year}-${hijri.waqfatArafat}`,
          type: 'religious',
          nameEN: 'Waqfat Arafat',
          nameAR: 'وقفة عرفات',
          isDayOff: true,
          alertEN: 'Distributors close early. Order pharmacy essentials now.',
          alertAR: 'الموزعون يغلقون مبكراً. اطلب النواقص الصيدلانية الآن.',
        },
        // Eid al-Adha (4 days)
        ...Array.from({ length: 4 }, (_, i) => {
          const baseDate = new Date(`${year}-${hijri.eidAdhaStart}`);
          baseDate.setDate(baseDate.getDate() + i);
          const dateStr = baseDate.toISOString().split('T')[0];
          return {
            id: `eid-adha-${i + 1}-${year}`,
            date: dateStr,
            type: 'religious' as const,
            nameEN: `Eid al-Adha - Day ${i + 1}`,
            nameAR: `عيد الأضحى المبارك - اليوم ${i === 0 ? 'الأول' : i === 1 ? 'الثاني' : i === 2 ? 'الثالث' : 'الرابع'}`,
            isDayOff: true,
            ...(i === 0
              ? {
                  alertEN: '4-day pharmaceutical supply freeze. High emergency demand.',
                  alertAR: 'توقف كامل للتوريد لمدة ٤ أيام. تأمين أدوية الطوارئ والمحاليل.',
                }
              : {}),
          };
        }),
        {
          id: `islamic-new-year-${year}`,
          date: `${year}-${hijri.islamicNewYear}`,
          type: 'religious',
          nameEN: 'Islamic New Year',
          nameAR: 'رأس السنة الهجرية',
          isDayOff: true,
        },
        {
          id: `prophet-birthday-${year}`,
          date: `${year}-${hijri.prophetBirthday}`,
          type: 'religious',
          nameEN: 'Prophet Birthday (Mawlid)',
          nameAR: 'المولد النبوي الشريف',
          isDayOff: true,
        }
      );
    }

    return list.sort((a, b) => a.date.localeCompare(b.date));
  },

  /**
   * Fetches holidays for a specific year, trying Supabase first.
   * If DB fails or is empty, falls back to generateOfflineHolidays.
   */
  async getHolidays(year: number): Promise<Holiday[]> {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .gte('date', `${year}-01-01`)
        .lte('date', `${year}-12-31`)
        .order('date', { ascending: true });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        return data.map((item: any) => ({
          id: item.id,
          date: item.date,
          type: item.type,
          nameEN: item.name_en,
          nameAR: item.name_ar,
          isDayOff: item.is_day_off,
          alertEN: item.purchasing_alert_en || undefined,
          alertAR: item.purchasing_alert_ar || undefined,
        }));
      }

      console.warn(
        `[Holidays] No holidays found in Supabase for year ${year}. Using offline fallback.`
      );
    } catch (e: any) {
      console.warn('[Holidays] Failed to fetch from Supabase. Using offline fallback:', e.message);
    }

    // Graceful offline fallback
    return this.generateOfflineHolidays(year);
  },

  /**
   * Subscribes to realtime updates of the holidays table in Supabase.
   * Returns a function to unsubscribe.
   */
  subscribeToHolidays(onUpdate: () => void): () => void {
    try {
      const channel = supabase
        .channel('realtime-holidays')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => {
          console.log('[Holidays] Realtime update received!');
          onUpdate();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch (e: any) {
      console.warn('[Holidays] Realtime subscription failed:', e.message);
      return () => {};
    }
  },

  /**
   * Inserts or updates a holiday in the Supabase database.
   */
  async addOrUpdateHoliday(holiday: Omit<Holiday, 'id'> & { id?: string }): Promise<Holiday> {
    const payload = {
      date: holiday.date,
      actual_date: holiday.date, // Default actual to base date, shifted handled at runtime or edited later
      name_en: holiday.nameEN,
      name_ar: holiday.nameAR,
      type: holiday.type,
      is_day_off: holiday.isDayOff,
      purchasing_alert_ar: holiday.alertAR || null,
      purchasing_alert_en: holiday.alertEN || null,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (holiday.id && !holiday.id.includes('-offline-')) {
      const { data, error } = await supabase
        .from('holidays')
        .update(payload)
        .eq('id', holiday.id)
        .select('*')
        .single();
      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase.from('holidays').insert(payload).select('*').single();
      if (error) throw error;
      result = data;
    }

    return {
      id: result.id,
      date: result.date,
      type: result.type,
      nameEN: result.name_en,
      nameAR: result.name_ar,
      isDayOff: result.is_day_off,
      alertEN: result.purchasing_alert_en || undefined,
      alertAR: result.purchasing_alert_ar || undefined,
    };
  },

  /**
   * Triggers the secure Supabase Edge Function to fetch and sync holidays from Calendarific
   */
  async syncHolidays(year: number): Promise<void> {
    try {
      const { data, error } = await supabase.functions.invoke('sync-holidays', {
        body: { year },
      });
      if (error) throw error;
      console.log('[Holidays] Sync completed successfully:', data);
    } catch (e: any) {
      console.error('[Holidays] Sync from Calendarific Edge Function failed:', e.message);
      throw e;
    }
  },
};
