"""Генерирует 5 PNG-мокапов 1280×800 для Chrome Web Store submission.

Не реальные скриншоты — стилизованные превью, показывающие как overlay
выглядит на каждом портале + popup + landing.

Требует: cairosvg, PIL (Pillow).
"""
from pathlib import Path
import cairosvg


OUT = Path(__file__).parent

# Общая структура: белый фон + фейковый браузер + фейковая страница портала
# + AIDI Insight overlay справа.


def mockup_svg(*,
               portal_name: str,
               portal_url: str,
               portal_color: str,
               listing_title: str,
               listing_price: str,
               overlay_verdict: str,
               overlay_verdict_color: str,
               overlay_fair: str,
               overlay_asking: str,
               overlay_delta: str,
               overlay_delta_color: str,
               overlay_sections: list) -> str:
    """Возвращает SVG исходник страницы."""
    sections_svg = ""
    y = 380
    for i, (icon, title, items) in enumerate(overlay_sections[:3]):
        bg = "#f6f9f9"
        stroke = ""
        if "предупреждение" in title.lower() or "внимание" in title.lower():
            bg, stroke = "#fdf4ec", 'stroke="#7a4b0c" stroke-width="1.5"'
        if "скрыто" in title.lower() or "hidden" in title.lower():
            bg, stroke = "#fbe9e5", 'stroke="#b04a3a" stroke-width="1.5"'
        item_lines = ""
        for j, item in enumerate(items[:2]):
            item_lines += f'<text x="1010" y="{y+38+j*20}" font-size="11" fill="#5a6566">• {item[:52]}</text>'
        sections_svg += f'''
          <rect x="990" y="{y}" width="260" height="{40 + len(items)*20}" rx="8" fill="{bg}" {stroke}/>
          <text x="1010" y="{y+22}" font-size="13" font-weight="700" fill="#171c1c">{icon} {title}</text>
          {item_lines}
        '''
        y += 40 + len(items) * 20 + 10

    return f'''<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <!-- Chrome window frame -->
  <rect width="1280" height="800" fill="#eef1f1"/>
  <!-- Browser bar -->
  <rect x="0" y="0" width="1280" height="60" fill="#dee5e5"/>
  <circle cx="20" cy="30" r="6" fill="#ff6a5f"/>
  <circle cx="40" cy="30" r="6" fill="#fdc02f"/>
  <circle cx="60" cy="30" r="6" fill="#28ca42"/>
  <rect x="120" y="15" width="900" height="30" rx="15" fill="#fff"/>
  <text x="140" y="35" font-size="13" fill="#5a6566" font-family="system-ui">🔒 {portal_url}</text>
  <!-- Extension icon in toolbar -->
  <rect x="1040" y="15" width="30" height="30" rx="6" fill="#0e4b51"/>
  <text x="1055" y="35" font-size="14" fill="#fff" text-anchor="middle">🤖</text>
  <text x="1078" y="35" font-size="11" fill="#fff" font-weight="800">!</text>
  <!-- Portal header -->
  <rect x="0" y="60" width="1280" height="70" fill="{portal_color}"/>
  <text x="40" y="105" font-size="24" font-weight="800" fill="#fff" font-family="system-ui">{portal_name}</text>
  <!-- Listing content (left column) -->
  <rect x="40" y="160" width="920" height="500" rx="12" fill="#fff"/>
  <text x="70" y="200" font-size="22" font-weight="700" fill="#171c1c" font-family="system-ui">{listing_title}</text>
  <text x="70" y="235" font-size="28" font-weight="800" fill="#0e4b51" font-family="system-ui">{listing_price}</text>
  <!-- Fake photo grid -->
  <rect x="70" y="270" width="440" height="280" rx="8" fill="#c4d3d3"/>
  <text x="290" y="415" font-size="16" fill="#94a3a3" text-anchor="middle" font-family="system-ui">📷 Фото объявления</text>
  <rect x="530" y="270" width="200" height="135" rx="6" fill="#c4d3d3"/>
  <rect x="750" y="270" width="200" height="135" rx="6" fill="#c4d3d3"/>
  <rect x="530" y="415" width="200" height="135" rx="6" fill="#c4d3d3"/>
  <rect x="750" y="415" width="200" height="135" rx="6" fill="#c4d3d3"/>
  <!-- AIDI Insight OVERLAY (right column) -->
  <rect x="980" y="160" width="280" height="500" rx="14" fill="#fff" stroke="#e4eaea" stroke-width="1"/>
  <!-- Overlay header -->
  <rect x="980" y="160" width="280" height="46" rx="14" fill="{portal_color}"/>
  <rect x="980" y="180" width="280" height="26" fill="{portal_color}"/>
  <text x="1000" y="190" font-size="14" font-weight="700" fill="#fff" font-family="system-ui">🤖 AIDI Insight</text>
  <rect x="1200" y="170" width="50" height="22" rx="8" fill="rgba(255,255,255,0.15)"/>
  <text x="1225" y="186" font-size="10" fill="#fff" text-anchor="middle" font-family="system-ui">{portal_name.split(' ')[0]}</text>
  <text x="1245" y="188" font-size="16" fill="#fff" text-anchor="middle" font-family="system-ui">×</text>
  <!-- Verdict badge -->
  <rect x="1000" y="220" width="240" height="42" rx="8" fill="#edf2f2"/>
  <text x="1120" y="248" font-size="16" font-weight="800" fill="{overlay_verdict_color}" text-anchor="middle" font-family="system-ui">{overlay_verdict}</text>
  <!-- Prices row -->
  <text x="1010" y="290" font-size="10" fill="#94a3a3" font-family="system-ui">Оценка</text>
  <text x="1010" y="308" font-size="14" font-weight="800" fill="#0e4b51" font-family="system-ui">{overlay_fair}</text>
  <text x="1090" y="290" font-size="10" fill="#94a3a3" font-family="system-ui">Заявлено</text>
  <text x="1090" y="308" font-size="14" font-weight="800" fill="#0e4b51" font-family="system-ui">{overlay_asking}</text>
  <text x="1180" y="290" font-size="10" fill="#94a3a3" font-family="system-ui">Разница</text>
  <text x="1180" y="308" font-size="14" font-weight="800" fill="{overlay_delta_color}" font-family="system-ui">{overlay_delta}</text>
  <line x1="1000" y1="325" x2="1240" y2="325" stroke="#eef1f1"/>
  <!-- Sections -->
  {sections_svg}
</svg>
'''


