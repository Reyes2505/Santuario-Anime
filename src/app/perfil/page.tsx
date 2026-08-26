'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['aaronreyesabantoj3@gmail.com'];

const AVATARS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rudeus',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Subaru',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Roxy',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Emilia',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Rem',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Kirito',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Asuna',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Levi',
  'https://api.dicebear.com/7.x/bottts/svg?seed=Mikasa',
];

const BANNERS = [
  'https://images.justwatch.com/backdrop/243888320/s1440/mushoku-tensei-jobless-reincarnation.jpg',
  'https://wallpapercave.com/wp/wp8527011.jpg',
  'https://wallpapercave.com/wp/wp8527003.jpg',
];

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rol, setRol] = useState('user');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Anime Otaku');
  const [bio, setBio] = useState('Explorando el Santuario Anime');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [banner, setBanner] = useState(BANNERS[0]);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showBannerPicker, setShowBannerPicker] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      setUser(session.user);
      setRol(ADMIN_EMAILS.includes(session.user.email || '') ? 'admin' : 'user');

      const userKey = `perfil_${session.user.id}`;
      const saved = localStorage.getItem(userKey);
      if (saved) {
        const data = JSON.parse(saved);
        setUsername(data.username || 'Anime Otaku');
        setBio(data.bio || 'Explorando el Santuario Anime');
        setAvatar(data.avatar || AVATARS[0]);
        setBanner(data.banner || BANNERS[0]);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  const handleSave = () => {
    const userKey = `perfil_${user?.id}`;
    localStorage.setItem(userKey, JSON.stringify({ username, bio, avatar, banner }));
    setIsEditing(false);
    setShowAvatarPicker(false);
    setShowBannerPicker(false);
    alert('Perfil actualizado');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="h-8 w-8 border-2 border-t-transparent border-white rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Banner de cabecera */}
      <div className="relative h-48 sm:h-56 w-full overflow-hidden">
        <img src={banner} alt="Banner" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/50 to-transparent" />
        {!isEditing && (
          <button
            onClick={() => setShowBannerPicker(!showBannerPicker)}
            className="absolute bottom-3 right-4 rounded-lg bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            Cambiar banner
          </button>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* Info de perfil */}
        <div className="relative -mt-16">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 backdrop-blur-xl p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="flex flex-col items-center">
                <div className="relative">
                  <img
                    src={avatar}
                    alt={username}
                    className="h-28 w-28 rounded-2xl object-cover border-2 border-zinc-700"
                  />
                  {rol === 'admin' && (
                    <span className="absolute -top-2 -right-2 text-lg">Admin</span>
                  )}
                </div>
                {/* Botón para abrir el selector de avatar */}
                {!isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="mt-2 w-full rounded-lg bg-zinc-900/80 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 transition-all text-center"
                  >
                    Cambiar avatar
                  </button>
                )}
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h1 className="text-2xl font-black text-white">{username}</h1>
                    <p className="text-xs text-zinc-500 mt-1">{user?.email}</p>
                    <p className="text-sm text-zinc-400 mt-2">{bio}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (isEditing) {
                          handleSave();
                        } else {
                          setIsEditing(true);
                        }
                      }}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all ${
                        isEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-lg border border-zinc-700 px-4 py-2 text-xs text-zinc-400 hover:text-red-400"
                    >
                      Salir
                    </button>
                  </div>
                </div>

                {/* Formulario de edición */}
                {isEditing && (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Avatar URL</label>
                      <input
                        type="text"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Banner URL</label>
                      <input
                        type="text"
                        value={banner}
                        onChange={(e) => setBanner(e.target.value)}
                        className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selector de avatar */}
            {showAvatarPicker && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400 mb-2">Elige tu avatar:</p>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`h-12 w-12 rounded-xl border-2 ${
                        avatar === a ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img src={a} alt="avatar" className="h-full w-full rounded-xl object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector de banner */}
            {showBannerPicker && (
              <div className="mt-4 pt-4 border-t border-zinc-800">
                <p className="text-xs text-zinc-400 mb-2">Elige tu banner:</p>
                <div className="flex gap-2 flex-wrap">
                  {BANNERS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBanner(b)}
                      className={`h-16 w-28 rounded-lg overflow-hidden border-2 ${
                        banner === b ? 'border-blue-500' : 'border-transparent'
                      }`}
                    >
                      <img src={b} alt="banner" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estadísticas */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] text-zinc-500">Animes</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] text-zinc-500">Episodios</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-center">
            <div className="text-2xl font-black text-white">0h</div>
            <div className="text-[10px] text-zinc-500">Tiempo</div>
          </div>
        </div>
      </div>
    </main>
  );
}
