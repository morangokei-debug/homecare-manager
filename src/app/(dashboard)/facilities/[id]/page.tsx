'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { updateFacility, deleteFacility } from '@/app/actions/facilities';

interface Facility {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  area: string | null;
  contactPerson: string | null;
  displayMode: string;
  notes: string | null;
}

export default function EditFacilityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [facility, setFacility] = useState<Facility | null>(null);

  const canEdit = session?.user?.role === 'super_admin' || session?.user?.role === 'admin' || session?.user?.role === 'staff';

  useEffect(() => {
    fetch(`/api/facilities/${id}`)
      .then((res) => res.json())
      .then((data) => setFacility(data));
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append('id', id);
    const result = await updateFacility(formData);

    if (result.success) {
      router.push('/facilities');
    } else {
      alert(result.error || '保存に失敗しました');
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('この施設を削除しますか？所属患者は個人宅に変更されます。')) return;
    
    setDeleting(true);
    const result = await deleteFacility(id);

    if (result.success) {
      router.push('/facilities');
    } else {
      alert(result.error || '削除に失敗しました');
      setDeleting(false);
    }
  }

  if (!facility) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ページヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/facilities">
            <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-800">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">施設情報編集</h1>
            <p className="text-gray-500">{facility.name}</p>
          </div>
        </div>
        {canEdit && (
          <Button
            variant="outline"
            onClick={handleDelete}
            disabled={deleting}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            {deleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                削除
              </>
            )}
          </Button>
        )}
      </div>

      {/* フォーム */}
      <form onSubmit={handleSubmit}>
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-800">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-600">
                施設名 <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={facility.name}
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-600">
                  電話番号
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  defaultValue={facility.phone || ''}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="area" className="text-gray-600">
                  エリア
                </Label>
                <Input
                  id="area"
                  name="area"
                  defaultValue={facility.area || ''}
                  className="bg-gray-50 border-gray-200 text-gray-800"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-gray-600">
                住所
              </Label>
              <Input
                id="address"
                name="address"
                defaultValue={facility.address || ''}
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPerson" className="text-gray-600">
                担当者名
              </Label>
              <Input
                id="contactPerson"
                name="contactPerson"
                defaultValue={facility.contactPerson || ''}
                className="bg-gray-50 border-gray-200 text-gray-800"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="displayMode" className="text-gray-600">
                カレンダー表示モード
              </Label>
              <Select name="displayMode" defaultValue={facility.displayMode}>
                <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grouped">施設名でまとめ表示</SelectItem>
                  <SelectItem value="individual">患者ごとに個別表示</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                「まとめ表示」は施設内の複数患者を1つにまとめます。「個別表示」は患者ごとに表示します。
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-600">
                備考
              </Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={facility.notes || ''}
                rows={4}
                className="bg-gray-50 border-gray-200 text-gray-800 resize-none"
              />
            </div>

            {canEdit && (
              <div className="flex justify-end gap-4 pt-4">
                <Link href="/facilities">
                  <Button type="button" variant="outline" className="border-gray-200">
                    キャンセル
                  </Button>
                </Link>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      保存する
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
