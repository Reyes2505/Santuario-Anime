from supabase import create_client

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

# Buscar TODOS los Re:Zero
rezeros = supabase.table('animes').select('*').eq('titulo', 'Re:Zero kara Hajimeru Isekai Seikatsu').execute()

print(f'Re:Zero encontrados: {len(rezeros.data)}')

for r in rezeros.data:
    anime_id = r['id']
    temps = supabase.table('temporadas').select('*').eq('anime_id', anime_id).execute()
    total_eps = 0
    for t in temps.data:
        eps = supabase.table('episodios').select('id').eq('temporada_id', t['id']).execute()
        total_eps += len(eps.data)
    print(f'  ID: {anime_id} → {len(temps.data)} temps, {total_eps} eps')
