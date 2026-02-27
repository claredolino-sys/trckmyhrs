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
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 720 }, height: { ideal: 720 } } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStatus('ready');
        setMessage('Position your face in the frame');
        setError(null);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Could not access camera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please allow camera access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMessage = 'No camera found on this device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMessage = 'Camera is already in use by another application.';
      }

      setError(errorMessage);
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
    
    // Capture a square frame from the center of the video
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Calculate crop to center
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;

    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    
    const liveCapture = canvas.toDataURL('image/jpeg', 0.8);
    const liveCaptureBase64 = liveCapture.split(',')[1];
    const storedPicBase64 = storedProfilePicture.includes(',') ? storedProfilePicture.split(',')[1] : storedProfilePicture;

    try {
      // Check both process.env (from vite define) and import.meta.env (standard Vite)
      const apiKey = process.env.GEMINI_API_KEY || (import.meta as any).env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        throw new Error("Gemini API Key is missing. Please add GEMINI_API_KEY or VITE_GEMINI_API_KEY to your Vercel environment variables.");
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `
        You are a strict biometric security system.
        Compare the two provided images:
        1. Reference Image (Stored Profile)
        2. Candidate Image (Live Camera Capture)

        Analyze for:
        1. Identity Match: Is it the same person? (Ignore minor changes like glasses, hair style, or lighting).
        2. Liveness: Is the Candidate Image a real person present in front of the camera? (Check for screen glare, moire patterns, flat 2D appearance, or holding a photo).

        Output JSON ONLY:
        {
          "isSamePerson": boolean,
          "isLive": boolean,
          "confidence": number (0.0 to 1.0),
          "reason": "Brief explanation of the decision"
        }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image", // Using a model known for good image handling
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
      responseText = responseText.replace(/```json\n?|\n?```/g, '').trim();
      
      console.log("Biometric Result:", responseText); // Debugging

      const result = JSON.parse(responseText);

      // Stricter check
      if (result.isSamePerson && result.isLive && result.confidence > 0.75) {
        setStatus('success');
        setMessage('Identity verified successfully!');
        setTimeout(onSuccess, 1500);
      } else {
        setStatus('failed');
        setError(result.reason || 'Verification failed. Face did not match or liveness check failed.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification. Please try again.');
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
          {/* 1:1 Aspect Ratio Container */}
          <div className="relative aspect-square bg-slate-100 rounded-full overflow-hidden border-4 border-slate-200 shadow-inner mx-auto w-64 h-64">
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
          </div>

          <div className="text-center">
            <p className={`text-sm font-medium ${status === 'failed' ? 'text-red-600' : 'text-slate-600'}`}>
              {status === 'failed' ? error : message}
            </p>
            <p className="text-xs text-slate-400 mt-2">
                Ensure your face is clearly visible and well-lit.
            </p>
          </div>

          <div className="flex space-x-3">
            {status === 'failed' ? (
              <button
                onClick={() => { 
                  setStatus('ready'); 
                  setError(null); 
                  setMessage('Position your face in the frame'); 
                  startCamera(); // Ensure camera is running
                }}
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
                Verify Identity
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
    </div>
  );
};
