import requests
from bs4 import BeautifulSoup
import re

session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
})

slug = 'mushoku-tensei-isekai-ittara-honki-dasu'
url = f'https://jkanime.net/{slug}/'

response = session.get(url, timeout=15)
soup = BeautifulSoup(response.content, 'html.parser')

# Buscar la sección de capítulos
print('--- SECCIÓN DE CAPÍTULOS ---')
capitulos = soup.find('div', class_='capitulos')
if capitulos:
    print(f'Clase encontrada: {capitulos.get("class")}')
    print(f'Contenido HTML (primeros 3000 caracteres):')
    print(capitulos.prettify()[:3000])
else:
    print('No se encontró div con clase "capitulos"')

# Buscar TODOS los divs con clase "col-lg-12"
print('\n--- DIVS col-lg-12 ---')
divs = soup.find_all('div', class_=re.compile(r'col-lg-12'))
for div in divs:
    print(f'Clase: {div.get("class")}')
    # Buscar enlaces dentro
    links = div.find_all('a', href=True)
    print(f'  Enlaces: {len(links)}')
    for link in links[:10]:
        print(f'    {link.text.strip()[:50]} -> {link.get("href")}')

# Buscar TODOS los enlaces que contengan el slug
print('\n--- ENLACES CON EL SLUG ---')
all_links = soup.find_all('a', href=True)
for link in all_links:
    href = link.get('href', '')
    if slug in href:
        text = link.text.strip()[:80]
        print(f'  "{text}" -> {href}')

# Buscar elementos con atributos especiales
print('\n--- ELEMENTOS CON DATA-ATRIBUTOS ---')
elements = soup.find_all(attrs={"data-ep": True})
print(f'Elementos con data-ep: {len(elements)}')
for elem in elements[:20]:
    print(f'  data-ep: {elem.get("data-ep")}')
    print(f'  Texto: {elem.text.strip()[:50]}')
