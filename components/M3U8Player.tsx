'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import { saveWatchProgress, getWatchProgress } from '@/lib/storage';
import { addWatchTime, markEpisodeAsWatched } from '@/lib/tracking';

interface M3U8PlayerProps {
  src: string;
  episodeId: string;
  episodeNumber: number;
  title?: string;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

export default function M3U8Player({
  src,
  episodeId,
  episodeNumber,
  title,
  onNextEpisode,
  onPrevEpisode,
}: M3U8PlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const [error, setError] = useState('');
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  // Restaurar progreso
  useEffect(() => {
    const saved = getWatchProgress(episodeId);
    if (saved && saved.currentTime > 5) {
      setCurrentTime(saved.currentTime);
      setDuration(saved.duration);
      setShowResume(true);
    }
  }, [episodeId]);

  // Inicializar HLS
  useEffect(() => {
    if (!src || !videoRef.current) return;

    const video = videoRef.current;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 90,
      });

      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setDuration(hls.levels[0]?.duration || video.duration || 0);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          setError('Error al cargar el stream');
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    }
  }, [src]);

  // Heartbeat para tracking
  useEffect(() => {
    if (isPlaying) {
      heartbeatRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          addWatchTime(10);
        }
      }, 10000);
    }

    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, [isPlaying]);

  // Guardar progreso cada 5 segundos
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        const ct = videoRef.current.currentTime;
        const dur = videoRef.current.duration || duration;
        
        if (ct > 0) {
          saveWatchProgress(episodeId, episodeNumber, ct, dur);
          setCurrentTime(ct);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [episodeId, episodeNumber, duration]);

  // Marcar como visto
  useEffect(() => {
    markEpisodeAsWatched(episodeId);
  }, [episodeId]);

  const handleResume = () => {
    setShowResume(false);
    if (videoRef.current && currentTime > 0) {
      videoRef.current.currentTime = currentTime;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleStartOver = () => {
    setShowResume(false);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4">
      {/* Modal de reanudar */}
      {showResume && currentTime > 5 && (
        <div className="p-4 rounded-2xl border border-blue-500/40 bg-blue-950/40 flex items-center justify-between animate-fade-in">
          <div>
            <p className="text-sm font-bold text-white">
              Continuar desde {formatTime(currentTime)}
            </p>
            <p className="text-xs text-zinc-400">
              Dejaste este episodio en {formatTime(currentTime)}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleStartOver}
              className="px-4 py-2 rounded-xl bg-zinc-800 text-xs text-zinc-300 hover:bg-zinc-700"
            >
              Empezar de cero
            </button>
            <button
              onClick={handleResume}
              className="px-4 py-2 rounded-xl bg-blue-600 text-xs font-bold text-white hover:bg-blue-500"
            >
              ▶ Reanudar
            </button>
          </div>
        </div>
      )}

      {/* Video */}
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black">
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-6xl mb-4">😢</div>
            <p className="text-white font-bold">{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            controls
            playsInline
            className="h-full w-full object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => {
              setIsPlaying(false);
              if (videoRef.current) {
                saveWatchProgress(
                  episodeId,
                  episodeNumber,
                  videoRef.current.currentTime,
                  videoRef.current.duration || duration
                );
              }
            }}
            onEnded={() => {
              setIsPlaying(false);
              markEpisodeAsWatched(episodeId);
              saveWatchProgress(episodeId, episodeNumber, 0, duration);
              if (onNextEpisode) onNextEpisode();
            }}
          />
        )}
      </div>

      {/* Barra de progreso */}
      {currentTime > 0 && duration > 0 && (
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span className="font-mono">{formatTime(currentTime)}</span>
          <div className="flex-1 h-1 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
          </div>
          <span className="font-mono">{formatTime(duration)}</span>
        </div>
      )}

      {/* Info */}
      <div className="p-4 rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
        <h2 className="text-base font-bold text-white">
          Episodio {episodeNumber} {title && `- ${title}`}
        </h2>
      </div>
    </div>
  );
}
