// src/lib/tracking.ts
import { Anime, Episodio } from '@/types/database';

const STORAGE_KEY = 'santuario_tracking_v1';

export interface TrackingData {
  animeId: string;
  estado: 'viendo' | 'visto' | 'por_ver';
  ultimoEpisodio: number;
  progreso: number; // 0-100
  actualizadoEn: number;
}

export function getTracking(): Record<string, TrackingData> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveTracking(data: Record<string, TrackingData>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function marcarComoViendo(animeId: string, ultimoEpisodio: number) {
  const tracking = getTracking();
  tracking[animeId] = {
    animeId,
    estado: 'viendo',
    ultimoEpisodio,
    progreso: 50,
    actualizadoEn: Date.now(),
  };
  saveTracking(tracking);
}

export function marcarComoVisto(animeId: string) {
  const tracking = getTracking();
  tracking[animeId] = {
    animeId,
    estado: 'visto',
    ultimoEpisodio: 999,
    progreso: 100,
    actualizadoEn: Date.now(),
  };
  saveTracking(tracking);
}

export function marcarPorVer(animeId: string) {
  const tracking = getTracking();
  tracking[animeId] = {
    animeId,
    estado: 'por_ver',
    ultimoEpisodio: 0,
    progreso: 0,
    actualizadoEn: Date.now(),
  };
  saveTracking(tracking);
}

export function guardarProgreso(animeId: string, episodioNum: number, timestamp: number, duracion: number) {
  const tracking = getTracking();
  const progreso = duracion > 0 ? Math.floor((timestamp / duracion) * 100) : 0;
  
  tracking[animeId] = {
    animeId,
    estado: 'viendo',
    ultimoEpisodio: episodioNum,
    progreso,
    actualizadoEn: Date.now(),
  };
  saveTracking(tracking);
}

export function getAnimesViendo(): TrackingData[] {
  return Object.values(getTracking()).filter(t => t.estado === 'viendo');
}

export function getAnimesVistos(): TrackingData[] {
  return Object.values(getTracking()).filter(t => t.estado === 'visto');
}

export function getAnimesPorVer(): TrackingData[] {
  return Object.values(getTracking()).filter(t => t.estado === 'por_ver');
}
