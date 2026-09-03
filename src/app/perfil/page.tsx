'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getTrackingStats, formatWatchTime, getWatchTime, getWatchedEpisodes } from '@/lib/tracking';

interface UsuarioDB {
  id: string;
  user_id: string;
  email: string;
  username: string;
  is_admin: boolean;
  show_email?: boolean;
}

export default function PerfilPage() {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [showEmail, setShowEmail] = useState(false); // Privacidad del correo
  const [bio, setBio] = useState('Sin bio aún.');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');

  const [isAdmin, setIsAdmin] = useState(false);
  const [usuariosLista, setUsuariosLista] = useState<UsuarioDB[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [stats, setStats] = useState({
    animesCount: 0,
    episodiosVistos: 0,
    tiempoVisualizacion: '0m'
  });

  // Función para cargar stats locales (tiempo y episodios vistos)
  const cargarStatsLocal = useCallback(() => {
    const trackingStats = getTrackingStats();
    setStats(prev => ({
      ...prev,
      episodiosVistos: trackingStats.totalEpisodiosVistos,
      tiempoVisualizacion: formatWatchTime(trackingStats.totalSeconds)
    }));
  }, []);

  useEffect(() => {
    setMounted(true);
    sincronizarPerfilCloud();
    cargarStatsLocal();
    
    // Escuchar cambios en localStorage (cuando se actualiza en otra pestaña)
    window.addEventListener('storage', cargarStatsLocal);
    
    // Actualizar stats cada 30 segundos
    const interval = setInterval(cargarStatsLocal, 30000);
    
    return () => {
      window.removeEventListener('storage', cargarStatsLocal);
      clearInterval(interval);
    };
  }, [cargarStatsLocal]);

  const sincronizarPerfilCloud = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;

      if (!user) {
        setEmail('Invitado');
        setUsername('invitado');
        setLoading(false);
        return;
      }

      setUserId(user.id);
      const userEmail = user.email || '';
      setEmail(userEmail);
      const defaultName = userEmail.split('@')[0];
      setUsername(defaultName);

      // Bypass maestro indiscutible para tu cuenta de administrador
      const esAdminMaster = userEmail.toLowerCase().trim() === 'aaronreyesabantoj3@gmail.com';

      let { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!perfilData) {
        const nuevoPerfil = {
          user_id: user.id,
          username: defaultName,
          email: userEmail,
          bio: 'Sin bio aún.',
          is_admin: esAdminMaster,
          show_email: false,
          updated_at: new Date()
        };

        const { data: creado } = await supabase
          .from('perfiles')
          .insert([nuevoPerfil])
          .select()
          .single();

        perfilData = creado || nuevoPerfil;
      }

      setBio(perfilData.bio || 'Sin bio aún.');
      setAvatarUrl(perfilData.avatar_url || '');
      setBannerUrl(perfilData.banner_url || '');
      setUsername(perfilData.username || defaultName);
      setShowEmail(perfilData.show_email ?? false);
      
      setIsAdmin(esAdminMaster || Boolean(perfilData.is_admin));

      // Métricas de base de datos
      const { count: totalAnimes } = await supabase.from('animes').select('*', { count: 'exact', head: true });

      setStats(prev => ({
        ...prev,
        animesCount: totalAnimes || 0,
      }));

      // Cargar stats locales después de las de BD
      cargarStatsLocal();

    } catch (err) {
      console.error('Error sincronizando perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const guardarEnNube = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const payload = {
        user_id: userId,
        username: username,
        email: email, // <--- Incluido obligatoriamente para evitar el error de Supabase
        bio: bio,
        avatar_url: avatarUrl,
        banner_url: bannerUrl,
        show_email: showEmail,
        updated_at: new Date()
      };

      const { error } = await supabase
        .from('perfiles')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      setEditing(false);
      alert('✨ ¡Perfil sincronizado y guardado en la nube con éxito!');
    } catch (err: any) {
      alert(`❌ Error al guardar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const abrirPanelAdminUsuarios = async () => {
    if (!isAdmin) return;
    try {
      setLoading(true);
      const { data, error } = await supabase.from('perfiles').select('*');
      if (error) throw error;
      setUsuariosLista(data || []);
      setShowAdminModal(true);
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdminRol = async (targetUserId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('perfiles')
        .update({ is_admin: !currentStatus })
        .eq('user_id', targetUserId);

      if (error) throw error;

      setUsuariosLista(usuariosLista.map(u => 
        u.user_id === targetUserId ? { ...u, is_admin: !currentStatus } : u
      ));
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-[#030303] text-white font-sans selection:bg-emerald-500/30 selection:text-emerald-300 pb-32">
      
      {/* Navbar Minimalista Limpia */}
      <nav className="bg-[#050505] border-b border-zinc-900 sticky top-0 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xs font-medium text-zinc-400 hover:text-white transition-colors flex items-center gap-2 group">
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Volver al Catálogo
          </Link>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 text-xs font-mono shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Administrador Global Activo
              </div>
            ) : (
              <div className="px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs font-mono">
                Usuario Estándar
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 space-y-6">

        {/* Tarjeta de Perfil */}
        <div className="bg-[#09090b] border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl relative">
          
          {/* Banner */}
          <div className="h-48 sm:h-56 bg-gradient-to-r from-zinc-950 via-emerald-950/30 to-zinc-950 relative overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="Banner" className="w-full h-full object-cover opacity-50" />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-transparent to-transparent opacity-90" />
          </div>

          <div className="px-6 sm:px-8 pb-8 relative">
            <div className="flex justify-between items-end -mt-16 sm:-mt-20 mb-5">
              <div className="relative group">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-zinc-900 border-[5px] border-[#09090b] overflow-hidden shadow-2xl flex items-center justify-center text-4xl relative">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    '🤖'
                  )}
                </div>
              </div>

              <div>
                {editing ? (
                  <button 
                    onClick={guardarEnNube}
                    disabled={loading}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50"
                  >
                    {loading ? 'Sincronizando...' : 'Guardar Cambios'}
                  </button>
                ) : (
                  <button 
                    onClick={() => setEditing(true)}
                    className="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs rounded-xl transition-all border border-zinc-800"
                  >
                    Editar Perfil
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-white">{username}</h1>
                {isAdmin && (
                  <span className="text-[10px] font-mono uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    ADMIN
                  </span>
                )}
              </div>

              {/* Control de Privacidad del Correo */}
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono">
                {showEmail ? (
                  <span>{email}</span>
                ) : (
                  <span className="italic text-zinc-600">🔒 Correo oculto (Privado)</span>
                )}
                {editing && (
                  <button
                    type="button"
                    onClick={() => setShowEmail(!showEmail)}
                    className="ml-2 text-[10px] bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-700 px-2 py-0.5 rounded transition-all"
                  >
                    {showEmail ? 'Hacer Privado' : 'Hacer Público'}
                  </button>
                )}
              </div>
              
              {editing ? (
                <div className="space-y-4 pt-4 bg-zinc-950 p-5 rounded-2xl border border-zinc-800">
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">Alias / Usuario:</label>
                    <input 
                      type="text" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white mt-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">Biografía:</label>
                    <textarea 
                      value={bio} 
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full bg-black border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white mt-1.5 focus:outline-none focus:border-emerald-500 resize-none"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">URL Avatar:</label>
                      <input 
                        type="text" 
                        value={avatarUrl} 
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white mt-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-zinc-400 uppercase font-mono tracking-wider">URL Banner:</label>
                      <input 
                        type="text" 
                        value={bannerUrl} 
                        onChange={(e) => setBannerUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white mt-1.5 focus:outline-none focus:border-emerald-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-zinc-300 pt-2 leading-relaxed max-w-2xl">{bio}</p>
              )}
            </div>

            {/* Métricas con nombres atractivos e intuitivos */}
            <div className="grid grid-cols-3 gap-3.5 mt-8 pt-6 border-t border-zinc-900 text-center font-mono">
              <div className="bg-black/40 border border-zinc-800/60 p-4 rounded-2xl">
                <div className="text-xl font-bold text-emerald-400 tracking-tight">{stats.animesCount}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Catálogo Global</div>
              </div>
              <div className="bg-black/40 border border-zinc-800/60 p-4 rounded-2xl">
                <div className="text-xl font-bold text-cyan-400 tracking-tight">{stats.episodiosVistos}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Episodios Vistos</div>
              </div>
              <div className="bg-black/40 border border-zinc-800/60 p-4 rounded-2xl">
                <div className="text-xl font-bold text-amber-400 tracking-tight">{stats.tiempoVisualizacion}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Tiempo de Visualización</div>
              </div>
            </div>

          </div>
        </div>

        {/* Panel de Control y Autoridad (Solo Admins) */}
        {isAdmin && (
          <div className="space-y-4 pt-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-mono text-emerald-400 uppercase tracking-widest flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Centro de Operaciones y Autoridad
              </h3>
              <button
                onClick={abrirPanelAdminUsuarios}
                className="text-xs font-mono bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3.5 py-1.5 rounded-xl transition-all"
              >
                👥 Gestionar Roles de Usuarios
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Link href="/admin/terminal" className="bg-[#09090b] border border-emerald-500/30 hover:border-emerald-500/60 p-6 rounded-3xl transition-all group flex items-center justify-between shadow-[0_0_30px_rgba(16,185,129,0.05)]">
                <div>
                  <div className="text-base font-semibold mb-1 text-emerald-400 flex items-center gap-2">
                    <span>🛠️</span> Terminal Ectosimbionte
                  </div>
                  <div className="text-xs text-zinc-400 font-sans">Consola CLI y automatización vía GitHub Actions</div>
                </div>
                <span className="text-emerald-500 group-hover:translate-x-1 transition-transform">→</span>
              </Link>

              <Link href="/admin" className="bg-[#09090b] border border-zinc-800 hover:border-cyan-500/40 p-6 rounded-3xl transition-all group flex items-center justify-between">
                <div>
                  <div className="text-base font-semibold mb-1 text-white flex items-center gap-2">
                    <span>⚙️</span> Dashboard General
                  </div>
                  <div className="text-xs text-zinc-400 font-sans">Panel visual de gestión de la plataforma</div>
                </div>
                <span className="text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-transform">→</span>
              </Link>
            </div>
          </div>
        )}

        {/* Modal de Control de Usuarios */}
        {showAdminModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="bg-[#09090b] border border-zinc-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 max-h-[85vh] flex flex-col">
              <div className="flex justify-between items-center border-b border-zinc-900 pb-5">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2.5">
                    <span>👥</span> Base de Datos de Usuarios
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">Concesión de privilegios y control de accesos maestros.</p>
                </div>
                <button onClick={() => setShowAdminModal(false)} className="text-zinc-500 hover:text-white text-xs font-mono p-2.5 bg-zinc-900 rounded-xl transition-colors">
                  ✕
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto flex-1 pr-1">
                {usuariosLista.map((u) => (
                  <div key={u.user_id} className="bg-black/50 border border-zinc-800/80 p-4 rounded-2xl flex items-center justify-between transition-colors hover:border-zinc-700">
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {u.username}
                        {u.is_admin && <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-mono">ADMIN</span>}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">{u.email}</div>
                    </div>

                    <button
                      onClick={() => toggleAdminRol(u.user_id, u.is_admin)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-medium transition-all ${
                        u.is_admin 
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                      }`}
                    >
                      {u.is_admin ? 'Revocar Admin' : 'Hacer Admin'}
                    </button>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-900 pt-4 flex justify-end">
                <button onClick={() => setShowAdminModal(false)} className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium transition-all border border-zinc-800">
                  Cerrar Panel
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}