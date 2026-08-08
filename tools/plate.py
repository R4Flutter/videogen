"""Generated stills -> alpha cut-outs, so a plate sits on the page instead of in a box.

    python tools/plate.py [--keep] [--tol N] [--dry] [--only N]

The prompt sheet asks every image for a flat off-white ground (#F4F1EA) and a
subject "isolated against clean negative space ... so a motion designer can cut
it out and move it independently on a parallax layer". Nothing was ever spending
that. This does: it floods the ground from the borders, turns it transparent,
and writes video/public/footage/beat-N.png in place of the .jpg.

Why it matters more than it sounds: `EditorialStill` composites a .jpg with
`mix-blend-mode: darken`, which keys a *flat* ground against the paper for free
and is genuinely good enough most of the time. It cannot key a ground the
generator shaded, and it can never let the picture overlap something darker than
the page — the subject would key against that too. A real alpha channel has
neither limit, and the renderer already prefers it: a .png is composited with no
blend at all.

Border-seeded flood rather than a colour threshold over the whole frame, because
the subject's own highlights are the same value as the paper. Only ground that
is *connected to the edge* is ground.
"""

import argparse
import sys
from collections import deque
from pathlib import Path

try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:  # pragma: no cover - environment problem, not a logic one
    sys.exit("needs pillow + numpy:  pip install pillow numpy")

ROOT = Path(__file__).resolve().parent.parent
FOOTAGE = ROOT / "video/public/footage"

# Per-channel distance from the sampled ground that still counts as ground.
# 34 (the value cutout.py uses on a flat studio grey) bleeds into the paper
# texture the style line asks for; 26 holds the edge and leaves the grain.
TOL = 26
# Ground is sampled from the border ring rather than one corner: a single pixel
# is a fine way to be defeated by a JPEG artefact.
RING = 6


def cut(path: Path, tol: int) -> tuple[Image.Image, float]:
    """The image with its edge-connected ground made transparent, and how much
    of the frame that turned out to be."""
    im = Image.open(path).convert("RGB")
    px = np.asarray(im).astype(np.int16)
    h, w, _ = px.shape

    ring = np.concatenate(
        [
            px[:RING].reshape(-1, 3),
            px[-RING:].reshape(-1, 3),
            px[:, :RING].reshape(-1, 3),
            px[:, -RING:].reshape(-1, 3),
        ]
    )
    ground = np.median(ring, axis=0)

    near = np.abs(px - ground).max(axis=2) <= tol

    # Flood from every border pixel that looks like ground. A scanline-free BFS
    # is slower than it could be but runs once per image, ever.
    seen = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if near[y, x] and not seen[y, x]:
                seen[y, x] = True
                q.append((y, x))

    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and near[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                q.append((ny, nx))

    alpha = Image.fromarray(np.where(seen, 0, 255).astype(np.uint8), mode="L")
    # One pixel of feather. A hard alpha edge on a cut-out that then moves is
    # the thing that reads as "pasted in MS Paint" the moment it translates.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.8))

    out = im.convert("RGBA")
    out.putalpha(alpha)
    return out, float(seen.mean())


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--tol", type=int, default=TOL)
    ap.add_argument("--keep", action="store_true", help="leave the .jpg on disk")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--only", type=int, help="just this beat")
    args = ap.parse_args()

    stills = sorted(
        p
        for p in FOOTAGE.glob("beat-*.jp*g")
        if not args.only or p.stem.split("-")[1] == str(args.only)
    )
    if not stills:
        sys.exit(f"no beat-*.jpg in {FOOTAGE}")

    for src in stills:
        dst = src.with_suffix(".png")
        if dst.exists():
            print(f"  -- {src.name:18} already cut")
            continue
        out, share = cut(src, args.tol)
        # A cut that took almost nothing found no ground; one that took almost
        # everything ate the subject. Either way the .jpg is the safer file, and
        # `darken` will still key it at render time.
        if share < 0.04:
            print(f"  !! {src.name:18} ground {share:.0%} - no flat ground found, kept .jpg")
            continue
        if share > 0.93:
            print(f"  !! {src.name:18} ground {share:.0%} - ate the subject, kept .jpg")
            continue
        print(f"  ok {src.name:18} ground {share:.0%} -> {dst.name}")
        if args.dry:
            continue
        out.save(dst)
        if not args.keep:
            src.unlink()

    print("\nnpm run footage   # rebuild the manifest so the .png files are picked up")


if __name__ == "__main__":
    main()
