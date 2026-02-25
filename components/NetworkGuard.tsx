import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, ShieldCheck, ShieldAlert, Loader2, RefreshCw } from 'lucide-react';
import { ALLOWED_WIFI } from '../constants';

interface NetworkGuardProps {
  children: React.ReactNode;
}

export const NetworkGuard: React.FC<NetworkGuardProps> = ({ children }) => {
  const [status, setStatus] = useState<'scanning' | 'denied' | 'success' | 'granted'>('scanning');
  const [detectedNetwork, setDetectedNetwork] = useState<{ name: string; routerIp: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [currentIp, setCurrentIp] = useState<string | null>(null);

  const verifyNetwork = async () => {
    setStatus('scanning');
    setError(null);
    
    try {
      // Fetch public IP
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      const ip = data.ip;
      setCurrentIp(ip);

      const allowed = ALLOWED_WIFI.find(w => w.publicIp === ip);
      
      if (allowed) {
        setDetectedNetwork({ name: allowed.name, routerIp: allowed.routerIp });
        setStatus('success');
        localStorage.setItem('verified_network', allowed.name);
        
        // Brief delay to show success message before granting access
        setTimeout(() => {
            setStatus('granted');
        }, 2000);
      } else {
        setStatus('denied');
        localStorage.removeItem('verified_network');
      }
    } catch (err) {
      console.error("Failed to fetch IP:", err);
      setError("Unable to verify network connection. Please check your internet.");
      setStatus('denied');
    }
  };

  useEffect(() => {
    verifyNetwork();
  }, []);

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
                status === 'denied' ? 'bg-red-500/20' : 
                'bg-green-500/20'
              }`}>
                {status === 'scanning' ? (
                  <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                ) : status === 'denied' ? (
                  <WifiOff className="h-12 w-12 text-red-500" />
                ) : (
                  <Wifi className="h-12 w-12 text-green-500 animate-bounce" />
                )}
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2 tracking-tight">Security Gatekeeper</h1>
            <p className="text-slate-400 text-sm">Network Verification Required</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          {status === 'scanning' && (
            <div className="text-center space-y-4 py-4">
              <p className="text-slate-600 font-medium animate-pulse">Scanning for authorized office networks...</p>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full animate-[progress_2s_ease-in-out_infinite]"></div>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4 py-4 animate-fade-in">
              <div className="bg-green-50 border border-green-100 p-4 rounded-2xl">
                <div className="flex flex-col items-center">
                    <ShieldCheck className="w-8 h-8 text-green-600 mb-2" />
                    <h3 className="text-lg font-bold text-green-900">Access Granted</h3>
                    <p className="text-sm text-green-700 mt-1">Secure connection established</p>
                </div>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center">
                    <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center mr-4">
                        <Wifi className="w-5 h-5 text-green-500" />
                    </div>
                    <div className="text-left">
                        <p className="text-sm font-bold text-slate-900">{detectedNetwork?.name}</p>
                        <p className="text-xs text-slate-500 font-mono">Router IP: {detectedNetwork?.routerIp}</p>
                    </div>
                </div>
              </div>
              
              <p className="text-xs text-slate-400">Redirecting to Login Page...</p>
            </div>
          )}

          {status === 'denied' && (
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
                  <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest text-center">Required Network Connection</p>
                  
                  {ALLOWED_WIFI.map((wifi) => (
                    <div key={wifi.name} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between opacity-75">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-white rounded-xl border border-slate-200 flex items-center justify-center mr-4">
                          <Wifi className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900">{wifi.name}</p>
                          <p className="text-xs text-slate-500 font-mono">Router IP: {wifi.routerIp}</p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <p className="text-xs text-center text-slate-400 mt-4 px-4">
                    Please connect your device to one of the networks above to proceed.
                  </p>
                </div>

              <button 
                onClick={verifyNetwork}
                className="w-full flex items-center justify-center py-3 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection Check
              </button>
            </>
          )}
        </div>
        
        <div className="bg-slate-50 p-6 border-t border-slate-100">
          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-medium uppercase tracking-widest">Secure Environment v3.1</span>
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
