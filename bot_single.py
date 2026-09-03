#!/usr/bin/env python3
"""
Bot Ectosimbionte Single - Ejecutado por GitHub Actions
Recibe un nombre de anime, busca metadata real y la inserta en Supabase
Extrae: título, sinopsis, portada, géneros, fechas, estado de emisión y episodios
"""

import os
import sys
import re
import requests
from bs4 import BeautifulSoup
from supabase import create_client, Client

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: Faltan las variables de entorno de Supabase.")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

EPISODIOS_CONOCIDOS = {
    'darling in the franxx': 24,
    'mushoku tensei': 23,
    're:zero': 25,
    'one piece': 1000,
    'naruto': 220,
    'naruto shippuden': 500,
    'bleach': 366,
    'attack on titan': 25,
    'demon slayer': 26,
    'jujutsu kaisen': 24,
    'chainsaw man': 12,
    'spy x family': 12,
    'frieren': 28,
    'solo leveling': 12,
}

def generar_slug(texto):
    slug = texto.lower()
    slug = re.sub(r'[^a-z0-9\s-]', '', slug)
    slug = re.sub(r'\s+', '-', slug).strip('-')
    return slug

def extraer_estado_emision(soup):
    """Determina el estado de emisión del anime"""
    estado = 'desconocido'
    
    # Buscar en el div de estado
    estado_div = soup.find('div', class_='enemision')
    if estado_div:
        texto = estado_div.text.strip().lower()
        if 'emision' in texto or 'currently' in texto:
            estado = 'emitido'
        elif 'proximamente' in texto or 'estreno' in texto or 'upcoming' in texto:
            estado = 'en_espera'
        elif 'pausa' in texto or 'suspend' in texto or 'paused' in texto:
            estado = 'suspendido'
        elif 'finalizado' in texto or 'concluido' in texto or 'finished' in texto:
            estado = 'terminado'
    
    return estado

def extraer_fechas(soup):
    """Extrae fechas de estreno y finalización estimadas"""
    fecha_estreno = None
    fecha_finalizacion = None
    
    # Buscar enlaces de temporada
    fecha_links = soup.find_all('a', href=re.compile(r'/temporada/'))
    for link in fecha_links:
        texto = link.text.strip().lower()
        anio_match = re.search(r'(\d{4})', texto)
        if not anio_match:
            continue
        anio = int(anio_match.group(1))
        
        if 'invierno' in texto:
            fecha_estreno = f"{anio}-01-01"
        elif 'primavera' in texto:
            fecha_estreno = f"{anio}-04-01"
        elif 'verano' in texto:
            fecha_estreno = f"{anio}-07-01"
        elif 'otono' in texto:
            fecha_estreno = f"{anio}-10-01"
    
    # Buscar fecha de emisión directa
    fecha_info = soup.find('li', string=re.compile(r'Emitido|Fecha'))
    if fecha_info and not fecha_estreno:
        fecha_match = re.search(r'(\d{4})-(\d{2})-(\d{2})', fecha_info.text)
        if fecha_match:
            fecha_estreno = f"{fecha_match.group(1)}-{fecha_match.group(2)}-{fecha_match.group(3)}"
    
    return fecha_estreno, fecha_finalizacion

def extraer_generos(soup):
    """Extrae géneros del anime"""
    generos = []
    genero_links = soup.find_all('a', href=re.compile(r'/genero/'))
    for g in genero_links:
        genero = g.text.strip()
        if genero and genero not in generos:
            generos.append(genero)
    return generos

