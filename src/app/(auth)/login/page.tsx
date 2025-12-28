'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 保存されたメールアドレスを読み込む
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // メールアドレスの記憶設定
    if (rememberEmail) {
      localStorage.setItem('rememberedEmail', email);
    } else {
      localStorage.removeItem('rememberedEmail');
    }

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // エラーメッセージを日本語に変換
        if (result.error === 'CredentialsSignin') {
          setError('メールアドレスまたはパスワードが正しくありません');
        } else if (result.error === 'Configuration') {
          setError('システム設定にエラーがあります。管理者にお問い合わせください');
        } else {
          setError('ログインに失敗しました。入力内容をご確認ください');
        }
      } else if (result?.ok) {
        // ハードリダイレクトでページを完全にリロード
        window.location.href = '/calendar';
      } else {
        setError('ログインに失敗しました');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('通信エラーが発生しました。ネットワーク接続をご確認ください');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100">
      <Card className="w-full max-w-md mx-4 bg-white/80 border-gray-200 backdrop-blur shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🏠</span>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">Homecare Note</CardTitle>
          <CardDescription className="text-gray-500">
            在宅訪問・処方管理システム
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@company.com"
                required
                autoComplete="email"
                className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-gray-700">パスワード</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400"
              />
            </div>
            
            {/* メールアドレス記憶チェックボックス */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberEmail}
                onCheckedChange={(checked) => setRememberEmail(checked === true)}
              />
              <Label 
                htmlFor="remember" 
                className="text-sm text-gray-600 cursor-pointer"
              >
                メールアドレスを記憶する
              </Label>
            </div>
            
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">
                {error}
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold shadow-md"
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
