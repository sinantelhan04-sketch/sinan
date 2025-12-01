import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import LegalScreen from './components/LegalScreen';
import OfflineScreen from './components/OfflineScreen';
import { AdminScreen } from './components/AdminScreen';
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
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');


  useEffect(() => {
     // 1. URL Kontrolü
     if (!SCRIPT_URL || !SCRIPT_URL.includes("/exec")) {
        setAppError("Yapılandırma Hatası: Geçerli bir Google Apps Script URL'si bulunamadı. Lütfen config.ts dosyasını kontrol edin.");
        return;
    }

    // 2. Sunucu Bağlantı Kontrolü (Warm-up)
    const checkConnection = async () => {
        setServerStatus('checking');
        const isOnline = await sheetService.checkServerConnection();
        setServerStatus(isOnline ? 'online' : 'offline');
    };
    checkConnection();

    const interval = setInterval(() => {
        setIsWorkingTime(isWithinWorkingHours());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string, deviceId: string) => {
    // Admin login is a local check
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setLegalAccepted(true); // Admin doesn't need legal screen
        return;
    }
   
    // Apps Script Authentication
    await sheetService.authenticateUser(username, password, deviceId);
    
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
  }, []);

  const handleAcceptLegal = useCallback(() => {
    setLegalAccepted(true);
  }, []);

  const handleDeclineLegal = useCallback(() => {
    handleLogout(); // Log out if legal is declined
  }, [handleLogout]);


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
                  <p className="text-xs text-gray-500">Lütfen config.ts dosyasını düzenleyin.</p>
              </div>
          );
      }
      if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center gap-4 w-full">
                <LoginScreen onLogin={handleLogin} />
                {/* Sunucu Durum Göstergesi */}
                <div className="text-xs text-gray-400 flex items-center gap-2">
                    Sunucu Bağlantısı: 
                    {serverStatus === 'checking' && <span className="text-yellow-500 animate-pulse">Kontrol Ediliyor...</span>}
                    {serverStatus === 'online' && <span className="text-green-500 font-bold">Hazır</span>}
                    {serverStatus === 'offline' && <span className="text-red-500 font-bold">Başarısız</span>}
                    {serverStatus === 'offline' && (
                        <button 
                            onClick={async () => {
                                setServerStatus('checking');
                                const isOnline = await sheetService.checkServerConnection();
                                setServerStatus(isOnline ? 'online' : 'offline');
                            }}
                            className="text-xs underline text-blue-500 hover:text-blue-700 ml-1"
                        >
                            Tekrar Dene
                        </button>
                    )}
                </div>
            </div>
        );
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
      
      return <MainScreen 
                onLogout={handleLogout} 
                username={currentUser!}
             />;
  }


  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4">
      {renderContent()}
    </div>
  );
};

export default App;