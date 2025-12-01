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
 */
const fetchWithTimeout = async (resource: string, options: RequestInit = {}, timeout = 30000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    
    // Google Apps Script için kritik ayar:
    // CORS Preflight (OPTIONS) isteğini engellemek için Content-Type 'text/plain' olmalı.
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
        
        if (error.name === 'AbortError') {
            throw new Error("İstek zaman aşımına uğradı. Sunucu yanıt vermiyor.");
        }
        if (error.message === 'Failed to fetch') {
            throw new Error("Sunucuya erişilemedi. İnternet bağlantınızı kontrol edin.");
        }
        throw error;
    }
};

/**
 * Fetch with Retry:
 * Hata durumunda işlemi (exponential backoff ile) tekrar dener.
 * Sadece ağ hatalarında (Network Error) devreye girer.
 */
const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 2, backoff = 1000): Promise<Response> => {
    try {
        return await fetchWithTimeout(url, options);
    } catch (err) {
        if (retries <= 0) throw err;
        await new Promise(resolve => setTimeout(resolve, backoff));
        return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
};

/**
 * Handle Response:
 * Sunucudan gelen yanıtı işler.
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
        throw new Error("Sunucudan geçersiz yanıt alındı.");
    }

    if (!result.success) {
        // Sunucu tarafından dönen mantıksal hatalar burada fırlatılır
        throw new Error(result.error || 'İşlem başarısız.');
    }

    if (result.credentials) return result.credentials as unknown as T;
    if (result.customer) return result.customer as unknown as T;
    if (result.stats) return result.stats as unknown as T;
    if (result.status === 'ok') return true as unknown as T;

    return result as unknown as T;
};

// --- URL Yardımcısı ---
const buildUrl = (baseUrl: string, params: Record<string, string>) => {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => url.searchParams.append(key, params[key]));
    url.searchParams.append('_t', Date.now().toString());
    return url.toString();
};

// --- Public Methods ---

export const checkServerConnection = async (): Promise<boolean> => {
    if (!SCRIPT_URL) return false;
    try {
        const url = buildUrl(SCRIPT_URL, { action: 'ping' });
        const response = await fetchWithTimeout(url, { method: 'GET' }, 10000); 
        if (!response.ok) return false;
        const text = await response.text();
        const result = JSON.parse(text);
        return result.success === true;
    } catch (e) {
        return false;
    }
};

export const getCredentials = async (): Promise<Credential[]> => {
    const url = buildUrl(SCRIPT_URL, { action: 'getCredentials' });
    const response = await fetchWithRetry(url, { method: 'GET' }, 1);
    return handleResponse<Credential[]>(response);
};

export const findCustomerByInstallationNumber = async (installationNumber: string): Promise<Customer> => {
    // 1. Önce Cache Kontrolü
    const cachedItem = searchCache.get(installationNumber);
    if (cachedItem) {
        const isExpired = (Date.now() - cachedItem.timestamp) > CACHE_DURATION_MS;
        if (!isExpired) {
            return cachedItem.data;
        } else {
            searchCache.delete(installationNumber);
        }
    }

    // 2. Sunucuya Git
    const url = buildUrl(SCRIPT_URL, { 
        action: 'findCustomer',
        installationNumber: installationNumber
    });
    
    const response = await fetchWithRetry(url, { method: 'GET' });
    const data = await handleResponse<Customer>(response);

    // 3. Cache'e Yaz
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
    
    // --- AKILLI TEKRAR DENEME (RETRY) ---
    // Eğer sunucu "yoğun" hatası verirse, 2 saniye bekleyip tekrar dener.
    // Toplam 3 deneme hakkı vardır.
    let lastError: any;
    
    for (let i = 0; i < 3; i++) {
        try {
            // fetchWithRetry'yi burada kullanmıyoruz, çünkü hatayı kendimiz yönetmek istiyoruz.
            const response = await fetchWithTimeout(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify(payload)
            }, 15000); // Login için 15sn timeout
            
            await handleResponse(response);
            return; // Başarılı olursa fonksiyondan çık
            
        } catch (err: any) {
            lastError = err;
            const errorMessage = err.message || "";
            
            // Eğer hata "yoğun" kelimesini içeriyorsa (Backend'den gelen hata)
            if (errorMessage.toLowerCase().includes("yoğun") || errorMessage.toLowerCase().includes("busy")) {
                console.warn(`Sunucu yoğun (Deneme ${i+1}/3). Bekleniyor...`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2 saniye bekle
                continue; // Döngüyü tekrar et
            }
            
            // Başka bir hataysa döngüyü kır ve hatayı fırlat
            throw err;
        }
    }
    
    throw lastError;
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<void> => {
    const payload = {
        action: 'logSearch',
        data: { username, installationNumber }
    };
    
    // --- PERFORMANS AYARI ---
    // Loglama işlemi için sadece 1.5 saniye bekle.
    // Eğer sunucu meşgulse veya internet yavaşsa log tutmayı atla, 
    // böylece kullanıcı arayüzü donmaz. Retry (tekrar deneme) YOK.
    try {
        await fetchWithTimeout(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        }, 1500);
    } catch (e) {
        console.warn("Loglama sunucu yoğunluğu nedeniyle atlandı.");
    }
};

export const getUserActivityStats = async (): Promise<UserActivityStat[]> => {
    const url = buildUrl(SCRIPT_URL, { action: 'getUserActivityStats' });
    const response = await fetchWithRetry(url, { method: 'GET' }, 1);
    return handleResponse<UserActivityStat[]>(response);
};

// --- Admin Operations ---

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    const payload = { action: 'add', data: credential };
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 1);
    return handleResponse<Credential[]>(response);
};

export const deleteCredential = async (username: string): Promise<Credential[]> => {
    const payload = { action: 'delete', data: { username } };
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

export const resetUserStats = async (username: string): Promise<void> => {
    const payload = { action: 'resetStats', data: { username } };
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    }, 1);
    await handleResponse(response);
};