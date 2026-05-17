import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';

// Satisfy Node/Vite TS compiler in the IDE
declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ARABIC_NAMES: Record<string, string> = {
  'Coptic Christmas': 'عيد الميلاد المجيد',
  '25 January': 'ثورة ٢٥ يناير وعيد الشرطة',
  'January 25': 'ثورة ٢٥ يناير وعيد الشرطة',
  'Sinai Liberation': 'عيد تحرير سيناء',
  'Labor Day': 'عيد العمال',
  'Spring Festival': 'شم النسيم',
  'Sham El-Nessim': 'شم النسيم',
  'June 30': 'ثورة ٣٠ يونيو',
  '30 June': 'ثورة ٣٠ يونيو',
  'July 23': 'ثورة ٢٣ يوليو',
  '23 July': 'ثورة ٢٣ يوليو',
  'Armed Forces': 'عيد القوات المسلحة (٦ أكتوبر)',
  '6 October': 'عيد القوات المسلحة (٦ أكتوبر)',
  'October 6': 'عيد القوات المسلحة (٦ أكتوبر)',
  'Ramadan': 'بداية شهر رمضان المبارك',
  'Fitr': 'عيد الفطر المبارك',
  'Arafat': 'وقفة عرفات',
  'Adha': 'عيد الأضحى المبارك',
  'Muharram': 'رأس السنة الهجرية',
  'Islamic New Year': 'رأس السنة الهجرية',
  'Prophet': 'المولد النبوي الشريف',
  Mawlid: 'المولد النبوي الشريف',
  'Ashura': 'يوم عاشوراء',
  'Flooding of the Nile': 'عيد وفاء النيل',
  'Nile flood': 'عيد وفاء النيل',
  'Nayrouz': 'عيد النيروز القبطي',
  'Good Friday': 'الجمعة العظيمة',
  'Holy Saturday': 'سبت النور',
  'Easter Sunday': 'عيد القيامة المجيد',
  'Coptic Easter': 'عيد القيامة المجيد',
};

const CLINICAL_ALERTS: Record<string, { ar: string; en: string }> = {
  'Coptic Christmas': {
    ar: 'إغلاق للموردين. يُنصح بطلب أدوية سلسلة التبريد مبكراً.',
    en: 'Suppliers closed. Order cold-chain items in advance.',
  },
  'Ramadan Start': {
    ar: 'ارتفاع حاد في الطلب على أدوية الأمراض المزمنة ومساعدات الهضم.',
    en: 'High sales spike for chronic medications & digestion aids before Ramadan.',
  },
  'Eid al-Fitr': {
    ar: 'توقف كامل لسلسلة التوريد الطبية لمدة ٣ أيام. ضاعف مخزون الطوارئ.',
    en: '3-day full clinical supply chain freeze. Double warehouse backup.',
  },
  'Sham El-Nessim': {
    ar: 'زيادة متوقعة في الطلب على مضادات الحساسية.',
    en: 'High demand for allergy medications.',
  },
  'Waqfat Arafat': {
    ar: 'الموزعون يغلقون مبكراً. اطلب النواقص الصيدلانية الآن.',
    en: 'Distributors close early. Order pharmacy essentials now.',
  },
  'Eid al-Adha': {
    ar: 'توقف كامل للتوريد لمدة ٤ أيام. تأمين أدوية الطوارئ والمحاليل.',
    en: '4-day pharmaceutical supply freeze. High emergency demand.',
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { year } = await req.json();
    if (!year) {
      return new Response(JSON.stringify({ success: false, error: 'Missing year parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = Deno.env.get('CALENDARIFIC_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'CALENDARIFIC_API_KEY not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Call Calendarific API for Egypt
    console.log(`[Sync] Fetching holidays from Calendarific for EG in ${year}...`);
    const apiUrl = `https://calendarific.com/api/v2/holidays?api_key=${apiKey}&country=EG&year=${year}&type=religious,national`;
    const res = await fetch(apiUrl);

    if (!res.ok) {
      throw new Error(`Calendarific API returned status ${res.status}`);
    }

    const json = await res.json();
    const rawHolidays = json.response?.holidays || [];

    console.log(`[Sync] Found ${rawHolidays.length} raw holidays. Seeding to DB...`);

    const insertedHolidays = [];

    for (const h of rawHolidays) {
      const isoDate = h.date?.iso?.split('T')[0] || h.date?.iso;
      if (!isoDate) continue;

      const nameEN = h.name;
      // Match Arabic translations
      let nameAR = h.name_local || nameEN;
      for (const [enKey, arVal] of Object.entries(ARABIC_NAMES)) {
        if (nameEN.toLowerCase().includes(enKey.toLowerCase())) {
          nameAR = arVal;
          break;
        }
      }

      // Determine holiday type
      let type: 'national' | 'religious' | 'observance' = 'national';
      const isReligious = h.type?.some((t: string) => t.toLowerCase().includes('religious'));
      const isObservance = h.type?.some((t: string) => t.toLowerCase().includes('observance'));

      if (isReligious) type = 'religious';
      else if (isObservance || nameEN.toLowerCase().includes('ramadan')) type = 'observance';

      const isDayOff = type !== 'observance';

      // Match clinical supply alerts
      let alertAR = null;
      let alertEN = null;
      for (const [enKey, alerts] of Object.entries(CLINICAL_ALERTS)) {
        if (nameEN.toLowerCase().includes(enKey.toLowerCase())) {
          alertAR = alerts.ar;
          alertEN = alerts.en;
          break;
        }
      }

      const holidayRow = {
        date: isoDate,
        actual_date: isoDate,
        name_en: nameEN,
        name_ar: nameAR,
        type: type,
        is_day_off: isDayOff,
        purchasing_alert_ar: alertAR,
        purchasing_alert_en: alertEN,
        updated_at: new Date().toISOString(),
      };

      // Upsert into holidays table (conflict on base date + English name to prevent duplicates)
      const { data, error } = await supabase
        .from('holidays')
        .upsert(holidayRow, { onConflict: 'date,name_en' })
        .select('*')
        .single();

      if (error) {
        // Fallback: try standard insert if table doesn't have unique constraint
        console.warn(`[Sync] Upsert failed for ${nameEN}, trying insert: ${error.message}`);
        const { data: insData, error: insError } = await supabase
          .from('holidays')
          .insert(holidayRow)
          .select('*')
          .single();

        if (insData) insertedHolidays.push(insData);
      } else if (data) {
        insertedHolidays.push(data);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully synchronized ${insertedHolidays.length} holidays for ${year}`,
        count: insertedHolidays.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Sync] Unexpected error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
