'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime, Episodio, Temporada } from '@/types/database';
import EpisodeGrid from '@/components/EpisodeGrid';
import { marcarComoViendo, marcarComoVisto, marcarPorVer, getTracking } from '@/lib/tracking';

type TrackingStatus = 'viendo' | 'visto' | 'por_ver' | '';

export default function AnimeDetailPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params[0] : params?.id;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [temporadas, setTemporadas] = useState<Temporada[]>([]);
  const [episodios, setEpisodios] = useState<Episodio[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [estadoTracking, setEstadoTracking] = useState<TrackingStatus>('');

  const loadAnimeData = useCallback(async () => {
    if (!id) return;
    setLoading(true);

    try {
      // 🚀 Mejora Senior: Ejecución concurrente con Promise.all para máxima velocidad
      const [trackingRes, animeRes, tempsRes] = await Promise.all([
        getTracking(),
        supabase.from('animes').select('*').eq('id', id).single(),
        supabase.from('temporadas').select('*').eq('anime_id', id).order('orden', { ascending: true })
      ]);

      setEstadoTracking((trackingRes[id]?.estado as TrackingStatus) || '');

      if (animeRes.error || !animeRes.data) {
        setAnime(null);
        return;
      }
      setAnime(animeRes.data as Anime);

      const temps = tempsRes.data || [];
      setTemporadas(temps);

      if (temps.length > 0) {
        const tempIds = temps.map((t) => t.id);

        // Carga masiva y limpia de todos los episodios pertenecientes a las temporadas del anime
        const { data: epsData, error: epsError } = await supabase
          .from('episodios')
          .select('*')
          .in('temporada_id', tempIds)
          .order('numero', { ascending: true });

        if (!epsError && epsData) {
          setEpisodios(epsData as Episodio[]);
        }
      }
    } catch (err) {
      console.error('[Critical Error] Falló la carga del detalle del anime:', err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAnimeData();
  }, [loadAnimeData]);

  const handleMarcar = async (estado: 'viendo' | 'visto' | 'por_ver') => {
    if (!id) return;

    try {
      if (estado === 'viendo') await marcarComoViendo(id, 1);
      if (estado === 'visto') await marcarComoVisto(id);
      if (estado === 'por_ver') await marcarPorVer(id);
      
      setEstadoTracking(estado);
    } catch (err) {
      console.error('Error al actualizar el estado de seguimiento:', err);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="relative flex items-center justify-center">
          <div className="absolute h-12 w-12 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
          <div className="h-6 w-6 rounded-full bg-blue-500/10 animate-pulse" />
        </div>
      </main>
    );
  }

  if (!anime) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 text-white space-y-4">
        <p className="text-zinc-400 text-sm font-medium">No se encontró el registro de este anime.</p>
        <Link href="/" className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors">
          Volver al inicio
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 selection:bg-blue-600 selection:text-white">
      {/* Banner Superior con Gradiente Inmersivo */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden">
        {anime.banner_url || anime.portada_url ? (
          <img 
            src={anime.banner_url || anime.portada_url!} 
            alt={anime.titulo} 
            className="h-full w-full object-cover object-center filter blur-[2px] opacity-40 scale-105 transform transition-transform duration-700" 
          />
        ) : (
          <div className="h-full w-full bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
        
        <Link 
          href="/" 
          className="absolute top-6 left-6 z-20 flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-xs font-medium text-zinc-300 hover:text-white hover:bg-black/60 transition-all"
        >
          <span>←</span> Volver
        </Link>
      </div>

      {/* Contenido Principal y Ficha Técnica */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-32 relative z-10">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          
          {/* Póster Oficial */}
          <div className="w-44 sm:w-52 shrink-0 mx-auto md:mx-0 shadow-2xl shadow-black/80">
            <div className="aspect-[3/4] rounded-2xl overflow-hidden border-2 border-zinc-800/80 bg-zinc-900">
              {anime.portada_url ? (
                <img src={anime.portada_url} alt={anime.titulo} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-4xl">🎬</div>
              )}
            </div>
          </div>

          {/* Información y Acciones */}
          <div className="flex-1 pt-2 md:pt-24 text-center md:text-left space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
              {anime.titulo}
            </h1>
            
            {anime.sinopsis && (
              <p className="text-sm text-zinc-400 leading-relaxed max-w-3xl">
                {anime.sinopsis}
              </p>
            )}
            
            {/* Botones de Tracking / Estado */}
            <div className="flex flex-wrap gap-2.5 justify-center md:justify-start pt-2">
              <button
                onClick={() => handleMarcar('viendo')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  estadoTracking === 'viendo'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-600/10'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                👁️ Viendo
              </button>
              <button
                onClick={() => handleMarcar('visto')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  estadoTracking === 'visto'
                    ? 'bg-emerald-600/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-600/10'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                ✅ Visto
              </button>
              <button
                onClick={() => handleMarcar('por_ver')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 border ${
                  estadoTracking === 'por_ver'
                    ? 'bg-amber-600/20 border-amber-500 text-amber-400 shadow-lg shadow-amber-600/10'
                    : 'bg-zinc-900/80 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                📌 Por ver
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Listado de Temporadas y Cuadrícula de Episodios Completa */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 space-y-12">
        {temporadas.length === 0 ? (
          <div className="text-center py-12 border border-zinc-900 rounded-2xl bg-zinc-900/20">
            <p className="text-sm text-zinc-500">No hay temporadas registradas para este anime todavía.</p>
          </div>
        ) : (
          temporadas.map((temp) => {
            const epsDeTemp = episodios.filter((ep) => ep.temporada_id === temp.id);
            if (epsDeTemp.length === 0) return null;

            return (
              <div key={temp.id} className="space-y-4">
                <div className="flex items-baseline justify-between border-b border-zinc-900 pb-3">
                  <h2 className="text-lg font-bold text-white tracking-wide">{temp.nombre}</h2>
                  <span className="text-xs font-medium text-zinc-500 bg-zinc-900 px-2.5 py-1 rounded-full border border-zinc-800/80">
                    {epsDeTemp.length} {epsDeTemp.length === 1 ? 'episodio' : 'episodios'}
                  </span>
                </div>
                
                {/* Cuadrícula limpia sin recortes */}
                <EpisodeGrid episodios={epsDeTemp} />
              </div>
            );
          })
        )}
      </section>
    </main>
  );
}
