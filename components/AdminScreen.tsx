
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat } from '../types';
import { TrashIcon, EditIcon, SearchIcon, RefreshIcon, UserGroupIcon, ChartBarIcon, LightningIcon, PhoneIconSolid, MessageIcon, ClockIcon, DownloadIcon, CounterResetIcon, InfinityIcon } from './icons';
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
    <svg className="h-6 w-6 text-white/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
);

// Helper to check user status based on ISO date string
const getStatusColor = (isoDateStr: string | undefined | null) => {
    if (!isoDateStr) return 'bg-gray-400';
    
    const date = new Date(isoDateStr);
    const now = new Date();
    
    // Check if valid date
    if (isNaN(date.getTime())) return 'bg-gray-400';

    const diffMins = (now.getTime() - date.getTime()) / (1000 * 60);
    
    // 15 dk içindeyse Online (Yeşil)
    if (diffMins < 15) return 'bg-emerald-500 shadow-emerald-500/50 shadow-sm'; 
    
    // Tarih karşılaştırması için saatleri sıfırla
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const loginDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Bugün ise Mavi
    if (loginDay.getTime() === today.getTime()) return 'bg-blue-500';
    
    // Dün ise Turuncu
    if (loginDay.getTime() === yesterday.getTime()) return 'bg-amber-400';

    // Daha eski ise Gri
    return 'bg-gray-400';
};

