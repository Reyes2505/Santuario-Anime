'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AnimeTicker from '@/components/AnimeTicker';

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

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-2.5">
        
        {/* Izquierda: Logo con un poco más de presencia */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="flex items-center gap-2.5 group">
            <img src="/logo.png" alt="Santuario" className="h-9 w-auto object-contain transition-transform group-hover:scale-105" />
            <span className="hidden sm:inline-block font-bold text-xs tracking-wider text-zinc-200 uppercase">
              Santuario Anime
            </span>
          </Link>
        </div>

        {/* Centro: Ticker estilo Bolsa de Valores / Binance */}
        <AnimeTicker />

        {/* Derecha: Usuario / Login */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <>
              <Link href="/perfil" className="text-xs font-medium text-zinc-300 hover:text-white bg-zinc-900 px-3 py-1.5 rounded-md border border-zinc-800 transition-colors">
                {user.email?.split('@')[0]}
              </Link>
              <button onClick={handleLogout} className="text-xs text-zinc-500 hover:text-red-400 transition-colors px-2 py-1">
                Salir
              </button>
            </>
          ) : (
            <Link href="/login" className="text-xs font-medium bg-zinc-900 text-zinc-300 hover:text-white px-3.5 py-1.5 rounded-md border border-zinc-800 transition-colors">
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
