'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AnimeDetectado {
  nombre: string;
  enBD: boolean;
  animeId?: string;
  encontrado?: {
    id: string;
    titulo: string;
    portada_url: string;
    episodios: number;
  };
}

export default function PeticionesPage() {
  const [texto, setTexto] = useState('');
  const [resultados, setResultados] = useState<AnimeDetectado[]>([]);
  const [analizando, setAnalizando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  const limpiarNombre = (texto: string): string => {
    let nombre = texto;
    nombre = nombre.replace(/https?:\/\/[^\s]+/g, '');
    nombre = nombre.replace(/\[\d+\]/g, '');
    nombre = nombre.split('—')[0].split('–')[0];
    nombre = nombre.replace(/\(Temporada \d+\)/gi, '');
    nombre = nombre.replace(/Temporada \d+$/gi, '');
    nombre = nombre.replace(/Season \d+$/gi, '');
    nombre = nombre.replace(/\*/g, '');
    nombre = nombre.replace(/^-\s*/, '');
    nombre = nombre.replace(/^##+\s*/, '');
    return nombre.trim();
  };

  const detectarAnimesLocal = (texto: string): string[] => {
    const animes: string[] = [];
    
    const urlRegex = /https?:\/\/jkanime\.net\/([a-z0-9-]+)\/?/g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(texto)) !== null) {
      const slug = urlMatch[1];
      if (slug && slug.length > 3 && !slug.includes('directorio') && !slug.includes('buscar')) {
        const nombre = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        animes.push(nombre);
      }
    }
    
    if (animes.length === 0) {
      const lineas = texto.split('\n');
      for (const linea of lineas) {
        const limpia = limpiarNombre(linea);
        if (limpia.length > 3 && !limpia.includes('http') && !limpia.includes('---')) {
          animes.push(limpia);
        }
      }
    }
    
    return [...new Set(animes)].filter(n => n.length > 3);
  };

  const analizarPeticion = async () => {
    setAnalizando(true);
    setMensaje('');
    
    const nombres = detectarAnimesLocal(texto);
    
    if (nombres.length === 0) {
      setMensaje('⚠️ No se detectaron animes.');
      setAnalizando(false);
      return;
    }

    const resultados: AnimeDetectado[] = [];

    for (const nombre of nombres) {
      const { data } = await supabase
        .from('animes')
        .select('*')
        .ilike('titulo', `%${nombre.slice(0, 30)}%`)
        .limit(1);

      if (data && data.length > 0) {
        const anime = data[0];
        const temps = await supabase.from('temporadas').select('id').eq('anime_id', anime.id);
        let totalEps = 0;
        for (const t of temps.data || []) {
          const eps = await supabase.from('episodios').select('id').eq('temporada_id', t.id);
          totalEps += (eps.data || []).length;
        }

        resultados.push({
          nombre,
          enBD: true,
          animeId: anime.id,
          encontrado: {
            id: anime.id,
            titulo: anime.titulo,
            portada_url: anime.portada_url || '',
            episodios: totalEps,
          },
        });
      } else {
        resultados.push({ nombre, enBD: false });
      }
    }

    setResultados(resultados);
    setAnalizando(false);
  };

  const agregarAnime = async (nombre: string) => {
    setMensaje(`🔄 Sincronizando "${nombre}"...`);
    
    try {
      const slug = nombre.toLowerCase().replace(/\s+/g, '-');
      const url = `https://jkanime.net/${slug}/`;
      
      const response = await fetch(`/api/sync-anime?nombre=${encodeURIComponent(url)}`);
      const data = await response.json();
      
      if (data.success) {
        setMensaje(`✅ "${nombre}" sincronizado! Episodios: ${data.episodios || 0}`);
        analizarPeticion();
      } else {
        setMensaje(`❌ Error: ${data.error || 'Desconocido'}`);
      }
    } catch (err) {
      setMensaje('❌ Error de conexión con el bot');
    }
  };

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-black text-white mb-2">
          🤖 Peticiones al <span className="text-blue-400">Bot</span>
        </h1>
        <p className="text-xs text-zinc-500 mb-6">
          Pega URLs de JK Anime o nombres de anime.
        </p>

        <div className="mb-6">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
            placeholder={'Ejemplos:\n\nhttps://jkanime.net/suzume-no-tojimari/\n\nMushoku Tensei\nRe:Zero'}
          />
          <button
            onClick={analizarPeticion}
            disabled={analizando || !texto.trim()}
            className="mt-3 w-full rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-sm font-bold text-white shadow-lg hover:shadow-purple-600/30 transition-all active:scale-95 disabled:opacity-50"
          >
            {analizando ? '🔍 Analizando...' : '🔍 Detectar Animes'}
          </button>
        </div>

        {mensaje && (
          <div className={`mb-4 rounded-lg p-3 text-xs ${
            mensaje.startsWith('✅') ? 'bg-green-950/50 text-green-300' :
            mensaje.startsWith('❌') ? 'bg-red-950/50 text-red-300' :
            'bg-yellow-950/50 text-yellow-300'
          }`}>
            {mensaje}
          </div>
        )}

        {resultados.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">
              📊 Resultados ({resultados.length})
            </h2>
            
            {resultados.map((resultado, i) => (
              <div
                key={i}
                className={`rounded-xl border p-4 flex items-center justify-between ${
                  resultado.enBD
                    ? 'border-green-500/30 bg-green-950/20'
                    : 'border-red-500/30 bg-red-950/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {resultado.enBD && resultado.encontrado?.portada_url ? (
                    <img
                      src={resultado.encontrado.portada_url}
                      alt={resultado.nombre}
                      className="h-14 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-10 rounded bg-zinc-800 flex items-center justify-center text-lg">
                      {resultado.enBD ? '✅' : '❌'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">{resultado.nombre}</h3>
                    {resultado.enBD && resultado.encontrado ? (
                      <p className="text-xs text-green-400">
                        ✓ Disponible · {resultado.encontrado.episodios} eps
                      </p>
                    ) : (
                      <p className="text-xs text-red-400">✗ No está en la BD</p>
                    )}
                  </div>
                </div>

                {resultado.enBD && resultado.encontrado ? (
                  <Link
                    href={`/anime/${resultado.encontrado.id}`}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-500"
                  >
                    Ver Anime
                  </Link>
                ) : (
                  <button
                    onClick={() => agregarAnime(resultado.nombre)}
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-500"
                  >
                    + Agregar
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
