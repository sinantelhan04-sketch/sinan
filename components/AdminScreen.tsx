import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat } from '../types';
import { TrashIcon, EditIcon, SearchIcon, RefreshIcon, UserGroupIcon, ChartBarIcon, LightningIcon } from './icons';

type AdminUserData = Credential & Omit<UserActivityStat, 'username'>;
type SortableKeys = 'username' | 'queryCount' | 'lastLogin';

interface AdminScreenProps {
  onLogout: () => void;
}

export const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Forms
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDeviceId, setNewDeviceId] = useState('');
  
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '', allowedDeviceId: '' });
  
  const [showPasswords, setShowPasswords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'lastLogin', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const [creds, stats] = await Promise.all([
        sheetService.getCredentials(),
        sheetService.getUserActivityStats(),
      ]);

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

  // Dashboard İstatistikleri
  const dashboardStats = useMemo(() => {
      const totalUsers = users.length;
      const totalQueries = users.reduce((acc, user) => acc + user.queryCount, 0);
      const activeUser = [...users].sort((a, b) => b.queryCount - a.queryCount)[0];
      
      return { totalUsers, totalQueries, activeUser };
  }, [users]);

  // Sıralama Mantığı
  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            if (sortConfig.key === 'lastLogin') {
                // Tarih formatı "DD.MM.YYYY HH:mm"
                const parseDate = (dateStr: string | number | undefined) => {
                    const s = String(dateStr);
                    if (!s || s === 'Giriş Yapmadı') return 0;
                    try {
                        const [datePart, timePart] = s.split(' ');
                        if (!datePart || !timePart) return 0;
                        const [day, month, year] = datePart.split('.').map(Number);
                        const [hour, minute] = timePart.split(':').map(Number);
                        return new Date(year, month - 1, day, hour, minute).getTime();
                    } catch (e) {
                        return 0;
                    }
                };
                const aTime = parseDate(a.lastLogin);
                const bTime = parseDate(b.lastLogin);
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
    if (sortConfig.key !== key) return <span className="text-gray-300 ml-1">↕</span>;
    return sortConfig.direction === 'ascending' ? ' ▲' : ' ▼';
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
            allowedDeviceId: newDeviceId.trim() 
        });
        setNewUsername('');
        setNewPassword('');
        setNewDeviceId('');
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
              setError(err.message || "Sıfırlama başarısız. Code.gs'yi güncellediğinizden emin olun.");
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
        allowedDeviceId: String(user.allowedDeviceId || '')
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
            allowedDeviceId: String(editForm.allowedDeviceId).trim()
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
    <div className="w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Yönetici Paneli</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Sistem durumunu ve kullanıcıları yönetin</p>
            </div>
            <div className="flex gap-3 mt-4 sm:mt-0">
                <button 
                    onClick={fetchData} 
                    disabled={isLoading}
                    className="flex items-center px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors font-medium"
                >
                    <span className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}>
                         <RefreshIcon />
                    </span>
                    Yenile
                </button>
                <button 
                    onClick={onLogout}
                    className="flex items-center px-4 py-2 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-300 rounded-lg transition-colors font-medium border border-red-200 dark:border-red-800"
                >
                    Çıkış Yap
                </button>
            </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-4">
                    <UserGroupIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Personel</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalUsers}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl mr-4">
                    <ChartBarIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Toplam Sorgu</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{dashboardStats.totalQueries}</p>
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl mr-4">
                    <LightningIcon />
                </div>
                <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">En Aktif Personel</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[150px]" title={dashboardStats.activeUser?.username}>
                        {dashboardStats.activeUser ? dashboardStats.activeUser.username : '-'}
                    </p>
                    {dashboardStats.activeUser && <p className="text-xs text-gray-500">{dashboardStats.activeUser.queryCount} Sorgu</p>}
                </div>
            </div>
        </div>

        {/* Main Content Area */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Kullanıcı Listesi</h2>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                            <SearchIcon />
                        </div>
                        <input
                            type="text"
                            placeholder="Sicil No ile ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-shadow"
                        />
                    </div>
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-95 flex items-center justify-center whitespace-nowrap"
                    >
                        + Yeni Kullanıcı
                    </button>
                </div>
            </div>

            {/* Notifications */}
            {error && <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 rounded-lg border-l-4 border-red-500">{error}</div>}
            {successMsg && <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-200 rounded-lg border-l-4 border-green-500">{successMsg}</div>}

            {/* Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 uppercase text-xs font-semibold tracking-wider">
                        <tr>
                            <th onClick={() => requestSort('username')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                Sicil No {getSortIndicator('username')}
                            </th>
                            <th className="px-6 py-4 flex items-center gap-2">
                                Şifre
                                <input 
                                    type="checkbox" 
                                    checked={showPasswords} 
                                    onChange={(e) => setShowPasswords(e.target.checked)}
                                    className="cursor-pointer h-3 w-3 accent-blue-600"
                                    title="Şifreleri Göster/Gizle"
                                />
                            </th>
                            <th className="px-6 py-4">Cihaz Durumu</th>
                            <th onClick={() => requestSort('queryCount')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center">
                                Sorgu {getSortIndicator('queryCount')}
                            </th>
                            <th onClick={() => requestSort('lastLogin')} className="px-6 py-4 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-center">
                                Son Giriş {getSortIndicator('lastLogin')}
                            </th>
                            <th className="px-6 py-4 text-right">İşlemler</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {isLoading ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <div className="flex justify-center items-center gap-2">
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    </div>
                                    <p className="mt-2 text-sm">Veriler yükleniyor...</p>
                                </td>
                            </tr>
                        ) : filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500 italic">Kayıt bulunamadı.</td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => (
                                <tr key={user.username} className="hover:bg-blue-50/50 dark:hover:bg-gray-700/30 transition-colors group">
                                    <td className="px-6 py-4 font-mono font-medium text-gray-900 dark:text-white">
                                        {user.username}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-gray-500 dark:text-gray-400">
                                        {showPasswords ? (
                                            <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs select-all">{user.password}</span>
                                        ) : '••••••'}
                                    </td>
                                    <td className="px-6 py-4">
                                        {user.allowedDeviceId ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                                                Eşleşmiş
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                                Bekliyor
                                            </span>
                                        )}
                                        {user.allowedDeviceId && <div className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-[100px]">{user.allowedDeviceId.slice(-6)}...</div>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`font-bold ${user.queryCount > 100 ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                            {user.queryCount}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center text-sm text-gray-600 dark:text-gray-400">
                                        {user.lastLogin}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleResetStats(user.username)}
                                                className="p-2 text-gray-500 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded-lg transition-colors"
                                                title="İstatistikleri Sıfırla"
                                            >
                                                <RefreshIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleOpenEditModal(user)}
                                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                                title="Düzenle"
                                            >
                                                <EditIcon />
                                            </button>
                                            <button 
                                                onClick={() => handleDeleteUser(user.username)}
                                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                                title="Sil"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      {/* --- MODALS --- */}

      {/* Add User Modal */}
      {isAddModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsAddModalOpen(false)}>
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                  <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4 border-gray-100 dark:border-gray-700">Yeni Kullanıcı</h2>
                  <form onSubmit={handleAddUser} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sicil Numarası</label>
                          <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Örn: 12345" autoFocus />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="Güçlü bir şifre" />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cihaz ID (Opsiyonel)</label>
                          <input type="text" value={newDeviceId} onChange={e => setNewDeviceId(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs" placeholder="Boş bırakılırsa ilk cihaz kilitlenir" />
                      </div>
                      <div className="flex justify-end gap-3 mt-8">
                          <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">İptal</button>
                          <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-md disabled:opacity-50">
                              {isSubmitting ? 'Ekleniyor...' : 'Kullanıcıyı Ekle'}
                          </button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Edit User Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setIsEditModalOpen(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-white border-b pb-4 border-gray-100 dark:border-gray-700">Düzenle: {editingUser.username}</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sicil Numarası</label>
                    <input type="text" value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Şifre</label>
                    <input type="text" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cihaz ID</label>
                    <div className="flex gap-2">
                        <input type="text" value={editForm.allowedDeviceId} onChange={e => setEditForm({...editForm, allowedDeviceId: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white font-mono text-xs" />
                        <button type="button" onClick={() => setEditForm({...editForm, allowedDeviceId: ''})} className="px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 rounded-lg text-xs font-bold">SIFIRLA</button>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-8">
                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">İptal</button>
                    <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shadow-md disabled:opacity-50">
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