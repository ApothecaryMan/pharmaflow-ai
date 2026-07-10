import type React from 'react';
import type { ViewState } from '../../types';
import { TrixComparisonTemplate } from './TrixComparisonTemplate';

interface CosmoceuticalPageProps {
  t?: any;
  language?: 'EN' | 'AR';
  color?: string;
  onViewChange?: (view: ViewState) => void;
}

export const CosmoceuticalPage: React.FC<CosmoceuticalPageProps> = ({
  language = 'EN',
  color = '#6366f1',
}) => <TrixComparisonTemplate language={language} color={color} />;
