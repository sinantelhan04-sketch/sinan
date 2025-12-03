import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat } from '../types';
import { TrashIcon, EditIcon, SearchIcon, RefreshIcon, UserGroupIcon, ChartBarIcon, LightningIcon, PhoneIconSolid, MessageIcon } from './icons';
import AdBanner from './AdBanner';

type AdminUserData = Credential & Omit<UserActivityStat, 'username'>;
type SortableKeys = 'username' | 'queryCount' | 'lastLogin' | 'fullName';
type Tab = 'users' | 'details';

interface AdminScreenProps {
  onLogout: () => void;
}

// Job Titles List
const JOB_TITLES = [
    "Ölçüm ve Tahakkuk Şefi",
    "Tahakkuk Yetkilisi",
    "İş Emri Takip Yetkilisi",
    "Ekip Lideri",
    "Sayaç Okuma Hizmetleri Görevlisi",
    "Acil",
    "İşletme Görevlisi"
];

// Icon for Customer Count
const DatabaseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
);

const ContactlessIcon = () => (
    <svg className="h-6 w-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
);

const DownloadIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
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
    
    const now = new Date();
    const diffMins = (now.getTime() - date.getTime()) / (1000 * 60);
    
    // 15 dk içindeyse Online (Yeşil)
    if (diffMins < 15) return 'bg-green-500'; 
    
    // Tarih karşılaştırması için saatleri sıfırla
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const loginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Bugün ise Mavi
    if (loginDay.getTime() === today.getTime()) return 'bg-blue-500';
    
    // Dün ise Turuncu
    if (loginDay.getTime() === yesterday.getTime()) return 'bg-orange-400';

    // Daha eski ise Gri
    return 'bg-gray-400';
};

const getStatusLabel = (dateStr: string | undefined) => {
    const date = parseTRDate(dateStr);
    if (!date) return 'Çevrimdışı';
    
    const now = new Date();
    const diffMins = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffMins < 15) return 'Çevrimiçi';

    // Tarih karşılaştırması
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const loginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (loginDay.getTime() === today.getTime()) return 'Bugün Aktif';
    if (loginDay.getTime() === yesterday.getTime()) return 'Dün Aktifti';

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

