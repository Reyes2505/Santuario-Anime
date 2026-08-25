import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { exchangeCodeForTokens, getSpotifyRedirectUri, isSpotifyConfigured, spotifyCookieOptions } from '@/lib/spotify';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!isSpotifyConfigured()) {
    return NextResponse.json({ error: 'Spotify no está configurado' }, { status: 500 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(new URL('/?spotify=error', origin));
  }
  if (!code) {
    return NextResponse.redirect(new URL('/?spotify=error', origin));
  }

  try {
    const redirectUri = getSpotifyRedirectUri(origin);
    const tokenResponse = await exchangeCodeForTokens(code, redirectUri);
    const cookieStorage = await cookies();
    cookieStorage.set('spotify_access_token', tokenResponse.access_token, spotifyCookieOptions());
    cookieStorage.set('spotify_refresh_token', tokenResponse.refresh_token, spotifyCookieOptions());
    return NextResponse.redirect(new URL('/?spotify=connected', origin));
  } catch (err) {
    console.error('Spotify callback error:', err);
    return NextResponse.redirect(new URL('/?spotify=error', origin));
  }
}
