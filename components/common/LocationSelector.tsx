import React, { useState, useEffect, useMemo } from 'react';
import { GOVERNORATES, CITIES, AREAS } from '../../data/locations';
import { FilterDropdown } from './FilterDropdown';

interface LocationSelectorProps {
  selectedGovernorate?: string;
  selectedCity?: string;
  selectedArea?: string;
  onGovernorateChange: (val: string) => void;
  onCityChange: (val: string) => void;
  onAreaChange: (val: string) => void;
  t?: any;
  language: 'EN' | 'AR';
  showLabels?: boolean;
  color?: string;
  variant?: 'minimal' | 'input';
}

export const LocationSelector: React.FC<LocationSelectorProps> = ({
  selectedGovernorate,
  selectedCity,
  selectedArea,
  onGovernorateChange,
  onCityChange,
  onAreaChange,
  t,
  language,
  showLabels = true,
  color = 'primary',
  variant = 'input'
}) => {
  const isRTL = language === 'AR';

  // Use passed translations if available, otherwise fallback to root translations
  // We keep hardcoded fallbacks as a safety net if keys are missing from the passed 't' object
  const trans = t?.location || t || {};

  const labels = {
    governorate: trans.governorate || (isRTL ? 'المحافظة' : 'Governorate'),
    city: trans.city || (isRTL ? 'المدينة' : 'City'),
    area: trans.area || (isRTL ? 'المنطقة' : 'Area'),
    selectGovernorate: trans.selectGovernorate || (isRTL ? 'اختر المحافظة' : 'Select Governorate'),
    selectCity: trans.selectCity || (isRTL ? 'اختر المدينة' : 'Select City'),
    selectArea: trans.selectArea || (isRTL ? 'اختر المنطقة' : 'Select Area'),
  };

  // Dropdown States
  const [isGovernorateOpen, setIsGovernorateOpen] = useState(false);
  const [isCityOpen, setIsCityOpen] = useState(false);
  const [isAreaOpen, setIsAreaOpen] = useState(false);

  // Filtered Lists
  const availableCities = useMemo(() => {
    if (!selectedGovernorate) return [];
    return CITIES.filter((c) => c.governorate_id === selectedGovernorate);
  }, [selectedGovernorate]);

  const availableAreas = useMemo(() => {
    if (!selectedCity) return [];
    return AREAS.filter((a) => a.city_id === selectedCity);
  }, [selectedCity]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    if (selectedGovernorate && !availableCities.find(c => c.id === selectedCity)) {
       // Only reset if current city doesn't belong to new governorate
    }
  }, [selectedGovernorate, availableCities, selectedCity]);

  const currentGov = GOVERNORATES.find(g => g.id === selectedGovernorate);
  const currentCity = CITIES.find(c => c.id === selectedCity);
  const currentArea = AREAS.find(a => a.id === selectedArea);

  const renderLocation = (loc: any) => (
    <div className={`flex items-center gap-2 ${isRTL ? 'text-right' : 'text-left'}`}>
      <span className="text-sm">{language === 'AR' ? loc.name_ar : loc.name_en}</span>
    </div>
  );

  const labelClass = "text-xs font-bold text-gray-500 uppercase mb-1 block";

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Governorate */}
      <div className="space-y-1">
        {showLabels && <label className={labelClass}>{labels.governorate}</label>}
        <FilterDropdown
          items={GOVERNORATES}
          selectedItem={currentGov}
          isOpen={isGovernorateOpen}
          onToggle={() => setIsGovernorateOpen(!isGovernorateOpen)}
          onSelect={(gov) => {
            onGovernorateChange(gov.id);
            onCityChange('');
            onAreaChange('');
            setIsGovernorateOpen(false);
          }}
          renderItem={(gov) => renderLocation(gov)}
          renderSelected={(gov) => gov ? renderLocation(gov) : <span className="text-gray-400">{labels.selectGovernorate}</span>}
          keyExtractor={(gov) => gov.id}
          className="w-full"
          variant={variant}
          color={color}
          minHeight="42px"
        />
      </div>

      {/* City */}
      <div className="space-y-1">
        {showLabels && <label className={labelClass}>{labels.city}</label>}
        <FilterDropdown
          items={availableCities}
          selectedItem={currentCity}
          isOpen={isCityOpen}
          onToggle={() => setIsCityOpen(!isCityOpen)}
          onSelect={(city) => {
            onCityChange(city.id);
            onAreaChange('');
            setIsCityOpen(false);
          }}
          renderItem={(city) => renderLocation(city)}
          renderSelected={(city) => city ? renderLocation(city) : <span className="text-gray-400">{labels.selectCity}</span>}
          keyExtractor={(city) => city.id}
          className="w-full"
          variant={variant}
          color={color}
          disabled={!selectedGovernorate}
          minHeight="42px"
        />
      </div>

      {/* Area */}
      <div className="space-y-1">
        {showLabels && <label className={labelClass}>{labels.area}</label>}
        <FilterDropdown
          items={availableAreas}
          selectedItem={currentArea}
          isOpen={isAreaOpen}
          onToggle={() => setIsAreaOpen(!isAreaOpen)}
          onSelect={(area) => {
            onAreaChange(area.id);
            setIsAreaOpen(false);
          }}
          renderItem={(area) => renderLocation(area)}
          renderSelected={(area) => area ? renderLocation(area) : <span className="text-gray-400">{labels.selectArea}</span>}
          keyExtractor={(area) => area.id}
          className="w-full"
          variant={variant}
          color={color}
          disabled={!selectedCity}
          minHeight="42px"
        />
      </div>
    </div>
  );
};
