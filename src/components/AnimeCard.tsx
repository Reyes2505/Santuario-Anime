'use client';

import Link from 'next/link';
import { Anime } from '@/types/database';

interface AnimeCardProps {
  anime: Anime;
}

const ESTADO_LABELS: Record<string, string> = {
  'emitido': 'En emisión',
  'en_espera': 'Próximamente',
  'suspendido': 'Suspendido',
  'terminado': 'Finalizado',
  'desconocido': 'Desconocido',
};

const ESTADO_COLORS: Record<string, string> = {
  'emitido': 'bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30',
  'en_espera': 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30',
  'suspendido': 'bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30',
  'terminado': 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30',
  'desconocido': 'bg-zinc-500/20 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
};

export default function AnimeCard({ anime }: AnimeCardProps) {
  const estado = anime.estado_emision || 'desconocido';
  const estadoLabel = ESTADO_LABELS[estado] || 'Desconocido';
  const estadoColor = ESTADO_COLORS[estado] || ESTADO_COLORS['desconocido'];

  return (
    <Link
      href={`/anime/${anime.id}`}
      className="group relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800/60 bg-white dark:bg-zinc-900/40 transition-all duration-300 hover:scale-[1.03] hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10"
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
          <div className="flex h-full w-full items-center justify-center bg-zinc-200 dark:bg-zinc-800 text-3xl">?</div>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg shadow-blue-600/40 scale-50 group-hover:scale-100 transition-transform duration-300">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Badge de estado */}
      <div className={`absolute top-2 right-2 rounded-md border px-2 py-0.5 text-[10px] font-bold ${estadoColor}`}>
        {estadoLabel}
      </div>

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
        <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-blue-300 transition-colors">
          {anime.titulo}
        </h3>

        {/* Géneros */}
        {anime.generos && anime.generos.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {anime.generos.slice(0, 3).map((genero) => (
              <span
                key={genero}
                className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[9px] text-zinc-300"
              >
                {genero}
              </span>
            ))}
            {anime.generos.length > 3 && (
              <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-[9px] text-zinc-500">
                +{anime.generos.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Fechas */}
        {(anime.fecha_estreno || anime.fecha_finalizacion) && (
          <div className="flex items-center gap-2 mt-1 text-[9px] text-zinc-400">
            {anime.fecha_estreno && (
              <span>
                {new Date(anime.fecha_estreno + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
              </span>
            )}
            {anime.fecha_finalizacion && (
              <>
                <span>→</span>
                <span>
                  {new Date(anime.fecha_finalizacion + 'T00:00:00').toLocaleDateString('es-ES', { year: 'numeric', month: 'short' })}
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
