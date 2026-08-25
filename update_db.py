import asyncio
from playwright.async_api import async_playwright
from supabase import create_client

SUPABASE_URL = "https://uftfbidzobftjbonziql.supabase.co"
SUPABASE_KEY = "sb_publishable_f164t_IUImfvLzYxUYp-wQ_ZKqbBFAp"
db = create_client(SUPABASE_URL, SUPABASE_KEY)

async def actualizar_episodio(ep_id, url_jkanime):
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        link_encontrado = []
        
        page.on("request", lambda request: (
            link_encontrado.append(request.url) if ".m3u8" in request.url else None
        ))

        print(f"🕵️‍♂️ Buscando link en: {url_jkanime}")
        await page.goto(url_jkanime, wait_until="networkidle")
        await asyncio.sleep(5) 
        await browser.close()

        if link_encontrado:
            url_real = link_encontrado[0]
            print(f"✅ ¡ENCONTRADO! Link: {url_real}")
            db.table("episodios").update({"url_stream": url_real}).eq("id", ep_id).execute()
            print(f"🚀 ¡Base de datos actualizada!")
        else:
            print(f"❌ No encontré el video, intenta de nuevo.")

# --- AQUÍ ESTÁ LA ACCIÓN ---
# Sustituye el ID de abajo por un ID real que tengas en tu base de datos:
asyncio.run(actualizar_episodio('a184caae-eff0-4e20-8953-f8a7c4a32e6a', 'https://jkanime.net/mushoku-tensei-isekai-ittara-honki-dasu/1/'))