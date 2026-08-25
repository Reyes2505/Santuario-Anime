import os
from supabase import create_client, Client

# Credenciales de Supabase
SUPABASE_URL = "https://uftfbidzobftjbonziql.supabase.co"
SUPABASE_KEY = "sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp"

def iniciar_conexion() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_KEY)

def inyectar_episodios():
    db = iniciar_conexion()
    url_base = "https://jkanime.net/mushoku-tensei-isekai-ittara-honki-dasu/"
    total_episodios = 23 # Los capítulos totales de la Temporada 1
    
    print(f"\n🕵️‍♂️ Plan B activado: Generando {total_episodios} enlaces algorítmicamente...")
    
    # 1. Obtenemos el ID de la "Temporada 1"
    res_temp = db.table("temporadas").select("id").eq("nombre", "Temporada 1 (Cours 1 y 2)").execute()
    
    if not res_temp.data:
        print("🔴 Error: No se encontró la Temporada 1 en la base de datos.")
        return
        
    temporada_id = res_temp.data[0]['id']
    nuevos = 0
    
    # 2. Bucle for para crear del episodio 1 al 23
    for num in range(1, total_episodios + 1):
        link_exacto = f"{url_base}{num}/"
        
        # Revisamos si ya existe para no duplicar
        existe = db.table("episodios").select("id").eq("temporada_id", temporada_id).eq("numero", num).execute()
        
        if not existe.data:
            db.table("episodios").insert({
                "temporada_id": temporada_id,
                "numero": num,
                "titulo": f"Episodio {num}",
                "url_stream": link_exacto
            }).execute()
            nuevos += 1
            print(f"✅ Inyectado: Episodio {num} -> {link_exacto}")
            
    print(f"\n🎉 ¡Misión cumplida! Se agregaron {nuevos} episodios de Mushoku Tensei a tu plataforma.")

if __name__ == "__main__":
    inyectar_episodios()