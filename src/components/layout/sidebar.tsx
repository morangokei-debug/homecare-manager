'use client';

import { useEffect, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  Building2,
  Settings,
  List,
  Shield,
  Loader2,
  FileText,
  BookOpen,
} from 'lucide-react';

const navigation = [
  { name: 'カレンダー', href: '/calendar', icon: CalendarDays },
  { name: 'スケジュール一覧', href: '/events', icon: List },
  { name: '患者管理', href: '/patients', icon: Users },
  { name: '施設管理', href: '/facilities', icon: Building2 },
  { name: '報告書一覧', href: '/reports', icon: FileText },
  { name: 'マスタ管理', href: '/masters', icon: BookOpen },
  { name: '設定', href: '/settings', icon: Settings },
];

const adminNavigation = [
  { name: '会社管理', href: '/admin/organizations', icon: Shield },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [isPending, startTransition] = useTransition();
  
  const isSuperAdmin = session?.user?.role === 'super_admin';

  // サイドバー表示直後に全メニューを先読みしておく（クリック時の体感を上げる）
  useEffect(() => {
    const items = isSuperAdmin
      ? [...adminNavigation, { name: '設定', href: '/settings', icon: Settings }]
      : navigation;
    items.forEach((item) => router.prefetch(item.href));
  }, [router, isSuperAdmin]);

  const handleNavigation = (href: string) => {
    startTransition(() => {
      router.push(href);
    });
  };

  const NavItem = ({ item, isAdmin = false }: { item: typeof navigation[0], isAdmin?: boolean }) => {
    const isActive = pathname.startsWith(item.href);
    const isNavigating = isPending && !isActive;

    return (
      <button
        onMouseEnter={() => router.prefetch(item.href)}
        onClick={() => handleNavigation(item.href)}
        className={cn(
          'w-full group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
          isActive
            ? isAdmin 
              ? 'bg-orange-50 text-orange-600 border border-orange-200'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        )}
      >
        {isNavigating ? (
          <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-emerald-500" />
        ) : (
          <item.icon
            className={cn(
              'h-5 w-5 flex-shrink-0',
              isActive 
                ? isAdmin ? 'text-orange-500' : 'text-emerald-500'
                : isAdmin 
                  ? 'text-gray-400 group-hover:text-orange-500'
                  : 'text-gray-400 group-hover:text-emerald-500'
            )}
          />
        )}
        {item.name}
      </button>
    );
  };

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
                <h1 className="text-lg font-bold text-gray-800">Homecare Note</h1>
                <p className="text-xs text-gray-500">在宅医療記録</p>
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
                {adminNavigation.map((item) => (
                  <NavItem key={item.name} item={item} isAdmin />
                ))}
              </nav>
            </div>
          )}
          
          {/* 通常メニュー */}
          <nav className={cn("flex-1 space-y-1 px-3", isSuperAdmin ? "mt-6" : "mt-8")}>
            {!isSuperAdmin && navigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
            
            {/* super_adminの場合は設定のみ表示 */}
            {isSuperAdmin && (
              <NavItem 
                item={{ name: '設定', href: '/settings', icon: Settings }} 
              />
            )}
          </nav>
        </div>
      </div>
    </div>
  );
}
