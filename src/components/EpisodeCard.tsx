'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Episodio, WatchProgress } from '@/types/database';
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
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnail, setThumbnail] = useState<string>('');
  const [animeTitulo, setAnimeTitulo] = useState<string>('');

  // Obtener título del anime
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

          if (anime) setAnimeTitulo(anime.titulo);
        }
      } catch (err) {}
    }

    obtenerTituloAnime();
  }, [episodio.temporada_id]);

  // Cargar thumbnail desde AniList
  useEffect(() => {
    async function cargarThumbnail() {
      if (!animeTitulo) return;

      const cacheKey = `anilist_thumb_${animeTitulo}_${episodio.numero}`;
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
          const ep = data.episodes.find((e: any) => e.numero === episodio.numero);
          if (ep?.thumbnail) {
            setThumbnail(ep.thumbnail);
            localStorage.setItem(cacheKey, ep.thumbnail);
          }
        }
      } catch (err) {}
    }

    cargarThumbnail();
  }, [animeTitulo, episodio.numero]);

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
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-zinc-900 to-blue-950/40">
            <div className="text-4xl font-black text-zinc-700/60">{paddedNumber}</div>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

        <div className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white border border-white/10">
          EP {paddedNumber}
        </div>

        <div className={`absolute inset-0 flex items-center justify-center transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/90 text-white shadow-lg">
            <svg className="h-5 w-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-3">
        <h3 className="text-xs font-bold text-zinc-100 group-hover:text-blue-400 line-clamp-1">
          {episodio.titulo || `Episodio ${episodio.numero}`}
        </h3>
      </div>
    </Link>
  );
}
