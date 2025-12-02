import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat } from '../types';
import { TrashIcon, EditIcon, SearchIcon, RefreshIcon, UserGroupIcon, ChartBarIcon, LightningIcon } from './icons';

type AdminUserData = Credential & Omit<UserActivityStat, 'username'>;
type SortableKeys = 'username' | 'queryCount' | 'lastLogin';

interface AdminScreenProps {
  onLogout: () => void;
}

// Icon for Customer Count
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);

const parseTRDate = (dateStr: string | undefined | null): Date | null => {
    if (!dateStr || dateStr === 'Giriş Yapmadı') return null;
    try {
        const [datePart, timePart] = dateStr.split(' ');
        if (!datePart || !timePart) return null;
        const [day, month, year] = datePart.split('.').map(Number);
        const [hour, minute] = timePart.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
    } catch (e) {
        return null;
    }
};

const getStatusColor = (dateStr: string | undefined) => {
    const date = parseTRDate(dateStr);
    if (!date) return 'bg-gray-400';
    
    const diffMins = (new Date().getTime() - date.getTime()) / (1000 * 60);
    
    if (diffMins < 15) return 'bg-green-500'; 
    if (diffMins < 60 * 24) return 'bg-blue-500';
    return 'bg-gray-400';
};

const getStatusLabel = (dateStr: string | undefined) => {
    const date = parseTRDate(dateStr);
    if (!date) return 'Çevrimdışı';
    
    const diffMins = (new Date().getTime() - date.getTime()) / (1000 * 60);
    
    if (diffMins < 15) return 'Çevrimiçi';
    if (diffMins < 60 * 24) return 'Bugün Aktif';
    return 'Çevrimdışı';
};

