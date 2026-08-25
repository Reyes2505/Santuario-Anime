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

# Eliminar Re:Zero viejo
viejo_id = '8ba2979d-4731-4671-b0d5-4b80b9b8ff4f'

# Eliminar temporadas y episodios
temps = supabase.table('temporadas').select('id').eq('anime_id', viejo_id).execute()
for t in temps.data:
    eps = supabase.table('episodios').select('id').eq('temporada_id', t['id']).execute()
    for ep in eps.data:
        supabase.table('episodios').delete().eq('id', ep['id']).execute()
    supabase.table('temporadas').delete().eq('id', t['id']).execute()
    print(f'  Eliminada temporada: {t.get("nombre", "?")}')

# Eliminar anime
supabase.table('animes').delete().eq('id', viejo_id).execute()
print('✅ Re:Zero viejo eliminado')
