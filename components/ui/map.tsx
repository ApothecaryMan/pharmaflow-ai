"use client";

import maplibregl from "maplibre-gl";
import type { PopupOptions, MarkerOptions } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type Key,
} from "react";
import { createPortal } from "react-dom";
import { X, Minus, Plus, Locate, Maximize, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

// Initialize RTL text plugin for Arabic/Hebrew support
if (typeof window !== "undefined") {
  (maplibregl as any).setRTLTextPlugin(
    "https://unpkg.com/@mapbox/mapbox-gl-rtl-text@0.2.3/mapbox-gl-rtl-text.min.js",
    (error: any) => {
      if (error) console.error("Error loading MapLibre RTL plugin:", error);
    },
    true // Lazy load
  );
}

const defaultStyles = {
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
};

type Theme = "light" | "dark" | "system";
type Language = "en" | "ar";

// Check document class for theme (works with next-themes, etc.)
function getDocumentTheme(): "light" | "dark" | null {
  if (typeof document === "undefined") return null;
  if (document.documentElement.classList.contains("dark")) return "dark";
  if (document.documentElement.classList.contains("light")) return "light";
  return null;
}

// Get system preference
function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function useResolvedTheme(themeProp?: "light" | "dark"): "light" | "dark" {
  const [detectedTheme, setDetectedTheme] = useState<"light" | "dark">(
    () => getDocumentTheme() ?? getSystemTheme()
  );

  useEffect(() => {
    if (themeProp) return; // Skip detection if theme is provided via prop

    // Watch for document class changes (e.g., next-themes toggling dark class)
    const observer = new MutationObserver(() => {
      const docTheme = getDocumentTheme();
      if (docTheme) {
        setDetectedTheme(docTheme);
      }
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    // Also watch for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemChange = (e: MediaQueryListEvent) => {
      // Only use system preference if no document class is set
      if (!getDocumentTheme()) {
        setDetectedTheme(e.matches ? "dark" : "light");
      }
    };
    mediaQuery.addEventListener("change", handleSystemChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener("change", handleSystemChange);
    };
  }, [themeProp]);

  return themeProp ?? detectedTheme;
}

/** Map viewport state */
type MapViewport = {
  /** Center coordinates [longitude, latitude] */
  center: [number, number];
  /** Zoom level */
  zoom: number;
  /** Bearing (rotation) in degrees */
  bearing: number;
  /** Pitch (tilt) in degrees */
  pitch: number;
};

type MapStyleOption = string | maplibregl.StyleSpecification;

type MapRef = maplibregl.Map;

type MapProps = {
  children?: ReactNode;
  /** Additional CSS classes for the map container */
  className?: string;
  /**
   * Theme for the map. If not provided, automatically detects system preference.
   * Pass your theme value here.
   */
  theme?: Theme;
  /** Custom map styles for light and dark themes. Overrides the default Carto styles. */
  styles?: {
    light?: MapStyleOption;
    dark?: MapStyleOption;
  };
  /** Map projection type. Use `{ type: "globe" }` for 3D globe view. */
  projection?: maplibregl.ProjectionSpecification;
  /**
   * Controlled viewport. When provided with onViewportChange,
   * the map becomes controlled and viewport is driven by this prop.
   */
  viewport?: Partial<MapViewport>;
  /**
   * Callback fired continuously as the viewport changes (pan, zoom, rotate, pitch).
   * Can be used standalone to observe changes, or with `viewport` prop
   * to enable controlled mode where the map viewport is driven by your state.
   */
  onViewportChange?: (viewport: MapViewport) => void;
  /**
   * Language for map labels. If set to 'ar', it will attempt to show Arabic labels.
   */
  language?: Language;
  /**
   * Whether to show only health-related POIs (hospitals, pharmacies, etc)
   */
  healthFocus?: boolean;
  /**
   * Whether to show house/building numbers
   */
  showHouseNumbers?: boolean;
} & Omit<maplibregl.MapOptions, "container" | "style">;

const MapContext = createContext<{
  map: maplibregl.Map | null;
  isLoaded: boolean;
} | null>(null);

function useMap() {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMap must be used within a Map component");
  }
  return context;
}

function DefaultLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex gap-1">
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:150ms]" />
        <span className="size-1.5 rounded-full bg-muted-foreground/60 animate-pulse [animation-delay:300ms]" />
      </div>
    </div>
  );
}

function getViewport(map: maplibregl.Map): MapViewport {
  const center = map.getCenter();
  return {
    center: [center.lng, center.lat],
    zoom: map.getZoom(),
    bearing: map.getBearing(),
    pitch: map.getPitch(),
  };
}

