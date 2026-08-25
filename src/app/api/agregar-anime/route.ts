import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET(request: NextRequest) {
  const nombre = request.nextUrl.searchParams.get('nombre');

  if (!nombre) {
    return NextResponse.json({ success: false, error: 'Nombre requerido' });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Verificar si ya existe
    const { data: existente } = await supabase
      .from('animes')
      .select('id')
      .ilike('titulo', `%${nombre.slice(0, 30)}%`)
      .limit(1);

    if (existente && existente.length > 0) {
      return NextResponse.json({ success: true, animeId: existente[0].id });
    }

    // Buscar en JK Anime
    const slug = nombre.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    // Intentar obtener info de JK Anime
    try {
      const jkResponse = await fetch(`https://jkanime.net/${slug}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (jkResponse.ok) {
        // Extraer info del HTML
        const html = await jkResponse.text();
        const tituloMatch = html.match(/<h3>([^<]+)<\/h3>/);
        const titulo = tituloMatch ? tituloMatch[1] : nombre;
        
        // Crear anime con datos reales
        const { data: animeCreado, error } = await supabase
          .from('animes')
          .insert({
            titulo: titulo,
            sinopsis: 'Agregado mediante petición del bot',
            portada_url: '',
            banner_url: ''
          })
          .select()
          .single();

        if (error) throw error;

        const { error: tempError } = await supabase
          .from('temporadas')
          .insert({
            anime_id: animeCreado.id,
            nombre: 'Temporada 1',
            orden: 1,
            anio_lanzamiento: 2026
          });

        if (tempError) throw tempError;

        return NextResponse.json({ success: true, animeId: animeCreado.id });
      }
    } catch (jkErr) {
      // Si falla JK Anime, crear con el nombre dado
    }

    // Fallback: crear anime sin info de JK
    const { data: animeCreado, error } = await supabase
      .from('animes')
      .insert({
        titulo: nombre,
        sinopsis: 'Agregado mediante petición del bot',
        portada_url: '',
        banner_url: ''
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, animeId: animeCreado.id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
