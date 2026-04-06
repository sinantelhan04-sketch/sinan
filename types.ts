
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
  canViewPhone?: boolean;     // Telefon numarası açık gör
  unlimitedAccess?: boolean;  // 7/24 Erişim (Zaman kısıtlaması yok)
}

export interface UserActivityStat {
  username: string;
  queryCount: number; // Monthly count
  totalQueryCount: number; // Total count
  lastLogin: string;
}

export interface Announcement {
  id?: number;
  title: string;
  content: string;
  imageUrl?: string | null;
  targetUsers: string[]; // ['all'] veya ['user1', 'user2']
  active: boolean;
  createdAt?: string;
}