const getStatusLabel = (isoDateStr: string | undefined | null) => {
    if (!isoDateStr) return 'Çevrimdışı';
    
    const date = new Date(isoDateStr);
    if (isNaN(date.getTime())) return 'Çevrimdışı';

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

// Helper for UI date display
const formatDateDisplay = (isoDateStr: string | undefined | null) => {
    if (!isoDateStr) return 'Giriş Yapmadı';
    try {
        const date = new Date(isoDateStr);
        if (isNaN(date.getTime())) return 'Hatalı Tarih';
        return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
        return 'Giriş Yapmadı';
    }
};

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [totalCustomers, setTotalCustomers] = useState<number>(0);
  const [topQueries, setTopQueries] = useState<{installationNumber: string, count: number}[]>([]);
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
  const [newFullName, setNewFullName] = useState(''); 
  const [newTitle, setNewTitle] = useState('');       
  const [newPassword, setNewPassword] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newSkipDeviceLock, setNewSkipDeviceLock] = useState(false);
  const [newCanViewDetails, setNewCanViewDetails] = useState(false);
  const [newUnlimitedAccess, setNewUnlimitedAccess] = useState(false); // Yeni State
  
  // Edit User Form State
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ 
      username: '', 
      password: '', 
      fullName: '', 
      title: '',    
      allowedDeviceId: '',
      skipDeviceLock: false,
      canViewDetails: false,
      unlimitedAccess: false // Yeni State
  });
  
  const [showPasswords, setShowPasswords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'lastLogin', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    setError('');
    try {
      const [creds, stats, customerCount, trends] = await Promise.all([
        sheetService.getCredentials(),
        sheetService.getUserActivityStats(),
        sheetService.getTotalCustomerCount(),
        sheetService.getTopQueriedInstallations(10) // Top 10 queries
      ]);

      setTotalCustomers(customerCount);
      setTopQueries(trends);

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
        lastLogin: statsMap.get(String(cred.username))?.lastLogin, // ISO String or undefined
      }));

      setUsers(mergedData);

    } catch (err: any) {
      setError(err.message || 'Veri yüklenirken bir hata oluştu.');
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  const fetchLogs = useCallback(async () => {
      if (!selectedDetailUserUsername) return;
      setLogsLoading(true);
      try {
          const logs = await sheetService.getUserLogs(selectedDetailUserUsername);
          setUserLogs(logs);
      } catch (e) {
          console.error(e);
      } finally {
          setLogsLoading(false);
      }
  }, [selectedDetailUserUsername]);

  useEffect(() => {
    fetchData(true); // İlk yüklemede loading göster
    // İstatistikleri arka planda sessizce yenile (30 saniyede bir)
    const interval = setInterval(() => {
        fetchData(false); // Loading gösterme (Silent Refresh)
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Fetch logs when selectedDetailUserUsername changes
  useEffect(() => {
      if (activeTab === 'details' && selectedDetailUserUsername) {
          fetchLogs();
          setIsCardFlipped(false); // Reset flip on user change
      } else {
          setUserLogs([]);
      }
  }, [selectedDetailUserUsername, activeTab, fetchLogs]);

  const handleRefresh = () => {
      fetchData(true); // Manuel yenilemede loading göster
      if (activeTab === 'details') fetchLogs();
  };

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
                const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
                const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
                return sortConfig.direction === 'ascending' ? aTime - bTime : bTime - aTime;
            }
            if (sortConfig.key === 'fullName') {
                const aName = a.fullName || a.username;
                const bName = b.fullName || b.username;
                return sortConfig.direction === 'ascending' ? aName.localeCompare(bName) : bName.localeCompare(aName);
            }
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            if ((aValue ?? '') < (bValue ?? '')) return sortConfig.direction === 'ascending' ? -1 : 1;
            if ((aValue ?? '') > (bValue ?? '')) return sortConfig.direction === 'ascending' ? 1 : -1;
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
            fullName: newFullName.trim(), 
            title: newTitle.trim(),       
            allowedDeviceId: newDeviceId.trim(),
            skipDeviceLock: newSkipDeviceLock,
            canViewDetails: newCanViewDetails,
            unlimitedAccess: newUnlimitedAccess
        });
        setNewUsername('');
        setNewPassword('');
        setNewFullName('');
        setNewTitle('');
        setNewDeviceId('');
        setNewSkipDeviceLock(false);
        setNewCanViewDetails(false);
        setNewUnlimitedAccess(false);
        setIsAddModalOpen(false);
        setSuccessMsg('Kullanıcı başarıyla eklendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData(true);
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
        await fetchData(true);
        if (selectedDetailUserUsername === username) setSelectedDetailUserUsername('');
      } catch (err: any) {
        setError(err.message || 'Kullanıcı silinemedi.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleResetStats = async (username: string) => {
    if (window.confirm(`'${username}' kullanıcısının tüm sorgu geçmişini silmek ve sorgulama sayacını SIFIRLAMAK istediğinize emin misiniz?`)) {
        try {
            setIsLoading(true);
            setError('');
            await sheetService.resetUserStats(username);
            setSuccessMsg('Sorgulama sayısı sıfırlandı.');
            setTimeout(() => setSuccessMsg(''), 3000);
            await fetchData(true);
            // Eğer detay sekmesindeyse orayı da yenile
            if (selectedDetailUserUsername === username && activeTab === 'details') {
                fetchLogs();
            }
        } catch (err: any) {
            setError(err.message || 'Sıfırlama işlemi başarısız.');
        } finally {
            setIsLoading(false);
        }
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

  const handleOpenEditModal = (user: AdminUserData) => {
    setEditingUser(user);
    setEditForm({ 
        username: String(user.username), 
        password: String(user.password),
        fullName: String(user.fullName || ''),
        title: String(user.title || ''),
        allowedDeviceId: String(user.allowedDeviceId || ''),
        skipDeviceLock: user.skipDeviceLock || false,
        canViewDetails: user.canViewDetails || false,
        unlimitedAccess: user.unlimitedAccess || false
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
            canViewDetails: editForm.canViewDetails,
            unlimitedAccess: editForm.unlimitedAccess
        });
        setIsEditModalOpen(false);
        setEditingUser(null);
        setSuccessMsg('Kullanıcı güncellendi.');
        setTimeout(() => setSuccessMsg(''), 3000);
        await fetchData(true);
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-screen font-sans">
        
        {/* Header */}
        <div className="sticky top-0 z-30 bg-white/70 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-20">
                    <div className="flex items-center gap-4">
                         <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-500/30">
                            <ChartBarIcon />
                         </div>
                         <div>
                            <h1 className="text-2xl font-black text-gray-900 dark:text-white leading-none tracking-tight">Yönetim Paneli</h1>
                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase tracking-widest mt-1">Sistem Kontrol & İzleme</p>
                         </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={handleRefresh} 
                            disabled={isLoading}
                            className={`p-2.5 rounded-xl text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-300 dark:hover:bg-gray-700 transition-all border border-transparent hover:border-blue-100 ${isLoading ? 'animate-spin' : ''}`}
                            title="Yenile"
                        >
                             <RefreshIcon />
                        </button>
                        <button 
                            onClick={onLogout}
                            className="flex items-center gap-2 px-5 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 rounded-xl transition-all text-sm font-bold border border-red-100 dark:border-red-800 shadow-sm hover:shadow"
                        >
                            <span className="hidden sm:inline">Güvenli Çıkış</span>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
            
            {/* Visual Stats Grid - Larger Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Card 1 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-cyan-400 relative overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 text-cyan-600">
                        <DatabaseIcon />
                    </div>
                    <div className="flex flex-col h-full justify-between">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Tesisat</div>
                        <div className="mt-2">
                            <h3 className="text-3xl font-black text-gray-900 dark:text-white">{totalCustomers.toLocaleString()}</h3>
                            <div className="mt-2 flex items-center text-xs font-bold text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20 dark:text-cyan-300 w-fit px-2.5 py-1 rounded-lg">
                                Veritabanı Aktif
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-emerald-400 relative overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 text-emerald-600">
                        <UserGroupIcon />
                    </div>
                     <div className="flex flex-col h-full justify-between">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Personel Durumu</div>
                        <div className="mt-2">
                             <div className="flex items-baseline gap-2">
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white">{dashboardStats.totalUsers}</h3>
                                <span className="text-sm font-medium text-gray-400">Kayıtlı</span>
                             </div>
                            <div className="mt-2 flex items-center gap-2 text-xs font-bold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-lg w-fit">
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                                {dashboardStats.onlineCount} Çevrimiçi
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 3 */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 border-b-4 border-b-blue-400 relative overflow-hidden group hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                     <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity transform group-hover:scale-110 duration-500 text-blue-600">
                        <SearchIcon />
                    </div>
                     <div className="flex flex-col h-full justify-between">
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">Toplam Sorgu</div>
                        <div className="mt-2">
                             <h3 className="text-3xl font-black text-gray-900 dark:text-white">{dashboardStats.totalQueries.toLocaleString()}</h3>
                             <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mt-3 overflow-hidden">
                                 <div className="bg-blue-500 h-1.5 rounded-full" style={{width: '65%'}}></div>
                            </div>
                        </div>
                    </div>
                </div>

                 {/* Card 4 - Highlight */}
                 <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-purple-800 rounded-2xl p-6 shadow-lg shadow-indigo-500/20 text-white relative overflow-hidden group hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                    <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"></div>
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div className="flex justify-between items-start">
                             <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider">Ayın Personeli</p>
                             <LightningIcon />
                        </div>
                        <div className="mt-4">
                            {dashboardStats.activeUser ? (
                                <div>
                                    <h3 className="text-xl font-bold truncate tracking-tight">{dashboardStats.activeUser.fullName || dashboardStats.activeUser.username}</h3>
                                    <p className="text-3xl font-black mt-1">{dashboardStats.activeUser.queryCount} <span className="text-sm font-normal opacity-70 align-middle">İşlem</span></p>
                                </div>
                            ) : (
                                <h3 className="text-xl font-bold">Veri Yok</h3>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* --- LAYOUT SPLIT: Main Content (Left) & Sidebar (Right) --- */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
                
                {/* LEFT COLUMN: User List & Details (Main Content) */}
                <div className="flex-grow w-full xl:w-auto bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col min-h-[600px]">
                    
                    {/* Tabs */}
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all border-b-4 ${
                                activeTab === 'users'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                            }`}
                        >
                            Kullanıcı Listesi
                        </button>
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`flex-1 py-5 text-sm font-bold uppercase tracking-widest transition-all border-b-4 ${
                                activeTab === 'details'
                                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10'
                                    : 'border-transparent text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                            }`}
                        >
                            Personel Detay & Loglar
                        </button>
                    </div>

                    {/* Notifications */}
                    {error && (
                        <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-xl border border-red-100 dark:border-red-800 flex items-start gap-3 shadow-sm font-medium animate-pulse">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="break-all">{error}</div>
                        </div>
                    )}
                    {successMsg && <div className="mx-8 mt-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-xl border border-green-100 dark:border-green-800 flex items-center gap-3 shadow-sm font-medium">{successMsg}</div>}

                    {/* TAB CONTENT: USERS */}
                    {activeTab === 'users' && (
                        <div className="animate-fade-in">
                            {/* Toolbar */}
                            <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/30 dark:bg-gray-800/50">
                                <div className="relative w-full sm:w-96 group">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500 transition-colors">
                                        <SearchIcon />
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="İsim, sicil no veya ünvan ara..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900 focus:border-blue-500 w-full transition-all shadow-sm font-medium"
                                    />
                                </div>
                                <button 
                                    onClick={() => setIsAddModalOpen(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center whitespace-nowrap w-full sm:w-auto justify-center"
                                >
                                    <span className="mr-2 text-xl leading-none">+</span> Yeni Kullanıcı Ekle
                                </button>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50/80 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 text-xs uppercase font-bold tracking-wider">
                                        <tr>
                                            <th onClick={() => requestSort('fullName')} className="px-8 py-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="flex items-center">Personel {getSortIndicator('fullName')}</div>
                                            </th>
                                            <th className="px-6 py-5">Şifre</th>
                                            <th className="px-6 py-5 text-center">Yetkiler</th>
                                            <th onClick={() => requestSort('queryCount')} className="px-6 py-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="flex items-center">Aktivite {getSortIndicator('queryCount')}</div>
                                            </th>
                                            <th onClick={() => requestSort('lastLogin')} className="px-6 py-5 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                                <div className="flex items-center">Durum {getSortIndicator('lastLogin')}</div>
                                            </th>
                                            <th className="px-8 py-5 text-right">İşlem</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {isLoading ? (
                                            <tr><td colSpan={6} className="p-12 text-center text-gray-500">Veriler Yükleniyor...</td></tr>
                                        ) : filteredUsers.length === 0 ? (
                                            <tr><td colSpan={6} className="p-12 text-center text-gray-500 italic">Kayıt bulunamadı.</td></tr>
                                        ) : (
                                            filteredUsers.map((user) => {
                                                const statusColor = getStatusColor(user.lastLogin);
                                                const statusLabel = getStatusLabel(user.lastLogin);
                                                return (
                                                <tr key={user.username} className="group hover:bg-blue-50/40 dark:hover:bg-gray-700/40 transition-colors">
                                                    <td className="px-8 py-4">
                                                        <div className="flex items-center">
                                                            <div className={`flex-shrink-0 h-11 w-11 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-sm font-bold shadow-md ring-2 ring-white dark:ring-gray-800`}>
                                                                {(user.fullName || user.username).substring(0, 1).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                                    {user.fullName || user.username}
                                                                    {user.unlimitedAccess && <span className="text-purple-600 bg-purple-50 dark:bg-purple-900/30 rounded-full p-0.5" title="7/24 Erişim"><InfinityIcon /></span>}
                                                                </div>
                                                                <div className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">{user.username}</div>
                                                                <div className="text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">{user.title}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-2 group/pass">
                                                            <span className="text-xs font-mono bg-gray-100 dark:bg-gray-700 px-2.5 py-1.5 rounded-lg text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">
                                                                {showPasswords ? user.password : '••••••'}
                                                            </span>
                                                            <input type="checkbox" checked={showPasswords} onChange={e => setShowPasswords(e.target.checked)} className="h-4 w-4 accent-blue-600 rounded cursor-pointer opacity-0 group-hover/pass:opacity-100 transition-opacity" title="Göster" />
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex justify-center gap-1">
                                                            {user.skipDeviceLock ? (
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-300" title="Cihaz Kısıtlaması Yok"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg></span>
                                                            ) : user.allowedDeviceId ? (
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-300" title="Eşleşmiş Cihaz"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></span>
                                                            ) : (
                                                                <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300" title="Cihaz Bekleniyor"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span>
                                                            )}
                                                            {user.canViewDetails && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300" title="Tam İsim Görebilir">👁️</span>}
                                                            {user.unlimitedAccess && <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300" title="Zaman Kısıtlaması Yok">∞</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">{user.queryCount}</span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col">
                                                            <div className="flex items-center mb-1">
                                                                <span className={`w-2.5 h-2.5 rounded-full ${statusColor} mr-2.5 ring-2 ring-white dark:ring-gray-800`}></span>
                                                                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{statusLabel}</span>
                                                            </div>
                                                            <span className="text-[10px] text-gray-400 font-medium pl-5">{formatDateDisplay(user.lastLogin)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                                                            <button onClick={() => handleResetStats(user.username)} className="p-2 text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors" title="Sayacı Sıfırla"><CounterResetIcon /></button>
                                                            <button onClick={() => handleOpenEditModal(user)} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors" title="Düzenle"><EditIcon /></button>
                                                            <button onClick={() => handleDeleteUser(user.username)} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors" title="Sil"><TrashIcon /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )})
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile List */}
                            <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                                    {filteredUsers.map((user) => (
                                    <div key={user.username} className="p-5 flex flex-col gap-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className={`h-12 w-12 rounded-full ${getAvatarColor(user.username)} flex items-center justify-center text-base font-bold shadow-sm`}>
                                                {(user.fullName || user.username).substring(0, 1).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                    {user.fullName || user.username}
                                                    {user.unlimitedAccess && <span className="text-purple-600 bg-purple-50 dark:bg-purple-900/30 rounded-full p-0.5"><InfinityIcon /></span>}
                                                </div>
                                                <div className="text-xs text-gray-500 font-medium">{user.queryCount} İşlem • {getStatusLabel(user.lastLogin)}</div>
                                                <div className="text-[10px] text-gray-400 mt-0.5">{formatDateDisplay(user.lastLogin)}</div>
                                            </div>
                                        </div>
                                        <div className="flex justify-end gap-2">
                                             <button onClick={() => handleResetStats(user.username)} className="text-orange-600 text-xs font-bold px-4 py-2 bg-orange-50 rounded-lg flex items-center"><span className="mr-1"><CounterResetIcon /></span> Sıfırla</button>
                                             <button onClick={() => handleOpenEditModal(user)} className="text-blue-600 text-xs font-bold px-4 py-2 bg-blue-50 rounded-lg">Düzenle</button>
                                        </div>
                                    </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* TAB CONTENT: DETAILS */}
                    {activeTab === 'details' && (
                            <div className="p-8 md:p-12 space-y-12 animate-fade-in flex flex-col items-center justify-center">
                            {/* User Selection */}
                            <div className="w-full max-w-lg">
                                <label className="block text-xs font-bold text-gray-400 mb-3 uppercase tracking-widest text-center">Görüntülenecek Personeli Seçin</label>
                                <div className="relative">
                                    <select 
                                        value={selectedDetailUserUsername}
                                        onChange={(e) => setSelectedDetailUserUsername(e.target.value)}
                                        className="w-full p-4 pl-6 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none text-lg font-medium appearance-none shadow-sm cursor-pointer"
                                    >
                                        <option value="">-- Personel Listesinden Seçiniz --</option>
                                        {users.map(u => (
                                            <option key={u.username} value={u.username}>{u.fullName ? `${u.fullName}` : u.username} ({u.username})</option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500">
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                    </div>
                                </div>
                            </div>

                            {selectedDetailUserObj && (
                                <div className="w-full max-w-4xl flex flex-col md:flex-row gap-12 items-start">
                                        {/* VISUAL 3D CARD */}
                                    <div className="flex-shrink-0 mx-auto md:mx-0">
                                        <div className="group perspective w-80 h-52 cursor-pointer" onClick={() => setIsCardFlipped(!isCardFlipped)}>
                                            <div className={`relative w-full h-full duration-700 preserve-3d transition-all ${isCardFlipped ? 'rotate-y-180' : ''}`}>
                                                {/* Front */}
                                                <div className="absolute w-full h-full backface-hidden rounded-2xl bg-gradient-to-br from-slate-800 to-black text-white p-6 shadow-2xl border border-slate-700 flex flex-col justify-between">
                                                    <div className="flex justify-between items-start">
                                                        <div className="text-xs font-mono text-slate-400 tracking-widest">AKSA PERSONEL ID</div>
                                                        <ContactlessIcon />
                                                    </div>
                                                    <div className="text-center font-mono text-2xl tracking-widest font-bold text-slate-200 drop-shadow-lg mt-2">
                                                        {formatCreditCardNumber(selectedDetailUserObj.username)}
                                                    </div>
                                                    <div className="flex justify-between items-end">
                                                        <div>
                                                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">{selectedDetailUserObj.title || 'SAHA PERSONELİ'}</div>
                                                            <div className="font-bold text-sm uppercase tracking-wide">{selectedDetailUserObj.fullName || selectedDetailUserObj.username}</div>
                                                        </div>
                                                        <div className="flex flex-col gap-1 items-end">
                                                            <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide border ${selectedDetailUserObj.canViewDetails ? 'bg-green-900/40 text-green-400 border-green-800' : 'bg-yellow-900/40 text-yellow-400 border-yellow-800'}`}>
                                                                {selectedDetailUserObj.canViewDetails ? 'TAM YETKİ' : 'KISITLI'}
                                                            </div>
                                                            {selectedDetailUserObj.unlimitedAccess && (
                                                                <div className="text-[10px] px-2 py-1 rounded font-bold uppercase tracking-wide border bg-purple-900/40 text-purple-400 border-purple-800 flex items-center gap-1">
                                                                    <InfinityIcon /> 7/24
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* Back */}
                                                <div className="absolute w-full h-full backface-hidden rotate-y-180 rounded-2xl bg-slate-800 text-white p-6 shadow-2xl border border-slate-700 flex flex-col items-center justify-center">
                                                    <div className="w-full h-10 bg-black -mx-6 mb-4 absolute top-6"></div>
                                                    <div className="mt-8 text-center">
                                                        <p className="text-xs text-slate-400 mb-2">Güvenlik Kodu</p>
                                                        <p className="font-mono text-lg bg-white text-black px-2 rounded">CVV: ***</p>
                                                    </div>
                                                    <p className="text-[10px] text-slate-500 mt-auto text-center w-full">Bu kart Aksa Doğalgaz personeline aittir. İzinsiz kullanımı yasaktır.</p>
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-center text-xs text-gray-400 mt-4 animate-bounce">Kartı çevirmek için tıklayın</p>
                                    </div>

                                    {/* LOG TABLE */}
                                    <div className="flex-grow w-full">
                                        <div className="flex justify-between items-center mb-5">
                                            <h3 className="font-bold text-xl text-gray-800 dark:text-white flex items-center">
                                                <span className="w-2 h-6 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></span>
                                                Son İşlem Geçmişi
                                            </h3>
                                            <button onClick={downloadLogsAsCSV} disabled={userLogs.length === 0} className="text-xs font-bold text-blue-600 bg-blue-50 px-4 py-2 rounded-lg hover:bg-blue-100 disabled:opacity-50 transition-colors flex items-center shadow-sm">
                                                <DownloadIcon /> <span className="ml-1">Excel/CSV İndir</span>
                                            </button>
                                        </div>
                                        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
                                            <div className="overflow-y-auto max-h-[350px] custom-scrollbar">
                                                    <table className="w-full text-left text-sm">
                                                    <thead className="bg-gray-50 dark:bg-gray-900 sticky top-0 z-10 shadow-sm">
                                                        <tr>
                                                            <th className="px-5 py-3 font-bold text-gray-500 uppercase text-xs">Tarih / Saat</th>
                                                            <th className="px-5 py-3 font-bold text-gray-500 uppercase text-xs">Sorgulanan Tesisat</th>
                                                            <th className="px-5 py-3 font-bold text-gray-500 uppercase text-xs">Aksiyon</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                                        {logsLoading ? (
                                                            <tr><td colSpan={3} className="p-8 text-center text-gray-400">Yükleniyor...</td></tr>
                                                        ) : userLogs.length === 0 ? (
                                                            <tr><td colSpan={3} className="p-8 text-center text-gray-400">Bu kullanıcı henüz işlem yapmadı.</td></tr>
                                                        ) : (
                                                            userLogs.map((log, i) => (
                                                            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                <td className="px-5 py-3 font-mono text-gray-600 dark:text-gray-300 text-xs">{log.timestamp}</td>
                                                                <td className="px-5 py-3 font-bold text-gray-800 dark:text-white">{log.installationNumber}</td>
                                                                <td className="px-5 py-3">
                                                                    <div className="flex gap-2">
                                                                        {log.called && <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200 dark:border-green-800 flex items-center gap-1"><PhoneIconSolid /> Aradı</span>}
                                                                        {log.smsSent && <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold border border-indigo-200 dark:border-indigo-800 flex items-center gap-1"><MessageIcon /> SMS</span>}
                                                                        {!log.called && !log.smsSent && <span className="text-gray-300 text-xs">-</span>}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )))}
                                                    </tbody>
                                                    </table>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                            </div>
                    )}
                </div>

                {/* RIGHT COLUMN: Sidebar (Trend Analysis) */}
                <div className="w-full xl:w-80 flex-shrink-0 space-y-6 animate-fade-in order-first xl:order-last">
                     <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm sticky top-24">
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white">Trend Analizi</h3>
                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mt-0.5">En Çok Sorgulananlar</p>
                            </div>
                            <div className="bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-2 rounded-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                        </div>

                        {topQueries.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 italic text-sm bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-200 dark:border-gray-600">
                                Yeterli veri bulunamadı.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {topQueries.map((item, index) => {
                                    // Ranking Styling Logic
                                    let badgeStyle = "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800";
                                    let rowStyle = "bg-white hover:bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:hover:bg-gray-700 dark:border-gray-600";
                                    let icon = null;

                                    if (index === 0) { // Gold
                                        badgeStyle = "bg-yellow-100 text-yellow-700 border-yellow-200 ring-2 ring-yellow-400/50 shadow-sm";
                                        rowStyle = "bg-gradient-to-r from-yellow-50 to-white border-yellow-200 dark:from-yellow-900/20 dark:to-gray-800 dark:border-yellow-800 shadow-sm";
                                        icon = "👑";
                                    } else if (index === 1) { // Silver
                                        badgeStyle = "bg-gray-100 text-gray-700 border-gray-200 ring-2 ring-gray-300/50 shadow-sm";
                                        rowStyle = "bg-gradient-to-r from-gray-50 to-white border-gray-200 dark:from-gray-800 dark:to-gray-800 dark:border-gray-600";
                                        icon = "🥈";
                                    } else if (index === 2) { // Bronze
                                        badgeStyle = "bg-orange-100 text-orange-800 border-orange-200 ring-2 ring-orange-300/50 shadow-sm";
                                        rowStyle = "bg-gradient-to-r from-orange-50 to-white border-orange-200 dark:from-orange-900/20 dark:to-gray-800 dark:border-orange-800";
                                        icon = "🥉";
                                    }

                                    return (
                                        <div key={item.installationNumber} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${rowStyle}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border ${badgeStyle}`}>
                                                    {icon || index + 1}
                                                </div>
                                                <span className="font-mono font-bold text-gray-800 dark:text-gray-200 text-sm tracking-tight">{item.installationNumber}</span>
                                            </div>
                                            <div className="text-[10px] font-bold uppercase text-gray-500 bg-white/50 dark:bg-black/20 px-2 py-1 rounded">
                                                {item.count} Sorgu
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                     </div>
                     
                     <AdBanner />
                </div>
            </div>
            
        </div>

        {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md transform transition-all scale-100 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Yeni Kullanıcı</h2>
                        <p className="text-xs text-gray-500 mt-1">Sisteme yeni bir personel ekleyin.</p>
                    </div>
                    <button onClick={() => setIsAddModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">✕</button>
                  </div>
                  <form onSubmit={handleAddUser} className="space-y-5">
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Sicil Numarası</label>
                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all font-bold" placeholder="Örn: 12345" autoFocus />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Ad Soyad</label>
                            <input type="text" value={newFullName} onChange={e => setNewFullName(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all" placeholder="İsim Soyisim" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Ünvan</label>
                            <select 
                                value={newTitle} 
                                onChange={e => setNewTitle(e.target.value)} 
                                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all appearance-none"
                            >
                                <option value="">Seçiniz</option>
                                {JOB_TITLES.map((title) => (
                                    <option key={title} value={title}>{title}</option>
                                ))}
                            </select>
                        </div>
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Şifre</label>
                          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all" placeholder="Güçlü bir şifre" />
                      </div>
                      
                      {/* Checkboxes */}
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-2xl space-y-4 border border-blue-100 dark:border-blue-800">
                          <label className="flex items-center cursor-pointer group">
                              <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={newSkipDeviceLock}
                                    onChange={e => setNewSkipDeviceLock(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-blue-300 shadow transition-all checked:border-blue-600 checked:bg-blue-600 hover:shadow-md" 
                                />
                                <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </span>
                              </div>
                              <div className="ml-3 select-none">
                                  <span className="block text-sm font-bold text-gray-800 dark:text-white group-hover:text-blue-700 transition-colors">Cihaz Kilidini Kaldır</span>
                                  <span className="block text-xs text-gray-500 mt-0.5">Herhangi bir cihazdan giriş yapabilir.</span>
                              </div>
                          </label>

                          <label className="flex items-center cursor-pointer group">
                               <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={newCanViewDetails}
                                    onChange={e => setNewCanViewDetails(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-blue-300 shadow transition-all checked:border-blue-600 checked:bg-blue-600 hover:shadow-md" 
                                />
                                <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </span>
                              </div>
                              <div className="ml-3 select-none">
                                  <span className="block text-sm font-bold text-gray-800 dark:text-white group-hover:text-blue-700 transition-colors">Tam İsim Görebilir</span>
                                  <span className="block text-xs text-gray-500 mt-0.5">Abone isimleri maskelenmez.</span>
                              </div>
                          </label>

                          <label className="flex items-center cursor-pointer group">
                               <div className="relative flex items-center">
                                <input 
                                    type="checkbox" 
                                    checked={newUnlimitedAccess}
                                    onChange={e => setNewUnlimitedAccess(e.target.checked)}
                                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-purple-300 shadow transition-all checked:border-purple-600 checked:bg-purple-600 hover:shadow-md" 
                                />
                                <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                </span>
                              </div>
                              <div className="ml-3 select-none">
                                  <span className="block text-sm font-bold text-gray-800 dark:text-white group-hover:text-purple-600 transition-colors">Süre Kısıtlaması Yok</span>
                                  <span className="block text-xs text-gray-500 mt-0.5">7/24 Erişim (Mesai saatleri kontrol edilmez).</span>
                              </div>
                          </label>
                      </div>

                      <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-bold text-sm">İptal</button>
                          <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors shadow-lg shadow-blue-500/30 font-bold text-sm disabled:opacity-50 flex items-center">
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
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 dark:border-gray-700 pb-4">
                <div>
                    <h2 className="text-2xl font-black text-gray-800 dark:text-white">Kullanıcı Düzenle</h2>
                    <p className="text-blue-600 font-mono font-bold mt-1">{editingUser.username}</p>
                </div>
                <button onClick={() => setIsEditModalOpen(false)} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-full transition-colors">✕</button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-5">
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Sicil Numarası</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Ad Soyad</label>
                        <input type="text" value={editForm.fullName} onChange={e => setEditForm({...editForm, fullName: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Ünvan</label>
                         <select 
                            value={editForm.title} 
                            onChange={e => setEditForm({...editForm, title: e.target.value})}
                            className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all appearance-none"
                        >
                            <option value="">Seçiniz</option>
                            {JOB_TITLES.map((title) => (
                                <option key={title} value={title}>{title}</option>
                            ))}
                        </select>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Şifre</label>
                    <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-all" />
                </div>
                
                 {/* Checkboxes for Edit */}
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-2xl space-y-4 border border-gray-200 dark:border-gray-700">
                     <label className="flex items-center cursor-pointer group">
                        <div className="relative flex items-center">
                            <input 
                            type="checkbox" 
                            checked={editForm.skipDeviceLock}
                            onChange={e => setEditForm({...editForm, skipDeviceLock: e.target.checked})}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow transition-all checked:border-blue-600 checked:bg-blue-600 hover:shadow-md" 
                            />
                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </span>
                        </div>
                         <div className="ml-3 select-none">
                             <span className="block text-sm font-bold text-gray-800 dark:text-white">Cihaz Kilidini Devre Dışı Bırak</span>
                         </div>
                     </label>

                     <label className="flex items-center cursor-pointer group">
                         <div className="relative flex items-center">
                            <input 
                            type="checkbox" 
                            checked={editForm.canViewDetails}
                            onChange={e => setEditForm({...editForm, canViewDetails: e.target.checked})}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-gray-300 shadow transition-all checked:border-blue-600 checked:bg-blue-600 hover:shadow-md" 
                            />
                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </span>
                        </div>
                         <div className="ml-3 select-none">
                             <span className="block text-sm font-bold text-gray-800 dark:text-white">Tam İsim Görebilir</span>
                         </div>
                     </label>

                     <label className="flex items-center cursor-pointer group">
                         <div className="relative flex items-center">
                            <input 
                            type="checkbox" 
                            checked={editForm.unlimitedAccess}
                            onChange={e => setEditForm({...editForm, unlimitedAccess: e.target.checked})}
                            className="peer h-5 w-5 cursor-pointer appearance-none rounded border border-purple-300 shadow transition-all checked:border-purple-600 checked:bg-purple-600 hover:shadow-md" 
                            />
                            <span className="absolute text-white opacity-0 peer-checked:opacity-100 top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                            </span>
                        </div>
                         <div className="ml-3 select-none">
                             <span className="block text-sm font-bold text-gray-800 dark:text-white group-hover:text-purple-400 transition-colors">Süre Kısıtlaması Yok</span>
                         </div>
                     </label>
                 </div>

                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Kayıtlı Cihaz ID</label>
                    <div className="flex gap-2">
                        <input type="text" value={editForm.allowedDeviceId} onChange={e => setEditForm({...editForm, allowedDeviceId: e.target.value})} className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 dark:bg-gray-700 dark:text-white font-mono text-sm" />
                        <button type="button" onClick={() => setEditForm({...editForm, allowedDeviceId: ''})} className="px-5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-500 whitespace-nowrap">SIFIRLA</button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-gray-100 dark:border-gray-700">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-6 py-3 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-bold text-sm">İptal</button>
                    <button type="submit" disabled={isSubmitting} className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl transition-colors shadow-lg shadow-green-500/30 font-bold text-sm disabled:opacity-50">
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
            background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
        }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #475569;
        }
        .perspective { perspective: 1000px; }
        .preserve-3d { transform-style: preserve-3d; }
        .backface-hidden { backface-visibility: hidden; }
        .rotate-y-180 { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
};
