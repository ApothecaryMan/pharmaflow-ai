import { supabase } from '../../../lib/supabase';

export interface HolidayRow {
  id: string;
  date: string;
  type: string;
  name_en: string;
  name_ar: string;
  is_day_off: boolean;
  purchasing_alert_en?: string;
  purchasing_alert_ar?: string;
}

interface HolidayDbPayload {
  date: string;
  actual_date: string;
  name_en: string;
  name_ar: string;
  type: string;
  is_day_off: boolean;
  purchasing_alert_ar: string | null;
  purchasing_alert_en: string | null;
  updated_at: string;
}

export const holidaysRepository = {
  async getByYear(year: number): Promise<HolidayRow[]> {
    const { data, error } = await supabase
      .from('holidays')
      .select('*')
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
      .order('date', { ascending: true });

    if (error) throw error;
    return (data || []) as HolidayRow[];
  },

  async upsert(payload: HolidayDbPayload): Promise<HolidayRow> {
    const { data, error } = await supabase.from('holidays').insert(payload).select('*').single();
    if (error) throw error;
    return data as HolidayRow;
  },

  async update(id: string, payload: Partial<HolidayDbPayload>): Promise<HolidayRow> {
    const { data, error } = await supabase
      .from('holidays')
      .update(payload)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as HolidayRow;
  },

  async syncFromEdgeFunction(year: number): Promise<void> {
    const { error } = await supabase.functions.invoke('sync-holidays', {
      body: { year },
    });
    if (error) throw error;
  },

  subscribe(onUpdate: () => void): () => void {
    try {
      const channel = supabase
        .channel('realtime-holidays')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'holidays' }, () => {
          onUpdate();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      return () => {};
    }
  },
};
