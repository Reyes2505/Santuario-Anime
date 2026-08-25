'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AnimeDetectado {
  nombre: string;
  nombreLimpio: string;
  slug: string;
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

  // Limpiar nombre de anime
  const limpiarNombre = (texto: string): string => {
    let nombre = texto;
    
    // Eliminar URLs
    nombre = nombre.replace(/https?:\/\/[^\s]+/g, '');
    
    // Eliminar referencias [1], [2], etc.
    nombre = nombre.replace(/\[\d+\]/g, '');
    
    // Eliminar texto después de "—" o "-"
    nombre = nombre.split('—')[0].split('–')[0];
    
    // Eliminar paréntesis con temporada
    nombre = nombre.replace(/\(Temporada \d+\)/gi, '');
    
    // Eliminar "Temporada X" al final
    nombre = nombre.replace(/Temporada \d+$/gi, '');
    nombre = nombre.replace(/Season \d+$/gi, '');
    
    // Eliminar asteriscos
    nombre = nombre.replace(/\*/g, '');
    
    // Eliminar guiones y espacios extra
    nombre = nombre.replace(/^-\s*/, '');
    nombre = nombre.trim();
    
    return nombre;
  };

  // Detectar animes del texto
  const detectarAnimes = (texto: string): string[] => {
    const lineas = texto.split('\n');
    const animes: string[] = [];
    
    for (const linea of lineas) {
      // Buscar patrones de nombres de anime
      // 1. [Nombre](url)
      let match = linea.match(/\[([^\]]+)\]/);
      // 2. * Nombre
      if (!match) match = linea.match(/^\*\s*(.+)$/);
      // 3. - Nombre
      if (!match) match = linea.match(/^-\s*(.+)$/);
      // 4. Nombre — descripción
      if (!match) match = linea.match(/^(.+?)\s*[—–]/);
      
      if (match) {
        const nombre = limpiarNombre(match[1]);
        
        // Filtrar falsos positivos
        if (
          nombre.length > 3 &&
          !nombre.includes('http') &&
          !nombre.includes('jkanime') &&
          !nombre.includes('---') &&
          !nombre.includes('A día de hoy') &&
          !nombre.includes('El catálogo') &&
          !nombre.includes('Continuaciones') &&
          !nombre.includes('Nuevas') &&
          !nombre.includes('Infaltable') &&
          !nombre.includes('Transmisión') &&
          !nombre.includes('¿Te interesa') &&
          !nombre.startsWith('[')
        ) {
          animes.push(nombre);
        }
      }
    }
    
    // Eliminar duplicados
    return [...new Set(animes)];
  };

  // Buscar en JK Anime
  const buscarEnJK = async (nombre: string): Promise<string | null> => {
    try {
      const slug = nombre.toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '-');
      
      const response = await fetch(
        `/api/buscar-jk?nombre=${encodeURIComponent(nombre)}`
      );
      const data = await response.json();
      
      if (data.slug) return data.slug;
      return slug;
    } catch {
      return nombre.toLowerCase().replace(/\s+/g, '-');
    }
  };

  const analizarPeticion = async () => {
    setAnalizando(true);
    setMensaje('');
    
    const nombres = detectarAnimes(texto);
    
    if (nombres.length === 0) {
      setMensaje('⚠️ No se detectaron nombres de anime en el texto.');
      setAnalizando(false);
      return;
    }

    const resultados: AnimeDetectado[] = [];

    for (const nombre of nombres) {
      // Buscar en Supabase con el nombre limpio
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
          nombre: nombre,
          nombreLimpio: nombre,
          slug: '',
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
        resultados.push({
          nombre: nombre,
          nombreLimpio: nombre,
          slug: '',
          enBD: false,
        });
      }
    }

    setResultados(resultados);
    setAnalizando(false);
  };

  const agregarAnime = async (nombre: string) => {
    setMensaje(`🔄 Buscando "${nombre}" en JK Anime...`);
    
    try {
      const response = await fetch(
        `/api/agregar-anime?nombre=${encodeURIComponent(nombre)}`
      );
      const data = await response.json();
      
      if (data.success) {
        setMensaje(`✅ "${nombre}" agregado correctamente!`);
        analizarPeticion();
      } else {
        setMensaje(`❌ No se pudo agregar: ${data.error}`);
      }
    } catch (err) {
      setMensaje(`❌ Error: ${err}`);
    }
  };

  const agregarTodos = async () => {
    const faltantes = resultados.filter(r => !r.enBD);
    setMensaje(`🔄 Agregando ${faltantes.length} animes...`);
    
    let agregados = 0;
    for (const faltante of faltantes) {
      const response = await fetch(
        `/api/agregar-anime?nombre=${encodeURIComponent(faltante.nombreLimpio)}`
      );
      const data = await response.json();
      if (data.success) agregados++;
    }
    
    setMensaje(`✅ ${agregados}/${faltantes.length} animes agregados!`);
    analizarPeticion();
  };

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-black text-white mb-2">
          🤖 Peticiones al <span className="text-blue-400">Bot</span>
        </h1>
        <p className="text-xs text-zinc-500 mb-6">
          Pega un artículo con nombres de anime. El bot detectará cuáles tienes y cuáles faltan.
        </p>

        <div className="mb-6">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Pega aquí tu texto..."
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
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                📊 Resultados ({resultados.length})
              </h2>
              {resultados.some(r => !r.enBD) && (
                <button
                  onClick={agregarTodos}
                  className="rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white hover:bg-green-500"
                >
                  + Agregar Todos los Faltantes
                </button>
              )}
            </div>
            
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
                      alt={resultado.nombreLimpio}
                      className="h-14 w-10 rounded object-cover"
                    />
                  ) : (
                    <div className="h-14 w-10 rounded bg-zinc-800 flex items-center justify-center text-lg">
                      {resultado.enBD ? '✅' : '❌'}
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-bold text-white">{resultado.nombreLimpio}</h3>
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
                    onClick={() => agregarAnime(resultado.nombreLimpio)}
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
