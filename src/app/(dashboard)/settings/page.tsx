'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Loader2, Save, User, Shield, Users, Key, RotateCcw, Calendar, 
  ArrowRight, CheckCircle2
} from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface IcsTokenData {
  token: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff',
  });
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  
  // ICSトークン状態確認用
  const [icsToken, setIcsToken] = useState<IcsTokenData>({ token: null, isActive: false, createdAt: null });

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchUsers();
    }
    fetchIcsToken();
  }, [session]);

  const fetchUsers = async () => {
    const data = await fetch('/api/users/all').then((r) => r.json());
    setUsers(data);
  };

  const fetchIcsToken = async () => {
    try {
      const data = await fetch('/api/ics-token').then((r) => r.json());
      setIcsToken(data);
    } catch {
      // トークンがない場合
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('新しいパスワードが一致しません');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      alert('パスワードは8文字以上で入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (res.ok) {
        alert('パスワードを変更しました');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setPasswordDialogOpen(false);
      } else {
        const error = await res.json();
        alert(error.message || 'パスワードの変更に失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (userId: string) => {
    if (resetPassword.length < 8) {
      alert('パスワードは8文字以上で入力してください');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: resetPassword }),
      });

      if (res.ok) {
        alert('パスワードをリセットしました');
        setResetPassword('');
        setResetUserId(null);
        setResetDialogOpen(false);
      } else {
        const error = await res.json();
        alert(error.message || 'パスワードのリセットに失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUserData),
      });

      if (res.ok) {
        setNewUserData({ name: '', email: '', password: '', role: 'staff' });
        fetchUsers();
        alert('ユーザーを作成しました');
      } else {
        const error = await res.json();
        alert(error.message || 'ユーザーの作成に失敗しました');
      }
    } catch {
      alert('エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">設定</h1>
        <p className="text-gray-500">アカウントとシステム設定</p>
      </div>

      {/* プロフィール */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <User className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <CardTitle className="text-gray-800">プロフィール</CardTitle>
              <CardDescription>アカウント情報</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-gray-600">名前</Label>
              <Input
                value={session?.user?.name || ''}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-gray-600">メールアドレス</Label>
              <Input
                value={session?.user?.email || ''}
                disabled
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-gray-600">権限:</Label>
              <Badge
                variant="outline"
                className={
                  session?.user?.role === 'admin'
                    ? 'border-purple-500/50 text-purple-400 bg-purple-500/10'
                    : 'border-blue-500/50 text-blue-400 bg-blue-500/10'
                }
              >
                {session?.user?.role === 'admin' ? '管理者' : 'スタッフ'}
              </Badge>
            </div>

            {/* パスワード変更ダイアログ */}
            <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="border-gray-200">
                  <Key className="h-4 w-4 mr-2" />
                  パスワード変更
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-white border-gray-200 text-gray-800">
                <DialogHeader>
                  <DialogTitle>パスワード変更</DialogTitle>
                </DialogHeader>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-600">現在のパスワード</Label>
                    <Input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, currentPassword: e.target.value })
                      }
                      required
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">新しいパスワード（8文字以上）</Label>
                    <Input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, newPassword: e.target.value })
                      }
                      required
                      minLength={8}
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">新しいパスワード（確認）</Label>
                    <Input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) =>
                        setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                      }
                      required
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-500"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '変更する'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* 外部連携 */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-gray-800">外部連携</CardTitle>
              <CardDescription>他のサービスとの連携設定</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Link href="/settings/google-calendar">
            <div className="flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
                  <Calendar className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800">Googleカレンダー連携</h3>
                    {icsToken.isActive && (
                      <Badge className="bg-green-100 text-green-700 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        連携中
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    訪問予定をGoogleカレンダーで確認できます
                  </p>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
          </Link>
        </CardContent>
      </Card>

      {/* 管理者専用：ユーザー管理 */}
      {session?.user?.role === 'admin' && (
        <>
          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-gray-800">ユーザー作成</CardTitle>
                  <CardDescription>新しいユーザーを追加</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-600">名前</Label>
                    <Input
                      value={newUserData.name}
                      onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                      required
                      placeholder="山田 太郎"
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">メールアドレス</Label>
                    <Input
                      type="email"
                      value={newUserData.email}
                      onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                      required
                      placeholder="user@example.com"
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-gray-600">パスワード（8文字以上）</Label>
                    <Input
                      type="password"
                      value={newUserData.password}
                      onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                      required
                      minLength={8}
                      placeholder="••••••••"
                      className="bg-gray-50 border-gray-200 text-gray-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-600">権限</Label>
                    <select
                      value={newUserData.role}
                      onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                      className="w-full h-10 px-3 rounded-md bg-gray-50 border border-gray-200 text-gray-800"
                    >
                      <option value="staff">スタッフ</option>
                      <option value="admin">管理者</option>
                      <option value="viewer">閲覧のみ</option>
                    </select>
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-purple-500 hover:bg-purple-600"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      ユーザーを作成
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-gray-800">ユーザー一覧</CardTitle>
                  <CardDescription>登録済みユーザー</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                  >
                    <div>
                      <div className="text-gray-800 font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          user.role === 'admin'
                            ? 'border-purple-500/50 text-purple-400'
                            : user.role === 'staff'
                            ? 'border-blue-500/50 text-blue-400'
                            : 'border-slate-500/50 text-gray-500'
                        }
                      >
                        {user.role === 'admin' ? '管理者' : user.role === 'staff' ? 'スタッフ' : '閲覧'}
                      </Badge>
                      {/* パスワードリセットダイアログ */}
                      <Dialog
                        open={resetDialogOpen && resetUserId === user.id}
                        onOpenChange={(open) => {
                          setResetDialogOpen(open);
                          if (!open) setResetUserId(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setResetUserId(user.id)}
                            className="text-gray-500 hover:text-gray-800"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white border-gray-200 text-gray-800">
                          <DialogHeader>
                            <DialogTitle>パスワードリセット: {user.name}</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <Label className="text-gray-600">新しいパスワード（8文字以上）</Label>
                              <Input
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                minLength={8}
                                placeholder="••••••••"
                                className="bg-gray-50 border-gray-200 text-gray-800"
                              />
                            </div>
                            <Button
                              onClick={() => handlePasswordReset(user.id)}
                              disabled={loading || resetPassword.length < 8}
                              className="w-full bg-orange-500 hover:bg-orange-600"
                            >
                              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'リセットする'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                {users.length === 0 && (
                  <p className="text-gray-400 text-center py-4">ユーザーがいません</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
