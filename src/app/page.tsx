'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeGrid from '@/components/AnimeGrid';

const ITEMS_POR_PAGINA = 24;

export default function Home() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('fecha_estreno');
  const [pagina, setPagina] = useState(1);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data, error } = await supabase.from('animes').select('*');
        if (!error && data) {
          setAnimes(data);
        } else {
          setAnimes([]);
        }
      } catch {
        setAnimes([]);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const animesFiltrados = animes.filter((anime) => {
    const query = busqueda.toLowerCase().trim();
    if (!query) return true;
    return (
      anime.titulo.toLowerCase().includes(query) ||
      (anime.sinopsis || '').toLowerCase().includes(query)
    );
  });

  const animesOrdenados = [...animesFiltrados].sort((a, b) => {
    switch (orden) {
      case 'alfabetico':
        return a.titulo.localeCompare(b.titulo);
      case 'populares':
        return (b.sinopsis?.length || 0) - (a.sinopsis?.length || 0);
      case 'fecha_estreno': {
        const fechaA = a.fecha_estreno ? new Date(a.fecha_estreno).getTime() : 0;
        const fechaB = b.fecha_estreno ? new Date(b.fecha_estreno).getTime() : 0;
        return fechaB - fechaA;
      }
      case 'estado': {
        const estadoA = a.estado_emision || 'desconocido';
        const estadoB = b.estado_emision || 'desconocido';
        return estadoA.localeCompare(estadoB);
      }
      default:
        return 0;
    }
  });

  const totalPaginas = Math.ceil(animesOrdenados.length / ITEMS_POR_PAGINA);
  const animesPaginados = animesOrdenados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  return (
    <main className="min-h-screen bg-zinc-950">
      <HeroCarousel animes={animes} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Búsqueda */}
        <div className="max-w-xl mx-auto mb-6">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setPagina(1);
            }}
            placeholder="Buscar anime..."
            className="w-full rounded-full border border-zinc-800 bg-white dark:bg-zinc-900/80 px-5 py-2.5 text-sm text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:border-zinc-500 dark:focus:border-zinc-600 focus:outline-none"
          />
        </div>

        {/* Filtros de orden */}
        <div className="flex gap-2 mb-6 justify-center flex-wrap">
          <button
            onClick={() => { setOrden('fecha_estreno'); setPagina(1); }}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              orden === 'fecha_estreno'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            Fecha de estreno
          </button>
          <button
            onClick={() => { setOrden('alfabetico'); setPagina(1); }}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              orden === 'alfabetico'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            A-Z
          </button>
          <button
            onClick={() => { setOrden('populares'); setPagina(1); }}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              orden === 'populares'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            Populares
          </button>
          <button
            onClick={() => { setOrden('estado'); setPagina(1); }}
            className={`px-4 py-1.5 rounded-full text-xs transition-all ${
              orden === 'estado'
                ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800'
            }`}
          >
            Estado
          </button>
        </div>

        {/* Navegación */}
        <div className="flex gap-2 mb-8 justify-center">
          {[
            { href: '/mi-lista', label: 'Mi Lista' },
            { href: '/calendario', label: 'Calendario' },
            { href: '/recomendaciones', label: 'Recomendaciones' },
            { href: '/peticiones', label: 'Peticiones' },
            { href: '/inventario', label: 'Inventario' },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-500 dark:hover:border-zinc-600 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4 text-center">
          {animesOrdenados.length} animes
          {busqueda && ` - "${busqueda}"`}
          {pagina > 1 && ` · Página ${pagina} de ${totalPaginas}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl bg-zinc-900 animate-pulse" />
            ))}
          </div>
        ) : animesPaginados.length > 0 ? (
          <AnimeGrid animes={animesPaginados} />
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              {busqueda ? `No se encontró "${busqueda}"` : 'No hay animes'}
            </p>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button
              onClick={() => setPagina(Math.max(1, pagina - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-30"
            >
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(num => num === 1 || num === totalPaginas || Math.abs(num - pagina) <= 1)
              .map((num, idx, arr) => (
                <div key={num} className="flex items-center gap-1.5">
                  {idx > 0 && arr[idx - 1] !== num - 1 && <span className="text-zinc-400 dark:text-zinc-600">...</span>}
                  <button
                    onClick={() => setPagina(num)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold ${
                      pagina === num
                        ? 'bg-zinc-900 dark:bg-white text-white dark:text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {num}
                  </button>
                </div>
              ))}
            <button
              onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
              disabled={pagina === totalPaginas}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
