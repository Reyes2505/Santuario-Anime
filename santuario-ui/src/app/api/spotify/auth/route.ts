import { NextResponse } from 'next/server';
import { buildSpotifyAuthorizeUrl, getSpotifyRedirectUri, isSpotifyConfigured } from '@/lib/spotify';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!isSpotifyConfigured()) {
    return NextResponse.redirect(new URL('/?spotify=not-configured', origin));
  }

  const state = String(Date.now());
  const redirectUri = getSpotifyRedirectUri(origin);
  const authUrl = buildSpotifyAuthorizeUrl(state, redirectUri);
  return NextResponse.redirect(authUrl);
}
