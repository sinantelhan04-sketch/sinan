
import React, { useState, useCallback, useEffect } from 'react';
import type { Customer } from '../types';
import * as sheetService from '../services/sheetService';
import { 
    MapPinIcon, 
    PhoneIcon, 
    UserIcon, 
    PhoneIconSolid, 
    MessageIcon, 
    SearchIcon, 
    ReportIcon, 
    ExpandIcon, 
    CloseIcon,
    WaterDropIcon,
    NavigationIcon,
    SmartphoneIcon,
    AppStoreIcon,
    PlayStoreIcon,
    GlobeIcon,
    FlameIcon,
    EditIcon
} from './icons';

interface MainScreenProps {
    onLogout: () => void;
    username: string;
    fullName?: string | null;
    title?: string | null;
    photoUrl?: string | null;
    canViewDetails: boolean;
    canViewPhone: boolean;
    unlimitedAccess: boolean;
    skipDeviceLock: boolean;
}

const MAX_RECENT_SEARCHES = 5;

const maskName = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    return parts.map(part => {
        if (part.length < 3) return part;
        return part.substring(0, 2) + '***'; 
    }).join(' ');
};

const maskPhone = (phone: string): string => {
    if (!phone) return '';
    const clean = phone.replace(/[^0-9]/g, '');
    if (clean.length < 10) return '*** *** ** **';
    // Format: 05xx *** ** 12
    return clean.substring(0, 4) + ' *** ** ' + clean.substring(clean.length - 2);
};

