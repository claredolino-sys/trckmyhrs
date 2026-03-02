import React, { useState } from 'react';
import { User, UserRole, AttendanceRecord } from '../types';
import { AttendanceInput } from './AttendanceInput';
import { Users, Briefcase, Search } from 'lucide-react';

interface AdminAttendanceInputProps {
  students: User[];
  employees: User[];
  attendanceRecords: AttendanceRecord[];
  onSave: (record: AttendanceRecord) => void;
}

export const AdminAttendanceInput: React.FC<AdminAttendanceInputProps> = ({ 
  students, 
  employees, 
  attendanceRecords, 
  onSave 
}) => {
  const [userType, setUserType] = useState<UserRole>(UserRole.STUDENT);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const users = userType === UserRole.STUDENT ? students : employees;
  
  const filteredUsers = users.filter(u => 
    u.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.profile.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedUser = users.find(u => u.id === selectedUserId);

  // Filter attendance records for the selected user
  const userAttendance = attendanceRecords.filter(r => r.userId === selectedUserId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Input Past Attendance</h2>
        
        {/* User Type Toggle */}
        <div className="bg-white border border-gray-200 p-1 rounded-lg flex items-center shadow-sm w-full md:w-auto">
             <button 
                 onClick={() => { setUserType(UserRole.STUDENT); setSelectedUserId(''); }}
                 className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${userType === UserRole.STUDENT ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 <Users className="w-4 h-4 mr-2" />
                 Students
             </button>
             <button 
                 onClick={() => { setUserType(UserRole.EMPLOYEE); setSelectedUserId(''); }}
                 className={`flex-1 md:flex-none flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${userType === UserRole.EMPLOYEE ? 'bg-brand-50 text-brand-700' : 'text-gray-500 hover:text-gray-700'}`}
             >
                 <Briefcase className="w-4 h-4 mr-2" />
                 Employees
             </button>
         </div>
      </div>

      {/* User Selection */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <label className="block text-sm font-medium text-gray-700 mb-2">
            Select {userType === UserRole.STUDENT ? 'Student' : 'Employee'}
        </label>
        
        <div className="relative mb-4">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
                type="text"
                className="pl-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:ring-brand-500 focus:border-brand-500"
                placeholder="Search by name or username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {filteredUsers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-1">
                {filteredUsers.map(user => (
                    <button
                        key={user.id}
                        onClick={() => setSelectedUserId(user.id)}
                        className={`flex items-center p-3 rounded-lg border text-left transition-all ${
                            selectedUserId === user.id 
                            ? 'border-brand-500 bg-brand-50 ring-1 ring-brand-500' 
                            : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                        }`}
                    >
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold mr-3 flex-shrink-0">
                            {user.profile.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className={`text-sm font-medium truncate ${selectedUserId === user.id ? 'text-brand-900' : 'text-gray-900'}`}>
                                {user.profile.name}
                            </p>
                            <p className="text-xs text-gray-500 truncate">@{user.profile.username}</p>
                        </div>
                    </button>
                ))}
            </div>
        ) : (
            <div className="text-center py-8 text-gray-500">
                No users found matching "{searchTerm}"
            </div>
        )}
      </div>

      {/* Attendance Input Form */}
      {selectedUser ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold mr-4 text-lg">
                      {selectedUser.profile.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                      <h3 className="font-bold text-blue-900">Logging for: {selectedUser.profile.name}</h3>
                      <p className="text-sm text-blue-700">
                          {userType === UserRole.STUDENT 
                              ? `${selectedUser.profile.program || 'No Program'} • ${selectedUser.profile.yearLevel || ''}` 
                              : `${selectedUser.profile.position || 'No Position'} • ${selectedUser.profile.department || ''}`
                          }
                      </p>
                  </div>
              </div>
              
              <AttendanceInput 
                  user={selectedUser} 
                  attendanceRecords={userAttendance} 
                  onSave={onSave} 
                  isAdmin={true}
              />
          </div>
      ) : (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400">
              Select a user above to start logging attendance.
          </div>
      )}
    </div>
  );
};
