'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeGrid from '@/components/AnimeGrid';
import ContinueWatchingSection from '@/components/ContinueWatchingSection';

const ITEMS_POR_PAGINA = 24;

export default function Home() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('fecha_estreno');
  const [pagina, setPagina] = useState(1);
  const [generoSeleccionado, setGeneroSeleccionado] = useState<string>('');
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('animes')
          .select('id, titulo, portada_url, banner_url, sinopsis, generos, estado_emision, fecha_estreno')
          .order('fecha_estreno', { ascending: false });
        
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

  const todosGeneros = useMemo(() => {
    const generos = new Set<string>();
    animes.forEach((anime) => {
      if (anime.generos) {
        anime.generos.forEach((g) => generos.add(g));
      }
    });
    return Array.from(generos).sort();
  }, [animes]);

  const todosEstados = useMemo(() => {
    const estados = new Set<string>();
    animes.forEach((anime) => {
      if (anime.estado_emision) estados.add(anime.estado_emision);
    });
    return Array.from(estados).sort();
  }, [animes]);

  const animesFiltrados = useMemo(() => {
    return animes.filter((anime) => {
      const query = busqueda.toLowerCase().trim();
      
      if (query && !anime.titulo.toLowerCase().includes(query) && !(anime.sinopsis || '').toLowerCase().includes(query)) {
        return false;
      }
      
      if (generoSeleccionado && (!anime.generos || !anime.generos.includes(generoSeleccionado))) {
        return false;
      }
      
      if (estadoSeleccionado && anime.estado_emision !== estadoSeleccionado) {
        return false;
      }
      
      return true;
    });
  }, [animes, busqueda, generoSeleccionado, estadoSeleccionado]);

  const animesOrdenados = useMemo(() => {
    return [...animesFiltrados].sort((a, b) => {
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
  }, [animesFiltrados, orden]);

  const totalPaginas = Math.ceil(animesOrdenados.length / ITEMS_POR_PAGINA);
  const animesPaginados = animesOrdenados.slice(
    (pagina - 1) * ITEMS_POR_PAGINA,
    pagina * ITEMS_POR_PAGINA
  );

  useEffect(() => {
    setPagina(1);
  }, [busqueda, generoSeleccionado, estadoSeleccionado, orden]);

  return (
    <main className="min-h-screen bg-zinc-950">
      <HeroCarousel animes={animes.slice(0, 5)} />

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ========== CONTINUAR VIENDO ========== */}
        <ContinueWatchingSection />

        {/* Búsqueda y filtros */}
        <div className="space-y-4 mb-8">
          <div className="max-w-xl mx-auto">
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar anime..."
              className="w-full rounded-full border border-zinc-800 bg-zinc-900/80 px-5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          <div className="flex flex-wrap gap-2 justify-center">
            <select
              value={generoSeleccionado}
              onChange={(e) => setGeneroSeleccionado(e.target.value)}
              className="px-4 py-2 rounded-full text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los géneros</option>
              {todosGeneros.map((genero) => (
                <option key={genero} value={genero}>{genero}</option>
              ))}
            </select>

            <select
              value={estadoSeleccionado}
              onChange={(e) => setEstadoSeleccionado(e.target.value)}
              className="px-4 py-2 rounded-full text-xs bg-zinc-900 text-zinc-400 border border-zinc-800 focus:border-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="">Todos los estados</option>
              {todosEstados.map((estado) => (
                <option key={estado} value={estado}>{estado}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => setOrden('fecha_estreno')}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                orden === 'fecha_estreno'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Fecha de estreno
            </button>
            <button
              onClick={() => setOrden('alfabetico')}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                orden === 'alfabetico'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              A-Z
            </button>
            <button
              onClick={() => setOrden('populares')}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                orden === 'populares'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Populares
            </button>
            <button
              onClick={() => setOrden('estado')}
              className={`px-4 py-1.5 rounded-full text-xs transition-all ${
                orden === 'estado'
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Estado
            </button>
          </div>
        </div>

        {/* Navegación */}
        <div className="flex gap-2 mb-8 justify-center flex-wrap">
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
              className="text-xs text-zinc-500 hover:text-white px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-600 transition-all"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <p className="text-xs text-zinc-500 mb-4 text-center">
          {animesOrdenados.length} animes
          {busqueda && ` - "${busqueda}"`}
          {generoSeleccionado && ` - ${generoSeleccionado}`}
          {pagina > 1 && ` · Página ${pagina} de ${totalPaginas}`}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ) : animesPaginados.length > 0 ? (
          <div className="animate-fade-scale">
            <AnimeGrid animes={animesPaginados} />
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-sm text-zinc-500">
              No se encontraron animes
            </p>
          </div>
        )}

        {totalPaginas > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-8">
            <button
              onClick={() => setPagina(Math.max(1, pagina - 1))}
              disabled={pagina === 1}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              Anterior
            </button>
            {Array.from({ length: totalPaginas }, (_, i) => i + 1)
              .filter(num => num === 1 || num === totalPaginas || Math.abs(num - pagina) <= 1)
              .map((num, idx, arr) => (
                <div key={num} className="flex items-center gap-1.5">
                  {idx > 0 && arr[idx - 1] !== num - 1 && <span className="text-zinc-600">...</span>}
                  <button
                    onClick={() => setPagina(num)}
                    className={`h-8 w-8 rounded-lg text-xs font-bold ${
                      pagina === num
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {num}
                  </button>
                </div>
              ))}
            <button
              onClick={() => setPagina(Math.min(totalPaginas, pagina + 1))}
              disabled={pagina === totalPaginas}
              className="px-4 py-2 rounded-lg bg-zinc-900 text-xs text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"
            >
              Siguiente
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
