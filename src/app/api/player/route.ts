import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

/**
 * Player API - Arquitectura Definitiva (Nivel Senior)
 * 
 * Seguridad: SSRF prevenido, Timeout de 6s, Sanitización, No-Cache (Tokens frescos).
 * Rendimiento: HLS buffer de 60s, ABR automático, recuperación de red.
 * Scraping: Parseo de DOM seguro con Cheerio (sin depender puramente de Regex).
 */

const ALLOWED_HOSTNAMES = ['jkanime.net'];
const FETCH_TIMEOUT_MS = 6000;
const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function validateTargetUrl(rawUrl: string | null): URL | null {
  if (!rawUrl) return null;
  try {
    const parsed = new URL(rawUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (!ALLOWED_HOSTNAMES.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function sanitizeForScript(input: string): string {
  return input.replace(/["'\\<\/>]/g, '');
}

async function extractM3u8Stream(targetUrl: string): Promise<string | null> {
  // 1. Obtener página principal del episodio
  const pageRes = await fetchWithTimeout(targetUrl);
  if (!pageRes.ok) return null;

  const html = await pageRes.text();
  const $page = cheerio.load(html);

  // 2. Extraer URL del reproductor UM buscando específicamente el iframe
  let umUrl = $page('iframe[src*="jkplayer/um"]').attr('src');

  // Fallback seguro en caso de que lo inyecten vía script en lugar de iframe directo
  if (!umUrl) {
    const fallbackMatch = html.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
    if (fallbackMatch) umUrl = fallbackMatch[0];
  }

  if (!umUrl) return null;

  // Normalizar URLs relativas (por si el iframe usa src="//jkanime.net/...")
  if (umUrl.startsWith('//')) umUrl = `https:${umUrl}`;
  else if (umUrl.startsWith('/')) umUrl = `https://jkanime.net${umUrl}`;

  // 3. Obtener el HTML interno del reproductor
  const umRes = await fetchWithTimeout(umUrl);
  if (!umRes.ok) return null;

  const umHtml = await umRes.text();
  const $um = cheerio.load(umHtml);

  // 4. Buscar el .m3u8 de forma estructurada
  let m3u8Url: string | undefined;

  // A. Intentar buscar un tag <source> estándar
  m3u8Url = $um('source[src$=".m3u8"]').attr('src');

  // B. Si está oculto en un script de configuración del reproductor (muy común)
  if (!m3u8Url) {
    $um('script').each((_, el) => {
      const scriptContent = $um(el).html();
      // Solo aplicamos Regex dentro del script que sabemos que contiene el m3u8
      if (scriptContent && scriptContent.includes('.m3u8')) {
        const match = scriptContent.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (match) m3u8Url = match[0];
      }
    });
  }

  return m3u8Url || null;
}

function buildPlayerHtml(m3u8Url: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Santuario Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.10"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #000; overflow: hidden; }
    body { display: flex; align-items: center; justify-content: center; }
    video { width: 100%; height: 100%; object-fit: contain; }
  </style>
</head>
<body>
  <video id="video" controls autoplay playsinline></video>
  <script>
    const video = document.getElementById('video');
    const hlsUrl = "${m3u8Url}";
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 60,
        maxBufferLength: 60,
        maxMaxBufferLength: 120,
        maxBufferSize: 60 * 1000 * 1000,
        fragLoadingTimeOut: 20000,
        manifestLoadingTimeOut: 10000,
        levelLoadingTimeOut: 10000,
        appendErrorMaxRetry: 5,
        startLevel: -1,
        capLevelToPlayerSize: true,
        startFragPrefetch: true,
      });
      
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => console.log("Autoplay bloqueado"));
      });
      
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setTimeout(() => hls.startLoad(), 2000);
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });
      
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => video.play());
    }
  </script>
</body>
</html>`;
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');
  const validUrl = validateTargetUrl(rawUrl);

  if (!validUrl) {
    return NextResponse.json(
      { error: 'URL no proporcionada o dominio no autorizado.' },
      { status: 400 }
    );
  }

  try {
    const m3u8Url = await extractM3u8Stream(validUrl.toString());

    if (!m3u8Url) {
      return NextResponse.json(
        { error: 'No se pudo obtener la fuente del reproductor.' },
        { status: 404 }
      );
    }

    const safeM3u8Url = sanitizeForScript(m3u8Url);
    const playerHtml = buildPlayerHtml(safeM3u8Url);

    return new NextResponse(playerHtml, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('[Player Error]:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar la solicitud.' },
      { status: 500 }
    );
  }
}
