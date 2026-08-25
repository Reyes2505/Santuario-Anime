import os
import requests
import re
from supabase import create_client, Client

# Credenciales de Supabase
SUPABASE_URL = "https://uftfbidzobftjbonziql.supabase.co"
SUPABASE_KEY = "sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp"

def corregir_enlaces():
    db = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # Traemos los episodios de la base de datos
    respuesta = db.table("episodios").select("*").execute()
    episodios = respuesta.data
    
    cabeceras = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    
    print("\n🕵️‍♂️ Iniciando misión de corrección de servidores...")
    
    actualizados = 0
    for ep in episodios:
        # IMPORTANTE: Reconstruimos la URL original de JK Anime para volver a escanear
        url_escaneo = f"https://jkanime.net/mushoku-tensei-isekai-ittara-honki-dasu/{ep['numero']}/"
        
        resp = requests.get(url_escaneo, headers=cabeceras)
        
        # Buscamos todos los enlaces fuente
        enlaces_ocultos = re.findall(r'src="(https://[^"]+)"', resp.text)
        
        link_video = None
        for enlace in enlaces_ocultos:
            # REGLA DE ORO: Si es un archivo .js, lo ignoramos por completo
            if ".js" in enlace:
                continue
                
            # Buscamos los verdaderos reproductores
            if "jkplayer" in enlace or ".php" in enlace or "desu" in enlace:
                link_video = enlace
                break 
        
        if link_video:
            # Actualizamos la base de datos reparando el error
            db.table("episodios").update({"url_stream": link_video}).eq("id", ep['id']).execute()
            print(f"✅ Ep {ep['numero']} reparado -> {link_video}")
            actualizados += 1
        else:
            print(f"⚠️ No se encontró reproductor en el Ep {ep['numero']}")
                
    print(f"\n🎉 ¡Todo listo! {actualizados} episodios han sido reparados y validados.")

if __name__ == "__main__":
    corregir_enlaces()