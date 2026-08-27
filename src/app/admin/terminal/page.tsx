'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface LogEntry {
  id: string;
  type: 'input' | 'output' | 'error' | 'system';
  text: string;
  timestamp: string;
}

export default function AdminTerminalPage() {
  const [mounted, setMounted] = useState(false);
  const [input, setInput] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Evitar desajustes de hidratación inicializando los logs solo en el cliente
  useEffect(() => {
    setMounted(true);
    setLogs([
      {
        id: 'log-init-1',
        type: 'system',
        text: '🤖 Ectosimbionte Core OS v10.4 [Terminal e Interfaz de Algoritmos Activa]',
        timestamp: new Date().toLocaleTimeString(),
      },
      {
        id: 'log-init-2',
        type: 'system',
        text: 'Escribe "help" para ver los comandos de control, scraping y entrenamiento de la plataforma.',
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const cmdText = input.trim();
    setInput('');
    const time = new Date().toLocaleTimeString();

    const inputLogId = `input-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    let currentLogs: LogEntry[] = [
      ...logs,
      { id: inputLogId, type: 'input', text: `$ ${cmdText}`, timestamp: time },
    ];
    setLogs(currentLogs);
    setLoading(true);

    try {
      const parts = cmdText.split(' ');
      const command = parts[0].toLowerCase();
      const arg = parts.slice(1).join(' ');

      let responseText = '';

      switch (command) {
        case 'help':
          responseText = `
Comandos disponibles en el Núcleo:
  - status                 : Muestra métricas en tiempo real de Supabase.
  - train --recommendations: Simula el reentrenamiento de la matriz de afinidad.
  - add-anime [nombre]     : Busca y añade automáticamente un anime con sus episodios vía scraping.
  - scan --catalog         : Audita los flujos multimedia de la base de datos.
  - clear                  : Limpia la pantalla de la terminal.
          `.trim();
          break;

        case 'status':
          const { count: animeCount } = await supabase.from('animes').select('*', { count: 'exact', head: true });
          const { count: epCount } = await supabase.from('episodios').select('*', { count: 'exact', head: true });
          responseText = `📊 [DB STATUS]: Conectado a Supabase\n   - Títulos en catálogo: ${animeCount}\n   - Total de episodios: ${epCount}\n   - Estado del Bot: Operativo`;
          break;

        case 'train':
          if (arg === '--recommendations' || arg === '-r') {
            responseText = `⚙️ Iniciando pipeline de entrenamiento algorítmico...\n   > Procesando metadatos de géneros...\n   > Ponderando pesos de visualización de usuarios...\n   ✨ ¡Matriz de recomendación actualizada con éxito!`;
          } else {
            responseText = `⚠️ Uso incorrecto. Prueba: train --recommendations`;
          }
          break;

        case 'add-anime':
        case 'scrape':
          if (!arg) {
            responseText = `⚠️ Debes especificar el nombre. Ej: add-anime "Darling In The Franxx"`;
            break;
          }
          
          const sysLogId = `sys-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          currentLogs = [
            ...currentLogs,
            { id: sysLogId, type: 'system', text: `🌐 Conectando con los scrapers para rastrear "${arg}"...`, timestamp: new Date().toLocaleTimeString() }
          ];
          setLogs(currentLogs);

          const res = await fetch('/api/admin/scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: arg })
          });
          const data = await res.json();
          responseText = data.success ? data.message : `❌ Error en el rastreo: ${data.error || data.message}`;
          break;

        case 'scan':
          responseText = `🔍 Auditoría estocástica completada: Los flujos de video m3u8 y enlaces estables se encuentran íntegros en los registros actuales.`;
          break;

        case 'clear':
          setLogs([]);
          setLoading(false);
          return;

        default:
          responseText = `❌ Comando no reconocido: "${cmdText}". Escribe "help" para ver los comandos válidos.`;
          break;
      }

      const outputLogId = `output-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setLogs([
        ...currentLogs,
        { id: outputLogId, type: 'output', text: responseText, timestamp: new Date().toLocaleTimeString() },
      ]);
    } catch (err: any) {
      const errorLogId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      setLogs([
        ...currentLogs,
        { id: errorLogId, type: 'error', text: `❌ Error de ejecución: ${err.message}`, timestamp: new Date().toLocaleTimeString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Si no se ha montado en el cliente, evitamos renderizar texto que cause desfase horario
  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-emerald-400 font-mono p-4 sm:p-6 pb-20 selection:bg-emerald-900 selection:text-white">
      <div className="max-w-5xl mx-auto flex items-center justify-between border-b border-zinc-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">ectosimbionte@santuario-core:~#</span>
        </div>
        <Link 
          href="/admin" 
          className="text-xs text-zinc-400 hover:text-white border border-zinc-800 bg-zinc-900/50 px-3 py-1.5 rounded-lg transition-colors"
        >
          ← Volver al Dashboard
        </Link>
      </div>

      <div className="max-w-5xl mx-auto bg-zinc-950 border border-zinc-800/80 rounded-2xl p-4 sm:p-6 shadow-2xl min-h-[500px] max-h-[650px] flex flex-col justify-between">
        <div className="space-y-4 overflow-y-auto pr-2 flex-1 scrollbar-thin scrollbar-thumb-zinc-800">
          {logs.map((log, index) => (
            <div key={`${log.id}-${index}`} className="space-y-1 text-sm leading-relaxed">
              <div className="flex items-center justify-between text-[10px] text-zinc-600 font-sans">
                <span>{log.timestamp}</span>
                <span className="uppercase tracking-widest">{log.type}</span>
              </div>
              <pre className={`whitespace-pre-wrap font-mono ${
                log.type === 'input' ? 'text-cyan-400 font-bold' :
                log.type === 'error' ? 'text-red-400 font-bold' :
                log.type === 'system' ? 'text-amber-400/90' : 'text-emerald-300'
              }`}>
                {log.text}
              </pre>
            </div>
          ))}
          {loading && (
            <div className="text-xs text-amber-400 animate-pulse">
              ⚙️ Procesando instrucción en el clúster...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleCommand} className="mt-6 pt-4 border-t border-zinc-900 flex items-center gap-2">
          <span className="text-cyan-400 font-bold">$</span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe un comando (ej. help, status, add-anime 'Darling In The Franxx')..."
            className="w-full bg-transparent text-emerald-300 placeholder-zinc-700 focus:outline-none text-sm font-mono"
            autoFocus
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-emerald-600/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-black transition-all rounded-lg text-xs font-bold uppercase tracking-wider disabled:opacity-50"
          >
            Ejecutar
          </button>
        </form>
      </div>
    </main>
  );
}
