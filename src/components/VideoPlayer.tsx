'use client';

import { useState } from 'react';
import { Episodio } from '@/types/database';

interface VideoPlayerProps {
  episodio: Episodio;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio }: VideoPlayerProps) {
  const [iframeError, setIframeError] = useState(false);

  const url = episodio.url_stream || '';
  const isLocal = url.startsWith('/videos/');
  const isM3U8 = url.includes('.m3u8');
  const isJkPlayer = url.includes('jkplayer') || url.includes('jkanime.net');

  // Para M3U8, intentar reconstruir la URL de JK Player
  // o mostrar botón para abrir en JK Anime
  if (isM3U8 && !isJkPlayer) {
    // Construir URL de la página del episodio en JK Anime
    // El slug y número del episodio están en la BD
    const jkPageUrl = `https://jkanime.net/${episodio.titulo?.toLowerCase().replace(/\s+/g, '-')}/${episodio.numero}/`;
    
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex flex-col items-center justify-center p-8">
          <div className="text-5xl mb-4">HLS no soportado</div>
          <p className="text-sm text-zinc-400 text-center mb-4">
            Este episodio tiene una URL HLS que no se puede reproducir directamente.
            Abre en JK Anime para verlo.
          </p>
          <a
            href={jkPageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
          >
            Ver en JK Anime
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

  // JK Player - iframe con proxy
  if (!iframeError) {
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
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Episodio {episodio.numero}</h2>
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400">
            Abrir en JK Anime
          </a>
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
