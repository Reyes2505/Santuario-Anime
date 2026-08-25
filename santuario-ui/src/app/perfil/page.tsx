'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { UserProfile, CustomList } from '@/types/database';
import {
  getUserProfile,
  updateUserProfile,
  getCustomLists,
  saveCustomList,
  deleteCustomList,
} from '@/lib/offlineStore';
import { getWatchProgressMap } from '@/lib/storage';

const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rudeus',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Sylphiette',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Eris',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
];

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile>(getUserProfile());
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [genreInput, setGenreInput] = useState('');

  const [lists, setLists] = useState<CustomList[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list-favorites');

  const [isNewListModalOpen, setIsNewListModalOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListDesc, setNewListDesc] = useState('');

  const [watchStats, setWatchStats] = useState({ totalWatched: 0, totalHours: 0 });

  const reloadData = () => {
    const prof = getUserProfile();
    setProfile(prof);
    setUsernameInput(prof.username);
    setBioInput(prof.bio);
    setAvatarInput(prof.avatar_url);
    setGenreInput(prof.favorite_genre);

    setLists(getCustomLists());

    // Calcular estadísticas de reproducción local
    const progressMap = getWatchProgressMap();
    const values = Object.values(progressMap);
    const watchedCount = values.filter((v) => v.completed || v.currentTime > 60).length;
    const totalSecs = values.reduce((acc, curr) => acc + (curr.currentTime || 0), 0);
    const hours = (totalSecs / 3600).toFixed(1);

    setWatchStats({ totalWatched: watchedCount, totalHours: parseFloat(hours) });
  };

  useEffect(() => {
    reloadData();
  }, []);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateUserProfile({
      username: usernameInput.trim() || profile.username,
      bio: bioInput.trim() || profile.bio,
      avatar_url: avatarInput.trim() || profile.avatar_url,
      favorite_genre: genreInput.trim() || profile.favorite_genre,
    });
    setProfile(updated);
    setIsEditingProfile(false);
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListName.trim()) return;

    const newList: CustomList = {
      id: `custom-list-${Date.now()}`,
      name: newListName.trim(),
      description: newListDesc.trim() || 'Lista personalizada de anime',
      isSystem: false,
      createdAt: Date.now(),
      episodeIds: [],
      animeIds: [],
    };

    saveCustomList(newList);
    setNewListName('');
    setNewListDesc('');
    setIsNewListModalOpen(false);
    reloadData();
    setActiveTab(newList.id);
  };

  const handleDeleteList = (id: string) => {
    if (confirm('¿Eliminar esta lista personalizada?')) {
      deleteCustomList(id);
      reloadData();
      setActiveTab('list-favorites');
    }
  };

  const currentActiveList = lists.find((l) => l.id === activeTab) || lists[0];

  return (
    <main className="flex-1 bg-zinc-950 pb-16 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">

        {/* User Profile Card Header */}
        <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-indigo-950/40 p-6 sm:p-8 backdrop-blur-md shadow-2xl">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">

            {/* Avatar */}
            <div className="relative group">
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-blue-500/50 bg-zinc-950 p-1 shadow-xl"
              />
              <button
                onClick={() => setIsEditingProfile(true)}
                className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg hover:bg-blue-500 transition-all active:scale-95"
                title="Editar Perfil"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    {profile.username}
                  </h1>
                  <p className="text-xs text-blue-400 font-semibold mt-0.5">
                    Miembro del Santuario desde {profile.joined_date}
                  </p>
                </div>

                <button
                  onClick={() => setIsEditingProfile(true)}
                  className="self-center sm:self-auto inline-flex items-center gap-1.5 rounded-xl border border-zinc-700/80 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800 hover:text-white transition-all active:scale-95"
                >
                  Editar Perfil
                </button>
              </div>

              <p className="text-xs sm:text-sm text-zinc-300 max-w-2xl leading-relaxed">
                {profile.bio}
              </p>

              <div className="pt-2 flex flex-wrap justify-center sm:justify-start gap-4 text-xs">
                <span className="rounded-lg bg-zinc-950/80 border border-zinc-800 px-3 py-1 text-zinc-400">
                  Género Favorito: <strong className="text-white">{profile.favorite_genre}</strong>
                </span>
                <span className="rounded-lg bg-zinc-950/80 border border-zinc-800 px-3 py-1 text-zinc-400">
                  Episodios Vistos: <strong className="text-emerald-400">{watchStats.totalWatched}</strong>
                </span>
                <span className="rounded-lg bg-zinc-950/80 border border-zinc-800 px-3 py-1 text-zinc-400">
                  Horas de Reproducción: <strong className="text-blue-400">{watchStats.totalHours} hrs</strong>
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Sección de Listas Personalizadas */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/80 pb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Mis Listas de Anime</h2>
              <p className="text-xs text-zinc-400">Organiza y guarda tus animes o episodios favoritos offline.</p>
            </div>

            <button
              onClick={() => setIsNewListModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-500 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nueva Lista Personalizada
            </button>
          </div>

          {/* List Tabs Header */}
          <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-none">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => setActiveTab(list.id)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold whitespace-nowrap transition-all border ${
                  activeTab === list.id
                    ? 'border-blue-500 bg-blue-600 text-white shadow-md'
                    : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white'
                }`}
              >
                <span>{list.name}</span>
                <span className="rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold">
                  {list.animeIds.length + list.episodeIds.length}
                </span>
              </button>
            ))}
          </div>

          {/* Active Tab View */}
          {currentActiveList && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">{currentActiveList.name}</h3>
                  <p className="text-xs text-zinc-400">{currentActiveList.description}</p>
                </div>

                {!currentActiveList.isSystem && (
                  <button
                    onClick={() => handleDeleteList(currentActiveList.id)}
                    className="rounded-lg bg-red-950/40 border border-red-800/40 px-2.5 py-1 text-xs font-semibold text-red-400 hover:bg-red-900/60"
                  >
                    Eliminar Lista
                  </button>
                )}
              </div>

              {currentActiveList.animeIds.length === 0 && currentActiveList.episodeIds.length === 0 ? (
                <div className="py-12 text-center text-xs text-zinc-500 border border-dashed border-zinc-800 rounded-xl">
                  Esta lista está vacía actualmente. Marca animes o episodios como favoritos para guardarlos aquí.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {currentActiveList.animeIds.map((animeId) => (
                    <Link
                      key={animeId}
                      href="/"
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-blue-500/50 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                        ANIME
                      </div>
                      <div>
                        <span className="block font-bold text-xs text-white">Mushoku Tensei</span>
                        <span className="block text-[10px] text-zinc-400">Colección completa</span>
                      </div>
                    </Link>
                  ))}

                  {currentActiveList.episodeIds.map((epId) => (
                    <Link
                      key={epId}
                      href={`/ver/${epId}`}
                      className="flex items-center gap-3 p-3 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:border-blue-500/50 transition-all"
                    >
                      <div className="h-10 w-10 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        EP
                      </div>
                      <div>
                        <span className="block font-bold text-xs text-white">Capítulo Guardado</span>
                        <span className="block text-[10px] text-zinc-400">Reproducir ahora →</span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* Modal de Editar Perfil */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Editar Perfil de Usuario</h2>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre de Usuario</label>
                <input
                  type="text"
                  required
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Biografía</label>
                <textarea
                  rows={2}
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Género Favorito</label>
                <input
                  type="text"
                  value={genreInput}
                  onChange={(e) => setGenreInput(e.target.value)}
                  placeholder="ej. Isekai, Shonen, Seinen"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Seleccionar Avatar Preset</label>
                <div className="flex gap-2 py-1 overflow-x-auto">
                  {AVATAR_PRESETS.map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      alt="Avatar option"
                      onClick={() => setAvatarInput(url)}
                      className={`h-12 w-12 rounded-xl border-2 cursor-pointer transition-all ${
                        avatarInput === url ? 'border-blue-500 scale-105' : 'border-zinc-800 opacity-60'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Guardar Perfil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Nueva Lista */}
      {isNewListModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 space-y-4 shadow-2xl">
            <h2 className="text-lg font-bold text-white">Crear Nueva Lista Personalizada</h2>

            <form onSubmit={handleCreateList} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre de la Lista *</label>
                <input
                  type="text"
                  required
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="ej. Mis Animes de Acción Favoritos"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Descripción</label>
                <input
                  type="text"
                  value={newListDesc}
                  onChange={(e) => setNewListDesc(e.target.value)}
                  placeholder="Breve nota sobre el contenido de esta lista"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 px-3.5 py-2 text-xs text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewListModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white hover:bg-blue-500"
                >
                  Crear Lista
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
