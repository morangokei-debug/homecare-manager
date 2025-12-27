'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      console.log('signIn result:', result);

      if (result?.error) {
        console.log('Login error:', result.error);
        setError(`エラー: ${result.error}`);
      } else if (result?.ok) {
        // ハードリダイレクトでページを完全にリロード
        window.location.href = '/calendar';
      } else {
        setError('不明なエラーが発生しました');
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('ログインに失敗しました');
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
          <CardTitle className="text-2xl font-bold text-gray-800">Homecare Manager</CardTitle>
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
                placeholder="admin@homecare.local"
                required
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
                className="bg-gray-50 border-gray-200 text-gray-800 placeholder:text-gray-400"
              />
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


