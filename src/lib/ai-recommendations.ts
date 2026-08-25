// src/lib/ai-recommendations.ts
// Sistema de recomendación adaptativo sin APIs externas

import { Anime, Episodio } from '@/types/database';

const STORAGE_KEY = 'santuario_user_profile_v1';

interface UserProfile {
  generosFavoritos: Record<string, number>;
  animesVistos: string[];
  episodiosVistos: string[];
  tiempoTotal: number;
  ultimaActualizacion: number;
}

// Palabras clave por género
const GENEROS_KEYWORDS: Record<string, string[]> = {
  'isekai': ['isekai', 'otro mundo', 'reencarn', 'transportado', 'fantasy world'],
  'accion': ['accion', 'batalla', 'lucha', 'guerra', 'combate', 'pelea'],
  'romance': ['romance', 'amor', 'enamor', 'pareja', 'corazon'],
  'comedia': ['comedia', 'gracioso', 'humor', 'risa', 'divertido'],
  'drama': ['drama', 'triste', 'emocional', 'lagrimas', 'sufrimiento'],
  'fantasia': ['fantasia', 'magia', 'dragones', 'hechizos', 'mundo magico'],
  'aventura': ['aventura', 'viaje', 'explorar', 'descubrir', 'mision'],
  'misterio': ['misterio', 'investigacion', 'secreto', 'enigma', 'detective'],
  'psicologico': ['psicologico', 'mente', 'trauma', 'locura', 'mental'],
  'sobrenatural': ['sobrenatural', 'fantasmas', 'demonios', 'espiritus', 'vampiros'],
};

export function inicializarPerfil(): UserProfile {
  return {
    generosFavoritos: {},
    animesVistos: [],
    episodiosVistos: [],
    tiempoTotal: 0,
    ultimaActualizacion: Date.now(),
  };
}

export function getPerfil(): UserProfile {
  if (typeof window === 'undefined') return inicializarPerfil();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : inicializarPerfil();
  } catch {
    return inicializarPerfil();
  }
}

export function savePerfil(perfil: UserProfile) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(perfil));
}

// Registrar cuando el usuario ve un episodio
export function registrarVisualizacion(anime: Anime, episodio: Episodio, duracionVista: number) {
  const perfil = getPerfil();
  
  // Actualizar géneros favoritos basado en el anime
  const texto = `${anime.titulo} ${anime.sinopsis || ''}`.toLowerCase();
  
  for (const [genero, keywords] of Object.entries(GENEROS_KEYWORDS)) {
    for (const keyword of keywords) {
      if (texto.includes(keyword)) {
        perfil.generosFavoritos[genero] = (perfil.generosFavoritos[genero] || 0) + 1;
        break;
      }
    }
  }
  
  // Registrar anime y episodio
  if (!perfil.animesVistos.includes(anime.id)) {
    perfil.animesVistos.push(anime.id);
  }
  
  const epKey = `${anime.id}_${episodio.numero}`;
  if (!perfil.episodiosVistos.includes(epKey)) {
    perfil.episodiosVistos.push(epKey);
  }
  
  // Acumular tiempo
  perfil.tiempoTotal += duracionVista;
  perfil.ultimaActualizacion = Date.now();
  
  savePerfil(perfil);
}

// Calcular afinidad de un anime con el perfil del usuario
export function calcularAfinidad(anime: Anime, perfil: UserProfile): number {
  let score = 0;
  const texto = `${anime.titulo} ${anime.sinopsis || ''}`.toLowerCase();
  
  for (const [genero, peso] of Object.entries(perfil.generosFavoritos)) {
    const keywords = GENEROS_KEYWORDS[genero] || [];
    for (const keyword of keywords) {
      if (texto.includes(keyword)) {
        score += peso * 2;
        break;
      }
    }
  }
  
  return score;
}

// Obtener recomendaciones personalizadas
export function getRecomendacionesIA(animes: Anime[], maxResultados: number = 10): Anime[] {
  const perfil = getPerfil();
  
  if (perfil.animesVistos.length === 0) {
    return animes.slice(0, maxResultados);
  }
  
  const scores = animes
    .filter(a => !perfil.animesVistos.includes(a.id))
    .map(anime => ({
      anime,
      score: calcularAfinidad(anime, perfil),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);
  
  return scores.slice(0, maxResultados).map(item => item.anime);
}

// Obtener estadísticas del usuario
export function getEstadisticasUsuario() {
  const perfil = getPerfil();
  
  return {
    animesVistos: perfil.animesVistos.length,
    episodiosVistos: perfil.episodiosVistos.length,
    tiempoTotalMinutos: Math.floor(perfil.tiempoTotal / 60),
    generosTop: Object.entries(perfil.generosFavoritos)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([genero, peso]) => ({ genero, peso })),
  };
}
