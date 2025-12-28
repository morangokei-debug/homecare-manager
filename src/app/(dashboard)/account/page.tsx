'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { User, Key, Save, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export default function AccountPage() {
  const { data: session, update } = useSession();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // プロフィール
  const [name, setName] = useState('');

  // パスワード変更
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (session?.user?.name) {
      setName(session.user.name);
    }
  }, [session]);

  const showSuccess = (message: string) => {
    setSuccess(message);
    setError(null);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'プロフィールの更新に失敗しました');
        return;
      }

      // セッションを更新
      await update({ name });
      showSuccess('プロフィールを更新しました');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || data.message || 'パスワードの変更に失敗しました');
        return;
      }

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('パスワードを変更しました');
    } catch (err) {
      console.error('Failed to change password:', err);
      setError('パスワードの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const roleLabel = {
    super_admin: 'システム管理者',
    admin: '管理者',
    staff: 'スタッフ',
    viewer: '閲覧者',
  }[session?.user?.role || 'viewer'];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* ヘッダー */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-emerald-100 rounded-lg">
          <User className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-stone-800">アカウント設定</h1>
          <p className="text-sm text-stone-500">{session?.user?.email}</p>
        </div>
      </div>

      {/* 成功メッセージ */}
      {success && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700">
          <CheckCircle className="h-5 w-5" />
          {success}
        </div>
      )}

      {/* エラーメッセージ */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* プロフィール */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">プロフィール</CardTitle>
            <CardDescription>表示名と権限を確認・変更できます</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">表示名</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="山田 太郎"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>メールアドレス</Label>
                <Input
                  value={session?.user?.email || ''}
                  disabled
                  className="bg-stone-50"
                />
                <p className="text-xs text-stone-500">メールアドレスは変更できません</p>
              </div>

              <div className="space-y-2">
                <Label>権限</Label>
                <div className="px-3 py-2 bg-stone-50 rounded-lg text-stone-700">
                  {roleLabel}
                </div>
              </div>

              <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    プロフィールを保存
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* パスワード変更 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Key className="h-5 w-5" />
              パスワード変更
            </CardTitle>
            <CardDescription>定期的にパスワードを変更することをお勧めします</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">現在のパスワード</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">新しいパスワード</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="6文字以上"
                  required
                  minLength={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">新しいパスワード（確認）</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  required
                  minLength={6}
                />
              </div>

              <Button type="submit" disabled={loading} variant="outline">
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    変更中...
                  </>
                ) : (
                  'パスワードを変更'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

