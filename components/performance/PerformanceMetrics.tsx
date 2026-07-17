import { type React, useCallback, useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  type EndpointMetrics,
  resetRequestHistory,
  useEndpointMetrics,
  useRecentRequests,
} from '../../utils/networkTracker';
import { PageHeader } from '../common/PageHeader';
import { SegmentedControl } from '../common/SegmentedControl';

type Tab = 'bandwidth' | 'slowest' | 'frequency' | 'errors' | 'live';

function fmtBytes(bytes: number): string {
  if (!bytes) return '0 B';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), s.length - 1);
  return `${(bytes / k ** i).toFixed(i === 0 ? 0 : 1)} ${s[i]}`;
}

function cleanEndpoint(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname;
  } catch {
    return url.split('?')[0];
  }
}

function fmtMs(ms: number): string {
  if (ms < 1) return `${(ms * 1000).toFixed(0)}µs`;
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const CHART_COLORS = [
  '#06b6d4',
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
  '#84cc16',
  '#f97316',
  '#14b8a6',
  '#ef4444',
];

function badgeClass(method: string) {
  if (method === 'GET')
    return 'bg-emerald-100 dark:bg-emerald-900/35 text-emerald-700 dark:text-emerald-400';
  if (method === 'POST') return 'bg-sky-100 dark:bg-sky-900/35 text-sky-700 dark:text-sky-400';
  if (method === 'PATCH')
    return 'bg-amber-100 dark:bg-amber-900/35 text-amber-700 dark:text-amber-400';
  if (method === 'DELETE')
    return 'bg-rose-100 dark:bg-rose-900/35 text-rose-700 dark:text-rose-400';
  return 'bg-gray-100 dark:bg-gray-800/40 text-gray-600 dark:text-gray-400';
}

function buildChartData(metrics: EndpointMetrics[], sortKey: keyof EndpointMetrics, limit = 10) {
  const grouped = new Map<string, EndpointMetrics>();

  for (const m of metrics) {
    const path = cleanEndpoint(m.endpoint);
    const key = `${m.method}:${path}`;
    const existing = grouped.get(key);
    if (existing) {
      existing.callCount += m.callCount;
      existing.totalEgress += m.totalEgress;
      existing.totalIngress += m.totalIngress;
      existing.totalDuration += m.totalDuration;
      existing.errorCount += m.errorCount;
      existing.successCount += m.successCount;
      existing.minDuration = Math.min(existing.minDuration, m.minDuration);
      existing.maxDuration = Math.max(existing.maxDuration, m.maxDuration);
      existing.lastCalled = Math.max(existing.lastCalled, m.lastCalled);
    } else {
      grouped.set(key, { ...m, endpoint: path });
    }
  }

  const merged = Array.from(grouped.values());
  for (const m of merged) {
    m.avgDuration = m.callCount > 0 ? m.totalDuration / m.callCount : 0;
  }

  return [...merged]
    .sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number))
    .slice(0, limit)
    .map((m, i) => ({
      name: `${m.method} ${m.endpoint}`,
      value: m[sortKey] as number,
      fill: CHART_COLORS[i % CHART_COLORS.length],
      errorRate: m.callCount > 0 ? ((m.errorCount / m.callCount) * 100).toFixed(1) : '0.0',
      avgDuration: m.avgDuration,
      callCount: m.callCount,
      method: m.method,
    }));
}

function EmptyState() {
  return (
    <div className='flex flex-col items-center justify-center h-44 gap-2 select-none'>
      <span className='material-symbols-rounded text-3xl opacity-20'>bar_chart</span>
      <p className='text-xs opacity-40 font-medium tracking-wide'>
        No data yet — make some API requests
      </p>
    </div>
  );
}

interface ChartCardProps {
  data: {
    name: string;
    value: number;
    fill: string;
    callCount: number;
    avgDuration: number;
    method: string;
  }[];
  tickFmt: (v: number) => string;
  tooltipFmt: (v: number) => string;
  suffix?: string;
}

