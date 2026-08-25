'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Episodio, WatchProgress } from '@/types/database';
import { formatTime } from '@/lib/video';
import { isEpisodeFavorite, toggleFavoriteEpisode, hideEpisode } from '@/lib/offlineStore';

interface EpisodeCardProps {
  episodio: Episodio;
  progress?: WatchProgress | null;
  isSelected?: boolean;
  onDeleted?: (id: string) => void;
}

export default function EpisodeCard({
  episodio,
  progress,
  isSelected = false,
  onDeleted,
}: EpisodeCardProps) {
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    setIsFav(isEpisodeFavorite(episodio.id));
  }, [episodio.id]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavoriteEpisode(episodio.id);
    setIsFav(updated);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`¿Estás seguro de eliminar el Episodio ${episodio.numero}?`)) {
      hideEpisode(episodio.id);
      if (onDeleted) {
        onDeleted(episodio.id);
      }
    }
  };

  const isCompleted = progress?.completed;
  const isWatched = progress && progress.currentTime > 0;
  const percent =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
      : 0;

  const paddedNumber = String(episodio.numero).padStart(2, '0');
  const isOnline = episodio.tipo_stream === 'online' || (episodio.url_stream && episodio.url_stream.startsWith('http'));

  return (
    <Link
      href={`/ver/${episodio.id}`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/80 hover:bg-zinc-900/90 hover:shadow-xl hover:shadow-blue-500/10 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-950"
    >
      {/* Container del Thumbnail con Aspect Ratio 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-tr from-zinc-950 via-zinc-900 to-indigo-950/40">
        {episodio.thumbnail_url ? (
          <img
            src={episodio.thumbnail_url}
            alt={episodio.titulo}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800/80 text-blue-400 border border-zinc-700/50 shadow-inner group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent opacity-80" />

        {/* Badge del Número de Episodio */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-lg bg-zinc-950/80 backdrop-blur-md px-2.5 py-1 text-[11px] font-bold text-white border border-white/10 shadow-md">
          <span className="text-blue-400 font-extrabold">EP</span>
          <span>{paddedNumber}</span>
        </div>

        {/* Top Right Action Buttons: Heart + Delete */}
        <div className="absolute top-2.5 right-2.5 z-20 flex items-center gap-1.5">
          <button
            onClick={handleToggleFav}
            className={`flex h-7 w-7 items-center justify-center rounded-lg backdrop-blur-md transition-all active:scale-90 border ${
              isFav
                ? 'bg-pink-600/90 text-white border-pink-500 shadow-md'
                : 'bg-zinc-950/60 text-zinc-400 border-white/10 hover:text-pink-400'
            }`}
            title={isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>

          <button
            onClick={handleDelete}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-950/70 text-red-400 border border-red-800/40 backdrop-blur-md hover:bg-red-600 hover:text-white transition-all active:scale-90"
            title="Eliminar episodio completamente"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>

        {/* Badge de Estado: Visto / En progreso */}
        {isCompleted ? (
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 rounded-lg bg-emerald-500/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            Visto
          </div>
        ) : isWatched ? (
          <div className="absolute bottom-2.5 left-2.5 rounded-lg bg-blue-600/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-md">
            {percent}%
          </div>
        ) : null}

        {/* Stream Mode Badge */}
        <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-zinc-950/80 px-2 py-0.5 text-[10px] font-bold text-zinc-300 backdrop-blur-md border border-white/10">
          {isOnline ? '🌐 Online' : '📁 Local'}
        </div>

        {/* Hover Play Glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[2px]">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-90 group-hover:scale-100 transition-transform">
            <svg className="h-6 w-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </div>

        {isWatched && !isCompleted && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Contenido de la Tarjeta */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="font-bold text-sm text-zinc-100 group-hover:text-blue-400 transition-colors line-clamp-1">
            {episodio.titulo || `Episodio ${episodio.numero}`}
          </h3>
          <p className="mt-1 text-xs text-zinc-400 line-clamp-1">
            Cap. {episodio.numero}
          </p>
        </div>

        <div className="mt-3 flex items-center justify-between pt-2 border-t border-zinc-800/40 text-[11px]">
          <span className="font-semibold text-zinc-500 group-hover:text-zinc-300 transition-colors">
            {isOnline ? 'Streaming link' : 'Reproducción local'}
          </span>
          <span className="font-bold text-blue-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            Ver ahora
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </span>
        </div>
      </div>
    </Link>
  );
}
