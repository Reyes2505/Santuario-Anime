import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { fetchSpotifyApi, getSpotifyTokensFromCookies, isSpotifyConfigured } from '@/lib/spotify';

export async function GET() {
  if (!isSpotifyConfigured()) {
    return NextResponse.json({ error: 'Spotify no está configurado' }, { status: 500 });
  }

  try {
    const cookieStore = await cookies();
    const tokenData = await getSpotifyTokensFromCookies(cookieStore);
    if (!tokenData.accessToken) {
      return NextResponse.json({ connected: false }, { status: 401 });
    }

    const res = await fetchSpotifyApi('me', cookieStore);
    if (!res.ok) {
      return NextResponse.json({ connected: false }, { status: res.status });
    }

    const profile = await res.json();
    return NextResponse.json({ connected: true, profile });
  } catch (error) {
    console.error('Spotify /me error:', error);
    return NextResponse.json({ connected: false, error: 'Error al obtener perfil de Spotify' }, { status: 500 });
  }
}
