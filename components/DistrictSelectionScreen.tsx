import React, { useState, useEffect } from 'react';
import * as sheetService from '../services/sheetService';
import { MapPinIcon } from './icons';

interface DistrictSelectionScreenProps {
  onDistrictSelect: (district: string) => void;
  onLogout: () => void;
}

const DistrictSelectionScreen: React.FC<DistrictSelectionScreenProps> = ({ onDistrictSelect, onLogout }) => {
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDistricts = async () => {
      try {
        const districtList = await sheetService.getDistricts();
        if (districtList.length === 0) {
            setError("Google E-Tablonuzun 'Aboneler' sayfasının 'G' sütununda ilçe bilgisi bulunamadı. Lütfen verilerinizi kontrol edin.");
        } else {
            setDistricts(districtList);
        }
      } catch (err: any) {
        let errorMessage = err.message || 'İlçeler yüklenemedi.';
        if (errorMessage.includes("sayfa bulunamadı")) {
            errorMessage = "Yapılandırma Hatası: Google E-Tablonuzda 'Aboneler' adında bir sayfa bulunamadı. Lütfen kontrol ediniz.";
        }
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchDistricts();
  }, []);

  return (
    <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 relative">
      <div className="absolute top-4 right-4">
        <button 
            onClick={onLogout}
            className="text-sm text-white bg-red-600 hover:bg-red-700 font-semibold py-2 px-4 rounded-md transition-colors"
        >
            Çıkış Yap
        </button>
      </div>
      <div className="text-center">
        <div className="flex justify-center items-center mb-4">
          <img 
            src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" 
            alt="Aksa Doğalgaz Logo" 
            className="h-12"
          />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">İlçe Seçimi</h2>
        <p className="text-gray-600 dark:text-gray-400">Lütfen sorgulama yapmak istediğiniz ilçeyi seçin.</p>
      </div>

      {loading && (
        <div className="text-center p-4">
          <svg className="animate-spin h-8 w-8 text-blue-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-sm text-gray-500">İlçeler yükleniyor...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md" role="alert">
          <strong className="font-bold">Hata: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-4">
          {districts.map(district => (
            <button
              key={district}
              onClick={() => onDistrictSelect(district)}
              className="flex items-center justify-center text-center p-4 border rounded-lg font-semibold text-gray-700 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-blue-900/50 dark:hover:border-blue-700 transition-all duration-200"
            >
              <MapPinIcon />
              <span className="ml-2">{district}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DistrictSelectionScreen;
