import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from '@supabase/supabase-js';

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DailyResult {
  branch_id: string;
  org_id: string;
  date: string;
  revenue: number;
  target: number;
  achievement_pct: number;
  is_future: boolean;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as {
      start_date?: string;
      end_date?: string;
      branch_id?: string;
      backfill?: boolean;
    };

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const startDate = body.start_date ?? todayStr;
    const endDate = body.end_date ?? startDate;

    console.log(
      `[Compute Achievements] Starting for range ${startDate} → ${endDate}${body.branch_id ? ` (branch: ${body.branch_id})` : ' (all branches)'}`
    );

    // Fetch all active branches
    let branchQuery = supabase
      .from('branches')
      .select('id, org_id, monthly_sales_target')
      .eq('status', 'active');

    if (body.branch_id) {
      branchQuery = branchQuery.eq('id', body.branch_id);
    }

    const { data: branches, error: branchError } = await branchQuery;

    if (branchError) {
      throw new Error(`Branch fetch failed: ${branchError.message}`);
    }

    if (!branches?.length) {
      console.log('[Compute Achievements] No active branches found');
      return new Response(
        JSON.stringify({ success: true, message: 'No branches to process', count: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const allResults: DailyResult[] = [];

    for (const branch of branches) {
      if (!branch.monthly_sales_target || branch.monthly_sales_target <= 0) {
        console.log(`[Compute Achievements] Branch ${branch.id} has no monthly target, skipping`);
        continue;
      }

      // Compute daily target from monthly target
      const startDateObj = new Date(startDate);
      const daysInMonth = new Date(
        startDateObj.getFullYear(),
        startDateObj.getMonth() + 1,
        0
      ).getDate();
      const dailyTarget = Math.round(branch.monthly_sales_target / daysInMonth);

      // Fetch completed sales for the date range
      const { data: sales, error: salesError } = await supabase
        .from('sales')
        .select('date, total, net_total')
        .eq('branch_id', branch.id)
        .eq('status', 'completed')
        .gte('date', startDate)
        .lte('date', endDate);

      if (salesError) {
        console.error(
          `[Compute Achievements] Sales query failed for branch ${branch.id}: ${salesError.message}`
        );
        continue;
      }

      // Aggregate revenue by day
      const dayMap = new Map<string, number>();
      for (const sale of sales ?? []) {
        const day = sale.date.slice(0, 10);
        const net = sale.net_total ?? sale.total ?? 0;
        dayMap.set(day, (dayMap.get(day) || 0) + Number(net));
      }

      // Build results for each day in range
      const rangeStart = new Date(startDate);
      const rangeEnd = new Date(endDate);

      for (let d = new Date(rangeStart); d <= rangeEnd; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().slice(0, 10);
        const revenue = dayMap.get(dateStr) ?? 0;
        const pct = dailyTarget > 0 ? Math.round((revenue / dailyTarget) * 10000) / 100 : 0;
        const isFuture = dateStr > todayStr;

        allResults.push({
          branch_id: branch.id,
          org_id: branch.org_id,
          date: dateStr,
          revenue: Math.round(revenue * 100) / 100,
          target: dailyTarget,
          achievement_pct: pct,
          is_future: isFuture,
        });
      }
    }

    // Upsert results
    if (allResults.length > 0) {
      const { error: upsertError } = await supabase
        .from('daily_target_achievements')
        .upsert(allResults, {
          onConflict: 'branch_id,date',
          ignoreDuplicates: false,
        });

      if (upsertError) {
        throw new Error(`Upsert failed: ${upsertError.message}`);
      }
    }

    console.log(`[Compute Achievements] Done — ${allResults.length} records upserted`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Computed ${allResults.length} daily achievement records`,
        count: allResults.length,
        range: { start: startDate, end: endDate },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Compute Achievements] Error:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
