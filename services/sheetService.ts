import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from '../config';
import type { Credential, Customer, UserActivityStat, Announcement } from '../types';

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
    } catch (e: any) {
        console.error("Müşteri sayısı alınamadı:", e.message || e);
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
        unlimitedAccess: user.unlimited_access, // Yeni alan
        // DÜZELTME: Tarihi ISO formatında ham olarak gönderiyoruz, formatlama UI'da yapılacak
        lastLogin: user.last_login 
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
export const authenticateUser = async (username: string, password: string, deviceId: string): Promise<{ canViewDetails: boolean, fullName?: string, unlimitedAccess?: boolean }> => {
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
        fullName: user.full_name,
        unlimitedAccess: user.unlimited_access || false
    };
};

export const logSearchQuery = async (username: string, installationNumber: string): Promise<number | null> => {
    try {
        const client = ensureClient();
        // ID'yi alabilmek için select() yetkisi gerekir (RLS)
        const { data, error } = await client.from('search_logs').insert([
            { username, installation_number: installationNumber }
        ]).select('id').single();
        
        if (error) {
            if (error.code === "42501") {
                console.warn("Loglama yapıldı ancak ID alınamadı. RLS Politikaları eksik olabilir. (INSERT başarılı, SELECT başarısız)");
                return null;
            }
            throw error;
        }
        return data?.id || null;
    } catch (e) {
        console.warn("Loglama hatası:", e);
        return null;
    }
};

export const updateSearchLogAction = async (logId: number, actionType: 'call' | 'sms' | 'report_error'): Promise<void> => {
    try {
        const client = ensureClient();
        const updates: any = {};
        
        if (actionType === 'call') updates.called = true;
        if (actionType === 'sms') updates.sms_sent = true;
        if (actionType === 'report_error') updates.error_reported = true;

        const { error } = await client
            .from('search_logs')
            .update(updates)
            .eq('id', logId);

        if (error) {
             // 42703 is Postgres code for undefined_column
             if (error.code === '42703' || (error.message && error.message.includes('does not exist'))) {
                 console.warn(`Veritabanı şeması güncel değil: '${actionType === 'report_error' ? 'error_reported' : 'called/sms_sent'}' sütunu yok. (Hata bastırıldı)`);
             } else {
                 console.error("Aksiyon loglama hatası:", error);
             }
        }
    } catch (e) {
        console.error("Aksiyon update hatası:", e);
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
        // DÜZELTME: Tarihi ISO formatında ham olarak gönderiyoruz, formatlama UI'da yapılacak
        lastLogin: user.last_login
    }));
};

