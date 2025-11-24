import React, { useState, useCallback } from 'react';
import type { Customer } from '../types';
import * as sheetService from '../services/sheetService';
import { MapPinIcon, PhoneIcon, UserIcon, PhoneIconSolid, MessageIcon } from './icons';

interface MainScreenProps {
    onLogout: () => void;
    username: string;
}


const MainScreen: React.FC<MainScreenProps> = ({ onLogout, username }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [foundCustomer, setFoundCustomer] = useState<Customer | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [mapEmbedUrl, setMapEmbedUrl] = useState<string | null>(null);
    const [searchPerformed, setSearchPerformed] = useState(false);

    const handleClear = useCallback(() => {
        setSearchTerm('');
        setFoundCustomer(null);
        setLoading(false);
        setError('');
        setMapEmbedUrl(null);
        setSearchPerformed(false);
    }, []);

    const handleSearch = useCallback(async () => {
        if (!searchTerm.trim()) return;

        setSearchPerformed(true);
        setError('');
        setLoading(true);
        setFoundCustomer(null);
        setMapEmbedUrl(null);

        try {
            // İstatistiklerin çalışabilmesi için sorgu loglama aktif.
            sheetService.logSearchQuery(username, searchTerm.trim()).catch(console.error);
            
            // İlçe parametresi kaldırıldı
            const customer = await sheetService.findCustomerByInstallationNumber(searchTerm.trim());
            setFoundCustomer(customer);

            let gmapsEmbedUrl = '';
            // Gelen latitude/longitude değerleri virgül içerebileceği için nokta ile değiştiriyoruz.
            const lat = customer.latitude ? parseFloat(String(customer.latitude).replace(',', '.')) : NaN;
            const lon = customer.longitude ? parseFloat(String(customer.longitude).replace(',', '.')) : NaN;

            if (!isNaN(lat) && !isNaN(lon)) {
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${lat},${lon}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
            } else if (customer.address && customer.address.trim() !== '') {
                const encodedAddress = encodeURIComponent(customer.address);
                gmapsEmbedUrl = `https://maps.google.com/maps?q=${encodedAddress}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
            }

            if (gmapsEmbedUrl) {
                setMapEmbedUrl(gmapsEmbedUrl);
            } else {
                setError("Abone için geçerli bir konum bilgisi (koordinat veya adres) bulunamadı.");
                setMapEmbedUrl(null);
            }

        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
        } finally {
            setLoading(false);
        }
    }, [searchTerm, username]);
    
    return (
        <div className="w-full max-w-4xl mx-auto">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
                 <div className="absolute top-4 right-4 flex gap-2">
                    <button 
                        onClick={onLogout}
                        className="text-sm text-white bg-red-600 hover:bg-red-700 font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                        Çıkış Yap
                    </button>
                </div>
                <div className="flex items-center mb-6">
                    <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Aksa Doğalgaz Logo" className="h-10" />
                    <div className="ml-4">
                        <h1 className="text-2xl sm:text-3xl font-bold">Tesisat Sorgulama</h1>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 mb-6">
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Tesisat Numarası Girin"
                        disabled={loading}
                        className="flex-grow appearance-none rounded-md relative block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-200 dark:disabled:bg-gray-600"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading || !searchTerm.trim()}
                        className="w-full sm:w-auto px-6 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                    >
                        {loading ? (
                             <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Sorgula'}
                    </button>
                     {searchPerformed && !loading && (
                        <button 
                            onClick={handleClear}
                            className="w-full sm:w-auto px-6 py-3 font-semibold text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 transition-colors flex items-center justify-center"
                        >
                            Temizle
                        </button>
                    )}
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}
                
                {loading && <p className="text-center py-4">Abone aranıyor...</p>}

                {!loading && foundCustomer && (
                    <>
                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-4">
                            <h2 className="text-xl font-bold border-b pb-2 dark:border-gray-600">Abone Bilgileri</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center"><UserIcon /> <strong className="ml-2 w-20 shrink-0">İsim:</strong> <span>{foundCustomer.name}</span></div>
                                <div className="flex items-center">
                                    <PhoneIcon />
                                    <strong className="ml-2 w-20 shrink-0">Telefon:</strong>
                                     <div className="flex items-center gap-4 flex-wrap">
                                        <span>{foundCustomer.phone}</span>
                                        <div className="flex items-center gap-2">
                                            <a 
                                                href={`tel:${String(foundCustomer.phone).replace(/\s/g, "")}`}
                                                className="p-2 text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-gray-600 rounded-full transition-colors"
                                                aria-label="Telefonla ara"
                                                title="Telefonla ara"
                                            >
                                                <PhoneIconSolid />
                                            </a>
                                            <a 
                                                href={`sms:${String(foundCustomer.phone).replace(/\s/g, "")}?body=${encodeURIComponent(`sn ${foundCustomer.name} sayaç okuma işleminizi gerçekleştiremedik.lütfen ulaşın`)}`}
                                                className="p-2 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-gray-600 rounded-full transition-colors"
                                                aria-label="SMS gönder"
                                                title="SMS gönder"
                                            >
                                                <MessageIcon />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-start col-span-1 sm:col-span-2"><MapPinIcon /> <strong className="ml-2 w-20 shrink-0">Adres:</strong> <span>{foundCustomer.address}</span></div>
                            </div>
                        </div>
                        
                         {mapEmbedUrl && (
                             <div className="mt-6 bg-gray-50 dark:bg-gray-700 p-6 rounded-lg">
                                <h3 className="text-xl font-bold mb-4 border-b pb-2 dark:border-gray-600">Adres Haritası</h3>
                                <div className="overflow-hidden rounded-md shadow-md aspect-w-16 aspect-h-9">
                                     <iframe
                                        src={mapEmbedUrl}
                                        width="100%"
                                        height="450"
                                        style={{ border: 0 }}
                                        allowFullScreen={false}
                                        loading="lazy"
                                        referrerPolicy="no-referrer-when-downgrade"
                                    ></iframe>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default MainScreen;