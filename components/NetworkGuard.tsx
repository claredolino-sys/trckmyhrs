import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { ALLOWED_WIFI } from '../constants';

interface NetworkGuardProps {
  children: React.ReactNode;
}

export const NetworkGuard: React.FC<NetworkGuardProps> = ({ children }) => {
  const [status, setStatus] = useState<'scanning' | 'denied' | 'granted'>('scanning');
  const [detectedNetwork, setDetectedNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const verifyNetwork = async () => {
    setStatus('scanning');
    setError(null);
    
    // Simulate a network handshake/verification process
    // In a real browser, we can't get SSID, so we simulate the "detection" 
    // for the sake of the demo's functional flow.
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For the demo, we'll check if we've "remembered" a network or if we should prompt
    const savedNetwork = localStorage.getItem('verified_network');
    
    if (savedNetwork && ALLOWED_WIFI.some(w => w.name === savedNetwork)) {
      setDetectedNetwork(savedNetwork);
      setStatus('granted');
    } else {
      // If not saved, we "fail" the automatic scan and ask for manual verification
      // (This is where the "functional" part comes in - the user must prove they are on the right network)
      setStatus('denied');
    }
  };

  useEffect(() => {
    verifyNetwork();
  }, []);

  const handleManualVerify = (networkName: string) => {
    // This simulates the user confirming they are on the specific WiFi
    // In a real production app, this would be handled by a backend check of the client's IP
    localStorage.setItem('verified_network', networkName);
    setDetectedNetwork(networkName);
    setStatus('granted');
  };

  if (status === 'granted') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center px-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-800/10">
        <div className="bg-slate-900 p-10 text-center relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10">
            <div className="absolute top-[-50%] left-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:20px_20px]"></div>
          </div>
          
          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className={`h-24 w-24 rounded-full flex items-center justify-center transition-all duration-500 ${
                status === 'scanning' ? 'bg-blue-500/20 animate-pulse' : 
                status === 'denied' ? 'bg-red-500/20' : 'bg-green-500/20'
              }`}>
                {status === 'scanning' ? (
                  <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                ) : status === 'denied' ? (
                  <WifiOff className="h-12 w-12 text-red-500" />
                ) : (
                  <Wifi className="h-12 w-12 text-green-500" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Security Gatekeeper</h1>
            <p className="text-slate-400 text-sm">Network Verification Required</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {status === 'scanning' ? (
            <div className="text-center space-y-4 py-4">
              <p className="text-slate-600 font-medium animate-pulse">Scanning for authorized office networks...</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full animate-[progress_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start">
                <ShieldAlert className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-bold text-red-900">Access Restricted</h3>
                  <p className="text-xs text-red-700 mt-1 leading-relaxed">
                    This application is only accessible via authorized office WiFi networks. 
                    Mobile data and public networks are strictly prohibited for security reasons.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center">Authorized Networks</p>
                {ALLOWED_WIFI.map(wifi => (
                  <button
                    key={wifi.name}
                    onClick={() => handleManualVerify(wifi.name)}
                    className="w-full group bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-500 p-4 rounded-2xl transition-all duration-300 flex items-center justify-between hover:shadow-lg hover:shadow-blue-500/10"
                  >
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center mr-4 group-hover:bg-blue-50 group-hover:border-blue-200 transition-colors">
                        <Wifi className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{wifi.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">Gateway: {wifi.gateway}</p>
                      </div>
                    </div>
                    <div className="h-6 w-6 rounded-full border border-slate-300 flex items-center justify-center group-hover:border-blue-500 group-hover:bg-blue-500 transition-all">
                      <div className="h-2 w-2 rounded-full bg-transparent group-hover:bg-white"></div>
                    </div>
                  </button>
                ))}
              </div>

              <button 
                onClick={verifyNetwork}
                className="w-full flex items-center justify-center py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Automatic Scan
              </button>
            </>
          )}
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Secure Environment v3.0</span>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes progress {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 100%; transform: translateX(0); }
          100% { width: 0%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
