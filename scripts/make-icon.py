"""Build Windows and PWA icons from build/icon-source.png (option A)."""

from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError as err:
    raise SystemExit("Pillow is required: python3 -m pip install pillow") from err

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "build" / "icon-source.png"
BUILD = ROOT / "build"
PUBLIC = ROOT / "public"
ICO_SIZES = (16, 24, 32, 48, 64, 128, 256)
PNG_TARGETS = {
    BUILD / "icon.png": 256,
    BUILD / "icon-32.png": 32,
    PUBLIC / "icon-192.png": 192,
    PUBLIC / "icon-512.png": 512,
    PUBLIC / "apple-touch-icon.png": 180,
}


def square(image: Image.Image, size: int) -> Image.Image:
    return image.convert("RGBA").resize((size, size), Image.Resampling.LANCZOS)


def main() -> None:
    src_path = Path(sys.argv[1]) if len(sys.argv) > 1 else SOURCE
    if not src_path.exists():
        raise SystemExit(f"missing icon source: {src_path}")

    source = Image.open(src_path).convert("RGBA")
    BUILD.mkdir(exist_ok=True)
    PUBLIC.mkdir(exist_ok=True)
    SOURCE.parent.mkdir(exist_ok=True)
    if src_path.resolve() != SOURCE.resolve():
        square(source, 512).save(SOURCE, format="PNG")
        source = Image.open(SOURCE).convert("RGBA")

    for dest, size in PNG_TARGETS.items():
        square(source, size).save(dest, format="PNG")

    ico_images = [square(source, size) for size in ICO_SIZES]
    ico_images[-1].save(
        BUILD / "icon.ico",
        format="ICO",
        sizes=[(size, size) for size in ICO_SIZES],
        append_images=ico_images[:-1],
    )
    print("wrote", BUILD / "icon.ico")
    for dest in PNG_TARGETS:
        print("wrote", dest)


if __name__ == "__main__":
    main()
