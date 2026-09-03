'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Anime[]>([]);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const isHomePage = pathname === '/';
  const isAdminPage = pathname === '/admin';
  const isProfilePage = pathname === '/perfil';

  // Cerrar resultados al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda en tiempo real
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchQuery.trim().length >= 2) {
        const { data } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, estado_emision')
          .ilike('titulo', `%${searchQuery}%`)
          .limit(8);
        setSearchResults(data || []);
        setShowResults(true);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSearchSelect = (animeId: string) => {
    setSearchQuery('');
    setShowResults(false);
    router.push(`/anime/${animeId}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8 gap-4">
        <Link
          href="/"
          className="group flex items-center gap-3 transition-transform active:scale-95 shrink-0"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/20 ring-1 ring-white/10 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all">
            <svg
              className="h-5 w-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="hidden sm:block">
            <span className="block font-black tracking-tight text-white text-base sm:text-lg">
              Santuario <span className="text-blue-500">Anime</span>
            </span>
            <span className="block text-[11px] font-medium text-zinc-400">
              Offline & Online Stream Engine
            </span>
          </div>
        </Link>

        {/* Buscador global */}
        <div ref={searchRef} className="flex-1 max-w-md relative hidden md:block">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-zinc-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar anime..."
              className="w-full rounded-xl border border-zinc-700/60 bg-zinc-900/80 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Resultados de búsqueda */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden animate-slide-up">
              {searchResults.map((anime) => (
                <button
                  key={anime.id}
                  onClick={() => handleSearchSelect(anime.id)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-zinc-800/60 transition-colors text-left"
                >
                  {anime.portada_url ? (
                    <img src={anime.portada_url} alt={anime.titulo} className="h-12 w-9 rounded object-cover" />
                  ) : (
                    <div className="h-12 w-9 rounded bg-zinc-800" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{anime.titulo}</p>
                    <p className="text-xs text-zinc-400">{anime.estado_emision || 'Desconocido'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action & Navigation Links */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            href="/admin"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              isAdminPage
                ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            <span className="hidden sm:inline">Editor Anime</span>
          </Link>

          <Link
            href="/perfil"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              isProfilePage
                ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                : 'border-zinc-800 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800 hover:text-white'
            }`}
          >
            <svg className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 00114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="hidden sm:inline">Mi Perfil</span>
          </Link>

          <span className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
            </span>
            Offline Ready
          </span>
        </div>
      </div>
    </header>
  );
}
