#!/usr/bin/env python3
"""
Monitorear horarios de estrenos usando AniList
AniList proporciona la fecha exacta del próximo episodio (airingAt)
"""

import requests
import time
from datetime import datetime

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Content-Type': 'application/json',
})

QUERY = """
query {
  Page(page: 1, perPage: 30) {
    media(type: ANIME, status: RELEASING, sort: POPULARITY_DESC) {
      id
      title { romaji }
      nextAiringEpisode {
        episode
        airingAt
        timeUntilAiring
      }
    }
  }
}
"""

def main():
    print("Consultando AniList para horarios de estrenos...")
    print("=" * 60)
    
    response = requests.post(
        'https://graphql.anilist.co',
        json={'query': QUERY},
        timeout=15
    )
    
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        return
    
    data = response.json()
    animes = data.get('data', {}).get('Page', {}).get('media', [])
    
    print(f"Animes en emisión: {len(animes)}")
    print()
    
    resultados = []
    
    for anime in animes:
        titulo = anime.get('title', {}).get('romaji', 'Desconocido')
        next_ep = anime.get('nextAiringEpisode')
        
        if next_ep:
            airing_at = next_ep.get('airingAt', 0)
            episodio = next_ep.get('episode', 0)
            
            # Convertir timestamp a fecha
            fecha = datetime.fromtimestamp(airing_at)
            
            resultados.append({
                'titulo': titulo,
                'episodio': episodio,
                'fecha': fecha.strftime('%Y-%m-%d'),
                'hora': fecha.strftime('%H:%M'),
                'dia_semana': fecha.strftime('%A'),
                'timestamp': airing_at,
            })
    
    # Ordenar por timestamp
    resultados.sort(key=lambda x: x['timestamp'])
    
    print("PRÓXIMOS EPISODIOS:")
    print("-" * 60)
    for r in resultados[:20]:
        print(f"  {r['titulo'][:45]}...")
        print(f"    EP {r['episodio']} | {r['dia_semana']} {r['fecha']} a las {r['hora']} UTC")
        print()
    
    # Análisis de horas
    from collections import Counter
    horas = [r['hora'].split(':')[0] for r in resultados]
    conteo_horas = Counter(horas)
    
    print("=" * 60)
    print("HORAS MÁS COMUNES DE ESTRENO (UTC):")
    for hora, cantidad in conteo_horas.most_common(10):
        print(f"  {hora}:00 UTC -> {cantidad} animes")
    
    # Convertir a hora de Perú (UTC-5)
    print()
    print("HORAS EN PERÚ (UTC-5):")
    for hora, cantidad in conteo_horas.most_common(10):
        hora_peru = (int(hora) - 5) % 24
        print(f"  {hora_peru:02d}:00 -> {cantidad} animes")

if __name__ == "__main__":
    main()
