import React, { useState, useCallback, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import LegalScreen from './components/LegalScreen';
import OfflineScreen from './components/OfflineScreen';
import { AdminScreen } from './components/AdminScreen';
import { isWithinWorkingHours } from './utils/time';
import * as sheetService from './services/sheetService';
import { SUPABASE_URL, SUPABASE_KEY } from './config';

const SESSION_KEY = 'app_session_v1';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [canViewDetails, setCanViewDetails] = useState<boolean>(false);
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const [isWorkingTime, setIsWorkingTime] = useState(isWithinWorkingHours());
  const [appError, setAppError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);

  // Oturum Kurtarma ve Kontrol
  useEffect(() => {
     if (!SUPABASE_URL || SUPABASE_URL.includes("your-project-id") || !SUPABASE_KEY) {
        setAppError("Yapılandırma Hatası: config.ts dosyasında Supabase URL ve Key ayarlanmamış.");
        setIsSessionRestoring(false);
        return;
    }

    const checkConnection = async () => {
        setServerStatus('checking');
        const isOnline = await sheetService.checkServerConnection();
        setServerStatus(isOnline ? 'online' : 'offline');
    };
    checkConnection();

    // Oturumu LocalStorage'dan kurtar
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
        try {
            const session = JSON.parse(savedSession);
            // Oturum süresi kontrolü (Örn: 12 saat)
            const isValid = session.timestamp && (Date.now() - session.timestamp < 12 * 60 * 60 * 1000);
            
            if (isValid) {
                setIsAuthenticated(true);
                setCurrentUser(session.username);
                setCanViewDetails(session.canViewDetails);
                if (session.username === 'admin') {
                    setIsAdmin(true);
                    setLegalAccepted(true);
                }
            } else {
                localStorage.removeItem(SESSION_KEY);
            }
        } catch (e) {
            localStorage.removeItem(SESSION_KEY);
        }
    }
    setIsSessionRestoring(false);

    const interval = setInterval(() => {
        setIsWorkingTime(isWithinWorkingHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Sekmeler arası çıkış senkronizasyonu
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
        if (event.key === SESSION_KEY && event.newValue === null) {
            // Başka bir sekmede çıkış yapıldıysa burada da çık
            setIsAuthenticated(false);
            setIsAdmin(false);
            setCurrentUser(null);
            setCanViewDetails(false);
            setLegalAccepted(false);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string, deviceId: string) => {
    // Admin login is a local check
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setCanViewDetails(true); 
        setLegalAccepted(true);
        
        // Oturumu Kaydet
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: 'admin',
            canViewDetails: true,
            timestamp: Date.now()
        }));
        return;
    }
   
    const permissions = await sheetService.authenticateUser(username, password, deviceId);
    
    setIsAuthenticated(true);
    setIsAdmin(false);
    setCurrentUser(username);
    setCanViewDetails(permissions.canViewDetails); 
    setLegalAccepted(false);

    // Oturumu Kaydet
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        username,
        canViewDetails: permissions.canViewDetails,
        timestamp: Date.now()
    }));
  }, []);
  
  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setCanViewDetails(false);
    setLegalAccepted(false);
  }, []);

  const handleAcceptLegal = useCallback(() => {
    setLegalAccepted(true);
  }, []);

  const handleDeclineLegal = useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  if (isSessionRestoring) {
      return (
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
              <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 text-sm font-medium">Oturum kontrol ediliyor...</p>
              </div>
          </div>
      );
  }

  const renderContent = () => {
      if (appError) {
          return (
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-6 text-center">
                  <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900">
                      <svg className="h-8 w-8 text-red-600 dark:text-red-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Sistem Yapılandırma Hatası</h2>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Veritabanı bağlantı ayarları eksik.</p>
                  </div>
                  <div className="text-left text-sm text-gray-600 dark:text-gray-300 bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-100 dark:border-red-800 font-mono text-xs overflow-x-auto">
                    {appError}
                  </div>
                  <p className="text-xs text-gray-400">config.ts dosyasını kontrol edin.</p>
              </div>
          );
      }
      if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center gap-6 w-full max-w-md">
                <LoginScreen onLogin={handleLogin} />
                
                <div className={`w-full rounded-lg py-2 px-4 flex items-center justify-between text-xs font-medium transition-colors ${
                    serverStatus === 'online' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                    serverStatus === 'offline' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                }`}>
                    <div className="flex items-center gap-2">
                        <span className={`relative flex h-2.5 w-2.5`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              serverStatus === 'online' ? 'bg-green-400' : serverStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></span>
                        </span>
                        <span>
                            {serverStatus === 'online' && "Supabase Veritabanı Aktif"}
                            {serverStatus === 'offline' && "Veritabanına Erişilemiyor"}
                            {serverStatus === 'checking' && "Bağlantı Kontrol Ediliyor..."}
                        </span>
                    </div>
                    
                    {serverStatus === 'offline' && (
                        <button 
                            onClick={async () => {
                                setServerStatus('checking');
                                const isOnline = await sheetService.checkServerConnection();
                                setServerStatus(isOnline ? 'online' : 'offline');
                            }}
                            className="underline hover:no-underline"
                        >
                            Yenile
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
                canViewDetails={canViewDetails}
             />;
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex items-center justify-center p-4 font-sans">
      {renderContent()}
    </div>
  );
};

export default App;