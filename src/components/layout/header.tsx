'use client';

import { useState, useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Bell, LogOut, User, Building2, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function Header({ user }: HeaderProps) {
  const router = useRouter();
  const [viewingOrg, setViewingOrg] = useState<{ id: string; name: string } | null>(null);
  
  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : 'U';

  const isSuperAdmin = user.role === 'super_admin';

  const roleLabel = {
    super_admin: 'システム管理者',
    admin: '管理者',
    staff: 'スタッフ',
    viewer: '閲覧者',
  }[user.role || 'viewer'];

  // 閲覧中の会社を取得
  useEffect(() => {
    if (isSuperAdmin && typeof window !== 'undefined') {
      const orgId = sessionStorage.getItem('viewAsOrganization');
      const orgName = sessionStorage.getItem('viewAsOrganizationName');
      if (orgId && orgName) {
        setViewingOrg({ id: orgId, name: orgName });
      }
    }
  }, [isSuperAdmin]);

  // 会社閲覧を終了
  const handleExitViewMode = () => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('viewAsOrganization');
      sessionStorage.removeItem('viewAsOrganizationName');
    }
    setViewingOrg(null);
    router.push('/admin/organizations');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white/80 backdrop-blur px-4 sm:gap-x-6 sm:px-6 lg:px-8 shadow-sm">
      <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
        {/* 閲覧中の会社表示（super_adminのみ） */}
        {isSuperAdmin && viewingOrg && (
          <div className="flex items-center">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
              <Eye className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">
                <span className="font-medium">{viewingOrg.name}</span> を閲覧中
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 hover:bg-blue-100"
                onClick={handleExitViewMode}
              >
                <X className="h-4 w-4 text-blue-600" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="flex flex-1"></div>
        <div className="flex items-center gap-x-4 lg:gap-x-6">
          {/* リマインド通知 */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-500 hover:text-emerald-600"
          >
            <Bell className="h-5 w-5" />
            <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-orange-500 text-white text-xs">
              3
            </Badge>
          </Button>

          {/* ユーザーメニュー */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={`text-white text-sm ${
                    isSuperAdmin ? 'bg-orange-500' : 'bg-emerald-500'
                  }`}>
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-800">{user.name}</p>
                  <p className={`text-xs ${isSuperAdmin ? 'text-orange-600' : 'text-gray-500'}`}>
                    {roleLabel}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-white border-gray-200"
            >
              <DropdownMenuLabel className="text-gray-700">
                {user.email}
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-100" />
              
              {isSuperAdmin && (
                <>
                  <DropdownMenuItem 
                    className="text-orange-600 focus:bg-orange-50 focus:text-orange-700"
                    onClick={() => router.push('/admin/organizations')}
                  >
                    <Building2 className="mr-2 h-4 w-4" />
                    会社管理
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-gray-100" />
                </>
              )}
              
              <DropdownMenuItem className="text-gray-600 focus:bg-gray-50 focus:text-gray-900">
                <User className="mr-2 h-4 w-4" />
                アカウント設定
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-100" />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="text-red-500 focus:bg-red-50 focus:text-red-600"
              >
                <LogOut className="mr-2 h-4 w-4" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
