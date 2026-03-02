import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Modal } from '../common/Modal';
import { useSettings } from '../../context/SettingsContext';
import { TRANSLATIONS } from '../../i18n/translations';

interface MobileScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  color?: string;
}

export const MobileScannerModal: React.FC<MobileScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  color,
}) => {
  const { language } = useSettings();
  const t = TRANSLATIONS[language];
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const regionId = 'reader';
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Clear any previous error
      setError(null);
      
      // Initialize scanner
      const html5QrCode = new Html5Qrcode(regionId);
      scannerRef.current = html5QrCode;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ]
      };

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          onScanSuccess(decodedText);
          handleStop();
          onClose();
        },
        (errorMessage) => {
          // Internal error call (usually just "no QR code detected in this frame")
          // We don't show these to the user
        }
      ).then(() => {
        // Check if torch is supported
        const track = (html5QrCode as any).getRunningTrack();
        if (track && track.getCapabilities) {
           const capabilities = track.getCapabilities() as any;
           if (capabilities.torch) {
             setHasFlash(true);
           }
        }
      }).catch((err) => {
        console.error("Failed to start scanner:", err);
        setError(language === 'AR' ? 'فشل تشغيل الكاميرا. يرجى التأكد من إعطاء الصلاحية.' : 'Failed to start camera. Please ensure permissions are granted.');
      });

      return () => {
        handleStop();
      };
    }
  }, [isOpen]);

  const handleStop = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner:", err);
      }
    }
  };

  const toggleFlash = async () => {
    const scanner = scannerRef.current;
    if (scanner && scanner.isScanning) {
      const track = (scanner as any).getRunningTrack();
      if (track) {
        try {
          await track.applyConstraints({
            advanced: [{ torch: !isFlashOn }]
          } as any);
          setIsFlashOn(!isFlashOn);
        } catch (err) {
          console.error("Failed to toggle flash:", err);
        }
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={language === 'AR' ? 'ماسح الأكواد' : 'Code Scanner'}
      icon="qr_code_scanner"
      size="md"
      className="bg-black dark:bg-[#06080F]"
    >
      <div className="flex flex-col items-center justify-center p-4">
        {/* Scanner Container */}
        <div 
          id={regionId} 
          className="w-full aspect-square rounded-3xl overflow-hidden bg-gray-900 border-4 border-gray-800 relative shadow-2xl"
          style={{ maxWidth: '400px' }}
        >
          {/* Overlay Guide */}
          <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none flex items-center justify-center">
             <div 
               className="w-full h-full border-2 border-primary-500 rounded-xl relative overflow-hidden"
               style={{ borderColor: color || 'var(--primary-color)' }}
             >
                {/* Scanning line animation */}
                <div 
                   className="absolute top-0 left-0 w-full h-1 bg-primary-500 shadow-[0_0_15px_rgba(var(--primary-rgb),0.8)] animate-[scan_2s_linear_infinite]"
                   style={{ 
                     backgroundColor: color || 'var(--primary-color)',
                     boxShadow: `0 0 15px ${color || 'var(--primary-primary)'}cc`
                   }}
                />
             </div>
          </div>
          
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center bg-black/80 backdrop-blur-sm">
               <span className="material-symbols-rounded text-red-500 text-5xl mb-4">no_photography</span>
               <p className="text-white text-sm font-medium leading-relaxed">{error}</p>
               <button 
                 onClick={onClose}
                 className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors text-sm font-bold"
               >
                 {language === 'AR' ? 'إغلاق' : 'Close'}
               </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-4 w-full">
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center max-w-[280px]">
            {language === 'AR' 
              ? 'وجه الكاميرا نحو الباركود أو الـ QR كود وسيتم التعرف عليه تلقائياً' 
              : 'Point the camera at a barcode or QR code to scan it automatically'}
          </p>

          <div className="flex items-center gap-4 mt-4">
             {hasFlash && (
                <button
                  onClick={toggleFlash}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isFlashOn 
                    ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/20' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                  }`}
                >
                  <span className="material-symbols-rounded text-2xl">
                    {isFlashOn ? 'flashlight_off' : 'flashlight_on'}
                  </span>
                </button>
             )}

             <button
               onClick={onClose}
               className="h-14 px-8 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 font-bold flex items-center gap-2 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all border border-red-100 dark:border-red-500/20"
             >
               <span className="material-symbols-rounded text-xl">close</span>
               {language === 'AR' ? 'إلغاء' : 'Cancel'}
             </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        #reader video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
          border-radius: 20px;
        }
      `}</style>
    </Modal>
  );
};
