#!/usr/bin/env python3
import requests
import re
from bs4 import BeautifulSoup

# Lista de identificadores base (sin la extensión .com, .sx, etc.)
SERVIDORES_CONOCIDOS = [
    'streamwish', 'voe', 'vidhide', 'filemoon', 
    'mp4upload', 'streamtape', 'doodstream', 'mega'
]

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
})

def identificar_servidor(url):
    url_lower = url.lower()
    for servidor in SERVIDORES_CONOCIDOS:
        if servidor in url_lower:
            return servidor.capitalize()
    return 'Desconocido'

def extraer_servidores(url_pagina):
    print(f'🔍 Analizando: {url_pagina}')
    
    try:
        response = session.get(url_pagina, timeout=15)
        response.raise_for_status() # Lanza error si el status no es 200-299
    except requests.exceptions.RequestException as e:
        print(f'❌ Error de red al intentar acceder a la página: {e}')
        return []
    
    html = response.text
    soup = BeautifulSoup(html, 'html.parser')
    servidores = []
    seen = set()

    # 1. Buscar en Iframes (Normalizando rutas relativas)
    for iframe in soup.find_all('iframe'):
        src = iframe.get('src')
        if src and any(srv in src.lower() for srv in SERVIDORES_CONOCIDOS):
            # Si el src empieza con '//', le agregamos 'https:'
            if src.startswith('//'): src = f"https:{src}"
            
            if src not in seen:
                seen.add(src)
                servidores.append({
                    'tipo': 'iframe',
                    'servidor': identificar_servidor(src),
                    'url': src
                })

    # 2. Búsqueda Global con Regex Dinámica y Flexible
    # Esto busca cualquier subdominio y extensión (.com, .to, .sx) de los servidores
    patron_dominios = '|'.join(SERVIDORES_CONOCIDOS)
    regex = rf'https?://(?:[^"\'\s>]*\.)?({patron_dominios})\.[a-z0-9]+[^\s"\']*'
    
    # re.finditer nos da el match completo (group(0)) y el nombre del servidor (group(1))
    for match in re.finditer(regex, html, re.IGNORECASE):
        url_encontrada = match.group(0)
        
        if url_encontrada not in seen:
            seen.add(url_encontrada)
            servidores.append({
                'tipo': 'regex_html',
                'servidor': match.group(1).capitalize(),
                'url': url_encontrada
            })
            
    return servidores

# -----------------------------------------
# Ejecución principal
# -----------------------------------------
if __name__ == '__main__':
    url_prueba = 'https://jkanime.net/mushoku-tensei-iii-isekai-ittara-honki-dasu/1/'
    resultados = extraer_servidores(url_prueba)

    print(f'\n📊 Servidores encontrados: {len(resultados)}')
    for s in resultados:
        print(f'  [{s["tipo"]}] {s["servidor"]}: {s["url"]}')
