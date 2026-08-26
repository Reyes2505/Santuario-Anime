'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = '/';
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center">
          <img src="/logo.png" alt="Santuario" className="h-12 w-auto object-contain" />
        </Link>

        <nav className="flex items-center gap-3">
          {user ? (
            <>
              <Link href="/perfil" className="text-xs text-zinc-400 hover:text-white">
                {user.email?.split('@')[0]}
              </Link>
              <button
                onClick={handleLogout}
                className="text-xs text-zinc-500 hover:text-red-400"
              >
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs text-zinc-400 hover:text-white">
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
