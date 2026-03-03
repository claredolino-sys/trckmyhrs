import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Layout } from './components/Layout';
// Student Pages
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentProfile } from './pages/StudentProfile';
import { StudentActivityLog } from './pages/StudentActivityLog';
// Employee Pages
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { EmployeeProfile } from './pages/EmployeeProfile';
import { AdminEmployees } from './pages/AdminEmployees';
// Shared Pages
import { RealTimeAttendance } from './pages/RealTimeAttendance';
import { DTRView } from './pages/DTRView';
// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminProfile } from './pages/AdminProfile';
import { AdminStudents } from './pages/AdminStudents';
import { AdminAttendance } from './pages/AdminAttendance';
import { AdminReports } from './pages/AdminReports';
import { AdminActivityLog } from './pages/AdminActivityLog';
import { AdminStudentLogs } from './pages/AdminStudentLogs';
import { AdminNotifications } from './pages/AdminNotifications';
import { NetworkGuard } from './components/NetworkGuard';
import { QRScanner } from './components/QRScanner';
import { FaceLiveness } from './components/FaceLiveness';

import { User, UserRole, AttendanceRecord, ActivityLog, UserProfile, ADMIN_IN_CHARGE } from './types';
import { formatDateForInput } from './services/utils';
import { useActivity } from './contexts/ActivityContext';
import { api } from './services/api';

import { AdminAttendanceInput } from './pages/AdminAttendanceInput';

