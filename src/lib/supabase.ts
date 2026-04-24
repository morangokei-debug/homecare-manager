import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Storage bucket name for patient documents
export const DOCUMENTS_BUCKET = 'patient-documents';

// 遅延初期化：最初にアクセスされた時だけクライアントを作る
// ・使わないルートでは作成コストゼロ
// ・ビルド時に環境変数が無くてもページデータ収集で落ちない
let cachedClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (cachedClient) return cachedClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase の環境変数が未設定です（NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY）'
    );
  }
  cachedClient = createClient(url, anonKey);
  return cachedClient;
}

// 既存コード互換のため `supabase` という名前でプロキシ経由の遅延クライアントを公開
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseClient();
    const value = Reflect.get(client, prop, receiver);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});




