'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, Calendar, Copy, RefreshCw, Link2, ExternalLink, CheckCircle2, 
  ArrowRight, Smartphone, Monitor, ChevronDown, ChevronUp, ArrowLeft
} from 'lucide-react';

interface IcsTokenData {
  token: string | null;
  isActive: boolean;
  createdAt: string | null;
}

export default function GoogleCalendarSettingsPage() {
  const [icsToken, setIcsToken] = useState<IcsTokenData>({ token: null, isActive: false, createdAt: null });
  const [icsLoading, setIcsLoading] = useState(false);
  const [copied, setCopied] = useState<'visit' | 'rx' | null>(null);
  const [setupStep, setSetupStep] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    fetchIcsToken();
  }, []);

  const fetchIcsToken = async () => {
    try {
      const data = await fetch('/api/ics-token').then((r) => r.json());
      setIcsToken(data);
    } catch {
      // トークンがない場合
    } finally {
      setInitialLoading(false);
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

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* 戻るリンク */}
      <Link 
        href="/settings" 
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        設定に戻る
      </Link>

      {/* ページヘッダー */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
          <Calendar className="h-7 w-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Googleカレンダー連携</h1>
          <p className="text-gray-500">訪問予定をGoogleカレンダーで確認</p>
        </div>
      </div>

      {/* メインコンテンツ */}
      <Card className="bg-white border-gray-200 shadow-sm">
        <CardContent className="pt-6 space-y-6">
          {!icsToken.token || !icsToken.isActive ? (
            /* トークン未発行時 */
            <div className="text-center py-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-blue-100 flex items-center justify-center">
                <Link2 className="h-10 w-10 text-blue-500" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-gray-800">連携を始めましょう</h3>
                <p className="text-gray-500 max-w-sm mx-auto">
                  ボタンを押すと、Googleカレンダーで訪問予定を見るための専用URLが発行されます
                </p>
              </div>
              <Button
                onClick={generateIcsToken}
                disabled={icsLoading}
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white px-10"
              >
                {icsLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Link2 className="h-5 w-5 mr-2" />
                )}
                連携URLを発行する
              </Button>
              
              {/* 説明 */}
              <div className="pt-6 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  💡 発行されたURLをGoogleカレンダーに登録すると、<br />
                  このアプリの予定がGoogleカレンダーにも表示されます
                </p>
              </div>
            </div>
          ) : (
            /* トークン発行済み - ステップバイステップガイド */
            <div className="space-y-5">
              {/* ステップ1: URLをコピー */}
              <div className={`rounded-xl p-5 border-2 transition-all ${
                setupStep >= 1 ? 'border-green-300 bg-green-50/50' : 'border-blue-300 bg-blue-50/50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 1 ? 'bg-green-500' : 'bg-blue-500'
                  }`}>
                    {setupStep >= 1 ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <span className="text-white font-bold">1</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className="font-semibold text-gray-800 text-lg">URLをコピー</h4>
                      <p className="text-sm text-gray-500">下のボタンでURLをコピーしてください</p>
                    </div>
                    <Button
                      onClick={() => copyToClipboard('visit')}
                      size="lg"
                      className={`w-full sm:w-auto ${
                        copied === 'visit' 
                          ? 'bg-green-500 hover:bg-green-600' 
                          : 'bg-blue-500 hover:bg-blue-600'
                      }`}
                    >
                      {copied === 'visit' ? (
                        <>
                          <CheckCircle2 className="h-5 w-5 mr-2" />
                          コピーしました！
                        </>
                      ) : (
                        <>
                          <Copy className="h-5 w-5 mr-2" />
                          🏠 訪問予定URLをコピー
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {/* ステップ2: Googleカレンダーを開く */}
              <div className={`rounded-xl p-5 border-2 transition-all ${
                setupStep >= 2 ? 'border-green-300 bg-green-50/50' : setupStep >= 1 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 2 ? 'bg-green-500' : setupStep >= 1 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {setupStep >= 2 ? (
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    ) : (
                      <span className={`font-bold ${setupStep >= 1 ? 'text-white' : 'text-gray-500'}`}>2</span>
                    )}
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className={`font-semibold text-lg ${setupStep >= 1 ? 'text-gray-800' : 'text-gray-400'}`}>
                        Googleカレンダーに追加
                      </h4>
                      <p className={`text-sm ${setupStep >= 1 ? 'text-gray-500' : 'text-gray-400'}`}>
                        リンクを開いて、コピーしたURLを貼り付け
                      </p>
                    </div>
                    <a
                      href="https://calendar.google.com/calendar/r/settings/addbyurl"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setupStep >= 1 && setSetupStep(2)}
                      className={`inline-flex items-center gap-2 px-5 py-3 rounded-lg font-medium transition-all ${
                        setupStep >= 1
                          ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed pointer-events-none'
                      }`}
                    >
                      <ExternalLink className="h-5 w-5" />
                      Googleカレンダー設定を開く
                      <ArrowRight className="h-5 w-5" />
                    </a>
                  </div>
                </div>
              </div>

              {/* ステップ3: 完了 */}
              <div className={`rounded-xl p-5 border-2 transition-all ${
                setupStep >= 2 ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    setupStep >= 2 ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    <span className={`font-bold ${setupStep >= 2 ? 'text-white' : 'text-gray-500'}`}>3</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <h4 className={`font-semibold text-lg ${setupStep >= 2 ? 'text-gray-800' : 'text-gray-400'}`}>
                        設定完了！
                      </h4>
                      <p className={`text-sm ${setupStep >= 2 ? 'text-gray-500' : 'text-gray-400'}`}>
                        「カレンダーを追加」を押したら完了です
                      </p>
                    </div>
                    {setupStep >= 2 && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">⏳</div>
                          <div className="text-sm text-amber-800">
                            <p className="font-medium">反映には少し時間がかかります</p>
                            <p className="mt-1 text-amber-700">
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

              {/* ヒント */}
              <div className="grid gap-3 sm:grid-cols-2 pt-2">
                <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">PCで設定がおすすめ</p>
                    <p className="text-xs text-gray-500">
                      Googleカレンダーの設定はPCのブラウザからが簡単です
                    </p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 flex items-start gap-3">
                  <Smartphone className="h-5 w-5 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">スマホでも確認OK</p>
                    <p className="text-xs text-gray-500">
                      設定後はスマホのGoogleカレンダーでも見られます
                    </p>
                  </div>
                </div>
              </div>

              {/* 詳細設定（折りたたみ） */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="w-full px-5 py-4 flex items-center justify-between text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium">詳細設定</span>
                  {showAdvanced ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </button>
                
                {showAdvanced && (
                  <div className="px-5 pb-5 space-y-5 border-t border-gray-100">
                    {/* 処方予定URL */}
                    <div className="pt-4 space-y-2">
                      <Label className="text-gray-700 font-medium">💊 処方予定URL（オプション）</Label>
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
                      <p className="text-xs text-gray-500">
                        処方予定も別カレンダーとして追加できます
                      </p>
                    </div>

                    {/* トークン管理 */}
                    <div className="pt-4 border-t border-gray-100">
                      <Label className="text-gray-700 font-medium">トークン管理</Label>
                      <div className="mt-3 flex items-center justify-between">
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
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}



