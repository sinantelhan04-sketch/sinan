
import React, { useState, useEffect } from 'react';
import { UserIcon, LockIcon, FlameIcon } from './icons';
import * as sheetService from '../services/sheetService';

interface LoginScreenProps {
  onLogin: (username: string, password: string, deviceId: string) => Promise<void>;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [isFetchingPhoto, setIsFetchingPhoto] = useState(false);

  // Cihaz Kimliği Yönetimi
  const [deviceId] = useState(() => {
    const STORAGE_KEY = 'device_uuid';
    try {
      let stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        stored = crypto.randomUUID 
          ? crypto.randomUUID() 
          : Math.random().toString(36).substring(2) + Date.now().toString(36);
        localStorage.setItem(STORAGE_KEY, stored);
      }
      return stored;
    } catch (e) {
      return "temp-session-" + Date.now();
    }
  });

  useEffect(() => {
    const rememberedUsername = localStorage.getItem('rememberedUsername');
    if (rememberedUsername) {
      setUsername(rememberedUsername);
      setRememberMe(true);
      fetchUserPhoto(rememberedUsername);
    }
  }, []);

  const fetchUserPhoto = async (uname: string) => {
    if (uname.length < 3) {
        setUserPhoto(null);
        return;
    }
    setIsFetchingPhoto(true);
    const photo = await sheetService.getUserPhoto(uname);
    setUserPhoto(photo);
    setIsFetchingPhoto(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
        if (username) {
            fetchUserPhoto(username);
        } else {
            setUserPhoto(null);
        }
    }, 500);
    return () => clearTimeout(timer);
  }, [username]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
        setError("Lütfen kullanıcı adı ve şifre giriniz.");
        return;
    }

    setError('');
    setIsLoggingIn(true);
    try {
        await onLogin(username, password, deviceId);
        
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }
    } catch (err: any) {
        if (err.message && err.message.includes("sayfa bulunamadı")) {
             setError(`Yapılandırma Hatası: Lütfen veritabanı bağlantılarını kontrol edin.`);
        } else {
             setError(err.message || 'Bilinmeyen bir hata oluştu.');
        }
    } finally {
        setIsLoggingIn(false);
    }
  };

  const copyToClipboard = async () => {
      try {
          await navigator.clipboard.writeText(deviceId);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      } catch (err) {
          console.error('Kopyalama başarısız:', err);
          setError('Otomatik kopyalama başarısız, lütfen ID\'yi manuel seçip kopyalayın.');
      }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto p-4 relative min-h-[600px] flex items-center justify-center">
        
        {/* Soft Animation Definitions */}
        <style>{`
            @keyframes blob {
                0% { transform: translate(0px, 0px) scale(1); }
                33% { transform: translate(30px, -50px) scale(1.1); }
                66% { transform: translate(-20px, 20px) scale(0.9); }
                100% { transform: translate(0px, 0px) scale(1); }
            }
            .animate-blob {
                animation: blob 7s infinite;
            }
            .animation-delay-2000 {
                animation-delay: 2s;
            }
            .animation-delay-4000 {
                animation-delay: 4s;
            }
        `}</style>

        {/* Dynamic Background Elements (Subtle Grid) */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#0056b3 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>

        {/* Main Hardware Card */}
        <div className="relative w-full card-hardware z-10 shadow-2xl">
            
            {/* Header / Logo Section */}
            <div className="pt-10 pb-6 text-center border-b border-brand-border">
                <div className="flex flex-col items-center justify-center">
                    
                    {/* Logo Circle */}
                    <div className="w-16 h-16 bg-brand-accent rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-accent/20 overflow-hidden transition-all duration-500">
                         {userPhoto ? (
                             <img src={userPhoto} alt="User" className="w-full h-full object-cover animate-fade-in" referrerPolicy="no-referrer" />
                         ) : (
                             <FlameIcon className={`w-8 h-8 text-white ${isFetchingPhoto ? 'animate-pulse opacity-50' : ''}`} />
                         )}
                    </div>

                    <h1 className="text-xl font-black text-brand-text tracking-tight uppercase">
                        TESİSAT SORGULAMA
                    </h1>
                    <p className="text-brand-accent text-[10px] font-bold uppercase tracking-[0.3em] mt-2">
                        YETKİLİ PERSONEL PANELİ
                    </p>
                </div>
            </div>

            {/* Form Area */}
            <div className="px-8 py-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    
                    {/* Username Input */}
                    <div className="space-y-1.5">
                        <label className="label-hardware">
                            SİCİL NUMARASI
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-muted group-focus-within:text-brand-accent transition-colors">
                                <UserIcon />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoggingIn}
                                className="input-hardware w-full pl-11"
                                placeholder="Sicil numaranız"
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-1.5">
                        <label className="label-hardware">
                            ŞİFRE
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-brand-text-muted group-focus-within:text-brand-accent transition-colors">
                                <LockIcon />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoggingIn}
                                className="input-hardware w-full pl-11 pr-12"
                                placeholder="••••••••"
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-brand-text-muted hover:text-brand-accent focus:outline-none cursor-pointer transition-colors"
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.25m3-3.75l3 3.75m-14.3 0L5.7 6.3" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Remember Me */}
                    <div className="flex items-center justify-between">
                        <label className="flex items-center space-x-2.5 cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-brand-border checked:bg-brand-accent checked:border-brand-accent transition-all"
                                />
                                <svg className="absolute w-3.5 h-3.5 text-black hidden peer-checked:block pointer-events-none left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            </div>
                            <span className="text-sm text-brand-text-muted font-medium group-hover:text-brand-accent transition-colors">
                                Beni Hatırla
                            </span>
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium flex items-center animate-fade-in border border-red-100">
                            <svg className="w-5 h-5 mr-2 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Login Button */}
                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className="btn-hardware w-full py-4 text-sm tracking-widest"
                    >
                        {isLoggingIn ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                GİRİŞ YAPILIYOR...
                            </span>
                        ) : (
                            'SİSTEME GİRİŞ YAP'
                        )}
                    </button>
                </form>
                
                {/* Footer / Device ID */}
                <div className="mt-8 pt-6 border-t border-brand-border">
                     <div className="flex flex-col items-center gap-2">
                        <span className="label-hardware">TERMİNAL KİMLİĞİ</span>
                        <div className="flex items-center space-x-2 group cursor-pointer" onClick={copyToClipboard} title="Kopyalamak için tıklayın">
                            <code className="text-[11px] text-brand-text-muted font-mono bg-brand-bg px-3 py-1.5 rounded-lg border border-brand-border group-hover:border-brand-accent group-hover:text-brand-accent transition-all">
                                {deviceId.slice(0, 16)}...
                            </code>
                            {copied ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-brand-text-muted group-hover:text-brand-accent transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                </svg>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Support Link */}
        <div className="absolute bottom-4 left-0 w-full text-center">
             <p className="text-xs text-brand-text-muted font-medium">
                Sorun mu yaşıyorsunuz? <a href="#" className="text-brand-accent font-bold hover:underline">Teknik Destek</a>
            </p>
        </div>
    </div>
  );
};

export default LoginScreen;