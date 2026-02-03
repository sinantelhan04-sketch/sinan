

import React, { useState, useEffect, useRef } from 'react';
import * as sheetService from '../services/sheetService';
import { 
    UserIcon, LockIcon, TrashIcon, EditIcon, ChartBarIcon, 
    UserGroupIcon, RefreshIcon, DownloadIcon, ReportIcon, 
    LightningIcon, CounterResetIcon, SearchIcon, PhoneIconSolid, MessageIcon,
    DeviceResetIcon
} from './icons';
import type { Credential, UserActivityStat } from '../types';
import Papa from 'papaparse';
import AnnouncementModal from './AnnouncementModal';

interface AdminScreenProps {
    onLogout: () => void;
}

const PREDEFINED_TITLES = [
    "Saha Operasyon Uzmanı",
    "Ölçüm ve Tahakkuk Şefi",
    "Sayaç Okuma Personeli",
    "Kaçak Kontrol Ekibi",
    "Müşteri Hizmetleri",
    "Sistem Yöneticisi",
    "Saha Personeli",
    "Stajyer"
];

// --- Yeni İkonlar ve UI Bileşenleri ---
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);

const CrownIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 2a1 1 0 01.832.445l1.666 2.499 2.917-.583a1 1 0 011.166 1.167l-.583 2.916 2.499 1.667a1 1 0 010 1.666l-2.499 1.667.583 2.916a1 1 0 01-1.166 1.167l-2.917-.583-1.666 2.499a1 1 0 01-1.664 0l-1.666-2.499-2.917.583a1 1 0 01-1.166-1.167l.583-2.916-2.499-1.667a1 1 0 010-1.666l2.499-1.667-.583-2.916a1 1 0 011.166-1.167l2.917.583 1.666-2.499A1 1 0 0110 2z" clipRule="evenodd" />
    </svg>
);

const MegaphoneIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M18 3a1 1 0 00-1.447-.894L8.763 6H5a3 3 0 000 6h.28l1.771 5.316A1 1 0 008 18h1a1 1 0 001-1v-4.382l6.553 3.276A1 1 0 0018 15V3z" clipRule="evenodd" />
    </svg>
);

