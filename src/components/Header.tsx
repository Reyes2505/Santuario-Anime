'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const isAdminPage = pathname === '/admin';
  const isProfilePage = pathname === '/perfil';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8 py-1.5">
        {/* Logo GRANDE sin texto */}
        <Link href="/" className="flex items-center transition-transform active:scale-95">
          <img
            src="/logo.png"
            alt="Santuario Anime"
            className="h-14 w-auto sm:h-16 md:h-20 object-contain drop-shadow-lg"
            style={{ maxWidth: '100%' }}
          />
        </Link>

        {/* Navegación */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <Link
            href="/admin"
            className={`rounded-xl border px-3 py-2 text-[10px] sm:text-xs font-semibold transition-all ${
              isAdminPage
                ? 'border-blue-500 bg-blue-600 text-white'
                : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            🛠️ <span className="hidden sm:inline">Editor</span>
          </Link>

          {user ? (
            <>
              <Link
                href="/perfil"
                className={`rounded-xl border px-3 py-2 text-[10px] sm:text-xs font-semibold transition-all ${
                  isProfilePage
                    ? 'border-blue-500 bg-blue-600 text-white'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                👤 <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[10px] sm:text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all"
              >
                🚪 <span className="hidden sm:inline">Salir</span>
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[10px] sm:text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-white transition-all"
            >
              🔐 <span className="hidden sm:inline">Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
