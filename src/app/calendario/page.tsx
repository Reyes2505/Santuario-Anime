'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio } from '@/types/database';

const DIAS_SEMANA = [
  'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
];

export default function CalendarioPage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState(true);
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() - 1);

  useEffect(() => {
    async function cargar() {
      setLoading(true);
      const { data: animesData } = await supabase.from('animes').select('*');
      const { data: epsData } = await supabase.from('episodios').select('*');
      
      if (animesData) setAnimes(animesData);
      if (epsData) setEpisodios(epsData);
      setLoading(false);
    }
    cargar();
  }, []);

  // Agrupar animes por día de estreno
  // JK Anime no da el día exacto, así que usamos el último episodio como referencia
  
  const hoy = new Date().getDay();
  const diasNormalizados = DIAS_SEMANA.map((_, i) => (i + 1) % 7); // Lunes=0

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-bold text-white mb-6">📅 Calendario de Estrenos</h1>

        {/* Selector de días */}
        <div className="flex gap-2 mb-8 overflow-x-auto">
          {DIAS_SEMANA.map((dia, i) => (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(i)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                diaSeleccionado === i
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>

        {/* Animes del día seleccionado */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">
            {DIAS_SEMANA[diaSeleccionado]}
          </h2>
          
          {animes.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {animes.map((anime) => {
                const epsDeAnime = episodios.filter(ep => {
                  const temps = anime.id;
                  return ep.temporada_id === temps;
                });
                const ultimoEp = epsDeAnime.length > 0 ? Math.max(...epsDeAnime.map(e => e.numero)) : 0;
                
                return (
                  <Link
                    key={anime.id}
                    href={`/anime/${anime.id}`}
                    className="group relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-blue-500/50 transition-all hover:scale-105"
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
                      {ultimoEp > 0 && (
                        <p className="text-[10px] text-blue-400 mt-1">EP {ultimoEp + 1} próximo</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No hay animes programados para este día.</p>
          )}
        </section>
      </div>
    </main>
  );
}
