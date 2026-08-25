import os
import re
from pathlib import Path
from supabase import create_client

# Leer configuración
def leer_configuracion():
    config = {}
    with open('santuario-ui/.env.local', 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, value = line.strip().split('=', 1)
                config[key] = value
    return config

config = leer_configuracion()
url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

print("🔌 Conectando a Supabase...")
supabase = create_client(url, key)
print("✅ Conectado")

# Recorrer videos locales
videos_path = Path("public/videos")
print(f"\n📁 Buscando videos en: {videos_path}")

for anime_folder in videos_path.iterdir():
    if not anime_folder.is_dir():
        continue
    
    anime_slug = anime_folder.name
    print(f"\n🎬 Procesando anime: {anime_slug}")
    
    # 1. Buscar o crear anime (sin campo estado)
    anime = supabase.table('animes').select('id').eq('titulo', anime_slug.replace('-', ' ').title()).execute()
    
    if not anime.data:
        print(f"  ➕ Creando anime...")
        anime = supabase.table('animes').insert({
            'titulo': anime_slug.replace('-', ' ').title(),
            'sinopsis': 'Pendiente de actualizar'
        }).execute()
        print(f"  ✅ Anime creado")
    else:
        print(f"  ✅ Anime encontrado")
    
    anime_id = anime.data[0]['id']
    
    # 2. Buscar o crear temporada
    temporada = supabase.table('temporadas')\
        .select('id')\
        .eq('anime_id', anime_id)\
        .eq('nombre', 'Temporada 1')\
        .execute()
    
    if not temporada.data:
        print(f"  ➕ Creando temporada 1...")
        temporada = supabase.table('temporadas').insert({
            'anime_id': anime_id,
            'nombre': 'Temporada 1',
            'orden': 1,
            'anio_lanzamiento': 2024
        }).execute()
        print(f"  ✅ Temporada creada")
    else:
        print(f"  ✅ Temporada encontrada")
    
    temporada_id = temporada.data[0]['id']
    
    # 3. Procesar episodios
    videos = sorted(anime_folder.glob("ep*.mp4"))
    print(f"  📹 Encontrados {len(videos)} episodios")
    
    for video in videos:
        match = re.search(r'ep(\d+)', video.name)
        if match:
            ep_num = int(match.group(1))
            
            episode_data = {
                'temporada_id': temporada_id,
                'numero': ep_num,
                'titulo': f"Episodio {ep_num}",
                'url_stream': f"/videos/{anime_slug}/{video.name}",
                'visto': False
            }
            
            # Verificar si existe
            existing = supabase.table('episodios')\
                .select('id')\
                .eq('temporada_id', temporada_id)\
                .eq('numero', ep_num)\
                .execute()
            
            if existing.data:
                supabase.table('episodios').update(episode_data).eq('id', existing.data[0]['id']).execute()
                print(f"  ✅ Actualizado: EP{ep_num}")
            else:
                supabase.table('episodios').insert(episode_data).execute()
                print(f"  ➕ Insertado: EP{ep_num}")

print("\n🎉 ¡Base de datos actualizada!")
