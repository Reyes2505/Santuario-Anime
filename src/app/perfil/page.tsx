'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const ADMIN_EMAILS = ['aaronreyesabantoj3@gmail.com'];

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rol, setRol] = useState('user');
  const [loading, setLoading] = useState(true);
  
  // Estado del perfil
  const [nombre, setNombre] = useState('');
  const [bio, setBio] = useState('');
  const [avatar, setAvatar] = useState('');
  const [colorAcento, setColorAcento] = useState('#6366f1');
  const [estadisticas, setEstadisticas] = useState({
    totalAnimes: 0,
    viendo: 0,
    completados: 0,
    totalEpisodios: 0,
    horasVistas: 0,
  });
  
  const [editando, setEditando] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      setRol(ADMIN_EMAILS.includes(session.user.email || '') ? 'admin' : 'user');

      // Cargar perfil específico del usuario
      const userKey = `perfil_${session.user.id}`;
      const saved = localStorage.getItem(userKey);
      
      if (saved) {
        const data = JSON.parse(saved);
        setNombre(data.nombre || session.user.email?.split('@')[0] || 'Otaku');
        setBio(data.bio || 'Sin bio aún.');
        setAvatar(data.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.email}`);
        setColorAcento(data.color || '#6366f1');
      } else {
        setNombre(session.user.email?.split('@')[0] || 'Otaku');
        setBio('Sin bio aún.');
        setAvatar(`https://api.dicebear.com/7.x/bottts/svg?seed=${session.user.email}`);
      }

      // Cargar estadísticas del tracking
      try {
        const trackingKey = `santuario_tracking_v2_${session.user.id}`;
        const trackingRaw = localStorage.getItem(trackingKey);
        
        if (trackingRaw) {
          const tracking = JSON.parse(trackingRaw);
          const valores = Object.values(tracking) as any[];
          
          setEstadisticas({
            totalAnimes: valores.length,
            viendo: valores.filter(v => v.estado === 'viendo').length,
            completados: valores.filter(v => v.estado === 'visto').length,
            totalEpisodios: valores.reduce((acc, v) => acc + (v.ultimoEpisodio || 0), 0),
            horasVistas: Math.round(valores.reduce((acc, v) => acc + (v.progreso || 0), 0) / 60),
          });
        }
      } catch {
        // Sin tracking aún
      }

      setLoading(false);
    }
    load();
  }, [router]);

  const handleGuardar = () => {
    const userKey = `perfil_${user?.id}`;
    localStorage.setItem(userKey, JSON.stringify({ nombre, bio, avatar, color: colorAcento }));
    setEditando(false);
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

  const COLORES = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  return (
    <main className="min-h-screen bg-zinc-950">
      {/* Header del perfil */}
      <div className="border-b border-zinc-900">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={avatar}
                alt={nombre}
                className="h-24 w-24 rounded-2xl object-cover"
                style={{ borderColor: colorAcento, borderWidth: 2 }}
              />
              {rol === 'admin' && (
                <span
                  className="absolute -top-2 -right-2 text-xs"
                  title="Administrador"
                >
                  👑
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-black text-white">{nombre}</h1>
              <p className="text-sm text-zinc-500 mt-1">{user?.email}</p>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{bio}</p>
              
              {/* Stats inline */}
              <div className="flex gap-6 mt-4 text-xs text-zinc-500">
                <span><strong className="text-white">{estadisticas.totalAnimes}</strong> animes</span>
                <span><strong className="text-white">{estadisticas.viendo}</strong> viendo</span>
                <span><strong className="text-white">{estadisticas.completados}</strong> completados</span>
                <span><strong className="text-white">{estadisticas.horasVistas}h</strong> vistas</span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex gap-2">
              <button
                onClick={() => setEditando(!editando)}
                className="rounded-lg px-4 py-2 text-xs font-semibold transition-all"
                style={{
                  backgroundColor: editando ? '#10b981' : colorAcento,
                  color: 'white',
                }}
              >
                {editando ? 'Guardar' : 'Editar'}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg border border-zinc-800 px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-red-400 hover:border-red-900 transition-all"
              >
                Salir
              </button>
            </div>
          </div>

          {/* Formulario de edición */}
          {editando && (
            <div className="mt-8 space-y-4 border-t border-zinc-900 pt-6">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Nombre</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600 resize-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Avatar URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 px-4 py-2.5 text-sm text-white focus:outline-none focus:border-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-2">Color de acento</label>
                <div className="flex gap-2">
                  {COLORES.map((color) => (
                    <button
                      key={color}
                      onClick={() => setColorAcento(color)}
                      className="h-8 w-8 rounded-full transition-all"
                      style={{
                        backgroundColor: color,
                        outline: colorAcento === color ? `2px solid ${color}` : 'none',
                        outlineOffset: 2,
                      }}
                    />
                  ))}
                </div>
              </div>
              
              <button
                onClick={handleGuardar}
                className="w-full rounded-lg py-2.5 text-sm font-bold text-white transition-all"
                style={{ backgroundColor: '#10b981' }}
              >
                Guardar Cambios
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">Accesos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link href="/mi-lista" className="rounded-xl border border-zinc-900 p-4 hover:bg-zinc-900/50 transition-all">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-xs font-semibold text-white">Mi Lista</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">{estadisticas.totalAnimes} animes</div>
          </Link>
          <Link href="/calendario" className="rounded-xl border border-zinc-900 p-4 hover:bg-zinc-900/50 transition-all">
            <div className="text-2xl mb-2">📅</div>
            <div className="text-xs font-semibold text-white">Calendario</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Estrenos</div>
          </Link>
          <Link href="/recomendaciones" className="rounded-xl border border-zinc-900 p-4 hover:bg-zinc-900/50 transition-all">
            <div className="text-2xl mb-2">🔮</div>
            <div className="text-xs font-semibold text-white">Recomendaciones</div>
            <div className="text-[10px] text-zinc-500 mt-0.5">Para ti</div>
          </Link>
          {rol === 'admin' && (
            <Link href="/admin" className="rounded-xl border border-amber-900/50 p-4 hover:bg-amber-950/30 transition-all">
              <div className="text-2xl mb-2">🛠️</div>
              <div className="text-xs font-semibold text-amber-400">Admin</div>
              <div className="text-[10px] text-zinc-500 mt-0.5">Panel</div>
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
