import { NextRequest, NextResponse } from 'next/server';

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

async function fetchWithTimeout(url: string, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': DEFAULT_USER_AGENT },
    });
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function GET(request: NextRequest) {
  const pageUrl = request.nextUrl.searchParams.get('url');

  if (!pageUrl || !pageUrl.includes('jkanime.net')) {
    return NextResponse.json({ error: 'URL inválida' }, { status: 400 });
  }

  try {
    // 1. Obtener la página del episodio
    const pageRes = await fetchWithTimeout(pageUrl);
    if (!pageRes.ok) {
      return NextResponse.json({ error: 'No se pudo obtener la página' }, { status: 502 });
    }

    const html = await pageRes.text();

    // 2. Buscar el iframe del reproductor
    const iframeRegex = /src="(https:\/\/jkanime\.net\/jkplayer\/um\?e=[^"]+)"/;
    const iframeMatch = html.match(iframeRegex);

    if (!iframeMatch) {
      return NextResponse.json({ error: 'No se encontró el reproductor' }, { status: 404 });
    }

    const iframeUrl = iframeMatch[1];

    // 3. Obtener el contenido del iframe
    const iframeRes = await fetchWithTimeout(iframeUrl, 10000);
    if (!iframeRes.ok) {
      return NextResponse.json({ error: 'No se pudo acceder al reproductor' }, { status: 502 });
    }

    const iframeHtml = await iframeRes.text();

    // 4. Extraer la URL M3U8
    const m3u8Regex = /(https?:\/\/[^\s"']+\.m3u8[^\s"']*)/;
    const m3u8Match = iframeHtml.match(m3u8Regex);

    if (!m3u8Match) {
      return NextResponse.json({ error: 'No se encontró el stream M3U8' }, { status: 404 });
    }

    const m3u8Url = m3u8Match[1];

    // 5. Devolver la URL como JSON
    return NextResponse.json({
      success: true,
      streamUrl: m3u8Url,
      source: 'jkanime',
    });

  } catch (error) {
    console.error('[Stream Error]:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
