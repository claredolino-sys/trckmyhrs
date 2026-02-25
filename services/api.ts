import { User, UserRole, AttendanceRecord, ActivityLog, UserProfile, StudentType, AppNotification } from '../types';
import { supabase } from './supabaseClient';

// Storage Keys (for LocalStorage fallback)
const KEYS = {
    STUDENTS: 'students',
    EMPLOYEES: 'employees',
    ADMINS: 'admins',
    ATTENDANCE: 'attendanceRecords',
    LOGS: 'activityLogs',
    NOTIFICATIONS: 'notifications'
};

// Helper to check if Supabase is active
const isSupabaseActive = () => {
    return !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
};

// --- Low Level Storage Wrappers (LocalStorage) ---
const getLocal = <T>(key: string, defaultVal: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultVal;
    } catch {
        return defaultVal;
    }
};

const setLocal = (key: string, value: any) => {
    localStorage.setItem(key, JSON.stringify(value));
};

// --- Business Logic Helpers ---
const recalculateUserHours = async (userId: string) => {
    let totalMinutes = 0;
    
    if (isSupabaseActive()) {
        const { data } = await supabase
            .from('attendance_records')
            .select('total_daily_minutes')
            .eq('user_id', userId);
        totalMinutes = data?.reduce((acc, curr) => acc + curr.total_daily_minutes, 0) || 0;

        await supabase
            .from('profiles')
            .update({ completed_hours: totalMinutes })
            .eq('id', userId);
    } else {
        const records = getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
        const userRecords = records.filter(r => r.userId === userId);
        totalMinutes = userRecords.reduce((acc, curr) => acc + curr.totalDailyMinutes, 0);

        // Update Student
        const students = getLocal<User[]>(KEYS.STUDENTS, []);
        const studentIndex = students.findIndex(s => s.id === userId);
        if (studentIndex !== -1) {
            students[studentIndex].profile.completedHours = totalMinutes;
            setLocal(KEYS.STUDENTS, students);
            return;
        }

        // Update Employee
        const employees = getLocal<User[]>(KEYS.EMPLOYEES, []);
        const employeeIndex = employees.findIndex(e => e.id === userId);
        if (employeeIndex !== -1) {
            employees[employeeIndex].profile.completedHours = totalMinutes;
            setLocal(KEYS.EMPLOYEES, employees);
            return;
        }

        // Update Admin
        const admins = getLocal<User[]>(KEYS.ADMINS, []);
        const adminIndex = admins.findIndex(a => a.id === userId);
        if (adminIndex !== -1) {
            admins[adminIndex].profile.completedHours = totalMinutes;
            setLocal(KEYS.ADMINS, admins);
            return;
        }
    }
};

// Map Supabase profile to User object
const mapProfileToUser = (p: any): User => ({
    id: p.id,
    role: p.role as UserRole,
    profile: {
        name: p.name,
        username: p.username,
        password: p.password,
        school: p.school,
        schoolAddress: p.school_address,
        program: p.program,
        studentType: p.student_type as StudentType,
        position: p.position,
        department: p.department,
        requiredHours: p.required_hours,
        completedHours: p.completed_hours,
        profilePicture: p.profile_picture
    },
    qrToken: p.qr_token
});

// Map User object to Supabase profile
const mapUserToProfile = (u: User) => ({
    id: u.id,
    role: u.role,
    name: u.profile.name,
    username: u.profile.username,
    password: u.profile.password,
    school: u.profile.school,
    school_address: u.profile.schoolAddress,
    program: u.profile.program,
    student_type: u.profile.studentType,
    position: u.profile.position,
    department: u.profile.department,
    required_hours: u.profile.requiredHours,
    completed_hours: u.profile.completedHours,
    profile_picture: u.profile.profilePicture,
    qr_token: u.qrToken
});

