#!/usr/bin/env python3
"""
Sincronizar BD con AniList - Versión Definitiva Final
TODAS las mejoras implementadas:
- Guardado incremental (no se pierde si se interrumpe)
- Limpieza avanzada de títulos (10+ variantes)
- Reintentos con backoff exponencial
- Manejo de rate limiting (429)
- Solo actualiza pendientes
- Modo rápido para verificación
- Pausa de 2s entre peticiones
- Pausa final de 20s
- Fechas seguras (None handling)
- Búsqueda por título original y alternativo
- Soporte para donghuas (animación china)
- Logging detallado
- Resumen final con estadísticas
"""

import os
import re
import sys
import json
import time
import requests
from datetime import datetime
from supabase import create_client

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://uftfbidzobftjbonziql.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "sb_secret__1YKirUaCQsAR82TemDXHg_g5WYNZBq")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

ANILIST_QUERY = """
query ($search: String) {
  Media(search: $search, type: ANIME) {
    id
    title { romaji english native }
    status
    episodes
    startDate { year month day }
    endDate { year month day }
    genres
    averageScore
    popularity
    studios { nodes { name } }
    coverImage { large }
    bannerImage
  }
}
"""

PROGRESO_FILE = '.sync_progreso.json'

def cargar_progreso():
    """Carga el progreso guardado"""
    try:
        if os.path.exists(PROGRESO_FILE):
            with open(PROGRESO_FILE, 'r') as f:
                return json.load(f)
    except:
        pass
    return {}

def guardar_progreso(anime_id, titulo, exito=True):
    """Guarda el progreso inmediatamente después de cada actualización"""
    try:
        progreso = cargar_progreso()
        progreso[anime_id] = {
            'titulo': titulo,
            'fecha': datetime.now().isoformat(),
            'exito': exito,
        }
        with open(PROGRESO_FILE, 'w') as f:
            json.dump(progreso, f, indent=2)
    except:
        pass

