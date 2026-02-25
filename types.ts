
export enum UserRole {
  ADMIN = 'ADMIN',
  STUDENT = 'STUDENT',
  EMPLOYEE = 'EMPLOYEE'
}

export enum StudentType {
  OJT = 'OJT',
  IMMERSION = 'IMMERSION'
}

export interface UserProfile {
  name: string;
  username: string; // Replaced email
  password?: string; // Added for student/employee login
  school?: string;
  schoolAddress?: string;
  program?: string; // e.g. BS Computer Science
  studentType?: StudentType;
  // Employee specific fields
  position?: string;
  department?: string;
  
  requiredHours?: number;
  completedHours: number; // In minutes
  profilePicture?: string; // Base64 biometric enrollment
}

export interface User {
  id: string;
  role: UserRole;
  profile: UserProfile;
  qrToken?: string; // For QR code login
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  amIn: string; // HH:MM
  amOut: string; // HH:MM
  pmIn: string; // HH:MM
  pmOut: string; // HH:MM
  undertimeMinutes: number;
  totalDailyMinutes: number;
  isLocked: boolean; // If true, cannot undo
  isPmDepartureLocked: boolean; // If true, PM departure is disabled by admin
  remarks?: string; // For holidays, travel, etc.
  isMerged?: boolean; // If true, time columns are hidden and remarks span the row
}

export interface AppNotification {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  type: 'EARLY_DEPARTURE';
  message: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  isRead: boolean;
  attendanceRecordId?: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  timestamp: string;
  location?: { lat: number; lng: number };
  network?: string;
}

export const ADMIN_IN_CHARGE = "Reyan L. Arinto";
