
// SUPABASE AYARLARI
// Supabase projenizden aldığınız URL ve ANON KEY bilgilerini buraya girin.

export const SUPABASE_URL = "https://smtiqqyyjssyfopowxkn.supabase.co"; 
export const SUPABASE_KEY = "sb_publishable_N4sBJOciH2Jh4p82uAUVNA_QLFPBr2X";

// Not: Script URL artık kullanılmamaktadır.
export const SCRIPT_URL = "";

// --- REKLAM AYARLARI ---

// 1. WEB SİTESİ REKLAMLARI (GOOGLE ADSENSE)
// Tarayıcıda (Chrome, Safari vb.) reklam göstermek için bunu kullanın.
// AdSense panelinden alacağınız Yayıncı Kimliği (ca-pub-...)
export const ADSENSE_PUBLISHER_ID = "ca-pub-1812481333949389"; 

// AdSense panelinden oluşturduğunuz reklam biriminin SLOT ID'si (Örn: 1234567890)
// DİKKAT: Buraya AdMob ID'si (ca-app-pub...) YAZMAYIN, çalışmaz. Sadece sayısal Slot ID yazın.
export const ADSENSE_SLOT_ID = "1234567890"; 


// 2. MOBİL UYGULAMA REKLAMLARI (GOOGLE ADMOB)
// Bu ayarlar SADECE uygulamanızı Google Play veya App Store'a yüklediğinizde (APK/IPA) kullanılır.
// Web sürümünde bu ID'ler kullanılmaz.
export const ADMOB_CONFIG = {
    androidAppId: "ca-app-pub-1812481333949389~6106353706",
    iosAppId: "ca-app-pub-1812481333949389~4417867519"
};
