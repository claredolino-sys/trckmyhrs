import React, { useState } from 'react';
import { User, AttendanceRecord, UserRole } from '../types';
import { formatMinutesToHours, formatDateForInput, formatTime12Hour } from '../services/utils';
import { Search, LayoutList, CalendarDays, CheckCircle2, AlertCircle, Users, Briefcase } from 'lucide-react';

interface AdminAttendanceProps {
  students: User[];
  attendance: AttendanceRecord[];
}

export const AdminAttendance: React.FC<AdminAttendanceProps> = ({ students, attendance }) => {
  const [view, setView] = useState<'summary' | 'daily'>('summary');
  const [userType, setUserType] = useState<UserRole>(UserRole.STUDENT);
  const [filterName, setFilterName] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // --- Logic for Daily Logs View ---
  const dailyRows = attendance.map(record => {
      const user = students.find(s => s.id === record.userId);
      return {
          ...record,
          user,
          studentName: user?.profile.name || 'Unknown',
          studentUsername: user?.profile.username || 'Unknown'
      };
  }).filter(row => {
      // Filter by User Type
      if (row.user?.role !== userType) return false;

      const matchName = row.studentName.toLowerCase().includes(filterName.toLowerCase());
      const matchDate = filterDate ? row.date === filterDate : true;
      return matchName && matchDate;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- Logic for Summary View ---
  const getStudentStats = (studentId: string) => {
      const studentRecords = attendance.filter(r => r.userId === studentId);
      const present = studentRecords.length;
      
      if (present === 0) return { present: 0, absent: 0 };

      // Calculate Absent: Weekdays from first log until yesterday that have no record
      const sortedDates = studentRecords
          .map(r => new Date(r.date).getTime())
          .sort((a, b) => a - b);
      
      const startDate = new Date(sortedDates[0]);
      const today = new Date();
      const cutoff = new Date(today);
      cutoff.setHours(0,0,0,0); // Stop at today (exclusive)

      let absent = 0;
      let current = new Date(startDate);
      current.setHours(0,0,0,0);
      
      // Safety break to prevent infinite loops in case of weird dates
      let loopCount = 0;
      while (current < cutoff && loopCount < 1000) {
          const day = current.getDay();
          const isWeekend = day === 0 || day === 6;
          
          if (!isWeekend) {
               const dateStr = formatDateForInput(current);
               // Check if any record exists for this date
               const hasRecord = studentRecords.some(r => r.date === dateStr);
               if (!hasRecord) absent++;
          }
          current.setDate(current.getDate() + 1);
          loopCount++;
      }
      
      return { present, absent };
  };

  const summaryRows = students
    .filter(u => u.role === userType)
    .filter(s => s.profile.name.toLowerCase().includes(filterName.toLowerCase()))
    .map(s => {
      const stats = getStudentStats(s.id);
      return {
          ...s,
          stats
      };
  });

  return (
    <div className="space-y-6">
       <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
           <h2 className="text-2xl font-bold text-gray-800">Manage Attendance</h2>
           
           <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
             {/* User Type Toggle */}
             <div className="bg-white border border-gray-200 p-1 rounded-lg flex items-center shadow-sm w-full sm:w-auto">
                 <button 
                     onClick={() => setUserType(UserRole.STUDENT)}
                     className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${userType === UserRole.STUDENT ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                     <Users className="w-4 h-4 mr-2" />
                     Students
                 </button>
                 <button 
                     onClick={() => setUserType(UserRole.EMPLOYEE)}
                     className={`flex-1 sm:flex-none flex items-center justify-center px-3 py-1.5 rounded-md text-sm font-medium transition-all ${userType === UserRole.EMPLOYEE ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                     <Briefcase className="w-4 h-4 mr-2" />
                     Employees
                 </button>
             </div>

             {/* View Toggle */}
             <div className="bg-gray-100 p-1 rounded-lg flex items-center w-full sm:w-auto">
                 <button 
                     onClick={() => setView('summary')}
                     className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'summary' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                     <LayoutList className="w-4 h-4 mr-2" />
                     Summary
                 </button>
                 <button 
                     onClick={() => setView('daily')}
                     className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${view === 'daily' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                 >
                     <CalendarDays className="w-4 h-4 mr-2" />
                     Logs
                 </button>
             </div>
           </div>
       </div>
       
       {/* Filters */}
       <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4">
           <div className="flex-1 relative">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                   <Search className="h-5 w-5 text-gray-400" />
               </div>
               <input 
                  type="text" 
                  className="pl-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:ring-brand-500 focus:border-brand-500"
                  placeholder={`Filter by ${userType === UserRole.STUDENT ? 'student' : 'employee'} name...`}
                  value={filterName}
                  onChange={e => setFilterName(e.target.value)}
               />
           </div>
           {view === 'daily' && (
               <div>
                   <input 
                      type="date" 
                      className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-brand-500 focus:border-brand-500"
                      value={filterDate}
                      onChange={e => setFilterDate(e.target.value)}
                   />
               </div>
           )}
       </div>

       {/* Content */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {view === 'summary' ? (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">
                        {userType === UserRole.STUDENT ? 'Program' : 'Dept / Position'}
                    </th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500">Days Present</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500">Days Absent</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500">Total Hours</th>
                    <th className="px-6 py-3 text-center font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryRows.map((user) => {
                      const req = user.profile.requiredHours || 0;
                      const completed = user.profile.completedHours;
                      // Completion status logic varies
                      let isComplete = false;
                      let statusText = "In Progress";
                      
                      if (userType === UserRole.STUDENT) {
                          isComplete = req > 0 && completed >= (req * 60);
                          statusText = isComplete ? "Completed" : "In Progress";
                      } else {
                          // Employees usually don't have a "Completion" target in the same way, 
                          // but we can check if they have logged hours recently or generic status
                          statusText = "Active"; 
                          isComplete = true; // Use complete style for active employees
                      }

                      return (
                          <tr key={user.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                  <div className="font-medium text-gray-900">{user.profile.name}</div>
                                  <div className="text-xs text-gray-500">@{user.profile.username}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                  {userType === UserRole.STUDENT 
                                    ? (user.profile.program || '-') 
                                    : (
                                        <div className="flex flex-col">
                                            <span>{user.profile.department || '-'}</span>
                                            <span className="text-xs text-gray-400">{user.profile.position}</span>
                                        </div>
                                    )
                                  }
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    {user.stats.present}
                                  </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.stats.absent > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                                    <AlertCircle className="w-3 h-3 mr-1" />
                                    {user.stats.absent}
                                  </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-brand-700">
                                  {formatMinutesToHours(completed)} 
                                  {userType === UserRole.STUDENT && <span className="text-xs font-normal text-gray-400">/ {req}h</span>}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                  <span className={`text-xs font-bold uppercase tracking-wide ${isComplete ? 'text-green-600' : 'text-blue-600'}`}>
                                      {statusText}
                                  </span>
                              </td>
                          </tr>
                      );
                  })}
                  {summaryRows.length === 0 && (
                      <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No {userType === UserRole.STUDENT ? 'students' : 'employees'} found.</td></tr>
                  )}
                </tbody>
              </table>
          ) : (
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Username</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">AM</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">PM</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Total Hours</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dailyRows.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{row.date}</td>
                          <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{row.studentName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{row.studentUsername}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                              {formatTime12Hour(row.amIn)} - {formatTime12Hour(row.amOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                              {formatTime12Hour(row.pmIn)} - {formatTime12Hour(row.pmOut)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-bold text-brand-700">
                              {formatMinutesToHours(row.totalDailyMinutes)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Submitted</span>
                          </td>
                      </tr>
                  ))}
                  {dailyRows.length === 0 && (
                      <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-500">No records found matching filters.</td></tr>
                  )}
                </tbody>
              </table>
          )}
        </div>
      </div>
    </div>
  );
};