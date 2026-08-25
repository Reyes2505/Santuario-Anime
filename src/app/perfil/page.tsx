'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const ADMIN_EMAILS = ['aaronreyesabantoj3@gmail.com', 'admin@santuario.com'];

export default function PerfilPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [rol, setRol] = useState('user');
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('Anime Otaku');
  const [bio, setBio] = useState('Explorando el Santuario Anime');
  const [avatar, setAvatar] = useState('https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      setUser(session.user);
      
      // Verificar si es admin por email (sin consulta a BD)
      const esAdmin = ADMIN_EMAILS.includes(session.user.email || '');
      setRol(esAdmin ? 'admin' : 'user');
      console.log('👑 Es admin:', esAdmin);

      const saved = localStorage.getItem('santuario_profile');
      if (saved) {
        const data = JSON.parse(saved);
        setUsername(data.username || 'Anime Otaku');
        setBio(data.bio || 'Explorando el Santuario Anime');
        setAvatar(data.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=SantuarioOtaku');
      }

      setLoading(false);
    }
    load();
  }, [router]);

  const handleSave = () => {
    const profileData = { username, bio, avatar };
    localStorage.setItem('santuario_profile', JSON.stringify(profileData));
    setIsEditing(false);
    alert('✅ Perfil guardado');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/';
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
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 p-6">
          <div className="flex items-center gap-4 mb-6">
            <img
              src={avatar}
              alt={username}
              className="h-20 w-20 rounded-2xl object-cover border-2 border-blue-500/50"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">{username}</h1>
                {rol === 'admin' && (
                  <span className="rounded-full bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 text-[10px] font-bold text-amber-400 animate-pulse">
                    👑 Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 mt-1">{user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
            >
              🚪 Salir
            </button>
          </div>

          <p className="text-sm text-zinc-400 mb-6">{bio}</p>

          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-500"
            >
              ✏️ Editar Perfil
            </button>
          ) : (
            <div className="space-y-4">
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
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Avatar URL</label>
                <input
                  type="text"
                  value={avatar}
                  onChange={(e) => setAvatar(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-bold text-white hover:bg-green-500"
                >
                  ✅ Guardar
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-xl bg-zinc-800 py-2.5 text-sm font-bold text-white hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
