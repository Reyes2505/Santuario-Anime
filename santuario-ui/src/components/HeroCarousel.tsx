'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Anime } from '@/types/database';

interface HeroCarouselProps {
  animes: Anime[];
}

export default function HeroCarousel({ animes }: HeroCarouselProps) {
  const destacados = animes.slice(0, 5);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const goToSlide = useCallback((index: number) => {
    setIsVisible(false);
    
    if (timerRef.current) clearTimeout(timerRef.current);
    
    timerRef.current = setTimeout(() => {
      setCurrentIndex(index);
      setIsVisible(true);
    }, 400);
  }, []);

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % destacados.length);
  }, [currentIndex, destacados.length, goToSlide]);

  const prevSlide = () => {
    goToSlide((currentIndex - 1 + destacados.length) % destacados.length);
  };

  useEffect(() => {
    if (isPaused || destacados.length <= 1) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  }, [isPaused, destacados.length, nextSlide]);

  if (!destacados.length) return null;

  const anime = destacados[currentIndex];

  return (
    <section
      className="relative w-full overflow-hidden border-b border-zinc-800/80 bg-zinc-950 text-white min-h-[380px] lg:min-h-[420px] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background con crossfade suave */}
      <div className="absolute inset-0 z-0">
        {destacados.map((a, i) => (
          <div
            key={a.id}
            className={`absolute inset-0 bg-cover bg-center transition-opacity duration-700 ease-in-out ${
              i === currentIndex ? 'opacity-40' : 'opacity-0'
            }`}
            style={{
              backgroundImage: `url(${a.banner_url || a.portada_url || ''})`,
            }}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      {/* Content con fade */}
      <div className={`relative z-10 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 w-full transition-all duration-500 ease-out ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: Info */}
          <div className="lg:col-span-8 space-y-3">
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-0.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider">
                ✨ Destacado
              </span>
              <span className="rounded-full bg-zinc-800/80 px-2 py-0.5 text-[10px] text-zinc-400">
                {currentIndex + 1} / {destacados.length}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white drop-shadow-md line-clamp-2">
              {anime.titulo}
            </h1>

            <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl line-clamp-2 leading-relaxed">
              {anime.sinopsis || 'Sin descripción disponible'}
            </p>

            <Link
              href={`/anime/${anime.id}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
              Ver Anime
            </Link>
          </div>

          {/* Right: Mini poster */}
          <div className="hidden lg:flex justify-end lg:col-span-4">
            <div className="relative aspect-[3/4] w-40 overflow-hidden rounded-xl border border-zinc-700/50 shadow-2xl shadow-black/50">
              {anime.portada_url ? (
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flechas */}
      {destacados.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-zinc-900/50 p-1.5 text-white/50 hover:bg-zinc-800 hover:text-white backdrop-blur-sm transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-zinc-900/50 p-1.5 text-white/50 hover:bg-zinc-800 hover:text-white backdrop-blur-sm transition-all"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Dots */}
      {destacados.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {destacados.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i === currentIndex ? 'w-6 bg-blue-500' : 'w-1.5 bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
