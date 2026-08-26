// src/lib/inventory.ts - Inventario con AniList via proxy
import { supabase } from './supabase';

export type EstadoAnime = 'en_emision' | 'finalizado' | 'desconocido';

export interface InventarioAnime {
  id: string;
  titulo: string;
  estado: EstadoAnime;
  totalEpisodios: number;
  episodiosEmitidos: number;
  popularidad: number;
  score: number;
  portada: string;
  formato: string;
}

const ANILIST_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { romaji english }
    status
    episodes
    nextAiringEpisode { episode }
    popularity
    averageScore
    coverImage { large }
    format
    seasonYear
  }
}
`;

// Buscar anime en AniList usando el proxy
async function buscarEnAniList(titulo: string): Promise<any | null> {
  try {
    const response = await fetch('/api/anilist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { search: titulo.slice(0, 50) }
      })
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.data?.Media || null;
  } catch {
    return null;
  }
}

// Mapear estado de AniList a nuestro sistema
function mapearEstado(status: string | null): EstadoAnime {
  switch (status) {
    case 'RELEASING':
      return 'en_emision';
    case 'FINISHED':
      return 'finalizado';
    default:
      return 'desconocido';
  }
}

export async function actualizarInventario(): Promise<InventarioAnime[]> {
  const { data: animes } = await supabase.from('animes').select('*');
  const inventario: InventarioAnime[] = [];

  for (const anime of animes || []) {
    const anilistData = await buscarEnAniList(anime.titulo);
    
    if (anilistData) {
      const estado = mapearEstado(anilistData.status);
      
      inventario.push({
        id: anime.id,
        titulo: anime.titulo,
        estado,
        totalEpisodios: anilistData.episodes || 0,
        episodiosEmitidos: anilistData.nextAiringEpisode?.episode || anilistData.episodes || 0,
        popularidad: anilistData.popularity || 0,
        score: anilistData.averageScore || 0,
        portada: anilistData.coverImage?.large || anime.portada_url || '',
        formato: anilistData.format || 'TV',
      });
    } else {
      inventario.push({
        id: anime.id,
        titulo: anime.titulo,
        estado: 'desconocido',
        totalEpisodios: 0,
        episodiosEmitidos: 0,
        popularidad: 0,
        score: 0,
        portada: anime.portada_url || '',
        formato: 'TV',
      });
    }

    // Pausa para respetar rate limit
    await new Promise(resolve => setTimeout(resolve, 1500));
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('santuario_inventario', JSON.stringify(inventario));
    localStorage.setItem('santuario_inventario_time', String(Date.now()));
  }

  return inventario;
}

export async function getInventario(): Promise<InventarioAnime[]> {
  if (typeof window === 'undefined') return [];
  
  const cached = localStorage.getItem('santuario_inventario');
  if (cached) {
    const data = JSON.parse(cached);
    const cacheTime = localStorage.getItem('santuario_inventario_time');
    if (cacheTime && Date.now() - parseInt(cacheTime) < 3600000) {
      return data;
    }
  }
  
  return await actualizarInventario();
}

export function filterByEstado(inventario: InventarioAnime[], estado: EstadoAnime): InventarioAnime[] {
  return inventario.filter(a => a.estado === estado);
}

export function getEstadisticasInventario(inventario: InventarioAnime[]) {
  const total = inventario.length || 1;
  return {
    total: inventario.length,
    enEmision: inventario.filter(a => a.estado === 'en_emision').length,
    finalizados: inventario.filter(a => a.estado === 'finalizado').length,
    desconocidos: inventario.filter(a => a.estado === 'desconocido').length,
    popularidadPromedio: inventario.reduce((acc, a) => acc + a.popularidad, 0) / total,
    scorePromedio: inventario.reduce((acc, a) => acc + a.score, 0) / total,
  };
}
