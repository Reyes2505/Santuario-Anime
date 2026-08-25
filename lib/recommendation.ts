// src/lib/recommendation.ts
// Algoritmo de recomendación ultra ligero - sin dependencias

import { Anime } from '@/types/database';

const PALABRAS_CLAVE = [
  'isekai',
  'fantasía',
  'fantasia',
  'acción',
  'accion',
  'romance',
  'aventura',
  'drama',
  'magia',
  'guerra',
  'demonios',
  'escolar',
  'colegial',
  'mecha',
  'sobrenatural',
  'misterio',
  'comedia',
  'psicológico',
  'psicologico',
  'thriller',
  'seinen',
  'shounen',
  'shoujo',
  'ecchi',
  'harem',
  'vampiros',
  'samurai',
  'deportes',
  'música',
  'musica',
  'espacial',
  'space',
  'ciencia ficción',
  'sci-fi',
];

export function extraerPalabrasClave(texto: string): string[] {
  const textoLower = texto.toLowerCase();
  return PALABRAS_CLAVE.filter((palabra) => textoLower.includes(palabra));
}

export function crearVectorGustos(historial: Anime[]): Record<string, number> {
  const pesos: Record<string, number> = {};

  for (const anime of historial) {
    const palabras = extraerPalabrasClave(anime.sinopsis || '');
    const generos = extraerPalabrasClave(anime.titulo || '');

    for (const palabra of [...palabras, ...generos]) {
      pesos[palabra] = (pesos[palabra] || 0) + 1;
    }
  }

  return pesos;
}

export function recomendarAnimes(
  historial: Anime[],
  todosAnimes: Anime[],
  maxResultados: number = 10
): Anime[] {
  if (historial.length === 0) {
    // Si no hay historial, devolver animes con más sinopsis
    return todosAnimes
      .filter((a) => a.sinopsis && a.sinopsis.length > 50)
      .slice(0, maxResultados);
  }

  // 1. Crear vector de gustos del usuario
  const gustosUsuario = crearVectorGustos(historial);

  // 2. IDs ya vistos
  const idsVistos = new Set(historial.map((h) => h.id));

  // 3. Calcular score para cada anime no visto
  const scores: { anime: Anime; score: number }[] = [];

  for (const anime of todosAnimes) {
    if (idsVistos.has(anime.id)) continue;

    let score = 0;
    const textoCompleto = `${anime.titulo} ${anime.sinopsis || ''}`.toLowerCase();

    for (const [palabra, peso] of Object.entries(gustosUsuario)) {
      if (textoCompleto.includes(palabra)) {
        score += peso * 2;
      }
    }

    // Bonus por sinopsis más detallada
    if (anime.sinopsis && anime.sinopsis.length > 100) {
      score += 1;
    }

    scores.push({ anime, score });
  }

  // 4. Ordenar por score
  scores.sort((a, b) => b.score - a.score);

  // 5. Devolver top recomendaciones
  return scores.slice(0, maxResultados).map((s) => s.anime);
}

export function encontrarSimilares(
  animeActual: Anime,
  todosAnimes: Anime[],
  maxResultados: number = 5
): Anime[] {
  const palabrasAnime = new Set([
    ...extraerPalabrasClave(animeActual.sinopsis || ''),
    ...extraerPalabrasClave(animeActual.titulo || ''),
  ]);

  const scores: { anime: Anime; score: number }[] = [];

  for (const anime of todosAnimes) {
    if (anime.id === animeActual.id) continue;

    let score = 0;
    const texto = `${anime.titulo} ${anime.sinopsis || ''}`.toLowerCase();

    for (const palabra of palabrasAnime) {
      if (texto.includes(palabra)) {
        score += 3;
      }
    }

    scores.push({ anime, score });
  }

  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, maxResultados).map((s) => s.anime);
}
