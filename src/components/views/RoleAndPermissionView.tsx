import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { UserProfile } from '../../types';
import {
  Shield,
  ShieldCheck,
  Check,
  X,
  Plus,
  RotateCcw,
  Save,
  Search,
  UserCheck,
  Edit2,
  Trash2,
  Lock,
  Unlock,
  Sparkles,
  Info,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

export interface RbacModule {
  id: string;
  category: string;
  name: string;
  description: string;
}

export interface RoleDef {
  id: string;
  name: string;
  category: string;
  description: string;
  color: 'emerald' | 'blue' | 'purple' | 'amber' | 'cyan' | 'indigo' | 'slate' | 'rose';
  isSystem: boolean;
}

const DEFAULT_MODULES: RbacModule[] = [
  {
    id: 'dashboard',
    category: 'Overview & Kalkulasi',
    name: 'Dashboard & Ringkasan KPI',
    description: 'Monitoring eksekutif, HPP rata-rata, margin kotor, dan output pabrik harian',
  },
  {
    id: 'calculator',
    category: 'Overview & Kalkulasi',
    name: 'Kalkulator HPP Interaktif',
    description: 'Simulasi kalkulasi cepat HPP per batch, margin target, dan perbandingan metode costing',
  },
  {
    id: 'master_data',
    category: 'Master Data',
    name: 'Master Data (Produk, Bahan & Supplier)',
    description: 'Katalog SKU produk jadi, spesifikasi bahan baku, database supplier & riwayat harga beli',
  },
  {
    id: 'bom',
    category: 'Produksi & Resep',
    name: 'BOM / Resep & Alokasi Biaya',
    description: 'Formula resep rahasia, takaran bahan baku, dan alokasi tarif BTKL & BOP standar',
  },
  {
    id: 'produksi',
    category: 'Produksi & Resep',
    name: 'Catat & Selesaikan SPK Produksi',
    description: 'Penerbitan surat perintah kerja, pelacakan nomor batch, pencatatan scrap, dan realisasi aktual',
  },
  {
    id: 'pricing',
    category: 'Finansial & Margin',
    name: 'Harga, Margin & Profitabilitas',
    description: 'Penetapan harga jual, tier pricing distributor/retail, margin kontribusi, dan analisis laba',
  },
  {
    id: 'inventory',
    category: 'Logistik & Pembelian',
    name: 'Inventory & Pembelian PO',
    description: 'Kartu stok gudang, batas reorder minimum, purchase order supplier, dan mutasi barang',
  },
  {
    id: 'analysis',
    category: 'Finansial & Margin',
    name: 'Analisis HPP & Simulasi What-If',
    description: 'Simulasi kenaikan harga bahan, analisis BEP unit/rupiah, sensitivitas biaya, dan proyeksi',
  },
  {
    id: 'reports',
    category: 'Sistem & Laporan',
    name: 'Laporan Akuntansi Biaya & Jurnal',
    description: 'Laporan HPP komprehensif, kartu harga pokok pesanan, varians biaya, dan ekspor data',
  },
  {
    id: 'system',
    category: 'Sistem & Laporan',
    name: 'Pengaturan Sistem, Role & Backup',
    description: 'Manajemen pengguna tim, konfigurasi RBAC, audit log aktivitas, dan cadangan database',
  },
];

const DEFAULT_ROLES: RoleDef[] = [
  {
    id: 'owner',
    name: 'Manager / Owner',
    category: 'Manajemen Eksekutif',
    description: 'Akses penuh ke seluruh modul, keuangan, margin laba, dan data resep rahasia',
    color: 'emerald',
    isSystem: true,
  },
  {
    id: 'admin',
    name: 'Administrator',
    category: 'Sistem & Operasional',
    description: 'Kelola konfigurasi sistem, database, audit log, dan otorisasi tim',
    color: 'blue',
    isSystem: true,
  },
  {
    id: 'manager',
    name: 'Prod. Manager',
    category: 'Operasional Pabrik',
    description: 'Pengawasan alur kerja produksi, penerbitan SPK batch, dan validasi resep BOM',
    color: 'purple',
    isSystem: true,
  },
  {
    id: 'accountant',
    name: 'Cost Accountant',
    category: 'Keuangan & Akuntansi',
    description: 'Perhitungan HPP, analisis biaya overhead & tenaga kerja, serta laporan laba rugi',
    color: 'amber',
    isSystem: true,
  },
  {
    id: 'inventory',
    name: 'Inventory Staff',
    category: 'Gudang & Logistik',
    description: 'Penerimaan stok bahan baku, pembuatan PO supplier, opname stok & mutasi barang',
    color: 'cyan',
    isSystem: true,
  },
  {
    id: 'staff',
    name: 'Staff & Kasir',
    category: 'Operasional Harian',
    description: 'Entri operasional harian, pencatatan kasir, dan monitoring status produksi',
    color: 'indigo',
    isSystem: true,
  },
  {
    id: 'viewer',
    name: 'Viewer',
    category: 'Read-Only / Auditor',
    description: 'Akses memantau dashboard dan laporan tanpa wewenang mengubah data formula',
    color: 'slate',
    isSystem: true,
  },
];

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  dashboard: { owner: true, admin: true, manager: true, accountant: true, inventory: true, staff: true, viewer: true },
  calculator: { owner: true, admin: true, manager: true, accountant: true, inventory: false, staff: true, viewer: true },
  master_data: { owner: true, admin: true, manager: true, accountant: true, inventory: true, staff: false, viewer: false },
  bom: { owner: true, admin: true, manager: true, accountant: true, inventory: false, staff: false, viewer: false },
  produksi: { owner: true, admin: true, manager: true, accountant: false, inventory: false, staff: true, viewer: false },
  pricing: { owner: true, admin: true, manager: false, accountant: true, inventory: false, staff: false, viewer: false },
  inventory: { owner: true, admin: true, manager: true, accountant: true, inventory: true, staff: false, viewer: false },
  analysis: { owner: true, admin: true, manager: true, accountant: true, inventory: false, staff: false, viewer: true },
  reports: { owner: true, admin: true, manager: true, accountant: true, inventory: true, staff: false, viewer: true },
  system: { owner: true, admin: true, manager: false, accountant: false, inventory: false, staff: false, viewer: false },
};

