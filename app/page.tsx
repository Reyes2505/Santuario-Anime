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
      <section className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="text-xl font-bold text-white">Catálogo de Animes</h2>
            <p className="text-xs text-zinc-400">
              Haz clic en una portada para ver sus episodios.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/mi-lista"
              className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-zinc-700 transition-all active:scale-95"
            >
              📋 Mi Lista
            </Link>
            <Link
              href="/recomendaciones"
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-purple-500 transition-all active:scale-95"
            >
              🔮 Recomendaciones
            </Link>
            <button
              onClick={() => setIsAnimeModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
            >
              + Agregar Anime
            </button>
          </div>
        </div>

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
