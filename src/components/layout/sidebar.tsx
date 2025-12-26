'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  Building2,
  Settings,
  List,
  Bell,
} from 'lucide-react';

const navigation = [
  { name: 'カレンダー', href: '/calendar', icon: CalendarDays },
  { name: 'イベント一覧', href: '/events', icon: List },
  { name: '患者管理', href: '/patients', icon: Users },
  { name: '施設管理', href: '/facilities', icon: Building2 },
  { name: 'リマインド', href: '/reminders', icon: Bell },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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
          <nav className="mt-8 flex-1 space-y-1 px-3">
            {navigation.map((item) => {
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
          </nav>
        </div>
      </div>
    </div>
  );
}