const STORAGE_KEY_ROLES = 'app_rbac_roles_custom_v2';
const STORAGE_KEY_MATRIX = 'app_rbac_matrix_v2';

export const RoleAndPermissionView: React.FC = () => {
  const { currentUser, setCurrentUser, availableUsers, updateUser, showToast } = useApp();

  // Roles state (loaded from storage or defaults)
  const [roles, setRoles] = useState<RoleDef[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROLES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_ROLES;
  });

  // Permission Matrix state
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATRIX);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {
      // ignore
    }
    return DEFAULT_PERMISSIONS;
  });

  // Self-role adjustment selection state
  const [selectedOwnRole, setSelectedOwnRole] = useState<string>(currentUser.role);
  const [searchModule, setSearchModule] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Modal State for New/Edit Custom Role
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [formRoleName, setFormRoleName] = useState('');
  const [formRoleCategory, setFormRoleCategory] = useState('Kustom');
  const [formRoleDescription, setFormRoleDescription] = useState('');
  const [formRoleColor, setFormRoleColor] = useState<RoleDef['color']>('indigo');
  const [formRolePermissions, setFormRolePermissions] = useState<Record<string, boolean>>({});

  // Sync state if currentUser changes
  useEffect(() => {
    setSelectedOwnRole(currentUser.role);
  }, [currentUser.role]);

  // Persist roles and matrix
  const saveStateToStorage = (
    newRoles: RoleDef[],
    newMatrix: Record<string, Record<string, boolean>>
  ) => {
    try {
      localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(newRoles));
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(newMatrix));
    } catch {
      // ignore
    }
  };

  // Helper to map user role to RoleDef
  const findRoleForUser = (roleString: string): RoleDef => {
    const direct = roles.find((r) => r.name.toLowerCase() === roleString.toLowerCase() || r.id === roleString);
    if (direct) return direct;
    if (roleString.includes('Owner') || roleString.includes('Manager')) {
      return roles.find((r) => r.id === 'owner') || roles[0];
    }
    if (roleString.includes('Admin')) {
      return roles.find((r) => r.id === 'admin') || roles[1];
    }
    if (roleString.includes('Accountant')) {
      return roles.find((r) => r.id === 'accountant') || roles[3];
    }
    if (roleString.includes('Inventory')) {
      return roles.find((r) => r.id === 'inventory') || roles[4];
    }
    if (roleString.includes('Kasir') || roleString.includes('Staff')) {
      return roles.find((r) => r.id === 'staff') || roles[5];
    }
    return roles.find((r) => r.id === 'viewer') || roles[roles.length - 1];
  };

  const activeRoleDef = findRoleForUser(currentUser.role);

  // Calculate stats for current active role
  const calculateAllowedCount = (roleId: string) => {
    return DEFAULT_MODULES.filter((m) => !!permissions[m.id]?.[roleId]).length;
  };

  const activeRoleAllowedCount = calculateAllowedCount(activeRoleDef.id);

  // Toggle single permission cell
  const handleTogglePermission = (moduleId: string, roleId: string) => {
    setPermissions((prev) => {
      const modulePerms = prev[moduleId] || {};
      const currentVal = !!modulePerms[roleId];
      const updated = {
        ...prev,
        [moduleId]: {
          ...modulePerms,
          [roleId]: !currentVal,
        },
      };
      saveStateToStorage(roles, updated);
      return updated;
    });

    const mod = DEFAULT_MODULES.find((m) => m.id === moduleId);
    const rol = roles.find((r) => r.id === roleId);
    showToast(
      'Wewenang Diperbarui',
      `Akses "${mod?.name || moduleId}" untuk role "${rol?.name || roleId}" telah disesuaikan.`,
      'info'
    );
  };

  // User applies self-role change
  const handleApplyOwnRole = () => {
    if (!selectedOwnRole) return;
    
    // Find matched role definition or name
    const targetRoleDef = roles.find(
      (r) => r.name === selectedOwnRole || r.id === selectedOwnRole
    );
    const finalRoleName = (targetRoleDef ? targetRoleDef.name : selectedOwnRole) as UserProfile['role'];

    const updatedUser: UserProfile = {
      ...currentUser,
      role: finalRoleName,
    };

    setCurrentUser(updatedUser);
    updateUser(currentUser.id, { role: finalRoleName });

    showToast(
      'Role Berhasil Disesuaikan!',
      `Role akun Anda kini telah disesuaikan menjadi "${finalRoleName}". Hak akses modul langsung berlaku.`,
      'success'
    );
  };

  // Open modal to create new custom role
  const handleOpenNewRoleModal = () => {
    setEditingRoleId(null);
    setFormRoleName('');
    setFormRoleCategory('Kustom');
    setFormRoleDescription('');
    setFormRoleColor('indigo');

    // Default: allow basic dashboard and calculator
    const initialPerms: Record<string, boolean> = {};
    DEFAULT_MODULES.forEach((m) => {
      initialPerms[m.id] = m.id === 'dashboard' || m.id === 'calculator';
    });
    setFormRolePermissions(initialPerms);
    setIsRoleModalOpen(true);
  };

  // Open modal to edit existing role
  const handleOpenEditRoleModal = (role: RoleDef) => {
    setEditingRoleId(role.id);
    setFormRoleName(role.name);
    setFormRoleCategory(role.category);
    setFormRoleDescription(role.description);
    setFormRoleColor(role.color);

    const currentPerms: Record<string, boolean> = {};
    DEFAULT_MODULES.forEach((m) => {
      currentPerms[m.id] = !!permissions[m.id]?.[role.id];
    });
    setFormRolePermissions(currentPerms);
    setIsRoleModalOpen(true);
  };

  // Save new or edited role
  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRoleName.trim()) {
      showToast('Form Tidak Lengkap', 'Nama role wajib diisi.', 'warning');
      return;
    }

    if (editingRoleId) {
      // Edit existing
      const updatedRoles = roles.map((r) => {
        if (r.id === editingRoleId) {
          return {
            ...r,
            name: formRoleName.trim(),
            category: formRoleCategory.trim() || 'Kustom',
            description: formRoleDescription.trim() || 'Role kustom operasional',
            color: formRoleColor,
          };
        }
        return r;
      });

      // Update permissions
      const updatedMatrix = { ...permissions };
      DEFAULT_MODULES.forEach((m) => {
        if (!updatedMatrix[m.id]) updatedMatrix[m.id] = {};
        updatedMatrix[m.id][editingRoleId] = !!formRolePermissions[m.id];
      });

      setRoles(updatedRoles);
      setPermissions(updatedMatrix);
      saveStateToStorage(updatedRoles, updatedMatrix);

      // If current user has this role name, update active profile
      if (currentUser.role === formRoleName) {
        updateUser(currentUser.id, { role: formRoleName as any });
      }

      showToast('Role Diperbarui', `Role "${formRoleName}" dan hak aksesnya berhasil disimpan.`, 'success');
    } else {
      // Create new custom role
      const newId = 'role_' + Date.now().toString(36);
      const newRole: RoleDef = {
        id: newId,
        name: formRoleName.trim(),
        category: formRoleCategory.trim() || 'Kustom',
        description: formRoleDescription.trim() || 'Role kustom dibuat oleh user',
        color: formRoleColor,
        isSystem: false,
      };

      const updatedRoles = [...roles, newRole];
      const updatedMatrix = { ...permissions };
      DEFAULT_MODULES.forEach((m) => {
        if (!updatedMatrix[m.id]) updatedMatrix[m.id] = {};
        updatedMatrix[m.id][newId] = !!formRolePermissions[m.id];
      });

      setRoles(updatedRoles);
      setPermissions(updatedMatrix);
      saveStateToStorage(updatedRoles, updatedMatrix);

      showToast(
        'Role Baru Ditambahkan',
        `Role "${formRoleName}" telah dibuat dan dapat langsung disematkan ke akun Anda.`,
        'success'
      );
    }

    setIsRoleModalOpen(false);
  };

  // Delete custom role
  const handleDeleteRole = (roleId: string, roleName: string) => {
    if (confirm(`Apakah Anda yakin ingin menghapus role kustom "${roleName}"?`)) {
      const updatedRoles = roles.filter((r) => r.id !== roleId);
      const updatedMatrix = { ...permissions };
      DEFAULT_MODULES.forEach((m) => {
        if (updatedMatrix[m.id]) {
          delete updatedMatrix[m.id][roleId];
        }
      });

      setRoles(updatedRoles);
      setPermissions(updatedMatrix);
      saveStateToStorage(updatedRoles, updatedMatrix);

      // If user was using this role, fallback to Staff or Viewer
      if (currentUser.role === roleName) {
        const fallback = 'Staff';
        setCurrentUser({ ...currentUser, role: fallback });
        updateUser(currentUser.id, { role: fallback });
        setSelectedOwnRole(fallback);
      }

      showToast('Role Dihapus', `Role "${roleName}" berhasil dihapus dari sistem.`, 'info');
    }
  };

  // Reset to default permissions
  const handleResetToDefault = () => {
    if (
      confirm(
        'Kembalikan seluruh matriks hak akses ke standar pabrik? Seluruh penyesuaian wewenang akan diatur ulang ke konfigurasi bawaan.'
      )
    ) {
      setRoles(DEFAULT_ROLES);
      setPermissions(DEFAULT_PERMISSIONS);
      saveStateToStorage(DEFAULT_ROLES, DEFAULT_PERMISSIONS);
      showToast(
        'Reset Berhasil',
        'Matriks hak akses dan daftar role telah dikembalikan ke standar awal sistem.',
        'success'
      );
    }
  };

  // Filter modules
  const categoriesList = ['ALL', ...Array.from(new Set(DEFAULT_MODULES.map((m) => m.category)))];
  const filteredModules = DEFAULT_MODULES.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchModule.toLowerCase()) ||
      m.description.toLowerCase().includes(searchModule.toLowerCase()) ||
      m.category.toLowerCase().includes(searchModule.toLowerCase());
    const matchesCat = selectedCategory === 'ALL' || m.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  // Badge color helpers
  const getColorClasses = (color: RoleDef['color']) => {
    switch (color) {
      case 'emerald':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'blue':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'amber':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cyan':
        return 'bg-cyan-50 text-cyan-700 border-cyan-200';
      case 'indigo':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'rose':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                Role & Hak Akses
              </span>
              <span className="text-xs text-slate-500 font-mono">RBAC Matrix & User Customization</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">Matriks Wewenang & Penyesuaian Role</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuaikan role akun Anda secara mandiri, atur matriks hak akses per modul, atau buat role kustom sesuai struktur tim Anda.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleOpenNewRoleModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Role Baru</span>
            </button>
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
              title="Reset ke pengaturan hak akses bawaan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: SESUAIKAN ROLE AKUN SAYA (SELF-ROLE ADJUSTMENT) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-gradient-to-br from-white via-blue-50/20 to-indigo-50/30 rounded-2xl border border-blue-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-blue-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Sesuaikan Role Akun Saya</h2>
              <p className="text-[11px] text-slate-500">
                Pilih dan ubah peran wewenang untuk akun Anda sendiri (<span className="font-semibold text-slate-700">{currentUser.name}</span>).
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500">Wewenang Aktif:</span>
            <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
              {activeRoleAllowedCount} dari {DEFAULT_MODULES.length} Modul Terbuka
            </span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Active Profile Info */}
          <div className="lg:col-span-4 flex items-center gap-3 bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-200 shadow-2xs flex-shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</div>
              <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Role Saat Ini:</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getColorClasses(activeRoleDef.color)}`}>
                  {currentUser.role}
                </span>
              </div>
            </div>
          </div>

          {/* Role Selector & Apply */}
          <div className="lg:col-span-8 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Pilih Penyesuaian Role Anda:
                </label>
                <div className="relative">
                  <select
                    value={selectedOwnRole}
                    onChange={(e) => setSelectedOwnRole(e.target.value)}
                    className="w-full text-xs font-semibold text-slate-800 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 pr-8 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all cursor-pointer"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.name}>
                        {r.name} {r.isSystem ? `(${r.category})` : '⭐ Role Kustom'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="sm:self-end">
                <button
                  type="button"
                  onClick={handleApplyOwnRole}
                  disabled={selectedOwnRole === currentUser.role}
                  className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all ${
                    selectedOwnRole === currentUser.role
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20 active:scale-95'
                  }`}
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Terapkan Perubahan Role</span>
                </button>
              </div>
            </div>

            {/* Role description banner */}
            {(() => {
              const selectedDef = roles.find((r) => r.name === selectedOwnRole || r.id === selectedOwnRole);
              if (!selectedDef) return null;
              return (
                <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-start gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-slate-800">{selectedDef.name}:</span>{' '}
                    {selectedDef.description}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: MATRIKS WEWENANG INTERAKTIF (EDITABLE RBAC MATRIX) */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {/* Table Top Toolbar */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <h2 className="text-sm font-bold text-slate-900">
              Matriks Hak Akses Granular Per Modul
            </h2>
            <span className="text-[11px] text-slate-500 hidden sm:inline">
              (Klik pada kotak status untuk mengubah wewenang secara langsung)
            </span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchModule}
                onChange={(e) => setSearchModule(e.target.value)}
                placeholder="Cari modul..."
                className="text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 w-36 sm:w-44"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs py-1.5 px-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-slate-700"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'ALL' ? 'Semua Kategori' : cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4 min-w-[240px] sticky left-0 bg-slate-50 z-10">
                  Modul / Fitur Aplikasi
                </th>
                {roles.map((r) => {
                  const isCurrent =
                    currentUser.role.toLowerCase() === r.name.toLowerCase() ||
                    currentUser.role.toLowerCase() === r.id.toLowerCase();
                  return (
                    <th
                      key={r.id}
                      className={`py-3 px-3 text-center min-w-[125px] transition-colors ${
                        isCurrent ? 'bg-blue-50/80 border-x border-blue-200' : ''
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <div className="flex items-center gap-1">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getColorClasses(r.color)}`}>
                            {r.name}
                          </span>
                          {!r.isSystem && (
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleOpenEditRoleModal(r)}
                                className="p-0.5 text-slate-400 hover:text-blue-600 rounded"
                                title="Edit Role"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRole(r.id, r.name)}
                                className="p-0.5 text-slate-400 hover:text-rose-600 rounded"
                                title="Hapus Role"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                        {isCurrent && (
                          <span className="text-[9px] font-extrabold uppercase tracking-wider text-blue-600 bg-blue-100/70 px-1.5 py-0.2 rounded-full">
                            Role Anda
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {calculateAllowedCount(r.id)}/{DEFAULT_MODULES.length} Modul
                        </span>
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredModules.map((mod) => (
                <tr key={mod.id} className="hover:bg-slate-50/80 transition-colors group">
                  {/* Module Info */}
                  <td className="py-3 px-4 sticky left-0 bg-white group-hover:bg-slate-50/80 z-10">
                    <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                      {mod.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{mod.description}</div>
                    <span className="inline-block mt-1 text-[9px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                      {mod.category}
                    </span>
                  </td>

                  {/* Role Permissions Toggles */}
                  {roles.map((r) => {
                    const isAllowed = !!permissions[mod.id]?.[r.id];
                    const isCurrent =
                      currentUser.role.toLowerCase() === r.name.toLowerCase() ||
                      currentUser.role.toLowerCase() === r.id.toLowerCase();

                    return (
                      <td
                        key={r.id}
                        className={`py-3 px-3 text-center transition-colors ${
                          isCurrent ? 'bg-blue-50/30 border-x border-blue-100' : ''
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleTogglePermission(mod.id, r.id)}
                          className={`w-8 h-8 rounded-xl inline-flex items-center justify-center transition-all ${
                            isAllowed
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs shadow-emerald-500/20 active:scale-95'
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-400 active:scale-95'
                          }`}
                          title={`Klik untuk ${isAllowed ? 'mencabut' : 'memberikan'} akses "${mod.name}" untuk role ${r.name}`}
                        >
                          {isAllowed ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : (
                            <span className="text-slate-400 font-bold text-xs">-</span>
                          )}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50/80 font-bold text-slate-700 border-t border-slate-200">
                <td className="py-3 px-4 text-xs sticky left-0 bg-slate-50/80 z-10">
                  Total Modul Diizinkan
                </td>
                {roles.map((r) => {
                  const allowed = calculateAllowedCount(r.id);
                  const isCurrent =
                    currentUser.role.toLowerCase() === r.name.toLowerCase() ||
                    currentUser.role.toLowerCase() === r.id.toLowerCase();
                  return (
                    <td
                      key={r.id}
                      className={`py-3 px-3 text-center text-xs ${
                        isCurrent ? 'bg-blue-50/80 border-x border-blue-200 font-extrabold text-blue-700' : ''
                      }`}
                    >
                      <span className="font-mono">{allowed}</span> / {DEFAULT_MODULES.length}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend & Instructions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11px] text-slate-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold text-slate-700">Petunjuk Ikon:</span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-emerald-500 text-white flex items-center justify-center text-[10px]">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span>Akses Diizinkan (Read & Write)</span>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-md bg-slate-200 text-slate-500 flex items-center justify-center text-[10px] font-bold">
                -
              </span>
              <span>Akses Ditutup (Restricted)</span>
            </span>
          </div>

          <div className="text-right">
            <span>Perubahan hak akses disimpan otomatis secara permanen ke sistem.</span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: TAMBAH / EDIT ROLE KUSTOM */}
      {/* ------------------------------------------------------------- */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {editingRoleId ? 'Edit Role & Hak Akses' : 'Tambah Role Kustom Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRole} className="p-5 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Role / Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Supervisor QC & Mutu, Admin Purchasing"
                  value={formRoleName}
                  onChange={(e) => setFormRoleName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Kategori Wewenang
                  </label>
                  <input
                    type="text"
                    placeholder="Misal: Operasional, QC, Logistik"
                    value={formRoleCategory}
                    onChange={(e) => setFormRoleCategory(e.target.value)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Warna Aksen Tag
                  </label>
                  <select
                    value={formRoleColor}
                    onChange={(e) => setFormRoleColor(e.target.value as any)}
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="indigo">Indigo</option>
                    <option value="blue">Blue</option>
                    <option value="emerald">Emerald</option>
                    <option value="purple">Purple</option>
                    <option value="amber">Amber</option>
                    <option value="cyan">Cyan</option>
                    <option value="rose">Rose</option>
                    <option value="slate">Slate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deskripsi Tanggung Jawab
                </label>
                <textarea
                  rows={2}
                  placeholder="Penjelasan wewenang dan batasan peran ini..."
                  value={formRoleDescription}
                  onChange={(e) => setFormRoleDescription(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {/* Checkboxes for Module Permissions */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Pilih Hak Akses Modul untuk Role Ini:
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allOn: Record<string, boolean> = {};
                        DEFAULT_MODULES.forEach((m) => (allOn[m.id] = true));
                        setFormRolePermissions(allOn);
                      }}
                      className="text-[10px] text-blue-600 hover:underline font-semibold"
                    >
                      Pilih Semua
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={() => setFormRolePermissions({})}
                      className="text-[10px] text-slate-500 hover:underline"
                    >
                      Kosongkan
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {DEFAULT_MODULES.map((m) => {
                    const isChecked = !!formRolePermissions[m.id];
                    return (
                      <label
                        key={m.id}
                        className={`flex items-start gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-blue-50/60 border-blue-200 text-slate-900'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) =>
                            setFormRolePermissions((prev) => ({
                              ...prev,
                              [m.id]: e.target.checked,
                            }))
                          }
                          className="rounded text-blue-600 focus:ring-blue-500 mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs">{m.name}</div>
                          <div className="text-[10px] text-slate-400">{m.category}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs"
                >
                  {editingRoleId ? 'Simpan Perubahan Role' : 'Buat Role Baru'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
