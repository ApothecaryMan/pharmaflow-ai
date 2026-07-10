import type maplibregl from 'maplibre-gl';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icons from '@/components/common/Icons';
import { Map, MapClusterLayer, MapControls, type MapViewport, useMap } from '@/components/ui/map';
import { useSettings } from '../../context';
import { useAuthStore } from '../../stores/authStore';
import { SegmentedControl } from '../common/SegmentedControl';
import CustomerDeliveryView, { DELIVERY_ROUTE } from './CustomerDeliveryView';

// ----------------------------------------------------
// Mock Data Generation
// ----------------------------------------------------
// We mock customer locations centered around Cairo for demonstration.
const CAIRO_CENTER = [31.2357, 30.0444] as [number, number];
const NUM_CUSTOMERS = 2500;

function generateMockCustomers(center: [number, number]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = Array.from({
    length: NUM_CUSTOMERS,
  }).map((_, i) => {
    // Basic dispersion: center cluster + some outliers
    const r = Math.random() ** 3 * 0.15; // heavily clustered towards center
    const theta = Math.random() * 2 * Math.PI;
    const lng = center[0] + r * Math.cos(theta);
    const lat = center[1] + r * Math.sin(theta);

    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lng, lat] },
      properties: {
        id: `customer-${i}`,
        value: Math.random() * 100, // random purchase metric
      },
    };
  });

  return { type: 'FeatureCollection', features };
}

