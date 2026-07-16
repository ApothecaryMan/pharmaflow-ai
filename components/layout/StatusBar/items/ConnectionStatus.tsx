import type React from 'react';
import { memo, useMemo } from 'react';
import { useNetworkStatus } from '@/hooks/common/useNetworkStatus';
import { StatusBarItem } from '../StatusBarItem';
import { useNetworkUsage, type NetworkMetrics } from '@/utils/networkTracker';
import { useUI } from '@/context/UIContext';
function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const MetricsTooltipContent: React.FC<{
  latency?: number;
  statusText: string;
  qualityText?: string;
}> = ({ latency, statusText, qualityText }) => {
  const { developerMode } = useUI();
  const usage = useNetworkUsage();

  const metricsArray = Object.values(usage) as NetworkMetrics[];
  const totalEgress = metricsArray.reduce((acc, curr) => acc + curr.egress, 0);
  const totalIngress = metricsArray.reduce((acc, curr) => acc + curr.ingress, 0);

  const renderRow = (label: string, value: number, total: number, colorClass: string) => {
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
    return (
      <div className="flex items-center justify-between gap-6 py-0.5 text-xs whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colorClass}`} />
          <span className="opacity-80">
            {label} ({percent}%):
          </span>
        </div>
        <span className="font-mono font-medium opacity-90">{formatBytes(value)}</span>
      </div>
    );
  };

  if (!developerMode) {
    return (
      <div className="flex items-center gap-1.5 text-xs whitespace-nowrap font-sans normal-case tracking-normal opacity-80" dir="ltr">
        <span>Ping:</span>
        <span className="font-mono font-medium">{latency ?? '--'}ms</span>
        {qualityText && <span>({qualityText})</span>}
        <span className="opacity-50 mx-1">—</span>
        <span dir="rtl">{statusText}</span>
      </div>
    );
  }

  return (
    <div dir="ltr" className="flex flex-col min-w-[220px] gap-2 p-1 font-sans normal-case tracking-normal">
      <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/20 dark:border-black/20">
        {latency !== undefined ? (
          <div className="flex items-center gap-1.5 text-xs opacity-80">
            <span>Ping:</span>
            <span className="font-mono font-medium">{latency}ms</span>
            {qualityText && <span>({qualityText})</span>}
          </div>
        ) : <div />}
        <span className="font-semibold" dir="rtl">{statusText}</span>
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex justify-between opacity-60">
            <span>Upload</span>
            <span>{formatBytes(totalEgress)}</span>
          </div>
          {renderRow('Auth', usage.Auth.egress, totalEgress, 'bg-yellow-500 dark:bg-yellow-600')}
          {renderRow('PostgREST', usage.PostgREST.egress, totalEgress, 'bg-emerald-500 dark:bg-emerald-600')}
          {renderRow('Realtime', usage.Realtime.egress, totalEgress, 'bg-orange-500 dark:bg-orange-600')}
          {renderRow('Functions', usage.Functions.egress, totalEgress, 'bg-purple-500 dark:bg-purple-600')}
        </div>

        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1.5 flex justify-between opacity-60">
            <span>Download</span>
            <span>{formatBytes(totalIngress)}</span>
          </div>
          {renderRow('Auth', usage.Auth.ingress, totalIngress, 'bg-yellow-400 dark:bg-yellow-500')}
          {renderRow('PostgREST', usage.PostgREST.ingress, totalIngress, 'bg-emerald-400 dark:bg-emerald-500')}
          {renderRow('Realtime', usage.Realtime.ingress, totalIngress, 'bg-orange-400 dark:bg-orange-500')}
          {renderRow('Functions', usage.Functions.ingress, totalIngress, 'bg-purple-400 dark:bg-purple-500')}
        </div>
      </div>
    </div>
  );
};

interface ConnectionStatusProps {
  onlineText?: string;
  offlineText?: string;
  noInternetText?: string;
  checkingText?: string;
  goodText?: string;
  fairText?: string;
  poorText?: string;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = memo(
  ({
    onlineText = 'Online',
    offlineText = 'No Connection',
    noInternetText = 'No Internet',
    checkingText = 'Checking connection...',
    goodText = 'Good',
    fairText = 'Fair',
    poorText = 'Poor',
  }) => {
    const { status, latency, checking } = useNetworkStatus();

    const itemStatus = useMemo(() => {
      if (status === 'offline-device') {
        return {
          icon: 'wifi_off',
          variant: 'error' as const,
          tooltip: offlineText,
          label: offlineText,
          pulse: true,
        };
      }

      if (status === 'offline-no-internet') {
        return {
          icon: 'wifi_find',
          variant: 'warning' as const,
          tooltip: noInternetText,
          label: noInternetText,
          pulse: true,
        };
      }

      if (checking) {
        return {
          icon: 'wifi',
          variant: 'default' as const,
          tooltip: checkingText,
          label: undefined,
          pulse: false,
        };
      }

      const isGood = latency === undefined || latency < 150;
      const isFair = latency !== undefined && latency >= 150 && latency < 400;
      const isPoor = latency !== undefined && latency >= 400;

      return {
        icon: isPoor ? 'wifi_1_bar' : isFair ? 'wifi_2_bar' : 'wifi',
        variant: isGood ? ('success' as const) : ('warning' as const),
        tooltip: (
          <MetricsTooltipContent
            latency={latency}
            statusText={onlineText}
            qualityText={isGood ? goodText : isFair ? fairText : poorText}
          />
        ),
        label: undefined,
        pulse: isPoor,
      };
    }, [
      status,
      latency,
      checking,
      onlineText,
      offlineText,
      noInternetText,
      checkingText,
      goodText,
      fairText,
      poorText,
    ]);

    return (
      <StatusBarItem
        icon={itemStatus.icon}
        variant={itemStatus.variant}
        tooltip={itemStatus.tooltip}
        label={itemStatus.label}
        className={itemStatus.pulse ? 'motion-safe:animate-pulse opacity-80' : ''}
      />
    );
  }
);

ConnectionStatus.displayName = 'ConnectionStatus';

export default ConnectionStatus;
