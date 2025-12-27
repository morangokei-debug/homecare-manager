'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Building2, Plus, Users, UserCheck, Home, Pencil, Trash2, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface Organization {
  id: string;
  name: string;
  code: string;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: string;
  _count: {
    users: number;
    patients: number;
    facilities: number;
  };
}

export default function OrganizationsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchOrganizations = useCallback(async () => {
    try {
      const res = await fetch('/api/organizations');
      if (res.ok) {
        const data = await res.json();
        setOrganizations(data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      if (session?.user?.role !== 'super_admin') {
        router.push('/calendar');
        return;
      }
      fetchOrganizations();
    }
  }, [status, session, router, fetchOrganizations]);

  const openCreateDialog = () => {
    setEditingOrg(null);
    setFormData({ name: '', code: '', phone: '', address: '' });
    setError('');
    setDialogOpen(true);
  };

  const openEditDialog = (org: Organization) => {
    setEditingOrg(org);
    setFormData({
      name: org.name,
      code: org.code,
      phone: org.phone || '',
      address: org.address || '',
    });
    setError('');
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      const url = editingOrg 
        ? `/api/organizations/${editingOrg.id}`
        : '/api/organizations';
      
      const res = await fetch(url, {
        method: editingOrg ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'エラーが発生しました');
        return;
      }

      setDialogOpen(false);
      fetchOrganizations();
    } catch (err) {
      console.error('Failed to save organization:', err);
      setError('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (org: Organization) => {
    if (!confirm(`「${org.name}」を無効化しますか？`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
    }
  };

  const handleReactivate = async (org: Organization) => {
    try {
      const res = await fetch(`/api/organizations/${org.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: org.name,
          code: org.code,
          phone: org.phone,
          address: org.address,
          isActive: true,
        }),
      });

      if (res.ok) {
        fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to reactivate organization:', err);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-stone-500">読み込み中...</div>
      </div>
    );
  }

  if (session?.user?.role !== 'super_admin') {
    return null;
  }

  const activeOrgs = organizations.filter(o => o.isActive);
  const inactiveOrgs = organizations.filter(o => !o.isActive);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <Building2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-stone-800">会社管理</h1>
            <p className="text-sm text-stone-500">登録会社: {activeOrgs.length}社</p>
          </div>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={openCreateDialog}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              新規会社登録
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingOrg ? '会社情報の編集' : '新規会社登録'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="name">会社名 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="例: ○○薬局"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">会社コード *</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toLowerCase() }))}
                  placeholder="例: maru-pharmacy"
                  required
                />
                <p className="text-xs text-stone-500">
                  半角英数字とハイフンのみ。ユーザー識別に使用されます。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">電話番号</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder="例: 03-1234-5678"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">住所</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="例: 東京都千代田区..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {saving ? '保存中...' : '保存'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* 会社一覧 */}
      <div className="space-y-4">
        {activeOrgs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border border-stone-200">
            <Building2 className="h-12 w-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-500">登録されている会社がありません</p>
            <Button
              onClick={openCreateDialog}
              variant="outline"
              className="mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              最初の会社を登録
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {activeOrgs.map((org) => (
              <div
                key={org.id}
                className="bg-white rounded-lg border border-stone-200 p-4 hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg text-stone-800">{org.name}</h3>
                      <span className="text-xs px-2 py-0.5 bg-stone-100 text-stone-600 rounded">
                        {org.code}
                      </span>
                    </div>
                    
                    {(org.phone || org.address) && (
                      <p className="text-sm text-stone-500 mt-1">
                        {org.phone && <span>{org.phone}</span>}
                        {org.phone && org.address && <span className="mx-2">|</span>}
                        {org.address && <span>{org.address}</span>}
                      </p>
                    )}

                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1.5 text-sm text-stone-600">
                        <Users className="h-4 w-4 text-blue-500" />
                        <span>{org._count.users} ユーザー</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-stone-600">
                        <UserCheck className="h-4 w-4 text-emerald-500" />
                        <span>{org._count.patients} 患者</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-stone-600">
                        <Home className="h-4 w-4 text-orange-500" />
                        <span>{org._count.facilities} 施設</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(org)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(org)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 無効化された会社 */}
        {inactiveOrgs.length > 0 && (
          <div className="mt-8">
            <h2 className="text-sm font-medium text-stone-500 mb-3">無効化された会社</h2>
            <div className="grid gap-3">
              {inactiveOrgs.map((org) => (
                <div
                  key={org.id}
                  className="bg-stone-50 rounded-lg border border-stone-200 p-3 opacity-60"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-400" />
                      <span className="text-stone-600">{org.name}</span>
                      <span className="text-xs text-stone-400">({org.code})</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReactivate(org)}
                      className="text-emerald-600 hover:text-emerald-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      有効化
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

