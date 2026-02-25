import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { calculateMinutes, formatMinutesToHours } from '../services/utils';
import { AttendanceRecord, User } from '../types';
import { AlertCircle, CheckCircle, Edit3 } from 'lucide-react';

interface AttendanceInputProps {
  user: User;
  onSave: (record: AttendanceRecord) => void;
  attendanceRecords: AttendanceRecord[];
}

export const AttendanceInput: React.FC<AttendanceInputProps> = ({ user, onSave, attendanceRecords }) => {
  // State
  const [date, setDate] = useState('');
  const [amIn, setAmIn] = useState('');
  const [amOut, setAmOut] = useState('');
  const [pmIn, setPmIn] = useState('');
  const [pmOut, setPmOut] = useState('');
  const [undertime, setUndertime] = useState(0);
  const [existingRecord, setExistingRecord] = useState<AttendanceRecord | null>(null);

  // Check for existing records when date changes
  useEffect(() => {
    if (date) {
      const record = attendanceRecords.find(r => r.date === date);
      setExistingRecord(record || null);
      
      // If record exists, populate fields
      if (record) {
          setAmIn(record.amIn);
          setAmOut(record.amOut);
          setPmIn(record.pmIn);
          setPmOut(record.pmOut);
          setUndertime(record.undertimeMinutes);
      } else {
          // Reset fields if no record
          setAmIn('');
          setAmOut('');
          setPmIn('');
          setPmOut('');
          setUndertime(0);
      }
    } else {
        setExistingRecord(null);
        setAmIn('');
        setAmOut('');
        setPmIn('');
        setPmOut('');
        setUndertime(0);
    }
  }, [date, attendanceRecords]);

  // Calculations
  const amMinutes = calculateMinutes(amIn, amOut);
  const pmMinutes = calculateMinutes(pmIn, pmOut);
  const totalRaw = amMinutes + pmMinutes;
  const totalNet = Math.max(0, totalRaw - undertime);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no date selected
    if (!date) return;
    
    // If Creating new record: Require at least one time entry or undertime
    if (!existingRecord && !amIn && !amOut && !pmIn && !pmOut && undertime === 0) {
        return;
    }

    const record: AttendanceRecord = {
      id: existingRecord?.id || Date.now().toString(),
      userId: user.id,
      date,
      // Use existing values if locked/existing, otherwise use form state
      amIn: existingRecord ? existingRecord.amIn : amIn,
      amOut: existingRecord ? existingRecord.amOut : amOut,
      pmIn: existingRecord ? existingRecord.pmIn : pmIn,
      pmOut: existingRecord ? existingRecord.pmOut : pmOut,
      undertimeMinutes: existingRecord ? existingRecord.undertimeMinutes : undertime,
      totalDailyMinutes: existingRecord ? existingRecord.totalDailyMinutes : totalNet,
      isLocked: true, // Always lock upon save
      isPmDepartureLocked: existingRecord?.isPmDepartureLocked || false,
      remarks: existingRecord?.remarks || '', // Preserve remarks if they exist in backend, but don't edit here
      isMerged: existingRecord?.isMerged // Preserve merged state
    };
    
    onSave(record);
    // Force local state update to lock UI immediately after save
    setExistingRecord(record);
  };

  const isLocked = !!existingRecord;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
      <div className="mb-6 border-b pb-4">
        <h2 className="text-xl font-bold text-gray-900">Log Past Attendance</h2>
        <p className="text-sm text-gray-500">Record attendance for previous dates.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Date Selection */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Date</label>
            <input 
                type="date" 
                value={date} 
                onChange={e => setDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Prevent future dates
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            {existingRecord && (
                <div className="mt-3 flex items-start text-sm text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>Time logs are locked for this date.</span>
                </div>
            )}
            {!date && (
                <div className="mt-2 text-xs text-gray-500">
                    Please select a date to begin logging.
                </div>
            )}
        </div>

        <div className={`transition-opacity duration-200 ${!date ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AM Session */}
            <div className={`space-y-4 p-4 rounded-lg border ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-blue-50 border-blue-100'}`}>
                <h3 className={`font-semibold ${isLocked ? 'text-gray-500' : 'text-blue-900'}`}>AM Session</h3>
                <Input 
                    label="Arrival (AM In)" 
                    type="time" 
                    value={amIn} 
                    onChange={e => setAmIn(e.target.value)}
                    disabled={isLocked}
                />
                <Input 
                    label="Departure (AM Out)" 
                    type="time" 
                    value={amOut} 
                    onChange={e => setAmOut(e.target.value)}
                    disabled={isLocked}
                />
                {!isLocked && (
                    <div className="text-right text-sm text-blue-700 font-medium">
                        Hours: {formatMinutesToHours(amMinutes)}
                    </div>
                )}
            </div>

            {/* PM Session */}
            <div className={`space-y-4 p-4 rounded-lg border ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-orange-50 border-orange-100'}`}>
                <h3 className={`font-semibold ${isLocked ? 'text-gray-500' : 'text-orange-900'}`}>PM Session</h3>
                <Input 
                    label="Arrival (PM In)" 
                    type="time" 
                    value={pmIn} 
                    onChange={e => setPmIn(e.target.value)}
                    disabled={isLocked}
                />
                <Input 
                    label="Departure (PM Out)" 
                    type="time" 
                    value={pmOut} 
                    onChange={e => setPmOut(e.target.value)}
                    disabled={isLocked}
                />
                 {!isLocked && (
                    <div className="text-right text-sm text-orange-700 font-medium">
                        Hours: {formatMinutesToHours(pmMinutes)}
                    </div>
                )}
            </div>
            </div>

            {/* Undertime */}
            <div className={`p-4 rounded-lg border mt-6 ${isLocked ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-200'}`}>
            <h3 className={`font-semibold mb-4 ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>Deductions</h3>
            <div className="flex items-center space-x-4">
                <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Undertime (Minutes)</label>
                    <input 
                        type="number" 
                        min="0"
                        value={undertime}
                        onChange={e => setUndertime(parseInt(e.target.value) || 0)}
                        disabled={isLocked}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:bg-gray-100 disabled:text-gray-500"
                    />
                </div>
            </div>
            </div>

            {/* Totals */}
            {!isLocked && (
                <div className="flex items-center justify-between p-4 bg-brand-50 border border-brand-200 rounded-lg mt-6">
                <span className="text-brand-900 font-medium">Total Daily Hours</span>
                <span className="text-2xl font-bold text-brand-700">{formatMinutesToHours(totalNet)}</span>
                </div>
            )}

            <div className="pt-4">
                {isLocked ? (
                   // Hiding save button when locked since there's nothing to edit (Remarks removed)
                   <div className="text-center text-sm text-gray-500 bg-gray-50 p-3 rounded">
                       Record is locked. Contact admin for corrections.
                   </div>
                ) : (
                    <Button type="submit" size="lg" fullWidth>
                        Save Record
                    </Button>
                )}
            </div>
        </div>
      </form>
    </div>
  );
};