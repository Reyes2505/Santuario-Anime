import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const animeTitulo = request.nextUrl.searchParams.get('titulo');
  
  if (!animeTitulo) {
    return NextResponse.json({ error: 'Se requiere título' }, { status: 400 });
  }

  try {
    // Buscar en AniList por título
    const searchQuery = `
      query ($search: String) {
        Media(search: $search, type: ANIME) {
          id
          title {
            romaji
            english
          }
          streamingEpisodes {
            title
            thumbnail
            url
          }
        }
      }
    `;

    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: searchQuery,
        variables: { search: animeTitulo }
      }),
    });

    const data = await response.json();

    if (!data.data?.Media?.streamingEpisodes) {
      return NextResponse.json({ episodes: [] });
    }

    const episodes = data.data.Media.streamingEpisodes.map((ep: any, index: number) => ({
      numero: index + 1,
      titulo: ep.title || `Episodio ${index + 1}`,
      thumbnail: ep.thumbnail || null,
      url: ep.url || null,
    }));

    return NextResponse.json({ episodes });
  } catch (error) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
