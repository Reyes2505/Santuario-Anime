#!/usr/bin/env python3
"""
Extrae frames de videos M3U8 y los sube a Supabase Storage.
Diseñado para ejecutarse en GitHub Actions.
"""

import os
import subprocess
import tempfile
import requests
import re
from supabase import create_client
from typing import Optional
import time

# Configuración desde variables de entorno
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', '')
BUCKET_NAME = 'thumbnails'

# Límite de episodios por ejecución
LIMITE_EPISODIOS = int(os.environ.get('LIMITE_EPISODIOS', '5'))

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}


def obtener_m3u8(page_url: str) -> Optional[str]:
    """Obtiene URL M3U8 desde página de JK Anime."""
    try:
        page_res = requests.get(page_url, headers=HEADERS, timeout=15)
        if page_res.status_code != 200:
            return None
        
        iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/um\?e=[^"]+)"', page_res.text)
        if not iframe_match:
            return None
        
        iframe_res = requests.get(iframe_match.group(1), headers=HEADERS, timeout=15)
        if iframe_res.status_code != 200:
            return None
        
        m3u8_match = re.search(r'(https?://[^\s"\']+\.m3u8[^\s"\']*)', iframe_res.text)
        return m3u8_match.group(1) if m3u8_match else None
    except Exception:
        return None


def extraer_frame(m3u8_url: str, timestamp: int, output_path: str) -> bool:
    """Extrae un frame con timeout estricto."""
    try:
        cmd = [
            'timeout', '15', 'ffmpeg',
            '-y', '-ss', str(timestamp),
            '-i', m3u8_url,
            '-frames:v', '1', '-q:v', '2',
            '-loglevel', 'error',
            output_path
        ]
        result = subprocess.run(cmd, capture_output=True, timeout=20)
        return result.returncode == 0 and os.path.exists(output_path) and os.path.getsize(output_path) > 1000
    except Exception:
        return False


def subir_thumbnail(file_path: str, episode_id: str) -> Optional[str]:
    """Sube frame a Supabase Storage."""
    try:
        file_name = f'{episode_id}.jpg'
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        if len(file_data) < 1000:
            return None
        
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                file_name, file_data,
                {'content-type': 'image/jpeg', 'x-upsert': 'true'}
            )
        except Exception:
            try:
                supabase.storage.from_(BUCKET_NAME).update(
                    file_name, file_data,
                    {'content-type': 'image/jpeg'}
                )
            except Exception:
                pass
        
        return supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
    except Exception:
        return None


def main():
    print('🏯 Santuario Anime - Extractor de Thumbnails (GitHub Actions)')
    print(f'📋 Límite: {LIMITE_EPISODIOS} episodios')
    print('')
    
    # Obtener episodios sin thumbnail
    result = supabase.table('episodios').select('id, numero, url_stream').is_('thumbnail_url', 'null').limit(LIMITE_EPISODIOS).execute()
    episodios = result.data or []
    
    print(f'📊 Episodios sin thumbnail: {len(episodios)}')
    
    if not episodios:
        print('✅ Todos los episodios tienen thumbnail')
        return
    
    exitosos = 0
    for ep in episodios:
        ep_id = ep.get('id')
        numero = ep.get('numero', '?')
        page_url = ep.get('url_stream', '')
        
        print(f'🎬 EP {numero}...')
        
        m3u8_url = obtener_m3u8(page_url)
        if not m3u8_url:
            print(f'  ❌ Sin M3U8')
            continue
        
        with tempfile.TemporaryDirectory() as tmpdir:
            frame_path = None
            for ts in [60, 120, 300]:
                output = os.path.join(tmpdir, f'frame_{ts}.jpg')
                if extraer_frame(m3u8_url, ts, output):
                    frame_path = output
                    break
            
            if not frame_path:
                print(f'  ❌ Sin frames')
                continue
            
            thumbnail_url = subir_thumbnail(frame_path, ep_id)
            if thumbnail_url:
                supabase.table('episodios').update({'thumbnail_url': thumbnail_url}).eq('id', ep_id).execute()
                print(f'  ✅ Thumbnail guardado')
                exitosos += 1
            else:
                print(f'  ❌ Error subiendo')
        
        time.sleep(2)
    
    print('')
    print(f'✅ Exitosos: {exitosos}/{len(episodios)}')


if __name__ == '__main__':
    main()
