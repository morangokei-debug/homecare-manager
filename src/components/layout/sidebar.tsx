'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Users,
  Building2,
  Bell,
  FileText,
  Settings,
  Home,
} from 'lucide-react';

const navigation = [
  { name: 'カレンダー', href: '/calendar', icon: CalendarDays },
  { name: 'イベント一覧', href: '/events', icon: Home },
  { name: '患者管理', href: '/patients', icon: Users },
  { name: '施設管理', href: '/facilities', icon: Building2 },
  { name: 'リマインド', href: '/reminders', icon: Bell },
  { name: 'PDF出力', href: '/pdf', icon: FileText },
  { name: '設定', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
      <div className="flex min-h-0 flex-1 flex-col bg-slate-800 border-r border-slate-700">
        <div className="flex flex-1 flex-col overflow-y-auto pt-5 pb-4">
          <div className="flex flex-shrink-0 items-center px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-xl flex items-center justify-center">
                <span className="text-lg">🏠</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Homecare</h1>
                <p className="text-xs text-slate-400">Manager</p>
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
                      ? 'bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'text-slate-300 hover:bg-slate-700/50 hover:text-white'
                  )}
                >
                  <item.icon
                    className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-white'
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

