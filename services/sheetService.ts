import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config';
import type { Credential, Customer, UserActivityStat } from '../types';

// --- Supabase Client Init ---
const supabase = (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id')) 
    ? createClient(SUPABASE_URL, SUPABASE_KEY) 
    : null;

// --- Caching System (Persistent) ---
const CACHE_PREFIX = 'sb_cache_v1_';
const CACHE_DURATION_MS = 1000 * 60 * 30; // 30 Dakika

const getFromCache = (key: string): Customer | null => {
    try {
        const stored = localStorage.getItem(CACHE_PREFIX + key);
        if (!stored) return null;
        
        const record = JSON.parse(stored);
        if (Date.now() - record.timestamp > CACHE_DURATION_MS) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return record.data;
    } catch (e) {
        return null;
    }
};

const saveToCache = (key: string, data: Customer) => {
    try {
        const record = { data, timestamp: Date.now() };
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(record));
    } catch (e) {
        console.error("Cache saving failed", e);
    }
};

const ensureClient = () => {
    if (!supabase) throw new Error("Supabase bağlantı ayarları (URL ve Key) config.ts dosyasında yapılmamış.");
    return supabase;
};

// --- Public Methods ---

export const checkServerConnection = async (): Promise<boolean> => {
    try {
        const client = ensureClient();
        const { error } = await client.from('users').select('count', { count: 'exact', head: true });
        return !error;
    } catch (e) {
        console.error("Bağlantı hatası:", e);
        return false;
    }
};

export const getTotalCustomerCount = async (): Promise<number> => {
    try {
        const client = ensureClient();
        const { count, error } = await client
            .from('customers')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        return count || 0;
    } catch (e) {
        console.error("Müşteri sayısı alınamadı:", e);
        return 0;
    }
};

export const getCredentials = async (): Promise<Credential[]> => {
    const client = ensureClient();
    // select('*') kullanarak eksik sütun hatasını önlüyoruz (PostgreSQL error mitigation)
    const { data, error } = await client
        .from('users')
        .select('*')
        .order('username');

    if (error) throw new Error(error.message);

    return data.map((user: any) => ({
        username: user.username,
        password: user.password,
        fullName: user.full_name || '',
        title: user.title || '',
        allowedDeviceId: user.allowed_device_id,
        skipDeviceLock: user.skip_device_lock,
        canViewDetails: user.can_view_details,
        lastLogin: user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : undefined
    }));
};

export const findCustomerByInstallationNumber = async (installationNumber: string): Promise<Customer> => {
    const cachedData = getFromCache(installationNumber);
    if (cachedData) {
        return cachedData;
    }

    const client = ensureClient();

    const { data, error } = await client
        .from('customers')
        .select('*')
        .eq('installation_number', installationNumber)
        .single();

    if (error) {
        if (error.code === 'PGRST116') { 
             throw new Error('Tesisat numarası bulunamadı.');
        }
        throw new Error('Sorgulama sırasında bir hata oluştu: ' + error.message);
    }

    const customer: Customer = {
        installationNumber: data.installation_number,
        name: data.name,
        phone: data.phone,
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude
    };

    saveToCache(installationNumber, customer);

    return customer;
};

