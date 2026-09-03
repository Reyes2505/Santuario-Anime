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
        const { data: animeData } = await supabase.from('animes').select('*').eq('id', id).single();
        if (animeData) setAnime(animeData);

        const { data: tempsData } = await supabase.from('temporadas').select('*').eq('anime_id', id).order('orden');
        if (tempsData) setTemporadas(tempsData);

        const { data: epsData } = await supabase.from('episodios').select('*').order('numero');
        if (epsData) setEpisodios(epsData);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 border-2 border-t-transparent border-white rounded-full animate-spin" />
      </main>
    );
  }

  if (!anime) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">No encontrado</main>;
  }

  const estadoDot = anime.estado_emision === 'emitido' ? 'bg-green-500' : 
                    anime.estado_emision === 'suspendido' ? 'bg-red-500' : 
                    anime.estado_emision === 'terminado' ? 'bg-blue-500' : 'bg-zinc-500';

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img src={anime.banner_url || anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
        ) : <div className="h-full w-full bg-zinc-900" />}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        <Link href="/" className="absolute top-4 left-4 text-sm text-zinc-400 hover:text-white">← Volver</Link>
      </div>

      <section className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
        <div className="flex gap-6">
          {/* Portada */}
          <div className="w-40 shrink-0">
            <div className="aspect-[3/4] rounded-xl overflow-hidden border border-zinc-800">
              {anime.portada_url ? (
                <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
              ) : <div className="h-full w-full bg-zinc-800" />}
            </div>
          </div>

          {/* Info detallada */}
          <div className="flex-1 pt-16">
            <div className="flex items-center gap-2">
              <h1 className="text-3xl font-black text-white">{anime.titulo}</h1>
              <span className={`h-3 w-3 rounded-full ${estadoDot} animate-pulse`} />
            </div>

            {anime.sinopsis && <p className="mt-3 text-sm text-zinc-400 max-w-3xl">{anime.sinopsis}</p>}

            {/* Metadata */}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-zinc-900/60 p-3">
                <span className="text-zinc-500">Estado:</span>
                <span className="text-white ml-1">{anime.estado_emision || 'Desconocido'}</span>
              </div>
              <div className="rounded-lg bg-zinc-900/60 p-3">
                <span className="text-zinc-500">Episodios:</span>
                <span className="text-white ml-1">{episodios.length}</span>
              </div>
              {anime.fecha_estreno && (
                <div className="rounded-lg bg-zinc-900/60 p-3">
                  <span className="text-zinc-500">Estreno:</span>
                  <span className="text-white ml-1">{new Date(anime.fecha_estreno + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                </div>
              )}
              {anime.generos && anime.generos.length > 0 && (
                <div className="rounded-lg bg-zinc-900/60 p-3">
                  <span className="text-zinc-500">Géneros:</span>
                  <span className="text-white ml-1">{anime.generos.join(', ')}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Temporadas y episodios */}
      <section className="mx-auto max-w-7xl px-4 pt-8 space-y-8">
        {temporadas.map((temp) => {
          const epsDeTemp = episodios.filter((ep) => ep.temporada_id === temp.id);
          if (epsDeTemp.length === 0) return null;

          return (
            <div key={temp.id}>
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
