from supabase import create_client
from pathlib import Path

# Leer configuración
config = {}
with open('santuario-ui/.env.local', 'r') as f:
    for line in f:
        if '=' in line and not line.startswith('#'):
            key, value = line.strip().split('=', 1)
            config[key] = value

url = config.get('NEXT_PUBLIC_SUPABASE_URL', '')
key = config.get('NEXT_PUBLIC_SUPABASE_ANON_KEY', '')

print("URL:", url)
print("KEY (primeros 20 caracteres):", key[:20] + "...")
print()

try:
    supabase = create_client(url, key)
    result = supabase.table('animes').select('*').limit(1).execute()
    print("✅ Conexión exitosa!")
    print("Datos encontrados:", len(result.data))
except Exception as e:
    print("❌ Error:", e)
