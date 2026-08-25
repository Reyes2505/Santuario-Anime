import os
import requests
import re
from supabase import create_client, Client

# Credenciales de Supabase
SUPABASE_URL = "https://uftfbidzobftjbonziql.supabase.co"
SUPABASE_KEY = "sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp"

def parche_cour2():
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Filtramos la base de datos para traer SOLO del episodio 12 en adelante
    respuesta = db.table("episodios").select("*").gte("numero", 12).execute()
    episodios = respuesta.data
    
    cabeceras = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    print("\n🛠️ Aplicando parche definitivo para el Cour 2 de Mushoku Tensei...")
    
    actualizados = 0
    for ep in episodios:
        # Matemática simple: el Ep 12 global es el Ep 1 de la Parte 2 en JK Anime
        numero_interno = ep['numero'] - 11 
        
        # Usamos el enlace EXACTO que descubriste
        url_escaneo = f"https://jkanime.net/mushoku-tensei-isekai-ittara-honki-dasu-2nd-season/{numero_interno}/"
        
        resp = requests.get(url_escaneo, headers=cabeceras)
        
        # Si la página existe, buscamos el reproductor
        if resp.status_code == 200:
            enlaces_ocultos = re.findall(r'src="(https://[^"]+)"', resp.text)
            
            link_video = None
            for enlace in enlaces_ocultos:
                if ".js" in enlace:
                    continue
                if "jkplayer" in enlace or ".php" in enlace or "desu" in enlace:
                    link_video = enlace
                    break 
            
            if link_video:
                # Actualizamos Supabase con el enlace puro
                db.table("episodios").update({"url_stream": link_video}).eq("id", ep['id']).execute()
                print(f"✅ Ep {ep['numero']} (Cour 2, Ep {numero_interno}) reparado -> {link_video}")
                actualizados += 1
            else:
                print(f"⚠️ No se encontró reproductor en el Ep {ep['numero']}")
        else:
            print(f"🔴 Error 404: La URL {url_escaneo} no existe.")
                
    print(f"\n🎉 ¡Parche completado! {actualizados} episodios de la Parte 2 arreglados.")

if __name__ == "__main__":
    parche_cour2()