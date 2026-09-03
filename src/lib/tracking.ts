// src/lib/tracking.ts
import { Anime, Episodio } from '@/types/database';

const STORAGE_KEY = 'santuario_tracking_v1';
const WATCH_TIME_KEY = 'santuario_anime_watch_time';
const WATCHED_EPISODES_KEY = 'santuario_anime_watched_episodes';

export interface TrackingData {
  animeId: string;
  estado: 'viendo' | 'visto' | 'por_ver';
  ultimoEpisodio: number;
  progreso: number; // 0-100
  actualizadoEn: number;
}

// ========== FUNCIONES DE TRACKING DE ANIMES ==========

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

// ========== FUNCIONES DE TIEMPO DE VISUALIZACIÓN ==========

export function addWatchTime(seconds: number): void {
  if (typeof window === 'undefined') return;
  
  const currentTime = getWatchTime();
  const newTime = currentTime + seconds;
  localStorage.setItem(WATCH_TIME_KEY, String(newTime));
}

export function getWatchTime(): number {
  if (typeof window === 'undefined') return 0;
  
  const time = localStorage.getItem(WATCH_TIME_KEY);
  return time ? parseInt(time, 10) : 0;
}

// ========== FUNCIONES DE EPISODIOS VISTOS ==========

export function markEpisodeAsWatched(episodeId: string): void {
  if (typeof window === 'undefined') return;
  
  const watchedEpisodes = getWatchedEpisodes();
  if (!watchedEpisodes.includes(episodeId)) {
    watchedEpisodes.push(episodeId);
    localStorage.setItem(WATCHED_EPISODES_KEY, JSON.stringify(watchedEpisodes));
  }
}

export function getWatchedEpisodes(): string[] {
  if (typeof window === 'undefined') return [];
  
  const episodes = localStorage.getItem(WATCHED_EPISODES_KEY);
  return episodes ? JSON.parse(episodes) : [];
}

// ========== FUNCIONES DE ESTADÍSTICAS ==========

export function getTrackingStats() {
  return {
    totalSeconds: getWatchTime(),
    watchedEpisodes: getWatchedEpisodes(),
    totalEpisodiosVistos: getWatchedEpisodes().length,
  };
}

export function formatWatchTime(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours === 0 && minutes === 0) {
    return '0m';
  }
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  if (minutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${minutes}m`;
}

// ========== FUNCIÓN PARA RESET (OPCIONAL) ==========

export function resetTracking(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(WATCH_TIME_KEY);
  localStorage.removeItem(WATCHED_EPISODES_KEY);
}
