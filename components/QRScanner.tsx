import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, X, Camera, Loader2, AlertCircle } from 'lucide-react';

interface QRScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onClose }) => {
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scannerId = "qr-reader";
    
    const config = { 
      fps: 10, 
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    scannerRef.current = new Html5QrcodeScanner(scannerId, config, false);
    
    scannerRef.current.render(
      (decodedText) => {
        if (scannerRef.current) {
          scannerRef.current.clear();
        }
        onScan(decodedText);
      },
      (errorMessage) => {
        // Ignore errors during scan
      }
    );

    setIsInitializing(false);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 flex items-center justify-center p-4 backdrop-blur-md">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden animate-fade-in">
        <div className="bg-slate-900 p-6 flex items-center justify-between">
          <div className="flex items-center">
            <QrCode className="w-6 h-6 text-blue-400 mr-3" />
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">Scan QR Code</h2>
              <p className="text-slate-400 text-[10px] uppercase tracking-widest font-bold">Instant Login Access</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8">
          <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner flex items-center justify-center">
            <div id="qr-reader" className="w-full h-full"></div>
            
            {isInitializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50">
                <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-3" />
                <p className="text-sm text-slate-500 font-medium">Starting camera...</p>
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
                <p className="text-sm text-red-700 font-bold mb-2">Camera Error</p>
                <p className="text-xs text-red-600 leading-relaxed">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20"
                >
                  Reload Page
                </button>
              </div>
            )}
          </div>

          <div className="mt-8 text-center space-y-4">
            <div className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-700 rounded-full text-xs font-bold border border-blue-100">
              <Camera className="w-3 h-3 mr-2" />
              Place QR code within the frame
            </div>
            <p className="text-xs text-slate-500 leading-relaxed max-w-[250px] mx-auto">
              Your unique QR code is provided by the system administrator. Scan it for secure, passwordless access.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-100 text-center">
           <button 
            onClick={onClose}
            className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
           >
             Cancel and use password
           </button>
        </div>
      </div>
    </div>
  );
};