const MedalIcon = ({ rank }: { rank: number }) => {
    let colorClass = "text-gray-400 bg-gray-100";
    if (rank === 1) colorClass = "text-yellow-600 bg-yellow-100";
    if (rank === 2) colorClass = "text-gray-600 bg-gray-200";
    if (rank === 3) colorClass = "text-orange-600 bg-orange-100";

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${colorClass}`}>
            {rank === 1 ? <CrownIcon /> : rank}
        </div>
    );
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'users' | 'details' | 'update' | 'announcement'>('users');
    
    // Data States
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [stats, setStats] = useState<UserActivityStat[]>([]);
    const [totalQueries, setTotalQueries] = useState<number>(0);
    const [topQueries, setTopQueries] = useState<any[]>([]);
    const [reportedErrors, setReportedErrors] = useState<any[]>([]);
    const [totalCustomerCount, setTotalCustomerCount] = useState<number>(0);
    
    // Detail View State
    const [selectedDetailUser, setSelectedDetailUser] = useState<string>('');
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    
    // Modal & Form States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Credential | null>(null);
    const [formData, setFormData] = useState<Credential>({
        username: '', password: '', fullName: '', title: PREDEFINED_TITLES[0],
        allowedDeviceId: '', skipDeviceLock: false, canViewDetails: false, unlimitedAccess: false
    });

    // Upload States
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{total: number, success: number, error: number} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Announcement States
    const [announcementForm, setAnnouncementForm] = useState({
        title: '',
        content: '',
        targetUsers: ['all'],
        imageFile: null as File | null,
        imageUrl: ''
    });
    const [showAnnouncementPreview, setShowAnnouncementPreview] = useState(false);
    const [isSendingAnnouncement, setIsSendingAnnouncement] = useState(false);
    const announcementImageRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [creds, userStats, logs, top, reports, count] = await Promise.all([
                sheetService.getCredentials(),
                sheetService.getUserActivityStats(),
                sheetService.getGlobalLogs(1000), // Get enough for counts
                sheetService.getTopQueriedInstallations(5),
                sheetService.getTopReportedErrors(5),
                sheetService.getTotalCustomerCount()
            ]);
            
            setCredentials(creds);
            setStats(userStats);
            setTotalQueries(logs.length);
            setTopQueries(top);
            setReportedErrors(reports);
            setTotalCustomerCount(count);
            setError('');
        } catch (err: any) {
            console.error(err);
            setError('Veriler yüklenirken hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    // --- Hesaplamalar ---
    const onlineCount = stats.filter(s => new Date(s.lastLogin).toDateString() === new Date().toDateString()).length;
    
    // Ayın Personeli (En çok sorgu yapan)
    const topPerformer = stats.reduce((prev, current) => {
        return (prev.queryCount > current.queryCount) ? prev : current;
    }, { username: '-', queryCount: 0, lastLogin: '' } as UserActivityStat);
    
    const topPerformerDetails = credentials.find(c => c.username === topPerformer.username);

    // --- Handlers ---
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
        }
    };

    const handleDeleteUser = async (username: string) => {
        if (!confirm(`${username} silinsin mi?`)) return;
        try {
            await sheetService.deleteCredential(username);
            setSuccessMsg('Kullanıcı silindi.');
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) { setError(err.message); }
    };

    const handleResetStats = async (username: string) => {
        if (!confirm(`${username} kullanıcısının sorgu sayısını sıfırlamak istediğinize emin misiniz?`)) return;
        try {
            await sheetService.resetUserStats(username);
            setSuccessMsg(`${username} sorguları sıfırlandı.`);
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) { setError(err.message); }
    };

    const handleResetDevice = async (username: string) => {
        if (!confirm(`${username} kullanıcısının cihaz kilidini sıfırlamak istediğinize emin misiniz?`)) return;
        try {
            await sheetService.resetUserDevice(username);
            setSuccessMsg('Cihaz kilidi sıfırlandı.');
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) { setError(err.message); }
    };

    const handleUserSelectForDetail = async (username: string) => {
        setSelectedDetailUser(username);
        if (username) {
            setDetailLoading(true);
            try {
                const logs = await sheetService.getUserLogs(username);
                setUserLogs(logs);
            } catch (err) {
                console.error(err);
            } finally {
                setDetailLoading(false);
            }
        } else {
            setUserLogs([]);
        }
    };

    const handleViewDetails = (username: string) => {
        setActiveTab('details');
        handleUserSelectForDetail(username);
    };

    const resetForm = () => {
        setFormData({
            username: '', password: '', fullName: '', title: PREDEFINED_TITLES[0],
            allowedDeviceId: '', skipDeviceLock: false, canViewDetails: false, unlimitedAccess: false
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
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
            delimiter: "", // Otomatik algıla (hem virgül hem noktalı virgül desteği için)
            complete: async (results) => {
                try {
                    setUploadProgress(50);
                    const customers: any[] = [];
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
                    const result = await sheetService.bulkUpsertCustomers(customers);
                    setUploadProgress(100);
                    setUploadStatus({ total: results.data.length, success: result.success, error: result.error });
                    setSuccessMsg(`${result.success} kayıt yüklendi.`);
                    loadData(); 
                    setTimeout(() => setSuccessMsg(''), 5000);
                } catch (e: any) { setError(e.message); } 
                finally { setIsUploading(false); }
            }
        });
    };

    const downloadSampleCsv = () => {
        // Excel uyumluluğu için ayırıcı olarak noktalı virgül (;) kullanıyoruz.
        // BOM (\uFEFF) Türkçe karakterler için zorunlu.
        const headers = ["tesisat_no", "ad_soyad", "telefon", "adres", "enlem", "boylam"];
        const row = ["10001234", "Örnek Abone", "5551234567", "Merkez Mah. Cumhuriyet Cad. No:1", "41.0082", "28.9784"];
        
        // Sütunları noktalı virgül ile birleştir
        const csvContent = "\uFEFF" + headers.join(";") + "\n" + row.join(";");
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'ornek_sablon.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // --- Announcement Handlers ---
    const handleAnnouncementImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setAnnouncementForm(prev => ({
                    ...prev,
                    imageFile: file,
                    imageUrl: reader.result as string
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleTargetUserToggle = (username: string) => {
        setAnnouncementForm(prev => {
            const current = [...prev.targetUsers];
            if (username === 'all') {
                return { ...prev, targetUsers: ['all'] };
            }
            
            // Eğer 'all' seçiliyse ve başka bir şey seçildiyse 'all'ı kaldır
            const allIndex = current.indexOf('all');
            if (allIndex > -1) {
                current.splice(allIndex, 1);
            }

            const idx = current.indexOf(username);
            if (idx > -1) {
                current.splice(idx, 1);
            } else {
                current.push(username);
            }
            
            if (current.length === 0) return { ...prev, targetUsers: ['all'] };

            return { ...prev, targetUsers: current };
        });
    };

    const handleSendAnnouncement = async () => {
        if (!announcementForm.title || !announcementForm.content) {
            setError('Başlık ve mesaj içeriği zorunludur.');
            setTimeout(() => setError(''), 3000);
            return;
        }
        if (announcementForm.targetUsers.length === 0) {
            setError('En az bir hedef kullanıcı seçmelisiniz.');
            setTimeout(() => setError(''), 3000);
            return;
        }

        if(!confirm('Bu duyuruyu yayınlamak istediğinize emin misiniz?')) return;

        setIsSendingAnnouncement(true);
        try {
            await sheetService.createAnnouncement({
                title: announcementForm.title,
                content: announcementForm.content,
                imageUrl: announcementForm.imageUrl || null,
                targetUsers: announcementForm.targetUsers,
                active: true
            });
            setSuccessMsg('Duyuru başarıyla yayınlandı!');
            setAnnouncementForm({ title: '', content: '', targetUsers: ['all'], imageFile: null, imageUrl: '' });
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (e: any) {
            setError(e.message);
            // Uzun bir hata mesajıysa (örn SQL kodu) timeout koyma ki kopyalayabilsin
            if (!e.message.includes('create table')) {
                setTimeout(() => setError(''), 5000);
            }
        } finally {
            setIsSendingAnnouncement(false);
        }
    };

    const filteredUsers = credentials.filter(user => 
        user.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
        (user.fullName && user.fullName.toLowerCase().includes(userSearchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 w-full font-sans text-gray-800 dark:text-gray-100">
            {/* --- Toast Bildirimleri (SAĞ ÜST KÖŞE) --- */}
            {(successMsg || error) && (
                <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 animate-fade-in max-w-lg w-full px-4">
                    {successMsg && (
                        <div className="bg-white dark:bg-gray-800 border-l-4 border-green-500 shadow-xl rounded-lg p-4 flex items-center">
                            <div className="bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full p-2 mr-3 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-green-600 text-sm">Başarılı</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">{successMsg}</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-white dark:bg-gray-800 border-l-4 border-red-500 shadow-xl rounded-lg p-4 relative">
                            <button onClick={() => setError('')} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex items-start">
                                <div className="bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full p-2 mr-3 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="w-full overflow-hidden">
                                    <h4 className="font-bold text-red-600 text-sm">Hata</h4>
                                    {error.includes('create table') ? (
                                        <div className="mt-2">
                                            <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">Veritabanında gerekli tablo eksik. Lütfen aşağıdaki kodu kopyalayıp Supabase SQL Editöründe çalıştırın:</p>
                                            <div className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-[10px] font-mono overflow-x-auto text-gray-800 dark:text-gray-200 border border-gray-200 dark:border-gray-700 relative group">
                                                <pre>{error.split(':\n\n')[1] || error}</pre>
                                                <button 
                                                    onClick={() => navigator.clipboard.writeText(error.split(':\n\n')[1] || error)}
                                                    className="absolute top-1 right-1 bg-blue-500 text-white px-2 py-1 rounded text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    Kopyala
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600 dark:text-gray-300 break-words">{error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- Üst Header --- */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                        <ChartBarIcon />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white leading-none">Yönetim Paneli</h1>
                        <span className="text-[10px] font-bold text-blue-500 tracking-widest uppercase">Sistem Kontrol & İzleme</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={loadData} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                        <RefreshIcon />
                    </button>
                    <button 
                        onClick={onLogout}
                        className="px-5 py-2 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl text-sm font-bold transition-colors flex items-center"
                    >
                        Güvenli Çıkış
                        <svg className="w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto p-6 space-y-8">
                
                {/* --- KPI Kartları (Dashboard) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Kart 1: Toplam Tesisat */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                            <DatabaseIcon />
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Toplam Tesisat</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{totalCustomerCount.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="mt-4 flex items-center">
                            <span className="px-2 py-1 bg-cyan-50 text-cyan-600 text-[10px] font-bold rounded-md">Veritabanı Aktif</span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-500"></div>
                    </div>

                    {/* Kart 2: Personel Durumu */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <UserGroupIcon />
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Personel Durumu</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{credentials.length}</span>
                            <span className="text-sm font-medium text-gray-400 mb-1">Kayıtlı</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="flex items-center px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded-md">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                {onlineCount} Çevrimiçi
                            </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-green-500"></div>
                    </div>

                    {/* Kart 3: Toplam Sorgu */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-[24px] shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden group hover:shadow-md transition-shadow">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                            <SearchIcon />
                        </div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Toplam Sorgu</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-gray-900 dark:text-white">{totalQueries}</span>
                        </div>
                        <div className="mt-4 w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: '60%' }}></div>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                    </div>

                    {/* Kart 4: Ayın Personeli */}
                    <div className="bg-gradient-to-br from-purple-600 to-indigo-700 p-6 rounded-[24px] shadow-lg shadow-purple-500/20 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 text-yellow-300">
                             <LightningIcon />
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                        
                        <h3 className="text-xs font-bold text-purple-200 uppercase tracking-wider mb-4">Ayın Personeli</h3>
                        <div>
                            <div className="text-xl font-bold">{topPerformerDetails?.fullName || topPerformer.username}</div>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-4xl font-black">{topPerformer.queryCount}</span>
                                <span className="text-sm font-medium text-purple-200 mb-1">İşlem</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Ana İçerik Alanı (Split View) --- */}
                <div className="grid grid-cols-12 gap-8">
                    
                    {/* Sol taraf: Tablo ve Sekmeler (9/12) */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        
                        {/* Tab Headers */}
                        <div className="bg-white dark:bg-gray-800 rounded-2xl p-1.5 flex shadow-sm border border-gray-100 dark:border-gray-700 w-full sm:w-fit overflow-x-auto">
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
                            >
                                KULLANICI LİSTESİ
                            </button>
                            <button 
                                onClick={() => setActiveTab('details')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'details' ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
                            >
                                PERSONEL DETAY
                            </button>
                            <button 
                                onClick={() => setActiveTab('update')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'update' ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
                            >
                                VERİ GÜNCELLEME
                            </button>
                            <button 
                                onClick={() => setActiveTab('announcement')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'announcement' ? 'bg-blue-50 text-blue-600 shadow-sm dark:bg-gray-700 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400'}`}
                            >
                                <MegaphoneIcon /> DUYURU YÖNETİMİ
                            </button>
                        </div>

                        {/* --- TAB CONTENT: USERS --- */}
                        {activeTab === 'users' && (
                            <div className="animate-fade-in space-y-6">
                                {/* Toolbar */}
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="relative flex-grow max-w-md">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
                                            <SearchIcon />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="İsim, sicil no veya ünvan ara..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-medium shadow-sm"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => { resetForm(); setEditingUser(null); setShowAddModal(true); }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-lg shadow-blue-600/20 transition-transform active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <span className="text-lg leading-none">+</span> Yeni Kullanıcı Ekle
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-left">
                                                    <th className="px-8 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Personel</th>
                                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Şifre</th>
                                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Yetkiler</th>
                                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Aktivite</th>
                                                    <th className="px-6 py-5 text-xs font-bold text-gray-400 uppercase tracking-wider">Durum ▼</th>
                                                    <th className="px-6 py-5"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                {filteredUsers.map((user) => {
                                                    const userStat = stats.find(s => s.username === user.username);
                                                    const isOnline = userStat && new Date(userStat.lastLogin).toDateString() === new Date().toDateString();
                                                    
                                                    return (
                                                        <tr key={user.username} className="hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors group">
                                                            <td className="px-8 py-4">
                                                                <div className="flex items-center gap-4">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shadow-sm ${isOnline ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'}`}>
                                                                        {user.fullName ? user.fullName.charAt(0) : user.username.charAt(0)}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-gray-900 dark:text-white">{user.fullName || user.username}</div>
                                                                        <div className="text-xs text-gray-400 font-mono mt-0.5">{user.username}</div>
                                                                        <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-1">{user.title || 'PERSONEL'}</div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-lg text-gray-500 text-xs font-mono tracking-widest inline-block">••••••</div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex gap-2">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.skipDeviceLock ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`} title="Cihaz Kilidi">
                                                                         <LockIcon />
                                                                    </div>
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${user.canViewDetails ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`} title="Detay Gör">
                                                                         <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className="font-black text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-lg">{userStat?.queryCount || 0}</span>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-blue-500' : 'bg-gray-300'}`}></span>
                                                                    <div className="flex flex-col">
                                                                        <span className={`text-xs font-bold ${isOnline ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
                                                                            {isOnline ? 'Bugün Aktif' : 'Çevrimdışı'}
                                                                        </span>
                                                                        <span className="text-[10px] text-gray-400">
                                                                            {userStat?.lastLogin ? new Date(userStat.lastLogin).toLocaleTimeString('tr-TR', {hour:'2-digit', minute:'2-digit'}) + '\n' + new Date(userStat.lastLogin).toLocaleDateString('tr-TR') : '-'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleViewDetails(user.username)} className="p-2 bg-blue-50 text-blue-500 rounded-lg hover:bg-blue-100" title="Detay"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg></button>
                                                                    <button onClick={() => handleResetDevice(user.username)} className="p-2 bg-indigo-50 text-indigo-500 rounded-lg hover:bg-indigo-100" title="Cihaz Kilidini Sıfırla"><DeviceResetIcon /></button>
                                                                    <button onClick={() => handleResetStats(user.username)} className="p-2 bg-purple-50 text-purple-500 rounded-lg hover:bg-purple-100" title="Sayacı Sıfırla"><CounterResetIcon /></button>
                                                                    <button onClick={() => { setEditingUser(user); setFormData({...user, password: user.password, fullName: user.fullName || '', title: user.title || PREDEFINED_TITLES[0], allowedDeviceId: user.allowedDeviceId || '', skipDeviceLock: user.skipDeviceLock || false, canViewDetails: user.canViewDetails || false, unlimitedAccess: user.unlimitedAccess || false}); setShowAddModal(true); }} className="p-2 bg-orange-50 text-orange-500 rounded-lg hover:bg-orange-100" title="Düzenle"><EditIcon /></button>
                                                                    <button onClick={() => handleDeleteUser(user.username)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100" title="Sil"><TrashIcon /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400">Kayıt bulunamadı.</div>}
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: DETAILS --- */}
                        {activeTab === 'details' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                                    <div className="flex flex-col sm:flex-row gap-4 items-center justify-between mb-6">
                                        <div className="w-full sm:w-1/2">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Personel Seçin</label>
                                            <select 
                                                value={selectedDetailUser} 
                                                onChange={(e) => handleUserSelectForDetail(e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">Seçiniz...</option>
                                                {credentials.map(u => (
                                                    <option key={u.username} value={u.username}>{u.fullName || u.username} ({u.title || 'Personel'})</option>
                                                ))}
                                            </select>
                                        </div>
                                        {selectedDetailUser && (
                                            <div className="flex gap-4">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-400 uppercase font-bold">Toplam Sorgu</div>
                                                    <div className="text-xl font-black text-blue-600">{userLogs.length}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {detailLoading ? (
                                        <div className="text-center py-12 text-gray-400">Yükleniyor...</div>
                                    ) : selectedDetailUser && userLogs.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="bg-gray-50/50 dark:bg-gray-700/30 border-b border-gray-100 dark:border-gray-700 text-left">
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Tesisat No</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Tarih</th>
                                                        <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Aksiyonlar</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                                    {userLogs.map((log, idx) => (
                                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/20">
                                                            <td className="px-6 py-3 font-mono text-sm font-bold text-gray-700 dark:text-gray-200">{log.installationNumber}</td>
                                                            <td className="px-6 py-3 text-sm text-gray-500">{log.timestamp}</td>
                                                            <td className="px-6 py-3">
                                                                <div className="flex gap-2">
                                                                    {log.called && <span className="p-1.5 bg-green-100 text-green-600 rounded-lg" title="Arandı"><PhoneIconSolid /></span>}
                                                                    {log.smsSent && <span className="p-1.5 bg-blue-100 text-blue-600 rounded-lg" title="SMS Gönderildi"><MessageIcon /></span>}
                                                                    {log.errorReported && <span className="p-1.5 bg-red-100 text-red-600 rounded-lg" title="Hatalı Bildirim"><ReportIcon /></span>}
                                                                    {!log.called && !log.smsSent && !log.errorReported && <span className="text-xs text-gray-300 italic">Sadece Sorgu</span>}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : selectedDetailUser ? (
                                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            Bu personel henüz işlem yapmamış.
                                        </div>
                                    ) : (
                                        <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                            Geçmişini görüntülemek için bir personel seçin.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: DATA UPDATE --- */}
                        {activeTab === 'update' && (
                            <div className="animate-fade-in bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8 text-center">
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <DownloadIcon />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Veri Güncelleme</h2>
                                    <p className="text-gray-500">
                                        Müşteri veritabanını güncellemek için güncel CSV dosyasını buraya sürükleyin veya seçin.
                                    </p>
                                    
                                    <button 
                                        onClick={downloadSampleCsv}
                                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 rounded-xl transition-colors"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Örnek Şablonu İndir (.CSV)
                                    </button>
                                    
                                    <div 
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        className={`border-3 border-dashed rounded-2xl p-12 transition-all cursor-pointer ${isUploading ? 'bg-gray-50 border-gray-300' : 'border-blue-200 bg-blue-50/30 hover:bg-blue-50 hover:border-blue-400'}`}
                                    >
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                                        {uploadFile ? (
                                            <div>
                                                <p className="font-bold text-gray-800">{uploadFile.name}</p>
                                                <p className="text-sm text-gray-400">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="text-blue-600 font-bold">Dosya Seçin</div>
                                        )}
                                    </div>

                                    {isUploading && (
                                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                            <div className="bg-blue-500 h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleBulkUpload}
                                        disabled={!uploadFile || isUploading}
                                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all"
                                    >
                                        {isUploading ? 'Yükleniyor...' : 'Güncellemeyi Başlat'}
                                    </button>

                                    {uploadStatus && (
                                        <div className="flex justify-center gap-4 mt-4 text-sm font-medium">
                                            <span className="text-green-600">Başarılı: {uploadStatus.success}</span>
                                            <span className="text-red-600">Hatalı: {uploadStatus.error}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: ANNOUNCEMENT --- */}
                        {activeTab === 'announcement' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Yeni Duyuru Oluştur</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Başlık</label>
                                                <input 
                                                    type="text" 
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                                    placeholder="Duyuru Başlığı"
                                                    value={announcementForm.title}
                                                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Mesaj İçeriği</label>
                                                <textarea 
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none min-h-[150px]"
                                                    placeholder="Kullanıcılara iletmek istediğiniz mesaj..."
                                                    value={announcementForm.content}
                                                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Resim (Opsiyonel)</label>
                                                <div 
                                                    onClick={() => announcementImageRef.current?.click()}
                                                    className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                                                >
                                                    {announcementForm.imageUrl ? (
                                                        <div className="relative">
                                                            <img src={announcementForm.imageUrl} alt="Preview" className="max-h-32 mx-auto rounded-lg" />
                                                            <button 
                                                                onClick={(e) => { e.stopPropagation(); setAnnouncementForm({...announcementForm, imageFile: null, imageUrl: ''}) }}
                                                                className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 transform translate-x-1/2 -translate-y-1/2 shadow"
                                                            >
                                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="text-gray-400 text-sm py-4">Resim seçmek için tıklayın</div>
                                                    )}
                                                    <input type="file" ref={announcementImageRef} onChange={handleAnnouncementImageChange} accept="image/*" className="hidden" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Hedef Kullanıcılar</label>
                                            <div className="border border-gray-200 rounded-xl max-h-[350px] overflow-y-auto custom-scrollbar bg-gray-50 p-2">
                                                <label className="flex items-center p-3 rounded-lg hover:bg-white cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={announcementForm.targetUsers.includes('all')}
                                                        onChange={() => handleTargetUserToggle('all')}
                                                        className="w-5 h-5 text-blue-600 rounded mr-3"
                                                    />
                                                    <span className="font-bold text-sm">Tüm Kullanıcılar</span>
                                                </label>
                                                {credentials.map(user => (
                                                    <label key={user.username} className="flex items-center p-3 rounded-lg hover:bg-white cursor-pointer transition-colors border-b border-gray-100 last:border-0">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={announcementForm.targetUsers.includes(user.username)}
                                                            onChange={() => handleTargetUserToggle(user.username)}
                                                            className="w-5 h-5 text-blue-600 rounded mr-3"
                                                        />
                                                        <div>
                                                            <div className="font-bold text-sm">{user.fullName || user.username}</div>
                                                            <div className="text-xs text-gray-400">{user.title || 'Personel'}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-xs text-gray-400">
                                                Seçilen: {announcementForm.targetUsers.includes('all') ? 'Tüm Kullanıcılar' : `${announcementForm.targetUsers.length} Kişi`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                                        <button 
                                            onClick={() => setShowAnnouncementPreview(true)}
                                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            Önizle
                                        </button>
                                        <button 
                                            onClick={handleSendAnnouncement}
                                            disabled={isSendingAnnouncement}
                                            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center"
                                        >
                                            {isSendingAnnouncement ? 'Gönderiliyor...' : 'Yayınla'}
                                            <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>

                    {/* Sağ Taraf: Trend Analizi (3/12) */}
                    <div className="col-span-12 lg:col-span-3 space-y-6">
                        {/* Trend Listesi */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Trend Analizi</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">En Çok Sorgulananlar</p>
                                </div>
                                <div className="p-2 bg-orange-50 text-orange-500 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {topQueries.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <MedalIcon rank={index + 1} />
                                            <span className="font-bold text-gray-700 dark:text-gray-200 font-mono tracking-tight">{item.installationNumber}</span>
                                        </div>
                                        <span className="text-xs font-bold text-gray-400 uppercase">{item.count} SORGU</span>
                                    </div>
                                ))}
                                {topQueries.length === 0 && <div className="text-gray-400 text-sm text-center py-4">Veri yok</div>}
                            </div>
                        </div>

                        {/* Hatalı Bildirimler Listesi */}
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white text-lg">Hatalı Numaralar</h3>
                                    <p className="text-xs text-gray-400 font-bold uppercase tracking-wide">Personel Bildirimleri</p>
                                </div>
                                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                                    <ReportIcon />
                                </div>
                            </div>

                            <div className="space-y-4">
                                {reportedErrors.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-2xl hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 group">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center font-bold text-sm">!</span>
                                            <span className="font-bold text-gray-700 dark:text-gray-200 font-mono tracking-tight">{item.installationNumber}</span>
                                        </div>
                                        <span className="text-xs font-bold text-red-400 uppercase group-hover:text-red-600">{item.count} BİLDİRİM</span>
                                    </div>
                                ))}
                                {reportedErrors.length === 0 && <div className="text-gray-400 text-sm text-center py-4">Bildirim yok</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Modal (Add/Edit) --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-soft-slide-up">
                        <div className="px-8 py-6 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-gray-900 dark:text-white">{editingUser ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-red-500 text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleSubmitUser} className="p-8 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Sicil No</label>
                                    <input required type="text" name="username" value={formData.username} onChange={handleInputChange} readOnly={!!editingUser} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Şifre</label>
                                    <input required type="text" name="password" value={formData.password} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ad Soyad</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ünvan</label>
                                <select 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    {PREDEFINED_TITLES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" name="skipDeviceLock" checked={formData.skipDeviceLock} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                                    <div><div className="text-sm font-bold">Cihaz Kilidini Kaldır</div><div className="text-xs text-gray-400">Herhangi bir cihazdan giriş yapabilir.</div></div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" name="canViewDetails" checked={formData.canViewDetails} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                                    <div><div className="text-sm font-bold">Tam Yetki (İsim Gör)</div><div className="text-xs text-gray-400">Abone isimlerini maskelemeden görür.</div></div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl cursor-pointer hover:bg-gray-50">
                                    <input type="checkbox" name="unlimitedAccess" checked={formData.unlimitedAccess} onChange={handleInputChange} className="w-5 h-5 text-blue-600 rounded" />
                                    <div><div className="text-sm font-bold">7/24 Erişim</div><div className="text-xs text-gray-400">Mesai saati kısıtlamasına takılmaz.</div></div>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all">Kaydet</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* --- Announcement Preview Modal --- */}
            {showAnnouncementPreview && (
                <AnnouncementModal 
                    title={announcementForm.title}
                    content={announcementForm.content}
                    imageUrl={announcementForm.imageUrl}
                    onDismiss={() => setShowAnnouncementPreview(false)}
                    isPreview={true}
                />
            )}

             <style>{`
                .animate-fade-in { animation: fadeIn 0.3s ease-out; }
                .animate-soft-slide-up { animation: slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(156, 163, 175, 0.5); border-radius: 20px; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};