PORTALS = [
    dict(portal_name="kv.ee", portal_url="www.kv.ee/3toaline-nurgakorter-toomkuninga-15-3847491.html",
         portal_color="#6c3bd9",
         listing_title="3-к квартира, Toom-Kuninga 15, Kesklinn",
         listing_price="335 000 €",
         overlay_verdict="🔴 Выше рынка",
         overlay_verdict_color="#b04a3a",
         overlay_fair="298 K€",
         overlay_asking="335 K€",
         overlay_delta="+12%",
         overlay_delta_color="#b04a3a",
         overlay_sections=[
             ("✅", "Подтверждено", ["Угловая планировка", "Кухня-гостиная"]),
             ("⚠️", "Обратить внимание", ["«Тройные стеклопакеты» — не видно", "«5 мин до Kaubamaja» — 12"]),
             ("🕵", "Скрыто AI", ["Радиаторы старые чугунные"]),
         ]),
    dict(portal_name="ss.lv", portal_url="www.ss.lv/msg/lv/real-estate/flats/riga/…",
         portal_color="#4a8f2f",
         listing_title="2-istabu dzīvoklis, Rīga, Purvciems",
         listing_price="68 500 €",
         overlay_verdict="🟢 Ниже средней",
         overlay_verdict_color="#0e4b51",
         overlay_fair="82 K€",
         overlay_asking="68 K€",
         overlay_delta="−17%",
         overlay_delta_color="#0e4b51",
         overlay_sections=[
             ("✅", "Podarītāja fotogrāfija", ["Balta virtuve", "Jaunas laminēta grīdas"]),
             ("⚠️", "Ievērot", ["Cena zem tirgus — pārbaudīt iemeslu"]),
         ]),
    dict(portal_name="city24.ee", portal_url="www.city24.ee/real-estate/apartments-for-sale/…",
         portal_color="#004b9f",
         listing_title="Uus 2-toaline korter, Kadriorg",
         listing_price="248 000 €",
         overlay_verdict="🟡 В рынке",
         overlay_verdict_color="#7a4b0c",
         overlay_fair="252 K€",
         overlay_asking="248 K€",
         overlay_delta="−2%",
         overlay_delta_color="#5a6566",
         overlay_sections=[
             ("✅", "Kinnitatud", ["Panoraamaknad — jah", "Balkon 6 m² — jah"]),
             ("⚠️", "Pane tähele", ["Naabrid tekstis ei mainita"]),
             ("🕵", "AI märkas", ["Fassaad kaetud sidingiga"]),
         ]),
    dict(portal_name="city24.lv", portal_url="www.city24.lv/real-estate/apartments-for-sale/…",
         portal_color="#004b9f",
         listing_title="Elegants 3-istabu dzīvoklis, Rīga",
         listing_price="185 000 €",
         overlay_verdict="🟡 Tirgū",
         overlay_verdict_color="#7a4b0c",
         overlay_fair="180 K€",
         overlay_asking="185 K€",
         overlay_delta="+3%",
         overlay_delta_color="#5a6566",
         overlay_sections=[
             ("✅", "Apstiprināts", ["Renovēta virtuve", "Balkons ir"]),
             ("⚠️", "Nianses", ["«Tuvu skolai» — 800m, ne kaimiņu"]),
         ]),
]


