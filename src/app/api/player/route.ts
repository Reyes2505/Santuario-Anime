import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
  }

  try {
    // Obtener la página del episodio
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'Error al obtener la página' }, { status: 500 });
    }

    const html = await response.text();

    // Extraer la URL del reproductor (jkplayer/um?e=...)
    const jkplayerMatch = html.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
    
    if (jkplayerMatch) {
      const jkplayerUrl = jkplayerMatch[0];
      
      // Obtener el HTML del reproductor
      const playerResponse = await fetch(jkplayerUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (playerResponse.ok) {
        const playerHtml = await playerResponse.text();
        
        // Devolver solo el HTML del reproductor
        return new NextResponse(playerHtml, {
          headers: {
            'Content-Type': 'text/html',
            'Access-Control-Allow-Origin': '*',
            'X-Frame-Options': 'ALLOWALL',
            'Content-Security-Policy': "frame-ancestors 'self' *",
          },
        });
      }
    }

    // Fallback: devolver la página completa
    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
