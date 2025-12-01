import React, { useState, useEffect } from 'react';
import { UserIcon, LockIcon } from './icons';

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

  // 1. Cihaz Kimliği (Device ID) Yönetimi
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
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
             setError(`Yapılandırma Hatası: Lütfen Google E-Tablonuzda 'Kullanıcılar' adında bir sayfa (sekme) olduğundan emin olun.`);
        } else {
             setError(err.message || 'Bilinmeyen bir hata oluştu.');
        }
    } finally {
        setIsLoggingIn(false);
    }
  };

  const copyToClipboard = () => {
      navigator.clipboard.writeText(deviceId).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <div className="w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 space-y-8 border-t-4 border-blue-600">
      <div className="text-center">
        <div 
            className="flex justify-center items-center mb-6 animate-entry"
            style={{ animationDelay: '0ms' }}
        >
           <img src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" alt="Aksa Doğalgaz Logo" className="h-14 w-auto object-contain" />
        </div>
        <div 
            className="animate-entry"
            style={{ animationDelay: '100ms' }}
        >
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Personel Girişi</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Lütfen sicil numaranızla giriş yapın</p>
        </div>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <div 
            className="space-y-4 animate-entry"
            style={{ animationDelay: '200ms' }}
        >
            <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <UserIcon />
            </div>
            <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Sicil Numarası"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoggingIn}
            />
            </div>
            <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                <LockIcon />
            </div>
            <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-lg relative block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 placeholder-gray-400 text-gray-900 dark:text-white bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Şifre"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoggingIn}
            />
            </div>
        </div>

        <div 
            className="flex items-center justify-between animate-entry"
            style={{ animationDelay: '300ms' }}
        >
            <div className="flex items-center">
                <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded cursor-pointer"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                Beni Hatırla
                </label>
            </div>
        </div>

        {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r shadow-sm animate-entry">
                <div className="flex">
                    <div className="ml-3">
                        <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                    </div>
                </div>
            </div>
        )}

        <button
            type="submit"
            disabled={isLoggingIn}
            style={{ animationDelay: '400ms' }}
            className="animate-entry w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
        >
            {isLoggingIn ? (
                <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Giriş Yapılıyor...
                </span>
            ) : 'Giriş Yap'}
        </button>
      </form>
      
      <div 
        className="pt-6 border-t border-gray-100 dark:border-gray-700 animate-entry"
        style={{ animationDelay: '500ms' }}
      >
        <p className="text-xs text-center text-gray-500 mb-3">Yönetici yetkilendirmesi için Cihaz Kimliği:</p>
        <div className="relative group cursor-pointer" onClick={copyToClipboard}>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3 text-center border border-gray-200 dark:border-gray-700 group-hover:border-blue-300 dark:group-hover:border-blue-700 transition-colors">
                <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all select-all block">
                    {deviceId}
                </code>
            </div>
            <div className={`absolute inset-0 flex items-center justify-center bg-blue-600 bg-opacity-90 rounded-lg transition-opacity duration-200 ${copied ? 'opacity-100' : 'opacity-0 group-hover:opacity-10'}`}>
                <span className="text-white text-xs font-bold">{copied ? 'Kopyalandı!' : 'Kopyalamak için tıkla'}</span>
            </div>
        </div>
      </div>

      <style>{`
        .animate-entry {
            opacity: 0;
            animation: fadeInUp 0.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }
        @keyframes fadeInUp {
            0% {
                opacity: 0;
                transform: translateY(20px);
            }
            100% {
                opacity: 1;
                transform: translateY(0);
            }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;