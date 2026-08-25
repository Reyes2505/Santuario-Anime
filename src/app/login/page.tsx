'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        setError('✅ Cuenta creada. Revisa tu email para confirmar.');
        setIsLoading(false);
        return;
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        if (data.session) {
          // Esperar a que la sesión se propague
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Redirigir al lobby usando window.location
          window.location.href = '/';
        } else {
          setError('No se pudo iniciar sesión.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error de autenticación');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-zinc-800/60 bg-zinc-900/60 backdrop-blur-xl p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏯</div>
            <h1 className="text-2xl font-black text-white">
              Santuario <span className="text-blue-400">Anime</span>
            </h1>
            <p className="text-xs text-zinc-500 mt-2">
              {isRegistering ? 'Crear cuenta' : 'Iniciar sesión'}
            </p>
          </div>

          {error && (
            <div className={`mb-4 rounded-lg p-3 text-xs ${
              error.startsWith('✅') ? 'bg-green-950/50 text-green-300' : 'bg-red-950/50 text-red-300'
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/30 hover:shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Cargando...' : isRegistering ? 'Crear Cuenta' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-500 mt-4">
            <button
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-blue-400 hover:text-blue-300 font-semibold"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
            </button>
          </p>
        </div>
      </div>
    </main>
  );
}
