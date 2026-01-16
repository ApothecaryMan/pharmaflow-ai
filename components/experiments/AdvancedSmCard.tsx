import React from 'react';
import { CARD_BASE } from '../../utils/themeStyles';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, Tooltip, Cell, XAxis } from 'recharts';

import { ExpandedChartModal } from './ExpandedChartModal'; // Import the new modal
import { ExpandedProgressModal } from './ExpandedProgressModal'; // Import the new progress modal

interface AdvancedSmCardProps {
  color: string;
  t: any;
  language: string;
}

const CARD_HOVER = ""; // No animations

// --- Mock Data ---

const sparkData1 = [
  { value: 400 }, { value: 300 }, { value: 500 }, { value: 450 },
  { value: 600 }, { value: 550 }, { value: 700 }
];

const sparkData2 = [
  { value: 100 }, { value: 120 }, { value: 110 }, { value: 140 },
  { value: 130 }, { value: 160 }, { value: 150 }
];

const sparkData3 = [ 
  { value: 800 }, { value: 750 }, { value: 780 }, { value: 700 },
  { value: 650 }, { value: 600 }, { value: 550 }
];

const barData1 = [
  { name: 'M', value: 40 }, { name: 'T', value: 30 }, { name: 'W', value: 50 }, 
  { name: 'T', value: 45 }, { name: 'F', value: 60 }, { name: 'S', value: 55 }, { name: 'S', value: 40 }
];

const barData2 = [
  { name: 'A', value: 20 }, { name: 'B', value: 40 }, { name: 'C', value: 30 }, 
  { name: 'D', value: 50 }, { name: 'E', value: 25 }
];


// --- Sub-Components ---

import { SmallCard } from '../common/SmallCard';

// ... (keep props interface if needed but StatCardProps is moving)
// ...

// 2. Sparkline Card (moving StatCard removal to next step or doing it here if safe)
// I will just remove the StatCard definition block.


