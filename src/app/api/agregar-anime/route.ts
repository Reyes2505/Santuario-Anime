import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Mapa de romanización para títulos japoneses comunes
const ROMANIZATION_MAP: Record<string, string> = {
  '天気の子': 'tenki-no-ko',
  '君の名は': 'kimi-no-na-wa',
  '天気': 'tenki',
  'の': 'no',
  '子': 'ko',
  '君': 'kimi',
  '名': 'na',
  'は': 'wa',
};

function romanizar(texto: string): string {
  let resultado = texto;
  for (const [japones, romaji] of Object.entries(ROMANIZATION_MAP)) {
    resultado = resultado.replace(new RegExp(japones, 'g'), romaji);
  }
  return resultado;
}

function toSlug(texto: string): string {
  const romanizado = romanizar(texto);
  return romanizado
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-');
}

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
      // Verificar si tiene episodios
      const animeId = existente[0].id;
      const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId);
      let totalEps = 0;
      for (const t of temps.data || []) {
        const eps = await supabase.from('episodios').select('id').eq('temporada_id', t.id);
        totalEps += (eps.data || []).length;
      }

      if (totalEps > 0) {
        return NextResponse.json({ success: true, animeId, yaExistia: true, totalEps });
      }
    }

    // Construir slug
    const slug = toSlug(nombre);
    console.log('🔍 Buscando slug:', slug);

    // Obtener página del anime
    const animeResponse = await fetch(`https://jkanime.net/${slug}/`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });

    if (!animeResponse.ok) {
      return NextResponse.json({ success: false, error: `No se encontró en JK Anime (${slug})` });
    }

    const html = await animeResponse.text();

    // Extraer CSRF
    const csrfMatch = html.match(/name="csrf-token" content="([^"]+)"/);
    const csrf = csrfMatch ? csrfMatch[1] : '';

    // Extraer ID numérico
    const idMatch = html.match(/ajax\/episodes\/(\d+)\//);
    const jkId = idMatch ? parseInt(idMatch[1]) : 0;

    console.log('🔑 CSRF:', csrf ? 'OK' : 'NO');
    console.log('🆔 JK ID:', jkId);

    // Extraer título real
    const tituloMatch = html.match(/<h3>([^<]+)<\/h3>/);
    const tituloReal = tituloMatch ? tituloMatch[1].trim() : nombre;
    const tituloFinal = tituloReal !== 'Buscado recientemente:' ? tituloReal : nombre;

    // Extraer sinopsis
    const sinopsisMatch = html.match(/<p class="scroll">([^<]+)<\/p>/);
    const sinopsis = sinopsisMatch ? sinopsisMatch[1].trim() : '';

    // Extraer portada
    const portadaMatch = html.match(/<div class="anime_pic"[^>]*>.*?<img[^>]*src="([^"]+)"/s);
    const portada = portadaMatch ? portadaMatch[1] : '';

    // Crear o actualizar anime
    let animeId: string;

    if (existente && existente.length > 0) {
      animeId = existente[0].id;
      await supabase.from('animes').update({
        titulo: tituloFinal,
        sinopsis: sinopsis,
        portada_url: portada,
        banner_url: portada
      }).eq('id', animeId);
    } else {
      const { data: animeCreado, error } = await supabase
        .from('animes')
        .insert({
          titulo: tituloFinal,
          sinopsis: sinopsis,
          portada_url: portada,
          banner_url: portada
        })
        .select()
        .single();

      if (error) throw error;
      animeId = animeCreado.id;
    }

    // Crear o buscar temporada
    const temps = await supabase.from('temporadas').select('id').eq('anime_id', animeId).limit(1);
    let temporadaId: string;

    if (temps.data && temps.data.length > 0) {
      temporadaId = temps.data[0].id;
    } else {
      const { data: tempCreada, error: tempError } = await supabase
        .from('temporadas')
        .insert({
          anime_id: animeId,
          nombre: 'Temporada 1',
          orden: 1,
          anio_lanzamiento: 2026
        })
        .select()
        .single();

      if (tempError) throw tempError;
      temporadaId = tempCreada.id;
    }

    // Obtener episodios de la API AJAX
    const episodios: number[] = [];
    if (jkId > 0 && csrf) {
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
    }

    console.log('📹 Episodios encontrados:', episodios.length);

    // Guardar episodios con URLs del reproductor
    let guardados = 0;
    for (const epNum of episodios) {
      const epResponse = await fetch(`https://jkanime.net/${slug}/${epNum}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });

      if (epResponse.ok) {
        const epHtml = await epResponse.text();
        const urlMatch = epHtml.match(/https?:\/\/jkanime\.net\/jkplayer\/um\?e=[^\s"']+/);
        
        if (urlMatch) {
          await supabase.from('episodios').insert({
            temporada_id: temporadaId,
            numero: epNum,
            titulo: `Episodio ${epNum}`,
            url_stream: urlMatch[0],
            visto: false
          });
          guardados++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      animeId,
      titulo: tituloFinal,
      portada,
      sinopsis,
      episodios: guardados
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
