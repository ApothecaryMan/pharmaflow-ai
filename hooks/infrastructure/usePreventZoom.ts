import { useEffect } from 'react';

/**
 * Hook to prevent pinch-to-zoom on touchpads and touch screens.
 * This is particularly useful for desktop applications built with Tauri/WebViews
 * where accidental zooming can break the layout.
 */
export const usePreventZoom = () => {
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Pinch-to-zoom on touchpads is translated to a wheel event with the Ctrl key.
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };

    // gesture events for WebKit (Linux/macOS)
    const handleGesture = (e: any) => {
      e.preventDefault();
    };

    // Add listeners
    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('gesturestart', handleGesture);
    window.addEventListener('gesturechange', handleGesture);
    window.addEventListener('gestureend', handleGesture);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('gesturestart', handleGesture);
      window.removeEventListener('gesturechange', handleGesture);
      window.removeEventListener('gestureend', handleGesture);
    };
  }, []);
};
