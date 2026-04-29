'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

const NAV = [
  { href: '/chat', label: 'Chat', icon: '💬' },
  { href: '/history', label: 'History', icon: '📈' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-60 shrink-0 flex flex-col h-screen bg-surface border-r border-border">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border">
        <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center">
          <span className="text-white font-extrabold text-lg">E</span>
        </div>
        <div>
          <p className="font-extrabold text-text-main leading-tight">Ember</p>
          <p className="text-xs text-text-muted leading-tight">CBT Companion</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 flex flex-col gap-1">
        {NAV.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-primary text-white'
                  : 'text-text-secondary hover:bg-background hover:text-text-main'
              }`}
            >
              <span className="text-lg">{icon}</span>
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Sign out */}
      <div className="px-3 pb-5">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger hover:bg-red-50 transition-colors"
        >
          <span className="text-lg">🚪</span>
          Sign out
        </button>
      </div>
    </aside>
  );
}
