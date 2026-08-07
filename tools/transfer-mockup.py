"""script.json beats -> bank transfer mockup PNGs in video/public/footage/.

    .venv\\Scripts\\python.exe tools/transfer-mockup.py [--force]

One image per beat that has a `transfer:` row, named transfer-N.png at
1080x1920, plus a sidecar transfer-N.json with the pixel boxes of the from /
to / amount / status regions. The Remotion TransferScene shows the PNG and uses
the boxes to aim its hand-drawn annotations ("arrow from from to to") — the
boxes are also merged into script.json (beat.transfer_boxes).

Deterministic by beat number, idempotent, no AI: the account numbers are
truncated fakes and the bank is a generic name, so nothing here can name a
real person or a real institution.
"""

import argparse
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "video/src/script.json"
OUT = ROOT / "video/public/footage"
SIDECAR = "transfer-{n}.json"

W, H = 1080, 1920
STATUS_H = 64
HEADER_H = 180

FONT_DIR = "C:/Windows/Fonts"
SEGOE = f"{FONT_DIR}/segoeui.ttf"
SEGOE_B = f"{FONT_DIR}/segoeuib.ttf"
CONSOLA = f"{FONT_DIR}/consola.ttf"

NAVY = "#12324F"
INK = "#1A1A1A"
GREY = "#8A857C"
RULE = "#D8D2C8"
PAPER = "#FFFFFF"
MONEY = "#0E7C3A"
ALERT = "#C81E1E"
AMBER = "#B7791F"


# ------------------------------------------------------------------- parsing
def parse_transfer(field: str) -> dict:
    """'from: Margaret · to: HK Logistics Ltd · amount: $28,000 · status: SENT' -> keys."""
    spec = {"from": "", "to": "", "amount": "$0", "status": "PENDING", "money": "green"}
    for item in re.split(r"[·•]", field):
        m = re.match(r"^\s*([a-z_]+)\s*:\s*(.+?)\s*$", item, re.I)
        if m:
            spec[m.group(1).lower()] = m.group(2).strip()
    return spec


# ------------------------------------------------------------------- drawing
def font(size: int, bold: bool = False):
    from PIL import ImageFont

    return ImageFont.truetype(SEGOE_B if bold else SEGOE, size)


def mono(size: int):
    from PIL import ImageFont

    return ImageFont.truetype(CONSOLA, size)


def truncate_acct(s: str, keep: int = 4) -> str:
    digits = "".join(re.findall(r"\d", s)) or "4412"
    return "•••• " + digits[-keep:]


def amount_text(raw: str) -> str:
    m = re.match(r"^\$?([\d,]+(?:\.\d+)?)$", raw.strip())
    if not m:
        return raw
    num = m.group(1)
    if "." not in num:
        num += ".00"
    return f"${num}"


