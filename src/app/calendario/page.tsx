'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CACHE_KEY = 'anilist_calendario_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutos

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
  const [animesEnEmision, setAnimesEnEmision] = useState<any[]>([]);
  const [animesEnBD, setAnimesEnBD] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [diaSeleccionado, setDiaSeleccionado] = useState(new Date().getDay() - 1);

  useEffect(() => {
    async function cargarDatos() {
      setLoading(true);
      setError('');

      // 1. Cargar animes de Supabase para verificar si están en nuestro catálogo
      try {
        const { data: animesBD } = await supabase.from('animes').select('*');
        if (animesBD) setAnimesEnBD(animesBD);
      } catch (err) {
        console.error('Error cargando Supabase:', err);
      }

      // 2. Verificar caché de AniList
      const cache = localStorage.getItem(CACHE_KEY);
      if (cache) {
        const { data, timestamp } = JSON.parse(cache);
        if (Date.now() - timestamp < CACHE_DURATION) {
          setAnimesEnEmision(data);
          setLoading(false);
          return;
        }
      }

      // 3. Obtener de AniList
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
          .map((anime: any) => {
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

  const animesDelDia = animesEnEmision
    .filter(a => a.dia === diaSeleccionado)
    .sort((a, b) => a.hora.localeCompare(b.hora));

  // Verificar si un anime de AniList está en nuestro catálogo
  const encontrarEnBD = (tituloAniList: string) => {
    return animesEnBD.find(a => {
      const tituloBD = a.titulo.toLowerCase();
      const tituloAni = tituloAniList.toLowerCase();
      return tituloBD.includes(tituloAni.split(':')[0].trim()) || 
             tituloAni.includes(tituloBD.split(':')[0].trim());
    });
  };

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

        {/* Selector de días */}
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

        {/* Animes del día */}
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

              return (
                <a
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
                </a>
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
