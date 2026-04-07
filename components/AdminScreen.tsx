
import React, { useState, useEffect, useRef } from 'react';
import * as sheetService from '../services/sheetService';
import { 
    UserIcon, LockIcon, TrashIcon, EditIcon, ChartBarIcon, 
    UserGroupIcon, RefreshIcon, DownloadIcon, ReportIcon, 
    LightningIcon, CounterResetIcon, SearchIcon, PhoneIconSolid, MessageIcon,
    DeviceResetIcon, FlameIcon
} from './icons';
import type { Credential, UserActivityStat, PhoneUpdateRequest } from '../types';
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
    let colorClass = "text-brand-text-muted bg-brand-bg border-brand-border";
    if (rank === 1) colorClass = "text-yellow-600 bg-yellow-50 border-yellow-200";
    if (rank === 2) colorClass = "text-gray-500 bg-gray-50 border-gray-200";
    if (rank === 3) colorClass = "text-orange-600 bg-orange-50 border-orange-200";

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${colorClass} shadow-sm`}>
            {rank === 1 ? <CrownIcon /> : rank}
        </div>
    );
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'users' | 'update' | 'announcement' | 'logs' | 'approvals'>('users');
    
    // Data States
    const [credentials, setCredentials] = useState<Credential[]>([]);
    const [stats, setStats] = useState<UserActivityStat[]>([]);
    const [globalLogs, setGlobalLogs] = useState<any[]>([]);
    const [totalQueries, setTotalQueries] = useState<number>(0);
    const [monthlyTotalQueries, setMonthlyTotalQueries] = useState<number>(0);
    const [topQueries, setTopQueries] = useState<any[]>([]);
    const [reportedErrors, setReportedErrors] = useState<any[]>([]);
    const [totalCustomerCount, setTotalCustomerCount] = useState<number>(0);
    const [pendingUpdates, setPendingUpdates] = useState<PhoneUpdateRequest[]>([]);
    const [selectedUpdate, setSelectedUpdate] = useState<PhoneUpdateRequest | null>(null);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDownloadingErrors, setIsDownloadingErrors] = useState(false);
    
    // Modal & Form States
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingUser, setEditingUser] = useState<Credential | null>(null);
    const [formData, setFormData] = useState<Credential>({
        username: '', password: '', fullName: '', title: PREDEFINED_TITLES[0],
        allowedDeviceId: '', skipDeviceLock: false, canViewDetails: false, canViewPhone: false, unlimitedAccess: false,
        photoUrl: ''
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
    const userPhotoRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [creds, userStats, logs, top, reports, count, pending] = await Promise.all([
                sheetService.getCredentials(),
                sheetService.getUserActivityStats(),
                sheetService.getGlobalLogs(1000), // Get enough for counts
                sheetService.getTopQueriedInstallations(5),
                sheetService.getTopReportedErrors(5),
                sheetService.getTotalCustomerCount(),
                sheetService.getPendingPhoneUpdates()
            ]);
            
            setCredentials(creds);
            setStats(userStats);
            setGlobalLogs(logs);
            setTotalQueries(logs.length);
            
            // Calculate monthly total
            const mTotal = userStats.reduce((acc, s) => acc + s.queryCount, 0);
            setMonthlyTotalQueries(mTotal);
            
            setTopQueries(top);
            setReportedErrors(reports);
            setTotalCustomerCount(count);
            setPendingUpdates(pending);
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
    }, { username: '-', queryCount: 0, totalQueryCount: 0, lastLogin: '' } as UserActivityStat);
    
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

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return '-';
        const R = 6371; // km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c;
        return d.toFixed(2); // km
    };

    const handleApproveUpdate = async (req: PhoneUpdateRequest) => {
        if (!req.id) return;
        if (!window.confirm('Bu telefon numarası güncellemesini onaylıyor musunuz?')) return;
        setLoading(true);
        try {
            await sheetService.approvePhoneUpdate(req.id, req.installationNumber, req.newPhone);
            setSuccessMsg('Telefon numarası başarıyla güncellendi.');
            setSelectedUpdate(null);
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Onaylama sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const handleRejectUpdate = async (req: PhoneUpdateRequest) => {
        if (!req.id) return;
        if (!window.confirm('Bu güncelleme talebini reddetmek istediğinize emin misiniz?')) return;
        setLoading(true);
        try {
            await sheetService.rejectPhoneUpdate(req.id);
            setSuccessMsg('Güncelleme talebi reddedildi.');
            setSelectedUpdate(null);
            loadData();
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            setError(err.message || 'Reddetme sırasında hata oluştu.');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            username: '', password: '', fullName: '', title: PREDEFINED_TITLES[0],
            allowedDeviceId: '', skipDeviceLock: false, canViewDetails: false, canViewPhone: false, unlimitedAccess: false,
            photoUrl: ''
        });
    };

    const handleEditUser = async (user: Credential) => {
        setEditingUser(user);
        setFormData({
            ...user,
            password: user.password,
            fullName: user.fullName || '',
            title: user.title || PREDEFINED_TITLES[0],
            allowedDeviceId: user.allowedDeviceId || '',
            skipDeviceLock: user.skipDeviceLock || false,
            canViewDetails: user.canViewDetails || false,
            canViewPhone: user.canViewPhone || false,
            unlimitedAccess: user.unlimitedAccess || false,
            photoUrl: '' // Başta boş, sonra yüklenecek
        });
        setShowAddModal(true);
        
        // Fotoğrafı arka planda çek
        try {
            const photo = await sheetService.getUserPhoto(user.username);
            if (photo) {
                setFormData(prev => ({ ...prev, photoUrl: photo }));
            }
        } catch (e) {
            console.error("Fotoğraf yüklenemedi:", e);
        }
    };

    const handleUserPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, photoUrl: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
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
            delimiter: "", // Otomatik algıla
            complete: (results: any) => { // 'any' tipi eklendi, TS hatasını önlemek için
                // Async işlemi burada başlatıp, Papa.parse'a Promise döndürmeyerek tip hatasını önlüyoruz
                const processUpload = async () => {
                    try {
                        setUploadProgress(50);
                        const customers: any[] = [];
                        
                        if (results && results.data && Array.isArray(results.data)) {
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
                        }
                        
                        const result = await sheetService.bulkUpsertCustomers(customers);
                        setUploadProgress(100);
                        setUploadStatus({ total: results.data ? results.data.length : 0, success: result.success, error: result.error });
                        setSuccessMsg(`${result.success} kayıt yüklendi.`);
                        loadData(); 
                        setTimeout(() => setSuccessMsg(''), 5000);
                    } catch (e: any) { 
                        setError(e.message); 
                    } finally { 
                        setIsUploading(false); 
                    }
                };
                
                processUpload();
            }
        });
    };

    const handleDownloadDatabase = async () => {
        if (!confirm('Veritabanındaki tüm tesisat kayıtlarını indirmek istiyor musunuz? Bu işlem kayıt sayısına bağlı olarak biraz zaman alabilir.')) return;
        
        setIsDownloading(true);
        try {
            const data = await sheetService.getAllCustomers();
            if (data.length === 0) {
                setError('İndirilecek kayıt bulunamadı.');
                setTimeout(() => setError(''), 3000);
                return;
            }

            // CSV Başlıkları
            let csvContent = "tesisat_no;ad_soyad;telefon;adres;enlem;boylam\n";

            // Verileri ekle
            data.forEach(item => {
                const row = [
                    item.installationNumber,
                    item.name ? item.name.replace(/;/g, ',') : '', // Noktalı virgülleri temizle
                    item.phone ? item.phone.replace(/;/g, ',') : '',
                    item.address ? item.address.replace(/;/g, ',') : '',
                    item.latitude || '',
                    item.longitude || ''
                ];
                csvContent += row.join(";") + "\n";
            });

            // BOM ekle (Excel'de Türkçe karakter sorunu için)
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const date = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.setAttribute('download', `tesisat_veritabani_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setSuccessMsg(`${data.length} kayıt başarıyla indirildi.`);
            setTimeout(() => setSuccessMsg(''), 3000);
            
        } catch (e: any) {
            setError('İndirme hatası: ' + e.message);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleDownloadReportedErrors = async () => {
        setIsDownloadingErrors(true);
        try {
            const data = await sheetService.getAllReportedErrors();
            if (data.length === 0) {
                setError('İndirilecek hatalı bildirim bulunamadı.');
                setTimeout(() => setError(''), 3000);
                return;
            }

            // CSV Başlıkları
            let csvContent = "sicil_no;tesisat_no;tarih\n";

            // Verileri ekle
            data.forEach(item => {
                const row = [
                    item.username,
                    item.installationNumber,
                    item.timestamp
                ];
                csvContent += row.join(";") + "\n";
            });

            // BOM ekle (Excel'de Türkçe karakter sorunu için)
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            
            const date = new Date().toISOString().slice(0, 10);
            link.href = url;
            link.setAttribute('download', `hatali_numaralar_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            setSuccessMsg(`${data.length} bildirim başarıyla indirildi.`);
            setTimeout(() => setSuccessMsg(''), 3000);
            
        } catch (e: any) {
            setError('İndirme hatası: ' + e.message);
        } finally {
            setIsDownloadingErrors(false);
        }
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
        <div className="min-h-screen bg-brand-bg w-full font-sans text-brand-text">
            {/* --- Toast Bildirimleri (SAĞ ÜST KÖŞE) --- */}
            {(successMsg || error) && (
                <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 animate-fade-in max-w-lg w-full px-4">
                    {successMsg && (
                        <div className="bg-white border-l-4 border-green-500 shadow-2xl rounded-2xl p-4 flex items-center">
                            <div className="bg-green-500/10 text-green-500 rounded-full p-2 mr-3 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="font-bold text-green-600 text-sm">Başarılı</h4>
                                <p className="text-sm text-brand-text-muted">{successMsg}</p>
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="bg-white border-l-4 border-red-500 shadow-2xl rounded-2xl p-4 relative">
                            <button onClick={() => setError('')} className="absolute top-2 right-2 text-brand-text-muted hover:text-red-500">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                            <div className="flex items-start">
                                <div className="bg-red-500/10 text-red-500 rounded-full p-2 mr-3 flex-shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="w-full overflow-hidden">
                                    <h4 className="font-bold text-red-600 text-sm">Hata</h4>
                                    {error.includes('create table') ? (
                                        <div className="mt-2">
                                            <p className="text-xs text-brand-text-muted mb-2">Veritabanında gerekli tablo eksik. Lütfen aşağıdaki kodu kopyalayıp Supabase SQL Editöründe çalıştırın:</p>
                                            <div className="bg-brand-bg rounded-xl p-3 text-[10px] font-mono overflow-x-auto text-brand-text border border-brand-border relative group">
                                                <pre>{error.split(':\n\n')[1] || error}</pre>
                                                <button 
                                                    onClick={() => navigator.clipboard.writeText(error.split(':\n\n')[1] || error)}
                                                    className="absolute top-2 right-2 bg-brand-accent text-white px-3 py-1 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                                                >
                                                    Kopyala
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-brand-text-muted break-words">{error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* --- Üst Header --- */}
            <div className="bg-brand-card border-b border-brand-border px-6 py-4 flex justify-between items-center sticky top-0 z-30">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-accent/20">
                        <FlameIcon />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-brand-text leading-none">Yönetim Paneli</h1>
                        <span className="text-[10px] font-bold text-brand-accent tracking-widest uppercase">Sistem Kontrol & İzleme</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={loadData} className="p-2 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all">
                        <RefreshIcon />
                    </button>
                    <button 
                        onClick={onLogout}
                        className="px-5 py-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-sm font-bold transition-colors flex items-center"
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
                    <div className="card-hardware p-6 relative overflow-hidden group hover:border-brand-accent/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 text-brand-accent opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                            <DatabaseIcon />
                        </div>
                        <h3 className="label-hardware mb-2">Toplam Tesisat</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-brand-text">{totalCustomerCount.toLocaleString('tr-TR')}</span>
                        </div>
                        <div className="mt-4 flex items-center">
                            <span className="px-2 py-1 bg-cyan-500/10 text-cyan-500 text-[10px] font-bold rounded-md border border-cyan-500/20">Veritabanı Aktif</span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
                    </div>

                    {/* Kart 2: Personel Durumu */}
                    <div className="card-hardware p-6 relative overflow-hidden group hover:border-brand-accent/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 text-brand-accent opacity-5 group-hover:opacity-10 transition-opacity">
                            <UserGroupIcon />
                        </div>
                        <h3 className="label-hardware mb-2">Personel Durumu</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-brand-text">{credentials.length}</span>
                            <span className="text-sm font-medium text-brand-text-muted mb-1">Kayıtlı</span>
                        </div>
                        <div className="mt-4 flex items-center gap-2">
                            <span className="flex items-center px-2 py-1 bg-green-500/10 text-green-500 text-[10px] font-bold rounded-md border border-green-500/20">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5 animate-pulse"></span>
                                {onlineCount} Çevrimiçi
                            </span>
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-green-500"></div>
                    </div>

                    {/* Kart 3: Aktivite */}
                    <div className="card-hardware p-6 relative overflow-hidden group hover:border-brand-accent/30 transition-all">
                        <div className="absolute top-0 right-0 p-4 text-brand-accent opacity-5 group-hover:opacity-10 transition-opacity">
                            <SearchIcon />
                        </div>
                        <h3 className="label-hardware mb-2">Aktivite</h3>
                        <div className="flex items-end gap-2">
                            <span className="text-4xl font-black text-brand-text">{monthlyTotalQueries}</span>
                            <span className="text-sm font-medium text-brand-text-muted mb-1">Bu Ay</span>
                        </div>
                        <div className="mt-4 text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">
                            Toplam: {totalQueries}
                        </div>
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent to-orange-600"></div>
                    </div>

                    {/* Kart 4: Ayın Personeli */}
                    <div className="bg-gradient-to-br from-brand-accent to-blue-700 p-6 rounded-[24px] shadow-lg shadow-brand-accent/10 text-white relative overflow-hidden">
                        <div className="absolute top-4 right-4 text-white/40">
                             <LightningIcon />
                        </div>
                        <div className="absolute -bottom-4 -right-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                        
                        <h3 className="text-[10px] font-bold text-white/60 uppercase tracking-wider mb-4">Ayın Personeli</h3>
                        <div>
                            <div className="text-xl font-bold">{topPerformerDetails?.fullName || topPerformer.username}</div>
                            <div className="flex items-end gap-2 mt-1">
                                <span className="text-4xl font-black">{topPerformer.queryCount}</span>
                                <span className="text-sm font-medium text-white/60 mb-1">İşlem</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- Ana İçerik Alanı (Split View) --- */}
                <div className="grid grid-cols-12 gap-8">
                    
                    {/* Sol taraf: Tablo ve Sekmeler (9/12) */}
                    <div className="col-span-12 lg:col-span-9 space-y-6">
                        
                        {/* Tab Headers */}
                        <div className="bg-brand-card rounded-2xl p-1.5 flex border border-brand-border w-full sm:w-fit overflow-x-auto">
                            <button 
                                onClick={() => setActiveTab('users')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-brand-accent text-black shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
                            >
                                KULLANICI LİSTESİ
                            </button>
                            <button 
                                onClick={() => setActiveTab('update')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'update' ? 'bg-brand-accent text-black shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
                            >
                                VERİ GÜNCELLEME
                            </button>
                            <button 
                                onClick={() => setActiveTab('announcement')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'announcement' ? 'bg-brand-accent text-black shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
                            >
                                <MegaphoneIcon /> DUYURU YÖNETİMİ
                            </button>
                            <button 
                                onClick={() => setActiveTab('logs')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'logs' ? 'bg-brand-accent text-black shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
                            >
                                İŞLEM GEÇMİŞİ
                            </button>
                            <button 
                                onClick={() => setActiveTab('approvals')}
                                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === 'approvals' ? 'bg-brand-accent text-black shadow-sm' : 'text-brand-text-muted hover:text-brand-text'}`}
                            >
                                <ReportIcon /> ONAYLARIM
                                {pendingUpdates.length > 0 && (
                                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse ml-1">
                                        {pendingUpdates.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* --- TAB CONTENT: USERS --- */}
                        {activeTab === 'users' && (
                            <div className="animate-fade-in space-y-6">
                                {/* Toolbar */}
                                <div className="flex flex-col sm:flex-row justify-between gap-4">
                                    <div className="relative flex-grow max-w-md">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-muted">
                                            <SearchIcon />
                                        </div>
                                        <input 
                                            type="text" 
                                            placeholder="İsim, sicil no veya ünvan ara..."
                                            value={userSearchTerm}
                                            onChange={(e) => setUserSearchTerm(e.target.value)}
                                            className="input-hardware w-full pl-11"
                                        />
                                    </div>
                                    <button 
                                        onClick={() => { resetForm(); setEditingUser(null); setShowAddModal(true); }}
                                        className="btn-hardware"
                                    >
                                        <span className="text-lg leading-none">+</span> Yeni Kullanıcı Ekle
                                    </button>
                                </div>

                                {/* Table */}
                                <div className="card-hardware">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-brand-bg/50 border-b border-brand-border text-left">
                                                    <th className="px-6 py-5 label-hardware">Ad Soyad</th>
                                                    <th className="px-6 py-5"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-border/50">
                                                {filteredUsers.map((user) => {
                                                    const userStat = stats.find(s => s.username === user.username);
                                                    const isOnline = userStat && new Date(userStat.lastLogin).toDateString() === new Date().toDateString();
                                                    
                                                    return (
                                                        <tr key={user.username} className="hover:bg-brand-accent/5 transition-colors group">
                                                            <td className="px-6 py-4 text-sm font-medium text-brand-text">{user.fullName || '-'}</td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button onClick={() => handleResetDevice(user.username)} className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 border border-brand-accent/20" title="Cihaz Kilidini Sıfırla"><DeviceResetIcon /></button>
                                                                    <button onClick={() => handleResetStats(user.username)} className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 border border-brand-accent/20" title="Sayacı Sıfırla"><CounterResetIcon /></button>
                                                                    <button onClick={() => handleEditUser(user)} className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg hover:bg-brand-accent/20 border border-brand-accent/20" title="Düzenle"><EditIcon /></button>
                                                                    <button onClick={() => handleDeleteUser(user.username)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 border border-red-500/20" title="Sil"><TrashIcon /></button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {filteredUsers.length === 0 && <div className="p-8 text-center text-brand-text-muted">Kayıt bulunamadı.</div>}
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: LOGS --- */}
                        {activeTab === 'logs' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="card-hardware overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-brand-bg/50 border-b border-brand-border text-left">
                                                    <th className="px-6 py-5 label-hardware">Personel</th>
                                                    <th className="px-6 py-5 label-hardware">Tesisat No</th>
                                                    <th className="px-6 py-5 label-hardware">Tarih</th>
                                                    <th className="px-6 py-5 label-hardware">İşlem Detayı</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-border/50">
                                                {globalLogs.map((log, idx) => (
                                                    <tr key={idx} className="hover:bg-brand-accent/5 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="font-bold text-brand-text">{log.username}</div>
                                                            <div className="text-[10px] text-brand-text-muted uppercase font-bold">
                                                                {credentials.find(c => c.username === log.username)?.fullName || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 font-mono text-sm text-brand-text">{log.installationNumber}</td>
                                                        <td className="px-6 py-4 text-xs text-brand-text-muted">{log.timestamp}</td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-wrap gap-2">
                                                                {log.called && (
                                                                    <div className="flex items-center gap-1.5 bg-brand-accent/10 text-brand-accent px-3 py-1 rounded-full text-[10px] font-bold border border-brand-accent/20">
                                                                        <PhoneIconSolid />
                                                                        ARAMA YAPILDI
                                                                        {log.callDuration > 0 && ` (${log.callDuration} dk)`}
                                                                        {log.callStatus && ` - ${log.callStatus}`}
                                                                    </div>
                                                                )}
                                                                {log.smsSent && (
                                                                    <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-500/20">
                                                                        <MessageIcon />
                                                                        SMS GÖNDERİLDİ
                                                                    </div>
                                                                )}
                                                                {!log.called && !log.smsSent && (
                                                                    <div className="flex items-center gap-1.5 bg-gray-500/10 text-gray-500 px-3 py-1 rounded-full text-[10px] font-bold border border-gray-500/20">
                                                                        <SearchIcon />
                                                                        SORGULAMA
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {globalLogs.length === 0 && <div className="p-8 text-center text-brand-text-muted">İşlem kaydı bulunamadı.</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'approvals' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="bg-white rounded-[24px] shadow-sm border border-brand-border overflow-hidden">
                                    <div className="p-6 border-b border-brand-border bg-brand-bg/30 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-black text-brand-text">Bekleyen Onaylar</h3>
                                            <p className="text-xs text-brand-text-muted mt-1">Telefon numarası güncelleme talepleri</p>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-brand-bg/50 border-b border-brand-border text-left">
                                                    <th className="px-6 py-5 label-hardware">Kullanıcı</th>
                                                    <th className="px-6 py-5 label-hardware">Tesisat No</th>
                                                    <th className="px-6 py-5 label-hardware">Yeni Telefon</th>
                                                    <th className="px-6 py-5 label-hardware">Tarih</th>
                                                    <th className="px-6 py-5"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-brand-border">
                                                {pendingUpdates.length > 0 ? (
                                                    pendingUpdates.map((req) => (
                                                        <tr key={req.id} className="hover:bg-brand-accent/5 transition-colors group">
                                                            <td className="px-6 py-4 text-sm font-bold text-brand-text">{req.username}</td>
                                                            <td className="px-6 py-4 text-sm text-brand-text-muted">{req.installationNumber}</td>
                                                            <td className="px-6 py-4 text-sm font-mono text-brand-accent">{req.newPhone}</td>
                                                            <td className="px-6 py-4 text-[10px] text-brand-text-muted">
                                                                {req.createdAt ? new Date(req.createdAt).toLocaleString('tr-TR') : '-'}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <button 
                                                                    onClick={() => setSelectedUpdate(req)}
                                                                    className="bg-brand-accent text-black px-4 py-2 rounded-xl text-xs font-bold hover:shadow-lg transition-all"
                                                                >
                                                                    Detaylar
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan={5} className="px-6 py-12 text-center text-brand-text-muted italic">
                                                            Bekleyen onay bulunmuyor.
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: DATA UPDATE --- */}
                        {activeTab === 'update' && (
                            <div className="animate-fade-in card-hardware p-8 text-center space-y-12">
                                
                                {/* Upload Section */}
                                <div className="max-w-xl mx-auto space-y-6">
                                    <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-accent/20">
                                        <DownloadIcon />
                                    </div>
                                    <h2 className="text-2xl font-bold text-brand-text">Veri Yükle</h2>
                                    <p className="text-brand-text-muted">
                                        Müşteri veritabanını güncellemek için güncel CSV dosyasını buraya sürükleyin veya seçin.
                                    </p>
                                    
                                    <button 
                                        onClick={downloadSampleCsv}
                                        className="inline-flex items-center gap-2 px-5 py-2 text-sm font-bold text-brand-accent bg-brand-accent/10 hover:bg-brand-accent/20 rounded-xl transition-colors border border-brand-accent/20"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Örnek Şablonu İndir (.CSV)
                                    </button>
                                    
                                    <div 
                                        onClick={() => !isUploading && fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-12 transition-all cursor-pointer ${isUploading ? 'bg-brand-bg border-brand-border' : 'border-brand-accent/30 bg-brand-accent/5 hover:bg-brand-accent/10 hover:border-brand-accent'}`}
                                    >
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                                        {uploadFile ? (
                                            <div>
                                                <p className="font-bold text-brand-text">{uploadFile.name}</p>
                                                <p className="text-sm text-brand-text-muted">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                                            </div>
                                        ) : (
                                            <div className="text-brand-accent font-bold">Dosya Seçin</div>
                                        )}
                                    </div>

                                    {isUploading && (
                                        <div className="w-full bg-brand-bg rounded-full h-2 overflow-hidden border border-brand-border">
                                            <div className="bg-brand-accent h-2 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                        </div>
                                    )}

                                    <button 
                                        onClick={handleBulkUpload}
                                        disabled={!uploadFile || isUploading}
                                        className="btn-hardware w-full py-4"
                                    >
                                        {isUploading ? 'Yükleniyor...' : 'Güncellemeyi Başlat'}
                                    </button>

                                    {uploadStatus && (
                                        <div className="flex justify-center gap-4 mt-4 text-sm font-medium">
                                            <span className="text-brand-accent">Başarılı: {uploadStatus.success}</span>
                                            <span className="text-red-500">Hatalı: {uploadStatus.error}</span>
                                        </div>
                                    )}
                                </div>
                                
                                <div className="border-t border-brand-border"></div>

                                {/* Download Section */}
                                <div className="max-w-xl mx-auto space-y-6 pt-4">
                                     <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-full flex items-center justify-center mx-auto mb-4 border border-brand-accent/20">
                                        <DatabaseIcon />
                                    </div>
                                    <h2 className="text-2xl font-bold text-brand-text">Veritabanı Dışa Aktar</h2>
                                    <p className="text-brand-text-muted">
                                        Sistemdeki tüm kayıtlı tesisat verilerini CSV formatında indirebilirsiniz.
                                    </p>
                                    
                                     <button 
                                        onClick={handleDownloadDatabase}
                                        disabled={isDownloading}
                                        className="btn-hardware w-full py-4 flex items-center justify-center gap-2"
                                    >
                                        {isDownloading ? (
                                            <>
                                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-brand-text" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                Veriler Hazırlanıyor...
                                            </>
                                        ) : (
                                            <>
                                                <DownloadIcon />
                                                Tüm Veritabanını İndir (.CSV)
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* --- TAB CONTENT: ANNOUNCEMENT --- */}
                        {activeTab === 'announcement' && (
                            <div className="animate-fade-in space-y-6">
                                <div className="card-hardware p-8">
                                    <h2 className="text-xl font-bold text-brand-text mb-6">Yeni Duyuru Oluştur</h2>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="label-hardware mb-2 block">Başlık</label>
                                                <input 
                                                    type="text" 
                                                    className="input-hardware w-full"
                                                    placeholder="Duyuru Başlığı"
                                                    value={announcementForm.title}
                                                    onChange={(e) => setAnnouncementForm({...announcementForm, title: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-hardware mb-2 block">Mesaj İçeriği</label>
                                                <textarea 
                                                    className="input-hardware w-full min-h-[150px]"
                                                    placeholder="Kullanıcılara iletmek istediğiniz mesaj..."
                                                    value={announcementForm.content}
                                                    onChange={(e) => setAnnouncementForm({...announcementForm, content: e.target.value})}
                                                />
                                            </div>
                                            <div>
                                                <label className="label-hardware mb-2 block">Resim (Opsiyonel)</label>
                                                <div 
                                                    onClick={() => announcementImageRef.current?.click()}
                                                    className="border-2 border-dashed border-brand-border rounded-xl p-4 text-center cursor-pointer hover:bg-brand-accent/5 transition-colors"
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
                                                        <div className="text-brand-text-muted text-sm py-4 font-bold uppercase tracking-wider">Resim seçmek için tıklayın</div>
                                                    )}
                                                    <input type="file" ref={announcementImageRef} onChange={handleAnnouncementImageChange} accept="image/*" className="hidden" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="label-hardware mb-2 block">Hedef Kullanıcılar</label>
                                            <div className="border border-brand-border rounded-xl max-h-[350px] overflow-y-auto custom-scrollbar bg-brand-bg p-2">
                                                <label className="flex items-center p-3 rounded-lg hover:bg-brand-accent/10 cursor-pointer transition-colors border-b border-brand-border/50 last:border-0 group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={announcementForm.targetUsers.includes('all')}
                                                        onChange={() => handleTargetUserToggle('all')}
                                                        className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg mr-3"
                                                    />
                                                    <span className="font-bold text-sm text-brand-text group-hover:text-brand-accent">Tüm Kullanıcılar</span>
                                                </label>
                                                {credentials.map(user => (
                                                    <label key={user.username} className="flex items-center p-3 rounded-lg hover:bg-brand-accent/10 cursor-pointer transition-colors border-b border-brand-border/50 last:border-0 group">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={announcementForm.targetUsers.includes(user.username)}
                                                            onChange={() => handleTargetUserToggle(user.username)}
                                                            className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg mr-3"
                                                        />
                                                        <div>
                                                            <div className="font-bold text-sm text-brand-text group-hover:text-brand-accent">{user.fullName || user.username}</div>
                                                            <div className="text-[10px] text-brand-text-muted uppercase font-bold">{user.title || 'Personel'}</div>
                                                        </div>
                                                    </label>
                                                ))}
                                            </div>
                                            <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">
                                                Seçilen: {announcementForm.targetUsers.includes('all') ? 'Tüm Kullanıcılar' : `${announcementForm.targetUsers.length} Kişi`}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-brand-border">
                                        <button 
                                            onClick={() => setShowAnnouncementPreview(true)}
                                            className="px-6 py-3 bg-brand-bg text-brand-text-muted font-bold rounded-xl hover:bg-brand-border transition-colors border border-brand-border"
                                        >
                                            Önizle
                                        </button>
                                        <button 
                                            onClick={handleSendAnnouncement}
                                            disabled={isSendingAnnouncement}
                                            className="btn-hardware px-8 py-3 flex items-center"
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
                        <div className="card-hardware p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-brand-text text-lg">Trend Analizi</h3>
                                    <p className="label-hardware">En Çok Sorgulananlar</p>
                                </div>
                                <div className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg border border-brand-accent/20">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {topQueries.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-brand-accent/5 transition-colors border border-transparent hover:border-brand-border">
                                        <div className="flex items-center gap-3">
                                            <MedalIcon rank={index + 1} />
                                            <span className="font-bold text-brand-text font-mono tracking-tight">{item.installationNumber}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-brand-text-muted uppercase">{item.count} SORGU</span>
                                    </div>
                                ))}
                                {topQueries.length === 0 && <div className="text-brand-text-muted text-sm text-center py-4">Veri yok</div>}
                            </div>
                        </div>

                        {/* Hatalı Bildirimler Listesi */}
                        <div className="card-hardware p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="font-bold text-brand-text text-lg">Hatalı Numaralar</h3>
                                    <p className="label-hardware">Personel Bildirimleri</p>
                                </div>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleDownloadReportedErrors}
                                        disabled={isDownloadingErrors}
                                        className="p-2 bg-brand-accent/10 text-brand-accent rounded-lg border border-brand-accent/20 hover:bg-brand-accent/20 transition-colors disabled:opacity-50"
                                        title="Tümünü İndir"
                                    >
                                        {isDownloadingErrors ? (
                                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        ) : (
                                            <DownloadIcon />
                                        )}
                                    </button>
                                    <div className="p-2 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
                                        <ReportIcon />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {reportedErrors.map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-xl hover:bg-red-500/5 transition-colors border border-transparent hover:border-red-500/20 group">
                                        <div className="flex items-center gap-3">
                                            <span className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center font-bold text-sm border border-red-500/20">!</span>
                                            <span className="font-bold text-brand-text font-mono tracking-tight">{item.installationNumber}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-red-400 uppercase group-hover:text-red-500">{item.count} BİLDİRİM</span>
                                    </div>
                                ))}
                                {reportedErrors.length === 0 && <div className="text-brand-text-muted text-sm text-center py-4">Bildirim yok</div>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- Modal (Add/Edit) --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-bg/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-brand-card border border-brand-border w-full max-w-lg rounded-[32px] shadow-2xl shadow-black/50 overflow-hidden animate-soft-slide-up">
                        <div className="px-8 py-6 border-b border-brand-border bg-brand-bg flex justify-between items-center">
                            <h3 className="font-black text-xl text-brand-text tracking-tight uppercase">{editingUser ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="text-brand-text-muted hover:text-brand-accent text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleSubmitUser} className="p-8 space-y-4">
                            {/* Profil Fotoğrafı Bölümü */}
                            <div className="flex justify-center mb-6">
                                <div className="relative group">
                                    <div 
                                        onClick={() => userPhotoRef.current?.click()}
                                        className="w-24 h-24 rounded-full border-4 border-brand-accent/20 overflow-hidden bg-brand-bg flex items-center justify-center cursor-pointer hover:border-brand-accent transition-all relative"
                                    >
                                        {formData.photoUrl ? (
                                            <img src={formData.photoUrl} alt="Profil" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-brand-text-muted">
                                                <UserIcon />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={userPhotoRef} 
                                        onChange={handleUserPhotoChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    {formData.photoUrl && (
                                        <button 
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, photoUrl: '' }))}
                                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="label-hardware mb-1 block">Sicil No</label>
                                    <input required type="text" name="username" value={formData.username} onChange={handleInputChange} readOnly={!!editingUser} className="input-hardware w-full disabled:opacity-50" />
                                </div>
                                <div>
                                    <label className="label-hardware mb-1 block">Şifre</label>
                                    <input required type="text" name="password" value={formData.password} onChange={handleInputChange} className="input-hardware w-full" />
                                </div>
                            </div>
                            <div>
                                <label className="label-hardware mb-1 block">Ad Soyad</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="input-hardware w-full" />
                            </div>
                            <div>
                                <label className="label-hardware mb-1 block">Ünvan</label>
                                <select 
                                    name="title" 
                                    value={formData.title} 
                                    onChange={handleInputChange} 
                                    className="input-hardware w-full"
                                >
                                    {PREDEFINED_TITLES.map((t) => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2 pt-2">
                                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-accent/5 group">
                                    <input type="checkbox" name="skipDeviceLock" checked={formData.skipDeviceLock} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div><div className="text-sm font-bold text-brand-text group-hover:text-brand-accent">Cihaz Kilidini Kaldır</div><div className="text-[10px] text-brand-text-muted uppercase font-bold">Herhangi bir cihazdan giriş yapabilir.</div></div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-accent/5 group">
                                    <input type="checkbox" name="canViewDetails" checked={formData.canViewDetails} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div><div className="text-sm font-bold text-brand-text group-hover:text-brand-accent">Tam Yetki (İsim Gör)</div><div className="text-[10px] text-brand-text-muted uppercase font-bold">Abone isimlerini maskelemeden görür.</div></div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-accent/5 group">
                                    <input type="checkbox" name="canViewPhone" checked={formData.canViewPhone} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div><div className="text-sm font-bold text-brand-text group-hover:text-brand-accent">Telefon Numarası Görüntüle</div><div className="text-[10px] text-brand-text-muted uppercase font-bold">Abone telefon numaralarını görür.</div></div>
                                </label>
                                <label className="flex items-center gap-3 p-3 border border-brand-border rounded-xl cursor-pointer hover:bg-brand-accent/5 group">
                                    <input type="checkbox" name="unlimitedAccess" checked={formData.unlimitedAccess} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div><div className="text-sm font-bold text-brand-text group-hover:text-brand-accent">7/24 Erişim</div><div className="text-[10px] text-brand-text-muted uppercase font-bold">Mesai saati kısıtlamasına takılmaz.</div></div>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="btn-hardware w-full py-4">Kaydet</button>
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

             {/* Detay Modalı */}
            {selectedUpdate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="absolute inset-0 bg-brand-text/60 backdrop-blur-sm" onClick={() => setSelectedUpdate(null)}></div>
                    <div className="relative bg-white w-full max-w-2xl rounded-[32px] shadow-2xl overflow-hidden animate-soft-slide-up">
                        <div className="p-6 border-b border-brand-border flex justify-between items-center bg-brand-bg/30">
                            <div className="flex items-center gap-3">
                                <div className="bg-brand-accent p-2 rounded-xl text-black">
                                    <ReportIcon />
                                </div>
                                <h3 className="text-xl font-black text-brand-text">Talep Detayları</h3>
                            </div>
                            <button onClick={() => setSelectedUpdate(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-brand-text-muted">
                                <SearchIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <p className="label-hardware">BİLDİRİM YAPAN</p>
                                    <p className="font-bold text-brand-text">{selectedUpdate.username}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="label-hardware">TESİSAT NO</p>
                                    <p className="font-bold text-brand-text">{selectedUpdate.installationNumber}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="label-hardware">ESKİ TELEFON</p>
                                    <p className="font-bold text-brand-text-muted">{selectedUpdate.oldPhone || '-'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="label-hardware text-brand-accent">YENİ TELEFON</p>
                                    <p className="font-black text-brand-accent">{selectedUpdate.newPhone}</p>
                                </div>
                            </div>

                            <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border space-y-4">
                                <h4 className="text-xs font-black text-brand-text uppercase tracking-widest">Konum Karşılaştırması</h4>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-brand-text-muted">KULLANICI KONUMU</p>
                                        <p className="text-xs font-mono">{selectedUpdate.userLat.toFixed(6)}, {selectedUpdate.userLng.toFixed(6)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-brand-text-muted">TESİSAT KONUMU</p>
                                        <p className="text-xs font-mono">{selectedUpdate.customerLat.toFixed(6)}, {selectedUpdate.customerLng.toFixed(6)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-brand-border flex items-center justify-between">
                                    <span className="text-sm font-bold text-brand-text">Koordinatlar Arası Mesafe:</span>
                                    <span className={`text-lg font-black ${parseFloat(calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, selectedUpdate.customerLat, selectedUpdate.customerLng)) > 0.5 ? 'text-red-500' : 'text-green-600'}`}>
                                        {calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, selectedUpdate.customerLat, selectedUpdate.customerLng)} km
                                    </span>
                                </div>
                                {parseFloat(calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, selectedUpdate.customerLat, selectedUpdate.customerLng)) > 0.5 && (
                                    <p className="text-[10px] text-red-500 font-bold italic">
                                        * Kullanıcı tesisatın 500 metreden daha uzağında görünüyor.
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t border-brand-border flex gap-3">
                            <button 
                                onClick={() => handleRejectUpdate(selectedUpdate)}
                                className="flex-1 py-4 rounded-2xl font-black text-red-500 border-2 border-red-500 hover:bg-red-50 transition-all active:scale-95"
                            >
                                REDDET
                            </button>
                            <button 
                                onClick={() => handleApproveUpdate(selectedUpdate)}
                                className="flex-1 py-4 rounded-2xl font-black text-black bg-brand-accent shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all active:scale-95"
                            >
                                ONAYLA
                            </button>
                        </div>
                    </div>
                </div>
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