def render_transfer(beat: dict, dest: Path) -> dict:
    from PIL import Image, ImageDraw

    spec = parse_transfer(beat["transfer"])
    money_color = ALERT if spec["money"].lower() in ("red", "alert") else MONEY

    img = Image.new("RGBA", (W, H), (255, 255, 255, 195))
    draw = ImageDraw.Draw(img)
    boxes = {}

    # ---- status bar + bank header
    draw.rectangle([0, 0, W, STATUS_H], fill=(18, 50, 79, 195))
    draw.text((44, 14), "9:41", font=font(34, True), fill="#FFFFFF")
    draw.rectangle([0, STATUS_H, W, STATUS_H + HEADER_H], fill=(18, 50, 79, 195))
    draw.ellipse([60, STATUS_H + 42, 180, STATUS_H + 162], fill="#FFFFFF")
    draw.ellipse([92, STATUS_H + 74, 148, STATUS_H + 130], fill=NAVY)
    draw.text((210, STATUS_H + 58), "FIRST MERIDIAN BANK", font=font(46, True), fill="#FFFFFF")
    draw.text((210, STATUS_H + 122), "member FDIC · 24/7 support", font=font(28), fill="#C9D6E2")

    # ---- title
    ty = STATUS_H + HEADER_H + 70
    draw.text((80, ty), "WIRE TRANSFER", font=font(44, True), fill=INK)
    # The destination bank in these stories is overseas, so "Domestic" put a
    # contradiction on screen right above "HSBC Hong Kong". Non-reversible is
    # also the fact the whole beat turns on: this is the money that cannot come
    # back. Override per beat with `type:` in the transfer row.
    draw.text((80, ty + 64), spec.get("type") or "International wire · Same day · Non-reversible",
              font=font(30), fill=GREY)

    # ---- from / to cards
    def card(y0: int, label: str, name: str, sub: str) -> dict:
        draw.rounded_rectangle([80, y0, W - 80, y0 + 220], radius=24, fill="#F7F6F2",
                               outline=RULE, width=3)
        draw.text((120, y0 + 30), label, font=font(28, True), fill=GREY)
        draw.text((120, y0 + 78), name, font=font(48, True), fill=INK)
        draw.text((120, y0 + 148), sub, font=mono(32), fill=GREY)
        return {"x": 80, "y": y0, "w": W - 160, "h": 220}

    from_y = ty + 130
    boxes["from"] = card(from_y, "FROM", spec["from"] or "—", f"Acct {truncate_acct(spec['from'])} · Routing 026009593")

    # downward arrow between cards
    ax = W // 2
    ay = from_y + 220 + 22
    draw.line([(ax, ay), (ax, ay + 66)], fill=GREY, width=5)
    draw.polygon([(ax - 18, ay + 66), (ax + 18, ay + 66), (ax, ay + 96)], fill=GREY)

    to_y = ay + 96 + 16
    boxes["to"] = card(to_y, "TO", spec["to"] or "—", f"{truncate_acct(spec['to'])} · {spec.get('bank', 'HSBC Hong Kong')}")

    # ---- amount
    amt_y = to_y + 220 + 70
    draw.text((80, amt_y), "AMOUNT", font=font(28, True), fill=GREY)
    amount = amount_text(spec["amount"])
    f = font(104, True)
    (tw, th) = draw.textbbox((0, 0), amount, font=f)[2:4]
    a_x = (W - tw) // 2
    draw.text((a_x, amt_y + 56), amount, font=f, fill=money_color)
    boxes["amount"] = {"x": a_x, "y": amt_y + 56, "w": tw, "h": th}

    # ---- status pill
    status = spec["status"].upper()
    pill_color = ALERT if status == "SENT" else AMBER
    draw.text((80, amt_y + 240), "STATUS", font=font(28, True), fill=GREY)
    s = font(44, True)
    (sw, sh) = draw.textbbox((0, 0), status, font=s)[2:4]
    px, pw = (W - sw - 110) // 2, sw + 110
    py = amt_y + 292
    draw.rounded_rectangle([px, py, px + pw, py + 88], radius=44, fill=pill_color)
    draw.text((px + 55, py + 22), status, font=s, fill="#FFFFFF")
    boxes["status"] = {"x": px, "y": py, "w": pw, "h": 88}

    # ---- reference + fine print
    ref = f"REF #{int((beat['n'] * 7919) % 99999)}-{(beat['n'] * 104729) % 999}"
    draw.text((80, py + 130), ref, font=mono(30), fill=GREY)
    draw.text((80, H - 120), "Sender authorizes this transfer. Fees may apply.", font=font(26), fill=GREY)

    img.save(dest, "PNG")
    return boxes


def patch_script(n: int, boxes: dict) -> None:
    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    for beat in script["beats"]:
        if beat["n"] == n:
            beat["transfer_boxes"] = boxes
            break
    SCRIPT.write_text(json.dumps(script, indent=2), encoding="utf8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true", help="re-render transfers that exist")
    args = ap.parse_args()

    script = json.loads(SCRIPT.read_text(encoding="utf8"))
    jobs = [b for b in script["beats"] if b.get("transfer")]

    for beat in jobs:
        dest = OUT / f"transfer-{beat['n']}.png"
        side = OUT / SIDECAR.format(n=beat["n"])
        # See chat-mockup.py: script.json is rebuilt by `npm run story`, so the
        # boxes must be re-merged even when the PNG is cached or the renderer
        # gates the bank screen off and the beat renders blank.
        if dest.exists() and side.exists() and not args.force:
            patch_script(beat["n"], json.loads(side.read_text(encoding="utf8")))
            print(f"  beat {beat['n']:>3}  have {dest.name}  (boxes re-merged)")
            continue
        boxes = render_transfer(beat, dest)
        side.write_text(json.dumps(boxes, indent=2), encoding="utf8")
        patch_script(beat["n"], boxes)
        print(f"  beat {beat['n']:>3}  {dest.name}")

    print(f"\n{len(jobs)} transfer mockup(s) -> video/public/footage/transfer-N.png")
    if not jobs:
        print("  (no beats have a transfer: row — nothing to do)")


if __name__ == "__main__":
    main()
