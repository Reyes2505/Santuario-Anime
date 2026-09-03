'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, Temporada } from '@/types/database';
import EpisodeGrid from '@/components/EpisodeGrid';

export default function AnimeDetailPage() {
  const { id } = useParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      try {
        // 1. Cargar anime
        const { data: animeData } = await supabase.from('animes').select('*').eq('id', id).single();
        if (animeData) setAnime(animeData);

        // 2. Cargar temporadas de este anime
        const { data: tempsData } = await supabase
          .from('temporadas')
          .select('*')
          .eq('anime_id', id)
          .order('orden');
        
        if (tempsData) {
          setTemporadas(tempsData);

          // 3. Cargar episodios de estas temporadas
          const tempIds = tempsData.map(t => t.id);
          
          if (tempIds.length > 0) {
            const { data: epsData } = await supabase
              .from('episodios')
              .select('*')
              .in('temporada_id', tempIds)
              .order('numero');
            
            if (epsData) setEpisodios(epsData);
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setTimeout(() => setLoading(false), 600);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950">
        <div className="h-64 md:h-80 skeleton-shimmer relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg shadow-blue-500/30 animate-spin-slow flex items-center justify-center">
                <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-sm text-zinc-400 animate-pulse">Cargando anime...</p>
            </div>
          </div>
        </div>
        
        <div className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
          <div className="flex gap-6">
            <div className="w-40 shrink-0">
              <div className="aspect-[3/4] rounded-xl skeleton-shimmer" />
            </div>
            <div className="flex-1 pt-16 space-y-4">
              <div className="h-8 w-2/3 skeleton-shimmer rounded-lg" />
              <div className="h-4 w-full skeleton-shimmer rounded-lg" />
              <div className="h-4 w-4/5 skeleton-shimmer rounded-lg" />
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="h-14 skeleton-shimmer rounded-lg" />
                <div className="h-14 skeleton-shimmer rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!anime) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center animate-fade-in">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-white text-lg font-bold">No encontrado</p>
          <Link href="/" className="text-blue-400 hover:text-blue-300 text-sm mt-2 inline-block">
            ← Volver al inicio
          </Link>
        </div>
      </main>
    );
  }

  const estadoDot = anime.estado_emision === 'emitido' ? 'bg-green-500' : 
                    anime.estado_emision === 'suspendido' ? 'bg-red-500' : 
                    anime.estado_emision === 'terminado' ? 'bg-blue-500' : 'bg-zinc-500';

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Banner con parallax */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img 
            src={anime.banner_url || anime.portada_url} 
            alt={anime.titulo} 
            className="h-full w-full object-cover animate-parallax" 
          />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        
        <Link 
          href="/" 
          className="absolute top-4 left-4 text-sm text-zinc-300 hover:text-white transition-all hover:scale-105 animate-fade-in bg-black/50 backdrop-blur-md rounded-full px-4 py-2"
        >
          ← Volver
        </Link>
      </div>

      <section className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
        <div className="flex gap-6">
          <div className="w-40 shrink-0 animate-slide-up">
            <div className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50 hover:shadow-blue-500/20 transition-all duration-500 hover:scale-105">
              {anime.portada_url ? (
                <img 
                  src={anime.portada_url} 
                  alt={anime.titulo} 
                  className="h-full w-full object-cover hover:scale-110 transition-transform duration-700" 
                />
              ) : (
                <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-4xl">🎬</div>
              )}
            </div>
          </div>

          <div className="flex-1 pt-16">
            <div className="flex items-center gap-2 animate-slide-up delay-100">
              <h1 className="text-3xl font-black text-white">{anime.titulo}</h1>
              <span className={`h-3 w-3 rounded-full ${estadoDot} animate-pulse`} />
            </div>

            {anime.sinopsis && (
              <p className="mt-3 text-sm text-zinc-400 max-w-3xl animate-slide-up delay-200">
                {anime.sinopsis}
              </p>
            )}

            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-zinc-900/60 p-3 animate-slide-up delay-300 hover:bg-zinc-900/80 transition-colors">
                <span className="text-zinc-500">Estado:</span>
                <span className="text-white ml-1">{anime.estado_emision || 'Desconocido'}</span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-3 animate-slide-up delay-400 hover:bg-zinc-900/80 transition-colors">
                <span className="text-zinc-500">Episodios:</span>
                <span className="text-white ml-1">{episodios.length}</span>
              </div>
              {anime.fecha_estreno && (
                <div className="rounded-lg bg-zinc-900/60 p-3 animate-slide-up delay-500 hover:bg-zinc-900/80 transition-colors">
                  <span className="text-zinc-500">Estreno:</span>
                  <span className="text-white ml-1">{new Date(anime.fecha_estreno + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {anime.generos && anime.generos.length > 0 && (
                <div className="rounded-lg bg-zinc-900/60 p-3 animate-slide-up delay-600 hover:bg-zinc-900/80 transition-colors">
                  <span className="text-zinc-500">Géneros:</span>
                  <span className="text-white ml-1">{anime.generos.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Temporadas y episodios */}
      <section className="mx-auto max-w-7xl px-4 pt-8 space-y-8 animate-fade-in delay-700">
        {temporadas.map((temp, index) => {
          const epsDeTemp = episodios.filter((ep) => ep.temporada_id === temp.id);
          if (epsDeTemp.length === 0) return null;

          return (
            <div 
              key={temp.id} 
              className="animate-slide-up"
              style={{ animationDelay: `${0.8 + index * 0.1}s` }}
            >
              <div className="border-b border-zinc-900 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white">{temp.nombre}</h2>
                <p className="text-xs text-zinc-500">{epsDeTemp.length} episodios</p>
              </div>
              <EpisodeGrid episodios={epsDeTemp} />
            </div>
          );
        })}
      </section>
    </main>
  );
}
