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
  const [modoIA, setModoIA] = useState(true);

  // Limpiar nombre de anime
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
    nombre = nombre.trim();
    return nombre;
  };

  // Detector local (fallback)
  const detectarAnimesLocal = (texto: string): string[] => {
    const animes: string[] = [];
    
    // Buscar URLs de JK Anime
    const urlRegex = /https?:\/\/jkanime\.net\/([a-z0-9-]+)\//g;
    let urlMatch;
    while ((urlMatch = urlRegex.exec(texto)) !== null) {
      const slug = urlMatch[1];
      if (slug && slug.length > 3) {
        const nombre = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        animes.push(nombre);
      }
    }
    
    // Buscar por líneas
    const lineas = texto.split('\n');
    for (const linea of lineas) {
      const limpia = limpiarNombre(linea);
      
      if (
        limpia.length > 3 &&
        !limpia.includes('http') &&
        !limpia.includes('jkanime') &&
        !limpia.includes('---') &&
        !limpia.includes('A día') &&
        !limpia.includes('catálogo') &&
        !limpia.includes('Continuaciones') &&
        !limpia.includes('Nuevas') &&
        !limpia.includes('Infaltable') &&
        !limpia.includes('Transmisión') &&
        !limpia.includes('¿Te interesa') &&
        !limpia.includes('Detectar') &&
        !limpia.includes('Peticiones') &&
        !limpia.includes('🤖') &&
        !limpia.includes('🔍') &&
        !limpia.startsWith('!') &&
        !limpia.startsWith('=')
      ) {
        animes.push(limpia);
      }
    }
    
    return [...new Set(animes)].filter(n => n.length > 3);
  };

  // Detectar con IA (Hugging Face - gratis)
  const detectarAnimesConIA = async (texto: string): Promise<string[]> => {
    try {
      const prompt = `Extract ONLY anime titles from this text. Return each title on a new line, nothing else:\n\n${texto}`;
      
      const response = await fetch(
        'https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.3',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: prompt,
            parameters: {
              max_new_tokens: 200,
              temperature: 0.1,
              return_full_text: false,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const generado = data[0]?.generated_text || '';
        
        // Limpiar la respuesta de la IA
        const lineas = generado
          .split('\n')
          .map(l => l.trim())
          .filter(l => 
            l.length > 3 && 
            !l.startsWith('Extract') && 
            !l.startsWith('Return') && 
            !l.includes(':') &&
            !l.startsWith('```')
          );
        
        const nombres = lineas.map(l => limpiarNombre(l));
        const resultados = [...new Set(nombres)].filter(n => n.length > 3);
        
        if (resultados.length > 0) return resultados;
      }
    } catch (err) {
      console.error('IA falló:', err);
    }
    
    // Fallback al detector local
    return detectarAnimesLocal(texto);
  };

  const analizarPeticion = async () => {
    setAnalizando(true);
    setMensaje('');
    
    const nombres = modoIA 
      ? await detectarAnimesConIA(texto)
      : detectarAnimesLocal(texto);
    
    if (nombres.length === 0) {
      setMensaje('⚠️ No se detectaron nombres de anime. Prueba con texto más claro.');
      setAnalizando(false);
      return;
    }

    const resultados: AnimeDetectado[] = [];

    for (const nombre of nombres) {
      // Buscar en Supabase
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
    setMensaje(`🔄 Buscando "${nombre}" en JK Anime...`);
    
    try {
      const response = await fetch(`/api/agregar-anime?nombre=${encodeURIComponent(nombre)}`);
      const data = await response.json();
      
      if (data.success) {
        setMensaje(`✅ "${nombre}" agregado!`);
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
      try {
        const response = await fetch(`/api/agregar-anime?nombre=${encodeURIComponent(faltante.nombre)}`);
        const data = await response.json();
        if (data.success) agregados++;
      } catch (err) {
        // continuar
      }
    }
    
    setMensaje(`✅ ${agregados}/${faltantes.length} animes agregados!`);
    analizarPeticion();
  };

  return (
    <main className="min-h-screen bg-zinc-950 pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-black text-white">
            🤖 Peticiones al <span className="text-blue-400">Bot</span>
          </h1>
          <button
            onClick={() => setModoIA(!modoIA)}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${
              modoIA ? 'bg-purple-600 text-white' : 'bg-zinc-800 text-zinc-400'
            }`}
          >
            {modoIA ? '🧠 IA ON' : '📝 IA OFF'}
          </button>
        </div>
        <p className="text-xs text-zinc-500 mb-6">
          Pega un artículo con nombres de anime. El bot detectará cuáles tienes y cuáles faltan.
        </p>

        <div className="mb-6">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
            placeholder="Pega aquí tu texto o URLs de JK Anime..."
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
                  + Agregar Todos
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
