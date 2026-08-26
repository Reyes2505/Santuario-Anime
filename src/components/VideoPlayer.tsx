'use client';

import { useEffect, useRef, useState } from 'react';
import { Episodio } from '@/types/database';

interface VideoPlayerProps {
  episodio: Episodio;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function VideoPlayer({ episodio, onNextEpisode, onPrevEpisode }: VideoPlayerProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const url = episodio.url_stream || '';
  const isLocal = url.startsWith('/videos/');
  const isM3U8 = url.includes('.m3u8') && !url.includes('jkplayer');
  const isJkPlayer = url.includes('jkplayer') || url.includes('jkanime.net');

  // Cargar progreso guardado para ESTE episodio
  useEffect(() => {
    if (isLocal || isM3U8) {
      const key = `progreso_episodio_${episodio.id}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const data = JSON.parse(saved);
        if (data.timestamp > 5) {
          // Restaurar después de que el video cargue
          const checkVideo = setInterval(() => {
            if (videoRef.current && videoRef.current.duration > 0) {
              videoRef.current.currentTime = data.timestamp;
              clearInterval(checkVideo);
            }
          }, 500);
        }
      }
    }
  }, [episodio.id, isLocal, isM3U8]);

  // Guardar progreso para ESTE episodio
  const guardarProgreso = () => {
    if (videoRef.current && (isLocal || isM3U8)) {
      const key = `progreso_episodio_${episodio.id}`;
      const data = {
        timestamp: videoRef.current.currentTime,
        duration: videoRef.current.duration,
        fecha: new Date().toISOString(),
      };
      localStorage.setItem(key, JSON.stringify(data));
    }
  };

  // Guardar progreso cada 5 segundos
  useEffect(() => {
    if (!isLocal && !isM3U8) return;
    const interval = setInterval(guardarProgreso, 5000);
    return () => clearInterval(interval);
  }, [isLocal, isM3U8]);

  // Guardar al salir
  useEffect(() => {
    return () => {
      guardarProgreso();
    };
  }, []);

  // Para JK Player (iframe) - el progreso se maneja dentro del iframe de JK Anime
  if (isJkPlayer) {
    return (
      <div className="w-full max-w-5xl mx-auto space-y-4">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
          <iframe
            key={episodio.id}  // Único por episodio
            src={`/api/player?url=${encodeURIComponent(url)}&autoplay=1`}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; fullscreen"
            title={`Episodio ${episodio.numero}`}
          />
        </div>
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <h2 className="text-sm font-bold text-white">
            Episodio {episodio.numero} {episodio.titulo && `- ${episodio.titulo}`}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Fuente: JK Anime
          </p>
        </div>
      </div>
    );
  }

  // Para videos locales o M3U8 - con progreso por episodio
  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-zinc-800 bg-black">
        <video
          ref={videoRef}
          src={url}
          controls
          playsInline
          muted={isMuted}
          onTimeUpdate={() => {
            if (videoRef.current) {
              setCurrentTime(videoRef.current.currentTime);
              setDuration(videoRef.current.duration);
            }
          }}
          onError={() => {
            setHasError(true);
            setErrorMessage('No se pudo cargar el video.');
          }}
          className="h-full w-full object-contain"
        />
      </div>

      {hasError && (
        <div className="p-4 rounded-xl border border-red-900/50 bg-red-950/30 text-center">
          <p className="text-sm text-red-400">{errorMessage}</p>
        </div>
      )}

      <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <h2 className="text-sm font-bold text-white">
          Episodio {episodio.numero} {episodio.titulo && `- ${episodio.titulo}`}
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          {isM3U8 ? 'Streaming HLS' : 'Video local'} · Progreso guardado por episodio
        </p>
      </div>
    </div>
  );
}
