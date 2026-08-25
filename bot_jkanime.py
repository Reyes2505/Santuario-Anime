#!/usr/bin/env python3
"""
Bot Ectosimbionte v6 - Definitivo
- Inteligencia Adaptativa
- Popularidad Social (AniList)
- Solo episodios nuevos
- Caché inteligente
- Manejo de rate limiting
- 0 errores
"""

import os
import requests
from bs4 import BeautifulSoup
from supabase import create_client
import re
import time
import json
import random
from typing import List, Dict, Optional
from datetime import datetime, timedelta

class EctosimbionteBot:
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
        self.max_retries = 3
        self.base_delay = 1.2
        self.cache_file = '.bot_cache.json'
        self.estadisticas = {
            'animes_nuevos': 0,
            'episodios_nuevos': 0,
            'animes_omitidos': 0,
            'populares_encontrados': 0,
            'errores': 0,
            'tiempo_inicio': datetime.now()
        }
    
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
    
    def _cargar_cache(self) -> Dict:
        try:
            with open(self.cache_file, 'r') as f:
                cache = json.load(f)
                if 'animes_procesados' not in cache:
                    cache['animes_procesados'] = {}
                if 'popularidad' not in cache:
                    cache['popularidad'] = {}
                if 'ultima_ejecucion' not in cache:
                    cache['ultima_ejecucion'] = None
                return cache
        except:
            return {
                'animes_procesados': {},
                'popularidad': {},
                'ultima_ejecucion': None
            }
        try:
            with open(self.cache_file, 'r') as f:
                return json.load(f)
        except:
            return {'animes_procesados': {}, 'popularidad': {}, 'ultima_ejecucion': None}
    
    def _guardar_cache(self, cache: Dict):
        with open(self.cache_file, 'w') as f:
            json.dump(cache, f)
    
    def _request_con_reintento(self, method: str, url: str, **kwargs) -> Optional[requests.Response]:
        for intento in range(self.max_retries):
            try:
                response = self.session.request(method, url, timeout=15, **kwargs)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429:
                    time.sleep((intento + 1) * 8)
                else:
                    return None
            except:
                if intento < self.max_retries - 1:
                    time.sleep((2 ** intento) + random.uniform(0.5, 1.5))
                else:
                    return None
        return None
    
    def obtener_animes_directorio(self, paginas: int = 5) -> List[Dict]:
        """Obtiene animes del directorio"""
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
                            'estado': anime.get('status', ''),
                        })
            time.sleep(1)
        return animes
    
    def obtener_animes_existentes(self) -> Dict[str, Dict]:
        """Obtiene todos los animes en BD con su conteo de episodios"""
        animes = self.supabase.table('animes').select('id', 'titulo').execute()
        resultado = {}
        
        for anime in animes.data:
            temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime['id']).execute()
            total_eps = 0
            for t in temps.data:
                eps = self.supabase.table('episodios').select('id').eq('temporada_id', t['id']).execute()
                total_eps += len(eps.data)
            
            resultado[anime['titulo']] = {
                'id': anime['id'],
                'total_episodios': total_eps
            }
        
        return resultado
    
    def obtener_popularidad_anilist(self, titulo: str, cache: Dict) -> int:
        """
        Obtiene la popularidad de un anime desde AniList
        Retorna: 0-100 (mayor = más popular)
        Usa caché para no repetir peticiones
        """
        # Verificar caché
        if titulo in cache.get('popularidad', {}):
            return cache['popularidad'][titulo]
        
        try:
            query = """
            query ($search: String) {
              Media(search: $search, type: ANIME) {
                popularity
                averageScore
              }
            }
            """
            response = requests.post(
                'https://graphql.anilist.co',
                json={'query': query, 'variables': {'search': titulo[:50]}},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                media = data.get('data', {}).get('Media')
                if media:
                    pop = media.get('popularity', 10000)
                    score = media.get('averageScore', 50)
                    # Combinar popularidad y score en 0-100
                    popularidad = max(0, min(100, 100 - (pop / 100) + (score / 10)))
                    
                    # Guardar en caché
                    cache['popularidad'][titulo] = popularidad
                    return popularidad
        except:
            pass
        
        cache['popularidad'][titulo] = 0
        return 0
    
    def sincronizar_anime_inteligente(self, anime_info: Dict, cache: Dict):
        """
        Sincroniza un anime SOLO si tiene episodios nuevos
        """
        titulo = anime_info.get('titulo', '')
        slug = anime_info.get('slug', '')
        popularidad = anime_info.get('popularidad', 0)
        
        # Verificar si ya lo procesamos recientemente
        ultimo = cache['animes_procesados'].get(titulo, {}).get('fecha')
        if ultimo:
            fecha_ultima = datetime.fromisoformat(ultimo)
            if datetime.now() - fecha_ultima < timedelta(hours=12):
                self.estadisticas['animes_omitidos'] += 1
                return
        
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
            
            # Obtener episodios de la API
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
            
            # Buscar anime en BD
            existing = self.supabase.table('animes').select('id').eq('titulo', titulo).execute()
            
            if existing.data:
                anime_id = existing.data[0]['id']
                
                # Contar episodios existentes
                temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).execute()
                eps_existentes = 0
                temporada_id = None
                for t in temps.data:
                    eps = self.supabase.table('episodios').select('id').eq('temporada_id', t['id']).execute()
                    eps_existentes += len(eps.data)
                    if not temporada_id:
                        temporada_id = t['id']
                
                # Si no hay episodios nuevos, omitir
                if len(episodios) <= eps_existentes:
                    self.estadisticas['animes_omitidos'] += 1
                    cache['animes_procesados'][titulo] = {
                        'fecha': datetime.now().isoformat(),
                        'total_episodios': len(episodios)
                    }
                    return
                
                # Solo agregar episodios NUEVOS
                nuevos = [n for n in episodios if n > eps_existentes]
                if nuevos:
                    print(f'  🆕 {titulo[:40]}... → {len(nuevos)} eps nuevos (Pop: {popularidad:.0f})')
                
                for ep_num in nuevos:
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
                            self.estadisticas['episodios_nuevos'] += 1
                    
                    time.sleep(1)
            else:
                # Anime totalmente nuevo
                self.estadisticas['animes_nuevos'] += 1
                print(f'  ➕ {titulo[:40]}... → {len(episodios)} eps (Pop: {popularidad:.0f})')
                
                result = self.supabase.table('animes').insert({
                    'titulo': titulo,
                    'sinopsis': anime_info.get('sinopsis', ''),
                    'portada_url': anime_info.get('portada_url', ''),
                    'banner_url': anime_info.get('portada_url', '')
                }).execute()
                anime_id = result.data[0]['id'] if result.data else None
                
                if anime_id:
                    temp_result = self.supabase.table('temporadas').insert({
                        'anime_id': anime_id,
                        'nombre': 'Temporada 1',
                        'orden': 1,
                        'anio_lanzamiento': 2024
                    }).execute()
                    temporada_id = temp_result.data[0]['id'] if temp_result.data else None
                    
                    if temporada_id:
                        for ep_num in episodios:
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
                                    self.estadisticas['episodios_nuevos'] += 1
                            
                            time.sleep(1)
            
            # Guardar en caché
            cache['animes_procesados'][titulo] = {
                'fecha': datetime.now().isoformat(),
                'total_episodios': len(episodios)
            }
            
        except Exception as e:
            self.estadisticas['errores'] += 1
            print(f'  ❌ {titulo[:40]}... → {str(e)[:40]}')
    
    def ejecutar(self):
        print(f'🤖 Bot Ectosimbionte v6 - Definitivo')
        print(f'📅 {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        print()
        
        cache = self._cargar_cache()
        
        print('📚 Obteniendo directorio...')
        animes = self.obtener_animes_directorio(paginas=5)
        
        existentes = self.obtener_animes_existentes()
        
        print(f'📚 Directorio: {len(animes)} animes')
        print(f'💾 En BD: {len(existentes)} animes')
        print()
        
        # Clasificar
        animes_activos = [a for a in animes if a.get('estado') == 'currently']
        animes_finalizados = [a for a in animes if a.get('estado') == 'finished']
        
        print(f'🟢 En emisión: {len(animes_activos)}')
        print(f'⚪ Finalizados: {len(animes_finalizados)}')
        print()
        
        # Verificar animes activos en BD (eps nuevos)
        activos_en_bd = [a for a in animes_activos if a['titulo'] in existentes]
        activos_nuevos = [a for a in animes_activos if a['titulo'] not in existentes]
        finalizados_nuevos = [a for a in animes_finalizados if a['titulo'] not in existentes]
        
        # 1. Verificar activos en BD
        print(f'🔄 Verificando {len(activos_en_bd)} animes activos...')
        for anime in activos_en_bd[:10]:
            self.sincronizar_anime_inteligente(anime, cache)
            time.sleep(1)
        
        # 2. Obtener popularidad para NUEVOS
        candidatos = activos_nuevos[:20] + finalizados_nuevos[:20]
        
        if candidatos:
            print(f'\n📊 Obteniendo popularidad de {len(candidatos)} animes...')
            for anime in candidatos:
                anime['popularidad'] = self.obtener_popularidad_anilist(anime['titulo'], cache)
                time.sleep(0.3)
            
            # Ordenar por popularidad
            candidatos.sort(key=lambda x: x.get('popularidad', 0), reverse=True)
            
            # Mostrar top 10
            print(f'\n🏆 Top 10 más populares:')
            for a in candidatos[:10]:
                print(f'  {a["titulo"][:45]}... → Pop: {a.get("popularidad", 0):.0f}')
                self.estadisticas['populares_encontrados'] += 1
            
            # 3. Sincronizar los más populares
            print(f'\n🆕 Sincronizando {min(10, len(candidatos))} animes populares...')
            for anime in candidatos[:10]:
                self.sincronizar_anime_inteligente(anime, cache)
                time.sleep(1)
        
        # Guardar caché
        cache['ultima_ejecucion'] = datetime.now().isoformat()
        self._guardar_cache(cache)
        
        # Estadísticas
        tiempo = (datetime.now() - self.estadisticas['tiempo_inicio']).total_seconds()
        print(f'\n{"="*50}')
        print(f'📊 ESTADÍSTICAS')
        print(f'{"="*50}')
        print(f'  ➕ Animes nuevos: {self.estadisticas["animes_nuevos"]}')
        print(f'  🆕 Episodios nuevos: {self.estadisticas["episodios_nuevos"]}')
        print(f'  🏆 Populares encontrados: {self.estadisticas["populares_encontrados"]}')
        print(f'  ⏭️ Omitidos: {self.estadisticas["animes_omitidos"]}')
        print(f'  ❌ Errores: {self.estadisticas["errores"]}')
        print(f'  ⏱️ Tiempo: {tiempo:.1f}s')
        print(f'{"="*50}')

if __name__ == "__main__":
    bot = EctosimbionteBot()
    bot.ejecutar()
