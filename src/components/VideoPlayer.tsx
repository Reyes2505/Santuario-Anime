'use client';

import { useEffect, useState } from 'react';
import { Episodio } from '@/types/database';
import { supabase } from '@/lib/supabase';

interface VideoPlayerProps {
  episodio: Episodio;
}

export default function VideoPlayer({ episodio }: VideoPlayerProps) {
  const [iframeError, setIframeError] = useState(false);
  const [animeSlug, setAnimeSlug] = useState('');

  const url = episodio.url_stream || '';
  const isLocal = url.startsWith('/videos/');
  const isM3U8 = url.includes('.m3u8');
  const isJkPlayer = url.includes('jkplayer') || url.includes('jkanime.net');

  // Obtener el slug del anime desde Supabase
  useEffect(() => {
    async function getAnimeSlug() {
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
            const slug = anime.titulo
              .toLowerCase()
              .replace(/[^a-z0-9\s]/g, '')
              .replace(/\s+/g, '-');
            setAnimeSlug(slug);
          }
        }
      } catch (err) {
        console.error('Error obteniendo slug:', err);
      }
    }

    if (isM3U8) {
      getAnimeSlug();
    }
  }, [episodio.temporada_id, episodio.numero, isM3U8]);

  // Para M3U8, usar la página de JK Anime
  if (isM3U8 && animeSlug) {
    const jkUrl = `https://jkanime.net/${animeSlug}/${episodio.numero}/`;
    
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}
            src={`/api/player?url=${encodeURIComponent(jkUrl)}&autoplay=1`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            onError={() => setIframeError(true)}
            title={`Episodio ${episodio.numero}`}
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Episodio {episodio.numero}</h2>
          <a href={jkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400">
            Abrir en JK Anime
          </a>
        </div>
      </div>
    );
  }

  // Video local
  if (isLocal) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <video src={url} controls playsInline className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  // JK Player directo
  if (isJkPlayer && !iframeError) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}
            src={`/api/player?url=${encodeURIComponent(url)}&autoplay=1`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            onError={() => setIframeError(true)}
            title={`Episodio ${episodio.numero}`}
          />
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-4">Video no disponible</div>
        <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white">
          Ver en JK Anime
        </a>
      </div>
    </div>
  );
}