def convert_svg(svg_content: str, out_path: Path):
    """Конвертирует SVG в PNG 1280×800."""
    cairosvg.svg2png(bytestring=svg_content.encode(),
                     write_to=str(out_path),
                     output_width=1280, output_height=800)


def main():
    OUT.mkdir(exist_ok=True)
    for i, portal in enumerate(PORTALS, 1):
        svg = mockup_svg(**portal)
        out = OUT / f"screenshot-{i}-{portal['portal_name'].replace('.', '_')}.png"
        convert_svg(svg, out)
        print(f"  ✓ {out.name}")

    # 5-й скриншот — общая landing карточка
    landing_svg = f'''<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="800" viewBox="0 0 1280 800">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0e4b51"/>
      <stop offset="1" stop-color="#007782"/>
    </linearGradient>
  </defs>
  <rect width="1280" height="800" fill="url(#bg)"/>
  <text x="640" y="200" font-size="60" font-weight="800" fill="#fff" text-anchor="middle" font-family="system-ui">🤖 AIDI Insight</text>
  <text x="640" y="260" font-size="26" fill="#e6f3f4" text-anchor="middle" font-family="system-ui">AI-анализ объявлений недвижимости</text>
  <text x="640" y="298" font-size="20" fill="#a3c3c3" text-anchor="middle" font-family="system-ui">Эстония · Латвия · RU · ET · LV · EN</text>

  <!-- Portal badges -->
  <g transform="translate(200, 380)">
    <rect x="0" y="0" width="120" height="46" rx="10" fill="#6c3bd9"/>
    <text x="60" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">kv.ee</text>
  </g>
  <g transform="translate(340, 380)">
    <rect x="0" y="0" width="140" height="46" rx="10" fill="#004b9f"/>
    <text x="70" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">city24.ee</text>
  </g>
  <g transform="translate(500, 380)">
    <rect x="0" y="0" width="140" height="46" rx="10" fill="#004b9f"/>
    <text x="70" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">city24.lv</text>
  </g>
  <g transform="translate(660, 380)">
    <rect x="0" y="0" width="120" height="46" rx="10" fill="#4a8f2f"/>
    <text x="60" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">ss.lv</text>
  </g>
  <g transform="translate(800, 380)">
    <rect x="0" y="0" width="130" height="46" rx="10" fill="#e37b32"/>
    <text x="65" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">soov.ee</text>
  </g>
  <g transform="translate(950, 380)">
    <rect x="0" y="0" width="130" height="46" rx="10" fill="#c62828"/>
    <text x="65" y="30" font-size="16" font-weight="700" fill="#fff" text-anchor="middle" font-family="system-ui">1a.ee</text>
  </g>

  <!-- Features -->
  <text x="640" y="510" font-size="22" fill="#fff" text-anchor="middle" font-family="system-ui">💶 Рыночная оценка · ⚠️ Преувеличения · 🕵 Скрытые дефекты · 🕰 Forensics</text>

  <!-- CTA -->
  <rect x="490" y="580" width="300" height="70" rx="35" fill="#fff"/>
  <text x="640" y="625" font-size="22" font-weight="800" fill="#0e4b51" text-anchor="middle" font-family="system-ui">Установить бесплатно</text>

  <text x="640" y="720" font-size="14" fill="#a3c3c3" text-anchor="middle" font-family="system-ui">aidi.ee/insight</text>
</svg>'''
    convert_svg(landing_svg, OUT / "screenshot-5-landing.png")
    print(f"  ✓ screenshot-5-landing.png")


if __name__ == "__main__":
    main()
