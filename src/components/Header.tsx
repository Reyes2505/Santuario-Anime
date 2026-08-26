'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function Header({ onBuscar }: { onBuscar?: (query: string) => void }) {
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

  const esInicio = pathname === '/';

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2">
        <Link href="/" className="shrink-0">
          <img src="/logo.png" alt="Santuario" className="h-10 w-auto object-contain" />
        </Link>

        {/* Espaciador flexible - mantiene usuario a la derecha */}
        <div className="flex-1" />

        {/* Usuario / Login - SIEMPRE a la derecha */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <Link href="/perfil" className="text-xs text-zinc-400 hover:text-white">
                {user.email?.split('@')[0]}
              </Link>
              <button onClick={handleLogout} className="text-xs text-zinc-600 hover:text-red-400">
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs text-zinc-400 hover:text-white">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
