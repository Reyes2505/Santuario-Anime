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

    // 1. Buscar en el directorio de JK Anime
    const busquedaResponse = await fetch(
      `https://jkanime.net/buscar?q=${encodeURIComponent(nombre)}`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );

    if (!busquedaResponse.ok) {
      return NextResponse.json({ success: false, error: 'Error buscando en JK Anime' });
    }

    const busquedaHtml = await busquedaResponse.text();
    const $ = cheerio.load(busquedaHtml);

    // Buscar el primer resultado
    const primerLink = $('a[href*="/"]').filter((_, el) => {
      const href = $(el).attr('href') || '';
      return href.match(/^https?:\/\/jkanime\.net\/[a-z0-9-]+\/$/) && !href.includes('directorio') && !href.includes('buscar');
    }).first();

    if (!primerLink.length) {
      return NextResponse.json({ success: false, error: 'No se encontró en JK Anime' });
    }

    const animeUrl = primerLink.attr('href') || '';
    const animeSlug = animeUrl.replace('https://jkanime.net/', '').replace(/\/$/, '');

    // 2. Obtener info completa del anime
    const animeResponse = await fetch(animeUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!animeResponse.ok) {
      return NextResponse.json({ success: false, error: 'Error obteniendo info del anime' });
    }

    const animeHtml = await animeResponse.text();
    const $anime = cheerio.load(animeHtml);

    const tituloReal = $anime('h3').first().text().trim();
    const tituloFinal = tituloReal && tituloReal !== 'Buscado recientemente:' ? tituloReal : nombre;
    const sinopsis = $anime('p.scroll').first().text().trim();
    const portada = $anime('.anime_pic img').attr('src') || '';
    const csrf = $anime('meta[name="csrf-token"]').attr('content') || '';

    const idMatch = animeHtml.match(/ajax\/episodes\/(\d+)\//);
    const jkId = idMatch ? parseInt(idMatch[1]) : 0;

    // 3. Crear anime en Supabase
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

    // 4. Crear temporada
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

    // 5. Obtener episodios
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

      // Guardar episodios con URLs del reproductor
      for (const epNum of episodios) {
        const epUrl = `https://jkanime.net/${animeSlug}/${epNum}/`;
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
      portada: portada,
      sinopsis: sinopsis
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
