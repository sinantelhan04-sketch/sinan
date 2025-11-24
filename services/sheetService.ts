import { SCRIPT_URL } from '../config';
import type { Credential, Customer, UserActivityStat } from '../types';

// Timeout (zaman aşımı) özelliği olan fetch sarmalayıcısı
async function fetchWithTimeout(resource: string, options: RequestInit & { timeout?: number } = {}) {
  const { timeout = 30000 } = options; // Varsayılan 30 saniye
  
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
       throw new Error('Sunucu yanıt vermedi (30sn Zaman Aşımı). Lütfen internet bağlantınızı kontrol edin ve tekrar deneyin.');
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
        const result = JSON.parse(text);
        if (!result.success) {
            throw new Error(result.error || 'Bilinmeyen bir sunucu hatası oluştu.');
        }
        return result;
    } catch (e) {
        // JSON parse hatası genellikle sunucunun HTML hata sayfası döndürmesinden kaynaklanır
        console.error("Geçersiz Sunucu Yanıtı:", text);
        throw new Error("Sunucudan geçersiz veri alındı. Lütfen yapılandırmayı kontrol edin.");
    }
}

async function postRequest(action: string, data: object = {}) {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }

    const response = await fetchWithTimeout(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
    });

    return handleResponse(response);
}

async function getRequest(params: URLSearchParams) {
     if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }
    const url = new URL(SCRIPT_URL);
    params.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetchWithTimeout(url.toString(), { method: 'GET' });

    return handleResponse(response);
}


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
    await postRequest('logSearch', { username, installationNumber });
};

export const getDistricts = async (): Promise<string[]> => {
    const params = new URLSearchParams({ action: 'getDistricts' });
    const result = await getRequest(params);
    return result.districts || [];
};