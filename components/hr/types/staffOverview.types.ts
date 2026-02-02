import { ThemeColor } from '../../../types';

/**
 * Core performance metrics tracked for each employee
 */
export interface PerformanceMetrics {
  revenue: number;
  count: number;
  items: number;
  avgTime: number;
  csat: number;
  loyalty: number;
  repeatCustomers?: number;
  repeatRatio?: number;
  totalCustomers?: number;
}

/**
 * Staff statistics with employee identification
 */
export interface StaffStats extends PerformanceMetrics {
  id: string;
  name: string;
  image?: string;
  titles?: Array<{ type: string; label: string; icon: string; color: string }>;
}

/**
 * Tooltip data structure for champion cards
 */
export interface ChampionTooltipData {
  title: string;
  value: number | string;
  isCurrency?: boolean;
  valueLabel?: string;
  icon: string;
  iconColorClass: string;
  calculations: Array<{ label: string; math: number | string; isCurrency: boolean }>;
  details: Array<{ icon: string; label: string; value: number | string; isCurrency: boolean }>;
}

/**
 * Achievement/Champion card data
 */
export interface Achievement {
  id: string;
  type: 'revenue' | 'speed' | 'invoices' | 'csat' | 'loyalty';
  label: string;
  hero?: StaffStats;
  tooltip: ChampionTooltipData;
  icon: string;
  color: string;
}

/**
 * Translation function type
 */
export interface TranslationFunction {
  (key: string): string;
}

/**
 * Props for StaffSpotlightTicker component
 */
export interface StaffSpotlightTickerProps {
  achievements: Achievement[];
  language: 'AR' | 'EN';
  color: ThemeColor;
}
