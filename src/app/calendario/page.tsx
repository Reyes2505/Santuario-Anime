'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';

interface AnimeEmision {
  id: number;
  titulo: string;
  portada: string;
  hora: string;
  dia: number;
  episodio: number;
  formato: string;
}

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CACHE_KEY = 'anilist_calendario_cache';
const CACHE_DURATION = 30 * 60 * 1000;

const QUERY = `
query {
  Page(page: 1, perPage: 50) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      id
      title { romaji }
      coverImage { large }
      nextAiringEpisode {
        episode
        airingAt
      }
      format
    }
  }
}
`;

export default function CalendarioPage() {
  const [animesEnEmision, setAnimesEnEmision] = useState<AnimeEmision[]>([]);
  const [animesEnBD, setAnimesEnBD] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ajuste seguro para obtener el día actual en formato JavaScript (0=Lunes, 6=Domingo)
  const [diaSeleccionado, setDiaSeleccionado] = useState(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setError('');

      try {
        const { data: animesBD } = await supabase.from('animes').select('*');
        if (animesBD) setAnimesEnBD(animesBD);
      } catch (err) {
        console.error('Error cargando Supabase:', err);
      }

      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAnimesEnEmision(data);
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: QUERY }),
        });

        if (response.status === 429) {
          const cacheViejo = localStorage.getItem(CACHE_KEY);
          if (cacheViejo) {
            const { data } = JSON.parse(cacheViejo);
            setAnimesEnEmision(data);
          }
          setError('Límite de API alcanzado. Mostrando datos en caché.');
          setLoading(false);
          return;
        }

        const data = await response.json();
        const animes = data.data.Page.media
          .filter((anime: any) => anime.nextAiringEpisode)
          .map((anime: any): AnimeEmision => {
            const fecha = new Date(anime.nextAiringEpisode.airingAt * 1000);
            return {
              id: anime.id,
              titulo: anime.title.romaji,
              portada: anime.coverImage.large,
              hora: fecha.getHours().toString().padStart(2, '0') + ':' + 
                    fecha.getMinutes().toString().padStart(2, '0'),
              dia: (fecha.getDay() + 6) % 7,
              episodio: anime.nextAiringEpisode.episode,
              formato: anime.format || 'TV',
            };
          });

        setAnimesEnEmision(animes);
        localStorage.setItem(CACHE_KEY, JSON.stringify({
          data: animes,
          timestamp: Date.now(),
        }));
      } catch (err) {
        setError('Error al conectar con AniList.');
      } finally {
        setLoading(false);
      }
    }

    cargarDatos();
  }, []);

  const encontrarEnBD = useCallback((tituloAniList: string) => {
    const tituloNormalizado = tituloAniList.toLowerCase().replace(/[^a-z0-9]/g, '');
    
    const exacta = animesEnBD.find(a => {
      const tituloBD = a.titulo.toLowerCase().replace(/[^a-z0-9]/g, '');
      return tituloBD === tituloNormalizado;
    });
    if (exacta) return exacta;

    if (tituloNormalizado.length < 15) return undefined;

    const palabrasAniList = tituloAniList.toLowerCase().split(' ');
    
    return animesEnBD.find(a => {
      const tituloBD = a.titulo.toLowerCase();
      const comunes = palabrasAniList.filter(p => p.length > 2 && tituloBD.includes(p));
      return comunes.length >= 3;
    });
  }, [animesEnBD]);

  const animesDelDia = useMemo(() => {
    return animesEnEmision
      .filter(a => a.dia === diaSeleccionado)
      .sort((a, b) => a.hora.localeCompare(b.hora));
  }, [animesEnEmision, diaSeleccionado]);

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-black text-white mb-2">
          📅 Calendario de <span className="text-emerald-400">Estrenos</span>
        </h1>
        <p className="text-xs text-zinc-500 mb-6">
          Animes en emisión con próximos episodios
        </p>

        {error && (
          <div className="mb-4 rounded-xl border border-yellow-800/60 bg-yellow-950/40 p-3 text-xs text-yellow-300">
            ⚠️ {error}
          </div>
        )}

        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {DIAS_SEMANA.map((dia, i) => {
            const cantidad = animesEnEmision.filter(a => a.dia === i).length;
            return (
              <button
                key={dia}
                onClick={() => setDiaSeleccionado(i)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                  diaSeleccionado === i
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800'
                }`}
              >
                {dia}
                {cantidad > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                    diaSeleccionado === i ? 'bg-white/20' : 'bg-zinc-800 text-zinc-500'
                  }`}>
                    {cantidad}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <h2 className="text-lg font-bold text-white mb-4">
          {DIAS_SEMANA[diaSeleccionado]}
          <span className="text-xs font-normal text-zinc-500 ml-2">
            {animesDelDia.length} estrenos
          </span>
        </h2>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : animesDelDia.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {animesDelDia.map((anime) => {
              const enBD = encontrarEnBD(anime.titulo);
              const href = enBD ? `/anime/${enBD.id}` : `https://anilist.co/anime/${anime.id}`;
              const esExterno = !enBD;

              const Component = esExterno ? 'a' : Link;

              return (
                <Component
                  key={anime.id}
                  href={href}
                  target={esExterno ? '_blank' : undefined}
                  rel={esExterno ? 'noopener noreferrer' : undefined}
                  className="group relative overflow-hidden rounded-xl border border-zinc-800/60 bg-zinc-900/40 hover:border-emerald-500/50 transition-all hover:scale-[1.03]"
                >
                  <div className="aspect-[3/4] overflow-hidden">
                    {anime.portada ? (
                      <img src={anime.portada} alt={anime.titulo} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-3xl">🎬</div>
                    )}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 to-transparent">
                    <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-emerald-300 transition-colors">
                      {anime.titulo}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold text-emerald-400">
                        EP {anime.episodio}
                      </span>
                      <span className="text-[10px] text-zinc-400">{anime.hora} hrs</span>
                      {enBD ? (
                        <span className="text-[10px] font-bold text-blue-400 bg-blue-950/60 px-1.5 py-0.5 rounded">
                          ✓ Disponible
                        </span>
                      ) : (
                        <span className="text-[10px] text-zinc-600">AniList ↗</span>
                      )}
                    </div>
                  </div>
                </Component>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No hay estrenos programados para este día.</p>
        )}
      </div>
    </main>
  );
}