export const getTopQueriedInstallations = async (limit: number = 5): Promise<{installationNumber: string, count: number}[]> => {
    try {
        const client = ensureClient();
        // Son 1000 kaydı çekip istemci tarafında analiz ediyoruz (View oluşturmadan trend analizi)
        const { data, error } = await client
            .from('search_logs')
            .select('installation_number')
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) throw new Error(error.message);

        const counts: Record<string, number> = {};
        data?.forEach((row: any) => {
            if (row.installation_number) {
                const num = row.installation_number;
                counts[num] = (counts[num] || 0) + 1;
            }
        });

        // Objeyi diziye çevir, sırala ve limitle
        return Object.entries(counts)
            .map(([installationNumber, count]) => ({ installationNumber, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch (e: any) {
        console.error("Trend analizi hatası:", e.message || e);
        return [];
    }
};

export const getTopReportedErrors = async (limit: number = 5): Promise<{installationNumber: string, count: number}[]> => {
    try {
        const client = ensureClient();
        // Hata bildirilmiş kayıtları çek
        const { data, error } = await client
            .from('search_logs')
            .select('installation_number')
            .eq('error_reported', true)
            .order('created_at', { ascending: false })
            .limit(1000);

        if (error) {
             if (error.code === '42703' || (error.message && error.message.includes('does not exist'))) {
                 return [];
             }
             throw new Error(error.message);
        }

        const counts: Record<string, number> = {};
        data?.forEach((row: any) => {
            if (row.installation_number) {
                const num = row.installation_number;
                counts[num] = (counts[num] || 0) + 1;
            }
        });

        return Object.entries(counts)
            .map(([installationNumber, count]) => ({ installationNumber, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, limit);
    } catch (e: any) {
        if (e.message && e.message.includes('does not exist')) {
            return [];
        }
        console.error("Hata raporu analizi hatası:", e.message || e);
        return [];
    }
};

export const getGlobalLogs = async (limit: number = 20): Promise<{
    username: string,
    installationNumber: string, 
    timestamp: string,
    called?: boolean,
    smsSent?: boolean
}[]> => {
    const client = ensureClient();
    
    const { data, error } = await client
        .from('search_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

    if (error) {
        console.error("Global log error:", error);
        return [];
    }

    return data.map((log: any) => ({
        username: log.username,
        installationNumber: log.installation_number,
        timestamp: log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '-',
        called: log.called || false,
        smsSent: log.sms_sent || false
    }));
};

export const getUserLogs = async (username: string): Promise<{
    installationNumber: string, 
    timestamp: string,
    called?: boolean,
    smsSent?: boolean,
    errorReported?: boolean
}[]> => {
    const client = ensureClient();
    
    const { data, error } = await client
        .from('search_logs')
        .select('*')
        .eq('username', username)
        .order('created_at', { ascending: false })
        .limit(100);

    if (error) throw new Error(error.message);

    return data.map((log: any) => ({
        installationNumber: log.installation_number,
        timestamp: log.created_at ? new Date(log.created_at).toLocaleString('tr-TR') : '-',
        called: log.called || false,
        smsSent: log.sms_sent || false,
        errorReported: log.error_reported || false
    }));
};

// --- ANNOUNCEMENT SYSTEM ---

export const createAnnouncement = async (announcement: Announcement): Promise<void> => {
    const client = ensureClient();
    
    try {
        // Önceki aktif duyuruları pasife çek
        // Hata oluşursa (tablo yoksa) görmezden gel, insert aşamasında yakalayacağız
        try {
            await client
                .from('announcements')
                .update({ active: false })
                .eq('active', true);
        } catch (e) {
            // ignore
        }

        const { error } = await client.from('announcements').insert([
            {
                title: announcement.title,
                content: announcement.content,
                image_url: announcement.imageUrl, // Base64 or URL
                target_users: announcement.targetUsers,
                active: true
            }
        ]);

        if (error) {
            throw error;
        }
    } catch (e: any) {
        // Tablo Eksik (42P01) VEYA Yetki Hatası (42501 - RLS Policy Violation)
        const isTableMissing = e.code === '42P01' || (e.message && e.message.includes('does not exist')) || (e.message && e.message.includes('Could not find the table'));
        const isPolicyError = e.code === '42501' || (e.message && e.message.includes('row-level security policy'));

        if (isTableMissing || isPolicyError) {
             const sql = `
-- Tablo yoksa oluştur
create table if not exists public.announcements (
  id bigint generated by default as identity primary key,
  title text not null,
  content text not null,
  image_url text,
  target_users text[] not null default '{all}',
  active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS Etkinleştir
alter table public.announcements enable row level security;

-- Eski/Hatalı Politikaları Temizle
drop policy if exists "Enable read access for all users" on public.announcements;
drop policy if exists "Enable insert for authenticated users only" on public.announcements;
drop policy if exists "Enable update for authenticated users only" on public.announcements;
drop policy if exists "Allow public read" on public.announcements;
drop policy if exists "Allow public insert" on public.announcements;
drop policy if exists "Allow public update" on public.announcements;

-- Anonim/Public Erişime İzin Ver (Uygulama katmanında yetki kontrolü yapıldığı için)
create policy "Allow public read" on public.announcements for select to public using (true);
create policy "Allow public insert" on public.announcements for insert to public with check (true);
create policy "Allow public update" on public.announcements for update to public using (true);`;

             throw new Error(`Veritabanı Yapılandırma Hatası! Lütfen Supabase SQL Editöründe şu kodu çalıştırın:\n\n${sql}`);
        }
        throw e;
    }
};

export const getActiveAnnouncement = async (username: string): Promise<Announcement | null> => {
    try {
        const client = ensureClient();
        
        // Aktif olan tüm duyuruları en yeniden eskiye doğru çek
        const { data, error } = await client
            .from('announcements')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) {
            return null;
        }

        if (data && data.length > 0) {
            // Kullanıcıya uygun olan İLK duyuruyu bul
            const match = data.find((item: any) => {
                const targetUsers = item.target_users || ['all'];
                return targetUsers.includes('all') || targetUsers.includes(username);
            });

            if (match) {
                return {
                    id: match.id,
                    title: match.title,
                    content: match.content,
                    imageUrl: match.image_url,
                    targetUsers: match.target_users || ['all'],
                    active: match.active,
                    createdAt: match.created_at
                };
            }
        }
        
        return null;
    } catch (e) {
        // Tablo yoksa sessizce geç
        return null;
    }
};


// --- Admin Operations ---

export const addCredential = async (credential: Credential): Promise<Credential[]> => {
    const client = ensureClient();
    
    const { error } = await client.from('users').insert([
        {
            username: credential.username,
            password: credential.password,
            full_name: credential.fullName, 
            title: credential.title,        
            allowed_device_id: credential.allowedDeviceId || null,
            skip_device_lock: credential.skipDeviceLock || false,
            can_view_details: credential.canViewDetails || false,
            unlimited_access: credential.unlimitedAccess || false
        }
    ]);

    if (error) {
        if (error.code === '23505') throw new Error('Bu sicil numarası zaten mevcut.');
        
        const msg = error.message || '';
        if (msg.includes('Could not find the') || (msg.includes('column') && msg.includes('does not exist'))) {
             throw new Error("Veritabanı Hatası: 'unlimited_access' (veya başka bir) sütun eksik. Lütfen Supabase SQL Editöründe gerekli sütunları ekleyin.");
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
        can_view_details: updatedCredential.canViewDetails,
        unlimited_access: updatedCredential.unlimitedAccess
    };
    
    if (updatedCredential.allowedDeviceId !== undefined) {
        updates.allowed_device_id = updatedCredential.allowedDeviceId === '' ? null : updatedCredential.allowedDeviceId;
    }

    const { error } = await client
        .from('users')
        .update(updates)
        .eq('username', originalUsername);

    if (error) {
        const msg = error.message || '';
        if (msg.includes('Could not find the') || (msg.includes('column') && msg.includes('does not exist'))) {
             throw new Error("Veritabanı Hatası: 'unlimited_access' sütunu eksik.");
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

export const resetUserDevice = async (username: string): Promise<void> => {
    const client = ensureClient();
    const { error } = await client
        .from('users')
        .update({ allowed_device_id: null })
        .eq('username', username);

    if (error) throw new Error(error.message);
};

// --- Bulk Data Operations ---

export const bulkUpsertCustomers = async (customers: Customer[]): Promise<{success: number, error: number, message?: string}> => {
    const client = ensureClient();
    
    const formattedData = customers.map(c => ({
        installation_number: c.installationNumber,
        name: c.name,
        phone: c.phone,
        address: c.address,
        latitude: c.latitude,
        longitude: c.longitude
    }));

    const BATCH_SIZE = 1000;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
        const batch = formattedData.slice(i, i + BATCH_SIZE);
        
        const { error } = await client
            .from('customers')
            .upsert(batch, { onConflict: 'installation_number' });

        if (error) {
            console.error("Batch error:", error);
            errorCount += batch.length;
        } else {
            successCount += batch.length;
        }
    }

    return { success: successCount, error: errorCount };
};