const formatCreditCardNumber = (str: string) => {
    const padded = str.padEnd(16, '•'); // Ensure at least 16 chars visual
    return padded.match(/.{1,4}/g)?.join(' ') || str;
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('users');

  // --- States for User Detail View ---
  const [selectedDetailUserUsername, setSelectedDetailUserUsername] = useState<string>('');
  const [userLogs, setUserLogs] = useState<{
      installationNumber: string; 
      timestamp: string;
      called?: boolean;
      smsSent?: boolean;
    }[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // New User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState(''); // New
  const [newTitle, setNewTitle] = useState('');       // New
  const [newPassword, setNewPassword] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSkipDeviceLock, setNewSkipDeviceLock] = useState(false);
  const [newCanViewDetails, setNewCanViewDetails] = useState(false);
  
  // Edit User Form State
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ 
      username: '', 
      password: '', 
      fullName: '', // New
      title: '',    // New
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

  // Fetch logs when selectedDetailUserUsername changes
  useEffect(() => {
      if (activeTab === 'details' && selectedDetailUserUsername) {
          const fetchLogs = async () => {
              setLogsLoading(true);
              try {
                  const logs = await sheetService.getUserLogs(selectedDetailUserUsername);
                  setUserLogs(logs);
                  setIsCardFlipped(false); // Reset flip on user change
              } catch (e) {
                  console.error(e);
              } finally {
                  setLogsLoading(false);
              }
          };
          fetchLogs();
      } else {
          setUserLogs([]);
      }
  }, [selectedDetailUserUsername, activeTab]);

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
            if (sortConfig.key === 'fullName') {
                const aName = a.fullName || a.username;
                const bName = b.fullName || b.username;
                return sortConfig.direction === 'ascending' ? aName.localeCompare(bName) : bName.localeCompare(aName);
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
    const lowerTerm = searchTerm.toLowerCase();
    return sortedUsers.filter(user =>
        String(user.username).toLowerCase().includes(lowerTerm) ||
        String(user.fullName || '').toLowerCase().includes(lowerTerm) ||
        String(user.title || '').toLowerCase().includes(lowerTerm)
    );
  }, [sortedUsers, searchTerm]);

  // Find the user object for the selected detail user
  const selectedDetailUserObj = useMemo(() => {
      return users.find(u => u.username === selectedDetailUserUsername);
  }, [users, selectedDetailUserUsername]);

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
            fullName: newFullName.trim(), // New
            title: newTitle.trim(),       // New
            allowedDeviceId: newDeviceId.trim(),
            skipDeviceLock: newSkipDeviceLock,
            canViewDetails: newCanViewDetails
        });
        setNewUsername('');
        setNewPassword('');
        setNewFullName('');
        setNewTitle('');
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
        if (selectedDetailUserUsername === username) setSelectedDetailUserUsername('');
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
        fullName: String(user.fullName || ''),
        title: String(user.title || ''),
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
            fullName: editForm.fullName.trim(),
            title: editForm.title.trim(),
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

  const downloadLogsAsCSV = () => {
      if (userLogs.length === 0) return;
      
      const headers = ['Tarih', 'Tesisat Numarası', 'Arandı', 'SMS Gönderildi'];
      const csvContent = [
          headers.join(','),
          ...userLogs.map(log => `${log.timestamp},${log.installationNumber},${log.called ? 'Evet' : 'Hayır'},${log.smsSent ? 'Evet' : 'Hayır'}`)
      ].join('\n');
      
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sorgu_gecmisi_${selectedDetailUserUsername}_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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
            {/* ... Existing Stat Cards ... */}
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

            <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl p-6 text-white shadow-lg transform transition-all hover:scale-[1.02]">
                <div className="absolute top-0 left-1/2 -ml-12 -mt-4 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl"></div>
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-amber-100 text-sm font-medium uppercase tracking-wider">Ayın Elemanı</p>
                        <div className="mt-2 flex items-center">
                            {dashboardStats.activeUser ? (
                                <>
                                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center text-lg font-bold mr-3 border-2 border-white/30">
                                        {(dashboardStats.activeUser.fullName && dashboardStats.activeUser.fullName.length > 0) 
                                            ? dashboardStats.activeUser.fullName.substring(0, 1).toUpperCase()
                                            : dashboardStats.activeUser.username.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold leading-tight truncate max-w-[150px]">
                                            {dashboardStats.activeUser.fullName || dashboardStats.activeUser.username}
                                        </h3>
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
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[600px]">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                        activeTab === 'users'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                    Kullanıcı Listesi
                </button>
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                        activeTab === 'details'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                >
                    Personel Detayı
                </button>
            </div>

            {/* Notifications */}
            {error && <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl border border-red-100 dark:border-red-800 flex items-center gap-2 text-sm font-medium">{error}</div>}
            {successMsg && <div className="mx-6 mt-4 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-2 text-sm font-medium">{successMsg}</div>}

            {/* === Tab Content: USER LIST === */}
            {activeTab === 'users' && (
                <>
                    {/* Toolbar */}
                    <div className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
                                <UserGroupIcon />
                            </div>
                            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Personel Yönetimi</h2>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                            <div className="relative w-full sm:w-auto group">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                    <SearchIcon />
                                </div>
                                <input
                                    type="text"
                                    placeholder="İsim veya Sicil No Ara..."
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

                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50/50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th onClick={() => requestSort('fullName')} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex items-center">Kimlik Bilgileri {getSortIndicator('fullName')}</div>
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
                                        <div className="flex items-center">Aktivite {getSortIndicator('queryCount')}</div>
                                    </th>
                                    <th onClick={() => requestSort('lastLogin')} className="px-6 py-4 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer group hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                        <div className="flex items-center">Durum {getSortIndicator('lastLogin')}</div>
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
                                                        {(user.fullName && user.fullName.length > 0) ? user.fullName.substring(0, 1).toUpperCase() : user.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                            {user.fullName || user.username}
                                                        </div>
                                                        <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                                                            {user.username} {user.title ? `• ${user.title}` : ''}
                                                        </div>
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
                                                        {user.lastLogin !== 'Giriş Yapmadı' ? user.lastLogin.split(' ')[0] : '-'}
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

                    {/* Mobile Card View (Existing) */}
                    <div className="md:hidden">
                        {isLoading ? (
                            <div className="p-12 text-center">
                                <div className="inline-block w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                <p className="mt-4 text-gray-500">Yükleniyor...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Kayıt bulunamadı.</div>
                        ) : (
                            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                {filteredUsers.map((user) => {
                                    const statusColor = getStatusColor(user.lastLogin);
                                    const statusLabel = getStatusLabel(user.lastLogin);
                                    
                                    return (
                                        <div key={user.username} className="p-4 bg-white dark:bg-gray-800">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className={`h-10 w-10 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-sm font-bold`}>
                                                        {(user.fullName && user.fullName.length > 0) ? user.fullName.substring(0, 1).toUpperCase() : user.username.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-gray-900 dark:text-white">{user.fullName || user.username}</div>
                                                        <div className="text-xs text-gray-500 font-mono">{user.username}</div>
                                                        {user.title && <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">{user.title}</div>}
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button onClick={() => handleOpenEditModal(user)} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-blue-600">
                                                        <EditIcon />
                                                    </button>
                                                    <button onClick={() => handleDeleteUser(user.username)} className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600">
                                                        <TrashIcon />
                                                    </button>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                    <span className="block text-gray-400 mb-1">Cihaz</span>
                                                    {user.skipDeviceLock ? (
                                                        <span className="text-purple-600 font-bold">Kilitsiz</span>
                                                    ) : user.allowedDeviceId ? (
                                                        <span className="text-green-600 font-bold">Eşleşmiş</span>
                                                    ) : (
                                                        <span className="text-yellow-600 font-bold">Bekliyor</span>
                                                    )}
                                                </div>
                                                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                                                    <span className="block text-gray-400 mb-1">Son Giriş</span>
                                                    <div className="flex items-center gap-1">
                                                        <span className={`w-2 h-2 rounded-full ${statusColor}`}></span>
                                                        {statusLabel}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </>
            )}

            {/* === Tab Content: PERSONNEL DETAIL === */}
            {activeTab === 'details' && (
                <div className="p-6 md:p-8 space-y-8 animate-fade-in">
                    
                    {/* User Selection */}
                    <div className="max-w-md mx-auto text-center">
                        <label className="block text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">İncelenecek Personeli Seçin</label>
                        <select 
                            value={selectedDetailUserUsername}
                            onChange={(e) => setSelectedDetailUserUsername(e.target.value)}
                            className="w-full p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-lg"
                        >
                            <option value="">-- Personel Seçin --</option>
                            {users.map(u => (
                                <option key={u.username} value={u.username}>
                                    {u.fullName ? `${u.fullName} (${u.username})` : u.username}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedDetailUserObj && (
                        <div className="space-y-12">
                            {/* FLIP CARD CONTAINER */}
                            <div className="flex justify-center flex-col items-center">
                                <div 
                                    className="group perspective w-[24rem] h-56 cursor-pointer"
                                    onClick={() => setIsCardFlipped(!isCardFlipped)}
                                >
                                    <div className={`relative w-full h-full duration-700 preserve-3d transition-all ${isCardFlipped ? 'rotate-y-180' : ''}`}>
                                        
                                        {/* --- FRONT FACE --- */}
                                        <div className="absolute w-full h-full backface-hidden rounded-2xl overflow-hidden shadow-2xl border border-gray-700/50">
                                            {/* Background Layer */}
                                            <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-[#1a237e] to-slate-900"></div>
                                            
                                            {/* Pattern Layer */}
                                            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>
                                            
                                            {/* Glow Effects */}
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 translate-x-1/2 -translate-y-1/2"></div>
                                            <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -translate-x-1/2 translate-y-1/2"></div>
                                            
                                            {/* Holographic Sheen */}
                                            <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>

                                            {/* Content Layer */}
                                            <div className="relative h-full flex flex-col justify-between p-6 z-10">
                                                {/* Header: Logo & Title */}
                                                <div className="flex justify-between items-start">
                                                    <img 
                                                        src="https://www.aksadogalgaz.com.tr/img/kurumsal-kimlik/Aksa_Dogalgaz.jpg" 
                                                        alt="Aksa Logo" 
                                                        className="h-8 bg-white rounded-md p-1 shadow-md object-contain"
                                                    />
                                                    <div className="text-right">
                                                        <h3 className="text-xs font-bold text-white/80 tracking-[0.2em] uppercase">Personel Kimlik</h3>
                                                        <p className="text-[10px] text-cyan-300 font-mono tracking-widest opacity-80">AKSA-ID</p>
                                                    </div>
                                                </div>

                                                {/* Middle: Chip & Contactless */}
                                                <div className="flex items-center gap-4 mt-1 pl-1">
                                                    {/* Realistic Gold Chip */}
                                                    <div className="w-12 h-9 rounded-md bg-gradient-to-br from-yellow-200 via-yellow-500 to-yellow-700 shadow-sm border border-yellow-600/50 relative overflow-hidden">
                                                        <div className="absolute inset-0 border-[1px] border-black/20 rounded-md m-[2px]"></div>
                                                        <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-black/20"></div>
                                                        <div className="absolute top-0 bottom-0 left-1/3 w-[1px] bg-black/20"></div>
                                                        <div className="absolute top-0 bottom-0 right-1/3 w-[1px] bg-black/20"></div>
                                                    </div>
                                                    <ContactlessIcon />
                                                </div>

                                                {/* Account Number (Sicil No) - Center */}
                                                <div className="text-lg font-mono text-white/90 tracking-widest font-bold text-center my-1 drop-shadow-md">
                                                    {formatCreditCardNumber(selectedDetailUserObj.username)}
                                                </div>

                                                {/* Bottom: Name & Info */}
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mb-0.5">
                                                            {selectedDetailUserObj.title || 'PERSONEL'}
                                                        </div>
                                                        <div className="text-sm sm:text-base font-mono text-white tracking-widest font-bold uppercase drop-shadow-lg" style={{textShadow: '0 2px 4px rgba(0,0,0,0.8)'}}>
                                                            {selectedDetailUserObj.fullName || selectedDetailUserObj.username}
                                                        </div>
                                                    </div>
                                                    
                                                    <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm shadow-lg border ${selectedDetailUserObj.canViewDetails ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'}`}>
                                                        {selectedDetailUserObj.canViewDetails ? 'TAM YETKİ' : 'KISITLI'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* --- BACK FACE --- */}
                                        <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl overflow-hidden shadow-2xl bg-gray-900 border border-gray-700/50">
                                            {/* Magnetic Strip */}
                                            <div className="w-full h-10 bg-black mt-4"></div>
                                            
                                            <div className="p-6">
                                                 {/* Signature Area & CVV */}
                                                 <div className="flex items-center gap-3 mt-1">
                                                     <div className="flex-grow h-8 bg-white flex items-center px-2">
                                                         <span className="font-handwriting text-gray-600 text-lg transform -rotate-2 select-none" style={{ fontFamily: 'cursive' }}>
                                                            {selectedDetailUserObj.fullName || selectedDetailUserObj.username}
                                                         </span>
                                                     </div>
                                                     <div className="w-10 h-8 bg-white/10 flex items-center justify-center border border-white/20">
                                                         <span className="text-xs text-white font-mono italic">
                                                             {selectedDetailUserObj.username.slice(-3)}
                                                         </span>
                                                     </div>
                                                 </div>

                                                 <div className="flex mt-6 gap-4">
                                                     {/* Mock QR Code */}
                                                     <div className="w-16 h-16 bg-white p-1 rounded-sm">
                                                         <div className="w-full h-full bg-gray-900" style={{ backgroundImage: 'radial-gradient(black 50%, transparent 50%)', backgroundSize: '4px 4px' }}></div>
                                                     </div>
                                                     
                                                     <div className="flex-1 text-[8px] text-gray-400 leading-tight text-justify">
                                                         <p>Bu kart Aksa Doğalgaz Dağıtım A.Ş. personeline aittir. Bulunması halinde lütfen en yakın şubeye teslim ediniz.</p>
                                                         <p className="mt-2 text-white/60">Kart Sahibi: <span className="text-white/80">{selectedDetailUserObj.fullName}</span></p>
                                                         <p className="mt-2 text-blue-400">7/24 Destek Hattı: 444 4 187</p>
                                                     </div>
                                                 </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <p className="mt-4 text-xs text-gray-400 animate-pulse">Kartı çevirmek için üzerine tıklayın</p>
                            </div>

                            {/* Search History Table */}
                            <div className="max-w-3xl mx-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
                                        <span className="w-1 h-6 bg-blue-500 rounded-full mr-2"></span>
                                        Son Yapılan Sorgular (Son 100)
                                    </h3>
                                    
                                    <button 
                                        onClick={downloadLogsAsCSV}
                                        disabled={logsLoading || userLogs.length === 0}
                                        className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Tabloyu Excel (CSV) olarak indir"
                                    >
                                        <DownloadIcon />
                                        Excel İndir
                                    </button>
                                </div>

                                <div className="bg-white dark:bg-gray-800 rounded-xl shadow border border-gray-100 dark:border-gray-700 overflow-hidden">
                                    {logsLoading ? (
                                        <div className="p-8 text-center">
                                            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                            <p className="mt-2 text-sm text-gray-500">Geçmiş yükleniyor...</p>
                                        </div>
                                    ) : userLogs.length === 0 ? (
                                        <div className="p-8 text-center text-gray-500 italic">
                                            Bu personel henüz bir sorgu yapmamış.
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                                            <table className="w-full text-left">
                                                <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                                                    <tr>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tarih</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Tesisat Numarası</th>
                                                        <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Etkileşim</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                    {userLogs.map((log, index) => (
                                                        <tr key={index} className="hover:bg-blue-50/30 dark:hover:bg-gray-700/30 transition-colors">
                                                            <td className="px-6 py-3 text-sm text-gray-600 dark:text-gray-300 font-mono">
                                                                {log.timestamp}
                                                            </td>
                                                            <td className="px-6 py-3 text-sm text-gray-900 dark:text-white font-bold font-mono">
                                                                {log.installationNumber}
                                                            </td>
                                                            <td className="px-6 py-3 text-sm">
                                                                <div className="flex gap-2">
                                                                    {log.called && (
                                                                        <div title="Arandı" className="w-6 h-6 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                                                                             <PhoneIconSolid />
                                                                        </div>
                                                                    )}
                                                                    {log.smsSent && (
                                                                        <div title="Mesaj Atıldı" className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                                             <MessageIcon />
                                                                        </div>
                                                                    )}
                                                                    {!log.called && !log.smsSent && (
                                                                        <span className="text-gray-400 text-xs">-</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
        
        {/* Ad Banner Bottom */}
        <AdBanner />

      {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Yeni Kullanıcı</h2>
                    <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
                  </div>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sicil Numarası</label>
                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" placeholder="Örn: 12345" autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                            <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" placeholder="Ahmet Yılmaz" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ünvan</label>
                            <select 
                                value={newTitle} 
                                onChange={e => setNewTitle(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all appearance-none"
                            >
                                <option value="">Seçiniz</option>
                                {JOB_TITLES.map((title) => (
                                    <option key={title} value={title}>{title}</option>
                                ))}
                            </select>
                        </div>
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6 border-b border-gray-100 dark:border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Düzenle: <span className="text-blue-600">{editingUser.username}</span></h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Sicil Numarası</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                        <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Ünvan</label>
                         <select 
                            value={editForm.title} 
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-all appearance-none"
                        >
                            <option value="">Seçiniz</option>
                            {JOB_TITLES.map((title) => (
                                <option key={title} value={title}>{title}</option>
                            ))}
                        </select>
                    </div>
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
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar {
            width: 8px;
            height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #c1c1c1;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #a8a8a8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-track {
            background: #2d3748;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4a5568;
        }
        /* 3D Flip Utilities */
        .perspective {
            perspective: 1000px;
        }
        .preserve-3d {
            transform-style: preserve-3d;
        }
        .backface-hidden {
            backface-visibility: hidden;
        }
        .rotate-y-180 {
            transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};