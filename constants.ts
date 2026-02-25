
export const OFFICE_LOCATION = {
  address: "F. Mendoza Commercial Complex, Units 102 & 103, Brgy. 28, Sto. Niño St., Tacloban City, Philippines, 6500",
  lat: 11.2428, // Approximate latitude for Tacloban City center
  lng: 125.0011, // Approximate longitude for Tacloban City center
  radius: 100 // in meters
};

export const DEPARTURE_TIME_LIMIT = "17:00"; // 5 PM

export const ALLOWED_WIFI = [
  { 
    name: "GlobeAtHome_E863F_5", 
    routerIp: "192.168.254.254",
    // You MUST replace this with your actual Public IP Address (visit https://api.ipify.org to see it)
    publicIp: "112.198.100.100" 
  },
  { 
    name: "PLDTHOMEFIBR5G11a58", 
    routerIp: "192.168.1.1",
    // You MUST replace this with your actual Public IP Address
    publicIp: "124.106.100.100" 
  }
];