// 2. Sparkline Card (Area Chart)
export const SparklineCard = ({ title, value, data, color, onClick }: any) => (
  <div 
    onClick={onClick}
    className={`p-0 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-36 relative overflow-hidden flex flex-col cursor-pointer transition-transform active:scale-[0.98] group`}
  >
    <div className="absolute top-3 right-3 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
        <span className="material-symbols-rounded text-gray-400">open_in_full</span>
    </div>
    <div className="p-5 pb-0 z-10">
      <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
      <h4 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</h4>
    </div>
    <div className="absolute bottom-0 left-0 right-0 h-20 opacity-50">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis hide axisLine={false} tickLine={false} padding={{ left: 0, right: 0 }} />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={color} 
            strokeWidth={2} 
            fill={`url(#gradient-${color})`} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// 3. ProgressCard
export const ProgressCard = ({ title, value, max, progressColor, icon, onClick }: any) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  return (
    <div 
        onClick={onClick}
        className={`p-5 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-36 flex flex-col justify-center cursor-pointer transition-transform active:scale-[0.98]`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${progressColor}-100 dark:bg-${progressColor}-900/20 text-${progressColor}-600 dark:text-${progressColor}-400`}>
            <span className="material-symbols-rounded text-xl">{icon}</span>
          </div>
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{title}</p>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white">{value} <span className="text-xs text-gray-400 font-normal">/ {max}</span></h4>
          </div>
        </div>
      </div>
      <div className="relative w-full h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden mt-3">
        <div 
          className={`absolute left-0 top-0 h-full rounded-full bg-${progressColor}-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-right text-xs font-medium text-gray-500 mt-1.5">{percentage.toFixed(0)}% Complete</p>
    </div>
  );
};

// 4. Bar Chart Card (New)
export const BarChartCard = ({ title, value, data, color }: any) => (
  <div className={`p-5 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-36 flex flex-col`}>
    <div className="flex justify-between items-end mb-2">
       <div>
         <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{title}</p>
         <h4 className="text-xl font-bold text-gray-900 dark:text-white">{value}</h4>
       </div>
    </div>
    <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
         <BarChart data={data}>
           <Bar dataKey="value" radius={[4, 4, 0, 0]}>
             {data.map((entry: any, index: number) => (
               <Cell key={`cell-${index}`} fill={color} />
             ))}
           </Bar>
         </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

// 5. Action Card
export const ActionCard = ({ title, icon, color, actionLabel }: any) => (
  <div className={`p-4 rounded-3xl ${CARD_BASE} ${CARD_HOVER} h-36 flex flex-col items-center justify-center text-center group cursor-pointer border border-transparent hover:border-${color}-200 dark:hover:border-${color}-800`}>
    <div className={`w-12 h-12 rounded-2xl bg-${color}-50 dark:bg-${color}-900/10 text-${color}-500 dark:text-${color}-400 flex items-center justify-center mb-3`}>
      <span className="material-symbols-rounded text-3xl">{icon}</span>
    </div>
    <h4 className="font-semibold text-gray-900 dark:text-white mb-0.5">{title}</h4>
    <p className="text-xs text-blue-500 font-medium group-hover:underline">{actionLabel}</p>
  </div>
);

// 6. Remaining: Status & Grid
const StatusGlassCard = ({ title, status, message, gradient }: any) => (
  <div 
    className={`p-5 rounded-3xl h-36 flex flex-col justify-between relative overflow-hidden shadow-lg ${CARD_HOVER}`}
    style={{ background: gradient }}
  >
    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>
    <div className="relative z-10">
      <div className="flex justify-between items-center mb-2">
         <p className="text-white/80 text-sm font-medium">{title}</p>
         <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[10px] uppercase font-bold tracking-wider backdrop-blur-sm">
           {status}
         </span>
      </div>
      <h4 className="text-white text-lg font-bold leading-tight">{message}</h4>
    </div>
    <div className="relative z-10 flex items-center gap-2 mt-2">
       <div className="h-1.5 w-1.5 rounded-full bg-white"></div>
       <p className="text-white/70 text-xs">System Active</p>
    </div>
  </div>
);

const IconGridCard = ({ items }: any) => (
    <div className={`p-4 rounded-3xl ${CARD_BASE} h-36 grid grid-cols-2 gap-2`}>
        {items.map((item: any, idx: number) => (
            <div key={idx} className="flex flex-col items-center justify-center p-2 rounded-xl bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer text-center">
                <span className={`material-symbols-rounded text-xl mb-1 text-${item.color}-500`}>{item.icon}</span>
                <span className="text-[10px] text-gray-600 dark:text-gray-300 font-medium">{item.label}</span>
            </div>
        ))}
    </div>
)


// === Main Component ===

export const AdvancedSmCard: React.FC<AdvancedSmCardProps> = ({ color, t, language }) => {
  const isRTL = language === 'AR';

  // Modal State
  const [modalOpen, setModalOpen] = React.useState(false);
  const [selectedChart, setSelectedChart] = React.useState<any>(null);

  const [progressModalOpen, setProgressModalOpen] = React.useState(false);
  const [selectedProgress, setSelectedProgress] = React.useState<any>(null);

  const handleChartClick = (title: string, data: any[], color: string) => {
    setSelectedChart({ title, data, color });
    setModalOpen(true);
  };

  const handleProgressClick = (title: string, value: number, max: number, color: string, icon: string) => {
    setSelectedProgress({ title, value, max, color, icon });
    setProgressModalOpen(true);
  };
  


  return (
    <div className="h-full overflow-y-auto w-full p-2 space-y-8 pb-20" dir={isRTL ? 'rtl' : 'ltr'}>
      
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Advanced Small Cards</h2>
        <p className="text-gray-500 dark:text-gray-400">Structured layout: Metric, Charts, Progress, Bar, Actions, Others.</p>
      </div>

      {/* 1. Metric Cards */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">1. Metrics</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <SmallCard title="Total Revenue" value="$45,231" icon="payments" iconColor="emerald" trend="up" trendValue="12.5%" trendLabel="vs last month" />
          <SmallCard title="Active Users" value="1,240" icon="group" iconColor="blue" trend="up" trendValue="3.2%" trendLabel="vs last week" />
          <SmallCard title="Bounce Rate" value="42.3%" icon="analytics" iconColor="rose" trend="down" trendValue="0.8%" trendLabel="vs yesterday" />
          <SmallCard title="Pending Orders" value="18" icon="shopping_cart_checkout" iconColor="amber" trend="up" trendValue="5" trendLabel="new today" />
        </div>
      </section>

      {/* 2. Charts (Sparklines) */}
      <section>
         <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">2. Area Charts (Sparklines) - Click to Expand</h3>
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
             <SparklineCard 
                title="Weekly Sales" 
                value="2,450" 
                data={sparkData1} 
                color="#8b5cf6" 
                onClick={() => handleChartClick("Weekly Sales", sparkData1, "#8b5cf6")}
             />
             <SparklineCard 
                title="New Subscriptions" 
                value="145" 
                data={sparkData2} 
                color="#3b82f6" 
                onClick={() => handleChartClick("New Subscriptions", sparkData2, "#3b82f6")}
             />
             <SparklineCard 
                title="Server Load" 
                value="42%" 
                data={sparkData3} 
                color="#ef4444" 
                onClick={() => handleChartClick("Server Load", sparkData3, "#ef4444")}
             />
             <SparklineCard 
                title="Page Views" 
                value="85.2k" 
                data={sparkData1} 
                color="#10b981" 
                onClick={() => handleChartClick("Page Views", sparkData1, "#10b981")}
             />
         </div>
      </section>

      {/* 3. Progress Cards */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">3. Progress</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <ProgressCard title="Monthly Target" value={7500} max={10000} progressColor="blue" icon="target" onClick={() => handleProgressClick("Monthly Target", 7500, 10000, "blue", "target")} />
            <ProgressCard title="Stock Capacity" value={820} max={1000} progressColor="amber" icon="warehouse" onClick={() => handleProgressClick("Stock Capacity", 820, 1000, "amber", "warehouse")} />
            <ProgressCard title="Goal A" value={45} max={100} progressColor="emerald" icon="flag" onClick={() => handleProgressClick("Goal A", 45, 100, "emerald", "flag")} />
            <ProgressCard title="Goal B" value={90} max={100} progressColor="purple" icon="star" onClick={() => handleProgressClick("Goal B", 90, 100, "purple", "star")} />
        </div>
      </section>

      {/* 4. Bar Charts (New) */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">4. Bar Charts</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            <BarChartCard title="Daily Sales" value="$1.2k" data={barData1} color="#3b82f6" />
            <BarChartCard title="Category Perf" value="Top 5" data={barData2} color="#f59e0b" />
            <BarChartCard title="User Activity" value="Active" data={barData1} color="#10b981" />
            <BarChartCard title="Conversions" value="3.4%" data={barData2} color="#8b5cf6" />
        </div>
      </section>

      {/* 5. Actions */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">5. Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
            <ActionCard title="Add User" icon="person_add" color="blue" actionLabel="Create New" />
            <ActionCard title="Generate Report" icon="description" color="emerald" actionLabel="Download PDF" />
            <ActionCard title="Sync Data" icon="sync" color="violet" actionLabel="Run Sync" />
            <ActionCard title="Settings" icon="settings" color="gray" actionLabel="Configure" />
            <ActionCard title="Upload" icon="upload" color="cyan" actionLabel="Select File" />
            <ActionCard title="Print" icon="print" color="orange" actionLabel="Start Job" />
        </div>
      </section>

      {/* 6. Others */}
      <section>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4 px-1">6. Other Cards</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <StatusGlassCard title="System Status" status="Normal" message="All systems operational" gradient="linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)" />
            <StatusGlassCard title="Security Alert" status="Warning" message="5 failed login attempts" gradient="linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" />
            <div className="col-span-1">
                <IconGridCard items={[
                        {icon: 'mail', label: 'Inbox', color: 'blue'},
                        {icon: 'chat', label: 'Chat', color: 'green'},
                        {icon: 'folder', label: 'Files', color: 'amber'},
                        {icon: 'event', label: 'Calendar', color: 'purple'}
                    ]}
                />
            </div>
        </div>
      </section>

      {/* Modal */}
      {selectedChart && (
        <ExpandedChartModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={selectedChart.title}
          data={selectedChart.data}
          color={selectedChart.color}
        />
      )}

      {selectedProgress && (
        <ExpandedProgressModal
            isOpen={progressModalOpen}
            onClose={() => setProgressModalOpen(false)}
            title={selectedProgress.title}
            currentValue={selectedProgress.value}
            maxValue={selectedProgress.max}
            color={selectedProgress.color}
            icon={selectedProgress.icon}
        />
      )}

    </div>
  );
};
