import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        # Lanzamos el navegador (headless=False nos permite verlo, 
        # pero para el bot final lo pondremos en True)
        browser = await p.chromium.launch(headless=False) 
        
        # Simulamos un navegador real con un User-Agent
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        print("🕵️‍♂️ Buscando el archivo .m3u8 secreto...")

        # Esta función imprime cualquier solicitud que contenga 'm3u8'
        page.on("request", lambda request: print(f"🚀 POSIBLE LINK: {request.url}") if ".m3u8" in request.url else None)

        # Entramos al episodio 1
        await page.goto("https://jkanime.net/mushoku-tensei-isekai-ittara-honki-dasu/1/")
        
        # Esperamos 10 segundos a que el reproductor cargue
        await asyncio.sleep(10)
        
        print("🏁 Búsqueda terminada.")
        await browser.close()

asyncio.run(run())