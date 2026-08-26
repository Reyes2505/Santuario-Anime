#!/usr/bin/env python3
"""
Bot Ectosimbionte v8 - Self-Healing
- Auto-reparación de URLs obsoletas
- Actualización automática de tokens expirados
- Batch insert para nuevos episodios
- Validación y refresco de enlaces
"""

import os
import sys
import requests
from bs4 import BeautifulSoup
from supabase import create_client
import re
import time
import json
import random
import logging
from typing import List, Dict, Optional, Any, Set
from datetime import datetime, timedelta

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

class EctosimbionteBot:
    def __init__(self) -> None:
        self.config: Dict[str, str] = self._load_config()
        self.supabase = create_client(
            self.config.get('SUPABASE_URL', ''),
            self.config.get('SUPABASE_ANON_KEY', '')
        )
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        })
        
        self.base_url: str = "https://jkanime.net"
        self.max_retries: int = 3
        self.base_delay: float = 0.5
        self.cache_file: str = '.bot_cache.json'
        self.cache_ttl_hours: int = 12
        
        self.stats: Dict[str, Any] = {
            'animes_nuevos': 0,
            'episodios_nuevos': 0,
            'urls_actualizadas': 0,
            'animes_omitidos': 0,
            'm3u8_extraidas': 0,
            'jkplayer_fallbacks': 0,
            'errores': 0,
            'tiempo_inicio': datetime.now()
        }
    
    def _load_config(self) -> Dict[str, str]:
        config: Dict[str, str] = {
            'SUPABASE_URL': os.environ.get('SUPABASE_URL', ''),
            'SUPABASE_ANON_KEY': os.environ.get('SUPABASE_ANON_KEY', ''),
        }
        
        if not config['SUPABASE_URL']:
            try:
                with open('.env.local', 'r') as f:
                    for line in f:
                        line = line.strip()
                        if '=' in line and not line.startswith('#'):
                            key, value = line.split('=', 1)
                            config[key] = value.strip()
            except FileNotFoundError:
                pass
        
        return config
    
    def _load_cache(self) -> Dict[str, Any]:
        default: Dict[str, Any] = {
            'animes_procesados': {},
            'popularidad': {},
            'm3u8_cache': {},
            'ultima_ejecucion': None
        }
        
        try:
            with open(self.cache_file, 'r') as f:
                cache: Dict[str, Any] = json.load(f)
                for key in default:
                    if key not in cache:
                        cache[key] = default[key]
                return cache
        except (FileNotFoundError, json.JSONDecodeError):
            return default
    
    def _save_cache(self, cache: Dict[str, Any]) -> None:
        try:
            with open(self.cache_file, 'w') as f:
                json.dump(cache, f, indent=2)
        except Exception as e:
            logger.error(f'Error guardando caché: {e}')
    
    def _request_with_retry(
        self,
        method: str,
        url: str,
        **kwargs: Any
    ) -> Optional[requests.Response]:
        for intento in range(self.max_retries):
            try:
                response = self.session.request(method, url, timeout=15, **kwargs)
                if response.status_code == 200:
                    return response
                elif response.status_code == 429:
                    wait: float = (intento + 1) * 5 + random.uniform(1, 3)
                    logger.warning(f'Rate limited. Esperando {wait:.0f}s')
                    time.sleep(wait)
                elif response.status_code == 404:
                    return None
                else:
                    return response
            except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
                logger.warning(f'Error en {url[:50]}...: {e}')
            except Exception as e:
                logger.warning(f'Error inesperado: {e}')
            
            if intento < self.max_retries - 1:
                time.sleep((2 ** intento) + random.uniform(0.2, 0.8))
        
        return None
    
    def _extract_m3u8(self, jkplayer_url: str, cache: Dict[str, Any]) -> str:
        m3u8_cache: Dict[str, Any] = cache.get('m3u8_cache', {})
        if jkplayer_url in m3u8_cache:
            cached = m3u8_cache[jkplayer_url]
            fecha = datetime.fromisoformat(cached.get('fecha', datetime.now().isoformat()))
            if datetime.now() - fecha < timedelta(hours=6):
                m3u8_cached: str = cached.get('m3u8', '')
                if m3u8_cached:
                    return m3u8_cached
        
        response = self._request_with_retry('GET', jkplayer_url)
        if not response:
            return jkplayer_url
        
        m3u8_match = re.search(
            r'https?://[^\s"\'<>]+\.m3u8[^\s"\'<>]*',
            response.text
        )
        
        if m3u8_match:
            m3u8_url: str = m3u8_match.group(0)
            m3u8_cache[jkplayer_url] = {
                'm3u8': m3u8_url,
                'fecha': datetime.now().isoformat()
            }
            cache['m3u8_cache'] = m3u8_cache
            self.stats['m3u8_extraidas'] += 1
            return m3u8_url
        
        self.stats['jkplayer_fallbacks'] += 1
        return jkplayer_url
    
    def _get_reproductor_url(self, slug: str, ep_num: int) -> str:
        ep_url = f"{self.base_url}/{slug}/{ep_num}/"
        response = self._request_with_retry('GET', ep_url)
        if not response:
            return ''
        
        soup = BeautifulSoup(response.content, 'html.parser')
        for script in soup.find_all('script'):
            if script.string:
                match = re.search(
                    r'https?://jkanime\.net/jkplayer/um\?e=[^\s"\']+',
                    script.string
                )
                if match:
                    return match.group(0)
        return ''
    
    def _get_episodios(self, jk_id: int, csrf: str) -> List[int]:
        episodios: List[int] = []
        pagina: int = 1
        
        while pagina <= 15:
            r = self._request_with_retry(
                'POST',
                f"{self.base_url}/ajax/episodes/{jk_id}/{pagina}",
                data={'_token': csrf}
            )
            if not r:
                break
            
            try:
                data = r.json()
                if not data or 'data' not in data or not data['data']:
                    break
                
                for ep in data['data']:
                    num: int = ep.get('number', 0)
                    if num > 0:
                        episodios.append(num)
                
                total: int = data.get('total', 0)
                if pagina * 16 >= total:
                    break
                pagina += 1
            except (json.JSONDecodeError, KeyError, TypeError):
                break
            
            time.sleep(self.base_delay)
        
        return sorted(set(episodios))
    
    def obtener_animes_directorio(self, paginas: int = 5) -> List[Dict[str, Any]]:
        animes: List[Dict[str, Any]] = []
        for pagina in range(1, paginas + 1):
            response = self._request_with_retry('GET', f"{self.base_url}/directorio?p={pagina}")
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
            time.sleep(0.5)
        return animes
    
    def obtener_animes_existentes(self) -> Dict[str, Dict[str, Any]]:
        try:
            response = self.supabase.table('animes').select(
                'id, titulo, temporadas(id, episodios(numero))'
            ).execute()
            
            resultado: Dict[str, Dict[str, Any]] = {}
            data = response.data
            
            if not data or not isinstance(data, list):
                return resultado
                
            for anime_item in data:
                if not isinstance(anime_item, dict):
                    continue
                    
                titulo = anime_item.get('titulo')
                anime_id = anime_item.get('id')
                
                if not titulo or not anime_id:
                    continue
                    
                total_eps = 0
                temporadas = anime_item.get('temporadas', [])
                
                if isinstance(temporadas, list):
                    for temp in temporadas:
                        if isinstance(temp, dict):
                            eps = temp.get('episodios', [])
                            if isinstance(eps, list):
                                total_eps += len(eps)
                
                resultado[str(titulo)] = {
                    'id': str(anime_id),
                    'total_episodios': total_eps
                }
            return resultado
        except Exception as e:
            logger.error(f'Error obteniendo animes existentes: {e}')
            return {}
    
    def obtener_popularidad_anilist(self, titulo: str, cache: Dict[str, Any]) -> int:
        if titulo in cache.get('popularidad', {}):
            return int(cache['popularidad'][titulo])
        
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
                timeout=8
            )
            
            if response.status_code == 200:
                data = response.json()
                media = data.get('data', {}).get('Media')
                if media:
                    pop = int(media.get('popularity', 10000))
                    score = int(media.get('averageScore', 50))
                    popularidad = max(0, min(100, 100 - (pop // 100) + (score // 10)))
                    cache.setdefault('popularidad', {})[titulo] = popularidad
                    return popularidad
        except:
            pass
        
        cache.setdefault('popularidad', {})[titulo] = 0
        return 0

    def sync_anime(self, anime_info: Dict[str, Any], cache: Dict[str, Any]) -> None:
        titulo: str = anime_info.get('titulo', '')
        slug: str = anime_info.get('slug', '')
        
        ultimo = cache.get('animes_procesados', {}).get(titulo, {}).get('fecha')
        if ultimo:
            fecha_ultima = datetime.fromisoformat(ultimo)
            if datetime.now() - fecha_ultima < timedelta(hours=self.cache_ttl_hours):
                self.stats['animes_omitidos'] += 1
                return
        
        try:
            response = self._request_with_retry('GET', f"{self.base_url}/{slug}/")
            if not response:
                return
            
            soup = BeautifulSoup(response.content, 'html.parser')
            meta = soup.find('meta', {'name': 'csrf-token'})
            csrf: str = meta.get('content', '') if meta else ''
            
            match = re.search(r'ajax/episodes/(\d+)/', response.text)
            if not match:
                return
            jk_id: int = int(match.group(1))
            
            episodios_web = self._get_episodios(jk_id, csrf)
            if not episodios_web:
                return
            
            existing = self.supabase.table('animes').select('id').eq('titulo', titulo).execute()
            if existing.data:
                anime_id: str = existing.data[0]['id']
            else:
                result = self.supabase.table('animes').insert({
                    'titulo': titulo,
                    'sinopsis': anime_info.get('sinopsis', ''),
                    'portada_url': anime_info.get('portada_url', ''),
                    'banner_url': anime_info.get('portada_url', '')
                }).execute()
                
                if result.data:
                    anime_id = result.data[0]['id']
                    self.stats['animes_nuevos'] += 1
                    print(f'  {titulo[:40]}... -> {len(episodios_web)} eps')
                else:
                    return
            
            temps = self.supabase.table('temporadas').select('id').eq('anime_id', anime_id).limit(1).execute()
            if temps.data:
                temporada_id: str = temps.data[0]['id']
            else:
                temp_result = self.supabase.table('temporadas').insert({
                    'anime_id': anime_id,
                    'nombre': 'Temporada 1',
                    'orden': 1,
                    'anio_lanzamiento': 2024
                }).execute()
                
                if temp_result.data:
                    temporada_id = temp_result.data[0]['id']
                else:
                    return
            
            # Self-Healing: Cargar episodios existentes con URLs
            eps_db_res = self.supabase.table('episodios').select('id, numero, url_stream').eq('temporada_id', temporada_id).execute()
            
            episodios_mapa_db = {}
            if eps_db_res.data:
                for ep in eps_db_res.data:
                    episodios_mapa_db[ep['numero']] = {
                        'id': ep['id'],
                        'url_stream': ep.get('url_stream', '')
                    }
            
            nuevos_episodios_batch = []
            
            for ep_num in episodios_web:
                jkplayer_url = self._get_reproductor_url(slug, ep_num)
                if not jkplayer_url:
                    continue
                
                url_final = self._extract_m3u8(jkplayer_url, cache)
                
                if ep_num in episodios_mapa_db:
                    db_info = episodios_mapa_db[ep_num]
                    if not db_info['url_stream'] or db_info['url_stream'] != url_final:
                        self.supabase.table('episodios').update({
                            'url_stream': url_final
                        }).eq('id', db_info['id']).execute()
                        self.stats['urls_actualizadas'] += 1
                else:
                    nuevos_episodios_batch.append({
                        'temporada_id': temporada_id,
                        'numero': ep_num,
                        'titulo': f'Episodio {ep_num}',
                        'url_stream': url_final,
                        'visto': False
                    })
                    self.stats['episodios_nuevos'] += 1
                
                time.sleep(0.1)
            
            if nuevos_episodios_batch:
                self.supabase.table('episodios').insert(nuevos_episodios_batch).execute()
            
            cache.setdefault('animes_procesados', {})[titulo] = {
                'fecha': datetime.now().isoformat(),
                'total_episodios': len(episodios_web)
            }
            
        except Exception as e:
            self.stats['errores'] += 1
            logger.error(f'Error sincronizando {titulo[:40]}: {e}')
    
    def run(self) -> None:
        logger.info('Bot Ectosimbionte v8 (Self-Healing)')
        logger.info(f'Fecha: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}')
        
        cache = self._load_cache()
        
        logger.info('Obteniendo directorio...')
        animes = self.obtener_animes_directorio(paginas=3)
        
        logger.info('Consultando registro existente...')
        existentes = self.obtener_animes_existentes()
        
        logger.info(f'Directorio: {len(animes)} | BD: {len(existentes)}')
        
        activos = [a for a in animes if a.get('estado') == 'currently']
        finalizados = [a for a in animes if a.get('estado') == 'finished']
        
        activos_en_bd = [a for a in activos if a['titulo'] in existentes]
        activos_nuevos = [a for a in activos if a['titulo'] not in existentes]
        finalizados_nuevos = [a for a in finalizados if a['titulo'] not in existentes]
        
        for anime in activos_en_bd[:5]:
            self.sync_anime(anime, cache)
            time.sleep(0.5)
        
        candidatos = activos_nuevos[:10] + finalizados_nuevos[:10]
        if candidatos:
            for anime in candidatos:
                anime['popularidad'] = self.obtener_popularidad_anilist(anime['titulo'], cache)
                time.sleep(0.2)
            
            candidatos.sort(key=lambda x: float(x.get('popularidad', 0)), reverse=True)
            for anime in candidatos[:5]:
                self.sync_anime(anime, cache)
                time.sleep(0.5)
        
        cache['ultima_ejecucion'] = datetime.now().isoformat()
        self._save_cache(cache)
        
        tiempo = (datetime.now() - self.stats['tiempo_inicio']).total_seconds()
        logger.info(f'\n{"="*50}')
        logger.info(f'ESTADISTICAS')
        logger.info(f'{"="*50}')
        logger.info(f'  Animes: {self.stats["animes_nuevos"]}')
        logger.info(f'  Episodios: {self.stats["episodios_nuevos"]}')
        logger.info(f'  URLs Actualizadas: {self.stats["urls_actualizadas"]}')
        logger.info(f'  M3U8: {self.stats["m3u8_extraidas"]}')
        logger.info(f'  Omitidos: {self.stats["animes_omitidos"]}')
        logger.info(f'  Errores: {self.stats["errores"]}')
        logger.info(f'  Tiempo: {tiempo:.1f}s')
        logger.info(f'{"="*50}')

if __name__ == "__main__":
    bot = EctosimbionteBot()
    bot.run()
