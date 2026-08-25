import { WatchProgress } from '@/types/database';

const STORAGE_KEY = 'santuario_watch_progress_v1';

export function getWatchProgressMap(): Record<string, WatchProgress> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Error leyendo progreso de almacenamiento local:', err);
    return {};
  }
}

export function getWatchProgress(episodeId: string): WatchProgress | null {
  const map = getWatchProgressMap();
  return map[episodeId] || null;
}

export function saveWatchProgress(
  episodeId: string,
  episodeNumber: number,
  currentTime: number,
  duration: number
): void {
  if (typeof window === 'undefined' || !episodeId || isNaN(currentTime)) return;

  try {
    const map = getWatchProgressMap();
    const isCompleted = duration > 0 && currentTime / duration >= 0.92;

    map[episodeId] = {
      episodeId,
      episodeNumber,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration || 0),
      completed: isCompleted,
      lastWatchedAt: Date.now(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Error guardando progreso de reproducción:', err);
  }
}

export function clearWatchHistory(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Error limpiando historial:', err);
  }
}
