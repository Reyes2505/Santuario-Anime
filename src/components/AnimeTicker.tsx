'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

interface AnimeItem {
  id: string;
  titulo: string;
  score?: number;
  popularidad?: number;
}

export default function AnimeTicker() {
  const [items, setItems] = useState<AnimeItem[]>([]);

  useEffect(() => {
    async function fetchTrending() {
      // Obtenemos animes de Supabase ordenados por popularidad o score para el teletipo
      const { data } = await supabase
        .from('animes')
        .select('id, titulo, score, popularidad')
        .limit(10);
      
      if (data && data.length > 0) {
        setItems(data);
      }
    }
    fetchTrending();
  }, []);

  if (items.length === 0) return <div className="flex-1" />;

  return (
    <div className="flex-1 overflow-hidden relative max-w-2xl mx-auto px-4 hidden md:flex items-center">
      {/* Efectos de desvanecimiento en los bordes para mantener el minimalismo */}
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-zinc-950 to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-zinc-950 to-transparent z-10 pointer-events-none" />

      <div className="flex gap-6 animate-marquee whitespace-nowrap text-xs text-zinc-400">
        {items.concat(items).map((anime, idx) => (
          <Link 
            key={`${anime.id}-${idx}`} 
            href={`/anime/${anime.id}`}
            className="flex items-center gap-2 hover:text-white transition-colors bg-zinc-900/60 px-3 py-1 rounded-full border border-zinc-800/80"
          >
            <span className="text-emerald-400 font-mono font-bold">🔥 LIVE</span>
            <span className="font-medium text-zinc-300">{anime.titulo}</span>
            <span className="text-zinc-500 font-mono">SC: {anime.score || 'N/A'}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
