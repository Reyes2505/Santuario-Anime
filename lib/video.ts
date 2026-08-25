import { Episodio } from '@/types/database';

/**
 * Resuelve la ruta del vídeo a través de la API Route de Streaming local
 * para evitar errores 404 y permitir seeking (adelantar/atrasar) fluido.
 */
export function resolveVideoUrl(episodio: Episodio): string {
  if (!episodio) return '';

  const rawUrl = (episodio.url_stream || '').trim();

  // URLs remotas (HTTP / HTTPS / Blob)
  if (
    rawUrl.startsWith('http://') ||
    rawUrl.startsWith('https://') ||
    rawUrl.startsWith('blob:')
  ) {
    return rawUrl;
  }

  // Si ya apunta a la API Route de video
  if (rawUrl.startsWith('/api/video')) {
    return rawUrl;
  }

  // Si apunta directamente a un asset público estático en /videos/
  if (rawUrl.startsWith('/videos/') && (rawUrl.endsWith('.mp4') || rawUrl.endsWith('.mkv') || rawUrl.endsWith('.webm'))) {
    return rawUrl;
  }

  // Si especifica un archivo mp4 directo por nombre, conviértelo a la API de video.
  if (rawUrl.endsWith('.mp4') || rawUrl.endsWith('.mkv') || rawUrl.endsWith('.webm')) {
    const cleanPath = rawUrl.replace(/^\/videos\//, '').replace(/^\//, '');
    return `/api/video?path=${encodeURIComponent(cleanPath)}`;
  }

  // Convención por número de episodio: mushoku/episodio_[numero].mp4
  const epNum = String(episodio.numero).padStart(2, '0');
  return `/api/video?path=${encodeURIComponent(`mushoku/episodio_${epNum}.mp4`)}`;
}

/**
 * Genera candidatos de rutas de vídeo local para fallbacks.
 */
export function getLocalVideoCandidates(episodio: Episodio): string[] {
  const primary = resolveVideoUrl(episodio);
  const candidates: string[] = [primary];

  const num = episodio.numero;
  const numPadded = String(num).padStart(2, '0');

  const alt1 = `/api/video?path=${encodeURIComponent(`mushoku/episodio_${numPadded}.mp4`)}`;
  const alt2 = `/api/video?path=${encodeURIComponent(`mushoku/episodio_${num}.mp4`)}`;
  const alt3 = `/api/video?path=${encodeURIComponent(`mushoku/${numPadded}.mp4`)}`;
  const alt4 = `/api/video?path=${encodeURIComponent(`mushoku/${num}.mp4`)}`;
  const alt5 = `/videos/mushoku/episodio_${numPadded}.mp4`;
  const alt6 = `/videos/mushoku/${numPadded}.mp4`;
  const alt7 = `/videos/mushoku/${num}.mp4`;
  const idxDbAlt = `indexeddb://mushoku/episodio_${numPadded}.mp4`;

  [alt1, alt2, alt3, alt4, alt5, alt6, alt7].forEach((alt) => {
    if (!candidates.includes(alt)) {
      candidates.push(alt);
    }
  });

  if (!candidates.includes(idxDbAlt)) candidates.push(idxDbAlt);

  return candidates;
}

/**
 * Formatea segundos a tiempo HH:MM:SS o MM:SS
 */
export function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
