import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MenuId, CostingMethod, Category, UnitOfMeasure, UserProfile } from '../../types';
import { formatRupiah, formatNumber } from '../../utils/calculator';
import { api } from '../../services/api';
import {
  User,
  Users,
  Shield,
  Settings,
  Database,
  FileSpreadsheet,
  DownloadCloud,
  RotateCcw,
  History,
  BookOpen,
  LogOut,
  Save,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  X,
  UploadCloud,
  Building,
  DollarSign,
  Tag,
  Scale3d,
  Layers,
  Calculator,
  Lock,
  Workflow,
  ArrowDown,
  Camera,
  Upload,
  Image as ImageIcon,
  Mail,
  KeyRound,
  Clock,
  Zap,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { DataPipelineCard } from '../common/DataPipelineCard';
import { DataPipelineModal } from '../common/DataPipelineModal';
import { RoleAndPermissionView } from './RoleAndPermissionView';

interface SistemViewsProps {
  subModule: MenuId;
}

export const SistemViews: React.FC<SistemViewsProps> = ({ subModule }) => {
  const {
    currentUser,
    setCurrentUser,
    availableUsers,
    addUser,
    updateUser,
    deleteUser,
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    units,
    addUnit,
    updateUnit,
    deleteUnit,
    companySettings,
    updateCompanySettings,
    logs,
    resetToDemoData,
    exportDatabaseJson,
    importDatabaseJson,
    showToast,
    setCurrentMenu,
    logout,
    activeSubscription,
    subscriptionUsage,
    currentTenant,
    products,
    rawMaterials,
    boms,
    refreshSubscription,
  } = useApp();

  // 8.1 Profile State
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePhone, setProfilePhone] = useState(currentUser.phone || '0812-3456-7890');
  const [profileAvatar, setProfileAvatar] = useState(currentUser.avatar);

  // 8.2 User management state (Add & Edit User with Photo)
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [userRole, setUserRole] = useState<UserProfile['role']>('Cost Accountant');
  const [userActive, setUserActive] = useState(true);
  const [userAvatar, setUserAvatar] = useState('');
  const [avatarFileName, setAvatarFileName] = useState('');

  // Open modal for Adding new user
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setUserRole('Cost Accountant');
    setUserActive(true);
    setUserAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
    setAvatarFileName('');
    setIsUserModalOpen(true);
  };

  // Open modal for Editing existing user
  const handleOpenEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserPhone(user.phone || '');
    setUserRole(user.role);
    setUserActive(user.active !== false);
    setUserAvatar(user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
    setAvatarFileName('');
    setIsUserModalOpen(true);
  };

  // Dedicated handler for .jpg / .jpeg photo upload
  const handleJpgPhotoUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onSuccess: (base64Url: string) => void,
    setFileName?: (name: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate strictly .jpg / .jpeg format
    const isJpg = file.type === 'image/jpeg' || /\.(jpe?g)$/i.test(file.name);
    if (!isJpg) {
      showToast('Format Tidak Sesuai', 'Hanya file foto dengan format .jpg atau .jpeg yang diperbolehkan.', 'warning');
      e.target.value = '';
      return;
    }

    // Size validation: max 2MB
    if (file.size > 2 * 1024 * 1024) {
      showToast('Ukuran File Terlalu Besar', 'Maksimal ukuran file foto adalah 2MB.', 'warning');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onSuccess(reader.result);
        if (setFileName) setFileName(file.name);
        showToast('Foto Berhasil Dipilih', `${file.name} (${Math.round(file.size / 1024)} KB) siap disimpan.`, 'success');
      }
    };
    reader.onerror = () => {
      showToast('Gagal Memproses File', 'Terjadi kesalahan saat membaca file gambar.', 'error');
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Pipeline modal state
  const [isPipelineModalOpen, setIsPipelineModalOpen] = useState(false);

  // 8.4.1 & 8.4.2 Category State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catCode, setCatCode] = useState('');
  const [catType, setCatType] = useState<'PRODUCT' | 'MATERIAL'>('PRODUCT');

  // 8.4.3 Satuan State
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [unitCode, setUnitCode] = useState('');
  const [unitName, setUnitName] = useState('');

  // 8.4.4 - 8.4.6 Settings
  const [localSettings, setLocalSettings] = useState(companySettings);

  // 8.5 & 8.7 File import
  const [importJsonText, setImportJsonText] = useState('');

  // User Invitation & Password Reset State (Requirements 15 & 16)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserProfile['role']>('Cost Accountant');
  const [invitationTokens, setInvitationTokens] = useState<any[]>([]);
  const [isResetPwdModalOpen, setIsResetPwdModalOpen] = useState(false);
  const [resetPwdUser, setResetPwdUser] = useState<UserProfile | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('Password123!');

  // -------------------------------------------------------------
  // PROFIL PENGGUNA
  // -------------------------------------------------------------
  if (subModule === '8.1') {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
              Profil Pengguna
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Profil & Informasi Akun</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pengaturan akun pengguna yang sedang aktif di ruang kerja SaaS saat ini.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-6">
          <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
            <div className="relative group shrink-0">
              <img
                src={profileAvatar}
                alt={currentUser.name}
                className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-sm"
              />
              <label
                htmlFor="profile-avatar-upload"
                className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                title="Ganti Foto Profil (.jpg / .jpeg)"
              >
                <Camera className="w-5 h-5" />
              </label>
              <input
                id="profile-avatar-upload"
                type="file"
                accept=".jpg,.jpeg,image/jpeg"
                className="hidden"
                onChange={(e) => handleJpgPhotoUpload(e, setProfileAvatar)}
              />
            </div>
            <div>
              <div className="text-base font-bold text-slate-900">{currentUser.name}</div>
              <div className="text-xs text-slate-500">{currentUser.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-block text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
                  Peran: {currentUser.role}
                </span>
                <label
                  htmlFor="profile-avatar-upload"
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold cursor-pointer underline flex items-center gap-1"
                >
                  <Camera className="w-3 h-3" />
                  <span>Ubah Foto (.jpg/.jpeg)</span>
                </label>
              </div>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alamat Email Perusahaan</label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={profilePhone}
                onChange={(e) => setProfilePhone(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                updateUser(currentUser.id, {
                  name: profileName,
                  email: profileEmail,
                  phone: profilePhone,
                  avatar: profileAvatar,
                });
                showToast('Profil Disimpan', 'Data dan foto profil Anda telah diperbarui.', 'success');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MANAJEMEN PENGGUNA
  // -------------------------------------------------------------
  if (subModule === '8.2') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                Manajemen Pengguna
              </span>
              <span className="text-xs text-slate-500 font-mono">{availableUsers.length} Akun Tim</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Daftar Pengguna & Karyawan</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola akses tim akuntansi, manajer produksi, staf gudang, dan pimpinan perusahaan beserta foto profil pengguna.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInviteEmail('');
                setInviteRole('Cost Accountant');
                setIsInviteModalOpen(true);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Mail className="w-4 h-4" />
              <span>Undang Anggota Tim</span>
            </button>
            <button
              onClick={handleOpenAddUser}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna Baru</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Nama & Email</th>
                <th className="py-3 px-4">Role / Peran</th>
                <th className="py-3 px-4">Telepon</th>
                <th className="py-3 px-4">Login Terakhir</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-36">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {availableUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={u.avatar}
                        alt={u.name}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 shadow-2xs"
                      />
                      <div>
                        <div className="font-bold text-slate-800">{u.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
                      {u.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{u.phone || '-'}</td>
                  <td className="py-3.5 px-4 text-slate-500">{u.lastLogin || 'Belum pernah'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        u.active !== false
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {u.active !== false ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => {
                          setResetPwdUser(u);
                          setNewPasswordInput('Password123!');
                          setIsResetPwdModalOpen(true);
                        }}
                        className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Reset Kata Sandi Pengguna"
                      >
                        <KeyRound className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditUser(u)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Data & Foto Pengguna"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Hapus pengguna ${u.name}?`)) {
                            deleteUser(u.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Hapus Pengguna"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal Tambah / Edit Pengguna (Mendukung upload foto .jpg / .jpeg) */}
        {isUserModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">
                    {editingUser ? 'Edit Data & Foto Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {editingUser
                      ? `Perbarui informasi akun, role hak akses, dan foto profil untuk ${editingUser.name}`
                      : 'Daftarkan pengguna baru lengkap dengan foto profil (.jpg/.jpeg), role, dan hak akses.'}
                  </p>
                </div>
                <button
                  onClick={() => setIsUserModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!userName.trim()) {
                    showToast('Nama Diperlukan', 'Harap isi nama lengkap pengguna.', 'warning');
                    return;
                  }
                  if (!userEmail.trim()) {
                    showToast('Email Diperlukan', 'Harap isi alamat email pengguna.', 'warning');
                    return;
                  }

                  if (editingUser) {
                    updateUser(editingUser.id, {
                      name: userName.trim(),
                      email: userEmail.trim(),
                      role: userRole,
                      phone: userPhone.trim(),
                      active: userActive,
                      avatar: userAvatar,
                    });
                    showToast('Pengguna Diperbarui', `Data dan foto profil ${userName} berhasil disimpan.`, 'success');
                  } else {
                    addUser({
                      name: userName.trim(),
                      username: userEmail.split('@')[0] || 'pengguna',
                      email: userEmail.trim(),
                      role: userRole,
                      avatar: userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
                      tenantId: 'tenant-1',
                      phone: userPhone.trim() || '0812-0000-0000',
                      active: userActive,
                    });
                  }
                  setIsUserModalOpen(false);
                }}
                className="p-5 space-y-4 text-xs max-h-[80vh] overflow-y-auto"
              >
                {/* Bagian Foto Profil Pengguna (.jpg / .jpeg) */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block font-semibold text-slate-700 mb-2">
                    Foto Profil Pengguna (.jpg / .jpeg)
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="relative group shrink-0">
                      <img
                        src={userAvatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                        alt="Preview Foto Pengguna"
                        className="w-16 h-16 rounded-full object-cover border-2 border-emerald-500 shadow-xs"
                      />
                      <label
                        htmlFor="user-photo-input"
                        className="absolute inset-0 flex items-center justify-center bg-black/45 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
                        title="Klik untuk memilih foto (.jpg / .jpeg)"
                      >
                        <Camera className="w-5 h-5" />
                      </label>
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <label
                          htmlFor="user-photo-input"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer transition-colors"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>{userAvatar ? 'Ganti Foto (.jpg / .jpeg)' : 'Unggah Foto (.jpg / .jpeg)'}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setUserAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80');
                            setAvatarFileName('');
                          }}
                          className="px-2.5 py-1.5 text-slate-500 hover:text-rose-600 text-xs font-semibold hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          Reset Default
                        </button>
                      </div>
                      <input
                        id="user-photo-input"
                        type="file"
                        accept=".jpg,.jpeg,image/jpeg"
                        className="hidden"
                        onChange={(e) => handleJpgPhotoUpload(e, setUserAvatar, setAvatarFileName)}
                      />
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                        <span className="font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded text-[10px]">
                          Format: .JPG / .JPEG
                        </span>
                        <span className="truncate">
                          {avatarFileName ? `File: ${avatarFileName}` : 'Maksimal ukuran file 2MB'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input
                    type="text"
                    required
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Contoh: Hendra Setiawan, S.E."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Alamat Email</label>
                    <input
                      type="email"
                      required
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      placeholder="nama@bogarasa.co.id"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nomor Telepon / WA</label>
                    <input
                      type="text"
                      value={userPhone}
                      onChange={(e) => setUserPhone(e.target.value)}
                      placeholder="0812-3456-7890"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Peran / Hak Akses</label>
                    <select
                      value={userRole}
                      onChange={(e) => setUserRole(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="Administrator">Administrator (Super Admin)</option>
                      <option value="Manager / Owner">Manager / Owner</option>
                      <option value="Cost Accountant">Cost Accountant</option>
                      <option value="Inventory Staff">Inventory Staff</option>
                      <option value="Staff">Staff Produksi</option>
                      <option value="Kasir">Kasir</option>
                      <option value="Viewer">Viewer (Hanya Lihat)</option>
                      {(() => {
                        try {
                          const saved = localStorage.getItem('app_rbac_roles_custom_v2');
                          if (saved) {
                            const parsed = JSON.parse(saved);
                            if (Array.isArray(parsed)) {
                              return parsed
                                .filter((r: any) => !r.isSystem)
                                .map((cr: any) => (
                                  <option key={cr.id} value={cr.name}>
                                    {cr.name} (Role Kustom)
                                  </option>
                                ));
                            }
                          }
                        } catch {}
                        return null;
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Status Akun</label>
                    <select
                      value={userActive ? 'true' : 'false'}
                      onChange={(e) => setUserActive(e.target.value === 'true')}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                    >
                      <option value="true">Aktif</option>
                      <option value="false">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {editingUser ? 'Simpan Perubahan' : 'Simpan Pengguna'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Undang Pengguna (Requirements 15 & 16) */}
        {isInviteModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700">
                    <Mail className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Undang Pengguna Tim</h3>
                    <p className="text-[11px] text-slate-500">Terbitkan token undangan resmi terotentikasi</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsInviteModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!inviteEmail.trim()) {
                    showToast('Email Diperlukan', 'Harap masukkan alamat email calon pengguna.', 'warning');
                    return;
                  }
                  try {
                    const res = await api.inviteUser(inviteEmail.trim(), inviteRole);
                    showToast('Undangan Berhasil Dibuat', `Token undangan telah diterbitkan untuk ${inviteEmail}. Token: ${res.invitation.token}`, 'success');
                    setInvitationTokens((prev) => [res.invitation, ...prev]);
                    setIsInviteModalOpen(false);
                    setInviteEmail('');
                  } catch (err: any) {
                    showToast('Gagal Menerbitkan Undangan', err.message || 'Kendala kuota paket atau izin peran.', 'error');
                  }
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email Calon Pengguna</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="nama.rekan@perusahaan.co.id"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran / Hak Akses</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Cost Accountant">Cost Accountant</option>
                    <option value="Inventory Staff">Inventory Staff</option>
                    <option value="Staff">Staff Produksi</option>
                    <option value="Kasir">Kasir</option>
                    <option value="Manager / Owner">Manager / Owner</option>
                    <option value="Administrator">Administrator Bisnis</option>
                    <option value="Viewer">Viewer (Hanya Lihat)</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 text-[11px] space-y-1">
                  <div className="font-semibold text-slate-700">Ketentuan Kuota & Keamanan:</div>
                  <p>• Undangan divalidasi langsung oleh backend sesuai batas kuota paket ({activeSubscription?.limits?.maxUsers || 5} user).</p>
                  <p>• Peran SUPER_ADMIN tidak dapat diberikan oleh pengguna bisnis.</p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Terbitkan Undangan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Reset Kata Sandi Pengguna (Requirement 15) */}
        {isResetPwdModalOpen && resetPwdUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-sm">Reset Kata Sandi Pengguna</h3>
                    <p className="text-[11px] text-slate-500">{resetPwdUser.name} ({resetPwdUser.email})</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsResetPwdModalOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newPasswordInput || newPasswordInput.length < 6) {
                    showToast('Kata Sandi Lemah', 'Minimal panjang kata sandi adalah 6 karakter.', 'warning');
                    return;
                  }
                  try {
                    await updateUser(resetPwdUser.id, {
                      newPassword: newPasswordInput,
                    } as any);
                    showToast('Kata Sandi Berhasil Direset', `Kata sandi baru untuk ${resetPwdUser.name} telah disimpan dengan hash terenkripsi.`, 'success');
                    setIsResetPwdModalOpen(false);
                  } catch (err: any) {
                    showToast('Gagal Reset Sandi', err.message || 'Terjadi kesalahan.', 'error');
                  }
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Baru</label>
                  <input
                    type="text"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="Minimal 6 karakter"
                    required
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Kata sandi langsung di-hash menggunakan algoritma Salted SHA-256 di backend sebelum disimpan.
                  </p>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsResetPwdModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Simpan Kata Sandi Baru
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // ROLE & HAK AKSES
  // -------------------------------------------------------------
  if (subModule === '8.3') {
    return <RoleAndPermissionView />;
  }

  // -------------------------------------------------------------
  // 8.4.1 KATEGORI PRODUK & 8.4.2 KATEGORI BAHAN BAKU
  // -------------------------------------------------------------
  if (subModule === '8.4.1' || subModule === '8.4.2') {
    const isProductCat = subModule === '8.4.1';
    const currentCats = categories.filter((c) =>
      isProductCat ? c.type === 'PRODUCT' : c.type === 'MATERIAL'
    );

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                {isProductCat ? 'Kategori Produk' : 'Kategori Bahan Baku'}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              {isProductCat ? 'Pengelompokan Produk Jadi' : 'Pengelompokan Bahan Baku & Kemasan'}
            </h1>
          </div>

          <button
            onClick={() => {
              setCatName('');
              setCatCode('');
              setCatType(isProductCat ? 'PRODUCT' : 'MATERIAL');
              setIsCatModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Kategori</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Kode Kategori</th>
                <th className="py-3 px-4">Nama Kategori</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentCats.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-mono font-bold text-blue-700">{c.code}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{c.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">{c.description || '-'}</td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`Hapus kategori ${c.name}?`)) {
                          deleteCategory(c.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isCatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Tambah Kategori Baru</h3>
                <button onClick={() => setIsCatModalOpen(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addCategory({
                    name: catName,
                    code: catCode.toUpperCase(),
                    type: catType,
                  });
                  setIsCatModalOpen(false);
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Singkat</label>
                  <input
                    type="text"
                    required
                    value={catCode}
                    onChange={(e) => setCatCode(e.target.value)}
                    placeholder="Contoh: SNK / TEPUNG"
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Kategori</label>
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Contoh: Snack & Camilan Kering"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCatModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    Simpan Kategori
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8.4.3 SATUAN (UOM)
  // -------------------------------------------------------------
  if (subModule === '8.4.3') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Satuan Ukuran (UOM)
              </span>
              <span className="text-xs text-slate-500 font-mono">{units.length} Satuan</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Satuan Ukuran & Standar Konversi</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar unit pengukuran bahan baku (kg, gr, liter, ml, zak, butir, pcs) untuk akurasi formula.
            </p>
          </div>

          <button
            onClick={() => {
              setUnitCode('');
              setUnitName('');
              setIsUnitModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Satuan</span>
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Kode Satuan</th>
                <th className="py-3 px-4">Nama Lengkap</th>
                <th className="py-3 px-4">Satuan Dasar Acuan</th>
                <th className="py-3 px-4 text-center w-24">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/70">
                  <td className="py-3.5 px-4 font-mono font-bold text-purple-700">{u.code}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{u.name}</td>
                  <td className="py-3.5 px-4 text-slate-500">
                    {u.baseUnit ? `Konversi ke ${u.baseUnit} (${u.conversionFactor})` : 'Satuan Dasar'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      onClick={() => {
                        if (confirm(`Hapus satuan ${u.code}?`)) {
                          deleteUnit(u.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {isUnitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">Tambah Satuan Ukuran Baru</h3>
                <button onClick={() => setIsUnitModalOpen(false)} className="text-slate-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  addUnit({
                    code: unitCode.toLowerCase(),
                    name: unitName,
                  });
                  setIsUnitModalOpen(false);
                }}
                className="p-5 space-y-4 text-xs"
              >
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Simbol / Kode</label>
                  <input
                    type="text"
                    required
                    value={unitCode}
                    onChange={(e) => setUnitCode(e.target.value)}
                    placeholder="Contoh: sachet / pack"
                    className="w-full font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Satuan</label>
                  <input
                    type="text"
                    required
                    value={unitName}
                    onChange={(e) => setUnitName(e.target.value)}
                    placeholder="Contoh: Sachet Kecil"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUnitModalOpen(false)}
                    className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl"
                  >
                    Simpan Satuan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8.4.4 PENGATURAN HPP & 8.4.5 PENGATURAN BIAYA & 8.4.6 PERUSAHAAN
  // -------------------------------------------------------------
  if (subModule === '8.4.4' || subModule === '8.4.5' || subModule === '8.4.6') {
    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              {subModule === '8.4.4' && 'Pengaturan HPP'}
              {subModule === '8.4.5' && 'Pengaturan Biaya'}
              {subModule === '8.4.6' && 'Pengaturan Perusahaan'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {subModule === '8.4.4' && 'Pengaturan Formula & Metode HPP Default'}
            {subModule === '8.4.5' && 'Pengaturan Tarif Dasar Tenaga Kerja & BOP'}
            {subModule === '8.4.6' && 'Profil Identitas Perusahaan & Legalitas'}
          </h1>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
          {subModule === '8.4.4' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Metode Perhitungan Standar
                </label>
                <select
                  value={localSettings.defaultCostingMethod}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      defaultCostingMethod: e.target.value as CostingMethod,
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="FULL_COSTING">Full Costing (Diserap Penuh - SAK Indonesia)</option>
                  <option value="VARIABLE_COSTING">Variable Costing (BOP Tetap Diabaikan)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Faktor Susut / Shrinkage Default (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={localSettings.defaultShrinkagePct}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        defaultShrinkagePct: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Target Margin Penjualan Standar (%)
                  </label>
                  <input
                    type="number"
                    value={localSettings.defaultMarginTargetPct}
                    onChange={(e) =>
                      setLocalSettings({
                        ...localSettings,
                        defaultMarginTargetPct: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-right text-emerald-700 font-bold"
                  />
                </div>
              </div>
            </>
          )}

          {subModule === '8.4.5' && (
            <>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Tarif Standar Tenaga Kerja Langsung (BTKL) per Jam (Rp)
                </label>
                <input
                  type="number"
                  step={1000}
                  value={localSettings.hourlyLaborRateStandard}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      hourlyLaborRateStandard: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-right"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Alokasi Biaya Overhead Tetap Bulanan (Rp)
                </label>
                <input
                  type="number"
                  step={500000}
                  value={localSettings.fixedMonthlyOverhead}
                  onChange={(e) =>
                    setLocalSettings({
                      ...localSettings,
                      fixedMonthlyOverhead: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono font-bold text-right text-amber-700"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Sewa dapur, gaji manajerial tetap, dan depresiasi oven/mesin
                </span>
              </div>
            </>
          )}

          {subModule === '8.4.6' && (
            <>
              {/* SaaS Subscription & Entitlement Details Card (Requirements 21 & 22) */}
              {(() => {
                const planCode = activeSubscription?.planCode || currentTenant?.plan || 'STARTER';
                const planName = activeSubscription?.planName || currentTenant?.plan || 'Starter UMKM';
                const statusStr = (activeSubscription?.status || 'ACTIVE').toUpperCase();
                const maxUsers = activeSubscription?.limits?.maxUsers || 5;
                const userCount = availableUsers.length;
                const maxProducts = activeSubscription?.limits?.maxProducts || 100;
                const prodCount = products.length;
                const maxRaw = activeSubscription?.limits?.maxRawMaterials || 50;
                const rawCount = rawMaterials.length;
                const maxBoms = activeSubscription?.limits?.maxBoms || 50;
                const bomCount = boms.length;

                const userRatio = userCount / maxUsers;
                const prodRatio = prodCount / maxProducts;
                const isUserWarning = userRatio >= 0.8;
                const isProdWarning = prodRatio >= 0.8;

                const endVal = activeSubscription?.endDate || activeSubscription?.trialEnd;
                const formattedEnd = endVal
                  ? new Date(endVal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                  : '31 Desember 2026';

                return (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4 shadow-2xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                          <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-base text-slate-900">Paket: {planCode}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              statusStr === 'ACTIVE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : statusStr === 'TRIAL'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {statusStr === 'ACTIVE' ? 'Aktif' : statusStr === 'TRIAL' ? 'Masa Trial' : 'Expired'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{planName} • Siklus: {activeSubscription?.billingCycle || 'Bulanan'}</p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right text-xs">
                        <span className="text-slate-400 block text-[11px]">Masa Aktif Berakhir:</span>
                        <span className="font-bold text-slate-800 text-sm">{formattedEnd}</span>
                      </div>
                    </div>

                    {/* Quota Progress Warnings (Requirement 22) */}
                    {(isUserWarning || isProdWarning) && (
                      <div className="bg-amber-100/90 border border-amber-200 text-amber-900 p-3 rounded-xl flex items-start gap-2.5 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Peringatan Kuota Paket:</span>
                          <span className="ml-1">
                            {isUserWarning
                              ? `Penggunaan user Anda sudah mencapai ${Math.round(userRatio * 100)}% dari batas paket (${userCount}/${maxUsers} User).`
                              : `Penggunaan produk Anda sudah mencapai ${Math.round(prodRatio * 100)}% dari batas paket (${prodCount}/${maxProducts} SKU).`}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Resource Limit Metrics */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="text-slate-400 text-[11px]">Pengguna (User)</div>
                        <div className="text-base font-bold text-slate-900 mt-1">
                          {userCount} <span className="text-xs text-slate-400 font-normal">/ {maxUsers}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${userRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, userRatio * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="text-slate-400 text-[11px]">Produk (SKU)</div>
                        <div className="text-base font-bold text-slate-900 mt-1">
                          {prodCount} <span className="text-xs text-slate-400 font-normal">/ {maxProducts}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${prodRatio >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${Math.min(100, prodRatio * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="text-slate-400 text-[11px]">Bahan Baku</div>
                        <div className="text-base font-bold text-slate-900 mt-1">
                          {rawCount} <span className="text-xs text-slate-400 font-normal">/ {maxRaw}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (rawCount / maxRaw) * 100)}%` }}
                          />
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/90 shadow-2xs">
                        <div className="text-slate-400 text-[11px]">Formula BOM</div>
                        <div className="text-base font-bold text-slate-900 mt-1">
                          {bomCount} <span className="text-xs text-slate-400 font-normal">/ {maxBoms}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-indigo-500"
                            style={{ width: `${Math.min(100, (bomCount / maxBoms) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Feature Entitlements Badges */}
                    {activeSubscription?.features && (
                      <div className="pt-2">
                        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                          Hak Akses Fitur Terdaftar (Feature Entitlement):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(activeSubscription.features as string[]).map((f) => (
                            <span
                              key={f}
                              className="text-[10px] font-semibold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-700 font-mono shadow-2xs"
                            >
                              ✓ {f}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Entitas PT / CV</label>
                  <input
                    type="text"
                    value={localSettings.companyName}
                    onChange={(e) => setLocalSettings({ ...localSettings, companyName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Merek / Brand</label>
                  <input
                    type="text"
                    value={localSettings.brandName}
                    onChange={(e) => setLocalSettings({ ...localSettings, brandName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NPWP Perusahaan</label>
                  <input
                    type="text"
                    value={localSettings.taxId}
                    onChange={(e) => setLocalSettings({ ...localSettings, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Bidang Industri</label>
                  <input
                    type="text"
                    value={localSettings.industry}
                    onChange={(e) => setLocalSettings({ ...localSettings, industry: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Alamat Fasilitas Produksi</label>
                <textarea
                  rows={2}
                  value={localSettings.address}
                  onChange={(e) => setLocalSettings({ ...localSettings, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
            </>
          )}

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              onClick={() => {
                updateCompanySettings(localSettings);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Pengaturan</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8.5 IMPORT DATA & 8.6 EXPORT DATA
  // -------------------------------------------------------------
  if (subModule === '8.5' || subModule === '8.6') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
              {subModule === '8.5' ? '8.5 Import Data' : '8.6 Export Data'}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {subModule === '8.5' ? 'Migrasi & Unggah Data Master' : 'Ekspor Arsip Seluruh Data SaaS'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Mendukung sinkronisasi format JSON terenkripsi dan spreadsheet CSV.
          </p>
        </div>

        {subModule === '8.6' ? (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Unduh seluruh database master produk, bahan baku, supplier, formula BOM, riwayat batch produksi, dan catatan kartu stok dalam satu paket file JSON.
            </p>
            <button
              onClick={() => {
                const data = exportDatabaseJson();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-hpp-saas-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Ekspor Berhasil', 'File database JSON telah diunduh.', 'success');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download File Database JSON Lengkap</span>
            </button>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-4 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Tempelkan (paste) payload JSON hasil ekspor atau backup sebelumnya di bawah ini untuk memulihkan seluruh data aplikasi:
            </p>
            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste isi data JSON di sini..."
              className="w-full p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl"
            />
            <button
              onClick={() => {
                if (!importJsonText.trim()) return;
                const ok = importDatabaseJson(importJsonText);
                if (ok) setImportJsonText('');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Pulihkan & Terapkan Data JSON</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // -------------------------------------------------------------
  // BACKUP & RESTORE
  // -------------------------------------------------------------
  if (subModule === '8.7') {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-2 py-0.5 rounded">
              Backup & Restore
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Pencadangan & Pemulihan Database</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Amankan data keuangan Anda secara berkala atau kembalikan sistem ke data standar pabrik.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-slate-800 text-sm">Cadangkan Data (Backup)</div>
              <p className="text-xs text-slate-500 mt-1">
                Simpan salinan database lengkap ke penyimpanan komputer Anda.
              </p>
            </div>
            <button
              onClick={() => {
                const data = exportDatabaseJson();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `backup-hpp-saas-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                showToast('Pencadangan Selesai', 'File cadangan JSON telah diunduh.', 'success');
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Download File Backup</span>
            </button>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-rose-200 shadow-2xs flex flex-col justify-between space-y-3">
            <div>
              <div className="font-bold text-rose-800 text-sm">Kembalikan ke Demo Asli</div>
              <p className="text-xs text-slate-500 mt-1">
                Reset seluruh master data, resep BOM, dan batch ke sampel bawaan awal.
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Yakin ingin mereset seluruh data kembali ke data contoh demo awal?')) {
                  resetToDemoData();
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset Data ke Standar Demo</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // LOG AKTIVITAS (AUDIT TRAIL)
  // -------------------------------------------------------------
  if (subModule === '8.8') {
    return (
      <div className="space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
              Log Aktivitas & Audit Trail
            </span>
            <span className="text-xs text-slate-500 font-mono">{logs.length} Catatan</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Histori Kronologis Perubahan Sistem</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Jejak audit seluruh aktivitas pembuatan BOM, pengubahan harga, penyelesaian batch, dan stok opname.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Pengguna & Peran</th>
                <th className="py-3 px-4">Tindakan</th>
                <th className="py-3 px-4">Modul</th>
                <th className="py-3 px-4">Rincian Perubahan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                  <td className="py-3 px-4">
                    <span className="font-bold text-slate-800">{log.userName}</span>
                    <span className="text-[10px] text-slate-400 block">{log.userRole}</span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-700">{log.action}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{log.module}</td>
                  <td className="py-3 px-4 text-slate-700 max-w-md">{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // PANDUAN PENGGUNA & GLOSARIUM HPP
  // -------------------------------------------------------------
  if (subModule === '8.9') {
    const guides = [
      {
        title: 'Apa itu Harga Pokok Produksi (HPP)?',
        desc: 'HPP (Cost of Goods Manufactured) adalah akumulasi seluruh biaya yang dikeluarkan dalam memproduksi suatu barang jadi, terdiri dari Biaya Bahan Baku Langsung, Biaya Tenaga Kerja Langsung (BTKL), Biaya Overhead Pabrik (BOP), dan Biaya Kemasan.',
      },
      {
        title: 'Perbedaan Full Costing vs Variable Costing',
        desc: 'Full Costing membebankan seluruh biaya pabrik (baik tetap maupun variabel) ke dalam HPP unit. Metode ini disyaratkan oleh standar akuntansi keuangan dan perpajakan Indonesia. Sedangkan Variable Costing hanya memperhitungkan biaya yang berubah proporsional dengan output produksi (BOP tetap diperlakukan sebagai beban periode).',
      },
      {
        title: 'Mengapa Faktor Susut (Shrinkage) Sangat Krusial?',
        desc: 'Bahan mentah seperti cabai, bawang, mentega, atau daging mengalami susut bobot saat dibersihkan, dipotong, ditumis, atau dipanggang (3% - 10%). Jika Anda hanya menghitung berat bersih pada resep tanpa memasukkan faktor susut, HPP Anda akan meleset dan margin keuntungan nyata akan berkurang.',
      },
      {
        title: 'Margin Penjualan vs Markup Biaya',
        desc: 'Margin dihitung dari Harga Jual: Margin = (Harga Jual - HPP) / Harga Jual * 100%. Sedangkan Markup dihitung dari HPP: Markup = (Harga Jual - HPP) / HPP * 100%. Margin 40% setara dengan Markup 66.7%.',
      },
      {
        title: 'Titik Impas (Break-Even Point / BEP)',
        desc: 'BEP adalah kondisi di mana total pendapatan perusahaan sama persis dengan total biaya (laba bersih = Rp 0). BEP Unit = Biaya Tetap / (Harga Jual - Biaya Variabel per Unit).',
      },
    ];

    return (
      <div className="max-w-3xl space-y-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
              Panduan & Glosarium HPP
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1">Buku Panduan, Arsitektur Data & Rumus Akuntansi</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Panduan lengkap memahami alur hubungan data sistem serta prinsip kalkulasi HPP presisi bagi pengusaha F&B, manufaktur, dan UMKM.
          </p>
        </div>

        {/* 12-Stage Data Architecture Pipeline Visual Section */}
        <div className="space-y-4">
          <DataPipelineCard onOpenFullModal={() => setIsPipelineModalOpen(true)} defaultExpanded={true} />

          {/* ASCII & Schematic Hierarchy Box */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Workflow className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm text-white">
                  Hierarki & Struktur Hubungan Data Sistem
                </h3>
              </div>
              <button
                onClick={() => setIsPipelineModalOpen(true)}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-bold rounded-lg transition-colors"
              >
                Peta Lengkap (12 Tahap)
              </button>
            </div>

            <div className="bg-black/50 p-4 rounded-xl border border-white/10 font-mono text-xs text-emerald-400 leading-relaxed overflow-x-auto">
              <pre className="text-center font-bold">
{`MASTER BAHAN BAKU
       ↓
   PEMBELIAN
       ↓
   HARGA BAHAN
       ↓
   INVENTORY
       ↓
BOM / RESEP
       ↓
    PRODUKSI
       ↓
    HPP PRODUK
       ↓
 HARGA & MARGIN
       ↓
PROFITABILITAS
       ↓
 ANALISIS & SIMULASI
       ↓
     LAPORAN
       ↓
    DASHBOARD`}
              </pre>
            </div>

            <div className="text-xs text-slate-300 space-y-2">
              <div className="font-semibold text-white">Penjelasan Kaskade Alur Data:</div>
              <p className="text-slate-400 leading-relaxed">
                Setiap perubahan pada tingkat atas mengalir secara kaskade ke bawah. Ketika <strong className="text-slate-200">PEMBELIAN (PO)</strong> diterima, sistem memperbarui <strong className="text-slate-200">HARGA BAHAN</strong> dan saldo <strong className="text-slate-200">INVENTORY</strong>. Pembaruan harga bahan otomatis memutakhirkan <strong className="text-slate-200">BOM / RESEP</strong>. Saat <strong className="text-slate-200">PRODUKSI</strong> dieksekusi, biaya nyata menghasilkan <strong className="text-slate-200">HPP PRODUK</strong>. Dari HPP ini, <strong className="text-slate-200">HARGA & MARGIN</strong> dihitung, menghasilkan evaluasi <strong className="text-slate-200">PROFITABILITAS</strong>, diuji di <strong className="text-slate-200">ANALISIS & SIMULASI</strong>, dibukukan di <strong className="text-slate-200">LAPORAN</strong>, dan disajikan di puncak kendali <strong className="text-emerald-400">DASHBOARD</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-emerald-600" />
            <span>Glosarium & Rumus Esensial Akuntansi Biaya</span>
          </h3>
          {guides.map((g, idx) => (
            <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center justify-center shrink-0">
                  {idx + 1}
                </span>
                {g.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed pl-7">{g.desc}</p>
            </div>
          ))}
        </div>

        <DataPipelineModal
          isOpen={isPipelineModalOpen}
          onClose={() => setIsPipelineModalOpen(false)}
        />
      </div>
    );
  }

  // -------------------------------------------------------------
  // 8.10 LOGOUT
  // -------------------------------------------------------------
  if (subModule === '8.10') {
    return (
      <div className="max-w-md mx-auto my-12 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
          <LogOut className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Keluar dari Sesi SaaS?</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Anda sedang masuk sebagai <span className="font-bold text-slate-800">{currentUser.name}</span> pada ruang kerja{' '}
          <span className="font-bold text-emerald-700">{companySettings.companyName}</span>.
        </p>

        <div className="pt-2 flex flex-col gap-2">
          <button
            onClick={() => {
              logout();
            }}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition-colors cursor-pointer"
          >
            Konfirmasi Keluar (Logout)
          </button>
          <button
            onClick={() => setCurrentMenu('1.1')}
            className="w-full py-2 text-slate-600 hover:bg-slate-100 font-semibold text-xs rounded-xl"
          >
            Batal & Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  return null;
};
