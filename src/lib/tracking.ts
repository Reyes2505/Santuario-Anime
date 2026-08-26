// src/lib/tracking.ts - Versión segura con separación por usuario
import { Anime, Episodio } from '@/types/database';
import { supabase } from './supabase';

const STORAGE_KEY = 'santuario_tracking_v2';

export interface TrackingData {
  animeId: string;
  estado: 'viendo' | 'visto' | 'por_ver';
  ultimoEpisodio: number;
  progreso: number;
  actualizadoEn: number;
  userId?: string;
}

// Obtener el usuario actual
async function getUserId(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || 'guest';
}

// Obtener la clave de almacenamiento específica del usuario
function getStorageKey(userId: string): string {
  return `${STORAGE_KEY}_${userId}`;
}

export async function getTracking(): Promise<Record<string, TrackingData>> {
  if (typeof window === 'undefined') return {};
  
  const userId = await getUserId();
  const key = getStorageKey(userId);
  
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function saveTracking(data: Record<string, TrackingData>) {
  if (typeof window === 'undefined') return;
  
  const userId = await getUserId();
  const key = getStorageKey(userId);
  
  localStorage.setItem(key, JSON.stringify(data));
}

export async function marcarComoViendo(animeId: string, ultimoEpisodio: number) {
  const tracking = await getTracking();
  const userId = await getUserId();
  
  tracking[animeId] = {
    animeId,
    estado: 'viendo',
    ultimoEpisodio,
    progreso: 50,
    actualizadoEn: Date.now(),
    userId,
  };
  await saveTracking(tracking);
}

export async function marcarComoVisto(animeId: string) {
  const tracking = await getTracking();
  const userId = await getUserId();
  
  tracking[animeId] = {
    animeId,
    estado: 'visto',
    ultimoEpisodio: 999,
    progreso: 100,
    actualizadoEn: Date.now(),
    userId,
  };
  await saveTracking(tracking);
}

export async function marcarPorVer(animeId: string) {
  const tracking = await getTracking();
  const userId = await getUserId();
  
  tracking[animeId] = {
    animeId,
    estado: 'por_ver',
    ultimoEpisodio: 0,
    progreso: 0,
    actualizadoEn: Date.now(),
    userId,
  };
  await saveTracking(tracking);
}

export async function guardarProgreso(animeId: string, episodioNum: number, timestamp: number, duracion: number) {
  const tracking = await getTracking();
  const userId = await getUserId();
  const progreso = duracion > 0 ? Math.floor((timestamp / duracion) * 100) : 0;
  
  tracking[animeId] = {
    animeId,
    estado: 'viendo',
    ultimoEpisodio: episodioNum,
    progreso,
    actualizadoEn: Date.now(),
    userId,
  };
  await saveTracking(tracking);
}

export async function getAnimesViendo(): Promise<TrackingData[]> {
  const tracking = await getTracking();
  return Object.values(tracking).filter(t => t.estado === 'viendo');
}

export async function getAnimesVistos(): Promise<TrackingData[]> {
  const tracking = await getTracking();
  return Object.values(tracking).filter(t => t.estado === 'visto');
}

export async function getAnimesPorVer(): Promise<TrackingData[]> {
  const tracking = await getTracking();
  return Object.values(tracking).filter(t => t.estado === 'por_ver');
}
