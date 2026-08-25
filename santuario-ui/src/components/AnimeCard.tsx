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
      className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10"
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        {anime.portada_url ? (
          <img
            src={anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-4xl">
            🎬
          </div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
        
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg shadow-blue-600/30">
            <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <h3 className="text-sm font-bold text-white line-clamp-2 group-hover:text-blue-400 transition-colors">
          {anime.titulo}
        </h3>
        <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
          {anime.sinopsis || 'Sin descripción disponible'}
        </p>
      </div>
    </Link>
  );
}
