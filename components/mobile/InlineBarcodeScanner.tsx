import React, { useEffect, useRef, useState } from 'react';
import { BarcodeDetector } from 'barcode-detector';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';

interface InlineBarcodeScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onClose: () => void;
  color?: string;
}

export const InlineBarcodeScanner: React.FC<InlineBarcodeScannerProps> = ({
  onScanSuccess,
  onClose,
  color,
}) => {
  const { language } = useSettings();
  const t = TRANSLATIONS[language];
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetector | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isScanCompleteRef = useRef<boolean>(false);
  const isFlashOnRef = useRef<boolean>(false);
  
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const initScanner = async () => {
    try {
      setError(null);
      if (!detectorRef.current) {
        detectorRef.current = new BarcodeDetector({
          formats: [
            'qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'
          ],
        });
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setIsReady(true);
        startDetection();
        
        const track = stream.getVideoTracks()[0];
        if (track) {
          const capabilities = track.getCapabilities() as any;
          if (capabilities.torch) {
            setHasFlash(true);
          }
        }
      }
    } catch (err: any) {
      console.error("Failed to start scanner:", err);
      let errorMsg = language === 'AR' 
        ? 'فشل تشغيل الكاميرا.' 
        : 'Failed to start camera.';
        
      if (err.name === 'NotAllowedError') {
        errorMsg = language === 'AR' ? 'الكاميرا مرفوضة.' : 'Camera access denied.';
      }
      setError(errorMsg);
    }
  };

  const stopScanner = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    if (isFlashOnRef.current) {
      toggleFlash(false);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    isProcessingRef.current = false;
  };

  const startDetection = () => {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;
    isScanCompleteRef.current = false;

    const detectFrame = async () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const detector = detectorRef.current;

      if (!video || !canvas || !detector || isProcessingRef.current || video.readyState !== video.HAVE_ENOUGH_DATA) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
        return;
      }

      try {
        isProcessingRef.current = true;
        
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const barcodes = await detector.detect(canvas);
          
          if (barcodes.length > 0) {
            isScanCompleteRef.current = true;
            if (window.navigator.vibrate) window.navigator.vibrate([20, 30, 20]);
            onScanSuccess(barcodes[0].rawValue);
            // Don't auto-stop here physically, let the parent component unmount us
            return;
          }
        }
      } catch (err) {
      } finally {
        isProcessingRef.current = false;
        if (!isScanCompleteRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      }
    };

    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const toggleFlash = async (forceState?: boolean) => {
    const newState = forceState !== undefined ? forceState : !isFlashOn;
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: newState }]
          } as any);
          isFlashOnRef.current = newState;
          setIsFlashOn(newState);
        } catch (err) {
          console.error("Failed to toggle flash:", err);
        }
      }
    }
  };

  return (
    <div className="w-full relative overflow-hidden bg-black rounded-[32px] shadow-inner mb-3 transition-all duration-600 ease-[cubic-bezier(0.2,0.8,0.2,1)] animate-fade-in group" style={{ height: '180px' }}>
      
      {/* Video Feed */}
      <video
        ref={videoRef}
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${isReady ? 'opacity-100' : 'opacity-0'}`}
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Modern Overlay Scanning Area */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center border-[20px] border-black/40 mix-blend-hard-light rounded-[32px]">
        <div 
          className="w-full h-full border-2 rounded-[12px] relative overflow-hidden"
          style={{ borderColor: color || 'var(--primary-color)' }}
        >
          {/* Scanning line animation */}
          <div 
            className="absolute start-0 w-full h-[3px] shadow-[0_0_20px_rgba(var(--primary-rgb),0.8)] animate-[scan_2.5s_ease-in-out_infinite]"
            style={{ 
              backgroundColor: color || 'var(--primary-color)',
              boxShadow: `0 0 15px ${color || 'var(--primary-color)'}`
            }}
          />
        </div>
      </div>

      {/* Loading Skeleton or Dev Mode Message */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-900">
           <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-3"></div>
           <p className="text-white/70 text-xs font-medium">
             {language === 'AR' ? 'جاري تشغيل الكاميرا...' : 'Starting camera...'}
           </p>
        </div>
      )}

      {isReady && import.meta.env.DEV && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-gray-900/40 backdrop-blur-sm z-20 text-center">
          <span className="material-symbols-rounded text-primary-400 text-3xl mb-2">developer_mode</span>
          <p className="text-white text-sm font-bold mb-1">
            {language === 'AR' ? 'وضع التطوير نشط' : 'Development Mode'}
          </p>
          <p className="text-white/70 text-[10px] max-w-[180px]">
            {language === 'AR' 
              ? 'تم تعطيل الكاميرا تلقائياً لتسريع التحميل. يمكنك إدخال الكود يدوياً.' 
              : 'Camera disabled to prevent hanging. Please enter code manually.'}
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-gray-900 text-center">
           <span className="material-symbols-rounded text-red-400 text-3xl mb-2">no_photography</span>
           <p className="text-white text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Floating Controls Overlay */}
      <div className="absolute top-2 end-2 flex flex-col gap-2 z-10 transition-opacity duration-300 opacity-80 hover:opacity-100">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md text-white hover:bg-white hover:text-black transition-colors flex items-center justify-center shadow-lg border border-white/10"
        >
          <span className="material-symbols-rounded text-xl">close</span>
        </button>
        
        {hasFlash && (
          <button
            onClick={() => toggleFlash()}
            className={`w-10 h-10 rounded-full backdrop-blur-md transition-all flex items-center justify-center shadow-lg border border-white/10 ${
              isFlashOn 
              ? 'bg-yellow-400 text-black shadow-yellow-400/30' 
              : 'bg-black/50 text-white hover:bg-white/20'
            }`}
          >
            <span className="material-symbols-rounded text-xl">
              {isFlashOn ? 'flashlight_off' : 'flashlight_on'}
            </span>
          </button>
        )}
      </div>

      <style>{`
        @keyframes scan {
          0%, 100% { top: 0; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          50% { top: 100%; }
        }
      `}</style>
    </div>
  );
};
