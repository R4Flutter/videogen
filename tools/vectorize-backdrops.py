"""Re-vectorize LAMBOKID backdrops: lift darkness, keep artwork readable.

Same sources as before (video/public/bg/*.png == out/LAMBOKID photos), same
output names (bg/*_vec.png). Changes vs the old script:
  - autocontrast + brightness lift before posterizing (sources are night scenes)
  - 20-color median cut WITH dither instead of 6-color palette crush
  - soft cream lift so shadows don't sink to pure ink
"""
import glob
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter, ImageOps

BG = Path("video/public/bg")
CREAM = (244, 241, 234)


def vectorize(im: Image.Image, colors: int = 20, brightness: float = 1.35) -> Image.Image:
    im = im.convert("RGB")
    im = ImageOps.exif_transpose(im)
    im = im.resize((960, max(1, int(960 * im.height / im.width))), Image.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))
    im = ImageOps.autocontrast(im, cutoff=1)
    im = ImageEnhance.Brightness(im).enhance(brightness)
    flat = im.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    flat = flat.convert("RGB")
    # lift shadows slightly toward cream so dark areas stay paper-toned
    lifted = Image.blend(flat, Image.new("RGB", flat.size, CREAM), alpha=0.06)
    return lifted


def main() -> None:
    for src in sorted(glob.glob(str(BG / "*.png"))):
        if src.endswith("_vec.png"):
            continue
        out = Path(src).with_name(Path(src).stem + "_vec.png")
        im = vectorize(Image.open(src))
        im.save(out, optimize=True)
        small = im.resize((256, 384))
        colors = small.getcolors(maxcolors=1 << 24)
        n = len(colors)
        px = list(small.getdata())
        dark = sum(1 for c in px if max(c) < 60) / len(px)
        light = sum(1 for c in px if min(c) > 200) / len(px)
        print(f"{Path(src).name:12} -> {out.name:12}  distinct={n:<5} dark={dark:.0%} light={light:.0%}")
    print("done")


if __name__ == "__main__":
    main()