const App: React.FC = () => {
  const { logs: activityLogs, logActivity, refreshLogs } = useActivity();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | undefined>(undefined);
  
  // QR & Biometric State
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  const [showFaceLiveness, setShowFaceLiveness] = useState(false);
  const [showNetworkCheck, setShowNetworkCheck] = useState(false);
  const [pendingVerificationUser, setPendingVerificationUser] = useState<User | null>(null);
  
  // Data State (Fetched from API)
  const [students, setStudents] = useState<User[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [admins, setAdmins] = useState<User[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);

  // Initial Load
  useEffect(() => {
      const initialize = async () => {
          await api.init();
          await refreshData();
      };
      initialize();
  }, []);

  const refreshData = async () => {
      const [s, e, a, ar] = await Promise.all([
          api.students.getAll(),
          api.employees.getAll(),
          api.admins.getAll(),
          api.attendance.getAll()
      ]);
      setStudents(s);
      setEmployees(e);
      setAdmins(a);
      setAttendanceRecords(ar);
      await refreshLogs();
  };

  // Sync current user if their profile is updated in the background
  useEffect(() => {
      if (currentUser) {
          let list: User[] = [];
          if (currentUser.role === UserRole.STUDENT) list = students;
          else if (currentUser.role === UserRole.EMPLOYEE) list = employees;
          else list = admins;

          const updatedUser = list.find(u => u.id === currentUser.id);
          // Only update if actual data changed to avoid loops
          if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
              setCurrentUser(updatedUser);
          }
      }
  }, [students, employees, admins]);


  const handleLogin = async (role: UserRole, username: string, password: string) => {
      const user = await api.auth.login(role, username, password);
      if (user) {
          if (user.role === UserRole.ADMIN) {
              // Admin login - no network restrictions
              localStorage.setItem('verified_network', 'Admin Connection');
              completeLogin(user, 'Admin logged in');
          } else {
              // Check for profile picture for biometric verification
              if (!user.profile.profilePicture) {
                  alert("Biometric verification failed: No profile picture found. Please contact Admin to upload a profile photo.");
                  return;
              }
              setPendingVerificationUser(user);
              // Start with Network Check
              setShowNetworkCheck(true);
          }
      } else {
          alert("Invalid credentials.");
      }
  };

  const handleNetworkSuccess = () => {
      setShowNetworkCheck(false);
      // After network check, proceed to Face Liveness
      setShowFaceLiveness(true);
  };

  const completeLogin = async (user: User, activityMessage: string) => {
      // Direct login logic
      const redirectPath = user.role === UserRole.STUDENT ? '/student/realtime' : 
                           user.role === UserRole.EMPLOYEE ? '/employee/realtime' : 
                           '/admin/dashboard';
      
      if (user.role !== UserRole.ADMIN) {
          window.location.hash = redirectPath;
      }
      
      // Set user immediately to show dashboard
      setCurrentUser(user);
      
      // Refresh data in background
      await refreshData();

      // Location logic
      let location: { lat: number; lng: number } | undefined = undefined;
      if (user.role !== UserRole.ADMIN) {
          try {
              const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                  navigator.geolocation.getCurrentPosition(resolve, reject, { 
                      enableHighAccuracy: true,
                      maximumAge: 0,
                      timeout: 10000
                  });
              });
              location = { lat: pos.coords.latitude, lng: pos.coords.longitude };
              setCurrentLocation(location);
          } catch (err) {
              console.error("Location access denied or failed:", err);
              // alert("Location access is required for attendance logging. Please enable it."); 
          }
      }

      const network = localStorage.getItem('verified_network') || 'Unknown';
      logActivity(user.id, activityMessage, location, network);
  };

  const handleRegister = async (role: UserRole, profile: UserProfile) => {
      const newUser: User = {
          id: Date.now().toString(),
          role: role,
          profile: { ...profile, completedHours: 0 }
      };
      
      const success = await api.auth.register(newUser);
      if (success) {
          logActivity(newUser.id, `New ${role} registered: ${profile.name}`, currentLocation);
          await refreshData();
          alert(`${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully! You can now log in.`);
      } else {
          alert("Username already exists.");
      }
  };

  const handleResetPassword = (role: UserRole, username: string, newPassword?: string, recoveryCode?: string) => {
      // Admin recovery code check
      if (role === UserRole.ADMIN && recoveryCode !== 'admin123') {
           return { success: false, message: "Invalid Recovery Code." };
      }

      // For Students/Employees, they might need a recovery code too if we want to allow them to reset without admin
      // But let's keep it simple: Admin uses recovery code, others can reset if they know their username (for this demo)
      
      api.auth.resetPassword(role, username, newPassword).then(res => {
          if (res.success) refreshData();
      });

      return { success: true, message: "Password reset request processed." };
  };

  const handleLogout = () => {
    if (currentUser) {
        logActivity(currentUser.id, 'Logged out', currentLocation);
    }
    setCurrentUser(null);
    setCurrentLocation(undefined);
  };

  const handleQRScan = async (token: string) => {
      setIsQRScannerOpen(false);
      const user = await api.auth.loginWithQR(token);
      if (user) {
          if (user.role === UserRole.ADMIN) {
              alert("QR Login is not available for Administrators.");
              return;
          }

          // Check if user has a profile picture for biometric verification
          if (!user.profile.profilePicture) {
              alert("Biometric verification failed: No profile picture found. Please contact Admin to upload a profile photo.");
              return;
          }

          setPendingVerificationUser(user);
          setShowNetworkCheck(true);
      } else {
          alert("Invalid QR Code.");
      }
  };

  const handleFaceSuccess = async () => {
      if (!pendingVerificationUser) return;

      const user = pendingVerificationUser;
      // Don't close modal here to prevent flashing back to login
      // setShowFaceLiveness(false); 
      // setPendingVerificationUser(null);

      completeLogin(user, `${user.role} logged in via Biometrics`);
  };


  // --- CRUD Handlers (Now using API) ---

  const handleUpdateProfile = async (updatedUser: User) => {
      if (updatedUser.role === UserRole.STUDENT) await api.students.update(updatedUser);
      else if (updatedUser.role === UserRole.EMPLOYEE) await api.employees.update(updatedUser);
      
      logActivity(updatedUser.id, 'Updated profile', currentLocation);
      await refreshData();
  };

  const handleSaveAttendance = async (record: AttendanceRecord, location?: { lat: number; lng: number }) => {
      // The API now handles hours recalculation automatically!
      const isUpdate = attendanceRecords.some(r => r.id === record.id);
      await api.attendance.save(record);
      
      logActivity(record.userId, `${isUpdate ? 'Updated' : 'Submitted'} attendance for ${record.date}`, location || currentLocation);
      await refreshData(); // Fetch updated records and updated user hours
  };

  const handleUpdateAdminProfile = async (updatedAdmin: User) => {
      await api.admins.update(updatedAdmin);
      logActivity(updatedAdmin.id, 'Updated admin profile');
      await refreshData();
  };

  // Admin Actions - Students
  const handleAddStudent = async (newStudent: User) => {
      await api.students.add(newStudent);
      logActivity(currentUser?.id || 'admin', `Registered student: ${newStudent.profile.name}`);
      await refreshData();
  };

  const handleEditStudent = async (updatedStudent: User) => {
      await api.students.update(updatedStudent);
      logActivity(currentUser?.id || 'admin', `Updated student: ${updatedStudent.profile.name}`);
      await refreshData();
  };

  const handleDeleteStudent = async (studentId: string) => {
      const s = students.find(s => s.id === studentId);
      await api.students.delete(studentId);
      logActivity(currentUser?.id || 'admin', `Deleted student: ${s?.profile.name}`);
      await refreshData();
  };

  // Admin Actions - Employees
  const handleAddEmployee = async (newEmployee: User) => {
      await api.employees.add(newEmployee);
      logActivity(currentUser?.id || 'admin', `Registered employee: ${newEmployee.profile.name}`);
      await refreshData();
  };

  const handleEditEmployee = async (updatedEmployee: User) => {
      await api.employees.update(updatedEmployee);
      logActivity(currentUser?.id || 'admin', `Updated employee: ${updatedEmployee.profile.name}`);
      await refreshData();
  };

  const handleDeleteEmployee = async (employeeId: string) => {
      const e = employees.find(e => e.id === employeeId);
      await api.employees.delete(employeeId);
      logActivity(currentUser?.id || 'admin', `Deleted employee: ${e?.profile.name}`);
      await refreshData();
  };

  if (!currentUser) {
    return (
        <>
            <Login 
                onLogin={handleLogin} 
                onRegister={handleRegister} 
                onResetPassword={handleResetPassword} 
                onScanQR={() => setIsQRScannerOpen(true)}
            />
            {isQRScannerOpen && (
                <QRScanner 
                    onScan={handleQRScan} 
                    onClose={() => setIsQRScannerOpen(false)} 
                />
            )}
            {showNetworkCheck && pendingVerificationUser && (
                <div className="fixed inset-0 z-[100] bg-white">
                    <NetworkGuard 
                        userRole={pendingVerificationUser.role}
                        onSuccess={handleNetworkSuccess}
                        onCancel={() => { setShowNetworkCheck(false); setPendingVerificationUser(null); }}
                    />
                </div>
            )}
            {showFaceLiveness && pendingVerificationUser && pendingVerificationUser.profile.profilePicture && (
                <FaceLiveness 
                    storedProfilePicture={pendingVerificationUser.profile.profilePicture}
                    onSuccess={handleFaceSuccess}
                    onCancel={() => { setShowFaceLiveness(false); setPendingVerificationUser(null); }}
                />
            )}
        </>
    );
  }

  const todayStr = formatDateForInput(new Date());
  const todayRecord = attendanceRecords.find(r => r.date === todayStr && r.userId === currentUser.id);

  return (
    <NetworkGuard userRole={currentUser.role}>
      <Router>
        <Layout user={currentUser} onLogout={handleLogout}>
          <Routes>
              {/* Student Routes */}
              {currentUser.role === UserRole.STUDENT && (
                  <>
                      <Route path="/student/dashboard" element={<StudentDashboard user={currentUser} attendance={attendanceRecords.filter(r => r.userId === currentUser.id)} />} />
                      <Route path="/student/realtime" element={<RealTimeAttendance user={currentUser} onSave={handleSaveAttendance} existingRecord={todayRecord} />} />
                      <Route path="/student/profile" element={<StudentProfile user={currentUser} onUpdate={handleUpdateProfile} />} />
                      {/* Attendance Input removed for students */}
                      <Route path="/student/dtr" element={<DTRView user={currentUser} attendanceRecords={attendanceRecords.filter(r => r.userId === currentUser.id)} onSave={handleSaveAttendance} />} />
                      <Route path="/student/activity" element={<StudentActivityLog logs={activityLogs.filter(l => l.userId === currentUser.id)} />} />
                      <Route path="*" element={<Navigate to="/student/dashboard" replace />} />
                  </>
              )}

              {/* Employee Routes */}
              {currentUser.role === UserRole.EMPLOYEE && (
                  <>
                      <Route path="/employee/dashboard" element={<EmployeeDashboard user={currentUser} attendance={attendanceRecords.filter(r => r.userId === currentUser.id)} />} />
                      <Route path="/employee/realtime" element={<RealTimeAttendance user={currentUser} onSave={handleSaveAttendance} existingRecord={todayRecord} />} />
                      <Route path="/employee/profile" element={<EmployeeProfile user={currentUser} onUpdate={handleUpdateProfile} />} />
                      {/* Attendance Input removed for employees */}
                      <Route path="/employee/dtr" element={<DTRView user={currentUser} attendanceRecords={attendanceRecords.filter(r => r.userId === currentUser.id)} onSave={handleSaveAttendance} />} />
                      <Route path="/employee/activity" element={<StudentActivityLog logs={activityLogs.filter(l => l.userId === currentUser.id)} />} />
                      <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
                  </>
              )}

              {/* Admin Routes */}
              {currentUser.role === UserRole.ADMIN && (
                  <>
                      <Route path="/admin/dashboard" element={
                          <AdminDashboard 
                              students={students} 
                              employees={employees}
                              attendance={attendanceRecords} 
                              activityLogs={activityLogs} 
                          />
                      } />
                      <Route path="/admin/notifications" element={<AdminNotifications />} />
                      <Route path="/admin/profile" element={
                          <AdminProfile 
                              user={currentUser} 
                              onUpdate={handleUpdateAdminProfile} 
                          />
                      } />
                      <Route path="/admin/students" element={
                          <AdminStudents 
                              students={students}
                              attendance={attendanceRecords}
                              onAdd={handleAddStudent} 
                              onEdit={handleEditStudent} 
                              onDelete={handleDeleteStudent} 
                          />
                      } />
                      <Route path="/admin/employees" element={
                          <AdminEmployees 
                              employees={employees}
                              attendance={attendanceRecords}
                              onAdd={handleAddEmployee}
                              onEdit={handleEditEmployee}
                              onDelete={handleDeleteEmployee}
                          />
                      } />
                      <Route path="/admin/attendance" element={
                          <AdminAttendance 
                              students={[...students, ...employees]} 
                              attendance={attendanceRecords} 
                              onSave={handleSaveAttendance}
                              />
                      } />
                      <Route path="/admin/attendance-input" element={
                          <AdminAttendanceInput 
                              students={students} 
                              employees={employees}
                              attendanceRecords={attendanceRecords} 
                              onSave={handleSaveAttendance} 
                          />
                      } />
                      <Route path="/admin/reports" element={
                          <AdminReports 
                              students={[...students, ...employees]} 
                              attendance={attendanceRecords} 
                          />
                      } />
                      <Route path="/admin/activity" element={
                          <AdminActivityLog 
                              logs={activityLogs} 
                              students={[...students, ...employees]} 
                          />
                      } />
                      <Route path="/admin/student-logs" element={
                          <AdminStudentLogs 
                              logs={activityLogs} 
                              students={students}
                              employees={employees}
                          />
                      } />
                      <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </>
              )}
          </Routes>
        </Layout>
      </Router>
    </NetworkGuard>
  );
};

export default App;