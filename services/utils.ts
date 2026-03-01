import { ALLOWED_WIFI } from '../constants';

export const calculateMinutes = (start: string, end: string): number => {
  if (!start || !end) return 0;
  
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const startDate = new Date(0, 0, 0, startH, startM);
  const endDate = new Date(0, 0, 0, endH, endM);
  
  const diff = (endDate.getTime() - startDate.getTime()) / 1000 / 60;
  return diff > 0 ? diff : 0;
};

export const formatMinutesToHours = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

export const getMonthName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('default', { month: 'long' });
};

export const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
};

export const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const addMinutesToTime = (time: string, minutesToAdd: number): string => {
    if (!time) return '';
    const [h, m] = time.split(':').map(Number);
    const date = new Date(0, 0, 0, h, m);
    date.setMinutes(date.getMinutes() + minutesToAdd);
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const formatTime12Hour = (time24: string): string => {
    if (!time24) return '';
    const [h, m] = time24.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hours = h % 12 || 12;
    return `${hours}:${m.toString().padStart(2, '0')} ${period}`;
};

export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // in metres
};

export const detectNetwork = async (): Promise<{ name: string, ip: string, isAllowed: boolean }> => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        const ip = data.ip;
        
        const allowed = ALLOWED_WIFI.find(w => w.ip === ip);
        if (allowed) {
            return { name: allowed.name, ip, isAllowed: true };
        } else {
            return { name: 'Other Network Connection', ip, isAllowed: false };
        }
    } catch (error) {
        console.error("Failed to detect network:", error);
        return { name: 'Other Network Connection', ip: 'Unknown', isAllowed: false };
    }
};