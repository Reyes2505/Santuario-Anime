'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Anime, Episodio } from '@/types/database';
import {
  getLocalAnimes,
  getLocalEpisodes,
  deleteLocalAnime,
  deleteLocalEpisode,
} from '@/lib/offlineStore';
import AnimeEditorModal from '@/components/AnimeEditorModal';
import EpisodeEditorModal from '@/components/EpisodeEditorModal';

export default function AdminPage() {
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [episodes, setEpisodes] = useState<Episodio[]>([]);

  const [isAnimeModalOpen, setIsAnimeModalOpen] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<Anime | null>(null);

  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState<Episodio | null>(null);

  const reloadData = () => {
    setAnimes(getLocalAnimes());
    setEpisodes(getLocalEpisodes());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleOpenNewAnime = () => {
    setSelectedAnime(null);
    setIsAnimeModalOpen(true);
  };

  const handleEditAnime = (anime: Anime) => {
    setSelectedAnime(anime);
    setIsAnimeModalOpen(true);
  };

  const handleDeleteAnime = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este anime local?')) {
      deleteLocalAnime(id);
      reloadData();
    }
  };

  const handleOpenNewEpisode = () => {
    setSelectedEpisode(null);
    setIsEpisodeModalOpen(true);
  };

  const handleEditEpisode = (ep: Episodio) => {
    setSelectedEpisode(ep);
    setIsEpisodeModalOpen(true);
  };

  const handleDeleteEpisode = (id: string) => {
    if (confirm('¿Estás seguro de eliminar este capítulo local?')) {
      deleteLocalEpisode(id);
      reloadData();
    }
  };

  return (
    <main className="flex-1 bg-zinc-950 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-400 mb-2">
              Panel de Administración
            </div>
            <h1 className="text-2xl font-black text-white sm:text-3xl">
              Editor de Anime y Capítulos
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Agrega y gestiona animes, portadas, tráilers y episodios locales (.mp4) o links online.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenNewAnime}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Agregar Anime
            </button>

            <button
              onClick={handleOpenNewEpisode}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900 px-4 py-2.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Agregar Capítulo
            </button>
          </div>
        </div>

        {/* Sección de Animes */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Animes Registrados</span>
            <span className="text-xs font-semibold text-zinc-500">
              ({animes.length})
            </span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {animes.map((anime) => (
              <div
                key={anime.id}
                className="flex gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-md"
              >
                <img
                  src={anime.portada_url}
                  alt={anime.titulo}
                  className="h-28 w-20 rounded-xl object-cover border border-zinc-800 flex-shrink-0"
                />
                <div className="flex flex-col justify-between flex-1 min-w-0">
                  <div>
                    <span className="inline-block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                      {anime.trailer_type === 'online' ? 'Tráiler Online' : 'Tráiler Local'}
                    </span>
                    <h3 className="font-bold text-sm text-white truncate">
                      {anime.titulo}
                    </h3>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-1">
                      {anime.sinopsis}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <button
                      onClick={() => handleEditAnime(anime)}
                      className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      Editar
                    </button>
                    {anime.id !== 'mushoku-tensei-main' && (
                      <button
                        onClick={() => handleDeleteAnime(anime.id)}
                        className="rounded-lg bg-red-950/40 border border-red-800/40 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/60"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Sección de Episodios Locales */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Capítulos Agregados Manualmente</span>
              <span className="text-xs font-semibold text-zinc-500">
                ({episodes.length})
              </span>
            </h2>
          </div>

          {episodes.length > 0 ? (
            <div className="divide-y divide-zinc-800/60 rounded-2xl border border-zinc-800 bg-zinc-900/30 overflow-hidden">
              {episodes.map((ep) => (
                <div
                  key={ep.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 gap-3 hover:bg-zinc-900/60 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-800 font-extrabold text-xs text-blue-400 border border-zinc-700/60">
                      EP {ep.numero}
                    </div>
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-white">
                        {ep.titulo}
                      </h4>
                      <p className="text-xs text-zinc-400 font-mono truncate max-w-md">
                        {ep.url_stream}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        ep.tipo_stream === 'online'
                          ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40'
                          : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                      }`}
                    >
                      {ep.tipo_stream === 'online' ? 'Online Link' : 'Local MP4'}
                    </span>

                    <button
                      onClick={() => handleEditEpisode(ep)}
                      className="rounded-lg bg-zinc-800 px-2.5 py-1 text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDeleteEpisode(ep.id)}
                      className="rounded-lg bg-red-950/40 border border-red-800/40 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/60"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 p-8 text-center text-zinc-500 text-xs">
              Aún no has agregado ningún capítulo manual. Haz clic en "Agregar Capítulo" para añadir uno en Modo Local o Link Online.
            </div>
          )}
        </section>

      </div>

      {/* Modales de Edición */}
      <AnimeEditorModal
        animeToEdit={selectedAnime}
        isOpen={isAnimeModalOpen}
        onClose={() => setIsAnimeModalOpen(false)}
        onSaved={reloadData}
      />

      <EpisodeEditorModal
        episodeToEdit={selectedEpisode}
        defaultEpisodeNumber={episodes.length + 1}
        isOpen={isEpisodeModalOpen}
        onClose={() => setIsEpisodeModalOpen(false)}
        onSaved={reloadData}
      />
    </main>
  );
}
