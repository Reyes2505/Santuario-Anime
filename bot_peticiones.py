#!/usr/bin/env python3
"""
Bot de Peticiones Individuales
- Recibe una URL o nombre de anime
- Busca en JK Anime
- Extrae metadata y episodios
- Guarda en Supabase
- NO toca el bot principal (bot_jkanime.py)
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
import re
import time
from typing import Dict, Optional
from datetime import datetime

class BotPeticiones:
    def __init__(self):
        self.config = self._leer_configuracion()
        self.supabase = create_client(
            self.config.get('SUPABASE_URL', ''),
            self.config.get('SUPABASE_ANON_KEY', '')
        )
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        })
        
        self.base_url = "https://jkanime.net"
    
    def _leer_configuracion(self) -> Dict:
        config = {}
        config['SUPABASE_URL'] = os.environ.get('SUPABASE_URL', '')
        config['SUPABASE_ANON_KEY'] = os.environ.get('SUPABASE_ANON_KEY', '')
        
        if not config['SUPABASE_URL']:
            try:
                with open('.env.local', 'r') as f:
                    for line in f:
                        if '=' in line and not line.startswith('#'):
                            key, value = line.strip().split('=', 1)
                            config[key] = value
            except FileNotFoundError:
                pass
        
        return config
    
    def _extraer_slug(self, entrada: str) -> str:
        """Extrae slug de URL o convierte nombre"""
        if 'jkanime.net' in entrada:
            match = re.search(r'jkanime\.net/([a-z0-9-]+)/?', entrada)
            return match.group(1) if match else ''
        else:
            return entrada.lower().replace('[^a-z0-9 ]', '').replace(' ', '-')
    
    def sincronizar(self, entrada: str) -> Dict:
        """
        Sincroniza UN anime individual
        Retorna: {success, titulo, episodios, portada, sinopsis}
        """
        slug = self._extraer_slug(entrada)
        if not slug:
            return {'success': False, 'error': 'No se pudo determinar el slug'}
        
        print(f'🎯 Sincronizando: {slug}')
        
        # 1. Obtener página del anime
        response = self.session.get(f'{self.base_url}/{slug}/', timeout=15)
        if response.status_code != 200:
            return {'success': False, 'error': f'No se encontró en JK Anime ({slug})'}
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # 2. Extraer CSRF e ID
        meta = soup.find('meta', {'name': 'csrf-token'})
        csrf = meta.get('content', '') if meta else ''
        
        match = re.search(r'ajax/episodes/(\d+)/', response.text)
        if not match:
            return {'success': False, 'error': 'No se encontró ID numérico'}
        jk_id = int(match.group(1))
        
        # 3. Extraer metadata
        h3 = soup.find('h3')
        titulo = h3.text.strip() if h3 else slug.replace('-', ' ').title()
        if titulo == 'Buscado recientemente:':
            titulo = slug.replace('-', ' ').title()
        
        p = soup.find('p', class_='scroll')
        sinopsis = p.text.strip() if p else ''
        
        img = soup.find('div', class_='anime_pic')
        portada = ''
        if img:
            img_tag = img.find('img')
            if img_tag:
                portada = img_tag.get('src', '')
        
        print(f'📋 Título: {titulo}')
        print(f'🖼️ Portada: {portada[:50]}...')
        
        # 4. Crear o actualizar anime
        existing = self.supabase.table('animes').select('id').ilike('titulo', f'%{titulo[:20]}%').limit(1).execute()
        
        if existing.data:
            anime_id = existing.data[0]['id']
            self.supabase.table('animes').update({
                'titulo': titulo,
                'sinopsis': sinopsis,
                'portada_url': portada,
                'banner_url': portada
            }).eq('id', anime_id).execute()
        else:
            result = self.supabase.table('animes').insert({
                'titulo': titulo,
                'sinopsis': sinopsis,
                'portada_url': portada,
                'banner_url': portada
            }).execute()
            anime_id = result.data[0]['id'] if result.data else None
        
        if not anime_id:
            return {'success': False, 'error': 'No se pudo crear anime'}
        
        # 5. Crear temporada
        temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).limit(1).execute()
        if temps.data:
            temporada_id = temps.data[0]['id']
        else:
            temp_result = self.supabase.table('temporadas').insert({
                'anime_id': anime_id,
                'nombre': 'Temporada 1',
                'orden': 1,
                'anio_lanzamiento': 2026
            }).execute()
            temporada_id = temp_result.data[0]['id'] if temp_result.data else None
        
        if not temporada_id:
            return {'success': False, 'error': 'No se pudo crear temporada'}
        
        # 6. Obtener episodios
        episodios = []
        pagina = 1
        while pagina <= 10:
            r = self.session.post(
                f'{self.base_url}/ajax/episodes/{jk_id}/{pagina}',
                data={'_token': csrf},
                timeout=15
            )
            if r.status_code != 200:
                break
            
            try:
                data = r.json()
                if not data or 'data' not in data or not data['data']:
                    break
                for ep in data['data']:
                    num = ep.get('number', 0)
                    if num > 0:
                        episodios.append(num)
                total = data.get('total', 0)
                if pagina * 16 >= total:
                    break
                pagina += 1
            except:
                break
            time.sleep(0.5)
        
        print(f'📹 Episodios: {len(episodios)}')
        
        # 7. Guardar episodios
        guardados = 0
        for ep_num in episodios:
            existing_ep = self.supabase.table('episodios').select('id').eq('temporada_id', temporada_id).eq('numero', ep_num).execute()
            if existing_ep.data:
                continue
            
            r_ep = self.session.get(f'{self.base_url}/{slug}/{ep_num}/', timeout=15)
            if r_ep.status_code == 200:
                soup_ep = BeautifulSoup(r_ep.content, 'html.parser')
                url_reproductor = None
                scripts = soup_ep.find_all('script')
                for script in scripts:
                    if script.string:
                        match = re.search(r'https?://jkanime\.net/jkplayer/um\?e=[^\s"\']+', script.string)
                        if match:
                            url_reproductor = match.group(0)
                            break
                
                if url_reproductor:
                    self.supabase.table('episodios').insert({
                        'temporada_id': temporada_id,
                        'numero': ep_num,
                        'titulo': f'Episodio {ep_num}',
                        'url_stream': url_reproductor,
                        'visto': False
                    }).execute()
                    guardados += 1
                    print(f'  ✅ EP{ep_num}')
            
            time.sleep(0.8)
        
        return {
            'success': True,
            'anime_id': anime_id,
            'titulo': titulo,
            'portada': portada,
            'sinopsis': sinopsis,
            'episodios': guardados,
            'total_episodios': len(episodios)
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print('Uso: python bot_peticiones.py <URL_o_nombre>')
        exit(1)
    
    bot = BotPeticiones()
    resultado = bot.sincronizar(sys.argv[1])
    
    if resultado.get('success'):
        print(f'\n✅ Éxito: {resultado["titulo"]}')
        print(f'📹 Episodios: {resultado["episodios"]}')
    else:
        print(f'\n❌ Error: {resultado.get("error")}')
