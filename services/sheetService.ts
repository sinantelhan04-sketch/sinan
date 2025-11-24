import { SCRIPT_URL } from '../config';
import type { Credential, Customer, UserActivityStat } from '../types';

// Timeout (zaman aşımı) özelliği olan fetch sarmalayıcısı
// Google Apps Script soğuk başlangıçta (cold start) yavaş olabildiği için süreyi biraz artırdık.
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 25000 } = options; // 25 saniye
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal  
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
       throw new Error('Sunucu yanıt vermedi (Zaman Aşımı). Bağlantınız yavaş olabilir veya sunucu uyanıyor olabilir.');
    }
    throw error;
  }
}

// YENİ: Başarısız istekleri otomatik tekrar deneme mekanizması
// Google Apps Script bazen 500 veya ağ hatası verebilir. Bu fonksiyon isteği 3 kez tekrar dener.
async function fetchWithRetry(resource: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
    try {
        const response = await fetchWithTimeout(resource, options);
        
        // Eğer sunucu 5xx hatası verirse (Google sunucu hatası), bunu da retry kapsamına alalım
        if (!response.ok && response.status >= 500) {
             throw new Error(`Sunucu Hatası: ${response.status}`);
        }
        return response;
    } catch (error: any) {
        if (retries > 0) {
            console.warn(`İstek başarısız oldu, tekrar deneniyor... (${retries} hak kaldı). Hata: ${error.message}`);
            // Bekleme süresi (Exponential backoff gerekmez, sabit bekleme yeterli)
            await new Promise(resolve => setTimeout(resolve, backoff));
            return fetchWithRetry(resource, options, retries - 1, backoff);
        }
        throw error;
    }
}

// Yanıtı işleyen ve hataları yakalayan yardımcı fonksiyon
async function handleResponse(response: Response) {
    if (!response.ok) {
        throw new Error(`Ağ hatası: ${response.status} ${response.statusText}`);
    }

    const text = await response.text();
    try {
        // Gelen yanıtın HTML olup olmadığını basitçe kontrol et (Hata sayfası kontrolü)
        if (text.trim().startsWith('<')) {
            // Google bazen oturum açma sayfası döndürebilir, bu bir hatadır.
            throw new Error("Sunucudan HTML yanıtı döndü.");
        }

        const result = JSON.parse(text);
        if (!result.success) {
            throw new Error(result.error || 'Bilinmeyen bir sunucu hatası oluştu.');
        }
        return result;
    } catch (e: any) {
        console.error("Geçersiz Sunucu Yanıtı:", text);
        if (e.message === "Sunucudan HTML yanıtı döndü.") {
            throw new Error("Yapılandırma Hatası: URL yanlış veya script erişim izni yok. Lütfen URL'nin '/exec' ile bittiğinden ve erişimin 'Herkes (Anyone)' olduğundan emin olun.");
        }
        if (e.message.includes("JSON")) {
             throw new Error("Sunucudan bozuk veri geldi. Lütfen biraz bekleyip tekrar deneyin.");
        }
        throw e;
    }
}

async function postRequest(action: string, data: object = {}) {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }

    // Google Apps Script POST isteklerinde 'follow' redirect önemlidir.
    const response = await fetchWithRetry(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
        redirect: 'follow' 
    });

    return handleResponse(response);
}

async function getRequest(params: URLSearchParams) {
     if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }
    const url = new URL(SCRIPT_URL);
    params.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetchWithRetry(url.toString(), { 
        method: 'GET',
        redirect: 'follow'
    });

    return handleResponse(response);
}

// --- Public Methods ---

// Sunucuyu kontrol etmek için basit bir ping fonksiyonu
export const checkServerConnection = async (): Promise<boolean> => {
    try {
        // Hızlı bir işlem çağıralım (örn: ilçe listesi veya olmayan bir action)
        // Action 'ping' sunucuda tanımlı olmasa bile switch-case default hatası JSON dönecektir, bu da bağlantının var olduğunu kanıtlar.
        const params = new URLSearchParams({ action: 'getDistricts' }); 
        await fetchWithTimeout(`${SCRIPT_URL}?${params.toString()}`, { method: 'GET', timeout: 5000 });
        return true;
    } catch (e) {
        return false;
    }
};

export const authenticateUser = async (username: string, password: string, deviceId: string): Promise<void> => {
    await postRequest('authenticateUser', { username, password, deviceId });
};

export const getCredentials = async (): Promise<Credential[]> => {
    const params = new URLSearchParams({ action: 'getCredentials' });
    const result = await getRequest(params);
    return result.credentials || [];
};

export const getUserActivityStats = async (): Promise<UserActivityStat[]> => {
    const params = new URLSearchParams({ action: 'getUserActivityStats' });
    const result = await getRequest(params);
    return result.stats || [];
};

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    const result = await postRequest('add', credential);
    return result.credentials;
};

export const deleteCredential = async (username: string): Promise<Credential[]> => {
    const result = await postRequest('delete', { username });
    return result.credentials;
};

export const updateCredential = async (originalUsername: string, updatedCredential: Credential): Promise<Credential[]> => {
    const result = await postRequest('update', { originalUsername, updatedCredential });
    return result.credentials;
};

export const findCustomerByInstallationNumber = async (installationNumber: string, district?: string): Promise<Customer> => {
    const params = new URLSearchParams({ 
        action: 'findCustomer',
        installationNumber: installationNumber
    });
    if (district) {
        params.append('district', district);
    }
    
    const result = await getRequest(params);
    if (!result.customer) {
        throw new Error(`'${installationNumber}' numaralı tesisat için abone bulunamadı.`);
    }
    return result.customer;
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<void> => {
    // Loglama kritik bir işlem olmadığı için hata verirse kullanıcıyı durdurmasın
    try {
        await postRequest('logSearch', { username, installationNumber });
    } catch (e) {
        console.warn("Loglama başarısız oldu:", e);
    }
};

export const getDistricts = async (): Promise<string[]> => {
    const params = new URLSearchParams({ action: 'getDistricts' });
    const result = await getRequest(params);
    return result.districts || [];
};