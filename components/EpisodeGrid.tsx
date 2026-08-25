'use client';

import { useState, useEffect, useMemo } from 'react';
import { Episodio, SortOrder, WatchProgress } from '@/types/database';
import { getWatchProgressMap } from '@/lib/storage';
import { getHiddenEpisodeIds } from '@/lib/offlineStore';
import EpisodeCard from './EpisodeCard';
import EmptyState from './EmptyState';

interface EpisodeGridProps {
  episodios: Episodio[];
}

export default function EpisodeGrid({ episodios }: EpisodeGridProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [progressMap, setProgressMap] = useState<Record<string, WatchProgress>>({});
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const reloadData = () => {
    setProgressMap(getWatchProgressMap());
    setHiddenIds(getHiddenEpisodeIds());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const visibleEpisodios = useMemo(() => {
    return episodios.filter((ep) => !hiddenIds.includes(ep.id));
  }, [episodios, hiddenIds]);

  const filteredEpisodios = useMemo(() => {
    return visibleEpisodios
      .filter((ep) => {
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        const matchesNum = String(ep.numero).includes(query);
        const matchesTitle = (ep.titulo || '').toLowerCase().includes(query);
        return matchesNum || matchesTitle;
      })
      .sort((a, b) => {
        return sortOrder === 'asc' ? a.numero - b.numero : b.numero - a.numero;
      });
  }, [visibleEpisodios, searchQuery, sortOrder]);

  return (
    <div className="space-y-6">
      {/* Controles de Búsqueda y Filtrado */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md">
        {/* Buscador */}
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
            placeholder="Buscar episodio por número o título..."
            className="w-full rounded-xl border border-zinc-700/60 bg-zinc-950/80 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Ordenador y Contador */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <span className="text-xs font-semibold text-zinc-400">
            {filteredEpisodios.length} {filteredEpisodios.length === 1 ? 'episodio' : 'episodios'}
          </span>

          <div className="flex items-center gap-1.5 rounded-xl border border-zinc-700/60 bg-zinc-950/80 p-1">
            <button
              onClick={() => setSortOrder('asc')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                sortOrder === 'asc'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              1 → 23
            </button>
            <button
              onClick={() => setSortOrder('desc')}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                sortOrder === 'desc'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              23 → 1
            </button>
          </div>
        </div>
      </div>

      {/* Grid o Estado Vacío */}
      {filteredEpisodios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
          {filteredEpisodios.map((ep) => (
            <EpisodeCard
              key={ep.id}
              episodio={ep}
              progress={progressMap[ep.id] || null}
              onDeleted={reloadData}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No se encontraron episodios"
          description={
            searchQuery
              ? `No hay ningun episodio que coincida con "${searchQuery}".`
              : 'Has eliminado u ocultado los episodios actuales. Puedes agregar nuevos en el botón de "+ Agregar Capítulo Manual".'
          }
        />
      )}
    </div>
  );
}
