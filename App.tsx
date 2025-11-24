import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import LegalScreen from './components/LegalScreen';
import OfflineScreen from './components/OfflineScreen';
import AdminScreen from './components/AdminScreen';
import DistrictSelectionScreen from './components/DistrictSelectionScreen';
import { isWithinWorkingHours } from './utils/time';
import * as sheetService from './services/sheetService';
import { SCRIPT_URL } from './config';


const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const [isWorkingTime, setIsWorkingTime] = useState(isWithinWorkingHours());
  const [appError, setAppError] = useState<string | null>(null);
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);


  useEffect(() => {
     // 1. URL Varlık Kontrolü
     if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        setAppError("Uygulama yapılandırılmamış. Lütfen config.ts dosyasını kontrol edin.");
        return;
    }

    // 2. URL Format Kontrolü (/exec ile bitmeli)
    if (!SCRIPT_URL.endsWith('/exec')) {
        setAppError("Hatalı Yapılandırma: config.ts dosyasındaki URL bir Web Uygulaması URL'si değil. URL'nin sonunda '/edit' yerine '/exec' olduğundan emin olun.");
        return;
    }

    const interval = setInterval(() => {
        setIsWorkingTime(isWithinWorkingHours());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string, deviceId: string) => {
    // Admin login is a local check, no need for network request or device locking
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setLegalAccepted(true); // Admin doesn't need legal screen
        return;
    }
   
    // For regular users, call the new, optimized authentication service with Device ID
    await sheetService.authenticateUser(username, password, deviceId);
    
    // If the above line does not throw an error, authentication is successful
    setIsAuthenticated(true);
    setIsAdmin(false);
    setCurrentUser(username);
    setLegalAccepted(false); // Always show legal screen for normal users
  }, []);
  
  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setLegalAccepted(false);
    setSelectedDistrict(null);
  }, []);

  const handleAcceptLegal = useCallback(() => {
    setLegalAccepted(true);
  }, []);

  const handleDeclineLegal = useCallback(() => {
    handleLogout(); // Log out if legal is declined
  }, [handleLogout]);

  const handleDistrictSelect = useCallback((district: string) => {
    setSelectedDistrict(district);
  }, []);
  
  const handleChangeDistrict = useCallback(() => {
    setSelectedDistrict(null);
  }, []);


  const renderContent = () => {
      if (appError) {
          return (
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900">
                      <svg className="h-6 w-6 text-red-600 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Yapılandırma Hatası</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-100 dark:border-red-800">
                    {appError}
                  </p>
                  <p className="text-xs text-gray-500">Lütfen geliştiricinizle iletişime geçin.</p>
              </div>
          );
      }
      if (!isAuthenticated) {
        return <LoginScreen onLogin={handleLogin} />;
      }
      if (isAdmin) {
          return <AdminScreen onLogout={handleLogout} />;
      }
      if (!legalAccepted) {
          return <LegalScreen onAccept={handleAcceptLegal} onDecline={handleDeclineLegal} />;
      }
      if (!isWorkingTime) {
          return <OfflineScreen />;
      }
      
      if (!selectedDistrict) {
          return <DistrictSelectionScreen onDistrictSelect={handleDistrictSelect} onLogout={handleLogout} />;
      }

      return <MainScreen 
                onLogout={handleLogout} 
                username={currentUser!}
                district={selectedDistrict}
                onChangeDistrict={handleChangeDistrict}
             />;
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
};

export default App;