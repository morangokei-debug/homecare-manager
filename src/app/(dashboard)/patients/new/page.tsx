'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, AlertTriangle } from 'lucide-react';
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
  const [selectedFacility, setSelectedFacility] = useState<string>('none');

  const isFacilityPatient = selectedFacility !== 'none';

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
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-800">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">新規患者登録</h1>
          <p className="text-gray-500">患者情報を入力してください</p>
        </div>
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-800">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-gray-600">
                  患者名 <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="山田 太郎"
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nameKana" className="text-gray-600">
                  フリガナ
                </Label>
                <Input
                  id="nameKana"
                  name="nameKana"
                  placeholder="ヤマダ タロウ"
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="facilityId" className="text-gray-600">
                所属施設
              </Label>
              <Select 
                name="facilityId" 
                value={selectedFacility}
                onValueChange={setSelectedFacility}
              >
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
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
              <p className="text-xs text-gray-400">
                施設に所属する場合、カレンダーでの表示は施設の設定に従います
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-600">
                電話番号
              </Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="090-1234-5678"
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>

            {/* 個人宅の場合のみ住所・エリアを表示 */}
            {!isFacilityPatient && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="area" className="text-gray-600">
                    エリア
                  </Label>
                  <Input
                    id="area"
                    name="area"
                    placeholder="東京都新宿区"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-600">
                    住所
                  </Label>
                  <Input
                    id="address"
                    name="address"
                    placeholder="東京都新宿区西新宿1-1-1"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
              </>
            )}

            {/* 訪問時注意事項 - 目立つ表示 */}
            <div className="space-y-2 p-4 rounded-lg border-2 border-amber-300 bg-amber-50">
              <Label htmlFor="visitNotes" className="text-amber-800 font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                訪問時の注意事項
              </Label>
              <Textarea
                id="visitNotes"
                name="visitNotes"
                placeholder="例：スリッパ持参必須、駐車場は建物裏、犬がいる"
                rows={3}
                className="bg-white border-amber-200 text-gray-800 resize-none placeholder:text-amber-400"
              />
              <p className="text-xs text-amber-600">
                ⚠️ ここに入力した内容はカレンダーや予定画面で目立つ形で表示されます
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-600">
                備考
              </Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="特記事項があれば入力してください"
                rows={4}
                className="bg-gray-50 border-gray-200 text-gray-800 resize-none"
              />
            </div>
          </CardContent>
        </Card>

        {/* 関係者情報 */}
        <Card className="bg-white border-gray-200 mt-6">
          <CardHeader>
            <CardTitle className="text-gray-800">関係者情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ケアマネージャー */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">ケアマネージャー</h3>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="careManagerName" className="text-gray-600">
                    氏名
                  </Label>
                  <Input
                    id="careManagerName"
                    name="careManagerName"
                    placeholder="田中 一郎"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="careManagerPhone" className="text-gray-600">
                    連絡先
                  </Label>
                  <Input
                    id="careManagerPhone"
                    name="careManagerPhone"
                    type="tel"
                    placeholder="03-1234-5678"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
              </div>
            </div>

            {/* キーパーソン */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-700 border-b border-gray-200 pb-2">キーパーソン</h3>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="keyPersonName" className="text-gray-600">
                    氏名
                  </Label>
                  <Input
                    id="keyPersonName"
                    name="keyPersonName"
                    placeholder="山田 花子"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyPersonRelation" className="text-gray-600">
                    続柄
                  </Label>
                  <Input
                    id="keyPersonRelation"
                    name="keyPersonRelation"
                    placeholder="長女"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyPersonPhone" className="text-gray-600">
                    連絡先
                  </Label>
                  <Input
                    id="keyPersonPhone"
                    name="keyPersonPhone"
                    type="tel"
                    placeholder="090-1234-5678"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Link href="/patients">
                <Button type="button" variant="outline" className="border-gray-200">
                  キャンセル
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-500 hover:from-emerald-600 hover:to-cyan-600"
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
