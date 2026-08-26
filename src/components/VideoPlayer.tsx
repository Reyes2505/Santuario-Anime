'use client';

import { useState } from 'react';
import { Episodio } from '@/types/database';

interface VideoPlayerProps {
  episodio: Episodio;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio, onNextEpisode, onPrevEpisode }: VideoPlayerProps) {
  const [iframeError, setIframeError] = useState(false);

  const url = episodio.url_stream || '';
  const isLocal = url.startsWith('/videos/');
  const isJkPlayer = url.includes('jkplayer') || url.includes('jkanime.net');

  // Video local
  if (isLocal) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <video
            src={url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <h2 className="text-sm font-bold text-white">
            Episodio {episodio.numero} {episodio.titulo && `- ${episodio.titulo}`}
          </h2>
        </div>
      </div>
    );
  }

  // JK Player - usar iframe con proxy
  if (!iframeError) {
    const proxyUrl = `/api/player?url=${encodeURIComponent(url)}&autoplay=1`;
    
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}
            src={proxyUrl}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            onError={() => setIframeError(true)}
            title={`Episodio ${episodio.numero}`}
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">
            Episodio {episodio.numero} {episodio.titulo && `- ${episodio.titulo}`}
          </h2>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Abrir en JK Anime
          </a>
        </div>
      </div>
    );
  }

  // Fallback si iframe falla
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black flex flex-col items-center justify-center p-8">
        <div className="text-5xl mb-4">Video no disponible</div>
        <p className="text-sm text-zinc-400 text-center mb-4">
          No se pudo cargar el reproductor de JK Anime.
        </p>
        <a
          href={url}
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