// Authentication artık isim ve izinleri de dönüyor
export const authenticateUser = async (username: string, password: string, deviceId: string): Promise<{ canViewDetails: boolean, fullName?: string }> => {
    const client = ensureClient();

    const { data: user, error } = await client
        .from('users')
        .select('*')
        .eq('username', username)
        .single();

    if (error || !user) {
        throw new Error('Kullanıcı bulunamadı.');
    }

    if (user.password !== password) {
        throw new Error('Hatalı şifre.');
    }

    // --- Cihaz Kontrol Mantığı ---
    if (user.skip_device_lock) {
        // Cihaz kilidi yok (Serbest Giriş)
        // Yine de son giriş tarihini güncelle
        await client
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('id', user.id);
            
    } else {
        // Standart Cihaz Kontrolü
        if (!user.allowed_device_id) {
            // İlk giriş, cihazı kilitle
            const { error: updateError } = await client
                .from('users')
                .update({ 
                    allowed_device_id: deviceId,
                    last_login: new Date().toISOString()
                })
                .eq('id', user.id);
                
            if (updateError) throw new Error('Cihaz eşleştirilemedi.');

        } else if (user.allowed_device_id !== deviceId) {
            throw new Error(`Bu hesap başka bir cihazla eşleşmiş. (Kayıtlı ID sonu: ...${user.allowed_device_id.slice(-4)})`);
        } else {
            // Giriş başarılı, last_login güncelle
            await client
                .from('users')
                .update({ last_login: new Date().toISOString() })
                .eq('id', user.id);
        }
    }

    // Yetki ve isim bilgisini döndür
    return {
        canViewDetails: user.can_view_details || false,
        fullName: user.full_name
    };
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<void> => {
    try {
        const client = ensureClient();
        await client.from('search_logs').insert([
            { username, installation_number: installationNumber }
        ]);
    } catch (e) {
        console.warn("Loglama hatası:", e);
    }
};

export const getUserActivityStats = async (): Promise<UserActivityStat[]> => {
    const client = ensureClient();
    
    const { data: users, error: userError } = await client
        .from('users')
        .select('username, last_login');

    if (userError) throw new Error(userError.message);

    const { data: logs, error: logError } = await client
        .from('search_logs')
        .select('username');
    
    if (logError) throw new Error(logError.message);

    const logCounts: Record<string, number> = {};
    logs?.forEach((log: any) => {
        logCounts[log.username] = (logCounts[log.username] || 0) + 1;
    });

    return users.map((user: any) => ({
        username: user.username,
        queryCount: logCounts[user.username] || 0,
        lastLogin: user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : 'Giriş Yapmadı'
    }));
};

export const getUserLogs = async (username: string): Promise<{installationNumber: string, timestamp: string}[]> => {
    const client = ensureClient();
    // Assuming 'search_logs' has 'created_at' column.
    const { data, error } = await client
        .from('search_logs')
        .select('installation_number, created_at')
        .eq('username', username)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw new Error(error.message);

    return data.map((log: any) => ({
        installationNumber: log.installation_number,
        timestamp: log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '-'
    }));
};

// --- Admin Operations ---

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    const client = ensureClient();
    
    // Veritabanı şeması güncellenene kadar hata vermemesi için insert nesnesini dinamik oluşturabiliriz
    // Ancak insert işlemi kesin sütun gerektirir. Kullanıcı SQL'i çalıştırmalı.
    const { error } = await client.from('users').insert([
        {
            username: credential.username,
            password: credential.password,
            full_name: credential.fullName, 
            title: credential.title,        
            allowed_device_id: credential.allowedDeviceId || null,
            skip_device_lock: credential.skipDeviceLock || false,
            can_view_details: credential.canViewDetails || false
        }
    ]);

    if (error) {
        if (error.code === '23505') throw new Error('Bu sicil numarası zaten mevcut.');
        if (error.message.includes('column') && error.message.includes('does not exist')) {
            throw new Error('Veritabanı şeması güncel değil. Lütfen Supabase SQL editöründe gerekli sütunları (full_name, title) ekleyin.');
        }
        throw new Error(error.message);
    }

    return getCredentials();
};

export const deleteCredential = async (username: string): Promise<Credential[]> => {
    const client = ensureClient();
    const { error } = await client
        .from('users')
        .delete()
        .eq('username', username);

    if (error) throw new Error(error.message);

    return getCredentials();
};

export const updateCredential = async (originalUsername: string, updatedCredential: Credential): Promise<Credential[]> => {
    const client = ensureClient();
    const updates: any = {
        username: updatedCredential.username,
        password: updatedCredential.password,
        full_name: updatedCredential.fullName,
        title: updatedCredential.title,
        skip_device_lock: updatedCredential.skipDeviceLock,
        can_view_details: updatedCredential.canViewDetails
    };
    
    if (updatedCredential.allowedDeviceId !== undefined) {
        updates.allowed_device_id = updatedCredential.allowedDeviceId === '' ? null : updatedCredential.allowedDeviceId;
    }

    const { error } = await client
        .from('users')
        .update(updates)
        .eq('username', originalUsername);

    if (error) {
         if (error.message.includes('column') && error.message.includes('does not exist')) {
            throw new Error('Veritabanı şeması güncel değil. "full_name" ve "title" sütunlarını ekleyiniz.');
        }
        throw new Error(error.message);
    }

    return getCredentials();
};

export const resetUserStats = async (username: string): Promise<void> => {
    const client = ensureClient();
    const { error } = await client
        .from('search_logs')
        .delete()
        .eq('username', username);

    if (error) throw new Error(error.message);
};