function ChartCard({ data, tickFmt, tooltipFmt, suffix }: ChartCardProps) {
  if (!data.length) return <EmptyState />;

  return (
    <div className='h-52'>
      <ResponsiveContainer width='100%' height='100%'>
          <BarChart data={data} layout='vertical' margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray='3 3'
            horizontal={false}
            stroke='var(--border-divider)'
            opacity={0.25}
          />
          <XAxis
            type='number'
            tick={{ fontSize: 10, fill: 'var(--text-secondary)' }}
            tickFormatter={tickFmt}
          />
          <YAxis
            type='category'
            dataKey='name'
            tick={({ y, payload }) => {
              const label = payload.value;
              const maxChars = 28;
              const truncated = label.length > maxChars ? label.slice(0, maxChars) + '…' : label;
              return (
                <text
                  x={4}
                  y={y}
                  dy={4}
                  textAnchor='start'
                  fill='var(--text-secondary)'
                  fontSize={10}
                  direction='ltr'
                >
                  {truncated}
                </text>
              );
            }}
            width={190}
            interval={0}
            tickLine={false}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ChartCardProps['data'][0];
              return (
                <div className='backdrop-blur-xl bg-(--bg-card)/85 px-3 py-2.5 rounded-xl shadow-2xl border border-(--border-divider) text-xs min-w-[180px]'>
                  <div className='flex items-center gap-2 mb-1.5'>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${badgeClass(d.method)}`}
                    >
                      {d.method}
                    </span>
                    <span className='font-mono text-[11px] truncate flex-1 opacity-80'>
                      {d.name}
                    </span>
                  </div>
                  <div className='flex items-baseline gap-1.5'>
                    <span className='text-base font-black tabular-nums' style={{ color: d.fill }}>
                      {tooltipFmt(d.value)}
                      {suffix}
                    </span>
                  </div>
                  <div className='flex gap-3 mt-1.5 text-[10px] opacity-50'>
                    <span>{d.callCount} calls</span>
                    <span>· avg {fmtMs(d.avgDuration)}</span>
                  </div>
                </div>
              );
            }}
          />
          <Bar dataKey='value' radius={[0, 4, 4, 0]} maxBarSize={16}>
            {data.map((e) => (
              <Cell key={e.name} fill={e.fill} />
            ))}
            <LabelList
              dataKey='value'
              position='right'
              formatter={(v: number) => tickFmt(v)}
              style={{ fontSize: 10, fill: 'var(--text-secondary)', fontWeight: 600 }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function MetricsTable({
  metrics,
  sortKey,
  valueLabel,
  valueFmt,
}: {
  metrics: EndpointMetrics[];
  sortKey: keyof EndpointMetrics;
  valueLabel: string;
  valueFmt: (v: number) => string;
}) {
  const sorted = useMemo(
    () => [...metrics].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)).slice(0, 25),
    [metrics, sortKey]
  );

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-xs border-collapse'>
        <thead>
          <tr className='border-b border-(--border-divider)'>
            <th className='text-left py-2.5 pl-1 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-8'>
              #
            </th>
            <th className='text-left py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50'>
              Endpoint
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-16'>
              Method
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-16'>
              Calls
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-28'>
              {valueLabel}
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-24'>
              Avg
            </th>
            <th className='text-right py-2.5 pr-1 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-16'>
              Errors
            </th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, idx) => (
            <tr
              key={`${m.method}:${m.endpoint}`}
              className='border-b border-(--border-divider)/30 hover:bg-cyan-500/5 transition-colors'
            >
              <td className='py-2 pl-1 pr-3 text-right font-mono tabular-nums text-[11px] opacity-40 w-8'>
                {idx + 1}
              </td>
              <td
                className='py-2 pr-4 font-mono text-[11px] truncate max-w-[320px]'
                title={cleanEndpoint(m.endpoint)}
                >{cleanEndpoint(m.endpoint)}
              </td>
              <td className='py-2 text-right'>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${badgeClass(m.method)}`}
                >
                  {m.method}
                </span>
              </td>
              <td className='py-2 text-right font-mono tabular-nums text-[11px]'>{m.callCount}</td>
              <td className='py-2 text-right font-mono tabular-nums text-[11px] font-semibold'>
                {valueFmt(m[sortKey] as number)}
              </td>
              <td className='py-2 text-right font-mono tabular-nums text-[11px] opacity-60'>
                {fmtMs(m.avgDuration)}
              </td>
              <td className='py-2 pr-1 text-right font-mono tabular-nums text-[11px]'>
                <span
                  className={
                    m.errorCount > 0
                      ? 'text-rose-500 dark:text-rose-400 font-semibold'
                      : 'opacity-40'
                  }
                >
                  {m.errorCount}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LiveLog() {
  const requests = useRecentRequests(200);

  if (!requests.length) return <EmptyState />;

  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-xs border-collapse'>
        <thead>
          <tr className='border-b border-(--border-divider) sticky top-0 bg-(--bg-page)'>
            <th className='text-left py-2.5 pl-1 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-8'>
              #
            </th>
            <th className='text-left py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-20'>
              Time
            </th>
            <th className='text-left py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-16'>
              Method
            </th>
            <th className='text-left py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50'>
              Endpoint
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-16'>
              Status
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-22'>
              Duration
            </th>
            <th className='text-right py-2.5 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-22'>
              ↑ Sent
            </th>
            <th className='text-right py-2.5 pr-1 font-semibold text-[11px] uppercase tracking-wider opacity-50 w-22'>
              ↓ Received
            </th>
          </tr>
        </thead>
        <tbody>
          {requests.map((req, idx) => (
            <tr
              key={req.id}
              className='border-b border-(--border-divider)/20 hover:bg-cyan-500/5 transition-colors'
            >
              <td className='py-1.5 pl-1 pr-3 text-right font-mono tabular-nums text-[11px] opacity-30 w-8'>
                {idx + 1}
              </td>
              <td className='py-1.5 pr-3 font-mono text-[11px] opacity-50 whitespace-nowrap'>
                {fmtTime(req.timestamp)}
              </td>
              <td className='py-1.5 pr-3'>
                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold leading-none ${badgeClass(req.method)}`}
                >
                  {req.method}
                </span>
              </td>
              <td
                className='py-1.5 pr-3 font-mono text-[11px] truncate max-w-[360px]'
                title={req.url}
              >
                <span className='flex items-center gap-2'>
                  <span
                    className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${req.success ? 'bg-emerald-500' : 'bg-rose-500'}`}
                  />
                  {req.url}
                </span>
              </td>
              <td className='py-1.5 text-right'>
                <span
                  className={`font-mono tabular-nums text-[11px] font-bold ${req.success ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400'}`}
                >
                  {req.status}
                </span>
              </td>
              <td className='py-1.5 text-right font-mono tabular-nums text-[11px] opacity-70'>
                {fmtMs(req.duration)}
              </td>
              <td className='py-1.5 text-right font-mono tabular-nums text-[11px] opacity-60'>
                {fmtBytes(req.egress)}
              </td>
              <td className='py-1.5 pr-1 text-right font-mono tabular-nums text-[11px] opacity-60'>
                {fmtBytes(req.ingress)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: boolean;
  pulse?: boolean;
}

function StatCard({ label, value, accent, pulse }: StatCardProps) {
  return (
    <div className='relative overflow-hidden rounded-xl border border-(--border-divider)/60 bg-(--bg-card) p-3.5'>
      {accent && (
        <div className='absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent' />
      )}
      <div className='relative'>
        <div className='flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider opacity-40'>
          {pulse && (
            <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse' />
          )}
          {label}
        </div>
        <div className='text-xl font-black tabular-nums mt-1 leading-none tracking-tight'>
          {value}
        </div>
      </div>
    </div>
  );
}

function metricsCsv(
  metrics: EndpointMetrics[],
  sortKey: keyof EndpointMetrics,
  valueLabel: string,
  limit?: number
): string {
  const sorted = limit
    ? [...metrics].sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number)).slice(0, limit)
    : [...metrics];
  const header = `Endpoint,Method,Calls,${valueLabel},Avg Duration (ms),Errors`;
  const rows = sorted.map((m) =>
    [
      `"${cleanEndpoint(m.endpoint)}"`,
      m.method,
      m.callCount,
      m[sortKey],
      m.avgDuration.toFixed(2),
      m.errorCount,
    ].join(',')
  );
  return [header, ...rows].join('\n');
}

function copyText(text: string) {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand('copy');
  } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

function CopyCsvButton({ getCsv, label }: { getCsv: () => string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleCopy = useCallback(() => {
    copyText(getCsv()).then(() => {
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 1500);
    });
  }, [getCsv]);

  return (
    <button
      onClick={handleCopy}
      className='flex items-center gap-1 px-2 py-1 text-[10px] font-semibold rounded-md border border-(--border-divider)/50 hover:bg-(--bg-card)/80 active:scale-95 transition-all'
      type='button'
      title={`Copy ${label} as CSV`}
    >
      <span className='material-symbols-rounded' style={{ fontSize: '12px' }}>
        {copied ? 'check' : 'content_copy'}
      </span>
      {copied ? 'Copied' : 'CSV'}
    </button>
  );
}

function SectionHeader({
  title,
  getCsv,
  csvLabel,
}: {
  title: string;
  getCsv: () => string;
  csvLabel: string;
}) {
  return (
    <div className='flex items-center justify-between mb-3'>
      <h3 className='text-[10px] font-bold uppercase tracking-widest opacity-40'>{title}</h3>
      <CopyCsvButton getCsv={getCsv} label={csvLabel} />
    </div>
  );
}

const TABS = [
  { label: 'Bandwidth', value: 'bandwidth' as Tab, icon: 'network_ping' },
  { label: 'Slowest', value: 'slowest' as Tab, icon: 'schedule' },
  { label: 'Frequency', value: 'frequency' as Tab, icon: 'bar_chart' },
  { label: 'Errors', value: 'errors' as Tab, icon: 'error' },
  { label: 'Live Log', value: 'live' as Tab, icon: 'terminal' },
];

export const PerformanceMetrics: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('bandwidth');
  const metrics = useEndpointMetrics();
  const requests = useRecentRequests(1);

  const bandwidthData = useMemo(() => buildChartData(metrics, 'totalIngress'), [metrics]);
  const slowestData = useMemo(() => buildChartData(metrics, 'avgDuration'), [metrics]);
  const frequencyData = useMemo(() => buildChartData(metrics, 'callCount'), [metrics]);
  const errorsData = useMemo(() => buildChartData(metrics, 'errorCount'), [metrics]);

  const summary = useMemo(() => {
    const totalCalls = metrics.reduce((s, m) => s + m.callCount, 0);
    const totalIngress = metrics.reduce((s, m) => s + m.totalIngress, 0);
    const totalEgress = metrics.reduce((s, m) => s + m.totalEgress, 0);
    const totalErrors = metrics.reduce((s, m) => s + m.errorCount, 0);
    const avgDuration =
      totalCalls > 0 ? metrics.reduce((s, m) => s + m.totalDuration, 0) / totalCalls : 0;
    return { totalCalls, totalIngress, totalEgress, totalErrors, avgDuration };
  }, [metrics]);

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      <PageHeader
        centerContent={
          <SegmentedControl
            options={TABS}
            value={activeTab}
            onChange={setActiveTab}
            size='xs'
            shape='pill'
          />
        }
        rightContent={
          <div className='flex items-center gap-2'>
            <span className='hidden sm:flex items-center gap-1.5 text-[11px] opacity-40 font-mono'>
              <span className='inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse' />
              {requests.length > 0 ? 'live' : 'idle'}
            </span>
            <button
              onClick={() => {
                resetRequestHistory();
              }}
              className='px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-(--border-divider)/60 hover:bg-(--bg-card)/80 active:scale-95 transition-all'
              type='button'
            >
              Clear
            </button>
          </div>
        }
        sticky
      />

      <div className='flex-1 flex flex-col overflow-hidden px-page pb-page' dir='ltr'>
        <div className='grid grid-cols-5 gap-3 pt-4 mb-4 shrink-0'>
          <StatCard label='Total Calls' value={String(summary.totalCalls)} />
          <StatCard label='Downloaded' value={fmtBytes(summary.totalIngress)} accent />
          <StatCard label='Uploaded' value={fmtBytes(summary.totalEgress)} accent />
          <StatCard label='Avg Duration' value={fmtMs(summary.avgDuration)} />
          <StatCard
            label='Errors'
            value={String(summary.totalErrors)}
            pulse={summary.totalErrors > 0}
          />
        </div>

        <div className='flex-1 overflow-y-auto min-h-0 space-y-3'>
          {activeTab === 'bandwidth' && (
            <>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='Top Endpoints by Download'
                  getCsv={() => metricsCsv(metrics, 'totalIngress', 'Download', 10)}
                  csvLabel='Top Bandwidth'
                />
                <ChartCard data={bandwidthData} tickFmt={fmtBytes} tooltipFmt={fmtBytes} />
              </section>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='All Endpoints'
                  getCsv={() => metricsCsv(metrics, 'totalIngress', 'Download')}
                  csvLabel='All Endpoints'
                />
                <MetricsTable
                  metrics={metrics}
                  sortKey='totalIngress'
                  valueLabel='Download'
                  valueFmt={fmtBytes}
                />
              </section>
            </>
          )}

          {activeTab === 'slowest' && (
            <>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='Slowest Endpoints'
                  getCsv={() => metricsCsv(metrics, 'avgDuration', 'Avg Duration', 10)}
                  csvLabel='Slowest'
                />
                <ChartCard data={slowestData} tickFmt={fmtMs} tooltipFmt={fmtMs} />
              </section>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='All Endpoints'
                  getCsv={() => metricsCsv(metrics, 'avgDuration', 'Avg Duration')}
                  csvLabel='All Endpoints'
                />
                <MetricsTable
                  metrics={metrics}
                  sortKey='avgDuration'
                  valueLabel='Avg Duration'
                  valueFmt={fmtMs}
                />
              </section>
            </>
          )}

          {activeTab === 'frequency' && (
            <>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='Most Called Endpoints'
                  getCsv={() => metricsCsv(metrics, 'callCount', 'Calls', 10)}
                  csvLabel='Most Called'
                />
                <ChartCard
                  data={frequencyData}
                  tickFmt={(v) => String(v)}
                  tooltipFmt={(v) => String(v)}
                  suffix=' calls'
                />
              </section>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='All Endpoints'
                  getCsv={() => metricsCsv(metrics, 'callCount', 'Calls')}
                  csvLabel='All Endpoints'
                />
                <MetricsTable
                  metrics={metrics}
                  sortKey='callCount'
                  valueLabel='Calls'
                  valueFmt={(v) => String(v)}
                />
              </section>
            </>
          )}

          {activeTab === 'errors' && (
            <>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='Most Error-Prone Endpoints'
                  getCsv={() => metricsCsv(metrics, 'errorCount', 'Errors', 10)}
                  csvLabel='Most Errors'
                />
                <ChartCard
                  data={errorsData}
                  tickFmt={(v) => String(v)}
                  tooltipFmt={(v) => String(v)}
                  suffix=' errors'
                />
              </section>
              <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
                <SectionHeader
                  title='All Endpoints'
                  getCsv={() => metricsCsv(metrics, 'errorCount', 'Errors')}
                  csvLabel='All Endpoints'
                />
                <MetricsTable
                  metrics={metrics}
                  sortKey='errorCount'
                  valueLabel='Errors'
                  valueFmt={(v) => String(v)}
                />
              </section>
            </>
          )}

          {activeTab === 'live' && (
            <section className='rounded-xl border border-(--border-divider)/50 bg-(--bg-card) p-4'>
              <div className='flex items-center justify-between mb-3'>
                <h3 className='text-[10px] font-bold uppercase tracking-widest opacity-40'>
                  Recent Requests
                </h3>
                <span className='text-[10px] font-mono opacity-30 tabular-nums'>
                  {requests.length} requests
                </span>
              </div>
              <LiveLog />
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
