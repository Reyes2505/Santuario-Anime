'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';
import HeroCarousel from '@/components/HeroCarousel';
import AnimeGrid from '@/components/AnimeGrid';
import AnimeEditorModal from '@/components/AnimeEditorModal';
import OpeningsPanel from '@/components/OpeningsPanel';

export default function Home() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);

  const loadData = async () => {
    setLoading(true);

    try {
      const { data: remoteAnimes, error: animesError } = await supabase
        .from('animes')
        .select('*')
        .order('created_at', { ascending: false });

      if (!animesError && remoteAnimes && remoteAnimes.length > 0) {
        setAnimes(remoteAnimes);
      } else {
        setAnimes([]);
      }
    } catch {
      setAnimes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <main className="flex-1 pb-16">
      {/* Hero Carousel */}
      <HeroCarousel animes={animes} />

      {/* Catálogo de Animes */}
      <section className="mx-auto max-w-7xl px-4 pt-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header con botones */}
        <div className="flex flex-col gap-4">
          <div className="border-b border-zinc-800/80 pb-4">
            <h2 className="text-2xl font-black text-white tracking-tight">
              Catálogo de <span className="text-blue-400">Animes</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Haz clic en una portada para ver sus episodios.
            </p>
          </div>

          {/* Botones de navegación */}
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mi-lista"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-600/30 hover:shadow-blue-500/50 hover:scale-[1.03] transition-all active:scale-95"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm3 2v2h12V7H6zm0 4v2h12v-2H6zm0 4v2h8v-2H6z" />
              </svg>
              Mi Lista
            </Link>

            <Link
              href="/recomendaciones"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-purple-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 hover:shadow-purple-500/50 hover:scale-[1.03] transition-all active:scale-95"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L9.5 8.5 3 9.5l5 4-1.5 6.5L12 17l5.5 3-1.5-6.5 5-4-6.5-1L12 2z" />
              </svg>
              Recomendaciones
            </Link>

            <Link
              href="/calendario"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 px-4 py-2.5 text-xs font-bold text-white shadow-lg shadow-emerald-600/30 hover:shadow-emerald-500/50 hover:scale-[1.03] transition-all active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Calendario
            </Link>

            <button
              onClick={() => setIsAnimeModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/60 px-4 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white hover:border-zinc-600 hover:scale-[1.03] transition-all active:scale-95 backdrop-blur-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Agregar Anime
            </button>
          </div>
        </div>

        {/* Grid de animes */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-zinc-900/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <AnimeGrid animes={animes} />
        )}
      </section>

      {/* Openings Panel */}
      <OpeningsPanel />

      {/* Modal */}
      <AnimeEditorModal
        isOpen={isAnimeModalOpen}
        onClose={() => setIsAnimeModalOpen(false)}
        onSaved={loadData}
      />
    </main>
  );
}