const Map = forwardRef<MapRef, MapProps>(function Map(
  {
    children,
    className,
    theme: themeProp,
    styles,
    projection,
    viewport,
    onViewportChange,
    language,
    healthFocus = false,
    showHouseNumbers = true,
    ...props
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mapInstance, setMapInstance] = useState<maplibregl.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isStyleLoaded, setIsStyleLoaded] = useState(false);
  const currentStyleRef = useRef<MapStyleOption | null>(null);
  const styleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const internalUpdateRef = useRef(false);
  const resolvedTheme = useResolvedTheme(themeProp === "system" ? undefined : themeProp);

  const isControlled = viewport !== undefined && onViewportChange !== undefined;

  const onViewportChangeRef = useRef(onViewportChange);
  onViewportChangeRef.current = onViewportChange;

  const mapStyles = useMemo(
    () => ({
      dark: styles?.dark ?? defaultStyles.dark,
      light: styles?.light ?? defaultStyles.light,
    }),
    [styles]
  );

  // Expose the map instance to the parent component
  useImperativeHandle(ref, () => mapInstance as maplibregl.Map, [mapInstance]);

  const clearStyleTimeout = useCallback(() => {
    if (styleTimeoutRef.current) {
      clearTimeout(styleTimeoutRef.current);
      styleTimeoutRef.current = null;
    }
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!containerRef.current) return;

    const initialStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;
    currentStyleRef.current = initialStyle;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initialStyle,
      renderWorldCopies: false,
      attributionControl: {
        compact: true,
      },
      transformRequest: (url, resourceType) => {
        // Fix for Carto's failing Open Sans glyphs (CORS/404 errors)
        if (resourceType === "Glyphs" && url.includes("cartocdn.com")) {
          // Target IBM Plex Sans Arabic for a premium look
          let newUrl = url.replace(
            "tiles.basemaps.cartocdn.com/fonts",
            "fonts.openmaptiles.org"
          );

          // Attempt to map Carto's Open Sans to IBM Plex Sans Arabic
          if (newUrl.includes("Open%20Sans%20Regular/") || newUrl.includes("Open%20Sans/")) {
             newUrl = newUrl.replace(/Open%20Sans(%20Regular)?\//, "IBM%20Plex%20Sans%20Arabic%20Regular/");
          } else if (newUrl.includes("Open%20Sans%20Bold/")) {
             newUrl = newUrl.replace("Open%20Sans%20Bold/", "IBM%20Plex%20Sans%20Arabic%20Medium/");
          }

          return { url: newUrl };
        }
        return { url };
      },
      ...props,
      ...viewport,
    });

    const styleDataHandler = () => {
      clearStyleTimeout();
      // Delay to ensure style is fully processed before allowing layer operations
      // This is a workaround to avoid race conditions with the style loading
      // else we have to force update every layer on setStyle change
      styleTimeoutRef.current = setTimeout(() => {
        setIsStyleLoaded(true);
        if (projection) {
          map.setProjection(projection);
        }
      }, 100);
    };
    const loadHandler = () => setIsLoaded(true);

    // Viewport change handler - skip if triggered by internal update
    const handleMove = () => {
      if (internalUpdateRef.current) return;
      onViewportChangeRef.current?.(getViewport(map));
    };

    map.on("load", loadHandler);
    map.on("styledata", styleDataHandler);
    map.on("move", handleMove);
    setMapInstance(map);

    return () => {
      clearStyleTimeout();
      map.off("load", loadHandler);
      map.off("styledata", styleDataHandler);
      map.off("move", handleMove);
      map.remove();
      setIsLoaded(false);
      setIsStyleLoaded(false);
      setMapInstance(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync controlled viewport to map
  useEffect(() => {
    if (!mapInstance || !isControlled || !viewport) return;
    if (mapInstance.isMoving()) return;

    const current = getViewport(mapInstance);
    const next = {
      center: viewport.center ?? current.center,
      zoom: viewport.zoom ?? current.zoom,
      bearing: viewport.bearing ?? current.bearing,
      pitch: viewport.pitch ?? current.pitch,
    };

    if (
      next.center[0] === current.center[0] &&
      next.center[1] === current.center[1] &&
      next.zoom === current.zoom &&
      next.bearing === current.bearing &&
      next.pitch === current.pitch
    ) {
      return;
    }

    internalUpdateRef.current = true;
    mapInstance.jumpTo(next);
    internalUpdateRef.current = false;
  }, [mapInstance, isControlled, viewport]);

  // Handle style change
  useEffect(() => {
    if (!mapInstance || !resolvedTheme) return;

    const newStyle =
      resolvedTheme === "dark" ? mapStyles.dark : mapStyles.light;

    if (currentStyleRef.current === newStyle) return;

    clearStyleTimeout();
    currentStyleRef.current = newStyle;
    setIsStyleLoaded(false);

    mapInstance.setStyle(newStyle, { diff: true });
  }, [mapInstance, resolvedTheme, mapStyles, clearStyleTimeout]);

  // Handle house numbers, health-focus style, and label localization
  useEffect(() => {
    if (!mapInstance || !isStyleLoaded) return;

    const layers = mapInstance.getStyle()?.layers;
    if (!layers) return;

    layers.forEach((layer) => {
      const id = layer.id.toLowerCase();

      // Handle House Numbers: Hide if not showHouseNumbers
      const isHouseNumber = 
        id.includes("housenumber") || 
        id.includes("building-number") || 
        id.includes("building:label") ||
        id.includes("building-label") ||
        (id.includes("address") && !id.includes("street"));
      
      if (isHouseNumber) {
        mapInstance.setLayoutProperty(layer.id, "visibility", showHouseNumbers ? "visible" : "none");
        if (showHouseNumbers) {
           // Ensure they are prominent if shown
           mapInstance.setPaintProperty(layer.id, "text-color", "#ffffff");
           mapInstance.setPaintProperty(layer.id, "text-opacity", 1);
        }
        if (!showHouseNumbers) return; // Skip further processing if hidden
      }

      // Handle Health Focus: Only show health POIs, addresses, roads, and admin/place labels
      if (healthFocus) {
        // Define what to KEEP
        const isHealth = 
          id.includes("hospital") || 
          id.includes("pharmacy") || 
          id.includes("medical") || 
          id.includes("health") || 
          id.includes("clinic") ||
          id.includes("doctor");
        
        // Hide if it's a POI but NOT health-related
        // (Note: we keep house numbers if showHouseNumbers is true, even in healthFocus)
        const isNonHealthPOI = (id.includes("poi") || id.includes("transit") || id.includes("shop") || id.includes("food") || id.includes("restaurant") || id.includes("cafe") || id.includes("leisure") || id.includes("park")) && !isHealth;

        if (isNonHealthPOI) {
          mapInstance.setLayoutProperty(layer.id, "visibility", "none");
          return;
        } else if (!isHouseNumber) {
          // If it's not a house number (already handled) and not unrelated, make sure it's visible
          mapInstance.setLayoutProperty(layer.id, "visibility", "visible");
        }

        // Set specific color for health layers if it's a symbol
        if (isHealth && layer.type === "symbol") {
          mapInstance.setPaintProperty(layer.id, "text-color", "#fbbf24"); // Amber/Yellow 400
        } else if (layer.type === "symbol" && !isHouseNumber) {
          mapInstance.setPaintProperty(layer.id, "text-color", "#ffffff");
        }
      } else {
        // Restore visibility if not in healthFocus mode (and not a house number which is handled separately)
        if (!isHouseNumber) {
          mapInstance.setLayoutProperty(layer.id, "visibility", "visible");
          if (layer.type === "symbol") {
            mapInstance.setPaintProperty(layer.id, "text-color", "#ffffff");
          }
        }
      }

      // Handle Label Localization and Styling
      if (layer.type === "symbol" && (layer as any).layout?.["text-field"]) {
        // Arabic names are often in name_ar or name:ar
        const textField =
          language === "ar"
            ? ["coalesce", ["get", "name_ar"], ["get", "name:ar"], ["get", "name"]]
            : ["get", "name"];

        mapInstance.setLayoutProperty(layer.id, "text-field", textField);

        // General Styling (except color which is handled above)
        mapInstance.setPaintProperty(layer.id, "text-halo-color", "rgba(0,0,0,0.8)");
        mapInstance.setPaintProperty(layer.id, "text-halo-width", 1.5);

        // Increase size
        const currentSize = (layer as any).layout?.["text-size"];
        if (typeof currentSize === "number") {
          mapInstance.setLayoutProperty(layer.id, "text-size", currentSize * 1.25);
        } else {
          mapInstance.setLayoutProperty(layer.id, "text-size", 14);
        }

        // For better Arabic support, ensure IBM Plex Sans Arabic is used
        if (language === "ar") {
          mapInstance.setLayoutProperty(layer.id, "text-font", [
            "IBM Plex Sans Arabic Regular",
            "Open Sans Regular",
          ]);
        }
      }
    });
  }, [mapInstance, isStyleLoaded, language, healthFocus, showHouseNumbers]);

  const contextValue = useMemo(
    () => ({
      map: mapInstance,
      isLoaded: isLoaded && isStyleLoaded,
    }),
    [mapInstance, isLoaded, isStyleLoaded]
  );

  return (
    <MapContext.Provider value={contextValue}>
      <div
        ref={containerRef}
        className={cn("relative w-full h-full", className)}
      >
        {!isLoaded && <DefaultLoader />}
        {/* SSR-safe: children render only when map is loaded on client */}
        {mapInstance && children}
      </div>
    </MapContext.Provider>
  );
});

type MarkerContextValue = {
  marker: maplibregl.Marker;
  map: maplibregl.Map | null;
};

const MarkerContext = createContext<MarkerContextValue | null>(null);

function useMarkerContext() {
  const context = useContext(MarkerContext);
  if (!context) {
    throw new Error("Marker components must be used within MapMarker");
  }
  return context;
}

type MapMarkerProps = {
  /** Longitude coordinate for marker position */
  longitude: number;
  /** Latitude coordinate for marker position */
  latitude: number;
  /** Marker subcomponents (MarkerContent, MarkerPopup, MarkerTooltip, MarkerLabel) */
  children: ReactNode;
  /** Callback when marker is clicked */
  onClick?: (e: MouseEvent) => void;
  /** Callback when mouse enters marker */
  onMouseEnter?: (e: MouseEvent) => void;
  /** Callback when mouse leaves marker */
  onMouseLeave?: (e: MouseEvent) => void;
  /** Callback when marker drag starts */
  onDragStart?: (coords: { lng: number; lat: number }) => void;
  /** Callback during marker drag */
  onDrag?: (coords: { lng: number; lat: number }) => void;
  /** Callback when marker drag ends */
  onDragEnd?: (coords: { lng: number; lat: number }) => void;
  /** Whether the marker is draggable */
  draggable?: boolean;
} & Omit<maplibregl.MarkerOptions, "element">;

function MapMarker({
  longitude,
  latitude,
  children,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onDragStart,
  onDrag,
  onDragEnd,
  draggable = false,
  ...markerOptions
}: MapMarkerProps) {
  const { map } = useMap();

  const callbacksRef = useRef({
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  });

  useEffect(() => {
    callbacksRef.current = {
      onClick,
      onMouseEnter,
      onMouseLeave,
      onDragStart,
      onDrag,
      onDragEnd,
    };
  }, [
    onClick,
    onMouseEnter,
    onMouseLeave,
    onDragStart,
    onDrag,
    onDragEnd,
  ]);

  const marker = useMemo(() => {
    const markerInstance = new maplibregl.Marker({
      ...markerOptions,
      element: document.createElement("div"),
      draggable,
    }).setLngLat([longitude, latitude]);

    const handleClick = (e: MouseEvent) => callbacksRef.current.onClick?.(e);
    const handleMouseEnter = (e: MouseEvent) =>
      callbacksRef.current.onMouseEnter?.(e);
    const handleMouseLeave = (e: MouseEvent) =>
      callbacksRef.current.onMouseLeave?.(e);

    markerInstance.getElement()?.addEventListener("click", handleClick);
    markerInstance
      .getElement()
      ?.addEventListener("mouseenter", handleMouseEnter);
    markerInstance
      .getElement()
      ?.addEventListener("mouseleave", handleMouseLeave);

    const handleDragStart = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragStart?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDrag = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDrag?.({ lng: lngLat.lng, lat: lngLat.lat });
    };
    const handleDragEnd = () => {
      const lngLat = markerInstance.getLngLat();
      callbacksRef.current.onDragEnd?.({ lng: lngLat.lng, lat: lngLat.lat });
    };

    markerInstance.on("dragstart", handleDragStart);
    markerInstance.on("drag", handleDrag);
    markerInstance.on("dragend", handleDragEnd);

    return markerInstance;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    marker.addTo(map);

    return () => {
      marker.remove();
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (
    marker.getLngLat().lng !== longitude ||
    marker.getLngLat().lat !== latitude
  ) {
    marker.setLngLat([longitude, latitude]);
  }
  if (marker.isDraggable() !== draggable) {
    marker.setDraggable(draggable);
  }

  const currentOffset = marker.getOffset();
  const newOffset = markerOptions.offset ?? [0, 0];
  const [newOffsetX, newOffsetY] = Array.isArray(newOffset)
    ? newOffset
    : [newOffset.x, newOffset.y];
  if (currentOffset.x !== newOffsetX || currentOffset.y !== newOffsetY) {
    marker.setOffset(newOffset);
  }

  if (marker.getRotation() !== markerOptions.rotation) {
    marker.setRotation(markerOptions.rotation ?? 0);
  }
  if (marker.getRotationAlignment() !== markerOptions.rotationAlignment) {
    marker.setRotationAlignment(markerOptions.rotationAlignment ?? "auto");
  }
  if (marker.getPitchAlignment() !== markerOptions.pitchAlignment) {
    marker.setPitchAlignment(markerOptions.pitchAlignment ?? "auto");
  }

  return (
    <MarkerContext.Provider value={{ marker, map }}>
      {children}
    </MarkerContext.Provider>
  );
}

type MarkerContentProps = {
  /** Custom marker content. Defaults to a blue dot if not provided */
  children?: ReactNode;
  /** Additional CSS classes for the marker container */
  className?: string;
};

function MarkerContent({ children, className }: MarkerContentProps) {
  const { marker } = useMarkerContext();

  return createPortal(
    <div className={cn("relative cursor-pointer", className)}>
      {children || <DefaultMarkerIcon />}
    </div>,
    marker.getElement()
  );
}

function DefaultMarkerIcon() {
  return (
    <div className="relative h-4 w-4 rounded-full border-2 border-white bg-primary-500 shadow-lg" />
  );
}

type MarkerPopupProps = {
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MarkerPopup({
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MarkerPopupProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevPopupOptions = useRef(popupOptions);

  const popup = useMemo(() => {
    const popupInstance = new maplibregl.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setDOMContent(container);

    return popupInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    popup.setDOMContent(container);
    marker.setPopup(popup);

    return () => {
      marker.setPopup(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (popup.isOpen()) {
    const prev = prevPopupOptions.current;

    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    prevPopupOptions.current = popupOptions;
  }

  const handleClose = () => popup.remove();

  return createPortal(
    <div
      className={cn(
        "relative rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {closeButton && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>,
    container
  );
}

type MarkerTooltipProps = {
  /** Tooltip content */
  children: ReactNode;
  /** Additional CSS classes for the tooltip container */
  className?: string;
} & Omit<PopupOptions, "className" | "closeButton" | "closeOnClick">;

function MarkerTooltip({
  children,
  className,
  ...popupOptions
}: MarkerTooltipProps) {
  const { marker, map } = useMarkerContext();
  const container = useMemo(() => document.createElement("div"), []);
  const prevTooltipOptions = useRef(popupOptions);

  const tooltip = useMemo(() => {
    const tooltipInstance = new maplibregl.Popup({
      offset: 16,
      ...popupOptions,
      closeOnClick: true,
      closeButton: false,
    }).setMaxWidth("none");

    return tooltipInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    tooltip.setDOMContent(container);

    const handleMouseEnter = () => {
      tooltip.setLngLat(marker.getLngLat()).addTo(map);
    };
    const handleMouseLeave = () => tooltip.remove();

    marker.getElement()?.addEventListener("mouseenter", handleMouseEnter);
    marker.getElement()?.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      marker.getElement()?.removeEventListener("mouseenter", handleMouseEnter);
      marker.getElement()?.removeEventListener("mouseleave", handleMouseLeave);
      tooltip.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (tooltip.isOpen()) {
    const prev = prevTooltipOptions.current;

    if (prev.offset !== popupOptions.offset) {
      tooltip.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      tooltip.setMaxWidth(popupOptions.maxWidth ?? "none");
    }

    prevTooltipOptions.current = popupOptions;
  }

  return createPortal(
    <div
      className={cn(
        "rounded-md bg-foreground px-2 py-1 text-xs text-background shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {children}
    </div>,
    container
  );
}

type MarkerLabelProps = {
  /** Label text content */
  children: ReactNode;
  /** Additional CSS classes for the label */
  className?: string;
  /** Position of the label relative to the marker (default: "top") */
  position?: "top" | "bottom";
};

function MarkerLabel({
  children,
  className,
  position = "top",
}: MarkerLabelProps) {
  const positionClasses = {
    top: "bottom-full mb-1",
    bottom: "top-full mt-1",
  };

  return (
    <div
      className={cn(
        "absolute left-1/2 -translate-x-1/2 whitespace-nowrap",
        "text-[10px] font-medium text-foreground",
        positionClasses[position],
        className
      )}
    >
      {children}
    </div>
  );
}

type MapControlsProps = {
  /** Position of the controls on the map */
  position?: keyof typeof positionClasses;
  /** Show zoom in/out buttons */
  showZoom?: boolean;
  /** Show compass/reset bearing button */
  showCompass?: boolean;
  /** Show user location button */
  showLocate?: boolean;
  /** Show fullscreen toggle button */
  showFullscreen?: boolean;
  /** Show 3D/2D toggle button */
  show3D?: boolean;
  /** Optional custom class name */
  className?: string;
  /** Callback when user location is found */
  onLocate?: (coords: { longitude: number; latitude: number }) => void;
};

const positionClasses = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-10 right-2",
};

function ControlGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col rounded-md border border-border bg-background shadow-sm overflow-hidden [&>button:not(:last-child)]:border-b [&>button:not(:last-child)]:border-border">
      {children}
    </div>
  );
}

function ControlButton({
  onClick,
  label,
  children,
  disabled = false,
}: {
  onClick: () => void;
  label: string;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      type="button"
      className={cn(
        "flex items-center justify-center size-8 hover:bg-accent dark:hover:bg-accent/40 transition-colors",
        disabled && "opacity-50 pointer-events-none cursor-not-allowed"
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

function MapControls({
  position = "bottom-right",
  showZoom = true,
  showCompass = false,
  showLocate = false,
  showFullscreen = false,
  show3D = false,
  className,
  onLocate,
}: MapControlsProps) {
  const { map } = useMap();
  const [waitingForLocation, setWaitingForLocation] = useState(false);
  const [is3D, setIs3D] = useState(false);

  // Sync state with map pitch on load/initially
  useEffect(() => {
    if (map) {
      setIs3D(map.getPitch() > 0);
    }
  }, [map]);

  const handleZoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const handleZoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const handleResetBearing = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  const handleLocate = useCallback(() => {
    setWaitingForLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = {
            longitude: pos.coords.longitude,
            latitude: pos.coords.latitude,
          };
          map?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 14,
            duration: 1500,
          });
          onLocate?.(coords);
          setWaitingForLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setWaitingForLocation(false);
        }
      );
    }
  }, [map, onLocate]);

  const handleFullscreen = useCallback(() => {
    const container = map?.getContainer();
    if (!container) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      container.requestFullscreen();
    }
  }, [map]);

  const toggle3D = useCallback(() => {
    if (!map) return;
    const currentPitch = map.getPitch();
    const newPitch = currentPitch > 0 ? 0 : 45;
    map.easeTo({
      pitch: newPitch,
      duration: 500,
    });
    setIs3D(newPitch > 0);
  }, [map]);

  return (
    <div
      className={cn(
        "absolute z-10 flex flex-col gap-1.5",
        positionClasses[position],
        className
      )}
    >
      {showZoom && (
        <ControlGroup>
          <ControlButton onClick={handleZoomIn} label="Zoom in">
            <Plus className="size-4" />
          </ControlButton>
          <ControlButton onClick={handleZoomOut} label="Zoom out">
            <Minus className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}
      {showCompass && (
        <ControlGroup>
          <CompassButton onClick={handleResetBearing} />
        </ControlGroup>
      )}
      {showLocate && (
        <ControlGroup>
          <ControlButton
            onClick={handleLocate}
            label="Find my location"
            disabled={waitingForLocation}
          >
            {waitingForLocation ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Locate className="size-4" />
            )}
          </ControlButton>
        </ControlGroup>
      )}
      {showFullscreen && (
        <ControlGroup>
          <ControlButton onClick={handleFullscreen} label="Toggle fullscreen">
            <Maximize className="size-4" />
          </ControlButton>
        </ControlGroup>
      )}

      {show3D && (
        <ControlGroup>
          <ControlButton onClick={toggle3D} label={is3D ? "Switch to 2D" : "Switch to 3D"}>
            <div className="relative size-4 flex items-center justify-center font-bold text-[10px]">
              {is3D ? "2D" : "3D"}
            </div>
          </ControlButton>
        </ControlGroup>
      )}
    </div>
  );
}

function CompassButton({ onClick }: { onClick: () => void }) {
  const { map } = useMap();
  const compassRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!map || !compassRef.current) return;

    const compass = compassRef.current;

    const updateRotation = () => {
      const bearing = map.getBearing();
      const pitch = map.getPitch();
      compass.style.transform = `rotateX(${pitch}deg) rotateZ(${-bearing}deg)`;
    };

    map.on("rotate", updateRotation);
    map.on("pitch", updateRotation);
    updateRotation();

    return () => {
      map.off("rotate", updateRotation);
      map.off("pitch", updateRotation);
    };
  }, [map]);

  return (
    <ControlButton onClick={onClick} label="Reset bearing to north">
      <svg
        ref={compassRef}
        viewBox="0 0 24 24"
        className="size-5 transition-transform duration-200"
        style={{ transformStyle: "preserve-3d" }}
      >
        <path d="M12 2L16 12H12V2Z" className="fill-red-500" />
        <path d="M12 2L8 12H12V2Z" className="fill-red-300" />
        <path d="M12 22L16 12H12V22Z" className="fill-muted-foreground/60" />
        <path d="M12 22L8 12H12V22Z" className="fill-muted-foreground/30" />
      </svg>
    </ControlButton>
  );
}

type MapPopupProps = {
  /** Longitude coordinate for popup position */
  longitude: number;
  /** Latitude coordinate for popup position */
  latitude: number;
  /** Callback when popup is closed */
  onClose?: () => void;
  /** Popup content */
  children: ReactNode;
  /** Additional CSS classes for the popup container */
  className?: string;
  /** Show a close button in the popup (default: false) */
  closeButton?: boolean;
} & Omit<PopupOptions, "className" | "closeButton">;

function MapPopup({
  longitude,
  latitude,
  onClose,
  children,
  className,
  closeButton = false,
  ...popupOptions
}: MapPopupProps) {
  const { map } = useMap();
  const popupOptionsRef = useRef(popupOptions);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const container = useMemo(() => document.createElement("div"), []);

  const popup = useMemo(() => {
    const popupInstance = new maplibregl.Popup({
      offset: 16,
      ...popupOptions,
      closeButton: false,
    })
      .setMaxWidth("none")
      .setLngLat([longitude, latitude]);

    return popupInstance;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!map) return;

    const onCloseProp = () => onCloseRef.current?.();

    popup.on("close", onCloseProp);

    popup.setDOMContent(container);
    popup.addTo(map);

    return () => {
      popup.off("close", onCloseProp);
      if (popup.isOpen()) {
        popup.remove();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  if (popup.isOpen()) {
    const prev = popupOptionsRef.current;

    if (
      popup.getLngLat().lng !== longitude ||
      popup.getLngLat().lat !== latitude
    ) {
      popup.setLngLat([longitude, latitude]);
    }

    if (prev.offset !== popupOptions.offset) {
      popup.setOffset(popupOptions.offset ?? 16);
    }
    if (prev.maxWidth !== popupOptions.maxWidth && popupOptions.maxWidth) {
      popup.setMaxWidth(popupOptions.maxWidth ?? "none");
    }
    popupOptionsRef.current = popupOptions;
  }

  const handleClose = () => {
    popup.remove();
  };

  return createPortal(
    <div
      className={cn(
        "relative rounded-md border bg-popover p-3 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95",
        className
      )}
    >
      {closeButton && (
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-1 right-1 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Close popup"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      )}
      {children}
    </div>,
    container
  );
}

type MapRouteProps = {
  /** Optional unique identifier for the route layer */
  id?: string;
  /** Array of [longitude, latitude] coordinate pairs defining the route */
  coordinates: [number, number][];
  /** Line color as CSS color value (default: "#4285F4") */
  color?: string;
  /** Line width in pixels (default: 3) */
  width?: number;
  /** Line opacity from 0 to 1 (default: 0.8) */
  opacity?: number;
  /** Dash pattern [dash length, gap length] for dashed lines */
  dashArray?: [number, number];
  /** Callback when the route line is clicked */
  onClick?: () => void;
  /** Callback when mouse enters the route line */
  onMouseEnter?: () => void;
  /** Callback when mouse leaves the route line */
  onMouseLeave?: () => void;
  /** Whether the route is interactive - shows pointer cursor on hover (default: true) */
  interactive?: boolean;
};

function MapRoute({
  id: propId,
  coordinates,
  color = "#4285F4",
  width = 3,
  opacity = 0.8,
  dashArray,
  onClick,
  onMouseEnter,
  onMouseLeave,
  interactive = true,
}: MapRouteProps) {
  const { map, isLoaded } = useMap();
  const autoId = useId();
  const id = propId ?? autoId;
  const sourceId = `route-source-${id}`;
  const layerId = `route-layer-${id}`;

  // Add source and layer on mount
  useEffect(() => {
    if (!isLoaded || !map) return;
    
    // Check if style is really loaded (double check)
    if (!map.isStyleLoaded()) return;

    // Clean up previous if exists (safety)
    try {
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(sourceId)) map.removeSource(sourceId);
    } catch (e) {}

    map.addSource(sourceId, {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: { 
          type: "LineString", 
          coordinates: coordinates.length >= 2 ? coordinates : [] 
        },
      },
    });

    map.addLayer({
      id: layerId,
      type: "line",
      source: sourceId,
      layout: { "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": color,
        "line-width": width,
        "line-opacity": opacity,
        ...(dashArray && { "line-dasharray": dashArray }),
      },
    });

    return () => {
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // Re-run on map/isLoaded/sourceId change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId, layerId]);

  // When coordinates change, update the source data (if source already exists)
  useEffect(() => {
    if (!isLoaded || !map || coordinates.length < 2) return;

    const source = map.getSource(sourceId);
    if (source && (source as any).setData) {
      (source as any).setData({
        type: "Feature",
        properties: {},
        geometry: { type: "LineString", coordinates },
      });
    }
  }, [isLoaded, map, coordinates, sourceId]);

  useEffect(() => {
    if (!isLoaded || !map || !map.getLayer(layerId)) return;

    map.setPaintProperty(layerId, "line-color", color);
    map.setPaintProperty(layerId, "line-width", width);
    map.setPaintProperty(layerId, "line-opacity", opacity);
    if (dashArray) {
      map.setPaintProperty(layerId, "line-dasharray", dashArray);
    }
  }, [isLoaded, map, layerId, color, width, opacity, dashArray]);

  // Handle click and hover events
  useEffect(() => {
    if (!isLoaded || !map || !interactive) return;

    const handleClick = () => {
      onClick?.();
    };
    const handleMouseEnter = () => {
      map.getCanvas().style.cursor = "pointer";
      onMouseEnter?.();
    };
    const handleMouseLeave = () => {
      map.getCanvas().style.cursor = "";
      onMouseLeave?.();
    };

    map.on("click", layerId, handleClick);
    map.on("mouseenter", layerId, handleMouseEnter);
    map.on("mouseleave", layerId, handleMouseLeave);

    return () => {
      map.off("click", layerId, handleClick);
      map.off("mouseenter", layerId, handleMouseEnter);
      map.off("mouseleave", layerId, handleMouseLeave);
    };
  }, [
    isLoaded,
    map,
    layerId,
    onClick,
    onMouseEnter,
    onMouseLeave,
    interactive,
  ]);

  return null;
}

type MapClusterLayerProps<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties
> = {
  /** GeoJSON FeatureCollection data or URL to fetch GeoJSON from */
  data: string | GeoJSON.FeatureCollection<GeoJSON.Point, P>;
  /** Maximum zoom level to cluster points on (default: 14) */
  clusterMaxZoom?: number;
  /** Radius of each cluster when clustering points in pixels (default: 50) */
  clusterRadius?: number;
  /** Colors for cluster circles: [small, medium, large] based on point count (default: ["#22c55e", "#eab308", "#ef4444"]) */
  clusterColors?: [string, string, string];
  /** Point count thresholds for color/size steps: [medium, large] (default: [100, 750]) */
  clusterThresholds?: [number, number];
  /** Color for unclustered individual points (default: "#3b82f6") */
  pointColor?: string;
  /** Callback when an unclustered point is clicked */
  onPointClick?: (
    feature: GeoJSON.Feature<GeoJSON.Point, P>,
    coordinates: [number, number]
  ) => void;
  /** Callback when a cluster is clicked. If not provided, zooms into the cluster */
  onClusterClick?: (
    clusterId: number,
    coordinates: [number, number],
    pointCount: number
  ) => void;
  /** React key for reconciliation */
  key?: Key;
};

function MapClusterLayer<
  P extends GeoJSON.GeoJsonProperties = GeoJSON.GeoJsonProperties
>({
  data,
  clusterMaxZoom = 14,
  clusterRadius = 50,
  clusterColors = ["#22c55e", "#eab308", "#ef4444"],
  clusterThresholds = [100, 750],
  pointColor = "#3b82f6",
  onPointClick,
  onClusterClick,
  key,
}: MapClusterLayerProps<P>) {
  const { map, isLoaded } = useMap();
  const id = useId();
  const sourceId = `cluster-source-${id}`;
  const clusterLayerId = `clusters-${id}`;
  const clusterCountLayerId = `cluster-count-${id}`;
  const unclusteredLayerId = `unclustered-point-${id}`;

  const stylePropsRef = useRef({
    clusterColors,
    clusterThresholds,
    pointColor,
  });

  // Add source and layers on mount
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Add clustered GeoJSON source
    map.addSource(sourceId, {
      type: "geojson",
      data,
      cluster: true,
      clusterMaxZoom,
      clusterRadius,
    });

    // Add cluster circles layer
    map.addLayer({
      id: clusterLayerId,
      type: "circle",
      source: sourceId,
      filter: ["has", "point_count"],
      paint: {
        "circle-color": [
          "step",
          ["get", "point_count"],
          clusterColors[0],
          clusterThresholds[0],
          clusterColors[1],
          clusterThresholds[1],
          clusterColors[2],
        ],
        "circle-radius": [
          "step",
          ["get", "point_count"],
          20,
          clusterThresholds[0],
          30,
          clusterThresholds[1],
          40,
        ],
        "circle-stroke-width": 1,
        "circle-stroke-color": "#fff",
        "circle-opacity": 0.85,
      },
    });

    // Add cluster count text layer
    map.addLayer({
      id: clusterCountLayerId,
      type: "symbol",
      source: sourceId,
      filter: ["has", "point_count"],
      layout: {
        "text-field": "{point_count_abbreviated}",
        "text-font": ["Open Sans"],
        "text-size": 12,
      },
      paint: {
        "text-color": "#fff",
      },
    });

    // Add unclustered point layer
    map.addLayer({
      id: unclusteredLayerId,
      type: "circle",
      source: sourceId,
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": pointColor,
        "circle-radius": 5,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#fff",
      },
    });

    return () => {
      try {
        if (map.getLayer(clusterCountLayerId))
          map.removeLayer(clusterCountLayerId);
        if (map.getLayer(unclusteredLayerId))
          map.removeLayer(unclusteredLayerId);
        if (map.getLayer(clusterLayerId)) map.removeLayer(clusterLayerId);
        if (map.getSource(sourceId)) map.removeSource(sourceId);
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map, sourceId]);

  // Update source data when data prop changes (only for non-URL data)
  useEffect(() => {
    if (!isLoaded || !map || typeof data === "string") return;

    const source = map.getSource(sourceId);
    if (source && (source as any).setData) {
      (source as any).setData(data);
    }
  }, [isLoaded, map, data, sourceId]);

  // Update layer styles when props change
  useEffect(() => {
    if (!isLoaded || !map) return;

    const prev = stylePropsRef.current;
    const colorsChanged =
      prev.clusterColors !== clusterColors ||
      prev.clusterThresholds !== clusterThresholds;

    // Update cluster layer colors and sizes
    if (map.getLayer(clusterLayerId) && colorsChanged) {
      map.setPaintProperty(clusterLayerId, "circle-color", [
        "step",
        ["get", "point_count"],
        clusterColors[0],
        clusterThresholds[0],
        clusterColors[1],
        clusterThresholds[1],
        clusterColors[2],
      ]);
      map.setPaintProperty(clusterLayerId, "circle-radius", [
        "step",
        ["get", "point_count"],
        20,
        clusterThresholds[0],
        30,
        clusterThresholds[1],
        40,
      ]);
    }

    // Update unclustered point layer color
    if (map.getLayer(unclusteredLayerId) && prev.pointColor !== pointColor) {
      map.setPaintProperty(unclusteredLayerId, "circle-color", pointColor);
    }

    stylePropsRef.current = { clusterColors, clusterThresholds, pointColor };
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    clusterColors,
    clusterThresholds,
    pointColor,
  ]);

  // Handle click events
  useEffect(() => {
    if (!isLoaded || !map) return;

    // Cluster click handler - zoom into cluster
    const handleClusterClick = async (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      }
    ) => {
      const features = map.queryRenderedFeatures(e.point, {
        layers: [clusterLayerId],
      });
      if (!features.length) return;

      const feature = features[0];
      const clusterId = feature.properties?.cluster_id as number;
      const pointCount = feature.properties?.point_count as number;
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [
        number,
        number
      ];

      if (onClusterClick) {
        onClusterClick(clusterId, coordinates, pointCount);
      } else {
        // Default behavior: zoom to cluster expansion zoom
        const source = map.getSource(sourceId);
        const zoom = await (source as any).getClusterExpansionZoom(clusterId);
        map.easeTo({
          center: coordinates,
          zoom,
        });
      }
    };

    // Unclustered point click handler
    const handlePointClick = (
      e: maplibregl.MapMouseEvent & {
        features?: maplibregl.MapGeoJSONFeature[];
      }
    ) => {
      if (!onPointClick || !e.features?.length) return;

      const feature = e.features[0];
      const coordinates = (
        feature.geometry as GeoJSON.Point
      ).coordinates.slice() as [number, number];

      // Handle world copies
      while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
        coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
      }

      onPointClick(
        feature as unknown as GeoJSON.Feature<GeoJSON.Point, P>,
        coordinates
      );
    };

    // Cursor style handlers
    const handleMouseEnterCluster = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleMouseLeaveCluster = () => {
      map.getCanvas().style.cursor = "";
    };
    const handleMouseEnterPoint = () => {
      if (onPointClick) {
        map.getCanvas().style.cursor = "pointer";
      }
    };
    const handleMouseLeavePoint = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", clusterLayerId, handleClusterClick);
    map.on("click", unclusteredLayerId, handlePointClick);
    map.on("mouseenter", clusterLayerId, handleMouseEnterCluster);
    map.on("mouseleave", clusterLayerId, handleMouseLeaveCluster);
    map.on("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
    map.on("mouseleave", unclusteredLayerId, handleMouseLeavePoint);

    return () => {
      map.off("click", clusterLayerId, handleClusterClick);
      map.off("click", unclusteredLayerId, handlePointClick);
      map.off("mouseenter", clusterLayerId, handleMouseEnterCluster);
      map.off("mouseleave", clusterLayerId, handleMouseLeaveCluster);
      map.off("mouseenter", unclusteredLayerId, handleMouseEnterPoint);
      map.off("mouseleave", unclusteredLayerId, handleMouseLeavePoint);
    };
  }, [
    isLoaded,
    map,
    clusterLayerId,
    unclusteredLayerId,
    sourceId,
    onClusterClick,
    onPointClick,
  ]);

  return null;
}

export {
  Map,
  useMap,
  MapMarker,
  MarkerContent,
  MarkerPopup,
  MarkerTooltip,
  MarkerLabel,
  MapPopup,
  MapControls,
  MapRoute,
  MapClusterLayer,
};

export type { MapRef, MapViewport };
