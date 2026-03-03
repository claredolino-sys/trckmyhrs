import React, { useRef, useState, useEffect } from 'react';
import { Camera, ShieldCheck, ShieldAlert, Loader2, UserCheck, RefreshCw } from 'lucide-react';
import * as faceapi from '@vladmandic/face-api';

interface FaceLivenessProps {
  storedProfilePicture: string; // Base64
  onSuccess: () => void;
  onCancel: () => void;
}

export const FaceLiveness: React.FC<FaceLivenessProps> = ({ storedProfilePicture, onSuccess, onCancel }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [status, setStatus] = useState<'initializing' | 'ready' | 'verifying' | 'success' | 'failed'>('initializing');
  const [message, setMessage] = useState('Loading biometric models...');
  const [error, setError] = useState<string | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  useEffect(() => {
    loadModels();
    return () => stopCamera();
  }, []);

  const loadModels = async () => {
    try {
      const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      setModelsLoaded(true);
      startCamera();
    } catch (err) {
      console.error("Failed to load face-api models", err);
      setError("Failed to load biometric models. Please check your internet connection.");
      setStatus('failed');
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not supported in this browser');
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 720 }, 
          height: { ideal: 720 } 
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        // Ensure video plays
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => console.error("Play error:", e));
        };
        setStatus('ready');
        setMessage('Position your face in the frame');
        setError(null);
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Could not access camera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMessage = 'Camera permission denied. Please click the camera icon in your browser address bar to allow access.';
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
    if (!videoRef.current || !modelsLoaded) return;

    setStatus('verifying');
    setMessage('Analyzing biometric data...');
    setError(null);

    try {
      const video = videoRef.current;
      
      // Ensure video is ready
      if (video.readyState !== 4) {
         await new Promise(resolve => setTimeout(resolve, 500)); // Wait a bit
      }

      // 1. Detect face in live video with retry
      let liveDetection = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (!liveDetection && attempts < maxAttempts) {
        // Try SSD MobileNet first (more accurate)
        liveDetection = await faceapi.detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
        
        // If failed, try TinyFaceDetector (more robust/faster)
        if (!liveDetection) {
             liveDetection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
        }

        if (!liveDetection) {
            attempts++;
            await new Promise(resolve => setTimeout(resolve, 500)); // Wait 500ms between attempts
        }
      }

      if (!liveDetection) {
        throw new Error("No face detected. Please ensure good lighting, remove masks/glasses, and look directly at the camera.");
      }

      // 2. Detect face in stored profile picture
      const img = new Image();
      img.crossOrigin = "anonymous"; // Handle potential CORS if image is from external URL
      img.src = storedProfilePicture;
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error("Failed to load profile picture"));
      });
      
      // Try SSD first for stored image
      let storedDetection = await faceapi.detectSingleFace(img, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })).withFaceLandmarks().withFaceDescriptor();
      
      // Fallback to Tiny if needed
      if (!storedDetection) {
          storedDetection = await faceapi.detectSingleFace(img, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
      }

      if (!storedDetection) {
        throw new Error("No face detected in your registered profile picture. Please contact Admin to update your photo.");
      }

      // 3. Compare descriptors (Euclidean distance)
      const distance = faceapi.euclideanDistance(liveDetection.descriptor, storedDetection.descriptor);
      
      // Threshold typically 0.6 for verification
      const threshold = 0.55; 
      const isMatch = distance < threshold;

      console.log(`Face Match Distance: ${distance} (Threshold: ${threshold})`);

      if (isMatch) {
        setStatus('success');
        setMessage('Identity verified successfully!');
        setTimeout(onSuccess, 500);
      } else {
        setStatus('failed');
        setError('Verification failed. Face does not match profile photo.');
      }

    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification.');
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
            
            {status === 'initializing' && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                <span className="text-xs font-bold text-slate-600">Loading Models...</span>
              </div>
            )}

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
                disabled={status !== 'ready' || !modelsLoaded}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-4 h-4 mr-2" />
                {modelsLoaded ? 'Verify Identity' : 'Loading...'}
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
            Powered by FaceAPI.js (Local Processing)
          </p>
        </div>
      </div>
    </div>
  );
};
