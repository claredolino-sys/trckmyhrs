import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ActivityLog } from '../types';
import { api } from '../services/api';

interface ActivityContextType {
  logs: ActivityLog[];
  logActivity: (userId: string, action: string, location?: { lat: number; lng: number }, network?: string) => void;
  refreshLogs: () => void;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

export const ActivityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const refreshLogs = async () => {
      const fetchedLogs = await api.logs.getAll();
      setLogs(fetchedLogs);
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const logActivity = async (userId: string, action: string, location?: { lat: number; lng: number }, network?: string) => {
    const newLog: ActivityLog = {
      id: Date.now().toString(),
      userId,
      action,
      timestamp: new Date().toISOString(),
      location,
      network
    };
    
    // Optimistic update
    setLogs(prev => [newLog, ...prev]);
    
    // Background save
    await api.logs.add(newLog);
  };

  return (
    <ActivityContext.Provider value={{ logs, logActivity, refreshLogs }}>
      {children}
    </ActivityContext.Provider>
  );
};

export const useActivity = () => {
  const context = useContext(ActivityContext);
  if (!context) throw new Error('useActivity must be used within ActivityProvider');
  return context;
};