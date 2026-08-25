import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

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
      return NextResponse.json({ success: true, animeId: existente[0].id, yaExistia: true });
    }

    // Construir slug para JK Anime
    const slug = nombre.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-');

    // Buscar en JK Anime
    const jkResponse = await fetch(`https://jkanime.net/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!jkResponse.ok) {
      return NextResponse.json({ success: false, error: 'No se encontró en JK Anime' });
    }

    const html = await jkResponse.text();
    const $ = cheerio.load(html);

    // Extraer título real
    const tituloReal = $('h3').first().text().trim();
    const tituloFinal = tituloReal && tituloReal !== 'Buscado recientemente:' ? tituloReal : nombre;

    // Extraer sinopsis
    const sinopsis = $('p.scroll').first().text().trim();

    // Extraer portada
    const portada = $('.anime_pic img').attr('src') || '';

    // Extraer CSRF token
    const csrf = $('meta[name="csrf-token"]').attr('content') || '';

    // Extraer ID numérico
    const idMatch = html.match(/ajax\/episodes\/(\d+)\//);
    const jkId = idMatch ? parseInt(idMatch[1]) : 0;

    // Crear anime en Supabase
    const { data: animeCreado, error: errorAnime } = await supabase
      .from('animes')
      .insert({
        titulo: tituloFinal,
        sinopsis: sinopsis || 'Sin descripción',
        portada_url: portada,
        banner_url: portada
      })
      .select()
      .single();

    if (errorAnime) throw errorAnime;

    // Crear temporada
    const { data: temporadaCreada, error: errorTemp } = await supabase
      .from('temporadas')
      .insert({
        anime_id: animeCreado.id,
        nombre: 'Temporada 1',
        orden: 1,
        anio_lanzamiento: 2026
      })
      .select()
      .single();

    if (errorTemp) throw errorTemp;

    // Obtener episodios de la API de JK Anime
    if (jkId > 0 && csrf) {
      const episodios: number[] = [];
      let pagina = 1;

      while (true) {
        const epResponse = await fetch(
          `https://jkanime.net/ajax/episodes/${jkId}/${pagina}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0'
            },
            body: `_token=${encodeURIComponent(csrf)}`
          }
        );

        if (!epResponse.ok) break;

        const epData = await epResponse.json();
        if (!epData || !epData.data || epData.data.length === 0) break;

        for (const ep of epData.data) {
          const num = ep.number || 0;
          if (num > 0) episodios.push(num);
        }

        const total = epData.total || 0;
        if (pagina * 16 >= total) break;
        pagina++;
      }

      // Guardar episodios
      for (const epNum of episodios) {
        // Obtener URL del reproductor
        const epUrl = `https://jkanime.net/${slug}/${epNum}/`;
        const epResponse = await fetch(epUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (epResponse.ok) {
          const epHtml = await epResponse.text();
          const urlMatch = epHtml.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
          
          if (urlMatch) {
            await supabase.from('episodios').insert({
              temporada_id: temporadaCreada.id,
              numero: epNum,
              titulo: `Episodio ${epNum}`,
              url_stream: urlMatch[0],
              visto: false
            });
          }
        }
      }
    }

    return NextResponse.json({ 
      success: true, 
      animeId: animeCreado.id,
      titulo: tituloFinal,
      episodios: 0
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
