import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const animeTitulo = request.nextUrl.searchParams.get('titulo');
  const animeId = request.nextUrl.searchParams.get('id');
  
  if (!animeTitulo && !animeId) {
    return NextResponse.json({ error: 'Se requiere título o ID' }, { status: 400 });
  }

  try {
    let malId = animeId;

    // Si no tenemos ID, buscar por título
    if (!malId) {
      const searchResponse = await fetch(
        `https://api.jikan.moe/v4/anime?q=${encodeURIComponent(animeTitulo!)}&limit=1`
      );
      
      if (!searchResponse.ok) {
        return NextResponse.json({ error: 'Error buscando anime' }, { status: searchResponse.status });
      }

      const searchData = await searchResponse.json();
      
      if (!searchData.data || searchData.data.length === 0) {
        return NextResponse.json({ episodes: [] });
      }

      malId = searchData.data[0].mal_id;
    }

    // Esperar 1 segundo para respetar rate limit de Jikan (3 req/seg)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Obtener episodios
    const episodesResponse = await fetch(
      `https://api.jikan.moe/v4/anime/${malId}/episodes`
    );

    if (!episodesResponse.ok) {
      return NextResponse.json({ error: 'Error obteniendo episodios' }, { status: episodesResponse.status });
    }

    const episodesData = await episodesResponse.json();

    const episodes = episodesData.data.map((ep: any) => ({
      numero: ep.mal_id,
      titulo: ep.title || `Episodio ${ep.mal_id}`,
      thumbnail: ep.images?.jpg?.image_url || null,
    }));

    return NextResponse.json({ 
      episodes,
      animeId: malId,
      animeTitulo: searchData?.data?.[0]?.title || animeTitulo
    });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
