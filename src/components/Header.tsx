'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTheme, toggleTheme, Theme } from '@/lib/theme';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
    
    setTheme(getTheme());
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setTheme(newTheme);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 dark:border-zinc-900 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <Link href="/" className="shrink-0">
          <img src="/logo.png" alt="Santuario" className="h-10 w-auto object-contain" />
        </Link>

        <div className="flex-1" />

        <div className="flex items-center gap-2 shrink-0">
          {/* Botón de tema */}
          <button
            onClick={handleToggleTheme}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-white px-2 py-1 transition-colors"
            title="Cambiar tema"
          >
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>

          {user ? (
            <>
              <Link
                href="/perfil"
                className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              >
                {user.email?.split('@')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-400 hover:text-red-400 transition-colors"
              >
                Salir
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-xs text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
