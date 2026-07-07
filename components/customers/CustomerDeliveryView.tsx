import type React from 'react';
import { useMemo, useState } from 'react';
import { MapMarker, MapRoute, MarkerContent } from '@/components/ui/map';
import { useAuthStore } from '../../stores/authStore';

// ----------------------------------------------------
// Mock Delivery Data (Simplified per design)
// ----------------------------------------------------
export const DELIVERY_ROUTE: [number, number][] = [
  [31.2357, 30.044],
  [31.24, 30.045],
  [31.245, 30.042],
  [31.255, 30.048],
  [31.265, 30.046],
  [31.275, 30.05],
];

export const STORE_LOCATION: [number, number] = DELIVERY_ROUTE[0];
export const HOME_LOCATION: [number, number] = DELIVERY_ROUTE[DELIVERY_ROUTE.length - 1];

interface PointMarkerProps {
  longitude: number;
  latitude: number;
  label: string;
}

function PointMarker({ longitude, latitude, label }: PointMarkerProps) {
  return (
    <MapMarker longitude={longitude} latitude={latitude}>
      <MarkerContent>
        <div className='flex flex-col items-center'>
          <span className='text-sm font-bold text-white mb-1 shadow-sm bg-black/40 px-2 py-0.5 rounded whitespace-nowrap border border-white/10'>
            {label}
          </span>
          <div className='size-4 bg-primary-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center'>
            <div className='size-1.5 bg-white rounded-full' />
          </div>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

function PharmacyMarker({
  longitude,
  latitude,
  name,
  logoUrl,
}: {
  longitude: number;
  latitude: number;
  name: string;
  logoUrl?: string;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <MapMarker longitude={longitude} latitude={latitude}>
      <MarkerContent>
        <div className='flex flex-col items-center'>
          {/* Pharmacy Name Tooltip */}
          <span className='text-xs font-bold text-white mb-1.5 shadow-lg bg-black/80 px-2.5 py-1 rounded-xl border border-white/20 backdrop-blur-md whitespace-nowrap'>
            {name}
          </span>
          {/* Pharmacy Logo Container */}
          <div className='relative group'>
            <div className='absolute inset-0 rounded-full bg-primary-500/30 blur-md group-hover:bg-primary-500/50 transition-all duration-300' />
            <div className='size-11 rounded-full border-2 border-primary-500 bg-zinc-950 shadow-2xl flex items-center justify-center overflow-hidden relative z-10 transition-transform duration-300 hover:scale-110'>
              {logoUrl && !imageError ? (
                <img
                  src={logoUrl}
                  alt={name}
                  className='w-full h-full object-cover'
                  onError={() => setImageError(true)}
                />
              ) : (
                <span className='material-symbols-rounded text-white text-xl'>local_pharmacy</span>
              )}
            </div>
          </div>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

interface DeliveryTruckMarkerProps {
  longitude: number;
  latitude: number;
}

function DeliveryTruckMarker({ longitude, latitude }: DeliveryTruckMarkerProps) {
  return (
    <MapMarker longitude={longitude} latitude={latitude}>
      <MarkerContent>
        <div className='size-8 bg-primary-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center'>
          <span className='material-symbols-rounded text-white text-xl font-fill'>
            local_shipping
          </span>
        </div>
      </MarkerContent>
    </MapMarker>
  );
}

interface CustomerDeliveryViewProps {
  language?: string;
  key?: React.Key;
}

export default function CustomerDeliveryView({ language = 'ar' }: CustomerDeliveryViewProps) {
  const activeBranch = useAuthStore(s => s.branches.find(b => b.id === s.activeBranchId));
  const activeOrg = useAuthStore(s => s.activeOrg);

  // Resolve store coordinates: active branch coords or fallback
  const storeLocation = useMemo<[number, number]>(() => {
    if (activeBranch?.latitude && activeBranch?.longitude) {
      return [activeBranch.longitude, activeBranch.latitude];
    }
    return STORE_LOCATION;
  }, [activeBranch]);

  // Adjust route coordinates dynamically to start from the branch location
  const routeCoordinates = useMemo<[number, number][]>(() => {
    const coords = [...DELIVERY_ROUTE];
    coords[0] = storeLocation;
    return coords;
  }, [storeLocation]);

  // Place truck in the middle of the active route
  const truckLocation = useMemo<[number, number]>(() => {
    const midIndex = Math.floor(routeCoordinates.length / 2);
    return routeCoordinates[midIndex];
  }, [routeCoordinates]);

  const pharmacyName = useMemo(() => {
    return activeOrg?.name || activeBranch?.name || (language === 'ar' ? 'الصيدلية' : 'Pharmacy');
  }, [activeOrg, activeBranch, language]);

  return (
    <>
      <MapRoute
        id='delivery-main-route'
        coordinates={routeCoordinates}
        color='#3b82f6'
        width={6}
        opacity={0.9}
      />
      <PharmacyMarker
        longitude={storeLocation[0]}
        latitude={storeLocation[1]}
        name={pharmacyName}
        logoUrl={activeOrg?.logoUrl}
      />
      <PointMarker
        longitude={HOME_LOCATION[0]}
        latitude={HOME_LOCATION[1]}
        label={language === 'ar' ? 'المنزل' : 'Home'}
      />
      <DeliveryTruckMarker longitude={truckLocation[0]} latitude={truckLocation[1]} />
    </>
  );
}
