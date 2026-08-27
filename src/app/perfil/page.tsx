'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

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
    alert('¡Perfil actualizado con éxito!');
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
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Banner de cabecera ultra nítido */}
      <div className="relative h-64 w-full overflow-hidden bg-zinc-900">
        <img 
          src={banner} 
          alt="Banner" 
          className="h-full w-full object-cover object-center scale-105 filter saturate-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-80" />
        
        {!isEditing && (
          <button
            onClick={() => setShowBannerPicker(!showBannerPicker)}
            className="absolute bottom-4 right-6 rounded-lg bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-900 transition-all shadow-lg"
          >
            Cambiar banner
          </button>
        )}
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* Info de perfil */}
        <div className="relative -mt-16">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              
              {/* Avatar e insignia Admin */}
              <div className="relative shrink-0">
                <img
                  src={avatar}
                  alt={username}
                  className="h-28 w-28 rounded-2xl object-cover border-2 border-zinc-700 shadow-md bg-zinc-950"
                />
                
                {/* Indicador de Admin interactivo */}
                {rol === 'admin' && (
                  <div className="absolute -top-3 -right-3 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-600 text-white text-[9px] font-extrabold px-2 py-0.5 rounded-full shadow-lg border border-amber-400/40 animate-pulse tracking-wide">
                    <span>🛡️</span>
                    <span>ADMIN</span>
                  </div>
                )}

                {!isEditing && (
                  <button
                    onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                    className="mt-2 w-full rounded-lg bg-zinc-950/80 border border-zinc-800 px-2 py-1 text-[10px] text-zinc-300 hover:bg-zinc-900 transition-all text-center font-medium"
                  >
                    Cambiar avatar
                  </button>
                )}
              </div>

              {/* Info y Edición */}
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div>
                    <h1 className="text-2xl font-black text-white tracking-wide">{username}</h1>
                    <p className="text-xs text-zinc-500 mt-0.5 font-mono">{user?.email}</p>
                    <p className="text-sm text-zinc-300 mt-2 leading-relaxed">{bio}</p>
                    
                    {/* Botón de acceso al Panel Admin CMS */}
                    {rol === 'admin' && (
                      <div className="mt-3">
                        <Link
                          href="/admin"
                          className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/20 transition-all"
                        >
                          ⚙️ Panel de Administración CMS
                        </Link>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        if (isEditing) {
                          handleSave();
                        } else {
                          setIsEditing(true);
                          setShowAvatarPicker(false);
                          setShowBannerPicker(false);
                        }
                      }}
                      className={`rounded-lg px-4 py-2 text-xs font-bold transition-all shadow-md ${
                        isEditing ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
                      }`}
                    >
                      {isEditing ? 'Guardar Cambios' : 'Editar Perfil'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-lg border border-zinc-700/80 bg-zinc-900/50 px-4 py-2 text-xs font-medium text-zinc-400 hover:text-red-400 hover:border-red-500/40 transition-all"
                    >
                      Salir
                    </button>
                  </div>
                </div>

                {/* Formulario de edición */}
                {isEditing && (
                  <div className="mt-6 space-y-4 pt-4 border-t border-zinc-800/80">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Nombre de usuario</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Biografía</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white resize-none focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Avatar URL (Enlace directo)</label>
                      <input
                        type="text"
                        value={avatar}
                        onChange={(e) => setAvatar(e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Banner URL (Enlace directo)</label>
                      <input
                        type="text"
                        value={banner}
                        onChange={(e) => setBanner(e.target.value)}
                        className="w-full rounded-lg bg-zinc-950 border border-zinc-700 px-3.5 py-2 text-sm text-white font-mono text-xs focus:outline-none focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Selector rápido de avatar */}
            {showAvatarPicker && (
              <div className="mt-6 pt-5 border-t border-zinc-800/80">
                <p className="text-xs font-bold text-zinc-300 mb-3">Elige un avatar predefinido:</p>
                <div className="flex gap-2.5 flex-wrap">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`h-12 w-12 rounded-xl overflow-hidden border-2 transition-all ${
                        avatar === a ? 'border-blue-500 scale-105 shadow-lg' : 'border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      <img src={a} alt="avatar" className="h-full w-full object-cover bg-zinc-950" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Selector rápido de banner */}
            {showBannerPicker && (
              <div className="mt-6 pt-5 border-t border-zinc-800/80">
                <p className="text-xs font-bold text-zinc-300 mb-3">Elige un banner predefinido:</p>
                <div className="flex gap-3 flex-wrap">
                  {BANNERS.map((b) => (
                    <button
                      key={b}
                      onClick={() => setBanner(b)}
                      className={`h-16 w-28 rounded-lg overflow-hidden border-2 transition-all ${
                        banner === b ? 'border-blue-500 scale-105 shadow-lg' : 'border-zinc-800 hover:border-zinc-600'
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

        {/* Bloque de Estadísticas */}
        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mt-1">Animes</div>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-black text-white">0</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mt-1">Episodios</div>
          </div>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-black text-white">0h</div>
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 font-medium mt-1">Tiempo</div>
          </div>
        </div>
      </div>
    </main>
  );
}
