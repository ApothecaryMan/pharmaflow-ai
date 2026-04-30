import React, { useMemo, useState, useCallback, useRef, useEffect } from "react";
import maplibregl from "maplibre-gl";
import Icons from '@/components/common/Icons';
import {
  Map,
  MapControls,
  MapClusterLayer,
  useMap,
  type MapViewport,
} from "@/components/ui/map";
import { SegmentedControl } from "../common/SegmentedControl";
import CustomerDeliveryView, { TRUCK_LOCATION } from "./CustomerDeliveryView";

// ----------------------------------------------------
// Mock Data Generation
// ----------------------------------------------------
// We mock customer locations centered around Cairo for demonstration.
const CAIRO_CENTER = [31.2357, 30.0444] as [number, number];
const NUM_CUSTOMERS = 2500;

function generateMockCustomers(): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features: GeoJSON.Feature<GeoJSON.Point>[] = Array.from({
    length: NUM_CUSTOMERS,
  }).map((_, i) => {
    // Basic dispersion: center cluster + some outliers
    const r = Math.pow(Math.random(), 3) * 0.15; // heavily clustered towards center
    const theta = Math.random() * 2 * Math.PI;
    const lng = CAIRO_CENTER[0] + r * Math.cos(theta);
    const lat = CAIRO_CENTER[1] + r * Math.sin(theta);

    return {
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: {
        id: `customer-${i}`,
        value: Math.random() * 100, // random purchase metric
      },
    };
  });

  return { type: "FeatureCollection", features };
}

// ----------------------------------------------------
// Dashboard Overlay
// ----------------------------------------------------
function DashboardOverlay({
  totalCustomers,
  highDensityZones,
  isDeliveryView,
}: {
  totalCustomers: number;
  highDensityZones: number;
  isDeliveryView: boolean;
}) {
  return (
    <div className="absolute inset-x-0 bottom-6 z-10 mx-auto w-11/12 max-w-lg rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/10 p-5 shadow-[0_0_40px_-10px_rgba(0,255,255,0.3)] pointer-events-none">
      <div className="flex items-center justify-between pointer-events-auto">
        {/* Metric 1 */}
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-cyan-500/20 rounded-xl border border-cyan-500/30">
            {isDeliveryView ? (
              <span className="material-symbols-rounded text-cyan-400 text-2xl">local_shipping</span>
            ) : (
              <Users className="w-6 h-6 text-cyan-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
              {isDeliveryView ? "Delivery Status" : "Active Network"}
            </p>
            <p className="text-2xl font-bold text-white tracking-tight">
              {isDeliveryView ? "In Transit" : totalCustomers.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-10 w-px bg-white/10" />

        {/* Metric 2 */}
        <div className="flex items-center space-x-4 pr-4">
          <div className="p-3 bg-fuchsia-500/20 rounded-xl border border-fuchsia-500/30">
            {isDeliveryView ? (
              <span className="material-symbols-rounded text-fuchsia-400 text-2xl">timer</span>
            ) : (
              <Activity className="w-6 h-6 text-fuchsia-400" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-400 tracking-wider uppercase">
              {isDeliveryView ? "Est. Time" : "Hot Zones"}
            </p>
            <p className="text-2xl font-bold text-white tracking-tight">
              {isDeliveryView ? "12 mins" : highDensityZones}
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
  const [activeTab, setActiveTab] = useState("distribution");
  const isDeliveryView = activeTab === "delivery";
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Use a ref to track viewport locally to prevent excessive React renders
  const viewportRef = useRef<MapViewport>({
    center: CAIRO_CENTER,
    zoom: 11,
    bearing: 0,
    pitch: 45, // 45 degree pitch for a 3D isometric dashboard feel
  });

  // Generate data once
  const geojsonData = useMemo(() => generateMockCustomers(), []);

  // Update ref but deliberately DO NOT trigger re-renders
  const handleViewportChange = useCallback((vp: MapViewport) => {
    viewportRef.current = vp;
  }, []);

  // Handle perspective switch when tab changes
  useEffect(() => {
    if (!mapRef.current) return;

    if (isDeliveryView) {
      mapRef.current.flyTo({
        center: TRUCK_LOCATION,
        zoom: 17, // Much deeper zoom to see building numbers
        pitch: 0, // 2D for delivery
        duration: 2000,
      });
    } else {
      mapRef.current.flyTo({
        center: CAIRO_CENTER,
        zoom: 11,
        pitch: 45, // 3D for distribution
        duration: 2000,
      });
    }
  }, [isDeliveryView]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#09090b]">
      <Map
        ref={mapRef}
        theme="dark" // Enforce the dark cybernetic aesthetic
        language={language}
        healthFocus={true}
        showHouseNumbers={isDeliveryView}
        viewport={viewportRef.current}
        onViewportChange={handleViewportChange}
        // Utilizing CARTO Dark Matter for a clean backdrop
        styles={{
          dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
        }}
      >
        {activeTab === "distribution" ? (
          <MapClusterLayer
            key="distribution-layer"
            data={geojsonData}
            clusterRadius={60}
            clusterThresholds={[50, 200]}
            // Neon color palette: Cyan for scattered, Fuchsia/Magenta for density
            clusterColors={["rgba(6, 182, 212, 0.8)", "rgba(217, 70, 239, 0.9)", "rgba(236, 72, 153, 0.95)"]} 
            pointColor="rgba(6, 182, 212, 0.7)"
          />
        ) : (
          <CustomerDeliveryView key="delivery-view" language={language} />
        )}
        
        {/* Subtle Map Controls */}
        <MapControls 
          position="top-right"
          showZoom 
          showCompass 
          show3D
          showLocate
          showFullscreen
          className="opacity-80 hover:opacity-100 transition-opacity" 
        />
      </Map>

      {/* View Switcher Overlay */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-sm">
        <SegmentedControl
          value={activeTab}
          onChange={(val) => setActiveTab(val as string)}
          variant="onCard"
          shape="pill"
          size="sm"
          options={[
            { 
              label: "التوزيع الجغرافي", 
              value: "distribution",
              icon: "map" 
            },
            { 
              label: "دليفري", 
              value: "delivery",
              icon: "local_shipping" 
            },
          ]}
        />
      </div>

      {/* Futuristic Dashboard Overlay */}
      <DashboardOverlay 
        totalCustomers={NUM_CUSTOMERS} 
        highDensityZones={12} // Mocked hot zone count
        isDeliveryView={isDeliveryView}
      />
    </div>
  );
}
