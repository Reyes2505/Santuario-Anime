'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { esAdmin } from '@/lib/admin';

export default function AdminPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ animes: 0, temporadas: 0, episodios: 0, usuarios: 0 });
  const [animes, setAnimes] = useState<any[]>([]);
  const [showAnimes, setShowAnimes] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      
      // Verificar si es admin
      const adminStatus = await esAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        router.push('/');
        return;
      }

      // Cargar estadísticas
      const { count: animesCount } = await supabase.from('animes').select('*', { count: 'exact' });
      const { count: tempsCount } = await supabase.from('temporadas').select('*', { count: 'exact' });
      const { count: epsCount } = await supabase.from('episodios').select('*', { count: 'exact' });
      
      setStats({
        animes: animesCount || 0,
        temporadas: tempsCount || 0,
        episodios: epsCount || 0,
        usuarios: 1,
      });

      // Cargar lista de animes
      const { data: animesData } = await supabase.from('animes').select('*').order('created_at', { ascending: false });
      if (animesData) setAnimes(animesData);

      setLoading(false);
    }

    checkAuth();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleEliminarAnime = async (animeId: string) => {
    if (!confirm('¿Eliminar este anime y todos sus episodios?')) return;
    
    // Eliminar episodios
    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId);
    for (const t of temps.data || []) {
      await supabase.from('episodios').delete().eq('temporada_id', t.id);
      await supabase.from('temporadas').delete().eq('id', t.id);
    }
    
    await supabase.from('animes').delete().eq('id', animeId);
    alert('Anime eliminado');
    window.location.reload();
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-blue-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-white">
            🛠️ Panel de <span className="text-amber-400">Administrador</span>
          </h1>
          <div className="flex gap-2">
            {isAdmin && (
              <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-3 py-1 text-xs font-bold text-amber-400">
                👑 Admin Verificado
              </span>
            )}
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-4 mb-8">
          <p className="text-sm text-zinc-400">
            Conectado como: <span className="text-white font-bold">{user?.email}</span>
          </p>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="rounded-xl border border-blue-500/30 bg-blue-950/30 p-4 text-center">
            <div className="text-2xl font-black text-blue-400">{stats.animes}</div>
            <div className="text-[10px] text-blue-300 font-semibold mt-1">ANIMES</div>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-950/30 p-4 text-center">
            <div className="text-2xl font-black text-purple-400">{stats.temporadas}</div>
            <div className="text-[10px] text-purple-300 font-semibold mt-1">TEMPORADAS</div>
          </div>
          <div className="rounded-xl border border-green-500/30 bg-green-950/30 p-4 text-center">
            <div className="text-2xl font-black text-green-400">{stats.episodios}</div>
            <div className="text-[10px] text-green-300 font-semibold mt-1">EPISODIOS</div>
          </div>
          <div className="rounded-xl border border-amber-500/30 bg-amber-950/30 p-4 text-center">
            <div className="text-2xl font-black text-amber-400">{stats.usuarios}</div>
            <div className="text-[10px] text-amber-300 font-semibold mt-1">ADMINS</div>
          </div>
        </div>

        {/* Gestión de animes */}
        <button
          onClick={() => setShowAnimes(!showAnimes)}
          className="mb-4 rounded-xl bg-zinc-800 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-700"
        >
          {showAnimes ? 'Ocultar' : 'Mostrar'} lista de animes ({animes.length})
        </button>

        {showAnimes && (
          <div className="space-y-2">
            {animes.map((anime) => (
              <div
                key={anime.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3"
              >
                <div className="flex items-center gap-3">
                  {anime.portada_url ? (
                    <img src={anime.portada_url} alt={anime.titulo} className="h-10 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-8 rounded bg-zinc-800 flex items-center justify-center">🎬</div>
                  )}
                  <span className="text-xs font-bold text-white">{anime.titulo}</span>
                </div>
                <button
                  onClick={() => handleEliminarAnime(anime.id)}
                  className="rounded-lg bg-red-950/50 border border-red-500/30 px-3 py-1 text-[10px] font-bold text-red-400 hover:bg-red-600 hover:text-white"
                >
                  🗑️ Eliminar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
