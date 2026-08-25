'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import { getRecomendacionesIA, getEstadisticasUsuario } from '@/lib/ai-recommendations';

export default function RecomendacionesPage() {
  const [recomendaciones, setRecomendaciones] = useState<Anime[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      
      const { data: todosAnimes } = await supabase.from('animes').select('*');
      
      if (todosAnimes) {
        const recomendados = getRecomendacionesIA(todosAnimes, 12);
        setRecomendaciones(recomendados);
      }
      
      setEstadisticas(getEstadisticasUsuario());
      setLoading(false);
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
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-black text-white mb-2">
          🔮 Recomendaciones <span className="text-purple-400">IA</span>
        </h1>
        <p className="text-xs text-zinc-500 mb-6">
          Basado en tu historial de visualización
        </p>

        {/* Estadísticas */}
        {estadisticas && (
          <div className="mb-8 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-bold text-white mb-3">📊 Tu perfil</h3>
            <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
              <span>📺 {estadisticas.animesVistos} animes</span>
              <span>🎬 {estadisticas.episodiosVistos} episodios</span>
              <span>⏱️ {estadisticas.tiempoTotalMinutos} min</span>
            </div>
            {estadisticas.generosTop.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {estadisticas.generosTop.map((g: any) => (
                  <span key={g.genero} className="rounded-lg bg-purple-950/50 border border-purple-500/30 px-2 py-1 text-[10px] font-bold text-purple-300">
                    {g.genero} ({g.peso})
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Recomendaciones */}
        {recomendaciones.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {recomendaciones.map((anime) => (
              <Link
                key={anime.id}
                href={`/anime/${anime.id}`}
                className="group relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-purple-500/50 transition-all hover:scale-105"
              >
                <div className="aspect-[3/4] overflow-hidden">
                  {anime.portada_url ? (
                    <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                  <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-purple-300 transition-colors">
                    {anime.titulo}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">
            Ve algunos animes para obtener recomendaciones personalizadas.
          </p>
        )}
      </div>
    </main>
  );
}
