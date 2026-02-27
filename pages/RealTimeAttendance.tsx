import React, { useState, useEffect, useRef } from 'react';
import { User, AttendanceRecord, UserRole, AppNotification } from '../types';
import { calculateMinutes, formatDateForInput, formatTime12Hour, calculateDistance } from '../services/utils';
import { Clock, LogIn, LogOut, Calendar, Sun, Moon, MapPin, AlertTriangle } from 'lucide-react';
import { OFFICE_LOCATION, DEPARTURE_TIME_LIMIT } from '../constants';
import { api } from '../services/api';

interface RealTimeAttendanceProps {
  user: User;
  onSave: (record: AttendanceRecord) => void;
  existingRecord?: AttendanceRecord;
}

export const RealTimeAttendance: React.FC<RealTimeAttendanceProps> = ({ user, onSave, existingRecord }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isOutside, setIsOutside] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const notificationSentRef = useRef<boolean>(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Geofencing Logic
  useEffect(() => {
    if (user.role === UserRole.ADMIN) return; // Admin doesn't need geofencing for themselves in this context

    let watchId: number;

    const startWatching = () => {
      if (!navigator.geolocation) {
        setLocationError("Geolocation is not supported by your browser.");
        return;
      }

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const distance = calculateDistance(
            latitude,
            longitude,
            OFFICE_LOCATION.lat,
            OFFICE_LOCATION.lng
          );

          const outside = distance > OFFICE_LOCATION.radius;
          setIsOutside(outside);

          // Check for early departure notification
          if (outside && existingRecord && (existingRecord.amIn || existingRecord.pmIn) && !existingRecord.pmOut) {
            const now = new Date();
            const [limitH, limitM] = DEPARTURE_TIME_LIMIT.split(':').map(Number);
            const limitDate = new Date();
            limitDate.setHours(limitH, limitM, 0, 0);

            if (now < limitDate && !notificationSentRef.current) {
              sendEarlyDepartureNotification(latitude, longitude);
              notificationSentRef.current = true;
            }
          }
        },
        (error) => {
          console.error("Geolocation error:", error);
          let msg = "Unable to retrieve your location.";
          switch(error.code) {
            case error.PERMISSION_DENIED:
              msg = "Location access denied. Please enable location services in your browser settings.";
              break;
            case error.POSITION_UNAVAILABLE:
              msg = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              msg = "The request to get user location timed out.";
              break;
          }
          setLocationError(msg);
        },
        { 
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
    };

    const sendEarlyDepartureNotification = async (lat: number, lng: number) => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const notification: AppNotification = {
        id: Date.now().toString(),
        userId: user.id,
        userName: user.profile.name,
        userRole: user.role,
        type: 'EARLY_DEPARTURE',
        message: `${user.profile.name} (${user.role}) left the office location at ${timeStr} (Before 5 PM).`,
        timestamp: now.toISOString(),
        location: { lat, lng },
        isRead: false,
        attendanceRecordId: existingRecord?.id
      };

      await api.notifications.add(notification);
      console.log("Early departure notification sent to admin");
    };

    if ((existingRecord?.amIn || existingRecord?.pmIn) && !existingRecord?.pmOut) {
      startWatching();
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [user, existingRecord]);

  const isStudentOrEmployee = user.role === UserRole.STUDENT || user.role === UserRole.EMPLOYEE;
  const isPastOnePM = isStudentOrEmployee && currentTime.getHours() >= 13;
  const isBeforeNoon = isStudentOrEmployee && currentTime.getHours() < 12;

  const handleClockAction = (field: 'amIn' | 'amOut' | 'pmIn' | 'pmOut') => {
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const todayStr = formatDateForInput(now);

    const baseRecord: AttendanceRecord = existingRecord || {
        id: Date.now().toString(),
        userId: user.id,
        date: todayStr,
        amIn: '',
        amOut: '',
        pmIn: '',
        pmOut: '',
        undertimeMinutes: 0,
        totalDailyMinutes: 0,
        isLocked: false,
        isPmDepartureLocked: false,
        remarks: '',
        isMerged: false
    };

    const newRecord = { ...baseRecord, [field]: timeStr };
    
    // Recalculate totals
    const amMinutes = calculateMinutes(newRecord.amIn, newRecord.amOut);
    const pmMinutes = calculateMinutes(newRecord.pmIn, newRecord.pmOut);
    const totalNet = Math.max(0, amMinutes + pmMinutes - newRecord.undertimeMinutes);
    
    newRecord.totalDailyMinutes = totalNet;
    newRecord.isLocked = !!(newRecord.amIn && newRecord.amOut && newRecord.pmIn && newRecord.pmOut);
    
    onSave(newRecord);
  };

  const getTimeDisplay = (time24: string) => {
      if (!time24) return '--:--';
      return formatTime12Hour(time24);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
        <div className="text-center py-8 bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl shadow-lg text-white px-4">
            <h2 className="text-xl md:text-2xl font-medium opacity-90">Current Time</h2>
            <div className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight my-4 font-mono break-all sm:break-normal">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-2 text-brand-100">
                <Calendar className="w-5 h-5 hidden sm:block" />
                <span className="text-sm sm:text-lg">{currentTime.toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AM Session */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100 flex items-center">
                    <Sun className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Morning Session (AM)</h3>
                        <p className="text-xs text-gray-500">Arrival & Departure</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
                    <div className="flex flex-col space-y-3">
                        <div className="text-sm font-medium text-gray-500">Time In</div>
                        <div className={`text-2xl font-bold ${existingRecord?.amIn ? 'text-gray-900' : 'text-gray-300'}`}>
                            {getTimeDisplay(existingRecord?.amIn || '')}
                        </div>
                        <button 
                            onClick={() => handleClockAction('amIn')}
                            disabled={!!existingRecord?.amIn || isPastOnePM}
                            className={`flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                                existingRecord?.amIn || isPastOnePM
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:transform active:scale-95'
                            }`}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Clock In
                        </button>
                    </div>

                    <div className="flex flex-col space-y-3 border-t border-gray-100 pt-6 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4">
                        <div className="text-sm font-medium text-gray-500">Time Out</div>
                        <div className={`text-2xl font-bold ${existingRecord?.amOut ? 'text-gray-900' : 'text-gray-300'}`}>
                            {getTimeDisplay(existingRecord?.amOut || '')}
                        </div>
                        <button 
                            onClick={() => {
                                if (isBeforeNoon) {
                                    setShowWarning(true);
                                } else {
                                    handleClockAction('amOut');
                                }
                            }}
                            disabled={!!existingRecord?.amOut || !existingRecord?.amIn || isPastOnePM}
                            className={`flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                                existingRecord?.amOut || !existingRecord?.amIn || isPastOnePM
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm active:transform active:scale-95'
                            }`}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Clock Out
                        </button>
                    </div>
                </div>
            </div>

            {/* PM Session */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center">
                    <Moon className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" />
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Afternoon Session (PM)</h3>
                        <p className="text-xs text-gray-500">Arrival & Departure</p>
                    </div>
                </div>
                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-4">
                    <div className="flex flex-col space-y-3">
                        <div className="text-sm font-medium text-gray-500">Time In</div>
                        <div className={`text-2xl font-bold ${existingRecord?.pmIn ? 'text-gray-900' : 'text-gray-300'}`}>
                            {getTimeDisplay(existingRecord?.pmIn || '')}
                        </div>
                        <button 
                            onClick={() => handleClockAction('pmIn')}
                            disabled={!!existingRecord?.pmIn}
                            className={`flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                                existingRecord?.pmIn 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm active:transform active:scale-95'
                            }`}
                        >
                            <LogIn className="w-4 h-4 mr-2" />
                            Clock In
                        </button>
                    </div>

                    <div className="flex flex-col space-y-3 border-t border-gray-100 pt-6 sm:border-t-0 sm:pt-0 sm:border-l sm:pl-4">
                        <div className="text-sm font-medium text-gray-500">Time Out</div>
                        <div className={`text-2xl font-bold ${existingRecord?.pmOut ? 'text-gray-900' : 'text-gray-300'}`}>
                            {getTimeDisplay(existingRecord?.pmOut || '')}
                        </div>
                        <button 
                            onClick={() => handleClockAction('pmOut')}
                            disabled={!!existingRecord?.pmOut || !existingRecord?.pmIn || existingRecord?.isPmDepartureLocked}
                            className={`flex items-center justify-center py-2 px-4 rounded-lg font-medium transition-colors ${
                                existingRecord?.pmOut || !existingRecord?.pmIn || existingRecord?.isPmDepartureLocked
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-orange-600 text-white hover:bg-orange-700 shadow-sm active:transform active:scale-95'
                            }`}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            {existingRecord?.isPmDepartureLocked ? 'Departure Locked' : 'Clock Out'}
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {isOutside && (existingRecord?.amIn || existingRecord?.pmIn) && !existingRecord?.pmOut && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start text-red-700">
                <AlertTriangle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-bold">Outside Office Geofence</h4>
                    <p className="text-sm">You are currently outside the designated office area. Your location is being monitored.</p>
                </div>
            </div>
        )}

        {locationError && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start text-amber-700">
                <MapPin className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                    <h4 className="font-bold">Location Access Required</h4>
                    <p className="text-sm">{locationError}</p>
                </div>
            </div>
        )}

        {/* Summary Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-center text-sm text-gray-600 text-center">
            <Clock className="w-4 h-4 mr-2 flex-shrink-0" />
            <span>Updates made here are automatically reflected in your Daily Time Record.</span>
        </div>

        {/* Warning Popup */}
        {showWarning && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl transform transition-all animate-in fade-in zoom-in duration-200">
                    <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4 mx-auto">
                        <AlertTriangle className="w-6 h-6 text-amber-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Just a heads-up!</h3>
                    <p className="text-gray-600 text-center mb-6">
                        The morning session Clock Out button won't be available until 12:00 PM.
                    </p>
                    <button 
                        onClick={() => setShowWarning(false)}
                        className="w-full py-3 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-colors shadow-lg shadow-brand-200"
                    >
                        Got it
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};