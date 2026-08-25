'use client';

import { useEffect, useState } from 'react';
import { UserProfile, CustomList } from '@/types/database';
import { getUserProfile, saveUserProfile, getCustomLists, saveCustomList } from '@/lib/offlineStore';

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rudeus',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Subaru',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
];

const DEFAULT_PROFILE: UserProfile = {
  id: 'default-user',
  username: 'Anime Otaku Offline',
  avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku',
  bio: 'Explorando el Santuario Anime',
  favorite_genre: 'Isekai',
  joined_date: '2024',
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [lists, setLists] = useState<CustomList[]>([]);
  const [activeTab, setActiveTab] = useState<string>('list-favorites');

  // Cargar perfil real desde localStorage
  useEffect(() => {
    const saved = getUserProfile();
    if (saved) {
      setProfile(saved);
      setUsernameInput(saved.username || '');
      setBioInput(saved.bio || '');
      setAvatarInput(saved.avatar_url || '');
      setGenreInput(saved.favorite_genre || '');
    }
    setLists(getCustomLists());
  }, []);

  const handleSaveProfile = () => {
    const updated: UserProfile = {
      ...profile,
      username: usernameInput.trim() || profile.username,
      bio: bioInput.trim() || profile.bio,
      avatar_url: avatarInput || profile.avatar_url,
      favorite_genre: genreInput || profile.favorite_genre,
    };
    saveUserProfile(updated);
    setProfile(updated);
    setIsEditingProfile(false);
  };

  return (
    <main className="flex-1 bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Encabezado de perfil */}
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800/60 bg-gradient-to-br from-zinc-900 to-blue-950/30 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="relative group">
              <img
                src={profile.avatar_url}
                alt={profile.username}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl object-cover border-2 border-blue-500/50 shadow-lg shadow-blue-500/20"
              />
              {isEditingProfile && (
                <div className="absolute bottom-2 left-2 flex gap-1">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setAvatarInput(avatar)}
                      className={`h-8 w-8 rounded-lg border-2 ${avatarInput === avatar ? 'border-blue-500' : 'border-transparent'}`}
                    >
                      <img src={avatar} alt="avatar" className="h-full w-full rounded-lg object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-black text-white sm:text-3xl">
                    {profile.username}
                  </h1>
                  <p className="text-xs text-blue-400 font-semibold mt-0.5">
                    {profile.favorite_genre}
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (isEditingProfile) {
                      handleSaveProfile();
                    } else {
                      setIsEditingProfile(true);
                    }
                  }}
                  className={`rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    isEditingProfile
                      ? 'bg-green-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {isEditingProfile ? '✅ Guardar' : '✏️ Editar'}
                </button>
              </div>

              {isEditingProfile ? (
                <div className="mt-3 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre de Usuario</label>
                    <input
                      type="text"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Bio</label>
                    <textarea
                      value={bioInput}
                      onChange={(e) => setBioInput(e.target.value)}
                      rows={2}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Género Favorito</label>
                    <input
                      type="text"
                      value={genreInput}
                      onChange={(e) => setGenreInput(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
                    />
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">{profile.bio}</p>
              )}
            </div>
          </div>
        </div>

        {/* Listas */}
        <section>
          <h2 className="text-lg font-bold text-white mb-4">📋 Mis Listas</h2>
          {lists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {lists.map((list) => (
                <div key={list.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4">
                  <h3 className="text-sm font-bold text-white">{list.name}</h3>
                  {list.description && (
                    <p className="text-xs text-zinc-500 mt-1">{list.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-600 mt-2">
                    {list.animeIds.length} animes · {list.episodeIds.length} episodios
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No tienes listas personalizadas.</p>
          )}
        </section>
      </div>
    </main>
  );
}
