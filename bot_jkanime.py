#!/usr/bin/env python3
"""
Bot Ectosimbionte v3 - Sincronización automática
"""

import requests
from bs4 import BeautifulSoup
from supabase import create_client
import re
import time
import json
import random
from typing import List, Dict, Optional
from datetime import datetime

class EctosimbionteBot:
    def __init__(self):
        self.config = self._leer_configuracion()
        self.supabase = create_client(
            self.config.get('SUPABASE_URL', self.config.get('NEXT_PUBLIC_SUPABASE_URL', '')),
            self.config.get('SUPABASE_ANON_KEY', self.config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''))
        )
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        })
        
        self.base_url = "https://jkanime.net"
        self.max_retries = 3
        self.base_delay = 2
        self.estadisticas = {
            'animes_sincronizados': 0,
            'episodios_guardados': 0,
            'reintentos': 0,
            'errores': 0,
            'tiempo_inicio': datetime.now()
        }
    
    def _leer_configuracion(self) -> Dict:
        config = {}
        with open('.env.local', 'r') as f:
            for line in f:
                if '=' in line and not line.startswith('#'):
                    key, value = line.strip().split('=', 1)
                    config[key] = value
        return config
    
    def _request_con_reintento(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        for intento in range(self.max_retries):
            try:
                response = self.session.request(method, url, timeout=20, **kwargs)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429:
                    wait = (intento + 1) * 10
                    time.sleep(wait)
                else:
                    return response
            except Exception as e:
                if intento < self.max_retries - 1:
                    wait = (2 ** intento) * 2 + random.uniform(1, 2)
                    self.estadisticas['reintentos'] += 1
                    time.sleep(wait)
                else:
                    return None
        return None
    
    def obtener_animes_directorio(self, paginas: int = 2) -> List[Dict]:
        animes = []
        for pagina in range(1, paginas + 1):
            response = self._request_con_reintento('GET', f"{self.base_url}/directorio?p={pagina}")
            if response:
                match = re.search(r'var animes = (\{.*?\});', response.text, re.DOTALL)
                if match:
                    data = json.loads(match.group(1))
                    for anime in data.get('data', []):
                        animes.append({
                            'id_jk': anime.get('id', 0),
                            'titulo': anime.get('title', ''),
                            'sinopsis': anime.get('synopsis', ''),
                            'portada_url': anime.get('image', '').replace('\\/', '/'),
                            'slug': anime.get('slug', ''),
                        })
            time.sleep(2)
        return animes
    
    def sincronizar_anime(self, anime_info: Dict):
        slug = anime_info.get('slug', '')
        titulo = anime_info.get('titulo', slug)
        
        try:
            response = self._request_con_reintento('GET', f"{self.base_url}/{slug}/")
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            
            meta = soup.find('meta', {'name': 'csrf-token'})
            csrf = meta.get('content', '') if meta else ''
            
            match = re.search(r'ajax/episodes/(\d+)/', response.text)
            if not match:
                return
            jk_id = int(match.group(1))
            
            existing = self.supabase.table('animes').select('id').eq('titulo', titulo).execute()
            if existing.data:
                anime_id = existing.data[0]['id']
            else:
                result = self.supabase.table('animes').insert({
                    'titulo': titulo,
                    'sinopsis': anime_info.get('sinopsis', ''),
                    'portada_url': anime_info.get('portada_url', ''),
                    'banner_url': anime_info.get('portada_url', '')
                }).execute()
                anime_id = result.data[0]['id'] if result.data else None
            
            if not anime_id:
                return
            
            episodios = []
            pagina = 1
            while True:
                r = self._request_con_reintento('POST', f"{self.base_url}/ajax/episodes/{jk_id}/{pagina}", data={'_token': csrf})
                if not r:
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
                time.sleep(self.base_delay)
            
            temp_result = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).eq('nombre', 'Temporada 1').execute()
            if temp_result.data:
                temporada_id = temp_result.data[0]['id']
            else:
                temp_result = self.supabase.table('temporadas').insert({
                    'anime_id': anime_id,
                    'nombre': 'Temporada 1',
                    'orden': 1,
                    'anio_lanzamiento': 2024
                }).execute()
                temporada_id = temp_result.data[0]['id'] if temp_result.data else None
            
            if not temporada_id:
                return
            
            for ep_num in episodios:
                existing_ep = self.supabase.table('episodios').select('id').eq('temporada_id', temporada_id).eq('numero', ep_num).execute()
                if existing_ep.data:
                    continue
                
                r_ep = self._request_con_reintento('GET', f"{self.base_url}/{slug}/{ep_num}/")
                if r_ep:
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
                        self.estadisticas['episodios_guardados'] += 1
                
                time.sleep(self.base_delay)
            
            self.estadisticas['animes_sincronizados'] += 1
            print(f"  ✅ {titulo[:50]}... → {len(episodios)} eps")
            
        except Exception as e:
            self.estadisticas['errores'] += 1
            print(f"  ❌ {titulo[:50]}... → {str(e)[:50]}")
    
    def ejecutar(self, max_animes: int = 10, paginas: int = 1):
        print(f"🤖 Bot Ectosimbionte v3")
        print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        print("📚 Obteniendo directorio...")
        animes = self.obtener_animes_directorio(paginas)
        print(f"✅ {len(animes)} animes")
        
        for i, anime in enumerate(animes[:max_animes]):
            print(f"[{i+1}/{max_animes}]")
            self.sincronizar_anime(anime)
            time.sleep(self.base_delay)
        
        tiempo = (datetime.now() - self.estadisticas['tiempo_inicio']).total_seconds()
        print(f"\n📊 Animes: {self.estadisticas['animes_sincronizados']} | Episodios: {self.estadisticas['episodios_guardados']} | Errores: {self.estadisticas['errores']} | Tiempo: {tiempo:.1f}s")

if __name__ == "__main__":
    bot = EctosimbionteBot()
    bot.ejecutar(max_animes=10, paginas=1)
