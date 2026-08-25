'use client';

import Link from 'next/link';
import { Anime } from '@/types/database';

interface AnimeCardProps {
  anime: Anime;
}

export default function AnimeCard({ anime }: AnimeCardProps) {
  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 transition-all duration-300 hover:scale-[1.05] hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/20"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {anime.portada_url ? (
          <img
            src={anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:blur-sm group-hover:brightness-50"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
        )}
        
        {/* Overlay con gradiente */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Botón de play */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg shadow-blue-600/40 scale-50 group-hover:scale-100 transition-transform duration-300">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
          {anime.titulo}
        </h3>
      </div>
    </Link>
  );
}
