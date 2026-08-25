'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import { recomendarAnimes, encontrarSimilares } from '@/lib/recommendation';

export default function RecomendacionesPage() {
  const [recomendaciones, setRecomendaciones] = useState<Anime[]>([]);
  const [similares, setSimilares] = useState<{ anime: Anime; similares: Anime[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [historial, setHistorial] = useState<Anime[]>([]);

  useEffect(() => {
    async function cargar() {
      setLoading(true);

      try {
        // Cargar todos los animes
        const { data: todosAnimes } = await supabase.from('animes').select('*');

        if (todosAnimes) {
          // Obtener historial del localStorage
          const historialGuardado = JSON.parse(localStorage.getItem('historial_animes') || '[]');
          const historialCompleto = todosAnimes.filter((a) => historialGuardado.includes(a.id));

          setHistorial(historialCompleto);

          // Calcular recomendaciones
          const recomendados = recomendarAnimes(historialCompleto, todosAnimes, 12);
          setRecomendaciones(recomendados);

          // Calcular similares para los primeros 3 animes del historial
          const similaresCalc = historialCompleto.slice(0, 3).map((anime) => ({
            anime,
            similares: encontrarSimilares(anime, todosAnimes, 6),
          }));
          setSimilares(similaresCalc);
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-white mb-6">🔮 Recomendaciones para ti</h1>

        {/* Basado en tu historial */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-white mb-4">
            Basado en tus gustos
            {historial.length > 0 && (
              <span className="text-xs font-normal text-zinc-500 ml-2">
                ({historial.length} animes vistos)
              </span>
            )}
          </h2>

          {recomendaciones.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {recomendaciones.map((anime) => (
                <Link
                  key={anime.id}
                  href={`/anime/${anime.id}`}
                  className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-all hover:scale-105 hover:border-blue-500/50"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada_url ? (
                      <img
                        src={anime.portada_url}
                        alt={anime.titulo}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">
                        🎬
                      </div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                    <h3 className="text-xs font-bold text-white line-clamp-2">{anime.titulo}</h3>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">
              Aún no tienes historial. Ve algunos animes para obtener recomendaciones personalizadas.
            </p>
          )}
        </section>

        {/* Similares a los que has visto */}
        {similares.map(({ anime, similares: sims }) => (
          <section key={anime.id} className="mb-8">
            <h2 className="text-lg font-bold text-white mb-4">
              Porque viste: <span className="text-blue-400">{anime.titulo}</span>
            </h2>

            {sims.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {sims.map((sim) => (
                  <Link
                    key={sim.id}
                    href={`/anime/${sim.id}`}
                    className="group relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-zinc-900/40 transition-all hover:scale-105 hover:border-blue-500/50"
                  >
                    <div className="aspect-[3/4] overflow-hidden">
                      {sim.portada_url ? (
                        <img
                          src={sim.portada_url}
                          alt={sim.titulo}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                      )}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black to-transparent">
                      <h3 className="text-xs font-bold text-white line-clamp-2">{sim.titulo}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No hay suficientes datos para recomendar.</p>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