const MainScreen: React.FC<MainScreenProps> = ({ onLogout, username, fullName, title, photoUrl, canViewDetails, canViewPhone, unlimitedAccess, skipDeviceLock }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
    const [externalMapUrl, setExternalMapUrl] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const [showRecents, setShowRecents] = useState(false);
    const [currentLogId, setCurrentLogId] = useState<number | null>(null);
    const [reportSent, setReportSent] = useState(false);
    const [showFullScreenMap, setShowFullScreenMap] = useState(false);
    const [activeTab, setActiveTab] = useState('sorgu');
    const [showCallLogModal, setShowCallLogModal] = useState(false);
    const [callDuration, setCallDuration] = useState('');
    const [callStatus, setCallStatus] = useState('Ulaşıldı');
    const [userLogs, setUserLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);

    // Phone Update States
    const [reportedInstallations, setReportedInstallations] = useState<Customer[]>([]);
    const [selectedReportedInstallation, setSelectedReportedInstallation] = useState<Customer | null>(null);
    const [newPhoneNumber, setNewPhoneNumber] = useState('');
    const [isSubmittingUpdate, setIsSubmittingUpdate] = useState(false);
    const [updateSuccess, setUpdateSuccess] = useState(false);

    // Profile Edit States
    const [showProfileEditModal, setShowProfileEditModal] = useState(false);
    const [editPassword, setEditPassword] = useState('');
    const [editTitle, setEditTitle] = useState(title || '');
    const [editPhotoUrl, setEditPhotoUrl] = useState(photoUrl || '');
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
    const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false);
    
    const recentSearchesKey = `recent_searches_${username}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(recentSearchesKey);
            if (saved) setRecentSearches(JSON.parse(saved));
        } catch (e) {
            console.error("Geçmiş yüklenirken hata:", e);
        }
    }, [recentSearchesKey]);

    const loadReportedInstallations = useCallback(async () => {
        setLoadingLogs(true);
        try {
            const data = await sheetService.getReportedInstallations();
            setReportedInstallations(data);
        } catch (e) {
            console.error("Hatalı tesisatlar yüklenemedi:", e);
        } finally {
            setLoadingLogs(false);
        }
    }, []);

    useEffect(() => {
        if (activeTab === 'islemler') {
            const fetchLogs = async () => {
                setLoadingLogs(true);
                try {
                    const logs = await sheetService.getUserLogs(username);
                    setUserLogs(logs);
                    
                    const reported = await sheetService.getReportedInstallations();
                    setReportedInstallations(reported);
                } catch (e) {
                    console.error("Data fetch error:", e);
                } finally {
                    setLoadingLogs(false);
                }
            };
            fetchLogs();
        }
    }, [activeTab, username]);

    const handleSubmitUpdate = async () => {
        if (!selectedReportedInstallation || !newPhoneNumber.trim()) {
            setError('Lütfen geçerli bir telefon numarası girin.');
            return;
        }

        setIsSubmittingUpdate(true);
        setError('');

        try {
            // Konum al
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                });
            });

            const { latitude, longitude } = position.coords;

            await sheetService.submitPhoneUpdateRequest({
                username,
                installationNumber: selectedReportedInstallation.installationNumber,
                oldPhone: selectedReportedInstallation.phone,
                newPhone: newPhoneNumber.trim(),
                userLat: latitude,
                userLng: longitude,
                customerLat: parseFloat(String(selectedReportedInstallation.latitude || '0').replace(',', '.')),
                customerLng: parseFloat(String(selectedReportedInstallation.longitude || '0').replace(',', '.')),
                status: 'pending'
            });

            setUpdateSuccess(true);
            setNewPhoneNumber('');
            setSelectedReportedInstallation(null);
            
            // Listeyi yenile
            const reported = await sheetService.getReportedInstallations();
            setReportedInstallations(reported);
            
            setTimeout(() => setUpdateSuccess(false), 3000);

        } catch (err: any) {
            console.error("Güncelleme hatası:", err);
            if (err.code === 1) {
                setError('Konum izni reddedildi. Lütfen konum izni verin.');
            } else {
                setError(err.message || 'Bir hata oluştu.');
            }
        } finally {
            setIsSubmittingUpdate(false);
        }
    };

    const saveToRecents = (term: string) => {
        let updated = [term, ...recentSearches.filter(s => s !== term)];
        if (updated.length > MAX_RECENT_SEARCHES) updated = updated.slice(0, MAX_RECENT_SEARCHES);
        setRecentSearches(updated);
        localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
    };

    const handleClear = useCallback(() => {
        setSearchTerm('');
        setFoundCustomer(null);
        setLoading(false);
        setError('');
        setMapEmbedUrl(null);
        setExternalMapUrl(null);
        setSearchPerformed(false);
        setCurrentLogId(null);
        setReportSent(false);
    }, []);

    const performSearch = async (term: string) => {
        if (!term.trim()) return;
        setSearchPerformed(true);
        setError('');
        setLoading(true);
        setFoundCustomer(null);
        setMapEmbedUrl(null);
        setExternalMapUrl(null);
        setShowRecents(false);
        setReportSent(false);

        try {
            const customer = await sheetService.findCustomerByInstallationNumber(term.trim());
            setFoundCustomer(customer);
            saveToRecents(term.trim());

            let gmapsEmbedUrl = '';
            let extMapUrl = '';
            const cleanLat = String(customer.latitude || '').replace(',', '.').trim();
            const cleanLon = String(customer.longitude || '').replace(',', '.').trim();
            const lat = parseFloat(cleanLat);
            const lon = parseFloat(cleanLon);

            if (!isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0) {
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${lat},${lon}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
                extMapUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;
            } else if (customer.address) {
                const encodedAddress = encodeURIComponent(customer.address);
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                extMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            }

            if (gmapsEmbedUrl) setMapEmbedUrl(gmapsEmbedUrl);
            if (extMapUrl) setExternalMapUrl(extMapUrl);
            
            const logId = await sheetService.logSearchQuery(username, term.trim());
            if (logId) setCurrentLogId(logId);
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
            sheetService.logSearchQuery(username, term.trim()).catch(e => console.warn("Log hatası:", e));
        } finally {
            setLoading(false);
        }
    };

    const handleCallClick = (e: React.MouseEvent, phone: string) => {
        e.preventDefault();
        if (currentLogId) sheetService.updateSearchLogAction(currentLogId, 'call');
        let cleanPhone = String(phone).replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith('90')) cleanPhone = '+' + cleanPhone;
        else {
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            cleanPhone = '+90' + cleanPhone;
        }
        window.location.href = `tel:${cleanPhone}`;
        // Arama başlatıldıktan sonra modalı açıyoruz
        setTimeout(() => setShowCallLogModal(true), 1000);
    };

    const handleCallLogSubmit = async () => {
        if (currentLogId) {
            await sheetService.updateCallLogDetails(currentLogId, parseInt(callDuration) || 0, callStatus);
            // Tabloyu güncellemek için logları tekrar çekiyoruz
            if (activeTab === 'islemler') {
                const logs = await sheetService.getUserLogs(username);
                setUserLogs(logs);
            }
        }
        setShowCallLogModal(false);
        setCallDuration('');
        setCallStatus('Ulaşıldı');
    };

    const handleSmsClick = (e: React.MouseEvent, phone: string, name: string) => {
        e.preventDefault();
        if (currentLogId) sheetService.updateSearchLogAction(currentLogId, 'sms');
        let cleanPhone = String(phone).replace(/[^0-9]/g, "");
        if (cleanPhone.startsWith('90')) cleanPhone = '+' + cleanPhone;
        else {
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            cleanPhone = '+90' + cleanPhone;
        }
        const messageBody = `Sayın ${name}, Aksa Doğalgaz tesisat kontrolü için adresinize geldik ancak size ulaşamadık.`;
        window.location.href = `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`;
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (confirm("Bu tesisata ait telefon numarasının hatalı olduğunu bildirmek istiyor musunuz?")) {
            if (currentLogId) sheetService.updateSearchLogAction(currentLogId, 'report_error');
            setReportSent(true);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const numericValue = e.target.value.replace(/[^0-9]/g, '');
        setSearchTerm(numericValue);
        setShowRecents(true);
        if (foundCustomer || error) {
            setFoundCustomer(null);
            setMapEmbedUrl(null);
            setError('');
        }
        setSearchPerformed(false);
    };

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUpdatingProfile(true);
        try {
            await sheetService.updateUserProfile(username, {
                password: editPassword || undefined,
                title: editTitle,
                photoUrl: editPhotoUrl || undefined
            });
            setProfileUpdateSuccess(true);
            setTimeout(() => {
                setShowProfileEditModal(false);
                setProfileUpdateSuccess(false);
                // Refresh page to show new title or photo if changed
                if (editTitle !== title || editPhotoUrl !== photoUrl) {
                    window.location.reload();
                }
            }, 1500);
        } catch (err: any) {
            alert("Profil güncellenirken hata oluştu: " + err.message);
        } finally {
            setIsUpdatingProfile(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 500000) { // 500KB limit for base64 in DB
                alert("Dosya boyutu çok büyük (Maksimum 500KB)");
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setEditPhotoUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="min-h-screen bg-brand-bg pb-24">
            {/* Header */}
            <header className="bg-white px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-brand-accent rounded-full flex items-center justify-center shadow-sm overflow-hidden border-2 border-brand-accent/10">
                        {photoUrl ? (
                            <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                            <FlameIcon className="w-6 h-6 text-white" />
                        )}
                    </div>
                    <span className="text-xl font-black text-brand-accent tracking-tight">Tesisat Sorgulama</span>
                </div>
                <div className="flex items-center gap-2">
                    <button 
                        onClick={() => setActiveTab('profil')}
                        className="p-2 text-brand-text hover:bg-brand-bg rounded-full transition-colors"
                    >
                        <UserIcon />
                    </button>
                    <button 
                        onClick={onLogout}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
                        title="Çıkış Yap"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </header>

            <main className={`px-5 py-6 space-y-6 mx-auto transition-all duration-500 ${foundCustomer || activeTab !== 'sorgu' ? 'max-w-4xl' : 'max-w-lg'}`}>
                {activeTab === 'sorgu' && (
                    <>
                        {/* Search Bar */}
                        <div className="bg-white p-3 rounded-[20px] shadow-sm flex items-center gap-2">
                            <div className="flex-grow flex items-center px-4 gap-3">
                                <SearchIcon />
                                <input 
                                    type="tel"
                                    inputMode="numeric"
                                    value={searchTerm}
                                    onChange={handleInputChange}
                                    placeholder="Sorgu numara"
                                    className="w-full bg-transparent border-none focus:ring-0 text-brand-text font-medium placeholder:text-brand-text-muted/60"
                                />
                            </div>
                            <div className="flex gap-2">
                                {foundCustomer && (
                                    <button 
                                        onClick={handleClear}
                                        className="bg-gray-100 text-gray-600 px-4 py-3 rounded-xl font-bold active:scale-95 transition-all"
                                    >
                                        Temizle
                                    </button>
                                )}
                                <button 
                                    onClick={() => performSearch(searchTerm)}
                                    disabled={loading || !searchTerm}
                                    className="bg-brand-accent text-white px-6 py-3 rounded-xl font-bold shadow-md shadow-brand-accent/20 active:scale-95 transition-all disabled:opacity-50"
                                >
                                    {loading ? '...' : 'Sorgula'}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-medium border border-red-100 animate-shake">
                                {error}
                            </div>
                        )}

                        {foundCustomer && (
                            <div className="space-y-6 animate-soft-slide-up">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Abone Bilgileri Card */}
                                    <div className="bg-white p-6 rounded-[24px] shadow-sm space-y-6 flex flex-col justify-between">
                                        <div>
                                            <span className="label-hardware">ABONE BİLGİLERİ</span>
                                            <h2 className="text-2xl font-black text-brand-text tracking-tight">
                                                {canViewDetails ? foundCustomer.name : maskName(foundCustomer.name)}
                                            </h2>
                                            <div className="mt-2 flex flex-col gap-1">
                                                <p className="text-sm text-brand-text-muted font-medium">Abone No: {searchTerm}</p>
                                                {canViewPhone && (
                                                    <div className="flex items-center gap-2 text-sm font-bold">
                                                        <span className="text-brand-text-muted">Telefon:</span>
                                                        <span className="text-brand-accent">
                                                            {foundCustomer.phone}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            <button 
                                                onClick={(e) => handleCallClick(e, foundCustomer.phone)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-[#0a7a3d] text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                                            >
                                                <PhoneIconSolid /> Ara
                                            </button>
                                            <button 
                                                onClick={(e) => handleSmsClick(e, foundCustomer.phone, foundCustomer.name)}
                                                className="flex-1 flex items-center justify-center gap-2 bg-[#f59e0b] text-white py-3 rounded-xl font-bold active:scale-95 transition-all"
                                            >
                                                <MessageIcon /> Mesaj
                                            </button>
                                            <button 
                                                onClick={handleReportClick}
                                                disabled={reportSent}
                                                className="flex-1 flex items-center justify-center gap-2 bg-[#c02626] text-white py-3 rounded-xl font-bold active:scale-95 transition-all disabled:opacity-50"
                                            >
                                                <ReportIcon /> {reportSent ? 'Bildirildi' : 'Hatalı'}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Tesisat Adresi Card */}
                                    <div className="bg-white rounded-[24px] shadow-sm overflow-hidden flex border-l-[6px] border-brand-accent">
                                        <div className="p-6 flex gap-4 items-start">
                                            <div className="bg-blue-50 p-3 rounded-2xl text-brand-accent">
                                                <MapPinIcon />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="label-hardware">TESİSAT ADRESİ</span>
                                                <p className="text-lg font-bold text-brand-text leading-tight">
                                                    {foundCustomer.address}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Map Card */}
                                <div className="bg-[#1a1a1a] rounded-[24px] shadow-sm overflow-hidden relative aspect-video group">
                                    <div className="absolute inset-0 opacity-40">
                                        <img 
                                            src="https://picsum.photos/seed/map/800/600" 
                                            alt="Map Background" 
                                            className="w-full h-full object-cover grayscale"
                                            referrerPolicy="no-referrer"
                                        />
                                    </div>
                                    <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-md p-4 rounded-2xl flex justify-between items-center border border-white/20">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-brand-accent p-2 rounded-xl text-white">
                                                <GlobeIcon />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-brand-text">Lokasyon Verisi</p>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="text-red-500 scale-75">
                                                        <ReportIcon />
                                                    </div>
                                                    <p className="text-[10px] text-brand-text-muted font-mono">
                                                        {foundCustomer.latitude}, {foundCustomer.longitude}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        {externalMapUrl && (
                                            <a 
                                                href={externalMapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-brand-accent text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-brand-accent/20"
                                            >
                                                <NavigationIcon /> Navigasyon
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'harita' && (
                    <div className="space-y-6 animate-soft-slide-up">
                        <div className="bg-white p-6 rounded-[24px] shadow-sm">
                            <span className="label-hardware">HARİTA GÖRÜNÜMÜ</span>
                            <h2 className="text-2xl font-black text-brand-text tracking-tight mb-4">
                                {foundCustomer ? 'Abone Lokasyonu' : 'Tesisat Haritası'}
                            </h2>
                            
                            <div className="aspect-video bg-gray-100 rounded-2xl overflow-hidden relative border border-brand-border">
                                {mapEmbedUrl ? (
                                    <iframe
                                        src={mapEmbedUrl}
                                        width="100%"
                                        height="100%"
                                        style={{ border: 0 }}
                                        allowFullScreen
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                        title="Google Maps"
                                    ></iframe>
                                ) : (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-text-muted p-8 text-center">
                                        <div className="bg-gray-200 p-4 rounded-full mb-4">
                                            <GlobeIcon />
                                        </div>
                                        <p className="font-bold">Harita verisi bulunamadı.</p>
                                        <p className="text-xs mt-1">Lütfen önce bir tesisat sorgulaması yapın.</p>
                                    </div>
                                )}
                            </div>
                            
                            {externalMapUrl && (
                                <div className="mt-4">
                                    <a 
                                        href={externalMapUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full bg-brand-accent text-white py-4 rounded-xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                                    >
                                        <NavigationIcon /> Google Haritalarda Aç
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'islemler' && (
                    <div className="space-y-6 animate-soft-slide-up pb-20">
                        {/* Hatalı Telefon Bildirimleri */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm border border-red-100">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="bg-red-500 p-2 rounded-xl text-white shadow-lg shadow-red-500/20">
                                    <ReportIcon />
                                </div>
                                <div>
                                    <span className="label-hardware text-red-500">DÜZELTME GEREKENLER</span>
                                    <h2 className="text-xl font-black text-brand-text tracking-tight">
                                        Hatalı Telefonlar
                                    </h2>
                                </div>
                            </div>

                            {selectedReportedInstallation ? (
                                <div className="space-y-4 animate-fade-in">
                                    <div className="p-4 bg-brand-bg rounded-2xl border border-brand-border">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <p className="text-xs font-bold text-brand-text-muted uppercase">TESİSAT NO</p>
                                                <p className="font-black text-brand-text">{selectedReportedInstallation.installationNumber}</p>
                                            </div>
                                            <button 
                                                onClick={() => setSelectedReportedInstallation(null)}
                                                className="text-brand-text-muted hover:text-red-500"
                                            >
                                                <CloseIcon />
                                            </button>
                                        </div>
                                        <p className="text-xs font-bold text-brand-text-muted uppercase">ABONE</p>
                                        <p className="font-bold text-brand-text">{canViewDetails ? selectedReportedInstallation.name : maskName(selectedReportedInstallation.name)}</p>
                                        <p className="text-xs font-bold text-brand-text-muted uppercase mt-2">ESKİ TELEFON</p>
                                        <p className="font-bold text-brand-text">{canViewPhone ? selectedReportedInstallation.phone : maskPhone(selectedReportedInstallation.phone)}</p>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="label-hardware">GÜNCEL TELEFON NUMARASI</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-accent">
                                                <PhoneIcon />
                                            </div>
                                            <input 
                                                type="tel" 
                                                placeholder="05xx xxx xx xx"
                                                value={newPhoneNumber}
                                                onChange={(e) => setNewPhoneNumber(e.target.value)}
                                                className="input-hardware w-full pl-11"
                                            />
                                        </div>
                                    </div>

                                    <button 
                                        onClick={handleSubmitUpdate}
                                        disabled={isSubmittingUpdate || !newPhoneNumber.trim()}
                                        className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black shadow-lg shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmittingUpdate ? (
                                            <>
                                                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
                                                KONUM ALINIYOR VE GÖNDERİLİYOR...
                                            </>
                                        ) : (
                                            <>TAMAMLA</>
                                        )}
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                    {reportedInstallations.length > 0 ? (
                                        reportedInstallations.map((item, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setSelectedReportedInstallation(item)}
                                                className="w-full p-4 bg-brand-bg rounded-2xl border border-brand-border hover:border-brand-accent transition-all flex items-center justify-between group"
                                            >
                                                <div className="text-left">
                                                    <p className="font-bold text-brand-text">Tesisat No: {item.installationNumber}</p>
                                                    <p className="text-[10px] text-brand-text-muted font-bold uppercase">
                                                        {canViewDetails ? item.name : maskName(item.name)}
                                                    </p>
                                                </div>
                                                <div className="text-brand-accent group-hover:translate-x-1 transition-transform">
                                                    <ExpandIcon />
                                                </div>
                                            </button>
                                        ))
                                    ) : (
                                        <div className="py-8 text-center text-brand-text-muted">
                                            <p className="text-sm font-bold italic">Şu an düzeltme bekleyen tesisat bulunmuyor.</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Sorgu Geçmişi */}
                        <div className="bg-white p-6 rounded-[24px] shadow-sm">
                            <span className="label-hardware">SON İŞLEMLER</span>
                            <h2 className="text-2xl font-black text-brand-text tracking-tight mb-6">
                                Sorgu Geçmişi
                            </h2>
                            
                            <div className="space-y-3">
                                {loadingLogs ? (
                                    <div className="py-12 text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-brand-accent border-t-transparent rounded-full mx-auto mb-4"></div>
                                        <p className="text-sm font-bold text-brand-text-muted">Yükleniyor...</p>
                                    </div>
                                ) : userLogs.length > 0 ? (
                                    userLogs.map((log, idx) => (
                                        <div 
                                            key={idx}
                                            className="w-full p-4 bg-brand-bg rounded-2xl border border-brand-border hover:border-brand-accent transition-all group"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-white p-2 rounded-xl shadow-sm text-brand-accent">
                                                        <SearchIcon />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="font-bold text-brand-text">Tesisat No: {log.installationNumber}</p>
                                                        <p className="text-[10px] text-brand-text-muted uppercase font-bold">{log.timestamp}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        setSearchTerm(log.installationNumber);
                                                        setActiveTab('sorgu');
                                                        performSearch(log.installationNumber);
                                                    }}
                                                    className="bg-brand-accent/10 text-brand-accent px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase hover:bg-brand-accent hover:text-white transition-colors"
                                                >
                                                    Tekrar Sorgula
                                                </button>
                                            </div>
                                            
                                            {(log.called || log.smsSent) && (
                                                <div className="flex flex-wrap gap-2 pt-3 border-t border-brand-border/50">
                                                    {log.called && (
                                                        <div className="flex items-center gap-1.5 bg-green-500/10 text-green-600 px-3 py-1 rounded-full text-[10px] font-bold">
                                                            <PhoneIconSolid /> 
                                                            ARANDI 
                                                            {log.callDuration > 0 && ` (${log.callDuration} dk)`}
                                                            {log.callStatus && ` - ${log.callStatus}`}
                                                        </div>
                                                    )}
                                                    {log.smsSent && (
                                                        <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-600 px-3 py-1 rounded-full text-[10px] font-bold">
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                                <path d="M2 5a2 2 0 012-2h7a2 2 0 012 2v4a2 2 0 01-2 2H9l-3 3v-3H4a2 2 0 01-2-2V5z" />
                                                                <path d="M15 7v2a4 4 0 01-4 4H9.828l-1.766 1.767c.28.149.599.233.938.233h2l3 3v-3h2a2 2 0 002-2V9a2 2 0 00-2-2h-1z" />
                                                            </svg>
                                                            SMS GÖNDERİLDİ
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 text-center text-brand-text-muted">
                                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <ReportIcon />
                                        </div>
                                        <p className="font-bold">Henüz sorgu yapılmamış.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'profil' && (
                    <div className="space-y-6 animate-soft-slide-up">
                        <div className="bg-white p-8 rounded-[32px] shadow-sm text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-24 bg-brand-accent/5"></div>
                            
                            <div className="relative">
                                <div className="w-24 h-24 bg-brand-accent text-white rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl overflow-hidden">
                                    {photoUrl ? (
                                        <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <FlameIcon className="w-12 h-12 text-white" />
                                    )}
                                </div>
                                <h2 className="text-2xl font-black text-brand-text tracking-tight uppercase">
                                    {fullName || 'Kullanıcı'}
                                </h2>
                                <p className="text-brand-accent font-bold text-xs uppercase tracking-widest mt-1">
                                    {title || 'Saha Operasyon Uzmanı'}
                                </p>
                            </div>
                            
                            <div className="mt-8 grid grid-cols-2 gap-4">
                                <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border">
                                    <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-1">Sicil No</p>
                                    <p className="font-black text-brand-text">{username}</p>
                                </div>
                                <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border">
                                    <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-1">Durum</p>
                                    <p className="font-black text-green-500">AKTİF</p>
                                </div>
                            </div>

                            <div className="mt-6 space-y-3 text-left">
                                <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest mb-2 px-1">Yetkileriniz</p>
                                <div className="grid grid-cols-1 gap-2">
                                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${canViewDetails ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${canViewDetails ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-xs font-bold">Tam Yetki (İsim Gör)</span>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${canViewPhone ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${canViewPhone ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-xs font-bold">Telefon Numarası Görüntüle</span>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${unlimitedAccess ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${unlimitedAccess ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-xs font-bold">7/24 Sınırsız Erişim</span>
                                    </div>
                                    <div className={`flex items-center gap-3 p-3 rounded-2xl border ${skipDeviceLock ? 'bg-green-50 border-green-100 text-green-700' : 'bg-gray-50 border-gray-100 text-gray-400'}`}>
                                        <div className={`w-2 h-2 rounded-full ${skipDeviceLock ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                                        <span className="text-xs font-bold">Cihaz Kilidi Muafiyeti</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-brand-border grid grid-cols-1 gap-3">
                                <button 
                                    onClick={() => setShowProfileEditModal(true)}
                                    className="w-full bg-brand-accent text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-accent/20 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <EditIcon className="w-4 h-4" />
                                    Profili Düzenle
                                </button>
                                <button 
                                    onClick={onLogout}
                                    className="w-full bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest text-xs active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                    </svg>
                                    Güvenli Çıkış Yap
                                </button>
                            </div>
                        </div>
                        
                        <div className="bg-brand-accent/10 p-6 rounded-[24px] border border-brand-accent/20">
                            <div className="flex items-center gap-4">
                                <div className="bg-brand-accent p-3 rounded-2xl text-white">
                                    <SmartphoneIcon />
                                </div>
                                <div>
                                    <p className="font-bold text-brand-text">Uygulama Sürümü</p>
                                    <p className="text-xs text-brand-text-muted">v1.2.0 (Stabil)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Profile Edit Modal */}
                {showProfileEditModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-scale-up">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4 overflow-hidden">
                                    {editPhotoUrl ? (
                                        <img src={editPhotoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                    ) : (
                                        <UserIcon className="w-8 h-8 text-brand-accent" />
                                    )}
                                </div>
                                <h3 className="text-xl font-black text-brand-text">Profili Düzenle</h3>
                                <p className="text-sm text-brand-text-muted mt-1">Bilgilerinizi güncelleyin.</p>
                            </div>

                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="flex flex-col items-center mb-4">
                                    <input 
                                        type="file" 
                                        id="profile-photo-input" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleFileChange}
                                    />
                                    <label 
                                        htmlFor="profile-photo-input"
                                        className="cursor-pointer bg-brand-accent/10 text-brand-accent px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-brand-accent/20 transition-all"
                                    >
                                        Fotoğraf Seç
                                    </label>
                                    {editPhotoUrl && (
                                        <button 
                                            type="button"
                                            onClick={() => setEditPhotoUrl('')}
                                            className="mt-2 text-[10px] text-red-500 font-bold uppercase"
                                        >
                                            Fotoğrafı Kaldır
                                        </button>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2 ml-1">Ünvan</label>
                                    <input 
                                        type="text"
                                        value={editTitle}
                                        onChange={(e) => setEditTitle(e.target.value)}
                                        placeholder="Örn: Saha Operasyon Uzmanı"
                                        className="w-full bg-brand-bg border-none rounded-2xl px-5 py-4 text-brand-text font-bold focus:ring-2 focus:ring-brand-accent transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2 ml-1">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                                    <input 
                                        type="password"
                                        value={editPassword}
                                        onChange={(e) => setEditPassword(e.target.value)}
                                        placeholder="••••••••"
                                        className="w-full bg-brand-bg border-none rounded-2xl px-5 py-4 text-brand-text font-bold focus:ring-2 focus:ring-brand-accent transition-all"
                                    />
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        type="button"
                                        onClick={() => setShowProfileEditModal(false)}
                                        className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-2xl font-bold active:scale-95 transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={isUpdatingProfile || profileUpdateSuccess}
                                        className={`flex-1 ${profileUpdateSuccess ? 'bg-green-500' : 'bg-brand-accent'} text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50`}
                                    >
                                        {isUpdatingProfile ? '...' : profileUpdateSuccess ? 'Başarılı!' : 'Güncelle'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Call Log Modal */}
                {showCallLogModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fade-in">
                        <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl animate-scale-up">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-brand-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PhoneIconSolid />
                                </div>
                                <h3 className="text-xl font-black text-brand-text">Görüşme Kaydı</h3>
                                <p className="text-sm text-brand-text-muted mt-1">Lütfen görüşme detaylarını giriniz.</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2 ml-1">Görüşme Süresi (Dakika)</label>
                                    <input 
                                        type="number"
                                        value={callDuration}
                                        onChange={(e) => setCallDuration(e.target.value)}
                                        placeholder="Örn: 5"
                                        className="w-full bg-brand-bg border-none rounded-2xl px-5 py-4 text-brand-text font-bold focus:ring-2 focus:ring-brand-accent transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-brand-text-muted uppercase tracking-wider mb-2 ml-1">Görüşme Durumu</label>
                                    <select 
                                        value={callStatus}
                                        onChange={(e) => setCallStatus(e.target.value)}
                                        className="w-full bg-brand-bg border-none rounded-2xl px-5 py-4 text-brand-text font-bold focus:ring-2 focus:ring-brand-accent transition-all appearance-none"
                                    >
                                        <option value="Ulaşıldı">Ulaşıldı</option>
                                        <option value="Ulaşılamadı">Ulaşılamadı</option>
                                        <option value="Meşgul">Meşgul</option>
                                        <option value="Yanlış Numara">Yanlış Numara</option>
                                        <option value="Randevu Alındı">Randevu Alındı</option>
                                    </select>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button 
                                        onClick={() => setShowCallLogModal(false)}
                                        className="flex-1 py-4 rounded-2xl font-bold text-brand-text-muted hover:bg-brand-bg transition-all"
                                    >
                                        İptal
                                    </button>
                                    <button 
                                        onClick={handleCallLogSubmit}
                                        className="flex-[2] bg-brand-accent text-white py-4 rounded-2xl font-bold shadow-lg shadow-brand-accent/20 active:scale-95 transition-all"
                                    >
                                        Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-brand-border px-6 py-3 flex justify-between items-center z-50">
                <button 
                    onClick={() => setActiveTab('sorgu')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'sorgu' ? 'text-brand-accent' : 'text-brand-text-muted'}`}
                >
                    <div className={`p-2 rounded-xl ${activeTab === 'sorgu' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : ''}`}>
                        <SearchIcon />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">SORGU</span>
                </button>
                <button 
                    onClick={() => setActiveTab('harita')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'harita' ? 'text-brand-accent' : 'text-brand-text-muted'}`}
                >
                    <div className={`p-2 rounded-xl ${activeTab === 'harita' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : ''}`}>
                        <GlobeIcon />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">HARİTA</span>
                </button>
                <button 
                    onClick={() => setActiveTab('islemler')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'islemler' ? 'text-brand-accent' : 'text-brand-text-muted'}`}
                >
                    <div className={`p-2 rounded-xl ${activeTab === 'islemler' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : ''}`}>
                        <ReportIcon />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">İŞLEMLER</span>
                </button>
                <button 
                    onClick={() => setActiveTab('profil')}
                    className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'profil' ? 'text-brand-accent' : 'text-brand-text-muted'}`}
                >
                    <div className={`p-2 rounded-xl ${activeTab === 'profil' ? 'bg-brand-accent text-white shadow-lg shadow-brand-accent/20' : ''}`}>
                        <UserIcon />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest">PROFİL</span>
                </button>
            </nav>

            {/* Success Toast */}
            {updateSuccess && (
                <div className="fixed bottom-24 left-6 right-6 z-50 animate-soft-slide-up">
                    <div className="bg-green-500 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-green-400">
                        <div className="bg-white/20 p-2 rounded-full">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <p className="font-bold text-sm">Güncelleme talebi başarıyla gönderildi!</p>
                    </div>
                </div>
            )}

            {/* Error Toast */}
            {error && (
                <div className="fixed bottom-24 left-6 right-6 z-50 animate-soft-slide-up">
                    <div className="bg-red-500 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-red-400">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-full">
                                <ReportIcon />
                            </div>
                            <p className="font-bold text-sm">{error}</p>
                        </div>
                        <button onClick={() => setError('')} className="text-white/60 hover:text-white">
                            <CloseIcon />
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                .animate-soft-slide-up {
                    animation: softSlideUp 0.6s cubic-bezier(0.2, 0.8, 0.2, 1);
                }
                @keyframes softSlideUp {
                    0% { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
                .animate-shake {
                    animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                }
                @keyframes shake {
                    10%, 90% { transform: translate3d(-1px, 0, 0); }
                    20%, 80% { transform: translate3d(2px, 0, 0); }
                    30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
                    40%, 60% { transform: translate3d(4px, 0, 0); }
                }
            `}</style>
        </div>
    );
};

export default MainScreen;
