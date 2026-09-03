#!/usr/bin/env python3
"""
Extrae frames de videos M3U8 y los sube a Supabase Storage.
Diseñado para ejecutarse en GitHub Actions.

Variables de entorno:
  SUPABASE_URL: URL del proyecto Supabase
  SUPABASE_SERVICE_ROLE_KEY: API key con permisos de servicio
  LIMITE_EPISODIOS: Número máximo de episodios a procesar (default: 5)
"""

import os
import subprocess
import tempfile
import requests
import re
from supabase import create_client
from typing import Optional
import time
import sys

# ========== CONFIGURACIÓN ==========
SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://uftfbidzobftjbonziql.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_SERVICE_ROLE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmdGZiaWR6b2JmdGpib256aXFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjI0MDUzMCwiZXhwIjoyMTAxODE2NTMwfQ.y4JcvFdtQJDAVeerP9Om4VWO_edEGZhr1ffxKp5Ck-A')
BUCKET_NAME = 'thumbnails'
LIMITE_EPISODIOS = int(os.environ.get('LIMITE_EPISODIOS', '5'))

# Headers para peticiones HTTP
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
}

# ========== INICIALIZAR SUPABASE ==========
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# ========== FUNCIONES ==========

def obtener_m3u8(page_url: str) -> Optional[str]:
    """
    Obtiene la URL M3U8 desde una página de JK Anime.
    Sigue el mismo flujo que el endpoint /api/stream.
    """
    try:
        # 1. Obtener página del episodio
        page_res = requests.get(page_url, headers=HEADERS, timeout=15)
        if page_res.status_code != 200:
            print(f'    ⚠️ Página no accesible (HTTP {page_res.status_code})')
            return None
        
        # 2. Buscar iframe del reproductor (um)
        iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/um\?e=[^"]+)"', page_res.text)
        if not iframe_match:
            # Intentar con iframe alternativo (umv)
            iframe_match = re.search(r'src="(https://jkanime\.net/jkplayer/umv\?e=[^"]+)"', page_res.text)
        
        if not iframe_match:
            print('    ⚠️ No se encontró iframe del reproductor')
            return None
        
        iframe_url = iframe_match.group(1)
        
        # 3. Obtener contenido del iframe
        iframe_res = requests.get(iframe_url, headers=HEADERS, timeout=15)
        if iframe_res.status_code != 200:
            print(f'    ⚠️ Iframe no accesible (HTTP {iframe_res.status_code})')
            return None
        
        # 4. Extraer URL M3U8
        m3u8_match = re.search(r'(https?://[^\s"\']+\.m3u8[^\s"\']*)', iframe_res.text)
        
        if m3u8_match:
            return m3u8_match.group(1)
        
        print('    ⚠️ No se encontró M3U8 en el iframe')
        return None
        
    except requests.Timeout:
        print('    ⚠️ Timeout al obtener la página')
        return None
    except Exception as e:
        print(f'    ⚠️ Error: {e}')
        return None


def extraer_frame(m3u8_url: str, timestamp: int, output_path: str) -> bool:
    """
    Extrae un frame del video M3U8 usando ffmpeg.
    Usa timeout estricto para evitar cuelgues.
    """
    try:
        cmd = [
            'timeout', '15', 'ffmpeg',
            '-y',                    # Sobrescribir archivo
            '-ss', str(timestamp),   # Timestamp en segundos
            '-i', m3u8_url,          # URL del stream
            '-frames:v', '1',        # Solo 1 frame
            '-q:v', '2',             # Calidad alta
            '-loglevel', 'error',    # Solo errores
            output_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, timeout=20)
        
        # Verificar que el frame se extrajo correctamente
        if result.returncode == 0 and os.path.exists(output_path):
            file_size = os.path.getsize(output_path)
            if file_size > 1000:  # Más de 1KB = frame válido
                return True
        
        return False
        
    except subprocess.TimeoutExpired:
        print('    ⚠️ Timeout en ffmpeg')
        return False
    except Exception as e:
        print(f'    ⚠️ Error ffmpeg: {e}')
        return False


def subir_thumbnail(file_path: str, episode_id: str) -> Optional[str]:
    """
    Sube un frame a Supabase Storage y retorna la URL pública.
    """
    try:
        file_name = f'{episode_id}.jpg'
        
        with open(file_path, 'rb') as f:
            file_data = f.read()
        
        # Verificar que el archivo no esté vacío
        if len(file_data) < 1000:
            print('    ⚠️ Archivo demasiado pequeño')
            return None
        
        # Intentar subir (con upsert)
        try:
            supabase.storage.from_(BUCKET_NAME).upload(
                file_name,
                file_data,
                {'content-type': 'image/jpeg', 'x-upsert': 'true'}
            )
        except Exception as upload_error:
            # Si falla, intentar actualizar
            try:
                supabase.storage.from_(BUCKET_NAME).update(
                    file_name,
                    file_data,
                    {'content-type': 'image/jpeg'}
                )
            except Exception:
                print(f'    ⚠️ No se pudo subir: {upload_error}')
                return None
        
        # Obtener URL pública
        public_url = supabase.storage.from_(BUCKET_NAME).get_public_url(file_name)
        return public_url
        
    except Exception as e:
        print(f'    ⚠️ Error subiendo: {e}')
        return None


def procesar_episodio(ep: dict) -> bool:
    """
    Procesa un episodio completo: extrae frame y actualiza BD.
    Retorna True si exitoso.
    """
    ep_id = ep.get('id')
    numero = ep.get('numero', '?')
    page_url = ep.get('url_stream', '')
    
    if not ep_id or not page_url:
        return False
    
    print(f'🎬 EP {numero} - Obteniendo stream M3U8...')
    
    # 1. Obtener M3U8
    m3u8_url = obtener_m3u8(page_url)
    if not m3u8_url:
        print(f'  ❌ EP {numero}: No se pudo obtener M3U8')
        return False
    
    print(f'  ✅ M3U8 obtenido')
    
    # 2. Extraer frames en diferentes timestamps
    with tempfile.TemporaryDirectory() as tmpdir:
        frame_path = None
        timestamps = [60, 120, 300, 600]  # 1min, 2min, 5min, 10min
        
        for ts in timestamps:
            output_path = os.path.join(tmpdir, f'frame_{ts}.jpg')
            print(f'  📸 Extrayendo frame en {ts}s...')
            
            if extraer_frame(m3u8_url, ts, output_path):
                frame_path = output_path
                print(f'  ✅ Frame extraído en {ts}s')
                break
        
        if not frame_path:
            print(f'  ❌ EP {numero}: No se pudieron extraer frames')
            return False
        
        # 3. Subir a Supabase Storage
        print(f'  ☁️ Subiendo thumbnail...')
        thumbnail_url = subir_thumbnail(frame_path, ep_id)
        
        if not thumbnail_url:
            print(f'  ❌ EP {numero}: No se pudo subir thumbnail')
            return False
        
        # 4. Actualizar BD
        try:
            result = supabase.table('episodios').update({'thumbnail_url': thumbnail_url}).eq('id', ep_id).execute()
            if result.data:
                print(f'  ✅ EP {numero}: Thumbnail guardado en BD')
                return True
            else:
                print(f'  ⚠️ EP {numero}: Thumbnail subido pero BD no actualizada')
                return False
        except Exception as e:
            print(f'  ⚠️ EP {numero}: Error actualizando BD: {e}')
            return False


def verificar_bucket() -> bool:
    """
    Verifica que el bucket exista. Si no existe, intenta crearlo.
    """
    try:
        buckets = supabase.storage.list_buckets()
        bucket_exists = any(b.name == BUCKET_NAME for b in buckets)
        
        if bucket_exists:
            return True
        
        # Crear bucket
        try:
            supabase.storage.create_bucket(BUCKET_NAME, {'public': True})
            print(f'✅ Bucket "{BUCKET_NAME}" creado')
            return True
        except Exception as e:
            print(f'⚠️ No se pudo crear bucket: {e}')
            return False
            
    except Exception as e:
        print(f'⚠️ Error verificando bucket: {e}')
        return False


def main():
    """Función principal."""
    print('=' * 60)
    print('🏯 Santuario Anime - Extractor de Thumbnails')
    print('=' * 60)
    print(f'📋 Límite: {LIMITE_EPISODIOS} episodios')
    print(f'🪣 Bucket: {BUCKET_NAME}')
    print('')
    
    # Verificar bucket
    if not verificar_bucket():
        print('❌ No se pudo verificar el bucket')
        sys.exit(1)
    
    # Obtener episodios sin thumbnail
    print('📊 Buscando episodios sin thumbnail...')
    result = supabase.table('episodios').select('id, numero, url_stream').is_('thumbnail_url', 'null').limit(LIMITE_EPISODIOS).execute()
    episodios = result.data or []
    
    print(f'📋 Episodios sin thumbnail: {len(episodios)}')
    print('')
    
    if not episodios:
        print('✅ Todos los episodios tienen thumbnail')
        return
    
    # Procesar episodios
    exitosos = 0
    fallidos = 0
    
    for i, ep in enumerate(episodios, 1):
        print(f'[{i}/{len(episodios)}]')
        
        if procesar_episodio(ep):
            exitosos += 1
        else:
            fallidos += 1
        
        print('')
        
        # Pausa entre episodios (solo si hay más)
        if i < len(episodios):
            time.sleep(3)
    
    # Resumen final
    print('=' * 60)
    print(f'✅ Exitosos: {exitosos}')
    print(f'❌ Fallidos: {fallidos}')
    print(f'📊 Total: {exitosos + fallidos}')
    print('=' * 60)


if __name__ == '__main__':
    main()
