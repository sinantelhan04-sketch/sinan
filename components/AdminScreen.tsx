
import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as sheetService from '../services/sheetService';
import { 
    Users, Shield, Trash2, Edit3, BarChart3, 
    UserCheck, RefreshCw, Download, AlertTriangle, 
    Zap, RotateCcw, Search, Phone, MessageSquare,
    Smartphone, Flame, LayoutDashboard, Database, Megaphone, CheckCircle2, XCircle, ChevronRight, LogOut, Menu, X,
    TrendingUp, AlertCircle, User, FileText, Settings, Bell, Clock, Activity, MapPin, Check, ShieldCheck, Plus,
    Trophy, Crown, Star, Award, Camera, Navigation, AlertTriangle as AlertTriangleIcon
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    AreaChart, Area, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
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

// --- UI Icons & Components ---
const DatabaseIcon = ({ className = "h-6 w-6" }: { className?: string }) => <Database className={className} />;
const MegaphoneIcon = ({ className = "h-5 w-5" }: { className?: string }) => <Megaphone className={className} />;
const SearchIcon = ({ className = "w-5 h-5" }: { className?: string }) => <Search className={className} />;
const DownloadIcon = ({ className = "w-5 h-5" }: { className?: string }) => <Download className={className} />;
const ReportIcon = ({ className = "w-5 h-5" }: { className?: string }) => <AlertCircle className={className} />;
const DeviceResetIcon = ({ className = "w-5 h-5" }: { className?: string }) => <RotateCcw className={className} />;
const CounterResetIcon = ({ className = "w-5 h-5" }: { className?: string }) => <RefreshCw className={className} />;
const EditIcon = ({ className = "w-5 h-5", size }: { className?: string, size?: number }) => <Edit3 className={className} size={size} />;
const TrashIcon = ({ className = "w-5 h-5" }: { className?: string }) => <Trash2 className={className} />;
const UserIcon = ({ className = "w-5 h-5" }: { className?: string }) => <User className={className} />;
const PhoneIconSolid = ({ className = "w-4 h-4" }: { className?: string }) => <Phone className={className} fill="currentColor" />;
const MessageIcon = ({ className = "w-4 h-4" }: { className?: string }) => <MessageSquare className={className} />;

const MedalIcon = ({ rank }: { rank: number }) => {
    let colorClass = "text-slate-400 bg-slate-50 border-slate-200";
    let Icon = null;
    
    if (rank === 1) {
        colorClass = "text-yellow-600 bg-yellow-50 border-yellow-200";
        Icon = <Crown size={16} />;
    } else if (rank === 2) {
        colorClass = "text-slate-500 bg-slate-50 border-slate-200";
        Icon = <Award size={16} />;
    } else if (rank === 3) {
        colorClass = "text-orange-600 bg-orange-50 border-orange-200";
        Icon = <Star size={16} />;
    }

    return (
        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border ${colorClass} shadow-sm`}>
            {Icon || rank}
        </div>
    );
};

const SidebarItem = ({ icon, label, active, onClick, badge }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void, badge?: number }) => (
    <button 
        onClick={onClick}
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group relative ${
            active 
            ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
    >
        <div className="flex items-center gap-3 relative z-10">
            <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-brand-accent'} transition-colors`}>
                {icon}
            </span>
            <span className="text-sm font-bold tracking-tight">{label}</span>
        </div>
        {badge !== undefined && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black relative z-10 ${active ? 'bg-white text-brand-accent' : 'bg-brand-accent text-white shadow-sm shadow-brand-accent/50'}`}>
                {badge}
            </span>
        )}
        {active && (
            <motion.div 
                layoutId="sidebar-active"
                className="absolute inset-0 bg-brand-accent rounded-xl"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
        )}
    </button>
);

const StatCard = ({ title, value, icon, trend, color = "brand-accent" }: { title: string, value: string | number, icon: React.ReactNode, trend?: string, color?: string }) => (
    <div className="card-hardware p-6 relative overflow-hidden group hover:shadow-xl hover:shadow-brand-accent/5 transition-all duration-300">
        <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none text-${color}`}>
            {React.cloneElement(icon as React.ReactElement, { size: 100 })}
        </div>
        <div className="flex items-start justify-between relative z-10">
            <div>
                <p className="label-hardware mb-1">{title}</p>
                <h3 className="text-3xl font-black text-brand-text tracking-tight font-mono">{value}</h3>
                {trend && (
                    <p className="text-[10px] font-bold text-green-600 mt-2 flex items-center gap-1">
                        <TrendingUp size={12} /> {trend}
                    </p>
                )}
            </div>
            <div className={`p-3 bg-brand-bg text-${color} rounded-2xl border border-brand-border shadow-sm group-hover:bg-white transition-colors`}>
                {icon}
            </div>
        </div>
    </div>
);

const DashboardView = ({ 
    stats, 
    totalQueries, 
    monthlyTotalQueries, 
    totalCustomerCount, 
    dailyActivity, 
    topPerformer, 
    topPerformerDetails, 
    topQueries, 
    reportedErrors,
    handleDownloadReportedErrors,
    isDownloadingErrors
}: any) => {
    return (
        <div className="space-y-8 pb-12">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Bu Ayki Toplam Sorgu" 
                    value={monthlyTotalQueries.toLocaleString()} 
                    icon={<Activity size={24} />} 
                    trend="+12% geçen aya göre"
                    color="brand-accent"
                />
                <StatCard 
                    title="Toplam Müşteri Sayısı" 
                    value={totalCustomerCount.toLocaleString()} 
                    icon={<Database size={24} />} 
                    color="blue-500"
                />
                <StatCard 
                    title="Aktif Personel (Bugün)" 
                    value={stats.filter((s: any) => new Date(s.lastLogin).toDateString() === new Date().toDateString()).length} 
                    icon={<Users size={24} />} 
                    color="green-500"
                />
                <StatCard 
                    title="Toplam Sistem Sorgusu" 
                    value={totalQueries.toLocaleString()} 
                    icon={<Zap size={24} />} 
                    color="orange-500"
                />
            </div>

            <div className="grid grid-cols-12 gap-8">
                {/* Sol Taraf: Grafik ve Aktivite (9/12) */}
                <div className="col-span-12 lg:col-span-9 space-y-8">
                    {/* Activity Chart */}
                    <div className="card-hardware p-8 bg-white">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-xl font-black text-brand-text tracking-tight uppercase">Sistem Aktivite Grafiği</h3>
                                <p className="label-hardware">Son 14 Günlük Sorgu Dağılımı</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-brand-accent shadow-sm shadow-brand-accent/50"></div>
                                    <span className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Günlük Sorgular</span>
                                </div>
                            </div>
                        </div>
                        <div className="h-[350px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dailyActivity}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--color-brand-accent)" stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor="var(--color-brand-accent)" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                                        dy={10}
                                    />
                                    <YAxis 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}}
                                    />
                                    <Tooltip 
                                        contentStyle={{ 
                                            backgroundColor: '#0F172A', 
                                            border: 'none', 
                                            borderRadius: '16px',
                                            padding: '12px',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                                        }}
                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ color: '#94a3b8', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="value" 
                                        stroke="var(--color-brand-accent)" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#colorValue)" 
                                        animationDuration={1500}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Performance Highlights */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="card-hardware p-6 bg-gradient-to-br from-brand-accent/5 to-transparent border-brand-accent/10"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-3xl bg-brand-accent flex items-center justify-center text-black shadow-xl shadow-brand-accent/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    <Trophy size={40} className="relative z-10" />
                                </div>
                                <div>
                                    <p className="label-hardware">Ayın En Çok Sorgu Yapanı</p>
                                    <h4 className="text-2xl font-black text-brand-text tracking-tight">{topPerformerDetails?.fullName || topPerformer.username}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded-full bg-brand-accent text-white text-[10px] font-black uppercase tracking-wider">
                                            {topPerformer.queryCount} Sorgu
                                        </span>
                                        <span className="text-[10px] font-bold text-brand-text-muted uppercase">{topPerformerDetails?.title || 'Personel'}</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                        <motion.div 
                            whileHover={{ y: -5 }}
                            className="card-hardware p-6 bg-gradient-to-br from-green-500/5 to-transparent border-green-500/10"
                        >
                            <div className="flex items-center gap-5">
                                <div className="w-20 h-20 rounded-3xl bg-green-500 flex items-center justify-center text-white shadow-xl shadow-green-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                    <ShieldCheck size={40} className="relative z-10" />
                                </div>
                                <div>
                                    <p className="label-hardware">Sistem Güvenlik Durumu</p>
                                    <h4 className="text-2xl font-black text-brand-text tracking-tight">Korumalı</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded-full bg-green-500 text-white text-[10px] font-black uppercase tracking-wider">
                                            Aktif
                                        </span>
                                        <span className="text-[10px] font-bold text-brand-text-muted uppercase">Tüm Sistemler Çevrimiçi</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Sağ Taraf: Trendler ve Hatalar (3/12) */}
                <div className="col-span-12 lg:col-span-3 space-y-6">
                    <div className="card-hardware p-6 bg-white">
                        <h3 className="font-black text-brand-text text-xs uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <TrendingUp size={16} className="text-brand-accent" />
                            Trend Sorgular
                        </h3>
                        <div className="space-y-4">
                            {topQueries.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between group cursor-default p-2 rounded-xl hover:bg-brand-bg transition-colors">
                                    <div className="flex items-center gap-3">
                                        <MedalIcon rank={index + 1} />
                                        <span className="text-xs font-bold text-brand-text font-mono tracking-tight">{item.installationNumber}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-brand-accent">{item.count}</span>
                                        <span className="text-[8px] font-bold text-brand-text-muted uppercase">Sorgu</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="card-hardware p-6 bg-white">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-brand-text text-xs uppercase tracking-[0.2em] flex items-center gap-2">
                                <AlertCircle size={16} className="text-red-500" />
                                Hatalı Bildirimler
                            </h3>
                            <button 
                                onClick={handleDownloadReportedErrors}
                                disabled={isDownloadingErrors}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors disabled:opacity-50"
                                title="Hataları İndir"
                            >
                                <Download size={14} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            {reportedErrors.map((item: any, index: number) => (
                                <div key={index} className="flex items-center justify-between group cursor-default p-2 rounded-xl hover:bg-red-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></div>
                                        <span className="text-xs font-bold text-brand-text font-mono tracking-tight">{item.installationNumber}</span>
                                    </div>
                                    <div className="flex flex-col items-end">
                                        <span className="text-[10px] font-black text-red-500">{item.count}</span>
                                        <span className="text-[8px] font-bold text-brand-text-muted uppercase">Hata</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
    // Tab State
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'update' | 'announcement' | 'logs' | 'approvals'>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
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
    const [dailyActivity, setDailyActivity] = useState<any[]>([]);
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [logUserFilter, setLogUserFilter] = useState('');
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
            
            // Calculate monthly and total queries from stats
            const mTotal = userStats.reduce((acc, s) => acc + s.queryCount, 0);
            const gTotal = userStats.reduce((acc, s) => acc + s.totalQueryCount, 0);
            setMonthlyTotalQueries(mTotal);
            setTotalQueries(gTotal);
            
            setTopQueries(top);
            setReportedErrors(reports);
            setTotalCustomerCount(count);
            setPendingUpdates(pending);

            // Process daily activity for charts
            const activityByDay: Record<string, number> = {};
            logs.forEach((log: any) => {
                const date = new Date(log.timestamp).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
                activityByDay[date] = (activityByDay[date] || 0) + 1;
            });
            const chartData = Object.entries(activityByDay)
                .map(([name, value]) => ({ name, value }))
                .reverse()
                .slice(-14); // Last 14 days
            setDailyActivity(chartData);

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

    const [geocodedCustomerCoords, setGeocodedCustomerCoords] = useState<{lat: number, lng: number} | null>(null);
    const [isGeocoding, setIsGeocoding] = useState(false);

    useEffect(() => {
        if (selectedUpdate && selectedUpdate.customerAddress && (selectedUpdate.customerLat === 0 || selectedUpdate.customerLng === 0)) {
            const geocodeAddress = async () => {
                setIsGeocoding(true);
                try {
                    const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(selectedUpdate.customerAddress!)}&limit=1`);
                    const data = await response.json();
                    if (data && data.length > 0) {
                        setGeocodedCustomerCoords({
                            lat: parseFloat(data[0].lat),
                            lng: parseFloat(data[0].lon)
                        });
                    }
                } catch (e) {
                    console.error("Geocoding error:", e);
                } finally {
                    setIsGeocoding(false);
                }
            };
            geocodeAddress();
        } else {
            setGeocodedCustomerCoords(null);
        }
    }, [selectedUpdate]);

    const getEffectiveCustomerCoords = () => {
        if (selectedUpdate && selectedUpdate.customerLat && selectedUpdate.customerLng) {
            return { lat: selectedUpdate.customerLat, lng: selectedUpdate.customerLng };
        }
        return { lat: 0, lng: 0 };
    };

    // --- Tab Rendering Functions ---
    const renderUsersTab = () => (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl border border-brand-border shadow-sm">
                <div className="relative flex-grow max-w-md w-full">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-muted">
                        <SearchIcon className="w-4 h-4" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="İsim, sicil no veya ünvan ara..."
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                        className="input-hardware w-full pl-11 bg-brand-bg/50 border-transparent focus:bg-white focus:border-brand-accent h-11 text-sm"
                    />
                </div>
                <button 
                    onClick={() => { resetForm(); setEditingUser(null); setShowAddModal(true); }}
                    className="btn-hardware w-full sm:w-auto h-11 px-6 shadow-md shadow-brand-accent/20"
                >
                    <Plus size={18} /> Yeni Personel
                </button>
            </div>

            <div className="card-hardware bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-brand-bg/30 border-b border-brand-border text-left">
                                <th className="px-6 py-4 label-hardware">Personel Bilgileri</th>
                                <th className="px-6 py-4 label-hardware">Durum</th>
                                <th className="px-6 py-4 label-hardware">Sorgu Verileri</th>
                                <th className="px-6 py-4 label-hardware text-right">Yönetim</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/50">
                            {filteredUsers.map((user) => {
                                const userStat = stats.find(s => s.username === user.username);
                                const isOnline = userStat && new Date(userStat.lastLogin).toDateString() === new Date().toDateString();
                                
                                return (
                                    <tr key={user.username} className="hover:bg-brand-accent/[0.02] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative">
                                                    <div className="w-12 h-12 rounded-2xl bg-brand-bg border border-brand-border overflow-hidden flex items-center justify-center shadow-sm">
                                                        {user.photoUrl ? (
                                                            <img src={user.photoUrl} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <User size={24} className="text-brand-text-muted" />
                                                        )}
                                                    </div>
                                                    {isOnline && (
                                                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm"></div>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-brand-text tracking-tight">{user.fullName || user.username}</div>
                                                    <div className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider">{user.title || 'Personel'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                                    isOnline 
                                                    ? 'bg-green-50 text-green-600 border-green-100' 
                                                    : 'bg-slate-50 text-slate-400 border-slate-100'
                                                }`}>
                                                    {isOnline ? 'Çevrimiçi' : 'Çevrimdışı'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <div className="text-xs font-black text-brand-text font-mono">
                                                    {userStat?.queryCount || 0} <span className="text-[10px] text-brand-text-muted font-sans font-bold uppercase ml-1">Bu Ay</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-brand-text-muted font-mono">
                                                    {userStat?.totalQueryCount || 0} <span className="text-[8px] uppercase ml-1">Toplam</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                                                <button onClick={() => handleResetDevice(user.username)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:bg-brand-accent hover:text-white border border-brand-border hover:border-brand-accent shadow-sm transition-all" title="Cihaz Kilidini Sıfırla"><DeviceResetIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleResetStats(user.username)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:bg-brand-accent hover:text-white border border-brand-border hover:border-brand-accent shadow-sm transition-all" title="Sayacı Sıfırla"><CounterResetIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleEditUser(user)} className="p-2.5 bg-white text-slate-400 rounded-xl hover:bg-brand-accent hover:text-white border border-brand-border hover:border-brand-accent shadow-sm transition-all" title="Düzenle"><EditIcon className="w-4 h-4" /></button>
                                                <button onClick={() => handleDeleteUser(user.username)} className="p-2.5 bg-white text-red-400 rounded-xl hover:bg-red-500 hover:text-white border border-brand-border hover:border-red-500 shadow-sm transition-all" title="Sil"><TrashIcon className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredUsers.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                            <Search size={32} />
                        </div>
                        <p className="text-brand-text-muted font-bold">Aradığınız kriterlere uygun personel bulunamadı.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderLogsTab = () => (
        <div className="animate-fade-in space-y-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4 items-center bg-white p-4 rounded-2xl border border-brand-border shadow-sm">
                <div className="relative flex-grow max-w-md w-full">
                    <select 
                        value={logUserFilter}
                        onChange={(e) => setLogUserFilter(e.target.value)}
                        className="input-hardware w-full appearance-none pr-10 bg-brand-bg/50 border-transparent focus:bg-white focus:border-brand-accent h-11 text-sm font-bold"
                    >
                        <option value="">Tüm Personeller</option>
                        {credentials.map(c => (
                            <option key={c.username} value={c.username}>{c.fullName || c.username}</option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-text-muted">
                        <ChevronRight size={16} className="rotate-90" />
                    </div>
                </div>
                <div className="text-xs font-bold text-brand-text-muted uppercase tracking-widest">
                    Son 100 İşlem Kaydı
                </div>
            </div>

            <div className="card-hardware bg-white overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-brand-bg/30 border-b border-brand-border text-left">
                                <th className="px-6 py-4 label-hardware">Zaman Damgası</th>
                                <th className="px-6 py-4 label-hardware">Personel</th>
                                <th className="px-6 py-4 label-hardware">İşlem Türü</th>
                                <th className="px-6 py-4 label-hardware">İşlem Detayları</th>
                                <th className="px-6 py-4 label-hardware text-right">Durum</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/50">
                            {globalLogs.filter(log => !logUserFilter || log.username === logUserFilter).slice(0, 100).map((log, idx) => (
                                <tr key={idx} className="hover:bg-brand-accent/[0.01] transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-brand-text-muted">
                                            <Clock size={12} />
                                            <span className="text-[11px] font-mono font-bold">
                                                {new Date(log.timestamp).toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-brand-text tracking-tight">
                                            {log.username}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                                            log.action.includes('Giriş') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                            log.action.includes('Sorgu') ? 'bg-brand-accent/5 text-brand-accent border-brand-accent/10' :
                                            'bg-slate-50 text-slate-500 border-slate-100'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-xs font-medium text-brand-text-muted truncate max-w-xs" title={log.details}>
                                            {log.details}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end">
                                            {log.status === 'success' ? (
                                                <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center text-green-500 border border-green-100">
                                                    <Check size={14} />
                                                </div>
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center text-red-500 border border-red-100">
                                                    <X size={14} />
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {globalLogs.length === 0 && (
                    <div className="p-20 text-center">
                        <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                            <Activity size={32} />
                        </div>
                        <p className="text-brand-text-muted font-bold">Henüz bir işlem kaydı bulunmuyor.</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderApprovalsTab = () => (
        <div className="animate-fade-in space-y-6">
            <div className="card-hardware bg-white overflow-hidden">
                <div className="p-8 border-b border-brand-border bg-gradient-to-r from-brand-bg/50 to-transparent flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-black text-brand-text uppercase tracking-tight">Onay Bekleyen Talepler</h3>
                        <p className="text-xs text-brand-text-muted mt-1 font-bold">Telefon numarası güncelleme istekleri için yönetici onayı gereklidir.</p>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                        <CheckCircle2 size={24} />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-brand-bg/30 border-b border-brand-border text-left">
                                <th className="px-6 py-4 label-hardware">Talep Tarihi</th>
                                <th className="px-6 py-4 label-hardware">Talep Eden</th>
                                <th className="px-6 py-4 label-hardware">Tesisat No</th>
                                <th className="px-6 py-4 label-hardware">Yeni Numara</th>
                                <th className="px-6 py-4 label-hardware text-right">Aksiyon</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-brand-border/50">
                            {pendingUpdates.map((update) => (
                                <tr key={update.id} className="hover:bg-brand-accent/[0.01] transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-brand-text-muted">
                                            <Clock size={12} />
                                            <span className="text-[11px] font-mono font-bold">
                                                {new Date(update.createdAt!).toLocaleString('tr-TR')}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-black text-brand-text tracking-tight">
                                            {update.userFullName || update.username}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-mono font-black text-brand-text bg-brand-bg px-2 py-1 rounded-lg border border-brand-border inline-block">
                                            {update.installationNumber}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2 text-brand-accent">
                                            <Phone size={12} fill="currentColor" />
                                            <span className="text-sm font-black tracking-tight">{update.newPhone}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedUpdate(update)}
                                            className="px-5 py-2.5 bg-brand-text text-white text-[10px] font-black rounded-xl hover:bg-black transition-all active:scale-95 shadow-md shadow-black/10 uppercase tracking-widest"
                                        >
                                            İncele
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {pendingUpdates.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="w-16 h-16 bg-brand-bg rounded-full flex items-center justify-center mx-auto mb-4 text-brand-text-muted">
                                            <CheckCircle2 size={32} />
                                        </div>
                                        <p className="text-brand-text-muted font-bold">Şu an için bekleyen bir onay talebi bulunmuyor.</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const renderUpdateTab = () => (
        <div className="animate-fade-in space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="card-hardware bg-white p-10 flex flex-col items-center text-center space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none text-brand-accent">
                        <Database size={120} />
                    </div>
                    
                    <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-3xl flex items-center justify-center border border-brand-accent/20 shadow-sm relative z-10">
                        <Database size={32} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-brand-text uppercase tracking-tight">Veri Yükleme</h3>
                        <p className="text-sm text-brand-text-muted mt-2 font-medium">Sisteme toplu abone verisi yükleyin (.CSV formatında)</p>
                    </div>
                    
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-brand-border rounded-[32px] p-12 hover:border-brand-accent hover:bg-brand-accent/[0.02] transition-all cursor-pointer group/upload relative z-10 bg-brand-bg/30"
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                        <div className="flex flex-col items-center gap-4">
                            <div className="p-5 bg-white rounded-2xl text-brand-text-muted group-hover/upload:text-brand-accent group-hover/upload:scale-110 transition-all shadow-sm border border-brand-border">
                                <Plus size={32} />
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-black text-brand-text">Dosya Seçin</p>
                                <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">veya buraya sürükleyin</p>
                            </div>
                        </div>
                    </div>

                    {uploadFile && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full p-5 bg-brand-accent/5 rounded-2xl border border-brand-accent/20 flex items-center justify-between relative z-10"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-accent shadow-sm">
                                    <FileText size={20} />
                                </div>
                                <div className="text-left">
                                    <p className="text-sm font-black text-brand-text truncate max-w-[200px]">{uploadFile.name}</p>
                                    <p className="text-[10px] font-bold text-brand-text-muted uppercase">{(uploadFile.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <button onClick={() => setUploadFile(null)} className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={20} /></button>
                        </motion.div>
                    )}

                    <div className="w-full space-y-3 relative z-10">
                        <button 
                            onClick={handleBulkUpload}
                            disabled={!uploadFile || isUploading}
                            className="btn-hardware w-full py-4 shadow-lg shadow-brand-accent/20 disabled:opacity-50 disabled:grayscale"
                        >
                            {isUploading ? (
                                <div className="flex items-center gap-3">
                                    <RefreshCw size={20} className="animate-spin" />
                                    <span>İşleniyor...</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <Zap size={20} />
                                    <span>Yüklemeyi Başlat</span>
                                </div>
                            )}
                        </button>
                        <button 
                            onClick={downloadSampleCsv}
                            className="w-full py-3 text-[10px] font-black text-brand-text-muted hover:text-brand-accent uppercase tracking-[0.2em] transition-colors"
                        >
                            Örnek Şablonu İndir
                        </button>
                    </div>
                </div>

                {/* Export Section */}
                <div className="card-hardware bg-white p-10 flex flex-col items-center text-center space-y-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity pointer-events-none text-brand-accent">
                        <Download size={120} />
                    </div>

                    <div className="w-20 h-20 bg-brand-accent/10 text-brand-accent rounded-3xl flex items-center justify-center border border-brand-accent/20 shadow-sm relative z-10">
                        <Download size={32} />
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-2xl font-black text-brand-text uppercase tracking-tight">Veri Yedekleme</h3>
                        <p className="text-sm text-brand-text-muted mt-2 font-medium">Tüm sistem verilerini güvenli bir şekilde dışa aktarın</p>
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full relative z-10">
                        <div className="p-10 bg-brand-bg/50 rounded-[32px] border border-brand-border w-full relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-brand-accent/10">
                                <div className="h-full bg-brand-accent w-full animate-pulse"></div>
                            </div>
                            <div className="flex items-center justify-between mb-6">
                                <div className="text-left">
                                    <span className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest block mb-1">Toplam Kayıt Sayısı</span>
                                    <span className="text-4xl font-black text-brand-text tracking-tighter font-mono">{totalCustomerCount.toLocaleString()}</span>
                                </div>
                                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-brand-accent shadow-sm border border-brand-border">
                                    <Database size={24} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-bold text-brand-text-muted uppercase">
                                    <span>Doluluk Oranı</span>
                                    <span>100%</span>
                                </div>
                                <div className="h-3 bg-white border border-brand-border rounded-full overflow-hidden p-0.5">
                                    <div className="h-full bg-brand-accent rounded-full shadow-sm shadow-brand-accent/50"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleDownloadDatabase}
                        disabled={isDownloading}
                        className="btn-hardware w-full py-4 bg-brand-text hover:bg-black shadow-lg shadow-black/10 relative z-10"
                    >
                        {isDownloading ? (
                            <div className="flex items-center gap-3">
                                <RefreshCw size={20} className="animate-spin" />
                                <span>Hazırlanıyor...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Download size={20} />
                                <span>Veritabanını İndir (.CSV)</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    const renderAnnouncementTab = () => (
        <div className="animate-fade-in space-y-6">
            <div className="card-hardware bg-white p-10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-[0.02] group-hover:opacity-[0.05] transition-opacity pointer-events-none text-brand-accent">
                    <Megaphone size={150} />
                </div>

                <div className="flex items-center gap-5 mb-10 relative z-10">
                    <div className="p-4 bg-brand-accent/10 text-brand-accent rounded-[24px] border border-brand-accent/20 shadow-sm">
                        <Megaphone size={32} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-brand-text uppercase tracking-tight">Yeni Duyuru Yayınla</h3>
                        <p className="text-sm text-brand-text-muted font-bold">Tüm personellere veya seçili kişilere anlık bildirim gönderin</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 relative z-10">
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="label-hardware ml-1">Duyuru Başlığı</label>
                            <input 
                                type="text" 
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, title: e.target.value }))}
                                className="input-hardware w-full bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-14 font-bold"
                                placeholder="Örn: Mesai Saati Değişikliği"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="label-hardware ml-1">Duyuru İçeriği</label>
                            <textarea 
                                value={announcementForm.content}
                                onChange={(e) => setAnnouncementForm(prev => ({ ...prev, content: e.target.value }))}
                                className="input-hardware w-full min-h-[200px] resize-none bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent p-5 font-medium"
                                placeholder="Duyuru detaylarını buraya yazın..."
                            />
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="label-hardware ml-1">Görsel (Opsiyonel)</label>
                            <div 
                                onClick={() => announcementImageRef.current?.click()}
                                className="border-2 border-dashed border-brand-border rounded-[32px] p-8 hover:border-brand-accent hover:bg-brand-accent/[0.02] transition-all cursor-pointer flex flex-col items-center justify-center min-h-[200px] bg-brand-bg/30 group/img"
                            >
                                <input type="file" ref={announcementImageRef} onChange={handleAnnouncementImageChange} accept="image/*" className="hidden" />
                                {announcementForm.imageUrl ? (
                                    <div className="relative group/preview">
                                        <img src={announcementForm.imageUrl} alt="Önizleme" className="max-h-40 rounded-2xl shadow-lg border-4 border-white" />
                                        <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-white text-[10px] font-black uppercase tracking-widest">Değiştir</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center space-y-3">
                                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mx-auto text-brand-text-muted group-hover/img:text-brand-accent group-hover/img:scale-110 transition-all shadow-sm border border-brand-border">
                                            <Plus size={24} />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-brand-text">Görsel Ekle</p>
                                            <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">JPG, PNG (Max 2MB)</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="label-hardware ml-1">Hedef Kitle</label>
                            <div className="relative">
                                <select 
                                    value={announcementForm.targetUsers[0]}
                                    onChange={(e) => setAnnouncementForm(prev => ({ ...prev, targetUsers: [e.target.value] }))}
                                    className="input-hardware w-full appearance-none pr-12 bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-14 font-bold"
                                >
                                    <option value="all">Tüm Personeller</option>
                                    {credentials.map(c => (
                                        <option key={c.username} value={c.username}>{c.fullName || c.username}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 pr-5 flex items-center pointer-events-none text-brand-text-muted">
                                    <ChevronRight size={20} className="rotate-90" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-end gap-4 mt-12 pt-8 border-t border-brand-border relative z-10">
                    <button 
                        onClick={() => setShowAnnouncementPreview(true)}
                        className="px-10 py-4 bg-white text-brand-text font-black rounded-2xl hover:bg-brand-bg transition-all border border-brand-border uppercase text-xs tracking-widest shadow-sm active:scale-95"
                    >
                        Önizleme
                    </button>
                    <button 
                        onClick={handleSendAnnouncement}
                        disabled={isSendingAnnouncement}
                        className="btn-hardware px-12 py-4 shadow-lg shadow-brand-accent/20"
                    >
                        {isSendingAnnouncement ? (
                            <div className="flex items-center gap-3">
                                <RefreshCw size={20} className="animate-spin" />
                                <span>Yayınlanıyor...</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3">
                                <Megaphone size={20} />
                                <span>Şimdi Yayınla</span>
                            </div>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

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
        <div className="min-h-screen bg-[#F8FAFC] flex text-[#1E293B] font-sans selection:bg-brand-accent/30">
            {/* --- Sidebar --- */}
            <aside 
                className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0F172A] text-white transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="flex flex-col h-full">
                    {/* Sidebar Header */}
                    <div className="p-6 flex items-center gap-3 border-b border-white/10">
                        <div className="w-10 h-10 bg-brand-accent rounded-xl flex items-center justify-center text-black shadow-lg shadow-brand-accent/20">
                            <Flame size={24} />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold tracking-tight leading-none">Ağrı Gaz</h1>
                            <span className="text-[10px] font-bold text-brand-accent tracking-widest uppercase opacity-80">Yönetim Paneli</span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                        <SidebarItem 
                            icon={<LayoutDashboard size={20} />} 
                            label="Dashboard" 
                            active={activeTab === 'dashboard'} 
                            onClick={() => setActiveTab('dashboard')} 
                        />
                        <SidebarItem 
                            icon={<Users size={20} />} 
                            label="Kullanıcılar" 
                            active={activeTab === 'users'} 
                            onClick={() => setActiveTab('users')} 
                        />
                        <SidebarItem 
                            icon={<BarChart3 size={20} />} 
                            label="İşlem Geçmişi" 
                            active={activeTab === 'logs'} 
                            onClick={() => setActiveTab('logs')} 
                        />
                        <SidebarItem 
                            icon={<CheckCircle2 size={20} />} 
                            label="Onay Bekleyenler" 
                            active={activeTab === 'approvals'} 
                            badge={pendingUpdates.length > 0 ? pendingUpdates.length : undefined}
                            onClick={() => setActiveTab('approvals')} 
                        />
                        <SidebarItem 
                            icon={<Database size={20} />} 
                            label="Veri Yönetimi" 
                            active={activeTab === 'update'} 
                            onClick={() => setActiveTab('update')} 
                        />
                        <SidebarItem 
                            icon={<Megaphone size={20} />} 
                            label="Duyurular" 
                            active={activeTab === 'announcement'} 
                            onClick={() => setActiveTab('announcement')} 
                        />
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-4 border-t border-white/10">
                        <button 
                            onClick={onLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors font-bold text-sm"
                        >
                            <LogOut size={20} />
                            Güvenli Çıkış
                        </button>
                    </div>
                </div>
            </aside>

            {/* --- Main Content --- */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                            className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
                        >
                            <Menu size={20} />
                        </button>
                        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">
                            {activeTab === 'dashboard' && 'Genel Bakış'}
                            {activeTab === 'users' && 'Kullanıcı Yönetimi'}
                            {activeTab === 'logs' && 'Sistem Kayıtları'}
                            {activeTab === 'approvals' && 'Onay İşlemleri'}
                            {activeTab === 'update' && 'Veritabanı İşlemleri'}
                            {activeTab === 'announcement' && 'Duyuru Yönetimi'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={loadData}
                            className={`p-2 text-slate-400 hover:text-brand-accent hover:bg-brand-accent/10 rounded-lg transition-all ${loading ? 'animate-spin' : ''}`}
                        >
                            <RefreshCw size={18} />
                        </button>
                        <div className="h-8 w-px bg-slate-200 mx-2"></div>
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <div className="text-xs font-bold text-slate-900">Admin</div>
                                <div className="text-[10px] text-slate-500 font-medium">Sistem Yöneticisi</div>
                            </div>
                            <div className="w-9 h-9 bg-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                A
                            </div>
                        </div>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="max-w-7xl mx-auto"
                        >
                            {activeTab === 'dashboard' && (
                                <DashboardView 
                                    stats={stats}
                                    totalQueries={totalQueries}
                                    monthlyTotalQueries={monthlyTotalQueries}
                                    totalCustomerCount={totalCustomerCount}
                                    dailyActivity={dailyActivity}
                                    topPerformer={topPerformer}
                                    topPerformerDetails={topPerformerDetails}
                                    topQueries={topQueries}
                                    reportedErrors={reportedErrors}
                                    handleDownloadReportedErrors={handleDownloadReportedErrors}
                                    isDownloadingErrors={isDownloadingErrors}
                                />
                            )}
                            {activeTab === 'users' && renderUsersTab()}
                            {activeTab === 'logs' && renderLogsTab()}
                            {activeTab === 'approvals' && renderApprovalsTab()}
                            {activeTab === 'update' && renderUpdateTab()}
                            {activeTab === 'announcement' && renderAnnouncementTab()}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>

            {/* --- Modals --- */}
            {showAddModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-text/60 backdrop-blur-md animate-fade-in">
                    <div className="bg-white border border-brand-border w-full max-w-lg rounded-[40px] shadow-2xl shadow-black/20 overflow-hidden animate-soft-slide-up">
                        <div className="px-10 py-8 border-b border-brand-border bg-gradient-to-r from-brand-bg/50 to-transparent flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-brand-accent/10 border border-brand-accent/20 flex items-center justify-center text-brand-accent">
                                    {editingUser ? <EditIcon size={24} /> : <Plus size={24} />}
                                </div>
                                <div>
                                    <h3 className="font-black text-xl text-brand-text tracking-tight uppercase">{editingUser ? 'Personel Düzenle' : 'Yeni Personel Ekle'}</h3>
                                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Sistem erişim yetkilerini belirleyin</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="w-10 h-10 rounded-full hover:bg-brand-bg flex items-center justify-center text-brand-text-muted transition-colors text-2xl leading-none">×</button>
                        </div>
                        <form onSubmit={handleSubmitUser} className="p-10 space-y-6">
                            {/* Profil Fotoğrafı Bölümü */}
                            <div className="flex justify-center">
                                <div className="relative group">
                                    <div 
                                        onClick={() => userPhotoRef.current?.click()}
                                        className="w-28 h-28 rounded-[32px] border-4 border-brand-bg overflow-hidden bg-brand-bg flex items-center justify-center cursor-pointer hover:border-brand-accent transition-all relative shadow-inner group-hover:shadow-xl"
                                    >
                                        {formData.photoUrl ? (
                                            <img src={formData.photoUrl} alt="Profil" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="text-brand-text-muted group-hover:text-brand-accent transition-colors">
                                                <User size={40} />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Camera className="w-8 h-8 text-white" />
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
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg hover:bg-red-600 transition-colors border-2 border-white"
                                        >
                                            <X size={12} />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="label-hardware ml-1">Sicil No</label>
                                    <input required type="text" name="username" value={formData.username} onChange={handleInputChange} readOnly={!!editingUser} className="input-hardware w-full bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-12 font-bold disabled:opacity-50" />
                                </div>
                                <div className="space-y-2">
                                    <label className="label-hardware ml-1">Şifre</label>
                                    <input required type="text" name="password" value={formData.password} onChange={handleInputChange} className="input-hardware w-full bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-12 font-bold" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="label-hardware ml-1">Ad Soyad</label>
                                <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="input-hardware w-full bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-12 font-bold" />
                            </div>
                            <div className="space-y-2">
                                <label className="label-hardware ml-1">Ünvan / Görev</label>
                                <div className="relative">
                                    <select 
                                        name="title" 
                                        value={formData.title} 
                                        onChange={handleInputChange} 
                                        className="input-hardware w-full appearance-none pr-12 bg-brand-bg/30 border-brand-border focus:bg-white focus:border-brand-accent h-12 font-bold"
                                    >
                                        {PREDEFINED_TITLES.map((t) => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-brand-text-muted">
                                        <ChevronRight size={16} className="rotate-90" />
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <label className="flex items-center gap-3 p-4 bg-brand-bg/30 border border-brand-border rounded-2xl cursor-pointer hover:bg-brand-accent/[0.03] hover:border-brand-accent/30 transition-all group">
                                    <input type="checkbox" name="skipDeviceLock" checked={formData.skipDeviceLock} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div>
                                        <div className="text-xs font-black text-brand-text group-hover:text-brand-accent transition-colors">Cihaz Kilidi</div>
                                        <div className="text-[9px] text-brand-text-muted uppercase font-bold tracking-tight">Serbest Erişim</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-brand-bg/30 border border-brand-border rounded-2xl cursor-pointer hover:bg-brand-accent/[0.03] hover:border-brand-accent/30 transition-all group">
                                    <input type="checkbox" name="canViewDetails" checked={formData.canViewDetails} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div>
                                        <div className="text-xs font-black text-brand-text group-hover:text-brand-accent transition-colors">Tam Yetki</div>
                                        <div className="text-[9px] text-brand-text-muted uppercase font-bold tracking-tight">İsimleri Gör</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-brand-bg/30 border border-brand-border rounded-2xl cursor-pointer hover:bg-brand-accent/[0.03] hover:border-brand-accent/30 transition-all group">
                                    <input type="checkbox" name="canViewPhone" checked={formData.canViewPhone} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div>
                                        <div className="text-xs font-black text-brand-text group-hover:text-brand-accent transition-colors">Tel. Gör</div>
                                        <div className="text-[9px] text-brand-text-muted uppercase font-bold tracking-tight">Numaraları Gör</div>
                                    </div>
                                </label>
                                <label className="flex items-center gap-3 p-4 bg-brand-bg/30 border border-brand-border rounded-2xl cursor-pointer hover:bg-brand-accent/[0.03] hover:border-brand-accent/30 transition-all group">
                                    <input type="checkbox" name="unlimitedAccess" checked={formData.unlimitedAccess} onChange={handleInputChange} className="w-5 h-5 rounded border-brand-border bg-white text-brand-accent focus:ring-brand-accent focus:ring-offset-brand-bg" />
                                    <div>
                                        <div className="text-xs font-black text-brand-text group-hover:text-brand-accent transition-colors">7/24 Erişim</div>
                                        <div className="text-[9px] text-brand-text-muted uppercase font-bold tracking-tight">Mesai Sınırı Yok</div>
                                    </div>
                                </label>
                            </div>
                            <div className="pt-4">
                                <button type="submit" className="btn-hardware w-full py-4 shadow-lg shadow-brand-accent/20">
                                    {editingUser ? 'Değişiklikleri Kaydet' : 'Personeli Kaydet'}
                                </button>
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
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-text/60 backdrop-blur-md animate-fade-in">
                    <div className="relative bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden animate-soft-slide-up border border-brand-border">
                        <div className="p-8 border-b border-brand-border flex justify-between items-center bg-gradient-to-r from-brand-bg/50 to-transparent">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-accent w-12 h-12 rounded-2xl flex items-center justify-center text-black shadow-lg shadow-brand-accent/20">
                                    <ReportIcon />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-brand-text tracking-tight uppercase">Talep Detayları</h3>
                                    <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-widest">Veri güncelleme isteğini inceleyin</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUpdate(null)} className="w-10 h-10 rounded-full hover:bg-brand-bg flex items-center justify-center text-brand-text-muted transition-colors text-2xl leading-none">×</button>
                        </div>

                        <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                                <div className="space-y-1.5 p-5 bg-brand-bg/30 rounded-2xl border border-brand-border">
                                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">Bildirim Yapan</p>
                                     <p className="text-base font-black text-brand-text">{selectedUpdate.userFullName || selectedUpdate.username}</p>
                                 </div>
                                 <div className="space-y-1.5 p-5 bg-brand-bg/30 rounded-2xl border border-brand-border">
                                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">Abone Bilgisi</p>
                                     <p className="text-base font-black text-brand-text">{selectedUpdate.customerName || '-'}</p>
                                 </div>
                                 <div className="space-y-1.5 p-5 bg-brand-bg/30 rounded-2xl border border-brand-border">
                                     <p className="text-[10px] font-black text-brand-text-muted uppercase tracking-widest">Tesisat No</p>
                                     <p className="text-base font-black text-brand-text font-mono tracking-tight">{selectedUpdate.installationNumber}</p>
                                 </div>
                                 <div className="space-y-1.5 p-5 bg-brand-accent/5 rounded-2xl border border-brand-accent/20">
                                     <p className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Yeni Telefon</p>
                                     <div className="flex items-center gap-2">
                                         <Phone size={16} className="text-brand-accent" fill="currentColor" />
                                         <p className="text-xl font-black text-brand-accent tracking-tighter">{selectedUpdate.newPhone}</p>
                                     </div>
                                 </div>
                             </div>

                             <div className="p-8 bg-brand-bg/50 rounded-[32px] border border-brand-border space-y-6 relative overflow-hidden">
                                 <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none text-brand-accent">
                                     <MapPin size={80} />
                                 </div>
                                 
                                 <h4 className="text-xs font-black text-brand-text uppercase tracking-[0.2em] flex items-center gap-2">
                                     <div className="w-1.5 h-1.5 bg-brand-accent rounded-full animate-pulse"></div>
                                     Konum ve Adres Analizi
                                 </h4>
                                 
                                 <div className="grid grid-cols-1 gap-5">
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider ml-1">Kullanıcı Konumu (Cihaz)</p>
                                         <div className="text-xs font-bold text-brand-text bg-white p-4 rounded-2xl border border-brand-border shadow-sm leading-relaxed">
                                             {selectedUpdate.userAddress || 'Adres bilgisi alınamadı.'}
                                         </div>
                                     </div>
                                     <div className="space-y-2">
                                         <p className="text-[10px] font-bold text-brand-text-muted uppercase tracking-wider ml-1">Tesisat Adresi (Sistem)</p>
                                         <div className="text-xs font-bold text-brand-text bg-white p-4 rounded-2xl border border-brand-border shadow-sm leading-relaxed">
                                             {selectedUpdate.customerAddress || 'Adres bilgisi bulunamadı.'}
                                         </div>
                                     </div>
                                 </div>

                                 <div className="pt-6 border-t border-brand-border flex items-center justify-between">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-text-muted shadow-sm border border-brand-border">
                                             <Navigation size={20} />
                                         </div>
                                         <span className="text-sm font-black text-brand-text uppercase tracking-tight">Analiz Mesafesi</span>
                                     </div>
                                     <div className="text-right">
                                         <span className={`text-3xl font-black tracking-tighter ${parseFloat(calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, getEffectiveCustomerCoords().lat, getEffectiveCustomerCoords().lng)) > 0.5 ? 'text-red-500' : 'text-green-600'}`}>
                                             {isGeocoding ? '...' : calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, getEffectiveCustomerCoords().lat, getEffectiveCustomerCoords().lng)}
                                         </span>
                                         <span className="text-sm font-black text-brand-text-muted ml-1 uppercase">km</span>
                                     </div>
                                 </div>
                                 
                                 {getEffectiveCustomerCoords().lat === 0 && !isGeocoding && (
                                     <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
                                         <AlertCircle size={14} className="text-orange-500" />
                                         <p className="text-[10px] text-orange-600 font-bold">
                                             Tesisat koordinatları sistemde eksik, mesafe hesaplanamadı.
                                         </p>
                                     </div>
                                 )}
                                 {parseFloat(calculateDistance(selectedUpdate.userLat, selectedUpdate.userLng, getEffectiveCustomerCoords().lat, getEffectiveCustomerCoords().lng)) > 0.5 && getEffectiveCustomerCoords().lat !== 0 && !isGeocoding && (
                                     <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                                         <AlertTriangle size={14} className="text-red-500" />
                                         <p className="text-[10px] text-red-600 font-bold">
                                             Kullanıcı tesisatın 500 metreden daha uzağında görünüyor!
                                         </p>
                                     </div>
                                 )}
                             </div>
                        </div>

                        <div className="p-8 bg-brand-bg/50 border-t border-brand-border flex gap-4">
                            <button 
                                onClick={() => handleRejectUpdate(selectedUpdate)}
                                className="flex-1 py-4 rounded-2xl font-black text-red-500 border-2 border-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Talebi Reddet
                            </button>
                            <button 
                                onClick={() => handleApproveUpdate(selectedUpdate)}
                                className="flex-1 py-4 rounded-2xl font-black text-black bg-brand-accent shadow-lg shadow-brand-accent/20 hover:bg-brand-accent/90 transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Talebi Onayla
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
