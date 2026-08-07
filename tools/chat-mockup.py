"""script.json beats -> phone chat mockup PNGs in video/public/footage/.

    .venv\\Scripts\\python.exe tools/chat-mockup.py [--force]

One image per beat that has a `chat:` row, named chat-N.png at 1080x1920,
plus a sidecar chat-N.json with the pixel boxes of the header name and every
message bubble. The Remotion ChatScene shows the PNG and uses the boxes to aim
its hand-drawn annotations ("circle around David") at the right spot, so the
boxes are also merged into script.json (beat.chat_boxes) where the render can
read them without a network round trip.

Pure design, no AI, no faces: the profile is always a grey silhouette. The
layout is deterministic by beat number, so re-running the pipeline reproduces
the same screen. Idempotent: a beat whose PNG is on disk is skipped.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/footage"
SIDECAR = "chat-{n}.json"

W, H = 1080, 1920
STATUS_H = 64
HEADER_H = 190
CHAT_TOP = STATUS_H + HEADER_H
INPUT_H = 150
CHAT_BOTTOM = H - INPUT_H

FONT_DIR = "C:/Windows/Fonts"
SEGOE = f"{FONT_DIR}/segoeui.ttf"
SEGOE_B = f"{FONT_DIR}/segoeuib.ttf"
SEGOE_SB = f"{FONT_DIR}/seguisb.ttf"

# header, chat paper, victim bubble, victim text, name text
PLATFORMS = {
    "facebook":  ("#0084FF", "#EEF2F7", "#0084FF", "#FFFFFF", "#FFFFFF"),
    "messenger": ("#0084FF", "#EEF2F7", "#0084FF", "#FFFFFF", "#FFFFFF"),
    "whatsapp":  ("#075E54", "#ECE5DD", "#DCF8C6", "#1A1A1A", "#FFFFFF"),
    "telegram":  ("#229ED9", "#E7F2FA", "#E0F0FA", "#1A1A1A", "#FFFFFF"),
    "instagram": ("#E4405F", "#F7F7F9", "#E4405F", "#FFFFFF", "#FFFFFF"),
    "sms":       ("#0E7C3A", "#F1F5F1", "#0E7C3A", "#FFFFFF", "#FFFFFF"),
    "email":     ("#3A3A38", "#F2F2F0", "#D9D9D5", "#1A1A1A", "#FFFFFF"),
}
DEFAULT_PLATFORM = "sms"

INK = "#1A1A1A"
GREY = "#8A857C"
SILHOUETTE = "#A8A29E"
SILHOUETTE_LIGHT = "#D8D2C8"

BUBBLE_FONT = 52
BUBBLE_LH = 66
BUBBLE_PAD_X = 30
BUBBLE_PAD_Y = 22
MAX_BUBBLE_W = 780
TIME_FONT = 26
NAME_FONT = 52

# ------------------------------------------------------------------- parsing
def parse_chat(field: str) -> dict:
    """'platform: Speaker: message · Speaker: message · profile: X' -> spec.

    The first colon-segment of the first item is the platform; every item
    after that is 'Speaker: message'. `profile:` / `accent:` / `platform:`
    are options, not messages.
    """
    spec = {"platform": None, "profile": "silhouette", "messages": []}
    items = [s.strip() for s in re.split(r"[·•]", field) if s.strip()]
    for i, item in enumerate(items):
        opt = re.match(r"^(profile|accent|platform)\s*:\s*(.+)$", item, re.I)
        if opt:
            spec[opt.group(1).lower()] = opt.group(2).strip()
            continue
        parts = [p.strip() for p in item.split(":")]
        if i == 0 and len(parts) >= 3:
            spec["platform"] = parts[0].lower()
            speaker, message = parts[1], ":".join(parts[2:])
        elif len(parts) >= 2:
            speaker, message = parts[0], ":".join(parts[1:])
        else:
            continue
        if message:
            spec["messages"].append({"speaker": speaker, "text": message})
    spec["platform"] = (spec.get("platform") or DEFAULT_PLATFORM).lower()
    return spec


# ------------------------------------------------------------------- drawing
def font(size: int, bold: bool = False):
    from PIL import ImageFont

    return ImageFont.truetype(SEGOE_B if bold else SEGOE, size)


def wrap(draw, text: str, f, max_w: int):
    lines, cur = [], ""
    for word in text.split():
        trial = f"{cur} {word}".strip()
        if draw.textbbox((0, 0), trial, font=f)[2] <= max_w or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def silhouette(draw, cx: int, cy: int, r: int, color=SILHOUETTE):
    """Head and shoulders, never a face. Fills its own frame, so callers that
    need a chat avatar want avatar() — this one is unclipped by design."""
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color)
    draw.pieslice([cx - r * 1.9, cy + r * 0.2, cx + r * 1.9, cy + r * 4.6], 180, 360, fill=color)


def avatar(img, cx: int, cy: int, r: int, disc=SILHOUETTE_LIGHT, figure=SILHOUETTE):
    """A messenger avatar: head and shoulders clipped to a circle, the way every
    chat app clips it. Drawn unclipped, the shoulders spill a third of their
    height out of the header bar and run under the name and status text."""
    from PIL import Image, ImageDraw

    size = r * 2
    layer = Image.new("RGB", (size, size), disc)
    d = ImageDraw.Draw(layer)
    head = r * 0.40
    d.ellipse([r - head, r * 0.34, r + head, r * 0.34 + head * 2], fill=figure)
    d.pieslice([r - r * 0.80, r * 1.06, r + r * 0.80, r * 2.7], 180, 360, fill=figure)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
    img.paste(layer, (cx - r, cy - r), mask)


def seeded(seed: int):
    """Deterministic 0..1 so the same beat renders the same screen."""
    seed = (seed * 2654435761 + 40503) & 0xFFFFFFFF
    return (((seed >> 16) ^ seed) * 2654435761 & 0xFFFFFFFF) / 0xFFFFFFFF


def clock_time(i: int, n: int):
    mins = 9 * 60 + 41 + int(seeded(n * 31 + i) * 60) + i * 4
    h, m = (mins // 60) % 12 or 12, mins % 60
    return f"{h}:{m:02d} {'AM' if mins < 12 * 60 + 41 else 'PM'}"


def render_chat(beat: dict, dest: Path) -> dict | None:
    from PIL import Image, ImageDraw, ImageColor

    spec = parse_chat(beat["chat"])
    header, paper, victim_bubble, victim_text, name_text = PLATFORMS[spec["platform"]]

    img = Image.new("RGBA", (W, H), (*ImageColor.getrgb(paper), 195))
    draw = ImageDraw.Draw(img)
    boxes = {"header": {"x": 0, "y": STATUS_H, "w": W, "h": HEADER_H}, "bubbles": []}

    # ---- status bar + header
    draw.rectangle([0, 0, W, STATUS_H], fill=(*ImageColor.getrgb(header), 195))
    draw.text((44, 14), "9:41", font=font(34, True), fill=name_text)
    draw.rectangle([0, STATUS_H, W, STATUS_H + HEADER_H], fill=(*ImageColor.getrgb(header), 195))
    # back chevron
    draw.polygon([(70, STATUS_H + 95), (112, STATUS_H + 60), (112, STATUS_H + 130)], fill=name_text)
    # avatar + name
    avatar(img, 195, STATUS_H + 95, 58)
    name = spec["messages"][0]["speaker"] if spec["messages"] else "Unknown"
    boxes["name"] = {"x": 285, "y": STATUS_H + 40, "w": 560, "h": 110}
    boxes["nameText"] = name
    draw.text((boxes["name"]["x"], STATUS_H + 52), name, font=font(NAME_FONT, True), fill=name_text)
    draw.text((boxes["name"]["x"], STATUS_H + 128), "online", font=font(30), fill=name_text + "AA")
    # call/video glyphs — simple shapes, no icon font dependency
    for cx in (940, 1010):
        draw.ellipse([cx - 16, STATUS_H + 75, cx + 16, STATUS_H + 115], outline=name_text, width=5)

    # ---- messages
    victims = []
    for m in spec["messages"]:
        if m["speaker"] not in victims:
            victims.append(m["speaker"])
    left_side = victims[0] if victims else ""

    # Measure the whole stack before drawing any of it, so the thread can hang
    # from the bottom the way every messenger renders it — newest message just
    # above the input bar. Drawn from the top instead, a two-message beat leaves
    # two thirds of the phone empty and the screenshot reads as unfinished.
    f = font(BUBBLE_FONT)
    laid = []
    for m in spec["messages"]:
        lines = wrap(draw, m["text"], f, MAX_BUBBLE_W - BUBBLE_PAD_X * 2)
        b_w = min(MAX_BUBBLE_W, max(draw.textbbox((0, 0), ln, font=f)[2] for ln in lines) + BUBBLE_PAD_X * 2)
        b_h = len(lines) * BUBBLE_LH - 14 + BUBBLE_PAD_Y * 2
        laid.append((m, lines, b_w, b_h))

    stack = sum(h for _, _, _, h in laid) + 46 * max(0, len(laid) - 1) + TIME_FONT + 20
    y = max(CHAT_TOP + 46, CHAT_BOTTOM - 56 - stack)

    for i, (m, lines, b_w, b_h) in enumerate(laid):
        mine = m["speaker"] != left_side
        line_h = BUBBLE_LH
        b_x = W - 80 - b_w if mine else 80
        bubble = (b_x, y, b_x + b_w, y + b_h)
        draw.rounded_rectangle(bubble, radius=30, fill=victim_bubble if mine else "#FFFFFF")
        ty = y + BUBBLE_PAD_Y
        for ln in lines:
            draw.text((b_x + BUBBLE_PAD_X, ty), ln, font=f, fill=victim_text if mine else INK)
            ty += line_h
        draw.text((b_x, y + b_h + 8), clock_time(i, beat["n"]), font=font(TIME_FONT), fill=GREY)
        boxes["bubbles"].append(
            {"speaker": m["speaker"], "mine": mine, "x": b_x, "y": y, "w": b_w, "h": b_h}
        )
        y += b_h + 46

    # ---- input bar
    draw.rectangle([0, CHAT_BOTTOM, W, H], fill=(244, 242, 238, 195))
    draw.rounded_rectangle([80, CHAT_BOTTOM + 34, W - 80, H - 34], radius=38, fill="#FFFFFF",
                           outline="#D8D2C8", width=3)
    draw.text((130, CHAT_BOTTOM + 52), "Message", font=font(42), fill=GREY)
    draw.polygon([(W - 150, CHAT_BOTTOM + 78), (W - 104, CHAT_BOTTOM + 62), (W - 104, CHAT_BOTTOM + 94)],
                 fill=victim_bubble)

    boxes["last"] = boxes["bubbles"][-1] if boxes["bubbles"] else None
    img.save(dest, "PNG")
    return boxes


def patch_script(n: int, boxes: dict) -> None:
    if boxes is None:
        return
    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    for beat in script["beats"]:
        if beat["n"] == n:
            beat["chat_boxes"] = boxes
            break
    SCRIPT.write_text(json.dumps(script, indent=2), encoding="utf8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-render chats that exist")
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    jobs = [b for b in script["beats"] if b.get("chat")]

    for beat in jobs:
        dest = OUT / f"chat-{beat['n']}.png"
        side = OUT / SIDECAR.format(n=beat["n"])
        # The PNG caches, but script.json does not: `npm run story` rebuilds it
        # from story.txt and drops the boxes this tool merged in. The renderer
        # gates the phone on those boxes, so skipping the merge on a cache hit
        # renders a blank page instead of the chat. Re-merge from the sidecar.
        if dest.exists() and side.exists() and not args.force:
            patch_script(beat["n"], json.loads(side.read_text(encoding="utf8")))
            print(f"  beat {beat['n']:>3}  have {dest.name}  (boxes re-merged)")
            continue
        boxes = render_chat(beat, dest)
        side.write_text(json.dumps(boxes, indent=2), encoding="utf8")
        patch_script(beat["n"], boxes)
        print(f"  beat {beat['n']:>3}  {dest.name}  ({len(boxes['bubbles'])} bubbles)")

    print(f"\n{len(jobs)} chat mockup(s) -> video/public/footage/chat-N.png")
    if not jobs:
        print("  (no beats have a chat: row — nothing to do)")


if __name__ == "__main__":
    main()
