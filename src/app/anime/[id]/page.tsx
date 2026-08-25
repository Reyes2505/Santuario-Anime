'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, Temporada } from '@/types/database';
import EpisodeGrid from '@/components/EpisodeGrid';
import { marcarComoViendo, marcarComoVisto, marcarPorVer, getTracking } from '@/lib/tracking';

export default function AnimeDetailPage() {
  const { id } = useParams();
  const [anime, setAnime] = useState<Anime | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [estadoTracking, setEstadoTracking] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setLoading(true);

      const tracking = getTracking();
      setEstadoTracking(tracking[id as string]?.estado || '');

      try {
        const { data: animeData } = await supabase.from('animes').select('*').eq('id', id).single();
        if (animeData) setAnime(animeData);

        const { data: tempsData } = await supabase.from('temporadas').select('*').eq('anime_id', id).order('orden');
        if (tempsData) setTemporadas(tempsData);

        const { data: epsData } = await supabase.from('episodios').select('*').order('numero');
        if (epsData) setEpisodios(epsData);

        // Cargar thumbnails UNA SOLA VEZ para todo el anime
        if (animeData?.titulo) {
          const cacheKey = `thumbnails_anime_${id}`;
          const cache = localStorage.getItem(cacheKey);

          if (cache) {
            setThumbnails(JSON.parse(cache));
          } else {
            try {
              const response = await fetch(`/api/thumbnails?titulo=${encodeURIComponent(animeData.titulo)}`);
              const data = await response.json();

              if (data.episodes && data.episodes.length > 0) {
                const thumbMap: Record<string, string> = {};
                data.episodes.forEach((ep: any) => {
                  if (ep.thumbnail) {
                    thumbMap[ep.numero] = ep.thumbnail;
                  }
                });
                setThumbnails(thumbMap);
                localStorage.setItem(cacheKey, JSON.stringify(thumbMap));
              }
            } catch (err) {
              console.error('Error cargando thumbnails:', err);
            }
          }
        }
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [id]);

  const handleMarcar = (estado: 'viendo' | 'visto' | 'por_ver') => {
    if (!id) return;
    if (estado === 'viendo') marcarComoViendo(id as string, 1);
    if (estado === 'visto') marcarComoVisto(id as string);
    if (estado === 'por_ver') marcarPorVer(id as string);
    setEstadoTracking(estado);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  if (!anime) {
    return <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">Anime no encontrado</main>;
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="relative h-64 md:h-80 overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img src={anime.banner_url || anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
        ) : <div className="h-full w-full bg-zinc-900" />}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 to-transparent" />
        <Link href="/" className="absolute top-4 left-4 rounded-xl bg-zinc-900/80 px-4 py-2 text-xs text-white">← Volver</Link>
      </div>

      <section className="mx-auto max-w-7xl px-4 -mt-20 relative z-10">
        <div className="flex gap-6">
          <div className="w-40 shrink-0">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border border-zinc-700">
              {anime.portada_url ? (
                <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
              ) : <div className="h-full w-full bg-zinc-800 flex items-center justify-center text-4xl">🎬</div>}
            </div>
          </div>
          <div className="flex-1 pt-16">
            <h1 className="text-3xl font-bold text-white">{anime.titulo}</h1>
            {anime.sinopsis && <p className="mt-3 text-sm text-zinc-400 max-w-3xl">{anime.sinopsis}</p>}
            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => handleMarcar('viendo')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${estadoTracking === 'viendo' ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>👁️ Viendo</button>
              <button onClick={() => handleMarcar('visto')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${estadoTracking === 'visto' ? 'bg-green-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>✅ Visto</button>
              <button onClick={() => handleMarcar('por_ver')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${estadoTracking === 'por_ver' ? 'bg-yellow-600 text-white' : 'bg-zinc-800 text-zinc-300'}`}>📌 Por ver</button>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-8 space-y-8">
        {temporadas.map((temp) => {
          const epsDeTemp = episodios.filter((ep) => ep.temporada_id === temp.id);
          if (epsDeTemp.length === 0) return null;

          return (
            <div key={temp.id}>
              <div className="border-b border-zinc-800 pb-3 mb-4">
                <h2 className="text-lg font-bold text-white">{temp.nombre}</h2>
                <p className="text-xs text-zinc-500">{epsDeTemp.length} episodios</p>
              </div>
              {/* Pasar thumbnails al EpisodeGrid */}
              <EpisodeGrid episodios={epsDeTemp} thumbnails={thumbnails} />
            </div>
          );
        })}
      </section>
    </main>
  );
}
