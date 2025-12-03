import React, { useState, useCallback, useEffect } from 'react';
import type { Customer } from '../types';
import * as sheetService from '../services/sheetService';
import { MapPinIcon, PhoneIcon, UserIcon, PhoneIconSolid, MessageIcon, SearchIcon } from './icons';
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
        setCurrentLogId(null);

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
            
            // Log the search and store the ID
            const logId = await sheetService.logSearchQuery(username, term.trim());
            setCurrentLogId(logId);

        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
            // Hata olsa bile loglamak isteyebiliriz, ancak ID alamayabiliriz
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

    const handleCallClick = () => {
        if (currentLogId) {
            sheetService.updateLogInteraction(currentLogId, 'call');
        }
    };

    const handleSmsClick = () => {
        if (currentLogId) {
            sheetService.updateLogInteraction(currentLogId, 'sms');
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-8 relative min-h-[500px] flex flex-col">
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
                    <div className="flex items-center">
                        <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Aksa Doğalgaz Logo" className="h-10 sm:h-12 w-auto" />
                        <div className="ml-3 sm:ml-4">
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">Tesisat Sorgulama</h1>
                            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 flex flex-col sm:flex-row sm:gap-1">
                                <span>Hoşgeldin, <strong className="text-gray-700 dark:text-gray-200">{fullName || username}</strong></span>
                                <span className="hidden sm:inline">•</span>
                                <span>({canViewDetails ? 'Tam Yetki' : 'Kısıtlı Görünüm'})</span>
                            </p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="self-end sm:self-auto text-xs sm:text-sm text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/40 font-medium py-2 px-4 rounded-lg transition-colors border border-red-200 dark:border-red-800"
                    >
                        Güvenli Çıkış
                    </button>
                </div>
                
                <div className="relative mb-6 z-20">
                    <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-grow">
                             <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setShowRecents(true);
                                }}
                                onFocus={() => setShowRecents(true)}
                                onBlur={() => setTimeout(() => setShowRecents(false), 200)}
                                placeholder="Tesisat No (Örn: 100123456)"
                                disabled={loading}
                                className="w-full appearance-none rounded-lg border-2 border-gray-200 dark:border-gray-600 px-4 py-3 pl-11 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-gray-600 transition-all font-mono text-base sm:text-lg"
                            />
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon />
                            </div>
                        </div>
                        
                        <div className="flex gap-2 sm:contents">
                            <button
                                onClick={handleSearchClick}
                                disabled={loading || !searchTerm.trim()}
                                className="flex-1 sm:flex-none sm:w-auto px-6 sm:px-8 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center min-w-[100px]"
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
                                    className="flex-1 sm:flex-none sm:w-auto px-4 py-3 font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors"
                                >
                                    Temizle
                                </button>
                            )}
                        </div>
                    </div>

                    {showRecents && recentSearches.length > 0 && !searchTerm && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-100 dark:border-gray-600 overflow-hidden animate-fade-in z-30">
                            <div className="flex justify-between items-center px-4 py-2 bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-600">
                                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Son Aramalar ({username})</span>
                                <button onClick={clearRecents} className="text-xs text-red-500 hover:text-red-700 hover:underline">Temizle</button>
                            </div>
                            <ul>
                                {recentSearches.map((term, index) => (
                                    <li key={index}>
                                        <button 
                                            onMouseDown={() => handleRecentClick(term)}
                                            className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-gray-600 flex items-center justify-between group transition-colors"
                                        >
                                            <span className="font-mono text-gray-700 dark:text-gray-200">{term}</span>
                                            <span className="text-gray-300 group-hover:text-blue-400">
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
                    <div className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 rounded-r-lg mb-6 flex items-center animate-shake" role="alert">
                         <svg className="h-6 w-6 mr-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div>
                            <p className="font-bold">Sorgulama Başarısız</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}
                
                {loading && (
                    <div className="flex-grow flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 py-12">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                        <p className="animate-pulse">Veritabanı taranıyor...</p>
                    </div>
                )}

                {!loading && !foundCustomer && !error && !searchPerformed && (
                     <div className="flex-grow flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 py-12 opacity-50">
                        <SearchIcon />
                        <p className="mt-4 text-sm text-center">Sorgulama yapmak için tesisat numarası girin.</p>
                        <AdBanner className="mt-12" />
                    </div>
                )}

                {!loading && foundCustomer && (
                    <div className="space-y-6">
                        {/* Abone Kartı */}
                        <div 
                            className="bg-blue-50 dark:bg-gray-700/50 border border-blue-100 dark:border-gray-600 p-6 rounded-xl shadow-sm relative overflow-hidden animate-soft-slide-up"
                            style={{ animationFillMode: 'both' }}
                        >
                             <div className="absolute top-0 right-0 p-4 opacity-10">
                                <UserIcon />
                             </div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b border-blue-200 dark:border-gray-600 pb-3 mb-4 flex items-center">
                                <span className="bg-blue-600 w-2 h-6 mr-3 rounded-full"></span>
                                Abone Bilgileri
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Ad Soyad</label>
                                    <p className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                        {/* İsim Maskeleme Kontrolü */}
                                        {canViewDetails ? foundCustomer.name : maskName(foundCustomer.name)}
                                    </p>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Telefon</label>
                                    <div className="flex items-center flex-wrap gap-3">
                                        <span className="text-lg font-medium text-gray-900 dark:text-white">{foundCustomer.phone}</span>
                                        <div className="flex gap-2">
                                            <a 
                                                href={`tel:${String(foundCustomer.phone).replace(/\s/g, "")}`}
                                                onClick={handleCallClick}
                                                className="flex items-center justify-center w-8 h-8 bg-green-100 text-green-600 rounded-full hover:bg-green-200 transition-colors cursor-pointer"
                                                title="Hemen Ara"
                                            >
                                                <PhoneIconSolid />
                                            </a>
                                            <a 
                                                href={`sms:${String(foundCustomer.phone).replace(/\s/g, "")}?body=${encodeURIComponent(`Sayın ${foundCustomer.name}, Aksa Doğalgaz tesisat kontrolü için adresinize geldik ancak size ulaşamadık.`)}`}
                                                onClick={handleSmsClick}
                                                className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                                                title="SMS Gönder"
                                            >
                                                <MessageIcon />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Adres</label>
                                    <p className="text-base text-gray-900 dark:text-gray-200 flex items-start">
                                        <MapPinIcon />
                                        <span className="ml-2">{foundCustomer.address}</span>
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
                                <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 p-1 rounded-xl shadow-md">
                                    <div className="flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-t-lg border-b border-gray-200 dark:border-gray-600">
                                        <h3 className="font-bold text-gray-700 dark:text-gray-200 flex items-center">
                                            <MapPinIcon /> Lokasyon
                                        </h3>
                                        {externalMapUrl && (
                                            <a 
                                                href={externalMapUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700 transition-colors flex items-center shadow-sm"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                </svg>
                                                Navigasyon
                                            </a>
                                        )}
                                    </div>
                                    <div className="relative w-full h-64 sm:h-[400px] bg-gray-100 rounded-b-lg overflow-hidden">
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
                                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg flex items-center text-yellow-800 dark:text-yellow-200">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                    <span className="text-sm">Bu kayıt için harita bilgisi oluşturulamadı.</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                
                {/* Alt Reklam */}
                <AdBanner />
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