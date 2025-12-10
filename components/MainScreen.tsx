

import React, { useState, useCallback, useEffect } from 'react';
import type { Customer } from '../types';
import * as sheetService from '../services/sheetService';
import { MapPinIcon, PhoneIcon, UserIcon, PhoneIconSolid, MessageIcon, SearchIcon, ReportIcon } from './icons';
import AdBanner from './AdBanner';

interface MainScreenProps {
    onLogout: () => void;
    username: string;
    fullName?: string | null;
    canViewDetails: boolean;
}

const MAX_RECENT_SEARCHES = 5;

// İsim Maskeleme Fonksiyonu
const maskName = (fullName: string): string => {
    if (!fullName) return '';
    const parts = fullName.trim().split(/\s+/);
    
    return parts.map(part => {
        if (part.length < 3) return part; // Çok kısa isimleri maskeleme
        // İlk 2 harfi al, geri kalan uzunluk kadar yıldız koy (max 3 yıldız estetik için)
        return part.substring(0, 2) + '***'; 
    }).join(' ');
};

const MainScreen: React.FC<MainScreenProps> = ({ onLogout, username, fullName, canViewDetails }) => {
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
    
    // Reklam yenileme tetikleyicisi
    const [adRefreshTrigger, setAdRefreshTrigger] = useState(0);

    // Her kullanıcı için ayrı bir geçmiş anahtarı oluştur
    const recentSearchesKey = `recent_searches_${username}`;

    useEffect(() => {
        try {
            const saved = localStorage.getItem(recentSearchesKey);
            if (saved) {
                setRecentSearches(JSON.parse(saved));
            } else {
                setRecentSearches([]);
            }
        } catch (e) {
            console.error("Geçmiş yüklenirken hata:", e);
            setRecentSearches([]);
        }
    }, [recentSearchesKey]);

    const saveToRecents = (term: string) => {
        let updated = [term, ...recentSearches.filter(s => s !== term)];
        if (updated.length > MAX_RECENT_SEARCHES) {
            updated = updated.slice(0, MAX_RECENT_SEARCHES);
        }
        setRecentSearches(updated);
        localStorage.setItem(recentSearchesKey, JSON.stringify(updated));
    };

    const clearRecents = () => {
        setRecentSearches([]);
        localStorage.removeItem(recentSearchesKey);
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

        // Her aramada reklamı yenilemek için sayacı artır
        setAdRefreshTrigger(prev => prev + 1);

        setSearchPerformed(true);
        setError('');
        setLoading(true);
        setFoundCustomer(null);
        setMapEmbedUrl(null);
        setExternalMapUrl(null);
        setShowRecents(false);
        setCurrentLogId(null);
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
            } else if (customer.address && customer.address.trim() !== '') {
                const encodedAddress = encodeURIComponent(customer.address);
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
                extMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            }

            if (gmapsEmbedUrl) setMapEmbedUrl(gmapsEmbedUrl);
            if (extMapUrl) setExternalMapUrl(extMapUrl);
            
            // Log the search and save the ID
            const logId = await sheetService.logSearchQuery(username, term.trim());
            if (logId) setCurrentLogId(logId);

        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
            // Hata olsa bile loglamak isteyebiliriz
            sheetService.logSearchQuery(username, term.trim()).catch(e => console.warn("Log hatası:", e));
        } finally {
            setLoading(false);
        }
    };

    const handleSearchClick = () => {
        performSearch(searchTerm);
    };

    const handleRecentClick = (term: string) => {
        setSearchTerm(term);
        performSearch(term);
    };
    
    // Aksiyon Loglama (Arama veya SMS)
    const logAction = (type: 'call' | 'sms' | 'report_error') => {
        if (currentLogId) {
            sheetService.updateSearchLogAction(currentLogId, type);
        }
    };

    // Android/iOS Uyumlu Arama Başlatıcı (+90 Eklemeli)
    const handleCallClick = (e: React.MouseEvent, phone: string) => {
        e.preventDefault();
        
        // Önce logla
        logAction('call');

        // Numarayı temizle (sadece rakamlar)
        let cleanPhone = String(phone).replace(/[^0-9]/g, "");
        
        // Formatlama: +90 ekle
        if (cleanPhone.startsWith('90')) {
            cleanPhone = '+' + cleanPhone;
        } else {
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            cleanPhone = '+90' + cleanPhone;
        }
        
        // Tarayıcıyı zorla yönlendir
        window.location.href = `tel:${cleanPhone}`;
    };

    // Android/iOS Uyumlu SMS Başlatıcı (+90 Eklemeli)
    const handleSmsClick = (e: React.MouseEvent, phone: string, name: string) => {
        e.preventDefault();

        // Önce logla
        logAction('sms');

        // Numarayı temizle (sadece rakamlar)
        let cleanPhone = String(phone).replace(/[^0-9]/g, "");
        
        // Formatlama: +90 ekle
        if (cleanPhone.startsWith('90')) {
            cleanPhone = '+' + cleanPhone;
        } else {
            if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
            cleanPhone = '+90' + cleanPhone;
        }

        const messageBody = `Sayın ${name}, Aksa Doğalgaz tesisat kontrolü için adresinize geldik ancak size ulaşamadık.`;
        
        // Standart SMS URI şeması
        const smsUri = `sms:${cleanPhone}?body=${encodeURIComponent(messageBody)}`;
        
        window.location.href = smsUri;
    };

    const handleReportClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (confirm("Bu tesisata ait telefon numarasının hatalı olduğunu bildirmek istiyor musunuz?")) {
            logAction('report_error');
            setReportSent(true);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white/95 backdrop-blur-sm dark:bg-gray-800/90 rounded-3xl shadow-2xl p-4 sm:p-8 relative min-h-[500px] flex flex-col border border-white/20 dark:border-gray-700">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4 border-b border-gray-100 dark:border-gray-700 pb-6">
                    <div className="flex items-center">
                        <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Aksa Doğalgaz Logo" className="h-10 sm:h-12 w-auto mix-blend-multiply dark:mix-blend-normal rounded-md" />
                        <div className="ml-3 sm:ml-4">
                            <h1 className="text-xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">Tesisat Sorgulama</h1>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row sm:gap-1 mt-1 font-medium">
                                <span>Hoşgeldin, <strong className="text-blue-600 dark:text-blue-300">{fullName || username}</strong></span>
                                <span className="hidden sm:inline text-gray-300">•</span>
                                <span className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 px-2 rounded-full text-[10px] w-fit font-bold uppercase tracking-wide py-0.5">{canViewDetails ? 'Tam Yetki' : 'Kısıtlı'}</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="self-end sm:self-auto text-xs sm:text-sm text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 font-bold py-2 px-4 rounded-xl transition-colors border border-red-100 dark:border-red-800 shadow-sm hover:shadow"
                    >
                        Çıkış Yap
                    </button>
                </div>
                
                <div className="relative mb-8 z-20">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-grow group">
                             <input
                                type="tel" 
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowRecents(true);
                                }}
                                onFocus={() => setShowRecents(true)}
                                onBlur={() => setTimeout(() => setShowRecents(false), 200)}
                                placeholder="Tesisat No (Örn: 100123456)"
                                disabled={loading}
                                className="w-full appearance-none rounded-2xl border-2 border-gray-100 dark:border-gray-600 px-4 py-4 pl-12 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 transition-all font-mono text-lg font-bold shadow-inner"
                            />
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 transition-colors">
                                <SearchIcon />
                            </div>
                        </div>
                        
                        <div className="flex gap-2 sm:contents">
                            <button
                                onClick={handleSearchClick}
                                disabled={loading || !searchTerm.trim()}
                                className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 py-3 font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl hover:from-blue-700 hover:to-indigo-700 disabled:from-blue-300 disabled:to-blue-400 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 flex items-center justify-center min-w-[120px]"
                            >
                                {loading ? (
                                    <div className="flex items-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Aranıyor
                                    </div>
                                ) : 'Sorgula'}
                            </button>
                            {searchPerformed && !loading && (
                                <button 
                                    onClick={handleClear}
                                    className="flex-1 sm:flex-none sm:w-auto px-4 py-3 font-bold text-gray-600 bg-gray-100 rounded-2xl hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors border border-gray-200 dark:border-gray-600"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {showRecents && recentSearches.length > 0 && !searchTerm && (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-gray-700 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-600 overflow-hidden animate-fade-in z-30">
                            <div className="flex justify-between items-center px-5 py-3 bg-gray-50/80 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-600 backdrop-blur-sm">
                                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Son Aramalar</span>
                                <button onClick={clearRecents} className="text-xs font-bold text-red-500 hover:text-red-700 hover:underline">Tümünü Sil</button>
                            </div>
                            <ul className="py-1">
                                {recentSearches.map((term, index) => (
                                    <li key={index}>
                                        <button 
                                            onMouseDown={() => handleRecentClick(term)}
                                            className="w-full text-left px-5 py-3 hover:bg-blue-50 dark:hover:bg-gray-600 flex items-center justify-between group transition-colors"
                                        >
                                            <span className="font-mono font-bold text-gray-700 dark:text-gray-200">{term}</span>
                                            <span className="text-gray-300 group-hover:text-blue-500 transition-colors">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-r-xl mb-6 flex items-center animate-shake shadow-sm" role="alert">
                         <svg className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-bold">Sorgulama Başarısız</p>
                            <p className="text-sm font-medium">{error}</p>
                        </div>
                    </div>
                )}
                
                {loading && (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 py-12">
                        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="animate-pulse font-medium">Veritabanı taranıyor...</p>
                    </div>
                )}

                {!loading && !foundCustomer && !error && !searchPerformed && (
                     <div className="flex-grow flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12 opacity-50">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-full mb-4">
                            <SearchIcon />
                        </div>
                        <p className="text-sm font-medium text-center max-w-xs">Sorgulama yapmak için yukarıdaki alana tesisat numarası girin.</p>
                    </div>
                )}

                {!loading && foundCustomer && (
                    <div className="space-y-6">
                        {/* Abone Kartı */}
                        <div 
                            className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-700 dark:to-gray-800 border border-blue-100 dark:border-gray-600 p-6 rounded-2xl shadow-lg shadow-blue-900/5 relative overflow-hidden animate-soft-slide-up"
                            style={{ animationFillMode: 'both' }}
                        >
                             <div className="absolute top-0 right-0 p-4 opacity-5 text-blue-900 dark:text-white transform scale-150 origin-top-right pointer-events-none">
                                <UserIcon />
                             </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-blue-200 dark:border-gray-600 pb-3 mb-6 flex items-center">
                                <span className="bg-gradient-to-b from-blue-500 to-indigo-600 w-1.5 h-6 mr-3 rounded-full"></span>
                                Abone Bilgileri
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ad Soyad</label>
                                    <p className="text-2xl font-bold text-gray-900 dark:text-white flex items-center tracking-tight">
                                        {/* İsim Maskeleme Kontrolü */}
                                        {canViewDetails ? foundCustomer.name : maskName(foundCustomer.name)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İletişim</label>
                                    {/* Telefon Numarası Gizlendi, Sadece Butonlar Gösteriliyor */}
                                    <div className="flex flex-wrap gap-3 mt-1">
                                        <button 
                                            onClick={(e) => handleCallClick(e, foundCustomer.phone)}
                                            className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl transition-all shadow-md shadow-green-500/30 active:scale-95 group font-bold"
                                            title="Hemen Ara"
                                        >
                                            <div className="mr-2 group-hover:animate-bounce"><PhoneIconSolid /></div>
                                            <span className="text-sm">Ara</span>
                                        </button>
                                        <button 
                                            onClick={(e) => handleSmsClick(e, foundCustomer.phone, foundCustomer.name)}
                                            className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/30 active:scale-95 group font-bold"
                                            title="SMS Gönder"
                                        >
                                            <div className="mr-2 group-hover:animate-pulse"><MessageIcon /></div>
                                            <span className="text-sm">Mesaj At</span>
                                        </button>
                                         <button 
                                            onClick={handleReportClick}
                                            className="flex items-center justify-center px-5 py-2.5 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white rounded-xl transition-all shadow-md shadow-orange-500/30 active:scale-95 group font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Numara Hatalı Bildir"
                                            disabled={reportSent}
                                        >
                                            <div className="mr-2 group-hover:rotate-12 transition-transform"><ReportIcon /></div>
                                            <span className="text-sm">{reportSent ? 'Bildirildi' : 'Tel Hatalı'}</span>
                                        </button>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-2 bg-white/50 dark:bg-gray-900/30 p-4 rounded-xl border border-blue-50 dark:border-gray-700">
                                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Adres</label>
                                    <p className="text-base font-medium text-gray-800 dark:text-gray-200 flex items-start leading-relaxed">
                                        <span className="mt-1 mr-2 text-red-500"><MapPinIcon /></span>
                                        <span>{foundCustomer.address}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Harita Kartı */}
                        <div 
                            className="animate-soft-slide-up"
                            style={{ animationDelay: '200ms', animationFillMode: 'both' }}
                        >
                            {mapEmbedUrl ? (
                                <div className="bg-white dark:bg-700 border border-gray-200 dark:border-gray-600 p-1 rounded-2xl shadow-lg shadow-gray-200/50 dark:shadow-none">
                                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-xl border-b border-gray-200 dark:border-gray-600">
                                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center">
                                            <span className="text-red-500 mr-2"><MapPinIcon /></span> Lokasyon
                                        </h3>
                                        {externalMapUrl && (
                                            <a 
                                                href={externalMapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm font-bold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-md shadow-blue-500/20"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Navigasyon
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative w-full h-64 sm:h-[400px] bg-gray-100 rounded-b-xl overflow-hidden">
                                        <iframe
                                            src={mapEmbedUrl}
                                            width="100%"
                                            height="100%"
                                            style={{ border: 0 }}
                                            allowFullScreen={false}
                                            loading="lazy"
                                            referrerPolicy="no-referrer-when-downgrade"
                                            title="Google Maps"
                                        ></iframe>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-6 rounded-xl flex items-center text-yellow-800 dark:text-yellow-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="font-medium">Bu kayıt için harita bilgisi oluşturulamadı.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Alt Reklam - Key özelliği ile her aramada yenilenir */}
                <AdBanner key={`bot-${adRefreshTrigger}`} className="mt-auto pt-6" />
            </div>
             <style>{`
                .animate-fade-in { animation: fadeIn 0.2s ease-out; }
                .animate-shake { animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both; }
                .animate-soft-slide-up {
                    animation: softSlideUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1);
                }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes softSlideUp {
                    0% { 
                        opacity: 0; 
                        transform: translateY(30px) scale(0.98); 
                    }
                    100% { 
                        opacity: 1; 
                        transform: translateY(0) scale(1); 
                    }
                }
                @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
            `}</style>
        </div>
    );
};

export default MainScreen;