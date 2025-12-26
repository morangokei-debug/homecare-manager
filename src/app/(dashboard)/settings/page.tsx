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
import { 
  Loader2, Save, User, Shield, Users, Key, RotateCcw, Calendar, Copy, RefreshCw, 
  Link2, ExternalLink, CheckCircle2, ArrowRight, Smartphone, Monitor, ChevronDown, ChevronUp
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
  
  // ICSトークン関連
  const [icsToken, setIcsToken] = useState<IcsTokenData>({ token: null, isActive: false, createdAt: null });
  const [icsLoading, setIcsLoading] = useState(false);
  const [copied, setCopied] = useState<'visit' | 'rx' | null>(null);
  const [setupStep, setSetupStep] = useState(0); // 0: 未開始, 1: URLコピー済み, 2: 完了
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      setSetupStep(0);
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
      setSetupStep(0);
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
    if (type === 'visit') {
      setSetupStep(1);
    }
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

      {/* Googleカレンダー連携（目立つ位置に移動） */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200 shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center">
              <Calendar className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-gray-800 text-xl">📅 Googleカレンダー連携</CardTitle>
              <CardDescription className="text-gray-600">
                訪問予定をGoogleカレンダーで確認できます
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {!icsToken.token || !icsToken.isActive ? (
            /* トークン未発行時 */
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                  <Link2 className="h-8 w-8 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">連携を始めましょう</h3>
                  <p className="text-gray-500 mt-1">
                    ボタンを押すと、Googleカレンダー用のURLが発行されます
                  </p>
                </div>
                <Button
                  onClick={generateIcsToken}
                  disabled={icsLoading}
                  size="lg"
                  className="bg-blue-500 hover:bg-blue-600 text-white px-8"
                >
                  {icsLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  ) : (
                    <Link2 className="h-5 w-5 mr-2" />
                  )}
                  連携URLを発行する
                </Button>
              </div>
            </div>
          ) : (
            /* トークン発行済み - ステップバイステップガイド */
            <div className="space-y-4">
              {/* ステップ1: URLをコピー */}
              <div className={`bg-white rounded-xl p-5 shadow-sm border-2 transition-all ${
                setupStep >= 1 ? 'border-green-300' : 'border-blue-300'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 1 ? 'bg-green-100' : 'bg-blue-100'
                  }`}>
                    {setupStep >= 1 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <span className="text-blue-600 font-bold">1</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-800">URLをコピー</h4>
                      <p className="text-sm text-gray-500">下のボタンでURLをコピーしてください</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={() => copyToClipboard('visit')}
                        className={`flex-1 ${
                          copied === 'visit' 
                            ? 'bg-green-500 hover:bg-green-600' 
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        {copied === 'visit' ? (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            コピーしました！
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            🏠 訪問予定URLをコピー
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* ステップ2: Googleカレンダーを開く */}
              <div className={`bg-white rounded-xl p-5 shadow-sm border-2 transition-all ${
                setupStep >= 2 ? 'border-green-300' : setupStep >= 1 ? 'border-blue-300' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 2 ? 'bg-green-100' : setupStep >= 1 ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {setupStep >= 2 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : (
                      <span className={`font-bold ${setupStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>2</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className={`font-semibold ${setupStep >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>
                        Googleカレンダーに追加
                      </h4>
                      <p className={`text-sm ${setupStep >= 1 ? 'text-gray-500' : 'text-gray-400'}`}>
                        下のリンクを開いて、コピーしたURLを貼り付けてください
                      </p>
                    </div>
                    <a
                      href="https://calendar.google.com/calendar/r/settings/addbyurl"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setupStep >= 1 && setSetupStep(2)}
                      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
                        setupStep >= 1
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Googleカレンダー設定を開く
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ステップ3: 完了確認 */}
              <div className={`bg-white rounded-xl p-5 shadow-sm border-2 transition-all ${
                setupStep >= 2 ? 'border-blue-300' : 'border-gray-200'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 2 ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    <span className={`font-bold ${setupStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>3</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className={`font-semibold ${setupStep >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>
                        設定完了！
                      </h4>
                      <p className={`text-sm ${setupStep >= 2 ? 'text-gray-500' : 'text-gray-400'}`}>
                        Googleカレンダーで「カレンダーを追加」を押したら完了です
                      </p>
                    </div>
                    {setupStep >= 2 && (
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">💡</div>
                          <div className="text-sm text-blue-700">
                            <p className="font-medium">反映には時間がかかります</p>
                            <p className="mt-1 text-blue-600">
                              Googleカレンダーへの反映は数分〜数時間かかる場合があります。
                              すぐに表示されなくても、しばらくお待ちください。
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 詳細設定（折りたたみ） */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-5 py-3 flex items-center justify-between text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-medium">詳細設定・処方予定URL</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
                
                {showAdvanced && (
                  <div className="px-5 pb-5 space-y-4 border-t border-gray-100">
                    {/* 処方予定URL */}
                    <div className="pt-4 space-y-2">
                      <Label className="text-gray-600 text-sm">💊 処方予定URL（オプション）</Label>
                      <div className="flex gap-2">
                        <Input
                          value={getIcsUrl('rx')}
                          readOnly
                          className="bg-gray-50 border-gray-200 text-gray-600 text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard('rx')}
                          className="shrink-0 border-gray-200"
                        >
                          {copied === 'rx' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-xs text-gray-400">
                        処方予定も別カレンダーとして追加できます
                      </p>
                    </div>

                    {/* トークン管理 */}
                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
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
                      <p className="text-xs text-gray-400 mt-2">
                        ※ 再発行するとURLが変わります。Googleカレンダーで再設定が必要です。
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ヒント */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="bg-white rounded-lg p-4 flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">PCで設定</p>
                    <p className="text-xs text-gray-500">
                      Googleカレンダーの設定はPCのブラウザからがおすすめです
                    </p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-4 flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">スマホで確認</p>
                    <p className="text-xs text-gray-500">
                      設定後はスマホのGoogleカレンダーアプリでも見られます
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

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
