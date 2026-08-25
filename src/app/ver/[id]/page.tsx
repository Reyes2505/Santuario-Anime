"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Episodio, Anime } from '@/types/database';
import VideoPlayer from '@/components/VideoPlayer';
import { registrarVisualizacion } from '@/lib/ai-recommendations';

interface PageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function Page({ params }: PageProps) {
  const { id } = (React as any).use ? (React as any).use(params) : (params as { id: string });
  const [episodio, setEpisodio] = useState<Episodio | null>(null);
  const [anime, setAnime] = useState<Anime | null>(null);
  const [mismaTemporada, setMismaTemporada] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        // Cargar episodio actual
        const { data: epData } = await supabase
          .from('episodios')
          .select('*')
          .eq('id', id)
          .single();

        if (epData && mounted) {
          setEpisodio(epData as Episodio);

          // Cargar el anime al que pertenece
          const { data: tempData } = await supabase
            .from('temporadas')
            .select('anime_id')
            .eq('id', (epData as Episodio).temporada_id)
            .single();

          if (tempData && mounted) {
            const { data: animeData } = await supabase
              .from('animes')
              .select('*')
              .eq('id', tempData.anime_id)
              .single();

            if (animeData && mounted) {
              setAnime(animeData);
              // Registrar visualización para el algoritmo de IA
              registrarVisualizacion(animeData, epData as Episodio, 0);
            }
          }

          // Cargar episodios de la MISMA temporada
          const { data: sameSeason } = await supabase
            .from('episodios')
            .select('*')
            .eq('temporada_id', (epData as Episodio).temporada_id)
            .order('numero', { ascending: true });

          if (sameSeason && mounted) {
            setMismaTemporada(sameSeason as Episodio[]);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  if (!episodio) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        Episodio no encontrado
      </main>
    );
  }

  const currentIndex = mismaTemporada.findIndex((e) => e.id === episodio.id);
  const prevEp = currentIndex > 0 ? mismaTemporada[currentIndex - 1] : null;
  const nextEp = currentIndex >= 0 && currentIndex < mismaTemporada.length - 1 ? mismaTemporada[currentIndex + 1] : null;

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <section className="w-full border-b border-zinc-800/80 bg-black/80 py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Navegación */}
          <div className="flex items-center justify-between">
            <Link href={anime ? `/anime/${anime.id}` : '/'} className="text-xs font-semibold text-zinc-400 hover:text-blue-400">
              ← {anime ? anime.titulo : 'Volver'}
            </Link>
            <div className="flex gap-2">
              {prevEp ? (
                <Link href={`/ver/${prevEp.id}`} className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800">
                  ← EP {prevEp.numero}
                </Link>
              ) : null}
              {nextEp ? (
                <Link href={`/ver/${nextEp.id}`} className="rounded-lg border border-blue-600/40 bg-blue-600/20 px-3 py-1.5 text-xs text-blue-300 hover:bg-blue-600 hover:text-white">
                  EP {nextEp.numero} →
                </Link>
              ) : null}
            </div>
          </div>

          <VideoPlayer
            episodio={episodio}
            onNextEpisode={() => {
              if (nextEp) window.location.href = `/ver/${nextEp.id}`;
            }}
            onPrevEpisode={() => {
              if (prevEp) window.location.href = `/ver/${prevEp.id}`;
            }}
          />
        </div>
      </section>

      {/* Lista de episodios de la misma temporada */}
      {mismaTemporada.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-8">
          <h2 className="text-lg font-bold text-white mb-4">
            Episodios de esta temporada
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
            {mismaTemporada.map((ep) => {
              const isCurrent = ep.id === episodio.id;
              return (
                <Link
                  key={ep.id}
                  href={`/ver/${ep.id}`}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isCurrent
                      ? 'border-blue-500 bg-blue-950/20 ring-1 ring-blue-500/50'
                      : 'border-zinc-800/80 bg-zinc-900/40 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-xs font-extrabold ${isCurrent ? 'text-blue-400' : 'text-zinc-400'}`}>
                    EP {String(ep.numero).padStart(2, '0')}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
}
