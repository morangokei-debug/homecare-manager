'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { createPatient } from '@/app/actions/patients';

interface Facility {
  id: string;
  name: string;
}

export default function NewPatientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  useEffect(() => {
    fetch('/api/facilities')
      .then((res) => res.json())
      .then((data) => setFacilities(data));
  }, []);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await createPatient(formData);

    if (result.success) {
      router.push('/patients');
    } else {
      alert(result.error || '保存に失敗しました');
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center gap-4">
        <Link href="/patients">
          <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">新規患者登録</h1>
          <p className="text-slate-400">患者情報を入力してください</p>
        </div>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-slate-300">
                  患者名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="山田 太郎"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameKana" className="text-slate-300">
                  フリガナ
                </Label>
                <Input
                  id="nameKana"
                  name="nameKana"
                  placeholder="ヤマダ タロウ"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="facilityId" className="text-slate-300">
                  所属施設
                </Label>
                <Select name="facilityId">
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue placeholder="個人宅（施設なし）" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">個人宅（施設なし）</SelectItem>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayMode" className="text-slate-300">
                  カレンダー表示
                </Label>
                <Select name="displayMode" defaultValue="individual">
                  <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="individual">個人名で表示</SelectItem>
                    <SelectItem value="facility">施設名で表示</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-slate-300">
                  電話番号
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="090-1234-5678"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area" className="text-slate-300">
                  エリア
                </Label>
                <Input
                  id="area"
                  name="area"
                  placeholder="東京都新宿区"
                  className="bg-slate-700/50 border-slate-600 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-slate-300">
                住所
              </Label>
              <Input
                id="address"
                name="address"
                placeholder="東京都新宿区西新宿1-1-1"
                className="bg-slate-700/50 border-slate-600 text-white"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-slate-300">
                備考
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="特記事項があれば入力してください"
                rows={4}
                className="bg-slate-700/50 border-slate-600 text-white resize-none"
              />
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/patients">
                <Button type="button" variant="outline" className="border-slate-600">
                  キャンセル
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    登録する
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

