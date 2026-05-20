'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Megaphone,
  Link2,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Tag,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    // セッション確認
    const session = localStorage.getItem('admin_session');
    if (!session) {
      router.push('/admin/login');
      return;
    }
    setAdmin(JSON.parse(session));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('admin_session');
    router.push('/admin/login');
  };

  if (!admin) {
    return <div>読み込み中...</div>;
  }

  const menuItems = [
    { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/admin/members', label: '会員管理', icon: Users },
    { href: '/admin/events', label: 'イベント管理', icon: Calendar },
    { href: '/admin/news', label: 'お知らせ管理', icon: Megaphone },
    { href: '/admin/tags', label: 'タグ管理', icon: Tag },
    { href: '/admin/circles', label: '会員タグ管理', icon: Link2 },
    { href: '/admin/administrators', label: '管理者管理', icon: UserCog },
  ];

  const isActive = (href: string) => {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname?.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* サイドバー */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-white shadow-lg transition-all duration-300 flex flex-col`}
        style={{ backgroundColor: '#243266' }}
      >
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <h1 className="text-xl font-bold text-white">CEO倶楽部</h1>
            )}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-white hover:text-gray-200 p-2"
            >
              {sidebarOpen ? (
                <ChevronLeft className="w-5 h-5" />
              ) : (
                <ChevronRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const IconComponent = item.icon;
              const isItemActive = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isItemActive
                        ? 'bg-white text-gray-900'
                        : 'text-white hover:bg-gray-700'
                    }`}
                  >
                    <IconComponent
                      className="w-5 h-5 flex-shrink-0"
                      style={{
                        color: isItemActive ? '#a8895b' : '#ffffff',
                      }}
                    />
                    {sidebarOpen && <span className="font-medium">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-700">
          {sidebarOpen && (
            <div className="text-white mb-4">
              <div className="text-sm font-medium">{admin.name}</div>
              <div className="text-xs text-gray-300">{admin.email}</div>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-4 py-2 text-white rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#a8895b',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#8b6f3f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#a8895b';
            }}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>ログアウト</span>}
          </button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col">
        {/* ヘッダー */}
        <header className="bg-white shadow">
          <div className="px-6 py-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {menuItems.find((item) => isActive(item.href))?.label || '管理画面'}
            </h2>
          </div>
        </header>

        {/* コンテンツ */}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

