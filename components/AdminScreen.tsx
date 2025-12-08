import React, { useState, useEffect, useRef } from 'react';
import * as sheetService from '../services/sheetService';
import { 
    UserIcon, LockIcon, TrashIcon, EditIcon, ChartBarIcon, 
    UserGroupIcon, RefreshIcon, DownloadIcon, ReportIcon, 
    LightningIcon, CounterResetIcon 
} from './icons';
import type { Credential, UserActivityStat } from '../types';
import Papa from 'papaparse';

interface AdminScreenProps {
    onLogout: () => void;
}

// Icon for Upload
const UploadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
);

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<'users' | 'stats' | 'data_update'>('stats');
    
    // Data States
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [stats, setStats] = useState<UserActivityStat[]>([]);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [topQueries, setTopQueries] = useState<any[]>([]);
    const [topErrors, setTopErrors] = useState<any[]>([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    
    // Modal States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Credential | null>(null);

    // Form States
    const [formData, setFormData] = useState<Credential>({
        username: '',
        password: '',
        fullName: '',
        title: '',
        allowedDeviceId: '',
        skipDeviceLock: false,
        canViewDetails: false,
        unlimitedAccess: false
    });

    // Upload States
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{total: number, success: number, error: number} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [creds, userStats, logs, top, errors] = await Promise.all([
                sheetService.getCredentials(),
                sheetService.getUserActivityStats(),
                sheetService.getGlobalLogs(20),
                sheetService.getTopQueriedInstallations(),
                sheetService.getTopReportedErrors()
            ]);
            
            setCredentials(creds);
            setStats(userStats);
            setGlobalLogs(logs);
            setTopQueries(top);
            setTopErrors(errors);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError('Veriler yüklenirken hata oluştu: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmitUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingUser) {
                await sheetService.updateCredential(editingUser.username, formData);
                setSuccessMsg('Kullanıcı güncellendi.');
            } else {
                await sheetService.addCredential(formData);
                setSuccessMsg('Yeni kullanıcı eklendi.');
            }
            setShowAddModal(false);
            setEditingUser(null);
            resetForm();
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setError(err.message);
            setTimeout(() => setError(''), 5000);
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`${username} kullanıcısını silmek istediğinize emin misiniz?`)) return;
        try {
            await sheetService.deleteCredential(username);
            loadData();
            setSuccessMsg('Kullanıcı silindi.');
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleResetStats = async (username: string) => {
        if (!confirm(`${username} kullanıcısının tüm arama geçmişini ve sorgu sayaçlarını SIFIRLAMAK istiyor musunuz? Bu işlem geri alınamaz.`)) return;
        try {
            await sheetService.resetUserStats(username);
            loadData();
            setSuccessMsg(`${username} için sayaçlar sıfırlandı.`);
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setError(err.message);
        }
    };

    const openEditModal = (user: Credential) => {
        setEditingUser(user);
        setFormData({
            username: user.username,
            password: user.password,
            fullName: user.fullName || '',
            title: user.title || '',
            allowedDeviceId: user.allowedDeviceId || '',
            skipDeviceLock: user.skipDeviceLock || false,
            canViewDetails: user.canViewDetails || false,
            unlimitedAccess: user.unlimitedAccess || false
        });
        setShowAddModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            password: '',
            fullName: '',
            title: '',
            allowedDeviceId: '',
            skipDeviceLock: false,
            canViewDetails: false,
            unlimitedAccess: false
        });
    };

    // --- Bulk Upload Handlers ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadFile(e.target.files[0]);
            setUploadStatus(null);
        }
    };

    const handleBulkUpload = () => {
        if (!uploadFile) return;

        setIsUploading(true);
        setUploadProgress(0);

        Papa.parse(uploadFile, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    const totalRows = results.data.length;
                    const customers: any[] = [];
                    
                    // Transform CSV data to Customer objects
                    // Beklenen CSV Başlıkları: tesisat_no, ad_soyad, telefon, adres, enlem, boylam
                    results.data.forEach((row: any) => {
                        if (row.tesisat_no) {
                            customers.push({
                                installationNumber: row.tesisat_no,
                                name: row.ad_soyad || '',
                                phone: row.telefon || '',
                                address: row.adres || '',
                                latitude: row.enlem || null,
                                longitude: row.boylam || null
                            });
                        }
                    });

                    // Batch update via service
                    setUploadProgress(50); // Parsing done
                    const result = await sheetService.bulkUpsertCustomers(customers);
                    setUploadProgress(100);
                    
                    setUploadStatus({
                        total: totalRows,
                        success: result.success,
                        error: result.error
                    });
                    
                    if (result.error > 0) {
                        setError(`${result.error} kayıt yüklenirken hata oluştu. Lütfen formatı kontrol edin.`);
                    } else {
                        setSuccessMsg(`${result.success} kayıt başarıyla güncellendi/eklendi.`);
                    }

                } catch (e: any) {
                    setError("CSV İşleme Hatası: " + e.message);
                } finally {
                    setIsUploading(false);
                }
            },
            error: (error) => {
                setError("Dosya Okuma Hatası: " + error.message);
                setIsUploading(false);
            }
        });
    };


    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden font-sans">
            {/* Sidebar */}
            <aside className="w-20 md:w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-between transition-all duration-300 z-20 shadow-2xl">
                <div>
                    <div className="h-24 flex items-center px-6 border-b border-gray-100 dark:border-gray-700">
                        <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30 flex-shrink-0">
                            <span className="text-white font-bold text-xl">A</span>
                        </div>
                        <div className="hidden md:block ml-4">
                            <h1 className="font-black text-gray-800 dark:text-white text-lg tracking-tight">Yönetici Paneli</h1>
                            <p className="text-xs text-gray-400 font-medium">Sistem v2.0</p>
                        </div>
                    </div>

                    <nav className="p-4 space-y-3 mt-4">
                         <button 
                            onClick={() => setActiveTab('stats')}
                            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${activeTab === 'stats' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <ChartBarIcon />
                            <span className="hidden md:block ml-3">Dashboard</span>
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('users')}
                            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${activeTab === 'users' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <UserGroupIcon />
                            <span className="hidden md:block ml-3">Personel Yönetimi</span>
                        </button>

                        <button 
                            onClick={() => setActiveTab('data_update')}
                            className={`w-full flex items-center p-4 rounded-2xl transition-all duration-200 group ${activeTab === 'data_update' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'}`}
                        >
                            <RefreshIcon />
                            <span className="hidden md:block ml-3">Veri Güncelleme</span>
                        </button>
                    </nav>
                </div>
                
                <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center p-3 rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="hidden md:block ml-2">Güvenli Çıkış</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto relative bg-gray-100 dark:bg-gray-900">
                <div className="max-w-7xl mx-auto min-h-full">
                    
                    {/* Header */}
                    <div className="sticky top-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl p-8 flex justify-between items-center z-10 border-b border-gray-200 dark:border-gray-800">
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                {activeTab === 'stats' && 'Genel Bakış'}
                                {activeTab === 'users' && 'Personel Listesi'}
                                {activeTab === 'data_update' && 'Veritabanı İşlemleri'}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mt-1">Sistem Yöneticisi Paneli</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="hidden sm:block text-xs font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1.5 rounded-full">
                                Son Güncelleme: {new Date().toLocaleTimeString()}
                            </span>
                            <button 
                                onClick={loadData} 
                                disabled={loading}
                                className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-lg text-blue-600 hover:text-blue-700 hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 border border-gray-100 dark:border-gray-700"
                                title="Verileri Yenile"
                            >
                                <RefreshIcon />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="px-8 pt-6">
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-300 p-4 rounded-xl mb-4 border border-red-100 dark:border-red-800 flex items-center animate-shake shadow-sm">
                                <span className="font-bold mr-2">Hata:</span> {error}
                            </div>
                        )}
                        {successMsg && (
                            <div className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-300 p-4 rounded-xl mb-4 border border-green-100 dark:border-green-800 flex items-center animate-fade-in shadow-sm">
                                <span className="font-bold mr-2">Başarılı:</span> {successMsg}
                            </div>
                        )}
                    </div>

                    {/* TAB CONTENT: STATS */}
                    {activeTab === 'stats' && (
                        <div className="p-8 grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-20">
                            {/* Left Column: Feed */}
                            <div className="lg:col-span-2 space-y-8">
                                {/* Stats Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-800 p-6 rounded-[2rem] shadow-lg shadow-blue-500/20 text-white relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-125 transition-transform"><UserGroupIcon /></div>
                                        <div className="relative z-10">
                                            <div className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-2">Toplam Personel</div>
                                            <div className="text-4xl font-black">{credentials.length}</div>
                                        </div>
                                    </div>
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-indigo-600 dark:to-purple-800 p-6 rounded-[2rem] shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group">
                                         <div className="absolute top-0 right-0 p-4 opacity-10 transform scale-150 group-hover:scale-125 transition-transform"><ChartBarIcon /></div>
                                         <div className="relative z-10">
                                            <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-2">Günlük Sorgu</div>
                                            <div className="text-4xl font-black">{globalLogs.filter(l => l.timestamp.includes(new Date().getDate().toString())).length}</div>
                                        </div>
                                    </div>
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[2rem] shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                                        <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Sistem Durumu</div>
                                        <div className="flex items-center text-green-500 font-bold text-lg bg-green-50 dark:bg-green-900/20 w-fit px-3 py-1 rounded-full">
                                            <span className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                                            Online
                                        </div>
                                    </div>
                                </div>

                                {/* Live Feed */}
                                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            Canlı Aktivite Akışı
                                        </h3>
                                        <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-md uppercase tracking-wider">Son 20 İşlem</span>
                                    </div>
                                    <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {globalLogs.map((log, i) => (
                                            <div key={i} className="p-4 hover:bg-blue-50/50 dark:hover:bg-gray-700/50 transition-colors flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 flex items-center justify-center text-gray-500 font-bold text-xs shadow-inner">
                                                        {log.username.substring(0,2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                                                            <span className="text-blue-600 dark:text-blue-400">{log.username}</span> bir sorgulama yaptı
                                                        </p>
                                                        <p className="text-xs text-gray-400 flex items-center gap-2 mt-0.5 font-medium">
                                                            <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 rounded text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">{log.installationNumber}</span>
                                                            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                                            <span>{log.timestamp}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    {log.called && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">ARADI</span>}
                                                    {log.smsSent && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">SMS</span>}
                                                    {log.errorReported && <span className="bg-red-100 text-red-700 px-2 py-1 rounded-lg text-[10px] font-bold shadow-sm">HATA BİLDİRDİ</span>}
                                                </div>
                                            </div>
                                        ))}
                                        {globalLogs.length === 0 && (
                                            <div className="p-12 text-center text-gray-400 text-sm flex flex-col items-center">
                                                <div className="w-12 h-12 bg-gray-100 rounded-full mb-3 flex items-center justify-center text-gray-300"><RefreshIcon /></div>
                                                Henüz aktivite yok.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Trends */}
                            <div className="space-y-6">
                                {/* Top Queries */}
                                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-orange-50 to-transparent dark:from-orange-900/10">
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                            <LightningIcon />
                                            <span className="ml-2">Trend Tesisatlar</span>
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {topQueries.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-orange-50 dark:hover:bg-gray-700/50 transition-colors group cursor-default">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${i === 0 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30' : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'}`}>{i+1}</span>
                                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{item.installationNumber}</span>
                                                </div>
                                                <span className="text-xs font-bold text-gray-400 group-hover:text-orange-500 transition-colors">{item.count} kez</span>
                                            </div>
                                        ))}
                                        {topQueries.length === 0 && <div className="p-4 text-center text-xs text-gray-400">Veri yok</div>}
                                    </div>
                                </div>

                                {/* Top Reported Errors */}
                                <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-red-50 to-transparent dark:from-red-900/10">
                                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center">
                                            <ReportIcon />
                                            <span className="ml-2">Hatalı Numaralar</span>
                                        </h3>
                                    </div>
                                    <div className="p-4 space-y-2">
                                        {topErrors.map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/30 hover:bg-red-50 dark:hover:bg-gray-700/50 transition-colors group">
                                                <div className="flex items-center gap-3">
                                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                                    <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{item.installationNumber}</span>
                                                </div>
                                                <span className="text-xs font-bold text-red-500 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded-md">{item.count}</span>
                                            </div>
                                        ))}
                                        {topErrors.length === 0 && <div className="p-4 text-center text-xs text-gray-400">Hata bildirimi yok</div>}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: USERS */}
                    {activeTab === 'users' && (
                        <div className="p-8 animate-fade-in pb-20">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Kayıtlı Personeller</h2>
                                    <p className="text-sm text-gray-500">Toplam {credentials.length} kullanıcı</p>
                                </div>
                                <button 
                                    onClick={() => { resetForm(); setShowAddModal(true); setEditingUser(null); }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg shadow-blue-500/30 flex items-center transition-all transform hover:-translate-y-0.5 active:scale-95"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                    </svg>
                                    Yeni Personel Ekle
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {credentials.map((user) => (
                                    <div key={user.username} className="bg-white dark:bg-gray-800 rounded-[1.5rem] p-6 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-xl transition-all duration-300 relative group flex flex-col h-full">
                                        {/* Card Header */}
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-14 h-14 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-2xl flex items-center justify-center text-gray-500 dark:text-gray-300 font-black text-xl shadow-inner">
                                                    {user.username.substring(0, 1).toUpperCase()}
                                                </div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg leading-tight">{user.fullName || user.username}</h3>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mt-0.5">{user.title || 'Personel'}</p>
                                                    <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                                        {user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Permissions Grid */}
                                        <div className="space-y-3 mb-6 bg-gray-50 dark:bg-gray-700/20 p-4 rounded-xl">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.skipDeviceLock ? 'bg-orange-500' : 'bg-green-500'}`}></div>
                                                    Cihaz Kilidi
                                                </span>
                                                <span className={`font-bold text-xs ${user.skipDeviceLock ? 'text-orange-600' : 'text-green-600'}`}>
                                                    {user.skipDeviceLock ? 'Devre Dışı' : 'Aktif'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.canViewDetails ? 'bg-blue-500' : 'bg-gray-400'}`}></div>
                                                    Detay Gör
                                                </span>
                                                <span className={`font-bold text-xs ${user.canViewDetails ? 'text-blue-600' : 'text-gray-500'}`}>
                                                    {user.canViewDetails ? 'Yetkili' : 'Kısıtlı'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500 dark:text-gray-400 font-medium flex items-center gap-2">
                                                    <div className={`w-1.5 h-1.5 rounded-full ${user.unlimitedAccess ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
                                                    Erişim
                                                </span>
                                                <span className={`font-bold text-xs ${user.unlimitedAccess ? 'text-purple-600' : 'text-gray-500'}`}>
                                                    {user.unlimitedAccess ? '7/24 Limitsiz' : 'Mesai Saati'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer Stats & Actions */}
                                        <div className="mt-auto">
                                            <div className="flex items-center justify-between text-sm pb-4 border-b border-gray-100 dark:border-gray-700 mb-4">
                                                <span className="text-gray-400 text-xs font-bold uppercase">Toplam Sorgu</span>
                                                <span className="font-black text-xl text-gray-800 dark:text-white">
                                                    {stats.find(s => s.username === user.username)?.queryCount || 0}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-3 gap-2">
                                                {/* SAYAÇ SIFIRLA BUTONU */}
                                                <button 
                                                    onClick={() => handleResetStats(user.username)}
                                                    className="col-span-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-600 dark:text-amber-400 py-2.5 rounded-xl text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1 border border-amber-100 dark:border-amber-900/30"
                                                    title="Sorgu sayacını ve geçmişi sıfırla"
                                                >
                                                    <CounterResetIcon />
                                                    <span>Sıfırla</span>
                                                </button>

                                                <button 
                                                    onClick={() => openEditModal(user)}
                                                    className="col-span-1 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 py-2.5 rounded-xl text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1 border border-gray-200 dark:border-gray-600"
                                                >
                                                    <EditIcon />
                                                    <span>Düzenle</span>
                                                </button>
                                                
                                                <button 
                                                    onClick={() => handleDeleteUser(user.username)}
                                                    className="col-span-1 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-500 py-2.5 rounded-xl text-xs font-bold transition-colors flex flex-col items-center justify-center gap-1 border border-red-100 dark:border-red-900/30"
                                                >
                                                    <TrashIcon />
                                                    <span>Sil</span>
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: DATA UPDATE */}
                    {activeTab === 'data_update' && (
                        <div className="p-8 md:p-12 animate-fade-in flex flex-col items-center gap-8 pb-20">
                            
                            {/* Database Maintenance Card */}
                            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl p-8 border border-amber-100 dark:border-amber-900/30 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 dark:bg-amber-900/20 rounded-full -mr-10 -mt-10 blur-2xl"></div>
                                <div className="flex items-start gap-5 relative z-10">
                                    <div className="p-4 bg-amber-100 dark:bg-amber-900/40 rounded-2xl text-amber-600 dark:text-amber-400 shadow-inner">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                                        </svg>
                                    </div>
                                    <div className="flex-grow">
                                        <h3 className="font-bold text-gray-900 dark:text-white text-xl">Veritabanı Bakımı</h3>
                                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 leading-relaxed">
                                            "Hatalı Numara Bildirimi" ve diğer yeni özelliklerin çalışması için veritabanı şemasını güncel tutun.
                                        </p>
                                        
                                        <div className="mt-6 bg-gray-900 rounded-xl p-5 relative group shadow-lg border border-gray-700">
                                            <div className="absolute top-3 left-3 flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
                                            </div>
                                            <code className="font-mono text-xs text-green-400 block break-all mt-4 leading-relaxed">
                                                alter table search_logs add column if not exists error_reported boolean default false;
                                            </code>
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText("alter table search_logs add column if not exists error_reported boolean default false;");
                                                    setSuccessMsg("SQL Kodu Kopyalandı!");
                                                    setTimeout(() => setSuccessMsg(""), 3000);
                                                }}
                                                className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white text-[10px] px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wider"
                                            >
                                                Kopyala
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-[2rem] shadow-xl p-8 border border-gray-100 dark:border-gray-700">
                                <div className="text-center mb-8">
                                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Toplu Veri Yükleme</h2>
                                    <p className="text-gray-500 dark:text-gray-400 mt-2">CSV dosyası yükleyerek abone listesini güncelleyin.</p>
                                </div>
                                
                                <div className="space-y-6">
                                    {/* Upload Area */}
                                    <div 
                                        className={`border-3 border-dashed rounded-[2rem] p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group ${
                                            isUploading 
                                                ? 'border-gray-300 bg-gray-50 opacity-50 cursor-wait' 
                                                : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-500'
                                        }`}
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                    >
                                        <input 
                                            type="file" 
                                            ref={fileInputRef} 
                                            onChange={handleFileChange} 
                                            accept=".csv" 
                                            className="hidden" 
                                        />
                                        <div className="transform group-hover:scale-110 transition-transform duration-300">
                                            <UploadIcon />
                                        </div>
                                        {uploadFile ? (
                                            <div className="text-center mt-4">
                                                <p className="font-bold text-blue-600 dark:text-blue-400 text-lg">{uploadFile.name}</p>
                                                <p className="text-xs text-gray-400 mt-1">{(uploadFile.size / 1024).toFixed(2)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="text-center mt-4">
                                                <p className="font-bold text-gray-600 dark:text-gray-300 text-lg">Dosya Seçmek İçin Tıklayın</p>
                                                <p className="text-xs text-gray-400 mt-1">Sürükleyip bırakabilir veya tıklayabilirsiniz</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Progress Bar */}
                                    {isUploading && (
                                        <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700 overflow-hidden relative shadow-inner">
                                            <div 
                                                className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-300 flex items-center justify-center text-[8px] text-white font-bold shadow-lg" 
                                                style={{ width: `${uploadProgress}%` }}
                                            >
                                                {uploadProgress}%
                                            </div>
                                            <div className="absolute inset-0 bg-white/30 animate-pulse w-full h-full"></div>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <button 
                                        onClick={handleBulkUpload} 
                                        disabled={!uploadFile || isUploading}
                                        className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-2xl shadow-xl shadow-green-500/30 hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 flex items-center justify-center text-lg"
                                    >
                                        {isUploading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Veriler İşleniyor...
                                            </>
                                        ) : 'Yüklemeyi Başlat'}
                                    </button>

                                    {/* Status Report */}
                                    {uploadStatus && (
                                        <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 grid grid-cols-3 gap-4 text-center">
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam</p>
                                                <p className="text-2xl font-black text-gray-800 dark:text-white mt-1">{uploadStatus.total}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-green-600 uppercase tracking-wider">Başarılı</p>
                                                <p className="text-2xl font-black text-green-600 mt-1">{uploadStatus.success}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs font-bold text-red-600 uppercase tracking-wider">Hatalı</p>
                                                <p className="text-2xl font-black text-red-600 mt-1">{uploadStatus.error}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Format Info */}
                                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-sm">
                                        <p className="font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-2"></span>
                                            Gerekli CSV Sütun Başlıkları
                                        </p>
                                        <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-xl font-mono text-xs text-gray-600 dark:text-gray-400 overflow-x-auto border border-gray-200 dark:border-gray-800">
                                            tesisat_no, ad_soyad, telefon, adres, enlem, boylam
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-[2rem] p-8 shadow-2xl overflow-y-auto max-h-[90vh] animate-soft-slide-up border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                                {editingUser ? 'Personel Düzenle' : 'Yeni Personel Ekle'}
                            </h2>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmitUser} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Sicil No</label>
                                    <input 
                                        type="text" 
                                        name="username" 
                                        value={formData.username} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                        required 
                                        readOnly={!!editingUser}
                                        placeholder="Kullanıcı Adı"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Şifre</label>
                                    <input 
                                        type="text" 
                                        name="password" 
                                        value={formData.password} 
                                        onChange={handleInputChange} 
                                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                        required 
                                        placeholder="••••••"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Ad Soyad</label>
                                <input 
                                    type="text" 
                                    name="fullName" 
                                    value={formData.fullName || ''} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                    placeholder="Tam İsim"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Ünvan</label>
                                <input 
                                    type="text" 
                                    name="title" 
                                    value={formData.title || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Örn: Saha Operasyon Uzmanı"
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                />
                            </div>

                            {/* Switches */}
                            <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-2xl space-y-4 border border-gray-100 dark:border-gray-700">
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">Cihaz Kilidini Devre Dışı Bırak</span>
                                    <input 
                                        type="checkbox" 
                                        name="skipDeviceLock" 
                                        checked={formData.skipDeviceLock} 
                                        onChange={handleInputChange} 
                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">İsim Soyisim Görme Yetkisi</span>
                                    <input 
                                        type="checkbox" 
                                        name="canViewDetails" 
                                        checked={formData.canViewDetails} 
                                        onChange={handleInputChange} 
                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                    />
                                </label>
                                <label className="flex items-center justify-between cursor-pointer group">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300 group-hover:text-blue-600 transition-colors">7/24 Sınırsız Erişim</span>
                                    <input 
                                        type="checkbox" 
                                        name="unlimitedAccess" 
                                        checked={formData.unlimitedAccess} 
                                        onChange={handleInputChange} 
                                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer"
                                    />
                                </label>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-500 mb-1.5 block uppercase tracking-wider">Cihaz Kimliği (Opsiyonel)</label>
                                <input 
                                    type="text" 
                                    name="allowedDeviceId" 
                                    value={formData.allowedDeviceId || ''} 
                                    onChange={handleInputChange} 
                                    placeholder="Sıfırlamak için boş bırakın"
                                    className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3.5 font-mono text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                                />
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button 
                                    type="button" 
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold rounded-xl transition-colors"
                                >
                                    İptal
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-colors"
                                >
                                    Kaydet
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};