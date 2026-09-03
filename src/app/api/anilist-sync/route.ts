import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const ANILIST_QUERY = `
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { romaji english }
    status
    episodes
    startDate { year month day }
    endDate { year month day }
    genres
    averageScore
    popularity
    studios { nodes { name } }
    coverImage { large }
    bannerImage
  }
}
`;

export async function GET(request: NextRequest) {
  const animeId = request.nextUrl.searchParams.get('anime_id');
  const titulo = request.nextUrl.searchParams.get('titulo');

  if (!animeId && !titulo) {
    return NextResponse.json({ error: 'Se requiere anime_id o titulo' }, { status: 400 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Obtener el anime de nuestra BD
    let animeData;
    if (animeId) {
      const { data } = await supabase.from('animes').select('titulo').eq('id', animeId).single();
      animeData = data;
    } else {
      animeData = { titulo };
    }

    if (!animeData || !animeData.titulo) {
      return NextResponse.json({ error: 'Anime no encontrado' }, { status: 404 });
    }

    // Buscar en AniList
    const response = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: ANILIST_QUERY,
        variables: { search: animeData.titulo.slice(0, 50) }
      }),
    });

    const anilistData = await response.json();
    const media = anilistData?.data?.Media;

    if (!media) {
      return NextResponse.json({ error: 'No se encontró en AniList' }, { status: 404 });
    }

    // Mapear estado
    let estado_emision = 'desconocido';
    if (media.status === 'RELEASING') estado_emision = 'emitido';
    else if (media.status === 'FINISHED') estado_emision = 'terminado';
    else if (media.status === 'NOT_YET_RELEASED') estado_emision = 'en_espera';
    else if (media.status === 'CANCELLED') estado_emision = 'suspendido';

    // Construir fechas
    const fecha_estreno = media.startDate?.year 
      ? `${media.startDate.year}-${String(media.startDate.month || 1).padStart(2, '0')}-${String(media.startDate.day || 1).padStart(2, '0')}`
      : null;

    const fecha_finalizacion = media.endDate?.year 
      ? `${media.endDate.year}-${String(media.endDate.month || 1).padStart(2, '0')}-${String(media.endDate.day || 1).padStart(2, '0')}`
      : null;

    // Actualizar en Supabase
    const updatePayload: any = {
      titulo: media.title?.romaji || animeData.titulo,
      sinopsis: media.description || animeData.titulo,
      portada_url: media.coverImage?.large || '',
      banner_url: media.bannerImage || media.coverImage?.large || '',
      generos: media.genres || [],
      fecha_estreno,
      fecha_finalizacion,
      estado_emision,
    };

    if (animeId) {
      await supabase.from('animes').update(updatePayload).eq('id', animeId);
    }

    return NextResponse.json({
      success: true,
      anilist_id: media.id,
      titulo: media.title?.romaji,
      estado: estado_emision,
      episodios: media.episodes,
      generos: media.genres,
      fecha_estreno,
      fecha_finalizacion,
      estudio: media.studios?.nodes?.[0]?.name || 'Desconocido',
      score: media.averageScore,
      popularidad: media.popularity,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