// ----------------------------------------------------
// Dashboard Overlay
// ----------------------------------------------------
function DashboardOverlay({
  totalCustomers,
  highDensityZones,
  isDeliveryView,
  darkMode,
}: {
  totalCustomers: number;
  highDensityZones: number;
  isDeliveryView: boolean;
  darkMode: boolean;
}) {
  return (
    <div
      className={`absolute inset-x-0 bottom-6 z-10 mx-auto w-11/12 max-w-lg rounded-2xl border p-5 shadow-2xl pointer-events-none transition-all duration-300 ${
        darkMode
          ? 'bg-black/60 backdrop-blur-2xl border-white/10 shadow-[0_0_40px_-10px_rgba(0,255,255,0.3)] text-white'
          : 'bg-white/90 backdrop-blur-2xl border-zinc-200 shadow-xl text-zinc-950'
      }`}
    >
      <div className='flex items-center justify-between pointer-events-auto'>
        {/* Metric 1 */}
        <div className='flex items-center space-x-4'>
          <div
            className={`p-3 rounded-xl border ${
              darkMode
                ? 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400'
                : 'bg-cyan-50 border-cyan-200 text-cyan-600'
            }`}
          >
            {isDeliveryView ? (
              <span className='material-symbols-rounded text-2xl'>local_shipping</span>
            ) : (
              <span className='material-symbols-rounded text-2xl'>groups</span>
            )}
          </div>
          <div>
            <p
              className={`text-xs font-semibold tracking-wider uppercase ${
                darkMode ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              {isDeliveryView ? 'Delivery Status' : 'Active Network'}
            </p>
            <p className='text-2xl font-bold tracking-tight'>
              {isDeliveryView ? 'In Transit' : totalCustomers.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className={`h-10 w-px ${darkMode ? 'bg-white/10' : 'bg-zinc-200'}`} />

        {/* Metric 2 */}
        <div className='flex items-center space-x-4 pr-4'>
          <div
            className={`p-3 rounded-xl border ${
              darkMode
                ? 'bg-fuchsia-500/20 border-fuchsia-500/30 text-fuchsia-400'
                : 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600'
            }`}
          >
            {isDeliveryView ? (
              <span className='material-symbols-rounded text-2xl'>timer</span>
            ) : (
              <span className='material-symbols-rounded text-2xl'>bolt</span>
            )}
          </div>
          <div>
            <p
              className={`text-xs font-semibold tracking-wider uppercase ${
                darkMode ? 'text-zinc-400' : 'text-zinc-500'
              }`}
            >
              {isDeliveryView ? 'Est. Time' : 'Hot Zones'}
            </p>
            <p className='text-2xl font-bold tracking-tight'>
              {isDeliveryView ? '12 mins' : highDensityZones}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------
// Map Component
// ----------------------------------------------------
export default function CustomerDensityMap({ language = 'ar' }: { language?: any }) {
  const activeBranch = useAuthStore((s) => s.branches.find((b) => b.id === s.activeBranchId));
  const { darkMode } = useSettings();
  const [activeTab, setActiveTab] = useState('distribution');
  const isDeliveryView = activeTab === 'delivery';
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Resolve store coordinates: active branch coords or Cairo center fallback
  const storeLocation = useMemo<[number, number]>(() => {
    if (activeBranch?.latitude && activeBranch?.longitude) {
      return [activeBranch.longitude, activeBranch.latitude];
    }
    return CAIRO_CENTER;
  }, [activeBranch]);

  // Place truck location dynamically based on active store location
  const resolvedTruckLocation = useMemo<[number, number]>(() => {
    const coords = [...DELIVERY_ROUTE];
    coords[0] = storeLocation;
    const midIndex = Math.floor(coords.length / 2);
    return coords[midIndex];
  }, [storeLocation]);

  // Use a ref to track viewport locally to prevent excessive React renders
  const viewportRef = useRef<MapViewport>({
    center: storeLocation,
    zoom: 11,
    bearing: 0,
    pitch: 45, // 45 degree pitch for a 3D isometric dashboard feel
  });

  // Generate data once, relative to resolved store location center
  const geojsonData = useMemo(() => generateMockCustomers(storeLocation), [storeLocation]);

  // Update ref but deliberately DO NOT trigger re-renders
  const handleViewportChange = useCallback((vp: MapViewport) => {
    viewportRef.current = vp;
  }, []);

  // Handle perspective switch when tab changes or store location loads
  useEffect(() => {
    if (!mapRef.current) return;

    if (isDeliveryView) {
      mapRef.current.flyTo({
        center: resolvedTruckLocation,
        zoom: 17, // Much deeper zoom to see building numbers
        pitch: 0, // 2D for delivery
        duration: 2000,
      });
    } else {
      mapRef.current.flyTo({
        center: storeLocation,
        zoom: 11,
        pitch: 45, // 3D for distribution
        duration: 2000,
      });
    }
  }, [isDeliveryView, storeLocation, resolvedTruckLocation]);

  return (
    <div className='relative w-full h-full overflow-hidden bg-[#09090b]'>
      <Map
        ref={mapRef}
        theme={darkMode ? 'dark' : 'light'}
        language={language}
        healthFocus={true}
        showHouseNumbers={isDeliveryView}
        viewport={viewportRef.current}
        onViewportChange={handleViewportChange}
      >
        {activeTab === 'distribution' ? (
          <MapClusterLayer
            data={geojsonData}
            clusterRadius={60}
            clusterThresholds={[50, 200]}
            // Neon color palette: Cyan for scattered, Fuchsia/Magenta for density
            clusterColors={[
              'rgba(6, 182, 212, 0.8)',
              'rgba(217, 70, 239, 0.9)',
              'rgba(236, 72, 153, 0.95)',
            ]}
            pointColor='rgba(6, 182, 212, 0.7)'
          />
        ) : (
          <CustomerDeliveryView key='delivery-view' language={language} />
        )}

        {/* Subtle Map Controls */}
        <MapControls
          position='top-right'
          showZoom
          showCompass
          show3D
          showLocate
          showFullscreen
          className='opacity-80 hover:opacity-100 transition-opacity'
        />
      </Map>

      {/* View Switcher Overlay */}
      <div className='absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm'>
        <SegmentedControl
          value={activeTab}
          onChange={(val) => setActiveTab(val as string)}
          shape='pill'
          size='sm'
          options={[
            {
              label: 'التوزيع الجغرافي',
              value: 'distribution',
              icon: 'map',
            },
            {
              label: 'دليفري',
              value: 'delivery',
              icon: 'local_shipping',
            },
          ]}
        />
      </div>

      {/* Futuristic Dashboard Overlay */}
      <DashboardOverlay
        totalCustomers={NUM_CUSTOMERS}
        highDensityZones={12} // Mocked hot zone count
        isDeliveryView={isDeliveryView}
        darkMode={darkMode}
      />
    </div>
  );
}
