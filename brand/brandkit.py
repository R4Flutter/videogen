#!/usr/bin/env python3
"""Real Return — YouTube brand asset generator.
Palette locked to theme.ts `vox` tokens so channel art and video frames match.
"""
import os, math, random
from PIL import Image, ImageDraw, ImageFont, ImageFilter

OUT = "/sessions/kind-gallant-fermat/mnt/finance_stickman/brand"
os.makedirs(OUT, exist_ok=True)

PAPER      = (244, 241, 234)
PAPER_DEEP = (228, 222, 209)
INK        = (26, 26, 26)
ACCENT     = (217, 73, 30)
MUTED      = (138, 133, 124)
RULE       = (201, 194, 180)

F = "/usr/share/fonts/truetype/lato/Lato-%s.ttf"
def font(style, size):
    return ImageFont.truetype(F % style, size)

def tw(draw, text, fnt, tracking=0):
    """Width of text with letter-spacing."""
    w = draw.textlength(text, font=fnt)
    return w + tracking * max(0, len(text) - 1)

def track_text(draw, xy, text, fnt, fill, tracking=0, anchor_center=False):
    x, y = xy
    if anchor_center:
        x -= tw(draw, text, fnt, tracking) / 2
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking
    return x

def paper_bg(w, h, vignette=True):
    """Warm paper with a soft vertical gradient + fine grain."""
    img = Image.new("RGB", (w, h), PAPER)
    grad = Image.new("L", (1, h))
    for y in range(h):
        t = y / max(1, h - 1)
        grad.putpixel((0, y), int(255 * (0.10 + 0.55 * t)))
    grad = grad.resize((w, h))
    img = Image.composite(Image.new("RGB", (w, h), PAPER_DEEP), img, grad)

    if vignette:
        v = Image.new("L", (w, h), 0)
        vd = ImageDraw.Draw(v)
        m = int(min(w, h) * 0.34)
        vd.ellipse([-m, -m, w + m, h + m], fill=255)
        v = v.filter(ImageFilter.GaussianBlur(min(w, h) * 0.10))
        img = Image.composite(img, Image.new("RGB", (w, h), PAPER_DEEP), v)

    # grain
    rnd = random.Random(7)
    noise = Image.new("L", (w // 2, h // 2))
    noise.putdata([rnd.randint(112, 143) for _ in range((w // 2) * (h // 2))])
    noise = noise.resize((w, h), Image.BILINEAR)
    img = Image.blend(img, Image.merge("RGB", (noise, noise, noise)), 0.045)
    return img

def rough_ellipse(draw, box, color, width, seed=3, laps=2, overshoot=0.16):
    """Hand-drawn marker ellipse, roughjs-style."""
    rnd = random.Random(seed)
    x0, y0, x1, y1 = box
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    rx, ry = (x1 - x0) / 2, (y1 - y0) / 2
    for lap in range(laps):
        start = rnd.uniform(0, 0.6) + lap * 0.05
        end = 2 * math.pi + overshoot + rnd.uniform(0, 0.25)
        pts, steps = [], 220
        wob = rnd.uniform(0.006, 0.014)
        ph = rnd.uniform(0, 6.28)
        for i in range(steps + 1):
            a = start + (end - start) * i / steps
            j = 1 + wob * math.sin(a * 3 + ph) + rnd.uniform(-0.004, 0.004)
            pts.append((cx + rx * j * math.cos(a), cy + ry * j * math.sin(a)))
        draw.line(pts, fill=color, width=width, joint="curve")

def rough_underline(draw, x0, x1, y, color, width, seed=11, laps=2):
    rnd = random.Random(seed)
    for lap in range(laps):
        pts = []
        n = 80
        off = rnd.uniform(-width * 0.35, width * 0.35)
        for i in range(n + 1):
            t = i / n
            x = x0 + (x1 - x0) * t
            dip = math.sin(t * math.pi) * width * 0.30
            pts.append((x, y + off + dip + rnd.uniform(-1.6, 1.6)))
        draw.line(pts, fill=color, width=width, joint="curve")

def sup(w, h, s=4):
    return Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0)), s


# ───────────────────────────────────────── BANNER 2560x1440
def banner():
    W, H = 2560, 1440
    SAFE_W, SAFE_H = 1546, 423
    sx0, sy0 = (W - SAFE_W) // 2, (H - SAFE_H) // 2
    sx1, sy1 = sx0 + SAFE_W, sy0 + SAFE_H
    img = paper_bg(W, H)
    d = ImageDraw.Draw(img)

    # ── background motif: the decaying line, faint, full TV width
    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    pts = [(x, 470 + (x / W) * 470 + math.sin(x / 300) * 14) for x in range(0, W + 1, 8)]
    od.line(pts, fill=ACCENT + (34,), width=9, joint="curve")
    od.polygon(pts + [(W, H), (0, H)], fill=ACCENT + (11,))
    for gx in range(0, W + 1, 160):
        od.line([(gx, 300), (gx, H - 220)], fill=RULE + (26,), width=2)
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    d = ImageDraw.Draw(img)

    # ── eyebrow
    f_eb = font("Bold", 30)
    ey = sy0 + 6
    ecx = W // 2
    label = "NEW FINANCE SHORT EVERY DAY"
    lw = tw(d, label, f_eb, 7)
    d.line([(ecx - lw / 2 - 76, ey + 20), (ecx - lw / 2 - 22, ey + 20)], fill=ACCENT, width=5)
    track_text(d, (ecx - lw / 2, ey), label, f_eb, ACCENT, 7)
    d.line([(ecx + lw / 2 + 22, ey + 20), (ecx + lw / 2 + 76, ey + 20)], fill=ACCENT, width=5)

    # ── wordmark
    layer, s = sup(W, H)
    ld = ImageDraw.Draw(layer)
    f_wm = font("Black", 150 * s)
    word, trk = "REAL RETURN", -3 * s
    wmw = tw(ld, word, f_wm, trk)
    wx = (W * s - wmw) / 2
    wy = (sy0 + 92) * s
    track_text(ld, (wx, wy), word, f_wm, INK, trk)
    rough_underline(ld, wx - 8 * s, wx + wmw + 8 * s, wy + 196 * s, ACCENT, 11 * s, seed=11)
    layer = layer.resize((W, H), Image.LANCZOS)
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(img)

    # ── tagline
    f_tg = font("Semibold", 40)
    track_text(d, (W // 2, sy0 + 330), "THE MONEY MATH NOBODY SHOWED YOU",
               f_tg, MUTED, 5, anchor_center=True)

    # ── desktop-width extras (outside 1546 safe strip, inside 2560x423)
    f_sm = font("Bold", 26)
    track_text(d, (sx0 - 300, sy0 + 200), "60 SECONDS", f_sm, INK, 5)
    d.line([(sx0 - 300, sy0 + 244), (sx0 - 180, sy0 + 244)], fill=ACCENT, width=4)
    track_text(d, (sx0 - 300, sy0 + 262), "NO HYPE", f_sm, MUTED, 5)
    rt = "US MARKETS"
    track_text(d, (sx1 + 300, sy0 + 200), rt, f_sm, INK, 5, anchor_center=True)
    rw = tw(d, rt, f_sm, 5)
    d.line([(sx1 + 300 - rw / 2, sy0 + 244), (sx1 + 300 - rw / 2 + 120, sy0 + 244)], fill=ACCENT, width=4)
    track_text(d, (sx1 + 300, sy0 + 262), "PLAIN ENGLISH", f_sm, MUTED, 5, anchor_center=True)

    img.save(f"{OUT}/banner_2560x1440.png", optimize=True)

    # safe-area proof
    g = img.copy(); gd = ImageDraw.Draw(g)
    gd.rectangle([sx0, sy0, sx1, sy1], outline=(0, 160, 255), width=6)
    gd.rectangle([0, sy0, W, sy1], outline=(0, 200, 120), width=4)
    gd.ellipse([sx0 + 20, sy1 - 190, sx0 + 190, sy1 - 20], outline=(255, 0, 120), width=5)
    gd.text((sx0 + 14, sy0 - 46), "MOBILE SAFE 1546x423", font=font("Bold", 34), fill=(0, 160, 255))
    gd.text((30, sy0 - 46), "DESKTOP 2560x423", font=font("Bold", 34), fill=(0, 150, 90))
    gd.text((sx0 + 210, sy1 - 120), "avatar sits here - keep clear", font=font("Bold", 30), fill=(255, 0, 120))
    g.save(f"{OUT}/_banner_safearea_check.png", optimize=True)


# ───────────────────────────────────────── AVATAR 800x800
def avatar(variant="a"):
    S = 800
    layer, s = sup(S, S, 3)
    ld = ImageDraw.Draw(layer)
    N = S * s

    if variant == "a":       # paper + ink RR + marker ring
        bg, fg = paper_bg(S, S, vignette=False), INK
        f = font("Black", 300 * s)
        trk = -14 * s
        t = "RR"
        w = tw(ld, t, f, trk)
        track_text(ld, ((N - w) / 2, N * 0.30), t, f, fg, trk)
        rough_ellipse(ld, [N * 0.10, N * 0.24, N * 0.90, N * 0.76], ACCENT, 13 * s, seed=5)
    else:                    # ink disc + paper RR + accent rule
        bg = Image.new("RGB", (S, S), INK)
        f = font("Black", 310 * s)
        trk = -14 * s
        t = "RR"
        w = tw(ld, t, f, trk)
        x = (N - w) / 2
        track_text(ld, (x, N * 0.27), t, f, PAPER, trk)
        rough_underline(ld, x, x + w, N * 0.74, ACCENT, 20 * s, seed=9)

    layer = layer.resize((S, S), Image.LANCZOS)
    img = Image.alpha_composite(bg.convert("RGBA"), layer).convert("RGB")
    img.save(f"{OUT}/avatar_{variant}_800x800.png", optimize=True)

    # circular-crop preview at real display sizes
    prev = Image.new("RGB", (560, 200), (255, 255, 255))
    px = 20
    for size in (176, 98, 80, 48):
        c = img.resize((size, size), Image.LANCZOS).convert("RGBA")
        m = Image.new("L", (size * 4, size * 4), 0)
        ImageDraw.Draw(m).ellipse([0, 0, size * 4, size * 4], fill=255)
        c.putalpha(m.resize((size, size), Image.LANCZOS))
        prev.paste(c, (px, (200 - size) // 2), c)
        d2 = ImageDraw.Draw(prev)
        d2.text((px, 176), f"{size}px", font=font("Bold", 16), fill=(120, 120, 120))
        px += size + 24
    prev.save(f"{OUT}/_avatar_{variant}_sizecheck.png")


# ───────────────────────────────────────── WATERMARK 150x150 (transparent)
def watermark():
    S = 150
    layer, s = sup(S, S, 6)
    ld = ImageDraw.Draw(layer)
    N = S * s
    f = font("Black", 62 * s)
    t = "RR"
    trk = -3 * s
    w = tw(ld, t, f, trk)
    x = (N - w) / 2
    track_text(ld, (x, N * 0.34), t, f, INK + (235,), trk)
    rough_underline(ld, x, x + w, N * 0.70, ACCENT + (255,), 6 * s, seed=4, laps=1)
    layer.resize((S, S), Image.LANCZOS).save(f"{OUT}/watermark_150x150.png")


# ───────────────────────────────────────── THUMBNAIL TEMPLATE 1280x720
def thumb(line1, line2, kicker, name):
    W, H = 1280, 720
    img = paper_bg(W, H)
    d = ImageDraw.Draw(img)

    ov = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    od = ImageDraw.Draw(ov)
    pts = [(x, 300 + (x / W) * 300) for x in range(0, W + 1, 8)]
    od.line(pts, fill=ACCENT + (40,), width=7, joint="curve")
    od.polygon(pts + [(W, H), (0, H)], fill=ACCENT + (14,))
    img = Image.alpha_composite(img.convert("RGBA"), ov).convert("RGB")
    d = ImageDraw.Draw(img)

    f_k = font("Bold", 30)
    d.line([(72, 90), (128, 90)], fill=ACCENT, width=5)
    track_text(d, (150, 74), kicker, f_k, ACCENT, 7)

    layer, s = sup(W, H, 3)
    ld = ImageDraw.Draw(layer)
    f1 = font("Black", 138 * s)
    track_text(ld, (72 * s, 150 * s), line1, f1, INK, -4 * s)
    x_end = 72 * s + tw(ld, line2, f1, -4 * s)
    track_text(ld, (72 * s, 300 * s), line2, f1, INK, -4 * s)
    rough_underline(ld, 72 * s, x_end, 452 * s, ACCENT, 13 * s, seed=6)
    layer = layer.resize((W, H), Image.LANCZOS)
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    d = ImageDraw.Draw(img)

    f_b = font("Bold", 26)
    track_text(d, (72, 620), "REAL RETURN", f_b, MUTED, 6)
    img.save(f"{OUT}/{name}", optimize=True)


# ───────────────────────────────────────── SHORTS COVER 1080x1920
def shorts_cover():
    W, H = 1080, 1920
    img = paper_bg(W, H)
    layer, s = sup(W, H, 2)
    ld = ImageDraw.Draw(layer)

    f_k = font("Bold", 34 * s)
    ld.line([(80 * s, 430 * s), (140 * s, 430 * s)], fill=ACCENT, width=6 * s)
    track_text(ld, (166 * s, 412 * s), "THE CLAIM", f_k, ACCENT, 8 * s)

    f = font("Black", 165 * s)
    for i, ln in enumerate(["0.4% APY.", "STILL A", "LOSS."]):
        track_text(ld, (80 * s, (520 + i * 185) * s), ln, f, INK, -5 * s)
    w = tw(ld, "LOSS.", f, -5 * s)
    rough_underline(ld, 80 * s, 80 * s + w, 1078 * s, ACCENT, 15 * s, seed=8)

    f_b = font("Bold", 30 * s)
    track_text(ld, (80 * s, 1700 * s), "REAL RETURN", f_b, MUTED, 7 * s)

    layer = layer.resize((W, H), Image.LANCZOS)
    Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB").save(
        f"{OUT}/shorts_cover_1080x1920.png", optimize=True)


banner()
avatar("a")
avatar("b")
watermark()
thumb("YOUR BANK", "IS LYING", "THE CONTRADICTION", "thumbnail_template_A.png")
thumb("$10,000", "TO $7,700", "THE ESCALATION", "thumbnail_template_B.png")
shorts_cover()
print("\n".join(sorted(os.listdir(OUT))))
