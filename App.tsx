import React, { useState, useCallback, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import LegalScreen from './components/LegalScreen';
import OfflineScreen from './components/OfflineScreen';
import AdminScreen from './components/AdminScreen';
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


  useEffect(() => {
     if (!SCRIPT_URL || SCRIPT_URL.includes("YOUR_SCRIPT_URL_HERE")) {
        setAppError("Uygulama yapılandırılmamış. Lütfen config.ts dosyasını kontrol edin.");
    }
    const interval = setInterval(() => {
        setIsWorkingTime(isWithinWorkingHours());
    }, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogin = useCallback(async (username: string, password: string) => {
    // Admin login is a local check, no need for network request
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setLegalAccepted(true); // Admin doesn't need legal screen
        return;
    }
   
    // For regular users, call the new, optimized authentication service
    await sheetService.authenticateUser(username, password);
    
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
              <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-8 text-center">
                  <h2 className="text-2xl font-bold text-red-600">Yapılandırma Hatası</h2>
                  <p className="text-gray-600 dark:text-gray-300">{appError}</p>
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
      // District selection removed, go straight to MainScreen
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