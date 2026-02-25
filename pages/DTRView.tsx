import React, { useState } from 'react';
import { User, AttendanceRecord, ADMIN_IN_CHARGE } from '../types';
import { Button } from '../components/Button';
import { Download, FileText, Edit2, X, Check, Merge } from 'lucide-react';
import { generateDTRPdf } from '../services/pdfService';
import { getMonthName, getDaysInMonth, formatMinutesToHours, formatDateForInput } from '../services/utils';
import { Input } from '../components/Input';

interface DTRViewProps {
  user: User;
  attendanceRecords: AttendanceRecord[];
  onSave?: (record: AttendanceRecord) => void;
}

export const DTRView: React.FC<DTRViewProps> = ({ user, attendanceRecords, onSave }) => {
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  
  // Dynamic Year Options: 2023 to Current Year + 1
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2023 + 2 }, (_, i) => 2023 + i);

  // Edit State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{
      amIn: string;
      amOut: string;
      pmIn: string;
      pmOut: string;
      remarks: string;
      isMerged: boolean;
  }>({ amIn: '', amOut: '', pmIn: '', pmOut: '', remarks: '', isMerged: false });

  const monthName = getMonthName(new Date(selectedYear, selectedMonth, 1).toISOString());
  
  const handleDownload = () => {
     generateDTRPdf(user, attendanceRecords, monthName, selectedYear.toString());
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const rows = [];
  let totalMinutesWorked = 0;

  for (let i = 1; i <= daysInMonth; i++) {
     const date = new Date(selectedYear, selectedMonth, i);
     const dateStr = formatDateForInput(date);
     const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
     
     // Find record for this day
     const record = attendanceRecords.find(r => r.date === dateStr);

     // Determine display logic
     let isMerged = record?.isMerged || false;
     let remarks = record?.remarks || '';
     let displayAmIn = record?.amIn || '';
     let displayAmOut = record?.amOut || '';
     let displayPmIn = record?.pmIn || '';
     let displayPmOut = record?.pmOut || '';
     const undertimeMinutes = record?.undertimeMinutes || 0;

     // Accumulate total worked minutes
     totalMinutesWorked += record?.totalDailyMinutes || 0;
     
     // Auto-populate weekends if no specific record exists
     if (!record && (dayOfWeek === 0 || dayOfWeek === 6)) {
         isMerged = true;
         remarks = dayOfWeek === 0 ? 'SUNDAY' : 'SATURDAY';
     }

     rows.push({
         day: i,
         dateStr: dateStr,
         amIn: displayAmIn,
         amOut: displayAmOut,
         pmIn: displayPmIn,
         pmOut: displayPmOut,
         undertimeMinutes: undertimeMinutes,
         total: record?.totalDailyMinutes ? formatMinutesToHours(record.totalDailyMinutes) : '',
         isMerged,
         remarks,
         originalRecord: record
     });
  }

  const totalHours = Math.floor(totalMinutesWorked / 60);
  const totalMinutes = totalMinutesWorked % 60;

  const handleRowClick = (day: number, record?: AttendanceRecord, autoRemarks?: string) => {
      if (!onSave) return;
      setEditingDay(day);
      setEditForm({
          amIn: record?.amIn || '',
          amOut: record?.amOut || '',
          pmIn: record?.pmIn || '',
          pmOut: record?.pmOut || '',
          remarks: record?.remarks || autoRemarks || '',
          isMerged: record?.isMerged !== undefined ? record.isMerged : !!autoRemarks
      });
      setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
      if (!editingDay || !onSave) return;
      
      const dateStr = formatDateForInput(new Date(selectedYear, selectedMonth, editingDay));
      const existingRecord = attendanceRecords.find(r => r.date === dateStr);
      
      const updatedRecord: AttendanceRecord = {
          id: existingRecord?.id || Date.now().toString(),
          userId: user.id,
          date: dateStr,
          // Preserve existing time data, do not allow edits here
          amIn: existingRecord?.amIn || '',
          amOut: existingRecord?.amOut || '',
          pmIn: existingRecord?.pmIn || '',
          pmOut: existingRecord?.pmOut || '',
          undertimeMinutes: existingRecord?.undertimeMinutes || 0, 
          totalDailyMinutes: existingRecord?.totalDailyMinutes || 0,
          isLocked: true,
          isPmDepartureLocked: existingRecord?.isPmDepartureLocked || false,
          remarks: editForm.remarks,
          isMerged: editForm.isMerged
      };

      onSave(updatedRecord);
      setIsEditModalOpen(false);
  };

  const renderDTRTable = () => (
    <div className="bg-white p-6 md:p-8 border border-gray-400 text-black font-serif shadow-lg w-full max-w-[400px] mx-auto box-border transform scale-100 md:scale-110 origin-top">
        {/* Header */}
        <div className="mb-2">
            <p className="text-[10px] italic leading-none">Civil Service Form No. 48</p>
            <div className="text-center mt-2">
                <h1 className="text-lg font-bold leading-tight">DAILY TIME RECORD</h1>
                <p className="text-[10px] my-1">-----o0o-----</p>
            </div>
        </div>

        {/* Name Section */}
        <div className="mb-4 text-center">
            <div className="border-b-2 border-black w-full min-h-[24px] flex items-end justify-center font-bold uppercase text-sm tracking-wide">
                {user.profile.name}
            </div>
            <p className="italic text-[10px] mt-1">(Name)</p>
        </div>

        {/* Month Section */}
        <div className="mb-4 flex items-end text-[11px]">
            <span className="mr-2 whitespace-nowrap">For the month of</span>
            <div className="border-b-2 border-black flex-1 font-bold text-center">
                {monthName} {selectedYear}
            </div>
        </div>

        {/* Office Hours Section */}
        <div className="mb-4 flex flex-row text-[10px] gap-2">
            <div className="italic w-1/2 flex flex-col justify-end pb-1">
                <p>Official hours for</p>
                <p>arrival and departure</p>
            </div>
            <div className="w-1/2 flex flex-col gap-1">
                <div className="flex items-end">
                    <span className="mr-1 whitespace-nowrap">Regular days</span>
                    <div className="border-b border-black flex-1"></div>
                </div>
                <div className="flex items-end">
                    <span className="mr-1 whitespace-nowrap">Saturdays</span>
                    <div className="border-b border-black flex-1"></div>
                </div>
            </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border-2 border-black text-center text-[10px] leading-tight">
            <thead>
                <tr>
                    <th rowSpan={2} className="border border-black p-0.5 w-[10%]">Day</th>
                    <th colSpan={2} className="border border-black p-0.5 w-[35%]">A.M.</th>
                    <th colSpan={2} className="border border-black p-0.5 w-[35%]">P.M.</th>
                    <th colSpan={2} className="border border-black p-0.5 w-[20%]">Undertime</th>
                </tr>
                <tr>
                    <th className="border border-black p-0.5 font-normal">Arrival</th>
                    <th className="border border-black p-0.5 font-normal">Departure</th>
                    <th className="border border-black p-0.5 font-normal">Arrival</th>
                    <th className="border border-black p-0.5 font-normal">Departure</th>
                    <th className="border border-black p-0.5 font-normal">Hours</th>
                    <th className="border border-black p-0.5 font-normal">Minutes</th>
                </tr>
            </thead>
            <tbody>
                {rows.map((row) => (
                    <tr 
                        key={row.day} 
                        className="hover:bg-blue-50 cursor-pointer transition-colors group h-5"
                        onClick={() => handleRowClick(row.day, row.originalRecord, row.remarks)}
                    >
                        <td className="border border-black p-0.5 font-medium relative">
                            {row.day}
                            <Edit2 className="w-3 h-3 text-blue-500 absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100" />
                        </td>
                        {row.isMerged ? (
                            <td colSpan={6} className="border border-black p-0.5 font-medium text-black bg-white uppercase break-words whitespace-pre-wrap text-[9px] leading-none">
                                {row.remarks}
                            </td>
                        ) : (
                            <>
                                <td className="border border-black p-0.5">{row.amIn}</td>
                                <td className="border border-black p-0.5">{row.amOut}</td>
                                <td className="border border-black p-0.5">{row.pmIn}</td>
                                <td className="border border-black p-0.5">{row.pmOut}</td>
                                <td className="border border-black p-0.5">{row.undertimeMinutes > 0 ? Math.floor(row.undertimeMinutes / 60) : ''}</td>
                                <td className="border border-black p-0.5">{row.undertimeMinutes > 0 ? (row.undertimeMinutes % 60) : ''}</td>
                            </>
                        )}
                    </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                    <td className="border border-black p-1">Total</td>
                    <td className="border border-black p-1" colSpan={4}></td>
                    <td className="border border-black p-1">{totalHours > 0 ? totalHours : ''}</td>
                    <td className="border border-black p-1">{totalMinutes > 0 ? totalMinutes : ''}</td>
                </tr>
            </tbody>
        </table>

        {/* Footer */}
        <div className="mt-4 text-[10px]">
            <p className="text-justify mb-2 italic leading-snug">
                I certify on my honor that the above is a true and correct report of the hours of work performed, record of which was made daily at the time of arrival and departure from office.
            </p>
            
            <div className="mb-4 text-center mt-6">
                <div className="border-b border-black inline-block min-w-[200px] font-bold uppercase text-sm px-2">
                    {user.profile.name}
                </div>
            </div>
            
            <p className="mb-8 italic text-center">VERIFIED as to the prescribed office hours:</p>

            <div className="text-center">
                <div className="border-b-2 border-black inline-block min-w-[220px] font-bold uppercase text-sm px-2">
                    {ADMIN_IN_CHARGE}
                </div>
                <p className="italic mt-1">In Charge</p>
            </div>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div>
                <h2 className="text-xl font-bold text-gray-800">Daily Time Record</h2>
                <p className="text-sm text-gray-500">View and print your attendance record</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="flex gap-2">
                    <select 
                        className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    >
                        {Array.from({ length: 12 }, (_, i) => (
                            <option key={i} value={i}>{getMonthName(new Date(2022, i, 1).toISOString())}</option>
                        ))}
                    </select>
                    <select 
                        className="rounded-lg border border-gray-300 bg-white text-gray-900 px-3 py-2 text-sm focus:ring-brand-500 focus:border-brand-500"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {years.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
                <Button onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" /> Download PDF
                </Button>
            </div>
        </div>

        <div className="flex justify-center overflow-x-auto bg-gray-50/50 p-4 rounded-xl border border-dashed border-gray-300 min-h-[600px]">
            {renderDTRTable()}
        </div>

        {/* Edit Remarks Modal */}
        {isEditModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
                <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
                    <div className="flex justify-between items-center mb-4 border-b pb-2">
                        <h3 className="text-lg font-bold text-gray-900">
                            Edit Day {editingDay}
                        </h3>
                        <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex items-center space-x-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                            <input 
                                type="checkbox" 
                                id="mergeCheck"
                                className="w-5 h-5 text-brand-600 rounded focus:ring-brand-500"
                                checked={editForm.isMerged}
                                onChange={(e) => setEditForm({...editForm, isMerged: e.target.checked})}
                            />
                            <label htmlFor="mergeCheck" className="text-sm font-medium text-brand-900 cursor-pointer select-none">
                                Merge Columns (Display Remarks Only)
                            </label>
                        </div>

                        <div className="space-y-1">
                            <label className="block text-sm font-medium text-gray-700">Remarks</label>
                            <Input 
                                type="text" 
                                placeholder="e.g. Holiday, Leave, Special Order"
                                value={editForm.remarks}
                                onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                            />
                             <p className="text-xs text-gray-500">
                                 {editForm.isMerged ? "This text will span across the time columns." : "This text is stored but time columns remain visible."}
                             </p>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button fullWidth onClick={handleSaveEdit}>Save Changes</Button>
                            <Button fullWidth variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};