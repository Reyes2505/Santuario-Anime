'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Anime } from '@/types/database';

interface HeroCarouselProps {
  animes: Anime[];
}

export default function HeroCarousel({ animes }: HeroCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % animes.length);
  }, [animes.length]);

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + animes.length) % animes.length);
  };

  // Auto-rotación cada 6 segundos
  useEffect(() => {
    if (isPaused || animes.length <= 1) return;

    const interval = setInterval(nextSlide, 6000);
    return () => clearInterval(interval);
  }, [isPaused, animes.length, nextSlide]);

  if (!animes.length) return null;

  const anime = animes[currentIndex];

  return (
    <section
      className="relative w-full overflow-hidden border-b border-zinc-800/80 bg-zinc-950 text-white min-h-[420px] lg:min-h-[500px] flex items-center"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        {anime.banner_url || anime.portada_url ? (
          <img
            src={anime.banner_url || anime.portada_url}
            alt={anime.titulo}
            className="h-full w-full object-cover opacity-40 transition-opacity duration-700"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-blue-900 to-zinc-900" />
        )}
        
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Info */}
          <div className="lg:col-span-8 space-y-4">
            {/* Badge */}
            <div className="flex items-center gap-2">
              <span className="rounded-full border border-blue-500/40 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400">
                ✨ Destacado
              </span>
              <span className="rounded-full border border-zinc-800 bg-zinc-900/80 px-2.5 py-0.5 text-xs text-zinc-400">
                {currentIndex + 1} / {animes.length}
              </span>
            </div>

            <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl lg:text-5xl drop-shadow-md">
              {anime.titulo}
            </h1>

            <p className="text-sm sm:text-base text-zinc-300 max-w-2xl line-clamp-3 leading-relaxed">
              {anime.sinopsis || 'Sin descripción disponible'}
            </p>

            {/* Botones */}
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <Link
                href={`/anime/${anime.id}`}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-xl shadow-blue-600/30 hover:bg-blue-500 transition-all active:scale-95"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Comenzar Serie
              </Link>

              <Link
                href={`/anime/${anime.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-4 py-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all"
              >
                Más Info
              </Link>
            </div>
          </div>

          {/* Right: Poster */}
          <div className="hidden lg:flex justify-end lg:col-span-4">
            <div className="relative aspect-[3/4] w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">
              {anime.portada_url ? (
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl">🎬</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Flechas de navegación */}
      {animes.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-zinc-900/80 p-2 text-white hover:bg-zinc-800 backdrop-blur-sm transition-all"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-20 rounded-full bg-zinc-900/80 p-2 text-white hover:bg-zinc-800 backdrop-blur-sm transition-all"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      {/* Indicadores (dots) */}
      {animes.length > 1 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {animes.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === currentIndex ? 'w-8 bg-blue-500' : 'w-2 bg-zinc-600 hover:bg-zinc-400'
              }`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
