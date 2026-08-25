'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Episodio, WatchProgress } from '@/types/database';
import { isEpisodeFavorite, toggleFavoriteEpisode, hideEpisode } from '@/lib/offlineStore';
import { supabase } from '@/lib/supabase';

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
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnail, setThumbnail] = useState<string>('');
  const [animeTitulo, setAnimeTitulo] = useState<string>('');

  useEffect(() => {
    setIsFav(isEpisodeFavorite(episodio.id));
  }, [episodio.id]);

  // Obtener el título del anime para buscar thumbnails
  useEffect(() => {
    async function obtenerTituloAnime() {
      try {
        const { data: temporada } = await supabase
          .from('temporadas')
          .select('anime_id')
          .eq('id', episodio.temporada_id)
          .single();

        if (temporada) {
          const { data: anime } = await supabase
            .from('animes')
            .select('titulo')
            .eq('id', temporada.anime_id)
            .single();

          if (anime) {
            setAnimeTitulo(anime.titulo);
          }
        }
      } catch (err) {
        console.error('Error obteniendo título del anime:', err);
      }
    }

    obtenerTituloAnime();
  }, [episodio.temporada_id]);

  // Cargar thumbnail desde Jikan
  useEffect(() => {
    async function cargarThumbnail() {
      if (!animeTitulo || thumbnail) return;

      const cacheKey = `thumbnail_${animeTitulo}_${episodio.numero}`;
      const cache = localStorage.getItem(cacheKey);

      if (cache) {
        setThumbnail(cache);
        return;
      }

      try {
        const response = await fetch(
          `/api/thumbnails?titulo=${encodeURIComponent(animeTitulo)}`
        );
        const data = await response.json();

        if (data.episodes && data.episodes.length > 0) {
          const epThumbnail = data.episodes.find((ep: any) => ep.numero === episodio.numero)?.thumbnail;
          
          if (epThumbnail) {
            setThumbnail(epThumbnail);
            localStorage.setItem(cacheKey, epThumbnail);
          }
        }
      } catch (err) {
        console.error('Error cargando thumbnail:', err);
      }
    }

    cargarThumbnail();
  }, [animeTitulo, episodio.numero, thumbnail]);

  const handleToggleFav = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = toggleFavoriteEpisode(episodio.id);
    setIsFav(updated);
  };

  const isWatched = progress && progress.currentTime > 0;
  const percent =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
      : 0;

  const paddedNumber = String(episodio.numero).padStart(2, '0');

  return (
    <Link
      href={`/ver/${episodio.id}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 transition-all duration-300 hover:-translate-y-1 hover:border-blue-500/60 hover:shadow-xl hover:shadow-blue-500/10"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={`Episodio ${episodio.numero}`}
            className={`h-full w-full object-cover transition-all duration-500 ${
              isHovered ? 'scale-110 blur-sm brightness-50' : ''
            }`}
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-blue-950/30">
            <div className="text-4xl font-black text-zinc-700/60 group-hover:scale-110 transition-transform">
              {paddedNumber}
            </div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <div className="absolute top-2 left-2 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">
          EP {paddedNumber}
        </div>

        <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg shadow-blue-600/40">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>

        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={handleToggleFav}
            className={`flex h-7 w-7 items-center justify-center rounded-md backdrop-blur-md border transition-all ${
              isFav
                ? 'bg-pink-600/90 text-white border-pink-500'
                : 'bg-black/60 text-zinc-400 border-white/10 hover:text-pink-400'
            }`}
          >
            <svg className="h-3.5 w-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
          </button>
        </div>

        {isWatched && percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all"
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-blue-400 transition-colors line-clamp-1">
          {episodio.titulo || `Episodio ${episodio.numero}`}
        </h3>
        <p className="text-[10px] text-zinc-500 mt-0.5">
          {isWatched && percent > 0 ? `${percent}% visto` : 'Sin ver'}
        </p>
      </div>
    </Link>
  );
}
