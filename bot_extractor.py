import asyncio
from playwright.async_api import async_playwright
from supabase import create_client

SUPABASE_URL = "https://uftfbidzobftjbonziql.supabase.co"
SUPABASE_KEY = "sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp"
db = create_client(SUPABASE_URL, SUPABASE_KEY)

async def extraer_link_real(ep_id, url_jkanime):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Lista para guardar el link real
        link_final = []

        # Esta función "escucha" todo lo que carga la página
        page.on("request", lambda request: (
            link_final.append(request.url) if "m3u8" in request.url else None
        ))

        print(f"🕵️‍♂️ Navegando a {url_jkanime}...")
        await page.goto(url_jkanime, wait_until="networkidle")
        
        # Esperamos unos segundos a que el reproductor inicie el stream
        await asyncio.sleep(5) 
        
        await browser.close()
        
        return link_final[0] if link_final else None

async def main():
    # Traemos los episodios actuales
    episodios = db.table("episodios").select("*").execute().data
    
    for ep in episodios:
        # Aquí debes poner la URL de JK Anime real del episodio
        # (Esto es un ejemplo, podrías automatizar la construcción de la URL)
        print(f"🎬 Procesando episodio {ep['numero']}...")
        
        # En la vida real, necesitarías construir la URL base según el episodio
        # Por ahora, probemos con uno específico para ver si captura el .m3u8
        link = await extraer_link_real(ep['id'], ep['url_stream'])
        
        if link:
            print(f"✅ LINK REAL ENCONTRADO: {link}")
            # db.table("episodios").update({"url_stream": link}).eq("id", ep['id']).execute()
        else:
            print(f"❌ No se pudo capturar el link m3u8.")

asyncio.run(main())