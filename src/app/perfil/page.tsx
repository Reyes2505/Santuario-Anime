'use client';

import { useEffect, useState } from 'react';
import { UserProfile, CustomList } from '@/types/database';
import { getUserProfile, updateUserProfile, getCustomLists } from '@/lib/offlineStore';
import { getEstadisticasUsuario } from '@/lib/ai-recommendations';
import { getTracking } from '@/lib/tracking';
import { getRolUsuario } from '@/lib/admin';

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rudeus',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Subaru',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Emilia',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rem',
];

const GENEROS = ['Isekai', 'Acción', 'Romance', 'Comedia', 'Drama', 'Fantasía', 'Aventura', 'Misterio', 'Psicológico', 'Sobrenatural'];

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
  const [isEditing, setIsEditing] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [bioInput, setBioInput] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [genreInput, setGenreInput] = useState('');
  const [lists, setLists] = useState<CustomList[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [rol, setRol] = useState<string>('user');

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
    setEstadisticas(getEstadisticasUsuario());
    setTracking(getTracking());

    // Verificar rol de administrador
    const verificarRol = async () => {
      const rolUsuario = await getRolUsuario();
      setRol(rolUsuario);
    };
    verificarRol();
  }, []);

  const handleSave = () => {
    const updated: UserProfile = {
      ...profile,
      username: usernameInput.trim() || profile.username,
      bio: bioInput.trim() || profile.bio,
      avatar_url: avatarInput || profile.avatar_url,
      favorite_genre: genreInput || profile.favorite_genre,
    };
    updateUserProfile(updated);
    setProfile(updated);
    setIsEditing(false);
    setShowAvatarPicker(false);
  };

  const animesViendo = Object.values(tracking).filter(t => t.estado === 'viendo').length;
  const animesVistos = Object.values(tracking).filter(t => t.estado === 'visto').length;

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Banner decorativo */}
      <div className="relative h-40 bg-gradient-to-r from-blue-950 via-purple-950 to-zinc-950 border-b border-zinc-800/50">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.3) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(168,85,247,0.3) 0%, transparent 50%)'
        }} />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-xl p-6 shadow-2xl shadow-black/50">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="h-28 w-28 rounded-2xl object-cover border-2 border-blue-500/50 shadow-lg shadow-blue-500/20 transition-all group-hover:border-blue-400"
                />
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs shadow-lg hover:bg-blue-500 transition-all"
                >
                  📷
                </button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-2xl sm:text-3xl font-black text-white">
                        {profile.username}
                      </h1>
                      {rol === 'admin' && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 text-[10px] font-bold text-amber-400 animate-pulse">
                          👑 Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-400 font-semibold mt-1">
                      💜 {profile.favorite_genre}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      Miembro desde {profile.joined_date}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (isEditing) {
                        handleSave();
                      } else {
                        setIsEditing(true);
                      }
                    }}
                    className={`rounded-xl px-5 py-2.5 text-xs font-bold transition-all active:scale-95 ${
                      isEditing
                        ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                        : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-600/30 hover:shadow-purple-600/30'
                    }`}
                  >
                    {isEditing ? '✅ Guardar Cambios' : '✏️ Editar Perfil'}
                  </button>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre de Usuario</label>
                      <input
                        type="text"
                        value={usernameInput}
                        onChange={(e) => setUsernameInput(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Bio</label>
                      <textarea
                        value={bioInput}
                        onChange={(e) => setBioInput(e.target.value)}
                        rows={2}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Género Favorito</label>
                      <div className="flex flex-wrap gap-2">
                        {GENEROS.map((genero) => (
                          <button
                            key={genero}
                            onClick={() => setGenreInput(genero)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              genreInput === genero
                                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                            }`}
                          >
                            {genero}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-400 max-w-2xl">
                    {profile.bio}
                  </p>
                )}
              </div>
            </div>

            {showAvatarPicker && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Elige tu avatar:</p>
                <div className="flex gap-2">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setAvatarInput(avatar)}
                      className={`h-12 w-12 rounded-xl border-2 transition-all ${
                        avatarInput === avatar
                          ? 'border-blue-500 scale-110'
                          : 'border-transparent hover:border-zinc-600'
                      }`}
                    >
                      <img src={avatar} alt="avatar" className="h-full w-full rounded-xl object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 text-center">
            <div className="text-2xl font-black text-blue-400">{animesViendo}</div>
            <div className="text-[10px] text-blue-300 font-semibold mt-1">👁️ VIENDO</div>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-950/30 p-4 text-center">
            <div className="text-2xl font-black text-green-400">{animesVistos}</div>
            <div className="text-[10px] text-green-300 font-semibold mt-1">✅ VISTOS</div>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 text-center">
            <div className="text-2xl font-black text-purple-400">{estadisticas?.episodiosVistos || 0}</div>
            <div className="text-[10px] text-purple-300 font-semibold mt-1">🎬 EPISODIOS</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-center">
            <div className="text-2xl font-black text-amber-400">{estadisticas?.tiempoTotalMinutos || 0}m</div>
            <div className="text-[10px] text-amber-300 font-semibold mt-1">⏱️ TIEMPO</div>
          </div>
        </div>

        {/* Géneros favoritos */}
        {estadisticas?.generosTop?.length > 0 && (
          <div className="mt-6 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-bold text-white mb-3">🎯 Tus géneros favoritos</h3>
            <div className="space-y-2">
              {estadisticas.generosTop.map((g: any) => {
                const maxPeso = estadisticas.generosTop[0].peso || 1;
                const porcentaje = Math.round((g.peso / maxPeso) * 100);
                return (
                  <div key={g.genero} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-400 w-20 capitalize">{g.genero}</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${porcentaje}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-8 text-right">{g.peso}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Listas */}
        <div className="mt-6">
          <h3 className="text-sm font-bold text-white mb-3">📋 Mis Listas</h3>
          {lists.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {lists.map((list) => (
                <div
                  key={list.id}
                  className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 hover:border-blue-500/40 hover:bg-zinc-900/60 transition-all cursor-pointer group"
                >
                  <h4 className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors">
                    {list.name}
                  </h4>
                  {list.description && (
                    <p className="text-xs text-zinc-500 mt-1">{list.description}</p>
                  )}
                  <div className="flex gap-3 mt-3 text-[10px] text-zinc-500">
                    <span>🎬 {list.animeIds.length} animes</span>
                    <span>📺 {list.episodeIds.length} episodios</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">No tienes listas personalizadas aún.</p>
          )}
        </div>
      </div>
    </main>
  );
}