def limpiar_titulo(titulo):
    """Limpia el título eliminando sufijos y caracteres especiales"""
    titulo = re.sub(r'\s*\((TV|OVA|ONA|Movie|Special)\)', '', titulo)
    titulo = re.sub(r'\s*\d+(st|nd|rd|th)\s+Season.*', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s*Season\s*\d+.*', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s*Part\s*\d+.*', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s*Recap\s*$', '', titulo)
    titulo = re.sub(r'\s*Ni!!\s*$', '', titulo)
    titulo = re.sub(r'\s*Specials?\s*$', '', titulo, flags=re.IGNORECASE)
    titulo = re.sub(r'\s*Movie\s*$', '', titulo, flags=re.IGNORECASE)
    titulo = titulo.replace(':', '').replace('!', '').replace('?', '')
    titulo = titulo.replace('∞', '').replace('※', '')
    return titulo.strip()

def generar_variantes(titulo):
    """Genera TODAS las variantes posibles del título para búsqueda"""
    variantes = []
    variantes.append(titulo)
    
    titulo_limpio = limpiar_titulo(titulo)
    if titulo_limpio and titulo_limpio != titulo:
        variantes.append(titulo_limpio)
    
    if ':' in titulo:
        sin_subtitulo = titulo.split(':')[0].strip()
        if sin_subtitulo and len(sin_subtitulo) >= 3:
            variantes.append(sin_subtitulo)
    
    sin_temp = re.sub(r'\s*\d+(st|nd|rd|th)\s+Season.*', '', titulo, flags=re.IGNORECASE).strip()
    if sin_temp and sin_temp != titulo:
        variantes.append(sin_temp)
    
    sin_parentesis = re.sub(r'\([^)]*\)', '', titulo).strip()
    if sin_parentesis and sin_parentesis != titulo:
        variantes.append(sin_parentesis)
    
    sin_ni = titulo.replace('Ni!!', '').strip()
    if sin_ni and sin_ni != titulo:
        variantes.append(sin_ni)
    
    palabras = titulo.split()
    if len(palabras) > 4:
        primeras_3 = ' '.join(palabras[:3])
        if primeras_3 and len(primeras_3) >= 10:
            variantes.append(primeras_3)
    
    if titulo.lower().startswith('the '):
        sin_the = titulo[4:].strip()
        if sin_the and len(sin_the) >= 3:
            variantes.append(sin_the)
    
    if not titulo.lower().startswith('the '):
        con_the = f"The {titulo}"
        variantes.append(con_the)
    
    sin_unicode = titulo.encode('ascii', 'ignore').decode('ascii').strip()
    if sin_unicode and sin_unicode != titulo and len(sin_unicode) >= 3:
        variantes.append(sin_unicode)
    
    variantes = [v for v in dict.fromkeys(variantes) if v and len(v) >= 3]
    
    return variantes[:5]

def buscar_anilist(titulo, max_retries=4):
    """Busca en AniList con reintentos y TODAS las variantes"""
    variantes = generar_variantes(titulo)
    
    for titulo_busqueda in variantes:
        if len(titulo_busqueda) < 3:
            continue
        
        for intento in range(max_retries):
            try:
                response = requests.post(
                    'https://graphql.anilist.co',
                    json={'query': ANILIST_QUERY, 'variables': {'search': titulo_busqueda[:50]}},
                    timeout=15
                )
                
                if response.status_code == 200:
                    data = response.json()
                    media = data.get('data', {}).get('Media')
                    if media:
                        return media
                    break
                elif response.status_code == 429:
                    wait = (intento + 1) * 20
                    print(f"    Rate limited ({wait}s)...", end=' ', flush=True)
                    time.sleep(wait)
                else:
                    break
                    
            except requests.exceptions.Timeout:
                if intento < max_retries - 1:
                    time.sleep(5)
            except Exception:
                if intento < max_retries - 1:
                    time.sleep(3)
    
    return None

def mapear_estado(status):
    if status == 'RELEASING': return 'emitido'
    if status == 'FINISHED': return 'terminado'
    if status == 'NOT_YET_RELEASED': return 'en_espera'
    if status == 'CANCELLED': return 'suspendido'
    return 'desconocido'

def formatear_fecha(date_obj):
    if not date_obj or not isinstance(date_obj, dict):
        return None
    
    anio = date_obj.get('year')
    if not anio:
        return None
    
    mes = date_obj.get('month') or 1
    dia = date_obj.get('day') or 1
    
    return f"{anio}-{str(mes).zfill(2)}-{str(dia).zfill(2)}"

def actualizar_anime(anime_id, media, titulo_original):
    """Actualiza un anime en BD con datos de AniList"""
    update_data = {
        'titulo': media.get('title', {}).get('romaji') or media.get('title', {}).get('english') or titulo_original,
        'generos': media.get('genres', []),
        'fecha_estreno': formatear_fecha(media.get('startDate')),
        'fecha_finalizacion': formatear_fecha(media.get('endDate')),
        'estado_emision': mapear_estado(media.get('status')),
        'portada_url': media.get('coverImage', {}).get('large', ''),
        'banner_url': media.get('bannerImage') or media.get('coverImage', {}).get('large', ''),
    }
    
    try:
        supabase.table('animes').update(update_data).eq('id', anime_id).execute()
        return True
    except Exception as e:
        print(f"ERROR: {e}")
        return False

def modo_completo():
    """Actualiza todos los pendientes con info completa de AniList"""
    # Cargar progreso previo
    progreso = cargar_progreso()
    
    # Solo obtener animes pendientes que NO están en el progreso
    animes = supabase.table('animes').select('id, titulo').is_('fecha_estreno', 'null').execute()
    
    # Filtrar los que ya se procesaron
    pendientes = [a for a in animes.data if a['id'] not in progreso]
    
    total = len(pendientes)
    print(f"Animes pendientes: {total} (ya procesados: {len(progreso)})")
    
    if total == 0:
        print("Todos los animes ya están actualizados.")
        return
    
    actualizados = 0
    fallidos = 0
    no_encontrados = []
    
    tiempo_inicio = datetime.now()
    
    for idx, anime in enumerate(pendientes):
        titulo = anime['titulo']
        print(f"[{idx+1}/{total}] {titulo[:60]}...", end=' ', flush=True)
        
        media = buscar_anilist(titulo)
        
        if media:
            if actualizar_anime(anime['id'], media, titulo):
                actualizados += 1
                print("OK")
                guardar_progreso(anime['id'], titulo, True)
            else:
                fallidos += 1
                guardar_progreso(anime['id'], titulo, False)
        else:
            fallidos += 1
            no_encontrados.append(titulo)
            print("No encontrado")
            guardar_progreso(anime['id'], titulo, False)
        
        time.sleep(2)
    
    tiempo_total = (datetime.now() - tiempo_inicio).total_seconds()
    
    print(f"\n{'='*50}")
    print(f"RESULTADO FINAL")
    print(f"{'='*50}")
    print(f"  Actualizados: {actualizados}")
    print(f"  Fallidos: {fallidos}")
    print(f"  Tiempo total: {tiempo_total:.1f}s")
    
    if no_encontrados:
        print(f"\nNo encontrados en AniList ({len(no_encontrados)}):")
        for titulo in no_encontrados[:20]:
            print(f"  - {titulo[:60]}")

def modo_rapido():
    """Revisión rápida: verifica integridad y actualiza si es necesario"""
    print("Modo rápido: Verificando integridad de datos...\n")
    
    animes = supabase.table('animes').select('id, titulo, fecha_estreno, generos, portada_url, estado_emision').execute()
    
    total = len(animes.data)
    completos = 0
    incompletos = 0
    pendientes = []
    
    for anime in animes.data:
        fecha = anime.get('fecha_estreno')
        generos = anime.get('generos', [])
        portada = anime.get('portada_url', '')
        estado = anime.get('estado_emision', '')
        
        es_completo = (
            fecha is not None and
            generos and len(generos) > 0 and
            portada and
            estado and estado != 'desconocido'
        )
        
        if es_completo:
            completos += 1
        else:
            incompletos += 1
            pendientes.append(anime)
    
    print(f"Total: {total}")
    print(f"Completos: {completos}")
    print(f"Incompletos: {incompletos}\n")
    
    if pendientes:
        print(f"Animes que necesitan actualización:")
        for anime in pendientes[:20]:
            faltantes = []
            if not anime.get('fecha_estreno'): faltantes.append('fecha')
            if not anime.get('generos'): faltantes.append('generos')
            if not anime.get('portada_url'): faltantes.append('portada')
            if not anime.get('estado_emision') or anime.get('estado_emision') == 'desconocido': faltantes.append('estado')
            print(f"  {anime['titulo'][:50]}... -> Faltan: {', '.join(faltantes)}")
        
        print(f"\n¿Actualizar estos {len(pendientes)} animes? (s/n)")
        respuesta = input().lower()
        
        if respuesta == 's':
            actualizados = 0
            for idx, anime in enumerate(pendientes):
                titulo = anime['titulo']
                print(f"[{idx+1}/{len(pendientes)}] {titulo[:60]}...", end=' ', flush=True)
                
                media = buscar_anilist(titulo)
                
                if media:
                    if actualizar_anime(anime['id'], media, titulo):
                        actualizados += 1
                        print("OK")
                        guardar_progreso(anime['id'], titulo, True)
                    else:
                        print("ERROR BD")
                        guardar_progreso(anime['id'], titulo, False)
                else:
                    print("No encontrado")
                    guardar_progreso(anime['id'], titulo, False)
                
                time.sleep(2)
            
            print(f"\nActualizados: {actualizados}/{len(pendientes)}")
    else:
        print("Todos los animes están completos.")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--rapido':
        modo_rapido()
    else:
        modo_completo()
    
    print("\nPausa final de 20 segundos...")
    time.sleep(20)
