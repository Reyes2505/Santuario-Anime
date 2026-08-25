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

  // URL del proxy
  const proxyUrl = `/api/player?url=${encodeURIComponent(url)}`;

  // Video local
  if (isLocal) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <video src={url} controls playsInline className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  // M3U8 directo
  if (isM3U8 && !isJkPlayer) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <video src={url} controls playsInline className="h-full w-full object-contain" />
        </div>
      </div>
    );
  }

  // JK Player → iframe con proxy
  if (!iframeError) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          <iframe
            src={`${proxyUrl}?autoplay=1`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            onError={() => setIframeError(true)}
            title={`Episodio ${episodio.numero}`}
          />
        </div>
        <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between">
          <h2 className="text-base font-bold text-white">
            Episodio {episodio.numero} {episodio.titulo && `- ${episodio.titulo}`}
          </h2>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-400 hover:text-blue-300"
          >
            Abrir en pestaña nueva →
          </a>
        </div>
      </div>
    );
  }

  // Fallback si iframe falla
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-bold text-white mb-2">
          Episodio {episodio.numero}
        </h3>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-500"
        >
          Ver en JK Anime
        </a>
      </div>
    </div>
  );
}
