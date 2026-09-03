#!/usr/bin/env python3
"""
Monitorear hora de subida de episodios a JK Anime
Solo monitorea animes de la temporada actual en emisión
"""

import requests
import re
import time
import json
from datetime import datetime

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

def obtener_animes_temporada_actual():
    """
    Obtiene animes en emisión de la temporada actual (otoño 2026)
    desde la página de temporada de JK Anime
    """
    animes = []
    
    try:
        # Obtener página de temporada otoño-2026
        response = session.get('https://jkanime.net/temporada/otono-2026', timeout=15)
        
        if response.status_code == 200:
            # Buscar JSON con animes
            match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                for anime in data.get('data', []):
                    if anime.get('status') == 'currently':
                        animes.append({
                            'titulo': anime.get('title', ''),
                            'slug': anime.get('slug', ''),
                            'episodios_actuales': 0,
                        })
    except:
        pass
    
    return animes

def obtener_numero_episodios(slug):
    """Obtiene cuántos episodios tiene el anime en JK Anime"""
    try:
        response = session.get(f'https://jkanime.net/{slug}/', timeout=10)
        if response.status_code != 200:
            return 0
        
        match = re.search(r'ajax/episodes/(\d+)/', response.text)
        if not match:
            return 0
        
        jk_id = int(match.group(1))
        csrf_match = re.search(r'name="csrf-token" content="([^"]+)"', response.text)
        csrf = csrf_match.group(1) if csrf_match else ''
        
        response = session.post(
            f'https://jkanime.net/ajax/episodes/{jk_id}/1',
            data={'_token': csrf},
            timeout=10
        )
        
        data = response.json()
        return data.get('total', 0)
    except:
        return 0

def main():
    print("Obteniendo animes de la temporada Otoño 2026...")
    
    animes = obtener_animes_temporada_actual()
    
    if not animes:
        print("No se encontraron animes de la temporada actual.")
        print("Intentando con otras temporadas...")
        
        # Intentar con otras temporadas
        for temporada in ['invierno-2026', 'primavera-2026', 'verano-2026']:
            try:
                response = session.get(f'https://jkanime.net/temporada/{temporada}', timeout=15)
                match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                    for anime in data.get('data', []):
                        if anime.get('status') == 'currently':
                            animes.append({
                                'titulo': anime.get('title', ''),
                                'slug': anime.get('slug', ''),
                            })
                    print(f"  {temporada}: {len(animes)} animes")
                    break
            except:
                continue
    
    print(f"\nAnimes en emisión a monitorear: {len(animes)}")
    
    # Limitar a los primeros 10 para no sobrecargar
    animes = animes[:10]
    
    # Obtener estado inicial
    print("\nEstado inicial:")
    for anime in animes:
        anime['episodios_actuales'] = obtener_numero_episodios(anime['slug'])
        print(f"  {anime['titulo'][:50]}... -> {anime['episodios_actuales']} eps")
        time.sleep(1)
    
    print("\nMonitoreando cambios (cada 15 minutos)...")
    print("Presiona Ctrl+C para detener\n")
    
    while True:
        for anime in animes:
            episodios = obtener_numero_episodios(anime['slug'])
            
            if episodios > anime['episodios_actuales']:
                hora_actual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                print(f"\n¡NUEVO EPISODIO!")
                print(f"  Anime: {anime['titulo']}")
                print(f"  Antes: {anime['episodios_actuales']} eps")
                print(f"  Ahora: {episodios} eps")
                print(f"  Hora de subida: {hora_actual}")
                print()
                anime['episodios_actuales'] = episodios
        
        # Esperar 15 minutos
        time.sleep(900)

if __name__ == "__main__":
    main()
