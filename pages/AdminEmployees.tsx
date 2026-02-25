import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { formatMinutesToHours } from '../services/utils';
import { Edit, Trash2, Plus, X, AlertTriangle, QrCode, Camera, Download } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

interface AdminEmployeesProps {
  employees: User[];
  onAdd: (u: User) => void;
  onEdit: (u: User) => void;
  onDelete: (id: string) => void;
}

export const AdminEmployees: React.FC<AdminEmployeesProps> = ({ employees, onAdd, onEdit, onDelete }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Delete Confirmation State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [position, setPosition] = useState('');
  const [department, setDepartment] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(undefined);
  
  // QR Modal State
  const [qrEmployee, setQrEmployee] = useState<User | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  
  const openAddModal = () => {
      setEditingId(null);
      setName('');
      setUsername('');
      setPassword('');
      setPosition('');
      setDepartment('');
      setProfilePicture(undefined);
      setIsModalOpen(true);
  };

  const openEditModal = (employee: User) => {
      setEditingId(employee.id);
      setName(employee.profile.name);
      setUsername(employee.profile.username);
      setPassword(employee.profile.password || '');
      setPosition(employee.profile.position || '');
      setDepartment(employee.profile.department || '');
      setProfilePicture(employee.profile.profilePicture);
      setIsModalOpen(true);
  };

  const openQrModal = (employee: User) => {
      // Ensure user has a QR token
      if (!employee.qrToken) {
          const updatedEmployee = { ...employee, qrToken: `qr_${employee.id}_${Math.random().toString(36).substr(2, 9)}` };
          onEdit(updatedEmployee);
          setQrEmployee(updatedEmployee);
      } else {
          setQrEmployee(employee);
      }
      setIsQrModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const reader = new FileReader();
          reader.onloadend = () => {
              setProfilePicture(reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleDeleteClick = (employee: User) => {
      setEmployeeToDelete(employee);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = () => {
      if (employeeToDelete) {
          onDelete(employeeToDelete.id);
          setIsDeleteModalOpen(false);
          setEmployeeToDelete(null);
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      
      const userData: User = {
          id: editingId || Date.now().toString(),
          role: UserRole.EMPLOYEE,
          profile: {
              name,
              username,
              password,
              position,
              department,
              profilePicture,
              completedHours: editingId ? (employees.find(e => e.id === editingId)?.profile.completedHours || 0) : 0
          },
          qrToken: editingId ? (employees.find(e => e.id === editingId)?.qrToken) : `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };

      if (editingId) {
          onEdit(userData);
      } else {
          onAdd(userData);
      }
      setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 relative max-w-7xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Manage Employees</h2>
        <Button onClick={openAddModal} className="w-full sm:w-auto">
            <Plus size={18} className="mr-2" /> Register Employee
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position / Dept</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hours Logged</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {employees.map((employee) => (
                  <tr key={employee.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold overflow-hidden border border-gray-200">
                            {employee.profile.profilePicture ? (
                                <img src={employee.profile.profilePicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                                employee.profile.name.charAt(0)
                            )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{employee.profile.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="font-medium text-gray-900">{employee.profile.position || '-'}</div>
                        <div className="text-xs text-gray-400">{employee.profile.department}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {employee.profile.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-brand-600">
                       {formatMinutesToHours(employee.profile.completedHours)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button onClick={() => openQrModal(employee)} className="text-gray-600 hover:text-brand-600" title="View QR Code"><QrCode size={18} /></button>
                        <button onClick={() => openEditModal(employee)} className="text-indigo-600 hover:text-indigo-900"><Edit size={18} /></button>
                        <button onClick={() => handleDeleteClick(employee)} className="text-red-600 hover:text-red-900"><Trash2 size={18} /></button>
                    </td>
                  </tr>
              ))}
              {employees.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No employees registered yet. Click "Register Employee" to add one.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal Overlay */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 animate-fade-in max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6 border-b pb-2">
                      <h3 className="text-xl font-bold text-gray-900">{editingId ? 'Edit Employee' : 'Register Employee'}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="flex flex-col items-center mb-4">
                          <div className="relative group">
                              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-brand-500 transition-colors">
                                  {profilePicture ? (
                                      <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                                  ) : (
                                      <Camera size={32} />
                                  )}
                              </div>
                              <label className="absolute bottom-0 right-0 bg-brand-600 text-white p-1.5 rounded-full cursor-pointer shadow-lg hover:bg-brand-700 transition-colors">
                                  <Plus size={16} />
                                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                              </label>
                          </div>
                          <p className="text-[10px] text-gray-500 mt-2 uppercase font-bold tracking-widest">Profile Photo (Required for Biometrics)</p>
                      </div>

                      <Input label="Full Name" value={name} onChange={e => setName(e.target.value)} required />
                      <Input label="Username" type="text" value={username} onChange={e => setUsername(e.target.value)} required placeholder="For login" />
                      <Input 
                        label="Password (4 characters)" 
                        type="text" 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        required 
                        maxLength={4}
                        minLength={4}
                        placeholder="e.g. 1234"
                      />
                      
                      <div className="grid grid-cols-2 gap-4">
                        <Input label="Position" value={position} onChange={e => setPosition(e.target.value)} placeholder="e.g. Staff" />
                        <Input label="Department" value={department} onChange={e => setDepartment(e.target.value)} placeholder="e.g. HR" />
                      </div>

                      <div className="pt-4 flex space-x-3">
                          <Button fullWidth type="submit">{editingId ? 'Save Changes' : 'Register Employee'}</Button>
                          <Button fullWidth variant="secondary" type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* QR Code Modal */}
      {isQrModalOpen && qrEmployee && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 animate-fade-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-brand-600"></div>
                  <button onClick={() => setIsQrModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>
                  
                  <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                          <QrCode className="w-8 h-8 text-brand-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Employee QR Access</h3>
                      <p className="text-sm text-gray-500 mt-1">Scan for secure passwordless login</p>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col items-center shadow-inner">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                        <QRCodeSVG 
                            value={qrEmployee.qrToken || ''} 
                            size={180}
                            level="H"
                            includeMargin={false}
                        />
                      </div>
                      <div className="mt-6 text-center">
                          <p className="text-sm font-bold text-gray-900">{qrEmployee.profile.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mt-1">{qrEmployee.role}</p>
                      </div>
                  </div>

                  <div className="mt-8 space-y-3">
                      <Button fullWidth onClick={() => window.print()} className="bg-slate-900 hover:bg-slate-800">
                          <Download size={18} className="mr-2" /> Print QR Code
                      </Button>
                      <p className="text-[10px] text-center text-gray-400 leading-relaxed px-4">
                          This QR code is unique to this employee. It grants access after face liveness verification.
                      </p>
                  </div>
              </div>
          </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && employeeToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 px-4">
              <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 animate-fade-in">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                          <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900">Delete Employee?</h3>
                      <p className="text-sm text-gray-500 mt-2">
                          Are you sure you want to delete <strong>{employeeToDelete.profile.name}</strong>? This action cannot be undone and will remove all their attendance records.
                      </p>
                  </div>
                  <div className="flex gap-3">
                      <Button fullWidth variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                      <Button fullWidth variant="danger" onClick={confirmDelete}>Delete Employee</Button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};