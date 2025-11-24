import { SCRIPT_URL } from '../config';
import type { Credential, Customer, UserActivityStat } from '../types';

async function postRequest(action: string, data: object = {}) {
    if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }

    const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, data }),
    });

    if (!response.ok) {
        throw new Error(`Ağ hatası: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
        throw new Error(result.error || 'Bilinmeyen bir sunucu hatası oluştu.');
    }
    
    return result;
}

async function getRequest(params: URLSearchParams) {
     if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        throw new Error("Lütfen config.ts dosyasında Google Apps Script URL'sini ayarlayın.");
    }
    const url = new URL(SCRIPT_URL);
    params.forEach((value, key) => url.searchParams.append(key, value));

    const response = await fetch(url.toString(), { method: 'GET' });

    if (!response.ok) {
        throw new Error(`Ağ hatası: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
        throw new Error(result.error || 'Bilinmeyen bir sunucu hatası oluştu.');
    }

    return result;
}


export const authenticateUser = async (username: string, password: string): Promise<void> => {
    await postRequest('authenticateUser', { username, password });
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

export const findCustomerByInstallationNumber = async (installationNumber: string): Promise<Customer> => {
    const params = new URLSearchParams({ 
        action: 'findCustomer',
        installationNumber: installationNumber
    });
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