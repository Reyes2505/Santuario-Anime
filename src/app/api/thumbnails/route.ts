import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const animeId = request.nextUrl.searchParams.get('id');
  
  if (!animeId) {
    return NextResponse.json({ error: 'ID requerido' }, { status: 400 });
  }

  try {
    const response = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/episodes`);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Error de Jikan API' }, { status: response.status });
    }

    const data = await response.json();
    
    const episodes = data.data.map((ep: any) => ({
      numero: ep.mal_id,
      titulo: ep.title || `Episodio ${ep.mal_id}`,
      thumbnail: ep.images?.jpg?.image_url || null,
    }));

    return NextResponse.json({ episodes });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
