import asyncio
from playwright.async_api import async_playwright

async def extraer_cuevana():
    async with async_playwright() as p:
        # Lanzamos el navegador en modo visible para ver el proceso
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        url_base = "https://cuevana3.gs/animes/mushoku-tensei-isekai-ittara-honki-dasu-2021"
        print(f"🕵️‍♂️ Entrando a Cuevana: {url_base}")
        
        await page.goto(url_base, wait_until="networkidle")
        await asyncio.sleep(3)

        # Buscamos todos los enlaces de la página usando selectores de Playwright en Python
        links = page.locator("a")
        count = await links.count()
        
        print(f"✅ Analizando enlaces de la página...")
        
        episodios = []
        for i in range(count):
            element = links.nth(i)
            href = await element.get_attribute("href")
            text = await element.inner_text()
            
            # Filtramos para capturar enlaces que parezcan episodios
            if href and any(keyword in href.lower() for keyword in ["episodio", "ver", "capitulo"]):
                episodios.append({"titulo": text.strip(), "href": href})

        # Eliminamos duplicados
        episodios_unicos = {v['href']:v for v in episodios}.values()

        print(f"🎬 Se encontraron {len(episodios_unicos)} posibles episodios:")
        for ep in list(episodios_unicos)[:10]: 
            print(f" - {ep['titulo']}: {ep['href']}")

        await browser.close()

asyncio.run(extraer_cuevana())