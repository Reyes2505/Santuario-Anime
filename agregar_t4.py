import requests
from bs4 import BeautifulSoup
from supabase import create_client
import re
import time

config = {}
with open('.env.local', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, value = line.strip().split('=', 1)
            config[key] = value

supabase = create_client(
    config.get('SUPABASE_URL', config.get('NEXT_PUBLIC_SUPABASE_URL', '')),
    config.get('SUPABASE_ANON_KEY', config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', ''))
)
session = requests.Session()
session.headers.update({'User-Agent': 'Mozilla/5.0'})

# Buscar Re:Zero existente
rezero = supabase.table('animes').select('id').eq('titulo', 'Re:Zero kara Hajimeru Isekai Seikatsu').execute()
anime_id = rezero.data[0]['id']
print(f'Re:Zero ID: {anime_id[:8]}...')

slug = 'rezero-kara-hajimeru-isekai-seikatsu-4th-season'
jk_id = 4639

# Crear temporada T4
temp_result = supabase.table('temporadas').insert({
    'anime_id': anime_id,
    'nombre': 'Temporada 4',
    'orden': 6,
    'anio_lanzamiento': 2026
}).execute()
temporada_id = temp_result.data[0]['id']
print(f'Temporada creada: {temporada_id[:8]}...')

# Obtener CSRF
response = session.get(f'https://jkanime.net/{slug}/', timeout=15)
soup = BeautifulSoup(response.content, 'html.parser')
meta = soup.find('meta', {'name': 'csrf-token'})
csrf = meta.get('content', '') if meta else ''

# Obtener episodios
episodios = []
pagina = 1
while True:
    r = session.post(f'https://jkanime.net/ajax/episodes/{jk_id}/{pagina}', data={'_token': csrf}, timeout=15)
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
    time.sleep(0.3)

print(f'Episodios: {len(episodios)}')

# Guardar episodios
for ep_num in episodios:
    url_ep = f'https://jkanime.net/{slug}/{ep_num}/'
    r_ep = session.get(url_ep, timeout=15)
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
        supabase.table('episodios').insert({
            'temporada_id': temporada_id,
            'numero': ep_num,
            'titulo': f'Episodio {ep_num}',
            'url_stream': url_reproductor,
            'visto': False
        }).execute()
        print(f'  EP{ep_num} ✅')
    
    time.sleep(1)

print('\n✅ T4 agregada correctamente')