export const api = {
    init: async () => {
        if (isSupabaseActive()) {
            console.log('TrackMyHours: Using Supabase backend');
        } else {
            console.log('TrackMyHours: Using LocalStorage backend (Supabase credentials missing)');
        }
    },

    auth: {
        login: async (role: UserRole, username: string, password: string): Promise<User | null> => {
            if (isSupabaseActive()) {
                const { data, error } = await supabase
                    .rpc('authenticate_user', {
                        p_role: role,
                        p_username: username,
                        p_password: password
                    })
                    .maybeSingle();
                
                if (error) {
                    console.error('Login error:', error);
                    return null;
                }
                if (!data) return null;
                return mapProfileToUser(data);
            } else {
                let users: User[] = [];
                if (role === UserRole.ADMIN) users = getLocal(KEYS.ADMINS, []);
                else if (role === UserRole.STUDENT) users = getLocal(KEYS.STUDENTS, []);
                else if (role === UserRole.EMPLOYEE) users = getLocal(KEYS.EMPLOYEES, []);

                const user = users.find(u => u.profile.username === username && u.profile.password === password);
                return user || null;
            }
        },
        loginWithQR: async (token: string): Promise<User | null> => {
            if (isSupabaseActive()) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('qr_token', token)
                    .maybeSingle();
                
                if (error || !data) return null;
                return mapProfileToUser(data);
            } else {
                const allUsers = [
                    ...getLocal<User[]>(KEYS.ADMINS, []),
                    ...getLocal<User[]>(KEYS.STUDENTS, []),
                    ...getLocal<User[]>(KEYS.EMPLOYEES, [])
                ];
                return allUsers.find(u => u.qrToken === token) || null;
            }
        },
        register: async (user: User): Promise<boolean> => {
            if (isSupabaseActive()) {
                // Check uniqueness
                const { data: existing, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('username', user.profile.username)
                    .maybeSingle();
                
                if (checkError) {
                    console.error('Registration check error:', checkError);
                }
                if (existing) return false;

                const { error } = await supabase
                    .from('profiles')
                    .insert([mapUserToProfile(user)]);
                
                if (error) {
                    console.error('Registration insert error:', error);
                    return false;
                }
                return true;
            } else {
                const admins = getLocal<User[]>(KEYS.ADMINS, []);
                const students = getLocal<User[]>(KEYS.STUDENTS, []);
                const employees = getLocal<User[]>(KEYS.EMPLOYEES, []);
                
                const allUsernames = [
                    ...admins.map(a => a.profile.username),
                    ...students.map(s => s.profile.username),
                    ...employees.map(e => e.profile.username)
                ];

                if (allUsernames.includes(user.profile.username)) return false;

                if (user.role === UserRole.ADMIN) {
                    admins.push(user);
                    setLocal(KEYS.ADMINS, admins);
                } else if (user.role === UserRole.STUDENT) {
                    students.push(user);
                    setLocal(KEYS.STUDENTS, students);
                } else if (user.role === UserRole.EMPLOYEE) {
                    employees.push(user);
                    setLocal(KEYS.EMPLOYEES, employees);
                }
                return true;
            }
        },
        resetPassword: async (role: UserRole, username: string, newPassword?: string): Promise<{success: boolean, message: string}> => {
             if (isSupabaseActive()) {
                 const { data: user, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', role)
                    .eq('username', username)
                    .maybeSingle();
                 
                 if (error || !user) return { success: false, message: 'User not found' };
                 
                 if (newPassword) {
                     const { error: updateError } = await supabase
                        .from('profiles')
                        .update({ password: newPassword })
                        .eq('id', user.id);
                     
                     if (updateError) return { success: false, message: 'Failed to update password' };
                     return { success: true, message: 'Password reset successfully' };
                 }
                 return { success: true, message: 'User found' };
             } else {
                let key = '';
                if (role === UserRole.ADMIN) key = KEYS.ADMINS;
                else if (role === UserRole.STUDENT) key = KEYS.STUDENTS;
                else if (role === UserRole.EMPLOYEE) key = KEYS.EMPLOYEES;

                const users = getLocal<User[]>(key, []);
                const idx = users.findIndex(u => u.profile.username === username);
                
                if (idx === -1) return { success: false, message: 'User not found' };
                
                if (newPassword) {
                    users[idx].profile.password = newPassword;
                    setLocal(key, users);
                    return { success: true, message: 'Password reset successfully' };
                }
                
                return { success: true, message: 'User found' };
             }
        }
    },

    students: {
        getAll: async () => { 
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', UserRole.STUDENT);
                return (data || []).map(mapProfileToUser);
            }
            return getLocal<User[]>(KEYS.STUDENTS, []); 
        },
        add: async (user: User) => {
            if (isSupabaseActive()) {
                await supabase.from('profiles').insert([mapUserToProfile(user)]);
            } else {
                const users = getLocal<User[]>(KEYS.STUDENTS, []);
                users.push(user);
                setLocal(KEYS.STUDENTS, users);
            }
            return user;
        },
        update: async (user: User) => {
            if (isSupabaseActive()) {
                await supabase.from('profiles').update(mapUserToProfile(user)).eq('id', user.id);
            } else {
                const users = getLocal<User[]>(KEYS.STUDENTS, []);
                const idx = users.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    users[idx] = user;
                    setLocal(KEYS.STUDENTS, users);
                }
            }
            return user;
        },
        delete: async (id: string) => {
            if (isSupabaseActive()) {
                await supabase.from('attendance_records').delete().eq('user_id', id);
                await supabase.from('profiles').delete().eq('id', id);
            } else {
                let users = getLocal<User[]>(KEYS.STUDENTS, []);
                users = users.filter(u => u.id !== id);
                setLocal(KEYS.STUDENTS, users);

                let records = getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
                records = records.filter(r => r.userId !== id);
                setLocal(KEYS.ATTENDANCE, records);
            }
        }
    },

    employees: {
        getAll: async () => { 
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', UserRole.EMPLOYEE);
                return (data || []).map(mapProfileToUser);
            }
            return getLocal<User[]>(KEYS.EMPLOYEES, []); 
        },
        add: async (user: User) => {
            if (isSupabaseActive()) {
                await supabase.from('profiles').insert([mapUserToProfile(user)]);
            } else {
                const users = getLocal<User[]>(KEYS.EMPLOYEES, []);
                users.push(user);
                setLocal(KEYS.EMPLOYEES, users);
            }
            return user;
        },
        update: async (user: User) => {
            if (isSupabaseActive()) {
                await supabase.from('profiles').update(mapUserToProfile(user)).eq('id', user.id);
            } else {
                const users = getLocal<User[]>(KEYS.EMPLOYEES, []);
                const idx = users.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    users[idx] = user;
                    setLocal(KEYS.EMPLOYEES, users);
                }
            }
            return user;
        },
        delete: async (id: string) => {
            if (isSupabaseActive()) {
                await supabase.from('attendance_records').delete().eq('user_id', id);
                await supabase.from('profiles').delete().eq('id', id);
            } else {
                let users = getLocal<User[]>(KEYS.EMPLOYEES, []);
                users = users.filter(u => u.id !== id);
                setLocal(KEYS.EMPLOYEES, users);

                let records = getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
                records = records.filter(r => r.userId !== id);
                setLocal(KEYS.ATTENDANCE, records);
            }
        }
    },

    admins: {
        getAll: async () => { 
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', UserRole.ADMIN);
                return (data || []).map(mapProfileToUser);
            }
            return getLocal<User[]>(KEYS.ADMINS, []); 
        },
        update: async (user: User) => {
            if (isSupabaseActive()) {
                await supabase.from('profiles').update(mapUserToProfile(user)).eq('id', user.id);
            } else {
                const users = getLocal<User[]>(KEYS.ADMINS, []);
                const idx = users.findIndex(u => u.id === user.id);
                if (idx !== -1) {
                    users[idx] = user;
                    setLocal(KEYS.ADMINS, users);
                }
            }
            return user;
        }
    },

    attendance: {
        getAll: async () => { 
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('attendance_records')
                    .select('*');
                return (data || []).map(r => ({
                    id: r.id,
                    userId: r.user_id,
                    date: r.date,
                    amIn: r.am_in,
                    amOut: r.am_out,
                    pmIn: r.pm_in,
                    pmOut: r.pm_out,
                    undertimeMinutes: r.undertime_minutes,
                    totalDailyMinutes: r.total_daily_minutes,
                    isLocked: r.is_locked,
                    isPmDepartureLocked: r.is_pm_departure_locked,
                    remarks: r.remarks,
                    isMerged: r.is_merged
                }));
            }
            return getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []); 
        },
        save: async (record: AttendanceRecord) => {
            if (isSupabaseActive()) {
                const payload = {
                    id: record.id,
                    user_id: record.userId,
                    date: record.date,
                    am_in: record.amIn,
                    am_out: record.amOut,
                    pm_in: record.pmIn,
                    pm_out: record.pmOut,
                    undertime_minutes: record.undertimeMinutes,
                    total_daily_minutes: record.totalDailyMinutes,
                    is_locked: record.isLocked,
                    is_pm_departure_locked: record.isPmDepartureLocked,
                    remarks: record.remarks,
                    is_merged: record.isMerged
                };
                const { error } = await supabase.from('attendance_records').upsert([payload]);
                if (error) console.error('Supabase save error:', error);
            } else {
                const records = getLocal<AttendanceRecord[]>(KEYS.ATTENDANCE, []);
                const idx = records.findIndex(r => r.id === record.id);
                if (idx !== -1) records[idx] = record;
                else records.push(record);
                setLocal(KEYS.ATTENDANCE, records);
            }
            
            await recalculateUserHours(record.userId);
            return record;
        }
    },

    logs: {
        getAll: async () => { 
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('activity_logs')
                    .select('*')
                    .order('timestamp', { ascending: false });
                return (data || []).map(l => ({
                    id: l.id,
                    userId: l.user_id,
                    action: l.action,
                    timestamp: l.timestamp,
                    location: l.location_lat ? { lat: l.location_lat, lng: l.location_lng } : undefined,
                    network: l.network
                }));
            }
            return getLocal<ActivityLog[]>(KEYS.LOGS, []); 
        },
        add: async (log: ActivityLog) => {
             if (isSupabaseActive()) {
                 await supabase.from('activity_logs').insert([{
                     id: log.id,
                     user_id: log.userId,
                     action: log.action,
                     timestamp: log.timestamp,
                     location_lat: log.location?.lat,
                     location_lng: log.location?.lng,
                     network: log.network
                 }]);
             } else {
                const logs = getLocal<ActivityLog[]>(KEYS.LOGS, []);
                logs.unshift(log);
                setLocal(KEYS.LOGS, logs);
             }
             return log;
        }
    },

    notifications: {
        getAll: async () => {
            if (isSupabaseActive()) {
                const { data } = await supabase
                    .from('notifications')
                    .select('*')
                    .order('timestamp', { ascending: false });
                return (data || []).map(n => ({
                    id: n.id,
                    userId: n.user_id,
                    userName: n.user_name,
                    userRole: n.user_role as UserRole,
                    type: n.type as 'EARLY_DEPARTURE',
                    message: n.message,
                    timestamp: n.timestamp,
                    location: n.location_lat ? { lat: n.location_lat, lng: n.location_lng } : undefined,
                    isRead: n.is_read,
                    attendanceRecordId: n.attendance_record_id
                }));
            }
            return getLocal<AppNotification[]>(KEYS.NOTIFICATIONS, []);
        },
        add: async (notification: AppNotification) => {
            if (isSupabaseActive()) {
                await supabase.from('notifications').insert([{
                    id: notification.id,
                    user_id: notification.userId,
                    user_name: notification.userName,
                    user_role: notification.userRole,
                    type: notification.type,
                    message: notification.message,
                    timestamp: notification.timestamp,
                    location_lat: notification.location?.lat,
                    location_lng: notification.location?.lng,
                    is_read: notification.isRead,
                    attendance_record_id: notification.attendanceRecordId
                }]);
            } else {
                const notifications = getLocal<AppNotification[]>(KEYS.NOTIFICATIONS, []);
                notifications.unshift(notification);
                setLocal(KEYS.NOTIFICATIONS, notifications);
            }
            return notification;
        },
        markAsRead: async (id: string) => {
            if (isSupabaseActive()) {
                await supabase.from('notifications').update({ is_read: true }).eq('id', id);
            } else {
                const notifications = getLocal<AppNotification[]>(KEYS.NOTIFICATIONS, []);
                const idx = notifications.findIndex(n => n.id === id);
                if (idx !== -1) {
                    notifications[idx].isRead = true;
                    setLocal(KEYS.NOTIFICATIONS, notifications);
                }
            }
        },
        delete: async (id: string) => {
            if (isSupabaseActive()) {
                await supabase.from('notifications').delete().eq('id', id);
            } else {
                let notifications = getLocal<AppNotification[]>(KEYS.NOTIFICATIONS, []);
                notifications = notifications.filter(n => n.id !== id);
                setLocal(KEYS.NOTIFICATIONS, notifications);
            }
        }
    },

    system: {
        exportData: async () => {
            return {
                students: await api.students.getAll(),
                employees: await api.employees.getAll(),
                admins: await api.admins.getAll(),
                attendance: await api.attendance.getAll(),
                logs: await api.logs.getAll()
            };
        },
        importData: async (data: any) => {
            if (isSupabaseActive()) {
                for (const u of [...data.students, ...data.employees, ...data.admins]) {
                    await supabase.from('profiles').upsert([mapUserToProfile(u)]);
                }
                for (const r of data.attendance) {
                    await supabase.from('attendance_records').upsert([{
                        id: r.id,
                        user_id: r.userId,
                        date: r.date,
                        am_in: r.amIn,
                        am_out: r.amOut,
                        pm_in: r.pmIn,
                        pm_out: r.pmOut,
                        undertime_minutes: r.undertimeMinutes,
                        total_daily_minutes: r.totalDailyMinutes,
                        is_locked: r.isLocked,
                        remarks: r.remarks,
                        is_merged: r.isMerged
                    }]);
                }
                for (const l of data.logs) {
                    await supabase.from('activity_logs').upsert([{
                        id: l.id,
                        user_id: l.userId,
                        action: l.action,
                        timestamp: l.timestamp,
                        location_lat: l.location?.lat,
                        location_lng: l.location?.lng,
                        network: l.network
                    }]);
                }
            } else {
                if (data.students) setLocal(KEYS.STUDENTS, data.students);
                if (data.employees) setLocal(KEYS.EMPLOYEES, data.employees);
                if (data.admins) setLocal(KEYS.ADMINS, data.admins);
                if (data.attendance) setLocal(KEYS.ATTENDANCE, data.attendance);
                if (data.logs) setLocal(KEYS.LOGS, data.logs);
            }
            return true;
        }
    }
};
