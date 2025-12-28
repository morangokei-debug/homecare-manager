'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import {
  Camera,
  Upload,
  FileText,
  Image,
  Trash2,
  Download,
  Eye,
  Loader2,
  Plus,
  X,
  FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface PatientDocument {
  id: string;
  type: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  description: string | null;
  uploadedAt: string;
  uploader?: { name: string };
}

interface Props {
  patientId: string;
}

const DOCUMENT_TYPES = {
  facesheet: { label: 'フェイスシート', color: 'bg-blue-500' },
  report: { label: '他職種報告書', color: 'bg-green-500' },
  prescription: { label: '処方箋', color: 'bg-purple-500' },
  consent: { label: '同意書', color: 'bg-orange-500' },
  photo: { label: '写真', color: 'bg-pink-500' },
  other: { label: 'その他', color: 'bg-gray-500' },
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PatientDocuments({ patientId }: Props) {
  const { data: session } = useSession();
  const [documents, setDocuments] = useState<PatientDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    type: 'other',
    description: '',
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const canEdit = session?.user?.role === 'super_admin' || session?.user?.role === 'admin' || session?.user?.role === 'staff';

  useEffect(() => {
    fetchDocuments();
  }, [patientId]);

  async function fetchDocuments() {
    try {
      const res = await fetch(`/api/documents?patientId=${patientId}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpload() {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('patientId', patientId);
      formData.append('type', uploadForm.type);
      formData.append('description', uploadForm.description);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadDialogOpen(false);
        setSelectedFile(null);
        setUploadForm({ type: 'other', description: '' });
        fetchDocuments();
      } else {
        const error = await res.json();
        alert(error.error || 'アップロードに失敗しました');
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('アップロードに失敗しました');
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(docId: string) {
    if (!confirm('このファイルを削除しますか？')) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        fetchDocuments();
      } else {
        alert('削除に失敗しました');
      }
    } catch (error) {
      console.error('Delete failed:', error);
      alert('削除に失敗しました');
    }
  }

  async function handlePreview(docId: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        setPreviewUrl(data.url);
        setPreviewType(data.document.mimeType);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    }
  }

  async function handleDownload(docId: string, fileName: string) {
    try {
      const res = await fetch(`/api/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        const link = document.createElement('a');
        link.href = data.url;
        link.download = fileName;
        link.click();
      }
    } catch (error) {
      console.error('Download failed:', error);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // 画像の場合は自動的に写真タイプを選択
      if (file.type.startsWith('image/')) {
        setUploadForm((prev) => ({ ...prev, type: 'photo' }));
      }
    }
  }

  function openUploadDialog(mode: 'file' | 'camera') {
    setUploadDialogOpen(true);
    setSelectedFile(null);
    setUploadForm({ type: 'other', description: '' });

    // 次のフレームでinputをクリック
    setTimeout(() => {
      if (mode === 'camera' && cameraInputRef.current) {
        cameraInputRef.current.click();
      }
    }, 100);
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';

  return (
    <>
      <Card className="bg-white border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-gray-800 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            ドキュメント・写真
            <Badge variant="secondary" className="ml-2">
              {documents.length}件
            </Badge>
          </CardTitle>
          {canEdit && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openUploadDialog('camera')}
                className="border-gray-200"
              >
                <Camera className="h-4 w-4 mr-2" />
                カメラで撮影
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setUploadDialogOpen(true);
                  setSelectedFile(null);
                  setUploadForm({ type: 'other', description: '' });
                }}
                className="border-gray-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                ファイル選択
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>まだドキュメントがありません</p>
              {canEdit && (
                <p className="text-sm mt-1">
                  上のボタンからファイルをアップロードしてください
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      {isImage(doc.mimeType) ? (
                        <Image className="h-8 w-8 text-pink-400" />
                      ) : isPdf(doc.mimeType) ? (
                        <FileText className="h-8 w-8 text-red-400" />
                      ) : (
                        <FileIcon className="h-8 w-8 text-gray-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-800 font-medium truncate">
                          {doc.fileName}
                        </span>
                        <Badge
                          variant="secondary"
                          className={`${
                            DOCUMENT_TYPES[doc.type as keyof typeof DOCUMENT_TYPES]?.color ||
                            'bg-gray-500'
                          } text-gray-800 text-xs`}
                        >
                          {DOCUMENT_TYPES[doc.type as keyof typeof DOCUMENT_TYPES]?.label ||
                            doc.type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>
                          {format(new Date(doc.uploadedAt), 'M/d HH:mm', { locale: ja })}
                        </span>
                        {doc.uploader && (
                          <>
                            <span>•</span>
                            <span>{doc.uploader.name}</span>
                          </>
                        )}
                      </div>
                      {doc.description && (
                        <p className="text-xs text-gray-500 mt-1 truncate">
                          {doc.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handlePreview(doc.id)}
                      className="h-8 w-8 text-gray-500 hover:text-gray-800"
                      title="プレビュー"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(doc.id, doc.fileName)}
                      className="h-8 w-8 text-gray-500 hover:text-gray-800"
                      title="ダウンロード"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(doc.id)}
                        className="h-8 w-8 text-gray-500 hover:text-red-400"
                        title="削除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* アップロードダイアログ */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="bg-white border-gray-200 text-gray-800">
          <DialogHeader>
            <DialogTitle>ファイルアップロード</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 隠しinput: ファイル選択用 */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* 隠しinput: カメラ撮影用（モバイル） */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* ファイル選択エリア */}
            {!selectedFile ? (
              <div className="space-y-3">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-slate-500 transition-colors"
                >
                  <Upload className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                  <p className="text-gray-600">クリックしてファイルを選択</p>
                  <p className="text-xs text-gray-400 mt-1">
                    PDF, JPEG, PNG, HEIC (最大10MB)
                  </p>
                </div>

                <div className="text-center text-gray-400">または</div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cameraInputRef.current?.click()}
                  className="w-full border-gray-200"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  カメラで撮影
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 選択されたファイル表示 */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="h-8 w-8 text-pink-400" />
                  ) : (
                    <FileText className="h-8 w-8 text-red-400" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-800 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedFile(null)}
                    className="text-gray-500 hover:text-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* ドキュメント種別 */}
                <div className="space-y-2">
                  <Label className="text-gray-600">ドキュメント種別</Label>
                  <Select
                    value={uploadForm.type}
                    onValueChange={(value) =>
                      setUploadForm((prev) => ({ ...prev, type: value }))
                    }
                  >
                    <SelectTrigger className="bg-gray-50 border-gray-200 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DOCUMENT_TYPES).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 説明 */}
                <div className="space-y-2">
                  <Label className="text-gray-600">説明（任意）</Label>
                  <Input
                    value={uploadForm.description}
                    onChange={(e) =>
                      setUploadForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="例: 2024年1月の検査結果"
                    className="bg-gray-50 border-gray-200 text-gray-800"
                    maxLength={200}
                  />
                </div>

                {/* アップロードボタン */}
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setUploadDialogOpen(false)}
                    className="border-gray-200"
                  >
                    キャンセル
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-emerald-500"
                  >
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    アップロード
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* プレビューダイアログ */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="bg-white border-gray-200 text-gray-800 max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>プレビュー</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
            {previewUrl && previewType.startsWith('image/') && (
              <img
                src={previewUrl}
                alt="Preview"
                className="max-w-full max-h-[65vh] object-contain"
              />
            )}
            {previewUrl && previewType === 'application/pdf' && (
              <iframe
                src={previewUrl}
                className="w-full h-[65vh]"
                title="PDF Preview"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

