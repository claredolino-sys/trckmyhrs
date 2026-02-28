import React, { useState, useEffect } from 'react';
import { AppNotification, AttendanceRecord, UserRole } from '../types';
import { api } from '../services/api';
import { Bell, Check, Trash2, MapPin, Clock, User as UserIcon, ShieldAlert, Navigation } from 'lucide-react';
import { formatTime12Hour, calculateDistance } from '../services/utils';
import { OFFICE_LOCATION } from '../constants';

export const AdminNotifications: React.FC = () => {
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [loading, setLoading] = useState(true);
    const [adminLocation, setAdminLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [isAdminOutside, setIsAdminOutside] = useState(false);

    useEffect(() => {
        fetchNotifications();
        
        // Admin's own location tracking
        if (navigator.geolocation) {
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setAdminLocation({ lat: latitude, lng: longitude });
                    const distance = calculateDistance(
                        latitude,
                        longitude,
                        OFFICE_LOCATION.lat,
                        OFFICE_LOCATION.lng
                    );
                    setIsAdminOutside(distance > OFFICE_LOCATION.radius);
                },
                (error) => console.error("Admin location error:", error),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    const fetchNotifications = async () => {
        setLoading(true);
        const data = await api.notifications.getAll();
        setNotifications(data);
        setLoading(false);
    };

    const handleMarkAsRead = async (id: string) => {
        await api.notifications.markAsRead(id);
        setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
    };

    const handleDelete = async (id: string) => {
        await api.notifications.delete(id);
        setNotifications(notifications.filter(n => n.id !== id));
    };

    const handleStopPmDeparture = async (notification: AppNotification) => {
        if (!notification.attendanceRecordId) {
            alert("No attendance record associated with this notification.");
            return;
        }

        const records = await api.attendance.getAll();
        const record = records.find(r => r.id === notification.attendanceRecordId);

        if (record) {
            const updatedRecord: AttendanceRecord = {
                ...record,
                isPmDepartureLocked: true
            };
            await api.attendance.save(updatedRecord);
            alert(`PM Departure has been stopped for ${notification.userName}.`);
            
            // Optionally mark as read after action
            handleMarkAsRead(notification.id);
        } else {
            alert("Attendance record not found.");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                    <Bell className="w-6 h-6 mr-2 text-brand-600" />
                    Admin Notifications
                </h2>
                <div className="flex items-center space-x-4">
                    {adminLocation && (
                        <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            isAdminOutside ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                            <Navigation className="w-3 h-3 mr-1" />
                            {isAdminOutside ? 'Outside Office' : 'At Office'}
                        </div>
                    )}
                    <span className="bg-brand-100 text-brand-700 px-3 py-1 rounded-full text-sm font-medium">
                        {notifications.filter(n => !n.isRead).length} Unread
                    </span>
                </div>
            </div>

            {notifications.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No notifications yet</h3>
                    <p className="text-gray-500">You'll see alerts here when students or employees leave the office early.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {notifications.map((notification) => (
                        <div 
                            key={notification.id} 
                            className={`bg-white rounded-xl shadow-sm border transition-all ${
                                notification.isRead ? 'border-gray-200 opacity-75' : 'border-brand-200 ring-1 ring-brand-100'
                            }`}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-4">
                                        <div className={`p-2 rounded-lg ${
                                            notification.type === 'EARLY_DEPARTURE' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                        }`}>
                                            <ShieldAlert className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h3 className={`font-bold ${notification.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                                                    Early Departure Alert
                                                </h3>
                                                {!notification.isRead && (
                                                    <span className="w-2 h-2 bg-brand-600 rounded-full"></span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 mt-1">{notification.message}</p>
                                            
                                            <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
                                                <div className="flex items-center">
                                                    <UserIcon className="w-3.5 h-3.5 mr-1" />
                                                    {notification.userName} ({notification.userRole})
                                                </div>
                                                <div className="flex items-center">
                                                    <Clock className="w-3.5 h-3.5 mr-1" />
                                                    {new Date(notification.timestamp).toLocaleString()}
                                                </div>
                                                {notification.location && (
                                                    <div className="flex items-center">
                                                        <a 
                                                            href={`https://www.google.com/maps?q=${notification.location.lat},${notification.location.lng}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center text-brand-600 hover:text-brand-700 hover:underline"
                                                        >
                                                            <MapPin className="w-3.5 h-3.5 mr-1" />
                                                            {notification.location.lat.toFixed(4)}, {notification.location.lng.toFixed(4)}
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        {!notification.isRead && (
                                            <button 
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                title="Mark as read"
                                            >
                                                <Check className="w-5 h-5" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleDelete(notification.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {notification.type === 'EARLY_DEPARTURE' && !notification.isRead && (
                                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
                                        <button 
                                            onClick={() => handleStopPmDeparture(notification)}
                                            className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors shadow-sm flex items-center"
                                        >
                                            <ShieldAlert className="w-4 h-4 mr-2" />
                                            Stop PM Departure
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
