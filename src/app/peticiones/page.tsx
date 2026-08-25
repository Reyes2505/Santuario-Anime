import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const nombre = request.nextUrl.searchParams.get('nombre');
  const slug = request.nextUrl.searchParams.get('slug');

  if (!nombre || !slug) {
    return NextResponse.json({ success: false, error: 'Parámetros requeridos' }, { status: 400 });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Buscar si ya existe
    const { data: existente } = await supabase
      .from('animes')
      .select('id')
      .ilike('titulo', `%${nombre.slice(0, 30)}%`)
      .limit(1);

    if (existente && existente.length > 0) {
      return NextResponse.json({ success: true, animeId: existente[0].id });
    }

    // Crear anime
    const { data: animeCreado, error: errorAnime } = await supabase
      .from('animes')
      .insert({
        titulo: nombre,
        sinopsis: 'Agregado mediante petición del bot',
        portada_url: '',
        banner_url: ''
      })
      .select()
      .single();

    if (errorAnime) throw errorAnime;

    // Crear temporada
    const { error: errorTemp } = await supabase
      .from('temporadas')
      .insert({
        anime_id: animeCreado.id,
        nombre: 'Temporada 1',
        orden: 1,
        anio_lanzamiento: 2026
      });

    if (errorTemp) throw errorTemp;

    return NextResponse.json({ success: true, animeId: animeCreado.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
