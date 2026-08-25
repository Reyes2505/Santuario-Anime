'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['aaronreyesabantoj3@gmail.com'];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    animes: 0, temporadas: 0, episodios: 0,
    usuariosRegistrados: 0, episodiosVistos: 0, animesEnEmision: 0
  });
  const [animes, setAnimes] = useState<any[]>([]);
  const [episodios, setEpisodios] = useState<any[]>([]);
  const [tabActiva, setTabActiva] = useState('dashboard');
  const [mensaje, setMensaje] = useState('');
  const [animeSeleccionado, setAnimeSeleccionado] = useState<any>(null);
  const [episodiosDelAnime, setEpisodiosDelAnime] = useState<any[]>([]);

  // Formularios
  const [nuevoAnime, setNuevoAnime] = useState({ titulo: '', sinopsis: '', portada_url: '', banner_url: '' });
  const [nuevoEpisodio, setNuevoEpisodio] = useState({ numero: 1, titulo: '', url_stream: '' });

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      setUser(session.user);
      const adminStatus = ADMIN_EMAILS.includes(session.user.email || '');
      setIsAdmin(adminStatus);

      if (!adminStatus) { router.push('/'); return; }

      await cargarTodo();
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const cargarTodo = async () => {
    // Estadísticas
    const { count: animesCount } = await supabase.from('animes').select('*', { count: 'exact' });
    const { count: tempsCount } = await supabase.from('temporadas').select('*', { count: 'exact' });
    const { count: epsCount } = await supabase.from('episodios').select('*', { count: 'exact' });

    // Usuarios registrados
    const { data: usuarios } = await supabase.auth.admin.listUsers();
    const usuariosCount = usuarios?.length || 0;

    setStats({
      animes: animesCount || 0,
      temporadas: tempsCount || 0,
      episodios: epsCount || 0,
      usuariosRegistrados: usuariosCount,
      episodiosVistos: epsCount || 0,
      animesEnEmision: animesCount || 0,
    });

    // Cargar animes
    const { data: animesData } = await supabase
      .from('animes')
      .select('*')
      .order('created_at', { ascending: false });
    if (animesData) setAnimes(animesData);

    // Cargar episodios
    const { data: epsData } = await supabase
      .from('episodios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (epsData) setEpisodios(epsData);
  };

  const cargarEpisodiosDeAnime = async (animeId: string) => {
    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId);
    const tempIds = (temps.data || []).map(t => t.id);
    
    if (tempIds.length === 0) {
      setEpisodiosDelAnime([]);
      return;
    }

    const { data } = await supabase
      .from('episodios')
      .select('*')
      .in('temporada_id', tempIds)
      .order('numero');
    setEpisodiosDelAnime(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
  };

  // ==== ACCIONES ANIME ====
  const handleAgregarAnime = async () => {
    if (!nuevoAnime.titulo.trim()) return;
    const { error } = await supabase.from('animes').insert({
      titulo: nuevoAnime.titulo,
      sinopsis: nuevoAnime.sinopsis || 'Sin descripción',
      portada_url: nuevoAnime.portada_url,
      banner_url: nuevoAnime.banner_url || nuevoAnime.portada_url
    }).select().single();

    if (error) {
      setMensaje(`❌ ${error.message}`);
    } else {
      setMensaje('✅ Anime agregado');
      setNuevoAnime({ titulo: '', sinopsis: '', portada_url: '', banner_url: '' });
      await cargarTodo();
    }
  };

  const handleEliminarAnime = async (animeId: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}" y TODOS sus episodios?`)) return;
    
    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId);
    for (const t of temps.data || []) {
      await supabase.from('episodios').delete().eq('temporada_id', t.id);
      await supabase.from('temporadas').delete().eq('id', t.id);
    }
    await supabase.from('animes').delete().eq('id', animeId);
    setMensaje('✅ Anime eliminado');
    await cargarTodo();
  };

  const handleEditarAnime = async (animeId: string, campo: string, valor: string) => {
    await supabase.from('animes').update({ [campo]: valor }).eq('id', animeId);
    setMensaje('✅ Anime actualizado');
    await cargarTodo();
  };

  // ==== ACCIONES EPISODIO ====
  const handleAgregarEpisodio = async (animeId: string) => {
    if (!nuevoEpisodio.url_stream.trim()) {
      setMensaje('❌ La URL del video es obligatoria');
      return;
    }

    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId).limit(1);
    const temporadaId = temps.data?.[0]?.id;

    if (!temporadaId) {
      setMensaje('❌ El anime no tiene temporada');
      return;
    }

    const { error } = await supabase.from('episodios').insert({
      temporada_id: temporadaId,
      numero: nuevoEpisodio.numero,
      titulo: nuevoEpisodio.titulo || `Episodio ${nuevoEpisodio.numero}`,
      url_stream: nuevoEpisodio.url_stream,
      visto: false
    });

    if (error) {
      setMensaje(`❌ ${error.message}`);
    } else {
      setMensaje('✅ Episodio agregado');
      setNuevoEpisodio({ numero: nuevoEpisodio.numero + 1, titulo: '', url_stream: '' });
      await cargarEpisodiosDeAnime(animeId);
      await cargarTodo();
    }
  };

  const handleEliminarEpisodio = async (episodioId: string) => {
    if (!confirm('¿Eliminar este episodio?')) return;
    await supabase.from('episodios').delete().eq('id', episodioId);
    setMensaje('✅ Episodio eliminado');
    if (animeSeleccionado) await cargarEpisodiosDeAnime(animeSeleccionado.id);
    await cargarTodo();
  };

  const handleEditarEpisodio = async (episodioId: string, campo: string, valor: string) => {
    await supabase.from('episodios').update({ [campo]: valor }).eq('id', episodioId);
    setMensaje('✅ Episodio actualizado');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="animate-spin h-12 w-12 border-2 border-t-amber-500 border-zinc-800 rounded-full" />
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="text-6xl mb-4">⛔</div>
          <h1 className="text-2xl font-black text-white">Acceso Denegado</h1>
          <p className="text-sm text-zinc-500 mt-2">Solo administradores pueden acceder.</p>
          <button onClick={() => router.push('/')} className="mt-4 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
            Volver al Inicio
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">
              🛠️ Panel <span className="text-amber-400">Admin</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              👤 {user?.email} · <span className="text-amber-400 font-bold">👑 Admin</span>
            </p>
          </div>
          <button onClick={handleLogout} className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500">
            🚪 Salir
          </button>
        </div>

        {mensaje && (
          <div className={`mb-4 rounded-lg p-3 text-xs ${
            mensaje.startsWith('✅') ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'
          }`}>
            {mensaje}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-800/50 pb-3 flex-wrap">
          <button onClick={() => setTabActiva('dashboard')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tabActiva === 'dashboard' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
            📊 Dashboard
          </button>
          <button onClick={() => setTabActiva('animes')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tabActiva === 'animes' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
            🎬 Animes ({stats.animes})
          </button>
          <button onClick={() => setTabActiva('episodios')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tabActiva === 'episodios' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
            📹 Episodios ({stats.episodios})
          </button>
          <button onClick={() => setTabActiva('agregarAnime')} className={`px-4 py-2 rounded-lg text-xs font-bold ${tabActiva === 'agregarAnime' ? 'bg-amber-600 text-white' : 'bg-zinc-900 text-zinc-400'}`}>
            ➕ Agregar Anime
          </button>
        </div>

        {/* Dashboard */}
        {tabActiva === 'dashboard' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
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
              <div className="text-2xl font-black text-amber-400">{stats.usuariosRegistrados}</div>
              <div className="text-[10px] text-amber-300 font-semibold mt-1">USUARIOS</div>
            </div>
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-950/30 p-4 text-center">
              <div className="text-2xl font-black text-cyan-400">{stats.episodiosVistos}</div>
              <div className="text-[10px] text-cyan-300 font-semibold mt-1">EPS VISTOS</div>
            </div>
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/30 p-4 text-center">
              <div className="text-2xl font-black text-rose-400">{stats.animesEnEmision}</div>
              <div className="text-[10px] text-rose-300 font-semibold mt-1">EN EMISIÓN</div>
            </div>
          </div>
        )}

        {/* Lista de Animes */}
        {tabActiva === 'animes' && (
          <div className="space-y-2">
            {animes.map((anime) => (
              <div key={anime.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {anime.portada_url ? (
                      <img src={anime.portada_url} alt={anime.titulo} className="h-12 w-9 rounded object-cover" />
                    ) : (
                      <div className="h-12 w-9 rounded bg-zinc-800 flex items-center justify-center">🎬</div>
                    )}
                    <div>
                      <h4 className="text-xs font-bold text-white">{anime.titulo}</h4>
                      <p className="text-[10px] text-zinc-500">{anime.sinopsis?.slice(0, 50)}...</p>
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        setAnimeSeleccionado(anime);
                        cargarEpisodiosDeAnime(anime.id);
                        setTabActiva('episodios');
                      }}
                      className="rounded-lg bg-blue-600 px-3 py-1.5 text-[10px] font-bold text-white"
                    >
                      📹 Ver Eps
                    </button>
                    <button
                      onClick={() => {
                        const nuevoTitulo = prompt('Editar título:', anime.titulo);
                        if (nuevoTitulo) handleEditarAnime(anime.id, 'titulo', nuevoTitulo);
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminarAnime(anime.id, anime.titulo)}
                      className="rounded-lg bg-red-950/50 border border-red-500/30 px-3 py-1.5 text-[10px] font-bold text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Episodios */}
        {tabActiva === 'episodios' && (
          <div>
            {animeSeleccionado && (
              <div className="mb-4 rounded-xl border border-blue-500/30 bg-blue-950/20 p-3">
                <h3 className="text-sm font-bold text-white">📹 {animeSeleccionado.titulo}</h3>
              </div>
            )}
            <div className="space-y-2">
              {(animeSeleccionado ? episodiosDelAnime : episodios).map((ep) => (
                <div key={ep.id} className="rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-3 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">
                      EP {ep.numero} - {ep.titulo || 'Sin título'}
                    </h4>
                    <p className="text-[10px] text-zinc-600 font-mono truncate max-w-md">{ep.url_stream}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => {
                        const nuevoTitulo = prompt('Editar título:', ep.titulo);
                        if (nuevoTitulo) handleEditarEpisodio(ep.id, 'titulo', nuevoTitulo);
                      }}
                      className="rounded-lg bg-amber-600 px-3 py-1.5 text-[10px] font-bold text-white"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleEliminarEpisodio(ep.id)}
                      className="rounded-lg bg-red-950/50 border border-red-500/30 px-3 py-1.5 text-[10px] font-bold text-red-400"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Agregar Anime */}
        {tabActiva === 'agregarAnime' && (
          <div className="max-w-2xl rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-5">
            <h3 className="text-sm font-bold text-white mb-4">➕ Agregar Anime</h3>
            <div className="space-y-3">
              <input
                type="text"
                value={nuevoAnime.titulo}
                onChange={(e) => setNuevoAnime({ ...nuevoAnime, titulo: e.target.value })}
                placeholder="Título del anime *"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white"
              />
              <textarea
                value={nuevoAnime.sinopsis}
                onChange={(e) => setNuevoAnime({ ...nuevoAnime, sinopsis: e.target.value })}
                rows={3}
                placeholder="Sinopsis"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white resize-none"
              />
              <input
                type="text"
                value={nuevoAnime.portada_url}
                onChange={(e) => setNuevoAnime({ ...nuevoAnime, portada_url: e.target.value })}
                placeholder="URL de portada"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white"
              />
              <button
                onClick={handleAgregarAnime}
                className="w-full rounded-xl bg-green-600 py-3 text-sm font-bold text-white hover:bg-green-500"
              >
                ✅ Agregar
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
