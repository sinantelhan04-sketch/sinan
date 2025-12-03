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
        {/* Main Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700 animate-fade-in-up">
            
            {/* Header / Logo */}
            <div className="relative pt-8 pb-4 text-center bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-700">
                <div className="flex flex-col items-center justify-center">
                    
                    {/* Personnel Avatar / Logo */}
                    <div className="w-20 h-20 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center mb-3 shadow-lg border-4 border-white dark:border-gray-600 ring-1 ring-gray-100 dark:ring-gray-800">
                         <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-blue-600 dark:text-blue-400">
                            <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                        </svg>
                    </div>

                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
                        Tesisat Sorgulama
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-widest mt-1 text-blue-600 dark:text-blue-400">
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
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                                <UserIcon />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                disabled={isLoggingIn}
                                className="block w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium outline-none"
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
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400 transition-colors">
                                <LockIcon />
                            </div>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoggingIn}
                                className="block w-full pl-11 pr-12 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all font-medium outline-none"
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
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
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
                    <div className="flex items-center justify-between pt-1">
                        <label className="flex items-center cursor-pointer group select-none">
                            <div className="relative flex items-center">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="peer sr-only"
                                />
                                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-500 rounded peer-checked:bg-blue-600 peer-checked:border-blue-600 transition-all bg-white dark:bg-gray-700"></div>
                                <svg className="absolute left-0 top-0 w-5 h-5 text-white opacity-0 peer-checked:opacity-100 transition-opacity pointer-events-none p-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            </div>
                            <span className="ml-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Beni Hatırla</span>
                        </label>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-start gap-3 animate-shake">
                            <svg className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className="text-sm text-red-700 dark:text-red-200 font-medium">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoggingIn}
                        className={`w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-500/30 text-base flex items-center justify-center ${isLoggingIn ? 'opacity-80 cursor-wait' : ''}`}
                    >
                        {isLoggingIn ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Giriş Yapılıyor...
                            </>
                        ) : 'Giriş Yap'}
                    </button>
                </form>

                {/* Device ID Section */}
                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex flex-col items-center">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-bold mb-2">Bu Cihazın Kimliği</p>
                        <button 
                            type="button"
                            onClick={copyToClipboard}
                            className="group relative w-full flex items-center justify-between gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:border-blue-200 dark:hover:border-blue-900 rounded-lg transition-all active:scale-95 cursor-pointer"
                        >
                            <code className="flex-1 text-xs font-mono text-gray-600 dark:text-gray-400 truncate text-center select-all">
                                {deviceId}
                            </code>
                            <div className="flex items-center justify-center w-6 h-6 rounded bg-gray-200 dark:bg-gray-600 group-hover:bg-blue-100 dark:group-hover:bg-blue-900 transition-colors">
                                {copied ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 dark:text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                )}
                            </div>
                            
                            {/* Tooltip for success */}
                            {copied && (
                                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded shadow-lg animate-fade-in z-10">
                                    Kopyalandı!
                                </div>
                            )}
                        </button>
                    </div>
                </div>
            </div>
            
            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-800/80 p-4 text-center border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">
                    Bu Uygulama Ölçüm Tahakkuk Birimi Tarafından Hazırlanmıştır.
                </p>
            </div>
        </div>
        
        {/* Ad Banner for Revenue */}
        <AdBanner />

        {/* Styles */}
        <style>{`
        .animate-fade-in-up {
            animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .animate-shake {
            animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
        }
        .animate-fade-in {
             animation: fadeIn 0.2s ease-out;
        }
        @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
        }
        `}</style>
    </div>
  );
};

export default LoginScreen;