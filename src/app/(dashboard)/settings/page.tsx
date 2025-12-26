'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
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
import { Loader2, Save, User, Shield, Users, Key, RotateCcw, Calendar, Copy, RefreshCw, Link2, ExternalLink } from 'lucide-react';

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
  
  // ICSトークン関連
  const [icsToken, setIcsToken] = useState<IcsTokenData>({ token: null, isActive: false, createdAt: null });
  const [icsLoading, setIcsLoading] = useState(false);
  const [copied, setCopied] = useState<'visit' | 'rx' | null>(null);

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

  const generateIcsToken = async () => {
    setIcsLoading(true);
    try {
      const data = await fetch('/api/ics-token', { method: 'POST' }).then((r) => r.json());
      setIcsToken(data);
    } catch {
      alert('トークンの発行に失敗しました');
    } finally {
      setIcsLoading(false);
    }
  };

  const revokeIcsToken = async () => {
    if (!confirm('トークンを無効化すると、Googleカレンダーでの購読が停止します。よろしいですか？')) return;
    
    setIcsLoading(true);
    try {
      await fetch('/api/ics-token', { method: 'DELETE' });
      setIcsToken({ token: null, isActive: false, createdAt: null });
    } catch {
      alert('トークンの無効化に失敗しました');
    } finally {
      setIcsLoading(false);
    }
  };

  const getIcsUrl = (type: 'visit' | 'rx') => {
    if (!icsToken.token) return '';
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    return type === 'visit'
      ? `${baseUrl}/api/calendar/visits.ics?token=${icsToken.token}`
      : `${baseUrl}/api/calendar/prescriptions.ics?token=${icsToken.token}`;
  };

  const copyToClipboard = async (type: 'visit' | 'rx') => {
    const url = getIcsUrl(type);
    await navigator.clipboard.writeText(url);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
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

      {/* Googleカレンダー連携 */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <CardTitle className="text-gray-800">Googleカレンダー連携</CardTitle>
              <CardDescription>ICS購読URLでGoogleカレンダーに予定を表示</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!icsToken.token || !icsToken.isActive ? (
            <div className="text-center py-6">
              <p className="text-gray-500 mb-4">
                トークンを発行すると、Googleカレンダーで訪問予定を閲覧できます
              </p>
              <Button
                onClick={generateIcsToken}
                disabled={icsLoading}
                className="bg-blue-500 hover:bg-blue-600"
              >
                {icsLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-4 w-4 mr-2" />
                )}
                トークンを発行
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 訪問予定URL */}
              <div className="space-y-2">
                <Label className="text-gray-600 flex items-center gap-2">
                  🏠 訪問予定
                  <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                    推奨
                  </Badge>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={getIcsUrl('visit')}
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-600 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard('visit')}
                    className="shrink-0 border-gray-200"
                  >
                    {copied === 'visit' ? (
                      <span className="text-emerald-500 text-xs">✓</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 処方予定URL */}
              <div className="space-y-2">
                <Label className="text-gray-600">💊 処方予定</Label>
                <div className="flex gap-2">
                  <Input
                    value={getIcsUrl('rx')}
                    readOnly
                    className="bg-gray-50 border-gray-200 text-gray-600 text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard('rx')}
                    className="shrink-0 border-gray-200"
                  >
                    {copied === 'rx' ? (
                      <span className="text-emerald-500 text-xs">✓</span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* 使い方 */}
              <div className="rounded-lg bg-blue-50 p-4 text-sm">
                <p className="font-medium text-blue-800 mb-2">📱 Googleカレンダーへの追加手順</p>
                <ol className="list-decimal list-inside text-blue-700 space-y-1">
                  <li>上のURLをコピー</li>
                  <li>
                    <a
                      href="https://calendar.google.com/calendar/r/settings/addbyurl"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline inline-flex items-center gap-1"
                    >
                      Googleカレンダー設定
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    を開く
                  </li>
                  <li>「URLで追加」にURLを貼り付けて「カレンダーを追加」</li>
                </ol>
                <p className="mt-2 text-blue-600 text-xs">
                  ※ 反映には数分〜数時間かかる場合があります
                </p>
              </div>

              {/* トークン管理 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <div className="text-sm text-gray-500">
                  発行日: {icsToken.createdAt ? new Date(icsToken.createdAt).toLocaleDateString('ja-JP') : '-'}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateIcsToken}
                    disabled={icsLoading}
                    className="border-gray-200 text-gray-600"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    再発行
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={revokeIcsToken}
                    disabled={icsLoading}
                    className="border-red-200 text-red-500 hover:bg-red-50"
                  >
                    無効化
                  </Button>
                </div>
              </div>
            </div>
          )}
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
