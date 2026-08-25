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
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
            <span className="text-lg">🏯</span>
          </div>
          <span className="font-black text-white text-lg">
            Santuario <span className="text-blue-500">Anime</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
              isAdminPage ? 'border-blue-500 bg-blue-600 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
            }`}
          >
            Editor Anime
          </Link>

          {user ? (
            <>
              <Link
                href="/perfil"
                className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                  isProfilePage ? 'border-blue-500 bg-blue-600 text-white' : 'border-zinc-800 bg-zinc-900 text-zinc-300'
                }`}
              >
                👤 {user.email?.split('@')[0] || 'Perfil'}
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white"
              >
                🚪 Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-white"
            >
              🔐 Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
