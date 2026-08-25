'use client';

import { useState, useMemo } from 'react';
import { Anime } from '@/types/database';
import AnimeCard from './AnimeCard';

interface AnimeGridProps {
  animes: Anime[];
}

export default function AnimeGrid({ animes }: AnimeGridProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAnimes = useMemo(() => {
    return animes.filter((anime) => {
      const query = searchQuery.trim().toLowerCase();
      if (!query) return true;
      return anime.titulo.toLowerCase().includes(query);
    });
  }, [animes, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Buscador */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
        <div className="relative flex-1">
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
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
        </div>
        <span className="text-xs font-semibold text-zinc-400 whitespace-nowrap">
          {filteredAnimes.length} {filteredAnimes.length === 1 ? 'anime' : 'animes'}
        </span>
      </div>

      {/* Grid de animes */}
      {filteredAnimes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
          {filteredAnimes.map((anime) => (
            <AnimeCard key={anime.id} anime={anime} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-6xl mb-4">🎬</div>
          <h3 className="text-xl font-bold text-white mb-2">No se encontraron animes</h3>
          <p className="text-sm text-zinc-400">
            {searchQuery
              ? `No hay resultados para "${searchQuery}".`
              : 'Agrega animes desde el botón "+ Agregar Anime".'}
          </p>
        </div>
      )}
    </div>
  );
}
