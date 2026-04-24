import React from "react";
import { 
  MapMarker, 
  MarkerContent, 
  MapRoute 
} from "@/components/ui/map";

// ----------------------------------------------------
// Mock Delivery Data (Simplified per design)
// ----------------------------------------------------
export const DELIVERY_ROUTE: [number, number][] = [
  [31.2357, 30.0440],
  [31.2400, 30.0450],
  [31.2450, 30.0420],
  [31.2550, 30.0480],
  [31.2650, 30.0460],
  [31.2750, 30.0500],
];

export const STORE_LOCATION: [number, number] = DELIVERY_ROUTE[0];
export const HOME_LOCATION: [number, number] = DELIVERY_ROUTE[DELIVERY_ROUTE.length - 1];
export const TRUCK_LOCATION: [number, number] = DELIVERY_ROUTE[Math.floor(DELIVERY_ROUTE.length / 2)];

interface PointMarkerProps {
  longitude: number;
  latitude: number;
  label: string;
}

function PointMarker({ longitude, latitude, label }: PointMarkerProps) {
  return (
    <MapMarker longitude={longitude} latitude={latitude}>
      <MarkerContent>
        <div className="flex flex-col items-center">
          <span className="text-sm font-bold text-white mb-1 shadow-sm bg-black/40 px-2 py-0.5 rounded whitespace-nowrap border border-white/10">
            {label}
          </span>
          <div className="size-4 bg-primary-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
             <div className="size-1.5 bg-white rounded-full" />
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
        <div className="size-8 bg-primary-500 rounded-full border-2 border-white shadow-xl flex items-center justify-center">
           <span className="material-symbols-rounded text-white text-xl font-fill">local_shipping</span>
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
  return (
    <>
      <MapRoute
        id="delivery-main-route"
        coordinates={DELIVERY_ROUTE}
        color="#3b82f6"
        width={6}
        opacity={0.9}
      />
      <PointMarker 
        longitude={STORE_LOCATION[0]} 
        latitude={STORE_LOCATION[1]} 
        label={language === 'ar' ? "المخزن" : "Store"} 
      />
      <PointMarker 
        longitude={HOME_LOCATION[0]} 
        latitude={HOME_LOCATION[1]} 
        label={language === 'ar' ? "المنزل" : "Home"} 
      />
      <DeliveryTruckMarker longitude={TRUCK_LOCATION[0]} latitude={TRUCK_LOCATION[1]} />
    </>
  );
}
