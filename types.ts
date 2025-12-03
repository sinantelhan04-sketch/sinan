export interface Customer {
  installationNumber: string;
  name: string;
  phone: string;
  address: string;
  latitude?: string;
  longitude?: string;
}

export interface Credential {
  username: string;
  password: string;
  allowedDeviceId?: string;
  // Yeni Alanlar
  fullName?: string;          // Ad Soyad
  title?: string;             // Ünvan (Örn: Saha Operasyon Uzmanı)
  skipDeviceLock?: boolean;   // Cihaz kilidini atla
  canViewDetails?: boolean;   // İsim soyisim açık gör
}

export interface UserActivityStat {
  username: string;
  queryCount: number;
  lastLogin: string;
}