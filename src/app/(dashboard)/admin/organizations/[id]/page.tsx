'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { 
  Building2, Users, UserCheck, Home, CalendarDays, 
  ArrowLeft, Mail, Phone, MapPin, Plus, Trash2,
  Eye, Calendar, UserPlus, Key
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrganizationDetail {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  users: {
    id: string;
    email: string;
    name: string;
    role: string;
    isActive: boolean;
  }[];
  _count: {
    patients: number;
    facilities: number;
  };
}

interface Stats {
  totalEvents: number;
  thisMonthEvents: number;
  upcomingVisits: number;
  upcomingPrescriptions: number;
}

export default function OrganizationDetailPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = use(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organization, setOrganization] = useState<OrganizationDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{ id: string; name: string } | null>(null);
  const [newUserData, setNewUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: 'staff',
  });
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrganization = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setOrganization(data);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    }
  }, [id]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`/api/organizations/${id}/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [id]);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'super_admin') {
        router.push('/calendar');
        return;
      }
      Promise.all([fetchOrganization(), fetchStats()]).finally(() => setLoading(false));
    }
  }, [status, session, router, fetchOrganization, fetchStats]);

  const generatePassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/organizations/${id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      setUserDialogOpen(false);
      setNewUserData({ email: '', name: '', password: '', role: 'staff' });
      fetchOrganization();
    } catch (err) {
      console.error('Failed to add user:', err);
      setError('ユーザーの追加に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    
    setError('');
    setSaving(true);

    try {
      const res = await fetch(`/api/users/${selectedUser.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      setResetPasswordDialogOpen(false);
      setNewPassword('');
      setSelectedUser(null);
      alert('パスワードをリセットしました');
    } catch (err) {
      console.error('Failed to reset password:', err);
      setError('パスワードリセットに失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`「${userName}」を削除しますか？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${id}/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchOrganization();
      }
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  const handleViewAsOrg = () => {
    // セッションストレージに閲覧対象の組織を保存
    sessionStorage.setItem('viewAsOrganization', id);
    sessionStorage.setItem('viewAsOrganizationName', organization?.name || '');
    router.push('/calendar');
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">読み込み中...</div>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6">
        <p className="text-stone-500">会社が見つかりません</p>
      </div>
    );
  }

  const roleLabels: Record<string, string> = {
    admin: '管理者',
    staff: 'スタッフ',
    viewer: '閲覧のみ',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="mb-6">
        <Link 
          href="/admin/organizations"
          className="inline-flex items-center text-sm text-stone-500 hover:text-stone-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          会社一覧に戻る
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <Building2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-stone-800">{organization.name}</h1>
              <div className="flex items-center gap-3 text-sm text-stone-500 mt-1">
                <span className="font-mono bg-stone-100 px-2 py-0.5 rounded">{organization.code}</span>
                {organization.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {organization.phone}
                  </span>
                )}
                {organization.address && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {organization.address}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleViewAsOrg}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Eye className="h-4 w-4 mr-2" />
            この会社として閲覧
          </Button>
        </div>
      </div>

      {/* 統計カード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <Users className="h-4 w-4" />
            ユーザー数
          </div>
          <p className="text-2xl font-bold text-stone-800">{organization.users.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <UserCheck className="h-4 w-4" />
            患者数
          </div>
          <p className="text-2xl font-bold text-stone-800">{organization._count.patients}</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <Home className="h-4 w-4" />
            施設数
          </div>
          <p className="text-2xl font-bold text-stone-800">{organization._count.facilities}</p>
        </div>
        <div className="bg-white rounded-lg border border-stone-200 p-4">
          <div className="flex items-center gap-2 text-stone-500 text-sm mb-1">
            <CalendarDays className="h-4 w-4" />
            今月の予定
          </div>
          <p className="text-2xl font-bold text-stone-800">{stats?.thisMonthEvents || 0}</p>
        </div>
      </div>

      {/* ユーザー管理 */}
      <div className="bg-white rounded-lg border border-stone-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg text-stone-800">ユーザー一覧</h2>
          <Button
            size="sm"
            onClick={() => {
              setNewUserData({ email: '', name: '', password: generatePassword(), role: 'staff' });
              setError('');
              setUserDialogOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            ユーザー追加
          </Button>
        </div>

        <div className="space-y-2">
          {organization.users.map((user) => (
            <div
              key={user.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                user.isActive ? 'bg-stone-50 border-stone-200' : 'bg-red-50 border-red-200 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                  <span className="text-sm font-medium text-emerald-700">
                    {user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-stone-800">{user.name}</p>
                  <div className="flex items-center gap-2 text-sm text-stone-500">
                    <Mail className="h-3.5 w-3.5" />
                    {user.email}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-1 rounded ${
                  user.role === 'admin' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-stone-100 text-stone-600'
                }`}>
                  {roleLabels[user.role] || user.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedUser({ id: user.id, name: user.name });
                    setNewPassword(generatePassword());
                    setError('');
                    setResetPasswordDialogOpen(true);
                  }}
                  className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                >
                  <Key className="h-4 w-4" />
                </Button>
                {user.role !== 'admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteUser(user.id, user.name)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ユーザー追加ダイアログ */}
      <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ユーザー追加</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4 mt-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="userEmail">メールアドレス *</Label>
              <Input
                id="userEmail"
                type="email"
                value={newUserData.email}
                onChange={(e) => setNewUserData(prev => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">氏名 *</Label>
              <Input
                id="userName"
                value={newUserData.name}
                onChange={(e) => setNewUserData(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="userPassword">パスワード *</Label>
              <div className="flex gap-2">
                <Input
                  id="userPassword"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewUserData(prev => ({ ...prev, password: generatePassword() }))}
                >
                  自動生成
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userRole">権限</Label>
              <Select
                value={newUserData.role}
                onValueChange={(value) => setNewUserData(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">スタッフ</SelectItem>
                  <SelectItem value="viewer">閲覧のみ</SelectItem>
                  <SelectItem value="admin">管理者</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUserDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? '追加中...' : '追加'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* パスワードリセットダイアログ */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>パスワードリセット</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4 mt-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <p className="text-sm text-stone-600">
              <strong>{selectedUser?.name}</strong> のパスワードをリセットします
            </p>

            <div className="space-y-2">
              <Label htmlFor="newPassword">新しいパスワード *</Label>
              <div className="flex gap-2">
                <Input
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewPassword(generatePassword())}
                >
                  自動生成
                </Button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setResetPasswordDialogOpen(false)}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {saving ? 'リセット中...' : 'リセット'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

