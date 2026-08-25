'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import { getTracking, TrackingData } from '@/lib/tracking';

export default function MiListaPage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [tracking, setTracking] = useState<Record<string, TrackingData>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      setTracking(getTracking());

      const { data } = await supabase.from('animes').select('*');
      if (data) setAnimes(data);
      setLoading(false);
    }
    cargar();
  }, []);

  const animesViendo = animes.filter(a => tracking[a.id]?.estado === 'viendo');
  const animesVistos = animes.filter(a => tracking[a.id]?.estado === 'visto');
  const animesPorVer = animes.filter(a => tracking[a.id]?.estado === 'por_ver');

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">📋 Mi Lista</h1>

        {/* Viendo */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-blue-400 mb-4">
            👁️ Viendo ({animesViendo.length})
          </h2>
          {animesViendo.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animesViendo.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:border-blue-500/50 transition-all hover:scale-105"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada_url ? (
                      <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-xs font-bold text-white line-clamp-2">{anime.titulo}</h3>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      EP {tracking[anime.id]?.ultimoEpisodio || 0} · {tracking[anime.id]?.progreso || 0}%
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No hay animes en progreso.</p>
          )}
        </section>

        {/* Vistos */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-green-400 mb-4">
            ✅ Vistos ({animesVistos.length})
          </h2>
          {animesVistos.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animesVistos.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:border-green-500/50 transition-all hover:scale-105"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada_url ? (
                      <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-xs font-bold text-white line-clamp-2">{anime.titulo}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No has completado ningún anime.</p>
          )}
        </section>

        {/* Por ver */}
        <section>
          <h2 className="text-lg font-bold text-yellow-400 mb-4">
            📌 Por ver ({animesPorVer.length})
          </h2>
          {animesPorVer.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animesPorVer.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 hover:border-yellow-500/50 transition-all hover:scale-105"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada_url ? (
                      <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-xs font-bold text-white line-clamp-2">{anime.titulo}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No hay animes en tu lista de pendientes.</p>
          )}
        </section>
      </div>
    </main>
  );
}
