# Forex Lambo — image prompts

Story: `stories/forexLamboBusinessStory.json` (id `ForexLamboBusinessStory`).
Palette: cream paper `#F4F1EA`, ink `#1A1A1A`, accent green `#16A34A`, gold `#F5C518`.
Style line (append to every prompt so all shots read as one film):

> flat editorial vector illustration, cream paper background `#F4F1EA`, ink black linework `#1A1A1A`, single accent green `#16A34A` with gold `#F5C518` highlights, subtle paper grain, no faces, no text, no watermark, no realistic people

The mcd engine draws everything else as motion graphics — only the hero is a real image slot today. The remaining prompts are for slots that can be wired in if you want photographic B-roll.

---

## 01 — Hero (wired: `hero.src` → `video/public/hero/lambo.png`)

Current story uses `hero.kind: "phone"` (vector device, no asset). To swap in a real image, drop a PNG here and set `hero.src: "hero/lambo.png"` in the story JSON. 420x640 portrait, subject isolated, transparent background.

> A lime-green Lamborghini Huracán, front three-quarter view angled slightly right, glossy paint with gold rim lighting, parked on a reflective dark floor, subtle green underglow, centered product shot, isolated on fully transparent background, no text, no watermark, no ground shadow, cinematic studio lighting, flat editorial vector illustration style, cream paper `#F4F1EA` backdrop, ink black accents, green `#16A34A` and gold `#F5C518`, 2:3 portrait crop

## 02 — Phone screen (optional: wire into PhoneHero)

The hook renders a vector phone with placeholder bars. A generated trading-app screen would sell the story. Transparent PNG, portrait, dark theme.

> smartphone trading app screen, dark charcoal UI, large green candlestick chart trending up, account balance readout, gold arrow icons, clean fintech layout, flat vector illustration, isolated on transparent background, no text (replace numerals), no watermark, portrait crop

## 03 — Laptop on desk (optional B-roll, hook)

> open laptop on a wooden desk in a dim teenage bedroom at night, green candlestick charts glowing on the screen, warm gold desk lamp, flat editorial vector illustration, cream paper `#F4F1EA`, ink `#1A1A1A` linework, green `#16A34A` and gold `#F5C518` accents, no faces, no text, no watermark

## 04 — World map (optional backdrop, map scene)

The map scene already draws a dot-grid SVG world map. Only add a photo if you want it as texture behind the vector.

> dark world map with glowing green connection arcs from Los Angeles to New York, São Paulo, London, Tokyo and Sydney, gold destination pins, flat editorial vector illustration, cream paper `#F4F1EA`, ink `#1A1A1A`, green `#16A34A` and gold `#F5C518`, no text, no watermark

## 05 — Money stack / coins (optional backdrop, money scene)

> stack of gold coins and folded cash cascading diagonally, green trending arrows through the pile, flat editorial vector illustration, cream paper `#F4F1EA`, ink `#1A1A1A`, green `#16A34A` and gold `#F5C518`, no faces, no text, no watermark

## 06 — Trading chart (optional backdrop, chart scene)

> large candlestick chart sweeping upward across the frame, green candles with gold wicks, faint gridlines, flat editorial vector illustration, cream paper `#F4F1EA`, ink `#1A1A1A`, green `#16A34A` and gold `#F5C518`, no text, no watermark