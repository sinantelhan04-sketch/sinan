// Türkiye için 2024 ve 2025 resmi tatil günleri (YYYY-MM-DD formatında)
const publicHolidays: Set<string> = new Set([
    // 2024
    "2024-01-01", // Yılbaşı
    "2024-04-09", // Ramazan Bayramı Arifesi (yarım gün, tam gün kapalı varsayalım)
    "2024-04-10", // Ramazan Bayramı 1. Gün
    "2024-04-11", // Ramazan Bayramı 2. Gün
    "2024-04-12", // Ramazan Bayramı 3. Gün
    "2024-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2024-05-01", // Emek ve Dayanışma Günü
    "2024-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2024-06-15", // Kurban Bayramı Arifesi (yarım gün, tam gün kapalı varsayalım)
    "2024-06-16", // Kurban Bayramı 1. Gün
    "2024-06-17", // Kurban Bayramı 2. Gün
    "2024-06-18", // Kurban Bayramı 3. Gün
    "2024-06-19", // Kurban Bayramı 4. Gün
    "2024-07-15", // Demokrasi ve Milli Birlik Günü
    "2024-08-30", // Zafer Bayramı
    "2024-10-29", // Cumhuriyet Bayramı

    // 2025
    "2025-01-01", // Yılbaşı
    "2025-03-30", // Ramazan Bayramı 1. Gün
    "2025-03-31", // Ramazan Bayramı 2. Gün
    "2025-04-01", // Ramazan Bayramı 3. Gün
    "2025-04-23", // Ulusal Egemenlik ve Çocuk Bayramı
    "2025-05-01", // Emek ve Dayanışma Günü
    "2025-05-19", // Atatürk'ü Anma, Gençlik ve Spor Bayramı
    "2025-06-06", // Kurban Bayramı 1. Gün
    "2025-06-07", // Kurban Bayramı 2. Gün
    "2025-06-08", // Kurban Bayramı 3. Gün
    "2025-06-09", // Kurban Bayramı 4. Gün
    "2025-07-15", // Demokrasi ve Milli Birlik Günü
    "2025-08-30", // Zafer Bayramı
    "2025-10-29", // Cumhuriyet Bayramı
]);

/**
 * Mevcut zamanın çalışma saatleri içinde olup olmadığını kontrol eder.
 * Kurallar:
 * - Hafta içi (Pzt-Cum) 08:00 ile 18:00 arası.
 * - Hafta sonları (Cmt, Pzr) kapalı.
 * - Resmi tatillerde kapalı.
 */
export const isWithinWorkingHours = (): boolean => {
    const now = new Date();
    
    // 1. Resmi tatil kontrolü
    const year = now.getFullYear();
    const month = ('0' + (now.getMonth() + 1)).slice(-2);
    const day = ('0' + now.getDate()).slice(-2);
    const todayString = `${year}-${month}-${day}`;

    if (publicHolidays.has(todayString)) {
        return false; // Bugün resmi tatil.
    }

    // 2. Hafta sonu kontrolü
    // getDay() -> Pazar: 0, Pazartesi: 1, ..., Cumartesi: 6
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return false; // Hafta sonu (Pazar veya Cumartesi).
    }

    // 3. Mesai saati kontrolü
    const currentHour = now.getHours();
    if (currentHour < 8 || currentHour >= 18) {
        return false; // Mesai saatleri dışında.
    }

    // Tüm kontrolleri geçtiyse, çalışma saatleri içindedir.
    return true;
};
