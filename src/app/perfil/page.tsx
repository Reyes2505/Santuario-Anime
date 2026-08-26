'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { getTracking } from '@/lib/tracking';
import { getEstadisticasUsuario } from '@/lib/ai-recommendations';

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

const GENEROS_ANIME = [
  'Isekai', 'Acción', 'Romance', 'Comedia', 'Drama', 'Fantasía',
  'Aventura', 'Misterio', 'Psicológico', 'Sobrenatural', 'Mecha',
  'Deportes', 'Música', 'Ciencia Ficción', 'Horror', 'Slice of Life',
];

const BANNERS = [
  'from-blue-950 via-purple-950 to-zinc-950',
  'from-emerald-950 via-teal-950 to-zinc-950',
  'from-rose-950 via-pink-950 to-zinc-950',
  'from-amber-950 via-orange-950 to-zinc-950',
];

const LOGROS = [
  { icon: '🎯', nombre: 'Primer anime', descripcion: 'Agregaste tu primer anime', condicion: (s: any) => s.animesVistos >= 1 },
  { icon: '🔥', nombre: 'En llamas', descripcion: 'Viste 10 episodios', condicion: (s: any) => s.episodiosVistos >= 10 },
  { icon: '💎', nombre: 'Coleccionista', descripcion: '10 animes en lista', condicion: (s: any) => s.animesVistos >= 10 },
  { icon: '🌙', nombre: 'Nocturno', descripcion: '100 minutos vistos', condicion: (s: any) => s.tiempoTotalMinutos >= 100 },
  { icon: '👑', nombre: 'Otaku VIP', descripcion: '25 animes completados', condicion: (s: any) => s.animesVistos >= 25 },
];

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rol, setRol] = useState('user');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Anime Otaku');
  const [bio, setBio] = useState('Explorando el Santuario Anime');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [generoFavorito, setGeneroFavorito] = useState('Isekai');
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [tracking, setTracking] = useState<Record<string, any>>({});
  const [tabActiva, setTabActiva] = useState('estadisticas');

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      const esAdmin = ADMIN_EMAILS.includes(session.user.email || '');
      setRol(esAdmin ? 'admin' : 'user');

      // Clave específica por usuario
      const userKey = `santuario_profile_${session.user.id}`;
      const saved = localStorage.getItem(userKey);
      
      if (saved) {
        const data = JSON.parse(saved);
        setUsername(data.username || 'Anime Otaku');
        setBio(data.bio || 'Explorando el Santuario Anime');
        setAvatar(data.avatar || AVATARS[0]);
        setGeneroFavorito(data.genero || 'Isekai');
        setBannerIndex(data.banner || 0);
      }

      setStats(getEstadisticasUsuario());
      setTracking(await getTracking());
      setLoading(false);
    }
    load();
  }, [router]);

  const handleSave = () => {
    const profileData = { username, bio, avatar, genero: generoFavorito, banner: bannerIndex };
    // Guardar con clave específica del usuario
    const userKey = `santuario_profile_${user?.id || 'guest'}`;
    localStorage.setItem(userKey, JSON.stringify(profileData));
    setIsEditing(false);
    setShowAvatarPicker(false);
    alert('✅ Perfil guardado correctamente');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  const animesViendo = Object.values(tracking).filter(t => t.estado === 'viendo').length;
  const animesVistos = Object.values(tracking).filter(t => t.estado === 'visto').length;
  const animesPorVer = Object.values(tracking).filter(t => t.estado === 'por_ver').length;

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      {/* Banner */}
      <div className={`relative h-48 bg-gradient-to-r ${BANNERS[bannerIndex]} border-b border-zinc-800/50`}>
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59,130,246,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(168,85,247,0.4) 0%, transparent 50%)'
        }} />
        <button
          onClick={() => setBannerIndex((bannerIndex + 1) % BANNERS.length)}
          className="absolute bottom-3 right-4 rounded-lg bg-zinc-900/60 px-3 py-1.5 text-[10px] font-bold text-zinc-300 hover:bg-zinc-800"
        >
          🎨 Cambiar Banner
        </button>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="relative -mt-16">
          <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/70 backdrop-blur-xl p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Avatar */}
              <div className="relative group">
                <img
                  src={avatar}
                  alt={username}
                  className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl object-cover border-2 border-blue-500/50 shadow-lg"
                />
                <button
                  onClick={() => setShowAvatarPicker(!showAvatarPicker)}
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs"
                >
                  📷
                </button>
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl sm:text-3xl font-black text-white">{username}</h1>
                      {rol === 'admin' && (
                        <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 text-[10px] font-bold text-amber-400 animate-pulse">
                          👑 Admin
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-blue-400 font-semibold mt-1">💜 {generoFavorito}</p>
                    <p className="text-xs text-zinc-500 mt-1">{user?.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`rounded-xl px-4 py-2 text-xs font-bold ${
                        isEditing ? 'bg-green-600 text-white' : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                      }`}
                    >
                      {isEditing ? '✅ Guardar' : '✏️ Editar'}
                    </button>
                    <button
                      onClick={handleLogout}
                      className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
                    >
                      🚪 Salir
                    </button>
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre</label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Bio</label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        rows={3}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-300 mb-1">Género Favorito</label>
                      <div className="flex flex-wrap gap-1.5">
                        {GENEROS_ANIME.map((genero) => (
                          <button
                            key={genero}
                            onClick={() => setGeneroFavorito(genero)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                              generoFavorito === genero ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
                            }`}
                          >
                            {genero}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-zinc-400 max-w-2xl">{bio}</p>
                )}
              </div>
            </div>

            {showAvatarPicker && (
              <div className="mt-4 pt-4 border-t border-zinc-800/50">
                <p className="text-xs font-semibold text-zinc-400 mb-2">Elige tu avatar:</p>
                <div className="flex gap-2 flex-wrap">
                  {AVATARS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAvatar(a)}
                      className={`h-12 w-12 rounded-xl border-2 ${
                        avatar === a ? 'border-blue-500 scale-110' : 'border-transparent'
                      }`}
                    >
                      <img src={a} alt="avatar" className="h-full w-full rounded-xl object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 flex gap-2 border-b border-zinc-800/50 pb-3">
          {['estadisticas', 'logros', 'generos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setTabActiva(tab)}
              className={`px-4 py-2 rounded-lg text-xs font-bold ${
                tabActiva === tab ? 'bg-blue-600 text-white' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {tab === 'estadisticas' ? '📊 Estadísticas' : tab === 'logros' ? '🏆 Logros' : '🎯 Géneros'}
            </button>
          ))}
        </div>

        {tabActiva === 'estadisticas' && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 text-center">
              <div className="text-3xl font-black text-blue-400">{animesViendo}</div>
              <div className="text-[10px] text-blue-300 font-semibold mt-1">👁️ VIENDO</div>
            </div>
            <div className="rounded-xl border border-green-500/30 bg-green-950/30 p-4 text-center">
              <div className="text-3xl font-black text-green-400">{animesVistos}</div>
              <div className="text-[10px] text-green-300 font-semibold mt-1">✅ VISTOS</div>
            </div>
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/30 p-4 text-center">
              <div className="text-3xl font-black text-yellow-400">{animesPorVer}</div>
              <div className="text-[10px] text-yellow-300 font-semibold mt-1">📌 POR VER</div>
            </div>
            <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 text-center">
              <div className="text-3xl font-black text-purple-400">{stats?.episodiosVistos || 0}</div>
              <div className="text-[10px] text-purple-300 font-semibold mt-1">🎬 EPISODIOS</div>
            </div>
          </div>
        )}

        {tabActiva === 'logros' && (
          <div className="mt-4 space-y-3">
            {LOGROS.map((logro) => {
              const desbloqueado = logro.condicion(stats || {});
              return (
                <div
                  key={logro.nombre}
                  className={`rounded-xl border p-4 flex items-center gap-4 ${
                    desbloqueado ? 'border-amber-500/40 bg-amber-950/20' : 'border-zinc-800/60 bg-zinc-900/30 opacity-50'
                  }`}
                >
                  <div className="text-3xl">{desbloqueado ? logro.icon : '🔒'}</div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{logro.nombre}</h3>
                    <p className="text-xs text-zinc-500">{logro.descripcion}</p>
                  </div>
                  {desbloqueado && <span className="ml-auto text-[10px] font-bold text-amber-400">✅ DESBLOQUEADO</span>}
                </div>
              );
            })}
          </div>
        )}

        {tabActiva === 'generos' && stats?.generosTop?.length > 0 && (
          <div className="mt-4 rounded-2xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-bold text-white mb-3">🎯 Tus géneros favoritos</h3>
            <div className="space-y-2">
              {stats.generosTop.map((g: any) => {
                const maxPeso = stats.generosTop[0].peso || 1;
                const porcentaje = Math.round((g.peso / maxPeso) * 100);
                return (
                  <div key={g.genero} className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-zinc-400 w-20 capitalize">{g.genero}</span>
                    <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500" style={{ width: `${porcentaje}%` }} />
                    </div>
                    <span className="text-[10px] text-zinc-500 w-8 text-right">{g.peso}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
