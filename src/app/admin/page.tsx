'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Anime } from '@/types/database';

const ADMIN_EMAILS = ['aaronreyesabantoj3@gmail.com'];

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [stats, setStats] = useState({ animes: 0, episodios: 0 });
  const [tabActiva, setTabActiva] = useState('dashboard');
  const [mensaje, setMensaje] = useState('');

  // Estado para edición de anime
  const [animeEditando, setAnimeEditando] = useState<Anime | null>(null);

  // Formulario de episodio manual
  const [nuevoEpisodio, setNuevoEpisodio] = useState({
    anime_id: '',
    numero: 1,
    titulo: '',
    url_stream: '',
  });

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      setUser(session.user);
      const adminStatus = ADMIN_EMAILS.includes(session.user.email || '');
      setIsAdmin(adminStatus);

      if (!adminStatus) { router.push('/'); return; }

      await cargarDatos();
      setLoading(false);
    }
    checkAuth();
  }, [router]);

  const cargarDatos = async () => {
    const { data: animesData } = await supabase.from('animes').select('*').order('titulo');
    if (animesData) setAnimes(animesData as Anime[]);

    const { count: animesCount } = await supabase.from('animes').select('*', { count: 'exact' });
    const { count: epsCount } = await supabase.from('episodios').select('*', { count: 'exact' });

    setStats({
      animes: animesCount || 0,
      episodios: epsCount || 0,
    });
  };

  const handleEliminarAnime = async (animeId: string, titulo: string) => {
    if (!confirm(`¿Eliminar "${titulo}" y todos sus episodios?`)) return;

    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId);
    for (const t of temps.data || []) {
      await supabase.from('episodios').delete().eq('temporada_id', t.id);
      await supabase.from('temporadas').delete().eq('id', t.id);
    }
    await supabase.from('animes').delete().eq('id', animeId);

    setMensaje('Anime eliminado correctamente');
    await cargarDatos();
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!animeEditando) return;

    const { error } = await supabase
      .from('animes')
      .update({
        titulo: animeEditando.titulo,
        sinopsis: animeEditando.sinopsis,
        portada_url: animeEditando.portada_url,
        banner_url: animeEditando.banner_url,
      })
      .eq('id', animeEditando.id);

    if (error) {
      setMensaje(`Error al actualizar: ${error.message}`);
    } else {
      setMensaje(`Anime "${animeEditando.titulo}" actualizado con éxito.`);
      setAnimeEditando(null);
      await cargarDatos();
    }
  };

  const handleAgregarEpisodio = async () => {
    if (!nuevoEpisodio.anime_id || !nuevoEpisodio.url_stream) {
      setMensaje('Completa anime_id y url_stream');
      return;
    }

    const temps = await supabase.from('temporadas').select('id').eq('anime_id', nuevoEpisodio.anime_id).limit(1);
    const temporadaId = temps.data?.[0]?.id;

    if (!temporadaId) {
      const tempResult = await supabase.from('temporadas').insert({
        anime_id: nuevoEpisodio.anime_id,
        nombre: 'Temporada 1',
        orden: 1,
        anio_lanzamiento: 2026
      }).select().single();
      if (!tempResult.data) return;
      const tempId = tempResult.data.id;

      await supabase.from('episodios').insert({
        temporada_id: tempId,
        numero: nuevoEpisodio.numero,
        titulo: nuevoEpisodio.titulo || `Episodio ${nuevoEpisodio.numero}`,
        url_stream: nuevoEpisodio.url_stream,
        visto: false
      });
    } else {
      await supabase.from('episodios').insert({
        temporada_id: temporadaId,
        numero: nuevoEpisodio.numero,
        titulo: nuevoEpisodio.titulo || `Episodio ${nuevoEpisodio.numero}`,
        url_stream: nuevoEpisodio.url_stream,
        visto: false
      });
    }

    setMensaje('Episodio agregado correctamente');
    setNuevoEpisodio({ anime_id: '', numero: 1, titulo: '', url_stream: '' });
    await cargarDatos();
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

  if (!isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="text-5xl mb-4">Acceso Denegado</div>
          <h1 className="text-2xl font-black text-white">Solo administradores</h1>
          <button onClick={() => router.push('/')} className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-bold text-white">
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  const animesFiltrados = animes.filter((a) => 
    a.titulo.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-zinc-950 pb-16 selection:bg-amber-500 selection:text-black">
      <div className="mx-auto max-w-7xl px-4 py-8">
        
        {/* Header con Acceso a la Terminal */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 border-b border-zinc-900 pb-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tight">Panel de Administración</h1>
            <p className="text-xs text-zinc-500 mt-1 font-mono">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/terminal"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600/15 border border-emerald-500/40 px-4 py-2 text-xs font-bold text-emerald-400 hover:bg-emerald-600/25 transition-all shadow-lg"
            >
              <span>💻</span> Terminal / Chat Core
            </Link>
            <button onClick={handleLogout} className="rounded-xl bg-red-600/15 border border-red-500/40 px-4 py-2 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all">
              Salir
            </button>
          </div>
        </div>

        {mensaje && (
          <div className="mb-6 rounded-xl bg-green-950/40 border border-green-500/30 p-3.5 text-xs font-medium text-green-300 backdrop-blur-sm flex items-center justify-between">
            <span>{mensaje}</span>
            <button onClick={() => setMensaje('')} className="text-zinc-400 hover:text-white font-bold ml-2">✕</button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-center backdrop-blur-sm">
            <div className="text-3xl font-black text-white">{stats.animes}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mt-1">Animes</div>
          </div>
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 text-center backdrop-blur-sm">
            <div className="text-3xl font-black text-white">{stats.episodios}</div>
            <div className="text-xs uppercase tracking-wider text-zinc-500 font-semibold mt-1">Episodios</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-zinc-950 pb-3 overflow-x-auto">
          <button
            onClick={() => setTabActiva('dashboard')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tabActiva === 'dashboard' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setTabActiva('animes')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tabActiva === 'animes' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Catálogo y Gestión ({animes.length})
          </button>
          <button
            onClick={() => setTabActiva('episodio')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tabActiva === 'episodio' ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/20' : 'bg-zinc-900/60 text-zinc-400 hover:bg-zinc-900'
            }`}
          >
            Agregar Episodio
          </button>
        </div>

        {/* Dashboard */}
        {tabActiva === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
              <h3 className="text-sm font-bold text-white">Estado del Sistema</h3>
              <div className="space-y-2 text-xs text-zinc-400 font-mono">
                <p>🔹 Base de datos: Conectada</p>
                <p>🔹 Última sincronización: {new Date().toLocaleString()}</p>
                <p>🔹 Bot automático: 10:30 AM y 2:00 PM</p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-zinc-900/40 p-6 backdrop-blur-sm flex flex-col justify-between space-y-4">
              <div>
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <span>⚡</span> Consola Algorítmica Inteligente
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                  Accede a la terminal interactiva para auditar enlaces en tiempo real, simular entrenamiento de recomendaciones o ejecutar comandos directos sobre el clúster multimedia.
                </p>
              </div>
              <Link
                href="/admin/terminal"
                className="inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-black text-xs font-extrabold uppercase tracking-wider transition-all shadow-lg"
              >
                Abrir Terminal de Comandos →
              </Link>
            </div>
          </div>
        )}

        {/* Lista de Animes con Buscador y Edición */}
        {tabActiva === 'animes' && (
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-zinc-500">🔍</span>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar anime por título en todo el catálogo..."
                className="w-full rounded-2xl bg-zinc-900/60 border border-zinc-800 pl-11 pr-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            <div className="text-xs text-zinc-500 px-1">
              Mostrando {animesFiltrados.length} de {animes.length} animes registrados.
            </div>

            {/* Listado filtrado */}
            <div className="space-y-2.5">
              {animesFiltrados.map((anime) => (
                <div key={anime.id} className="flex items-center justify-between rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-4 backdrop-blur-sm hover:border-zinc-700 transition-all">
                  <div className="flex items-center gap-4">
                    {anime.portada_url ? (
                      <img src={anime.portada_url} alt={anime.titulo} className="h-14 w-10 rounded-lg object-cover border border-zinc-800" />
                    ) : (
                      <div className="h-14 w-10 rounded-lg bg-zinc-800 flex items-center justify-center text-xs">🎬</div>
                    )}
                    <div>
                      <span className="text-sm font-bold text-white tracking-wide block">{anime.titulo}</span>
                      <span className="text-[10px] text-zinc-500 font-mono">ID: {anime.id}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setAnimeEditando(anime)}
                      className="rounded-xl bg-blue-950/40 border border-blue-500/30 px-3.5 py-2 text-xs font-bold text-blue-400 hover:bg-blue-600 hover:text-white transition-all"
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => handleEliminarAnime(anime.id, anime.titulo)}
                      className="rounded-xl bg-red-950/40 border border-red-500/30 px-3.5 py-2 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white transition-all"
                    >
                      🗑️ Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal / Vista de Edición de Anime */}
        {animeEditando && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
            <div className="w-full max-w-xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-4 my-8">
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <h3 className="text-base font-bold text-white">Editar Anime: {animeEditando.titulo}</h3>
                <button onClick={() => setAnimeEditando(null)} className="text-zinc-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              <form onSubmit={handleGuardarEdicion} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Título del Anime</label>
                  <input
                    type="text"
                    value={animeEditando.titulo}
                    onChange={(e) => setAnimeEditando({ ...animeEditando, titulo: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Sinopsis</label>
                  <textarea
                    value={animeEditando.sinopsis || ''}
                    onChange={(e) => setAnimeEditando({ ...animeEditando, sinopsis: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">URL de la Portada (Poster)</label>
                  <input
                    type="text"
                    value={animeEditando.portada_url || ''}
                    onChange={(e) => setAnimeEditando({ ...animeEditando, portada_url: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">URL del Banner</label>
                  <input
                    type="text"
                    value={animeEditando.banner_url || ''}
                    onChange={(e) => setAnimeEditando({ ...animeEditando, banner_url: e.target.value })}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setAnimeEditando(null)}
                    className="w-1/2 rounded-xl bg-zinc-900 py-3 text-xs font-bold text-zinc-300 hover:bg-zinc-800 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="w-1/2 rounded-xl bg-amber-600 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-amber-500 transition-all shadow-lg shadow-amber-600/20"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Agregar Episodio */}
        {tabActiva === 'episodio' && (
          <div className="max-w-xl rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-bold text-white mb-4">Agregar Episodio Manual</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Anime ID (UUID)</label>
                <input
                  type="text"
                  value={nuevoEpisodio.anime_id}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, anime_id: e.target.value })}
                  placeholder="Ej. a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Número de Episodio</label>
                <input
                  type="number"
                  value={nuevoEpisodio.numero}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, numero: parseInt(e.target.value) || 1 })}
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Título del Episodio (Opcional)</label>
                <input
                  type="text"
                  value={nuevoEpisodio.titulo}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, titulo: e.target.value })}
                  placeholder="Ej. El comienzo de la aventura"
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">URL de Streaming</label>
                <input
                  type="text"
                  value={nuevoEpisodio.url_stream}
                  onChange={(e) => setNuevoEpisodio({ ...nuevoEpisodio, url_stream: e.target.value })}
                  placeholder="https://..."
                  className="w-full rounded-xl bg-zinc-950 border border-zinc-800 px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>
              <button
                onClick={handleAgregarEpisodio}
                className="w-full rounded-xl bg-emerald-600 py-3 text-xs font-extrabold uppercase tracking-wider text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 mt-2"
              >
                Registrar Episodio
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
