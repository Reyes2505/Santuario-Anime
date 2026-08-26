import { NextRequest, NextResponse } from 'next/server';

/**
 * Player API - Production Ready
 * 
 * Arquitectura y Seguridad:
 * - Prevención de SSRF mediante Whitelist de dominios.
 * - Control de hilos mediante AbortController (Timeout estricto).
 * - Sanitización de inputs contra inyecciones XSS.
 * - Políticas No-Cache en CDN para asegurar la vigencia de los tokens.
 * - Optimización Single Fetch (reutilización de payload HTML).
 * 
 * Configuración HLS:
 * - Buffer de 90 segundos para mitigar latencia y microcortes.
 * - Adaptive Bitrate (ABR) inicializado en nivel 0 (estabilidad prioritaria).
 * - Recuperación automática ante fallos de red.
 * 
 * Resolución de Servidores:
 * - Extracción mediante RegExp con modificador global y dotAll (/gs).
 * - Decodificación dinámica en Base64.
 * - UI inyectada para selección manual de servidores de respaldo.
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

function decodeBase64(str: string): string {
  try {
    const padded = str.padEnd(str.length + (4 - str.length % 4) % 4, '=');
    return Buffer.from(padded, 'base64').toString('utf-8');
  } catch {
    return str;
  }
}

function sanitizeForScript(input: string): string {
  return input.replace(/["'\\<>]/g, '');
}

async function extractM3u8Stream(html: string): Promise<string | null> {
  const umMatch = html.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
  if (!umMatch) return null;

  const umRes = await fetchWithTimeout(umMatch[0]);
  if (!umRes.ok) return null;

  const umHtml = await umRes.text();
  const m3u8Match = umHtml.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
  
  return m3u8Match ? m3u8Match[0] : null;
}

function extractServidores(html: string): { nombre: string; url: string }[] {
  const servidores: { nombre: string; url: string }[] = [];
  const seen = new Set<string>();

  const regex = /{"remote":"([^"]+)".*?"server":"([^"]+)"}/gs;
  let match;

  while ((match = regex.exec(html)) !== null) {
    const urlDecodificada = decodeBase64(match[1]);
    const nombre = match[2].toLowerCase();

    if (!seen.has(urlDecodificada)) {
      seen.add(urlDecodificada);
      servidores.push({ nombre, url: urlDecodificada });
    }
  }

  return servidores;
}

function buildPlayerHtml(m3u8Url: string, servidores: { nombre: string; url: string }[]): string {
  const botones = servidores.map(s => {
    const urlEscapada = s.url.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    const nombreEscapado = s.nombre.toUpperCase();
    return `<button onclick="cargarServidor('${urlEscapada}')" class="btn-server">${nombreEscapado}</button>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Player</title>
  <script src="https://cdn.jsdelivr.net/npm/hls.js@1.4.10"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { height: 100%; background: #000; overflow: hidden; }
    body { display: flex; flex-direction: column; }
    #video { flex: 1; width: 100%; object-fit: contain; }
    .servers { padding: 6px 8px; background: #0a0a0a; display: flex; gap: 4px; overflow-x: auto; border-top: 1px solid #1a1a1a; min-height: 40px; align-items: center; }
    .btn-server { padding: 5px 10px; background: #1a1a1a; color: #ccc; border: 1px solid #333; border-radius: 3px; cursor: pointer; font-size: 10px; font-family: monospace; white-space: nowrap; transition: background 0.2s; }
    .btn-server:hover { background: #2a2a2a; color: #fff; }
  </style>
</head>
<body>
  <video id="video" controls autoplay playsinline></video>
  <div class="servers">${botones}</div>
  <script>
    const video = document.getElementById('video');
    let hls = null;
    
    function cargarHls(url) {
      if (hls) { hls.destroy(); hls = null; }
      
      if (Hls.isSupported()) {
        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 90,
          maxMaxBufferLength: 180,
          maxBufferSize: 100 * 1000 * 1000,
          fragLoadingTimeOut: 60000,
          manifestLoadingTimeOut: 20000,
          levelLoadingTimeOut: 20000,
          appendErrorMaxRetry: 10,
          startLevel: 0,
          capLevelToPlayerSize: true,
          startFragPrefetch: true,
        });
        
        hls.loadSource(url);
        hls.attachMedia(video);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
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
        video.src = url;
        video.addEventListener('loadedmetadata', () => video.play());
      }
    }
    
    function cargarServidor(url) {
      if (url.includes('/embed') || url.includes('/e/') || url.includes('mega.nz')) {
        window.open(url, '_blank');
      } else {
        cargarHls(url);
      }
    }
    
    const defaultUrl = "${m3u8Url ? m3u8Url.replace(/"/g, '\\"') : ''}";
    if (defaultUrl) {
      cargarHls(defaultUrl);
    } else {
      const servers = ${JSON.stringify(servidores)};
      if (servers.length > 0) {
        cargarServidor(servers[0].url);
      }
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
    const pageRes = await fetchWithTimeout(validUrl.toString());
    if (!pageRes.ok) {
      return NextResponse.json(
        { error: 'No se pudo obtener la página fuente.' },
        { status: 502 }
      );
    }

    const html = await pageRes.text();

    const m3u8Url = await extractM3u8Stream(html);
    const servidores = extractServidores(html);

    if (!m3u8Url && servidores.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron fuentes de reproducción.' },
        { status: 404 }
      );
    }

    const safeM3u8Url = m3u8Url ? sanitizeForScript(m3u8Url) : '';
    const playerHtml = buildPlayerHtml(safeM3u8Url, servidores);

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