def buscar_e_insertar_anime(nombre_anime):
    print(f"Buscando metadatos para: '{nombre_anime}'...")
    
    slug = generar_slug(nombre_anime)
    
    existing = supabase.table("animes").select("id, titulo").ilike("titulo", f"%{nombre_anime}%").execute()
    if existing.data:
        print(f"El anime ya existe en Supabase.")
        return
    
    titulo_real = nombre_anime
    sinopsis = f"Sinopsis oficial extraída automáticamente para {nombre_anime}."
    portada = f"https://cdn.jkanime.net/assets/images/animes/image/{slug}.jpg"
    banner = "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200"
    episodios = []
    generos = []
    fecha_estreno = None
    fecha_finalizacion = None
    estado_emision = 'desconocido'
    
    try:
        response = requests.get(
            f"https://jkanime.net/{slug}/",
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'},
            timeout=15
        )
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            h3 = soup.find('h3')
            if h3 and h3.text.strip() != 'Buscado recientemente:':
                titulo_real = h3.text.strip()
            
            p = soup.find('p', class_='scroll')
            if p:
                sinopsis = p.text.strip()
            
            img_div = soup.find('div', class_='anime_pic')
            if img_div:
                img = img_div.find('img')
                if img:
                    portada = img.get('src', portada)
            
            # Extraer géneros
            generos = extraer_generos(soup)
            
            # Extraer estado de emisión
            estado_emision = extraer_estado_emision(soup)
            
            # Extraer fechas
            fecha_estreno, fecha_finalizacion = extraer_fechas(soup)
            
            csrf_match = re.search(r'name="csrf-token" content="([^"]+)"', response.text)
            csrf = csrf_match.group(1) if csrf_match else ''
            
            id_match = re.search(r'ajax/episodes/(\d+)/', response.text)
            jk_id = int(id_match.group(1)) if id_match else 0
            
            if jk_id and csrf:
                pagina = 1
                while pagina <= 15:
                    try:
                        ep_res = requests.post(
                            f"https://jkanime.net/ajax/episodes/{jk_id}/{pagina}",
                            data={'_token': csrf},
                            headers={'User-Agent': 'Mozilla/5.0'},
                            timeout=15
                        )
                        if ep_res.status_code != 200:
                            break
                        data = ep_res.json()
                        if not data or 'data' not in data or not data['data']:
                            break
                        for ep in data['data']:
                            num = ep.get('number', 0)
                            if num > 0 and num not in episodios:
                                episodios.append(num)
                        total = data.get('total', 0)
                        if pagina * 16 >= total:
                            break
                        pagina += 1
                    except:
                        break
    except Exception as e:
        print(f"Aviso en scraping web: {e}")
    
    episodios = sorted(list(set(episodios)))
    
    if not episodios:
        nombre_lower = nombre_anime.lower()
        total_episodios = 12
        for clave, cantidad in EPISODIOS_CONOCIDOS.items():
            if clave in nombre_lower:
                total_episodios = cantidad
                break
        episodios = list(range(1, total_episodios + 1))
    
    total_episodios = len(episodios)
    
    print(f"Titulo: {titulo_real}")
    print(f"Generos: {', '.join(generos) if generos else 'No detectados'}")
    print(f"Estado: {estado_emision}")
    print(f"Fecha estreno: {fecha_estreno or 'Desconocida'}")
    print(f"Episodios: {total_episodios}")
    
    anime_payload = {
        "titulo": titulo_real,
        "sinopsis": sinopsis,
        "portada_url": portada,
        "banner_url": banner,
        "generos": generos,
        "fecha_estreno": fecha_estreno,
        "fecha_finalizacion": fecha_finalizacion,
        "estado_emision": estado_emision
    }
    
    res_anime = supabase.table("animes").insert(anime_payload).execute()
    if not res_anime.data:
        print("Error crítico: No se pudo insertar el anime.")
        sys.exit(1)
    
    anime_id = res_anime.data[0]["id"]
    print(f"Anime registrado con ID: {anime_id}")
    
    temp_payload = {
        "anime_id": anime_id,
        "nombre": "Temporada 1",
        "orden": 1,
        "anio_lanzamiento": 2026
    }
    res_temp = supabase.table("temporadas").insert(temp_payload).execute()
    temp_id = res_temp.data[0]["id"]
    
    episodios_payload = []
    for ep_num in episodios:
        episodios_payload.append({
            "temporada_id": temp_id,
            "numero": ep_num,
            "titulo": f"Episodio {ep_num}",
            "url_stream": f"https://jkanime.net/{slug}/{ep_num}/",
            "visto": False
        })
    
    if episodios_payload:
        supabase.table("episodios").insert(episodios_payload).execute()
        print(f"Se insertaron {total_episodios} episodios para {titulo_real}.")
    else:
        print("Error: No se pudieron generar episodios.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Debes proporcionar el nombre del anime.")
        sys.exit(1)
    
    anime_a_buscar = sys.argv[1]
    buscar_e_insertar_anime(anime_a_buscar)
