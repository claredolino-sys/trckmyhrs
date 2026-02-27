import React, { useRef, useState, useEffect } from 'react';
import { Camera, ShieldCheck, ShieldAlert, Loader2, UserCheck, RefreshCw } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";

interface FaceLivenessProps {
  storedProfilePicture: string; // Base64
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaceLiveness: React.FC<FaceLivenessProps> = ({ storedProfilePicture, onSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'verifying' | 'success' | 'failed'>('initializing');
  const [message, setMessage] = useState('Initializing camera...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('ready');
        setMessage('Position your face in the frame');
      }
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please ensure permissions are granted.');
      setStatus('failed');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
  };

  const captureAndVerify = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setStatus('verifying');
    setMessage('Verifying identity and liveness...');

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);
    const liveCapture = canvas.toDataURL('image/jpeg', 0.8);
    const liveCaptureBase64 = liveCapture.split(',')[1];
    const storedPicBase64 = storedProfilePicture.split(',')[1] || storedProfilePicture;

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      const prompt = `
        You are a biometric security expert. 
        I am providing two images:
        1. A stored profile picture (Reference).
        2. A live capture from a webcam (Candidate).
        
        Tasks:
        1. Face Match: Determine if the person in both images is the same individual.
        2. Liveness Check: Determine if the Candidate image looks like a real, live person in front of a camera, rather than a photo of a photo, a screen, or a mask.
        
        Respond ONLY in JSON format with the following structure:
        {
          "isSamePerson": boolean,
          "isLive": boolean,
          "confidence": number (0-1),
          "reason": "short explanation"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: storedPicBase64 } },
            { inlineData: { mimeType: "image/jpeg", data: liveCaptureBase64 } }
          ]
        },
        config: {
          responseMimeType: "application/json"
        }
      });

      let responseText = response.text || '{}';
      // Clean up markdown code blocks if present
      responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      const result = JSON.parse(responseText);

      if (result.isSamePerson && result.isLive && result.confidence > 0.7) {
        setStatus('success');
        setMessage('Identity verified successfully!');
        setTimeout(onSuccess, 1500);
      } else {
        setStatus('failed');
        setError(result.reason || 'Verification failed. Please try again.');
      }
    } catch (err) {
      console.error('Verification error:', err);
      setError('An error occurred during verification. Please try again.');
      setStatus('failed');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/95 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border border-white/10">
        <div className="bg-slate-900 p-6 text-center">
          <h2 className="text-xl font-bold text-white flex items-center justify-center">
            <UserCheck className="w-6 h-6 mr-2 text-blue-400" />
            Biometric Verification
          </h2>
          <p className="text-slate-400 text-xs mt-1">Matching with Registered Profile Photo</p>
        </div>

        <div className="p-6 space-y-6">
          <div className="relative aspect-video bg-slate-100 rounded-2xl overflow-hidden border-2 border-slate-200 shadow-inner">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${status === 'verifying' ? 'opacity-50' : ''}`}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {status === 'verifying' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/20">
                <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                <div className="w-48 h-1 bg-white/20 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full animate-[scan_2s_linear_infinite]"></div>
                </div>
              </div>
            )}

            {status === 'success' && (
              <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-[2px]">
                <ShieldCheck className="w-20 h-20 text-green-500 animate-bounce" />
              </div>
            )}

            {status === 'failed' && (
              <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 backdrop-blur-[2px]">
                <ShieldAlert className="w-20 h-20 text-red-500" />
              </div>
            )}
            
            {/* Face Guide Overlay */}
            <div className="absolute inset-0 border-[40px] border-slate-900/40 pointer-events-none">
                <div className="w-full h-full border-2 border-dashed border-white/50 rounded-[100px]"></div>
            </div>
          </div>

          <div className="text-center">
            <p className={`text-sm font-medium ${status === 'failed' ? 'text-red-600' : 'text-slate-600'}`}>
              {status === 'failed' ? error : message}
            </p>
          </div>

          <div className="flex space-x-3">
            {status === 'failed' ? (
              <button
                onClick={() => { setStatus('ready'); setError(null); setMessage('Position your face in the frame'); }}
                className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 transition-colors"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </button>
            ) : (
              <button
                onClick={captureAndVerify}
                disabled={status !== 'ready'}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture & Verify
              </button>
            )}
            <button
              onClick={onCancel}
              className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Powered by Gemini Vision Biometrics
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};
