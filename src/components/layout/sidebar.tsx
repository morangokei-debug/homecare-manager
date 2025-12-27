'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  Building2,
  Settings,
  List,
  Bell,
  Shield,
} from 'lucide-react';

const navigation = [
  { name: 'カレンダー', href: '/calendar', icon: CalendarDays },
  { name: 'スケジュール一覧', href: '/events', icon: List },
  { name: '患者管理', href: '/patients', icon: Users },
  { name: '施設管理', href: '/facilities', icon: Building2 },
  { name: 'リマインド', href: '/reminders', icon: Bell },
  { name: '設定', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: '会社管理', href: '/admin/organizations', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  const isSuperAdmin = session?.user?.role === 'super_admin';

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-white border-r border-gray-200 shadow-sm">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-lg">🏠</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-800">Homecare</h1>
                <p className="text-xs text-gray-500">Manager</p>
              </div>
            </div>
          </div>
          
          {/* システム管理者用メニュー */}
          {isSuperAdmin && (
            <div className="mt-6 px-3">
              <p className="px-3 text-xs font-semibold text-orange-600 uppercase tracking-wider">
                システム管理
              </p>
              <nav className="mt-2 space-y-1">
                {adminNavigation.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={cn(
                        'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                        isActive
                          ? 'bg-orange-50 text-orange-600 border border-orange-200'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'h-5 w-5 flex-shrink-0',
                          isActive ? 'text-orange-500' : 'text-gray-400 group-hover:text-orange-500'
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
          
          {/* 通常メニュー */}
          <nav className={cn("flex-1 space-y-1 px-3", isSuperAdmin ? "mt-6" : "mt-8")}>
            {!isSuperAdmin && navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive ? 'text-emerald-500' : 'text-gray-400 group-hover:text-emerald-500'
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
            
            {/* 会社に所属しているユーザー用のメニュー */}
            {!isSuperAdmin && session?.user?.organizationId && navigation.map((item) => null)}
            
            {/* super_adminの場合は設定のみ表示 */}
            {isSuperAdmin && (
              <Link
                href="/settings"
                className={cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
                  pathname.startsWith('/settings')
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Settings
                  className={cn(
                    'h-5 w-5 flex-shrink-0',
                    pathname.startsWith('/settings') ? 'text-emerald-500' : 'text-gray-400 group-hover:text-emerald-500'
                  )}
                />
                設定
              </Link>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
