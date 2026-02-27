import React, { useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { UserRole, UserProfile } from '../types';
import { Clock, X, AlertCircle, CheckCircle2, QrCode } from 'lucide-react';

interface LoginProps {
  onLogin: (role: UserRole, username: string, password: string, network?: string) => void;
  onRegister: (role: UserRole, profile: UserProfile) => void;
  onResetPassword: (role: UserRole, username: string, newPassword?: string, recoveryCode?: string) => { success: boolean; message: string };
  onScanQR: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onResetPassword, onScanQR }) => {
  const [activeTab, setActiveTab] = useState<UserRole>(UserRole.STUDENT);
  const [isRegistering, setIsRegistering] = useState(false);

  // Login Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  // Forgot Password Modal State
  const [showForgot, setShowForgot] = useState(false);
  const [forgotRole, setForgotRole] = useState<UserRole>(UserRole.STUDENT);
  const [forgotUsername, setForgotUsername] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [resetMessage, setResetMessage] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  const handleTabChange = (role: UserRole) => {
    setActiveTab(role);
    setForgotRole(role); // Sync forgot password role
    setIsRegistering(false); 
    setName('');
    setUsername('');
    setPassword('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;

    if (isRegistering) {
        if (!name) return;
        onRegister(activeTab, {
            name,
            username,
            password,
            completedHours: 0
        });
        setIsRegistering(false);
        setName('');
        setUsername('');
        setPassword('');
    } else {
        onLogin(activeTab, username, password);
    }
  };

  const handleResetSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const result = onResetPassword(forgotRole, forgotUsername, newPassword, recoveryCode);
      setResetMessage({ text: result.message, type: result.success ? 'success' : 'error' });
      
      if (result.success && forgotRole === UserRole.ADMIN) {
          setTimeout(() => {
              setShowForgot(false);
              setResetMessage({ text: '', type: '' });
              setForgotUsername('');
              setRecoveryCode('');
              setNewPassword('');
          }, 2000);
      }
  };

  return (
    <div className="min-h-screen bg-brand-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-xl overflow-hidden relative">
        <div className="bg-brand-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center">
               <Clock className="h-10 w-10 text-brand-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">TrackMyHours</h1>
          <p className="text-brand-100">Daily Time Record Monitoring System</p>
        </div>
        
        <div className="p-8">
            <div className="flex border-b border-gray-200 mb-6">
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === UserRole.STUDENT ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => handleTabChange(UserRole.STUDENT)}
                >
                    Student
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === UserRole.EMPLOYEE ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => handleTabChange(UserRole.EMPLOYEE)}
                >
                    Employee
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === UserRole.ADMIN ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    onClick={() => handleTabChange(UserRole.ADMIN)}
                >
                    Admin
                </button>
            </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                {isRegistering && (
                    <h2 className="text-xl font-semibold text-gray-800 text-center">
                        Create {activeTab} Account
                    </h2>
                )}
                
                {isRegistering && (
                     <Input 
                        label="Full Name"
                        type="text"
                        placeholder="Ex. Juan Dela Cruz"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                )}

                <Input 
                  label="Username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                
                <Input 
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
            </div>
            
            {!isRegistering && (
                <div className="flex items-center justify-between text-sm">
                <label className="flex items-center">
                    <input type="checkbox" className="mr-2 rounded text-brand-600 focus:ring-brand-500" />
                    <span className="text-gray-600">Remember me</span>
                </label>
                <button 
                    type="button" 
                    onClick={() => { setShowForgot(true); setForgotRole(activeTab); setResetMessage({text: '', type: ''}); }} 
                    className="text-brand-600 hover:underline"
                >
                    Forgot password?
                </button>
                </div>
            )}

            <Button fullWidth size="lg">
                {isRegistering ? `Register as ${activeTab}` : 'Sign In'}
            </Button>

            {!isRegistering && (activeTab === UserRole.STUDENT || activeTab === UserRole.EMPLOYEE) && (
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-gray-500 font-bold tracking-widest">Or login with</span>
                    </div>
                </div>
            )}

            {!isRegistering && (activeTab === UserRole.STUDENT || activeTab === UserRole.EMPLOYEE) && (
                <Button 
                    type="button" 
                    fullWidth 
                    variant="secondary" 
                    size="lg" 
                    onClick={onScanQR}
                    className="border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white"
                >
                    <QrCode className="w-5 h-5 mr-2" />
                    Scan QR Code
                </Button>
            )}
            
            <div className="text-center mt-4">
                {/* Registration removed as per request. Only Admin can create accounts. */}
            </div>
          </form>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in relative">
                  <button 
                      onClick={() => setShowForgot(false)} 
                      className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                  >
                      <X size={20} />
                  </button>
                  
                  <div className="mb-6 text-center">
                      <h3 className="text-xl font-bold text-gray-900">Reset Password</h3>
                      <p className="text-sm text-gray-500 mt-1">
                          Recover access to your account
                      </p>
                  </div>

                  <div className="flex bg-gray-100 rounded-lg p-1 mb-4">
                      <button 
                          type="button"
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${forgotRole === UserRole.STUDENT ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                          onClick={() => { setForgotRole(UserRole.STUDENT); setResetMessage({text: '', type: ''}); }}
                      >
                          Student
                      </button>
                      <button 
                          type="button"
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${forgotRole === UserRole.EMPLOYEE ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                          onClick={() => { setForgotRole(UserRole.EMPLOYEE); setResetMessage({text: '', type: ''}); }}
                      >
                          Employee
                      </button>
                      <button 
                          type="button"
                          className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${forgotRole === UserRole.ADMIN ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900'}`}
                          onClick={() => { setForgotRole(UserRole.ADMIN); setResetMessage({text: '', type: ''}); }}
                      >
                          Admin
                      </button>
                  </div>

                  <form onSubmit={handleResetSubmit} className="space-y-4">
                      <Input 
                          label="Username" 
                          value={forgotUsername} 
                          onChange={(e) => setForgotUsername(e.target.value)} 
                          required 
                          placeholder="Enter username"
                      />

                      <Input 
                          label="Recovery Code" 
                          type="password"
                          value={recoveryCode} 
                          onChange={(e) => setRecoveryCode(e.target.value)} 
                          required={forgotRole === UserRole.ADMIN}
                          placeholder={forgotRole === UserRole.ADMIN ? "Code (Try: admin123)" : "Optional for students/employees"}
                      />
                      <Input 
                          label="New Password" 
                          type="password" 
                          value={newPassword} 
                          onChange={(e) => setNewPassword(e.target.value)} 
                          required 
                          placeholder="New password"
                      />

                      {resetMessage.text && (
                          <div className={`p-3 rounded-lg flex items-start text-sm ${resetMessage.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                              {resetMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />}
                              <span>{resetMessage.text}</span>
                          </div>
                      )}

                      <Button fullWidth type="submit">
                          {forgotRole === UserRole.ADMIN ? 'Reset Password' : 'Find Account'}
                      </Button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};