const getAvatarColor = (username: string) => {
    const colors = [
        'bg-red-100 text-red-600',
        'bg-orange-100 text-orange-600',
        'bg-amber-100 text-amber-600',
        'bg-green-100 text-green-600',
        'bg-emerald-100 text-emerald-600',
        'bg-teal-100 text-teal-600',
        'bg-cyan-100 text-cyan-600',
        'bg-blue-100 text-blue-600',
        'bg-indigo-100 text-indigo-600',
        'bg-violet-100 text-violet-600',
        'bg-purple-100 text-purple-600',
        'bg-fuchsia-100 text-fuchsia-600',
        'bg-pink-100 text-pink-600',
        'bg-rose-100 text-rose-600',
    ];
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSkipDeviceLock, setNewSkipDeviceLock] = useState(false);
  const [newCanViewDetails, setNewCanViewDetails] = useState(false);
  
  // Edit User Form State
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ 
      username: '', 
      password: '', 
      allowedDeviceId: '',
      skipDeviceLock: false,
      canViewDetails: false
  });
  
  const [showPasswords, setShowPasswords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'lastLogin', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [creds, stats, customerCount] = await Promise.all([
        sheetService.getCredentials(),
        sheetService.getUserActivityStats(),
        sheetService.getTotalCustomerCount()
      ]);

      setTotalCustomers(customerCount);

      const statsMap = new Map<string, Omit<UserActivityStat, 'username'>>();
      stats.forEach(stat => {
        statsMap.set(String(stat.username), { 
            queryCount: stat.queryCount, 
            lastLogin: stat.lastLogin 
        });
      });

      const mergedData: AdminUserData[] = creds.map(cred => ({
        ...cred,
        queryCount: statsMap.get(String(cred.username))?.queryCount ?? 0,
        lastLogin: statsMap.get(String(cred.username))?.lastLogin ?? 'Giriş Yapmadı',
      }));

      setUsers(mergedData);

    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const dashboardStats = useMemo(() => {
      const totalUsers = users.length;
      const totalQueries = users.reduce((acc, user) => acc + user.queryCount, 0);
      const activeUser = [...users].sort((a, b) => b.queryCount - a.queryCount)[0];
      const onlineCount = users.filter(u => getStatusLabel(u.lastLogin) === 'Çevrimiçi').length;
      const maxQueryCount = activeUser ? activeUser.queryCount : 0;
      
      return { totalUsers, totalQueries, activeUser, onlineCount, maxQueryCount };
  }, [users]);

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'lastLogin') {
                const aTime = parseTRDate(a.lastLogin)?.getTime() || 0;
                const bTime = parseTRDate(b.lastLogin)?.getTime() || 0;
                return sortConfig.direction === 'ascending' ? aTime - bTime : bTime - aTime;
            }
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return sortedUsers;
    return sortedUsers.filter(user =>
        String(user.username).toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [sortedUsers, searchTerm]);

  const requestSort = (key: SortableKeys) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIndicator = (key: SortableKeys) => {
    if (sortConfig.key !== key) return <span className="text-gray-300 ml-1 opacity-0 group-hover:opacity-50">↕</span>;
    return <span className="text-blue-500 ml-1">{sortConfig.direction === 'ascending' ? '▲' : '▼'}</span>;
  }

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim()) {
      setError('Sicil Numarası ve Şifre boş olamaz.');
      return;
    }
    try {
        setIsSubmitting(true);
        setError('');
        await sheetService.addCredential({ 
            username: newUsername.trim(), 
            password: newPassword.trim(),
            allowedDeviceId: newDeviceId.trim(),
            skipDeviceLock: newSkipDeviceLock,
            canViewDetails: newCanViewDetails
        });
        setNewUsername('');
        setNewPassword('');
        setNewDeviceId('');
        setNewSkipDeviceLock(false);
        setNewCanViewDetails(false);
        setIsAddModalOpen(false);
        setSuccessMsg('Kullanıcı başarıyla eklendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
    } catch(err: any) {
        setError(err.message || 'Kullanıcı eklenemedi.');
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (window.confirm(`'${username}' sicil numaralı kullanıcıyı silmek istediğinizden emin misiniz?`)) {
       try {
        setIsLoading(true);
        setError('');
        await sheetService.deleteCredential(username);
        setSuccessMsg('Kullanıcı silindi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
      } catch (err: any) {
        setError(err.message || 'Kullanıcı silinemedi.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetStats = async (username: string) => {
      if (window.confirm(`'${username}' için sorgu geçmişini ve istatistikleri sıfırlamak istediğinize emin misiniz?`)) {
          try {
              setIsLoading(true);
              setError('');
              await sheetService.resetUserStats(username);
              setSuccessMsg('İstatistikler sıfırlandı.');
              setTimeout(() => setSuccessMsg(''), 3000);
              await fetchData();
          } catch(err: any) {
              setError(err.message || "Sıfırlama başarısız.");
          } finally {
              setIsLoading(false);
          }
      }
  };
  
  const handleOpenEditModal = (user: AdminUserData) => {
    setEditingUser(user);
    setEditForm({ 
        username: String(user.username), 
        password: String(user.password),
        allowedDeviceId: String(user.allowedDeviceId || ''),
        skipDeviceLock: user.skipDeviceLock || false,
        canViewDetails: user.canViewDetails || false
    });
    setIsEditModalOpen(true);
    setError('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    
    const finalUsername = String(editForm.username).trim();
    const finalPassword = String(editForm.password).trim();

    if (!finalUsername || !finalPassword) {
        setError('Alanlar boş olamaz.');
        return;
    }
    try {
        setIsSubmitting(true);
        setError('');
        await sheetService.updateCredential(editingUser.username, {
            username: finalUsername, 
            password: finalPassword,
            allowedDeviceId: String(editForm.allowedDeviceId).trim(),
            skipDeviceLock: editForm.skipDeviceLock,
            canViewDetails: editForm.canViewDetails
        });
        setIsEditModalOpen(false);
        setEditingUser(null);
        setSuccessMsg('Kullanıcı güncellendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-8 min-h-screen">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                    Yönetim Paneli
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sistem durumunu izleyin ve personeli yönetin.</p>
            </div>
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                    onClick={fetchData} 
                    disabled={isLoading}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-xl transition-all font-medium text-sm shadow-sm border border-gray-200 dark:border-gray-600"
                >
                    <span className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}>
                         <RefreshIcon />
                    </span>
                    Yenile
                </button>
                <button 
                    onClick={onLogout}
                    className="flex-1 md:flex-none justify-center flex items-center px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl transition-all font-medium border border-red-100 dark:border-red-800 text-sm shadow-sm"
                >
                    Çıkış Yap
                </button>
            </div>
        </div>

        {/* Dashboard Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 0: Toplam Müşteri Sayısı */}
             <div className="relative overflow-hidden bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-cyan-100 text-sm font-medium uppercase tracking-wider">Toplam Abone</p>
                        <h3 className="text-4xl font-bold mt-2">{totalCustomers}</h3>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <DatabaseIcon />
                    </div>
                </div>
                <div className="mt-4 text-sm text-cyan-100">
                   Kayıtlı Tesisat Sayısı
                </div>
            </div>

            {/* Card 1: Total Users */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-[1.02]">
                <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider">Toplam Personel</p>
                        <h3 className="text-4xl font-bold mt-2">{dashboardStats.totalUsers}</h3>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <UserGroupIcon />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm text-blue-100">
                    <span className="flex h-2 w-2 relative mr-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400"></span>
                    </span>
                    {dashboardStats.onlineCount} Kişi Çevrimiçi
                </div>
            </div>

            {/* Card 2: Total Queries */}
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-[1.02]">
                <div className="absolute bottom-0 left-0 -ml-4 -mb-4 w-24 h-24 rounded-full bg-white opacity-10 blur-xl"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-indigo-100 text-sm font-medium uppercase tracking-wider">Toplam Sorgu</p>
                        <h3 className="text-4xl font-bold mt-2">{dashboardStats.totalQueries}</h3>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <ChartBarIcon />
                    </div>
                </div>
                <div className="mt-4 text-sm text-indigo-100">
                    Veritabanı Aktivitesi
                </div>
            </div>

            {/* Card 3: Top Performer */}
            <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-[1.02]">
                <div className="absolute top-0 left-1/2 -ml-12 -mt-4 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Ayın Elemanı</p>
                        <div className="mt-2 flex items-center">
                            {dashboardStats.activeUser ? (
                                <>
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold mr-3 border-2 border-white/30">
                                        {dashboardStats.activeUser.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold leading-tight">{dashboardStats.activeUser.username}</h3>
                                        <p className="text-xs text-amber-100">{dashboardStats.activeUser.queryCount} Sorgu</p>
                                    </div>
                                </>
                            ) : (
                                <h3 className="text-xl font-bold">Veri Yok</h3>
                            )}
                        </div>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                        <LightningIcon />
                    </div>
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col">
            
            {/* Toolbar */}
            <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                        <UserGroupIcon />
                    </div>
                    <h2 className="text-lg font-bold text-gray-800 dark:text-white">Kullanıcı Listesi</h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative w-full sm:w-auto group">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Sicil No Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-64 transition-all shadow-sm"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-600/40 transition-all transform active:scale-95 flex items-center justify-center whitespace-nowrap w-full sm:w-auto"
                    >
                        + Yeni Kullanıcı
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2 text-sm font-medium">{error}</div>}
            {successMsg && <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-2 text-sm font-medium">{successMsg}</div>}

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                            <th onClick={() => requestSort('username')} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div className="flex items-center">Sicil No {getSortIndicator('username')}</div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                <div className="flex items-center gap-2">
                                    Şifre
                                    <input 
                                        type="checkbox" 
                                        checked={showPasswords} 
                                        onChange={(e) => setShowPasswords(e.target.checked)}
                                        className="cursor-pointer h-3 w-3 accent-blue-600 rounded"
                                        title="Şifreleri Göster/Gizle"
                                    />
                                </div>
                            </th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cihaz Durumu</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Yetkiler</th>
                            <th onClick={() => requestSort('queryCount')} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-1/5">
                                <div className="flex items-center">Aktivite (Sorgu) {getSortIndicator('queryCount')}</div>
                            </th>
                            <th onClick={() => requestSort('lastLogin')} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div className="flex items-center">Durum / Son Giriş {getSortIndicator('lastLogin')}</div>
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                        {isLoading ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-20 text-center">
                                    <div className="flex justify-center items-center gap-3">
                                        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                                        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <p className="mt-4 text-gray-500 font-medium">Veriler yükleniyor...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-400 italic">Kayıt bulunamadı.</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => {
                                const maxQ = dashboardStats.maxQueryCount || 1;
                                const widthPercent = (user.queryCount / maxQ) * 100;
                                const statusColor = getStatusColor(user.lastLogin);
                                const statusLabel = getStatusLabel(user.lastLogin);
                                const isOnline = statusLabel === 'Çevrimiçi';

                                return (
                                <tr key={user.username} className="group hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className={`flex-shrink-0 h-10 w-10 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-sm font-bold shadow-sm ring-2 ring-white dark:ring-gray-700`}>
                                                {user.username.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="ml-4">
                                                <div className="text-sm font-bold text-gray-900 dark:text-white font-mono">{user.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-700/50 inline-block px-2 py-1 rounded">
                                            {showPasswords ? user.password : '••••••'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {user.skipDeviceLock ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 w-fit">
                                                Kilitsiz (Serbest)
                                            </span>
                                        ) : user.allowedDeviceId ? (
                                            <div className="flex flex-col">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 w-fit">
                                                    Eşleşmiş
                                                </span>
                                                <span className="text-[10px] text-gray-400 mt-1 font-mono">{user.allowedDeviceId.slice(0,8)}...</span>
                                            </div>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                Bekliyor
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs">
                                        <div className="flex flex-col gap-1">
                                            {user.canViewDetails ? (
                                                <span className="text-green-600 font-bold">Tam İsim</span>
                                            ) : (
                                                <span className="text-gray-500">Maskeli</span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="w-full max-w-xs">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="font-bold text-gray-700 dark:text-gray-300">{user.queryCount}</span>
                                            </div>
                                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                                <div 
                                                    className={`h-2 rounded-full transition-all duration-1000 ease-out ${user.queryCount > 100 ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-indigo-500'}`} 
                                                    style={{ width: `${Math.max(widthPercent, 5)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <div className="flex items-center mb-1">
                                                <div className={`flex-shrink-0 h-2.5 w-2.5 rounded-full ${statusColor} mr-2 ${isOnline ? 'animate-pulse' : ''}`}></div>
                                                <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                    {statusLabel}
                                                </div>
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400 font-mono pl-4">
                                                {user.lastLogin !== 'Giriş Yapmadı' ? user.lastLogin : '-'}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                            <button 
                                                onClick={() => handleResetStats(user.username)}
                                                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                title="İstatistikleri Sıfırla"
                                            >
                                                <RefreshIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenEditModal(user)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.username)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )})
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Yeni Kullanıcı</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                  </div>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sicil Numarası</label>
                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" placeholder="Örn: 12345" autoFocus />
                      </div>
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Şifre</label>
                          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" placeholder="Güçlü bir şifre" />
                      </div>
                      
                      {/* Checkboxes */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                          <label className="flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={newSkipDeviceLock}
                                onChange={e => setNewSkipDeviceLock(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                              />
                              <div className="ml-3">
                                  <span className="block text-sm font-bold text-gray-800 dark:text-white">Cihaz Kilidini Devre Dışı Bırak</span>
                                  <span className="block text-xs text-gray-500">Herhangi bir cihazdan giriş yapabilir.</span>
                              </div>
                          </label>

                          <label className="flex items-center cursor-pointer">
                              <input 
                                type="checkbox" 
                                checked={newCanViewDetails}
                                onChange={e => setNewCanViewDetails(e.target.checked)}
                                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                              />
                              <div className="ml-3">
                                  <span className="block text-sm font-bold text-gray-800 dark:text-white">Tam İsim Görebilir</span>
                                  <span className="block text-xs text-gray-500">Abone isimleri maskelenmez (Örn: Ahmet Yılmaz).</span>
                              </div>
                          </label>
                      </div>

                      <div className="flex justify-end gap-3 mt-8">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium">İptal</button>
                          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30 font-medium disabled:opacity-50">
                              {isSubmitting ? 'Ekleniyor...' : 'Kullanıcıyı Ekle'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Düzenle: <span className="text-blue-600">{editingUser.username}</span></h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sicil Numarası</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Şifre</label>
                    <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" />
                </div>
                
                 {/* Checkboxes for Edit */}
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl space-y-3">
                     <label className="flex items-center cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={editForm.skipDeviceLock}
                           onChange={e => setEditForm({...editForm, skipDeviceLock: e.target.checked})}
                           className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                         />
                         <div className="ml-3">
                             <span className="block text-sm font-bold text-gray-800 dark:text-white">Cihaz Kilidini Devre Dışı Bırak</span>
                         </div>
                     </label>

                     <label className="flex items-center cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={editForm.canViewDetails}
                           onChange={e => setEditForm({...editForm, canViewDetails: e.target.checked})}
                           className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300" 
                         />
                         <div className="ml-3">
                             <span className="block text-sm font-bold text-gray-800 dark:text-white">Tam İsim Görebilir</span>
                         </div>
                     </label>
                 </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kayıtlı Cihaz ID</label>
                    <div className="flex gap-2">
                        <input type="text" value={editForm.allowedDeviceId} onChange={e => setEditForm({...editForm, allowedDeviceId: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white font-mono text-sm" />
                        <button type="button" onClick={() => setEditForm({...editForm, allowedDeviceId: ''})} className="px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500">SIFIRLA</button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-5 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-medium">İptal</button>
                    <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-lg shadow-green-500/30 font-medium disabled:opacity-50">
                        {isSubmitting ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
      <style>{`
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </div>
  );
};