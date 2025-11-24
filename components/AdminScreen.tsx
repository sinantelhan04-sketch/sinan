import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as sheetService from '../services/sheetService';
import type { Credential, UserActivityStat } from '../types';
import { TrashIcon, EditIcon, SearchIcon } from './icons';

type AdminUserData = Credential & Omit<UserActivityStat, 'username'>;
type SortableKeys = 'username' | 'queryCount' | 'lastLogin';

interface AdminScreenProps {
  onLogout: () => void;
}

const AdminScreen: React.FC<AdminScreenProps> = ({ onLogout }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  const [error, setError] = useState('');
  const [dataWarning, setDataWarning] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserData | null>(null);
  const [editForm, setEditForm] = useState({ username: '', password: '' });

  const [showPasswords, setShowPasswords] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'queryCount', direction: 'descending' });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    setDataWarning('');
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

      const allStatsAreZero = mergedData.length > 0 && mergedData.every(u => u.queryCount === 0 && u.lastLogin === 'Giriş Yapmadı');
      if (allStatsAreZero) {
        setDataWarning("Dikkat: Tüm kullanıcı istatistikleri (sorgu sayısı, son giriş) sıfır veya varsayılan olarak görünüyor. Bu durum genellikle Google E-Tablonuzdaki 'Kullanıcılar', 'SorguLogları' ve 'LoginLog' sekmelerindeki sicil numaralarının birbiriyle tam olarak eşleşmemesinden kaynaklanır. Lütfen sicil numaralarının tüm sayfalarda aynı formatta (örneğin, metin ve boşluksuz) olduğundan emin olun.");
      }

    } catch (err: any) {
      let errorMessage = err.message || 'Veri yüklenirken bir hata oluştu.';
      if (errorMessage.includes("sayfa bulunamadı")) {
         if (errorMessage.toLowerCase().includes("'kullanıcılar'")) {
             errorMessage = "Yapılandırma Hatası: Google E-Tablonuzda 'Kullanıcılar' adında bir sayfa bulunamadı. Lütfen kontrol ediniz.";
         } else {
            errorMessage = `Yapılandırma Hatası: Google E-Tablonuzda gerekli bir sayfa (örn: 'SorguLogları' veya 'LoginLog') bulunamadı. Lütfen kontrol edin. Hata: ${errorMessage}`;
         }
      } else if (errorMessage.toLowerCase().includes("bilinmeyen get eylemi")) {
        errorMessage = "Arka Uç Hatası: Google Apps Script'iniz istenen eylemi ('getCredentials' veya 'getUserActivityStats') tanımıyor. Lütfen script'inizi kontrol edin.";
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedUsers = useMemo(() => {
    let sortableItems = [...users];
    if (sortConfig.key) {
        sortableItems.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
    }
    return sortableItems;
  }, [users, sortConfig]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) {
        return sortedUsers;
    }
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
    if (sortConfig.key !== key) return null;
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
        await sheetService.addCredential({ username: newUsername.trim(), password: newPassword.trim() });
        setNewUsername('');
        setNewPassword('');
        await fetchData(); // Refresh data
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
        await fetchData();
      } catch (err: any) {
        setError(err.message || 'Kullanıcı silinemedi.');
      } finally {
        setIsLoading(false);
      }
    }
  };
  
  const handleOpenEditModal = (user: AdminUserData) => {
    setEditingUser(user);
    setEditForm({ username: String(user.username), password: String(user.password) });
    setIsEditModalOpen(true);
    setError('');
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingUser(null);
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
        await sheetService.updateCredential(editingUser.username, {username: finalUsername, password: finalPassword});
        handleCloseEditModal();
        await fetchData();
    } catch (err: any) {
        setError(err.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="w-full max-w-5xl bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative">
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button 
                onClick={fetchData}
                disabled={isLoading}
                className="text-sm text-white bg-blue-600 hover:bg-blue-700 font-semibold py-2 px-4 rounded-md transition-colors disabled:bg-blue-400"
            >
                Yenile
            </button>
            <button 
                onClick={onLogout}
                className="text-sm text-white bg-red-600 hover:bg-red-700 font-semibold py-2 px-4 rounded-md transition-colors"
            >
                Çıkış Yap
            </button>
        </div>

        <h1 className="text-2xl font-bold mb-6 text-center">Yönetici Paneli</h1>

        <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner">
          <h2 className="text-lg font-semibold mb-4">Yeni Kullanıcı Ekle</h2>
          <form onSubmit={handleAddUser} className="flex flex-col sm:flex-row gap-4 items-center">
            <input type="text" placeholder="Sicil Numarası" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} disabled={isSubmitting} className="input-style"/>
            <input type="text" placeholder="Şifre" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} disabled={isSubmitting} className="input-style"/>
            <button type="submit" disabled={isSubmitting} className="px-6 w-full sm:w-auto py-3 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 transition-colors disabled:bg-green-400 disabled:cursor-wait">
              {isSubmitting ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </form>
        </div>

         {error && !isEditModalOpen && <p className="text-red-500 text-sm my-4 text-center p-3 bg-red-100 rounded-md">{error}</p>}

        <div className="overflow-x-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-4">
              <h2 className="text-lg font-semibold">Kullanıcı Yönetimi ve Aktivite</h2>
              <div className="relative w-full sm:w-64">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon />
                    </div>
                    <input
                        type="text"
                        placeholder="Sicil No'ya göre ara..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border rounded-lg input-style"
                    />
                </div>
          </div>

          {dataWarning && (
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4 rounded-md" role="alert">
              <p className="font-bold">Bilgilendirme</p>
              <p>{dataWarning}</p>
            </div>
          )}

          <div className="border rounded-lg overflow-hidden shadow-sm">
              {isLoading ? (
                  <p className="text-center text-gray-500 p-8">Veriler yükleniyor...</p>
              ) : (
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-600">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th onClick={() => requestSort('username')} className="th-style">Sicil No {getSortIndicator('username')}</th>
                      <th className="th-style text-left flex items-center">
                        Şifre
                        <div className="flex items-center ml-4">
                            <input 
                                type="checkbox" 
                                id="showpass" 
                                checked={showPasswords} 
                                onChange={(e) => setShowPasswords(e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="showpass" className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-300 normal-case">Göster</label>
                        </div>
                      </th>
                      <th onClick={() => requestSort('queryCount')} className="th-style">Sorgu Sayısı {getSortIndicator('queryCount')}</th>
                      <th onClick={() => requestSort('lastLogin')} className="th-style">Son Giriş {getSortIndicator('lastLogin')}</th>
                      <th className="th-style text-right">Eylemler</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-600">
                      {filteredUsers.map((user) => (
                        <tr key={user.username} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="td-style font-mono">{user.username}</td>
                            <td className="td-style font-mono text-gray-500 dark:text-gray-400">{showPasswords ? user.password : '********'}</td>
                            <td className="td-style text-center font-semibold">{user.queryCount}</td>
                            <td className="td-style text-center text-sm">{user.lastLogin}</td>
                            <td className="td-style text-right">
                                <div className="flex items-center justify-end gap-2">
                                    <button onClick={() => handleOpenEditModal(user)} className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-gray-600 rounded-full transition-colors" title="Düzenle"><EditIcon /></button>
                                    <button onClick={() => handleDeleteUser(user.username)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full transition-colors" title="Sil"><TrashIcon /></button>
                                </div>
                            </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
               {filteredUsers.length === 0 && !isLoading && (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                    {searchTerm ? 'Arama kriterlerine uygun kullanıcı bulunamadı.' : 'Kayıtlı kullanıcı bulunamadı.'}
                  </p>
              )}
          </div>
        </div>
      </div>

      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={handleCloseEditModal}>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-6">Kullanıcıyı Düzenle</h2>
            <form onSubmit={handleUpdateUser}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="edit-username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Sicil Numarası</label>
                  <input 
                    id="edit-username" 
                    type="text" 
                    value={editForm.username} 
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} 
                    className="mt-1 input-style"
                  />
                </div>
                <div>
                  <label htmlFor="edit-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Şifre</label>
                  <input 
                    id="edit-password" 
                    type="text" 
                    value={editForm.password} 
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })} 
                    className="mt-1 input-style"
                  />
                </div>
              </div>
              {error && isEditModalOpen && <p className="text-red-500 text-sm mt-4 text-center">{error}</p>}
              <div className="mt-8 flex justify-end gap-4">
                <button type="button" onClick={handleCloseEditModal} disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">İptal</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-green-400">
                  {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
            .input-style { flex-grow: 1; appearance: none; border-radius: 0.375rem; position: relative; display: block; width: 100%; padding: 0.75rem 1rem; border: 1px solid #D1D5DB; background-color: #FFFFFF; color: #111827; }
            .dark .input-style { border-color: #4B5563; background-color: #374151; color: #FFFFFF; }
            .th-style { padding: 0.75rem 1.5rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #4B5563; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; user-select: none; }
            .dark .th-style { color: #9CA3AF; }
            .td-style { padding: 1rem 1.5rem; font-size: 0.875rem; color: #111827; white-space: nowrap; }
            .dark .td-style { color: #FFFFFF; }
      `}</style>
    </>
  );
};

export default AdminScreen;