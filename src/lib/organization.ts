import { auth } from './auth';

/**
 * 現在のユーザーのorganization情報を取得
 */
export async function getCurrentOrganization() {
  const session = await auth();
  
  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.id,
    organizationId: session.user.organizationId,
    role: session.user.role,
    isSuperAdmin: session.user.role === 'super_admin',
  };
}

/**
 * organization IDでフィルタリングするためのwhere句を生成
 * super_adminの場合は全データ、それ以外は自分の組織のデータのみ
 */
export function getOrganizationFilter(organizationId: string | undefined, isSuperAdmin: boolean) {
  if (isSuperAdmin) {
    return {}; // super_adminは全データ閲覧可能
  }
  
  return { organizationId };
}

/**
 * 認証とorganization情報を取得し、未認証の場合はエラーをスロー
 */
export async function requireOrganization() {
  const org = await getCurrentOrganization();
  
  if (!org) {
    throw new Error('認証が必要です');
  }

  if (!org.isSuperAdmin && !org.organizationId) {
    throw new Error('組織に所属していません');
  }

  return org;
}



