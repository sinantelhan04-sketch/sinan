import { SCRIPT_URL } from '../config';
import type { Credential, Customer, UserActivityStat } from '../types';

// --- Types ---
interface SheetResponse<T = any> {
  success: boolean;
  data?: T;
  credentials?: Credential[];
  customer?: Customer;
  stats?: UserActivityStat[];
  error?: string;
  status?: string;
}

// --- Caching System ---
// Sorgu sonuçlarını hafızada tutarak sunucu yükünü azaltır
const searchCache = new Map<string, { data: Customer, timestamp: number }>();
const CACHE_DURATION_MS = 1000 * 60 * 15; // 15 Dakika boyunca hafızada tut

// --- Helper Functions ---

/**
 * Fetch with Timeout:
 * Belirli bir süre içinde yanıt gelmezse işlemi iptal eder.
 * Timeout süresi 30 saniyeye çıkarıldı.
 */
const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    // Google Apps Script için kritik ayar:
    // CORS Preflight (OPTIONS) isteğini engellemek için Content-Type 'text/plain' olmalı.
    // Tarayıcı bu durumda basit istek (simple request) olarak algılar ve ön kontrol yapmaz.
    const headers = {
        "Content-Type": "text/plain;charset=utf-8",
        ...options.headers
    };

    try {
        const response = await fetch(resource, {
            ...options,
            headers,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error: any) {
        clearTimeout(id);
        
        // Hata mesajlarını kullanıcı dostu hale getir
        if (error.name === 'AbortError') {
            throw new Error("İstek zaman aşımına uğradı. Sunucu yanıt vermiyor, lütfen tekrar deneyin.");
        }
        if (error.message === 'Failed to fetch') {
            throw new Error("Sunucuya erişilemedi. İnternet bağlantınızı kontrol edin veya sunucu yoğun olabilir.");
        }
        throw error;
    }
};

/**
 * Fetch with Retry:
 * Hata durumunda işlemi (exponential backoff ile) tekrar dener.
 */
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 2, backoff = 1000): Promise<Response> => {
    try {
        return await fetchWithTimeout(url, options);
    } catch (err) {
        if (retries <= 0) throw err;
        
        // Bekleme süresini her denemede artır (1sn, 2sn...)
        await new Promise(resolve => setTimeout(resolve, backoff));
        console.warn(`İstek başarısız, tekrar deneniyor... (${retries} hak kaldı)`);
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
};

/**
 * Handle Response:
 * Sunucudan gelen yanıtı işler ve hataları ayıklar.
 */
const handleResponse = async <T>(response: Response): Promise<T> => {
    if (!response.ok) {
        throw new Error(`HTTP Hatası: ${response.status}`);
    }

    const text = await response.text();
    let result: SheetResponse;

    try {
        result = JSON.parse(text);
    } catch (e) {
        console.error("Geçersiz JSON yanıtı:", text);
        if (text.includes("<!DOCTYPE html>")) {
             throw new Error("Sunucu yapılandırma hatası: HTML yanıtı döndü. Lütfen Script URL'sini kontrol edin.");
        }
        throw new Error("Sunucudan geçersiz yanıt alındı.");
    }

    if (!result.success) {
        // Sunucudan gelen mantıksal hata (örn: şifre yanlış, abone bulunamadı)
        throw new Error(result.error || 'İşlem başarısız.');
    }

    // Başarılı durumda ilgili veriyi döndür
    if (result.credentials) return result.credentials as unknown as T;
    if (result.customer) return result.customer as unknown as T;
    if (result.stats) return result.stats as unknown as T;
    if (result.status === 'ok') return true as unknown as T; // Ping yanıtı

    return result as unknown as T;
};

// --- URL Yardımcısı ---
// Tarayıcı önbelleğini (caching) önlemek için URL'ye benzersiz parametre ekler
const buildUrl = (baseUrl: string, params: Record<string, string>) => {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    // Cache buster ekle
    url.searchParams.append('_t', Date.now().toString());
    return url.toString();
};

// --- Public Methods ---

/**
 * Sunucu Bağlantı Kontrolü (Ping)
 */
export const checkServerConnection = async (): Promise<boolean> => {
    if (!SCRIPT_URL) return false;
    try {
        const url = buildUrl(SCRIPT_URL, { action: 'ping' });
        // Ping için kısa timeout
        const response = await fetchWithTimeout(url, { 
            method: 'GET',
        }, 10000); 
        
        if (!response.ok) return false;
        
        const text = await response.text();
        const result = JSON.parse(text);
        return result.success === true;
    } catch (e) {
        console.error("Sunucu bağlantı hatası:", e);
        return false;
    }
};

export const getCredentials = async (): Promise<Credential[]> => {
    // Admin işlemleri kritik olduğu için retry sayısı azaltıldı
    const url = buildUrl(SCRIPT_URL, { action: 'getCredentials' });
    const response = await fetchWithRetry(url, { method: 'GET' }, 1);
    return handleResponse<Credential[]>(response);
};

export const findCustomerByInstallationNumber = async (installationNumber: string): Promise<Customer> => {
    // 1. Önce Cache Kontrolü Yap
    const cachedItem = searchCache.get(installationNumber);
    if (cachedItem) {
        const isExpired = (Date.now() - cachedItem.timestamp) > CACHE_DURATION_MS;
        if (!isExpired) {
            console.log("Veri önbellekten getirildi:", installationNumber);
            return cachedItem.data;
        } else {
            searchCache.delete(installationNumber);
        }
    }

    // 2. Cache'de yoksa sunucuya git
    const url = buildUrl(SCRIPT_URL, { 
        action: 'findCustomer',
        installationNumber: installationNumber // encodeURIComponent buildUrl içinde otomatik yapılır (URLSearchParams) ama yine de string gider.
    });
    
    const response = await fetchWithRetry(url, { method: 'GET' });
    const data = await handleResponse<Customer>(response);

    // 3. Sonucu Cache'e yaz
    if (data) {
        searchCache.set(installationNumber, {
            data: data,
            timestamp: Date.now()
        });
    }

    return data;
};

export const authenticateUser = async (username: string, password: string, deviceId: string): Promise<void> => {
    const payload = {
        action: 'authenticateUser',
        data: { username, password, deviceId }
    };
    
    // Login işlemi kritik ama uzun sürmemeli, retry var.
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    
    await handleResponse(response);
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<void> => {
    const payload = {
        action: 'logSearch',
        data: { username, installationNumber }
    };
    
    // LOGLAMA İÇİN RETRY YOK.
    // Eğer sunucu yoğunsa loglama başarısız olabilir, bu kullanıcının deneyimini bozmamalıdır.
    // fetchWithRetry yerine direkt fetchWithTimeout kullanıyoruz ve timeout kısa (5sn).
    try {
        await fetchWithTimeout(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        }, 5000);
    } catch (e) {
        console.warn("Loglama sunucu yoğunluğu nedeniyle atlandı:", e);
    }
};

export const getUserActivityStats = async (): Promise<UserActivityStat[]> => {
    const url = buildUrl(SCRIPT_URL, { action: 'getUserActivityStats' });
    const response = await fetchWithRetry(url, { method: 'GET' }, 1);
    return handleResponse<UserActivityStat[]>(response);
};

// --- Admin Operations ---

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    const payload = {
        action: 'add',
        data: credential
    };
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 1);
    return handleResponse<Credential[]>(response);
};

export const deleteCredential = async (username: string): Promise<Credential[]> => {
    const payload = {
        action: 'delete',
        data: { username }
    };
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 1);
    return handleResponse<Credential[]>(response);
};

export const updateCredential = async (originalUsername: string, updatedCredential: Credential): Promise<Credential[]> => {
    const payload = {
        action: 'update',
        data: { originalUsername, updatedCredential }
    };
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 1);
    return handleResponse<Credential[]>(response);
};