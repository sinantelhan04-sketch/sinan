

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
import type { Announcement } from './types';
import AnnouncementModal from './components/AnnouncementModal';
import { InstallIcon } from './components/icons';

const SESSION_KEY = 'app_session_v1';
const ANNOUNCEMENT_SEEN_KEY = 'announcement_seen_id';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [currentUserFullName, setCurrentUserFullName] = useState<string | null>(null);
  const [canViewDetails, setCanViewDetails] = useState<boolean>(false);
  const [canViewPhone, setCanViewPhone] = useState<boolean>(false);
  const [hasUnlimitedAccess, setHasUnlimitedAccess] = useState<boolean>(false); // 7/24 Erişim Yetkisi
  const [legalAccepted, setLegalAccepted] = useState<boolean>(false);
  const [isWorkingTime, setIsWorkingTime] = useState(isWithinWorkingHours());
  const [appError, setAppError] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [isSessionRestoring, setIsSessionRestoring] = useState(true);

  // Announcement State
  const [activeAnnouncement, setActiveAnnouncement] = useState<Announcement | null>(null);
  const [showAnnouncement, setShowAnnouncement] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Başlangıç yükleme ekranını kaldır (ÖNEMLİ DÜZELTME)
  useEffect(() => {
    const loader = document.getElementById('initial-loader');
    if (loader) {
        // React mount olduktan sonra loader'ı yumuşakça kaldır
        setTimeout(() => {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 500);
        }, 100);
    }
  }, []);

  // PWA Install Prompt Listener
  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

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
                setCurrentUserFullName(session.fullName);
                setCanViewDetails(session.canViewDetails);
                setCanViewPhone(session.canViewPhone || false);
                setHasUnlimitedAccess(session.unlimitedAccess || false);
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
            setCurrentUserFullName(null);
            setCanViewDetails(false);
            setCanViewPhone(false);
            setHasUnlimitedAccess(false);
            setLegalAccepted(false);
        }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Duyuru kontrolü
  const checkAnnouncement = useCallback(async (username: string) => {
      // Admin ise duyuru kontrolü yapma
      if (username === 'admin') return;

      try {
          const announcement = await sheetService.getActiveAnnouncement(username);
          if (announcement) {
              const seenId = localStorage.getItem(ANNOUNCEMENT_SEEN_KEY);
              // Eğer bu duyuru ID'si daha önce görülmediyse göster
              if (seenId !== String(announcement.id)) {
                  setActiveAnnouncement(announcement);
                  setShowAnnouncement(true);
              }
          }
      } catch (e) {
          console.error("Duyuru kontrol hatası", e);
      }
  }, []);

  const handleLogin = useCallback(async (username: string, password: string, deviceId: string) => {
    // Admin login is a local check
    if (username === 'admin' && password === 'admin123') {
        setIsAuthenticated(true);
        setIsAdmin(true);
        setCurrentUser('admin');
        setCurrentUserFullName('Sistem Yöneticisi');
        setCanViewDetails(true); 
        setCanViewPhone(true);
        setHasUnlimitedAccess(true);
        setLegalAccepted(true);
        
        // Oturumu Kaydet
        localStorage.setItem(SESSION_KEY, JSON.stringify({
            username: 'admin',
            fullName: 'Sistem Yöneticisi',
            canViewDetails: true,
            canViewPhone: true,
            unlimitedAccess: true,
            timestamp: Date.now()
        }));
        return;
    }
   
    const result = await sheetService.authenticateUser(username, password, deviceId);
    
    setIsAuthenticated(true);
    setIsAdmin(false);
    setCurrentUser(username);
    setCurrentUserFullName(result.fullName || null);
    setCanViewDetails(result.canViewDetails); 
    setCanViewPhone(result.canViewPhone);
    setHasUnlimitedAccess(result.unlimitedAccess || false);
    setLegalAccepted(false);

    // Oturumu Kaydet
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        username,
        fullName: result.fullName,
        canViewDetails: result.canViewDetails,
        canViewPhone: result.canViewPhone,
        unlimitedAccess: result.unlimitedAccess,
        timestamp: Date.now()
    }));
  }, []);
  
  const handleLogout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
    setCurrentUserFullName(null);
    setCanViewDetails(false);
    setCanViewPhone(false);
    setHasUnlimitedAccess(false);
    setLegalAccepted(false);
    setShowAnnouncement(false);
    setActiveAnnouncement(null);
  }, []);

  const handleAcceptLegal = useCallback(() => {
    setLegalAccepted(true);
    // Yasal uyarıdan sonra duyuruyu kontrol et
    if (currentUser) {
        checkAnnouncement(currentUser);
    }
  }, [currentUser, checkAnnouncement]);

  const handleDeclineLegal = useCallback(() => {
    handleLogout();
  }, [handleLogout]);

  const handleDismissAnnouncement = () => {
      if (activeAnnouncement?.id) {
          localStorage.setItem(ANNOUNCEMENT_SEEN_KEY, String(activeAnnouncement.id));
      }
      setShowAnnouncement(false);
  };

  if (isSessionRestoring) {
      return (
          <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
              <div className="flex flex-col items-center bg-brand-card p-12 rounded-[32px] border border-brand-border shadow-2xl">
                  <div className="w-16 h-16 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin mb-6"></div>
                  <p className="text-brand-text font-black uppercase tracking-widest text-xs">Sistem Yükleniyor</p>
                  <p className="text-brand-text-muted text-[10px] mt-2">Oturum kontrol ediliyor...</p>
              </div>
          </div>
      );
  }

  const renderContent = () => {
      if (appError) {
          return (
              <div className="w-full max-w-md bg-brand-card rounded-[32px] shadow-2xl p-8 sm:p-10 space-y-8 text-center border border-brand-border relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-red-500/10 border border-red-500/30 text-red-500 animate-pulse">
                      <svg className="h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-brand-text uppercase tracking-tight">Sistem <span className="text-red-500">Hatası</span></h2>
                    <p className="text-sm text-brand-text-muted font-medium">Yapılandırma ayarları eksik veya hatalı.</p>
                  </div>
                  <div className="text-left text-[11px] text-red-400 bg-black/40 p-6 rounded-2xl border border-red-500/20 font-mono overflow-x-auto leading-relaxed">
                    {appError}
                  </div>
                  <p className="text-[10px] text-brand-text-muted font-bold uppercase tracking-widest">config.ts dosyasını kontrol edin.</p>
              </div>
          );
      }
      if (!isAuthenticated) {
        return (
            <div className="flex flex-col items-center gap-6 w-full max-w-md animate-fade-in">
                <LoginScreen onLogin={handleLogin} />
                
                <div className={`w-full rounded-2xl py-3 px-6 flex flex-col items-center justify-between text-[10px] font-black uppercase tracking-widest transition-all border ${
                    serverStatus === 'online' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                    serverStatus === 'offline' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                    'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                }`}>
                    <div className="flex items-center gap-3 w-full justify-center">
                        <span className={`relative flex h-2.5 w-2.5`}>
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                              serverStatus === 'online' ? 'bg-green-400' : serverStatus === 'offline' ? 'bg-red-400' : 'bg-yellow-400'
                          }`}></span>
                          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                              serverStatus === 'online' ? 'bg-green-500' : serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}></span>
                        </span>
                        <span>
                            {serverStatus === 'online' && "Veritabanı Aktif"}
                            {serverStatus === 'offline' && "Veritabanı Bağlantı Hatası"}
                            {serverStatus === 'checking' && "Bağlantı Kontrol Ediliyor"}
                        </span>
                    </div>
                    
                    {serverStatus === 'offline' && (
                        <div className="mt-3 text-[9px] text-red-400 text-center px-4 border-t border-red-500/10 pt-3 w-full font-medium normal-case leading-relaxed">
                            Not: Türkiye'den erişimde sorun yaşıyorsanız DNS veya VPN kontrolü yapınız.
                            <br/>
                            <button 
                                onClick={async () => {
                                    setServerStatus('checking');
                                    const isOnline = await sheetService.checkServerConnection();
                                    setServerStatus(isOnline ? 'online' : 'offline');
                                }}
                                className="underline hover:no-underline mt-2 font-black uppercase tracking-widest text-red-500"
                            >
                                Tekrar Dene
                            </button>
                        </div>
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

      // DUYURU MODALI
      if (showAnnouncement && activeAnnouncement) {
          return (
              <AnnouncementModal 
                  title={activeAnnouncement.title}
                  content={activeAnnouncement.content}
                  imageUrl={activeAnnouncement.imageUrl}
                  onDismiss={handleDismissAnnouncement}
              />
          );
      }
      
      // ÇALIŞMA SAATİ KONTROLÜ
      if (!isWorkingTime && !hasUnlimitedAccess && !isAdmin) {
          return <OfflineScreen />;
      }
      
      return <MainScreen 
                onLogout={handleLogout} 
                username={currentUser!}
                fullName={currentUserFullName}
                canViewDetails={canViewDetails}
                canViewPhone={canViewPhone}
             />;
  }

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text flex items-center justify-center p-4 font-sans relative">
      {renderContent()}

      {/* PWA Install Button */}
      {showInstallBtn && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <button 
            onClick={handleInstallClick}
            className="bg-brand-accent hover:bg-brand-accent-hover text-black px-8 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black transition-all hover:scale-105 uppercase tracking-widest text-xs border border-white/20"
          >
            <InstallIcon />
            <span>Uygulamayı İndir</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default App;