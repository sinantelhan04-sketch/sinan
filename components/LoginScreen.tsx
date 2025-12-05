
import React, { useState, useEffect } from 'react';
import { UserIcon, LockIcon } from './icons';
import AdBanner from './AdBanner';

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
    }
  }, []);

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
          // Fallback: Kullanıcıya manuel kopyalaması gerektiğini hissettir
          setError('Otomatik kopyalama başarısız, lütfen ID\'yi manuel seçip kopyalayın.');
      }
  };

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto p-4">
        {/* Colorful Gradient Border Wrapper */}
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
            
            {/* Main Card */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in-up">
                
                {/* Header / Logo */}
                <div className="relative pt-8 pb-4 text-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col items-center justify-center">
                        
                        {/* Personnel Avatar / Logo */}
                        <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-blue-500/10 border-4 border-white dark:border-gray-600 ring-2 ring-blue-50 dark:ring-gray-700">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-blue-600 dark:text-blue-400">
                                <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                            </svg>
                        </div>

                        <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-700 to-cyan-600 dark:from-blue-400 dark:to-cyan-400 tracking-tight">
                            Tesisat Sorgulama
                        </h1>
                        <p className="text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
                            Yetkili Personel Girişi
                        </p>
                    </div>
                </div>

                {/* Form Area */}
                <div className="px-8 py-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        
                        {/* Username Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                                Sicil Numarası
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within/input:text-blue-600 dark:group-focus-within/input:text-blue-400 transition-colors">
                                    <UserIcon />
                                </div>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold outline-none shadow-sm focus:bg-white dark:focus:bg-gray-700"
                                    placeholder="Sicil numaranız"
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">
                                Şifre
                            </label>
                            <div className="relative group/input">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within/input:text-blue-600 dark:group-focus-within/input:text-blue-400 transition-colors">
                                    <LockIcon />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoggingIn}
                                    className="block w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-bold outline-none shadow-sm focus:bg-white dark:focus:bg-gray-700"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none cursor-pointer"
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
                            <label className="flex items-center space-x-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 transition-colors"
                                />
                                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors">
                                    Beni Hatırla
                                </span>
                            </label>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg animate-shake shadow-sm">
                                <div className="flex">
                                    <div className="flex-shrink-0">
                                        <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <div className="ml-3">
                                        <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Login Button */}
                        <button
                            type="submit"
                            disabled={isLoggingIn}
                            className={`w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed ${isLoggingIn ? 'cursor-wait' : ''}`}
                        >
                            {isLoggingIn ? (
                                <span className="flex items-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Giriş Yapılıyor...
                                </span>
                            ) : (
                                'Giriş Yap'
                            )}
                        </button>
                    </form>
                </div>

                {/* Footer / Device ID */}
                <div className="bg-gray-50 dark:bg-gray-700/30 px-8 py-4 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Cihaz Kimliği</span>
                            <div className="flex items-center space-x-1 group cursor-pointer" onClick={copyToClipboard} title="Kopyalamak için tıklayın">
                                <code className="text-[10px] text-gray-500 dark:text-gray-400 font-mono bg-white dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-600 group-hover:border-blue-400 transition-colors">
                                    {deviceId.slice(0, 16)}...
                                </code>
                                {copied ? (
                                    <span className="text-[10px] text-green-500 font-bold animate-fade-in">Kopyalandı!</span>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-gray-400 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-300 font-medium">v2.1.0</div>
                    </div>
                </div>
            </div>
        </div>
        
        {/* Support Link */}
        <p className="text-center mt-6 text-xs text-gray-400 dark:text-gray-500">
            Sorun mu yaşıyorsunuz? <a href="#" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">Bilgi İşlem</a> ile görüşün.
        </p>
    </div>
  );
};

export default LoginScreen;
