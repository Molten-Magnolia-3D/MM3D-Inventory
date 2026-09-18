import struct
import zlib
from pathlib import Path


def write_png(width: int, height: int, rgba: bytes) -> bytes:
    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = b"".join(b"\x00" + rgba[y * width * 4 : (y + 1) * width * 4] for y in range(height))
    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def px(r: int, g: int, b: int, a: int = 255) -> bytes:
    return bytes((r, g, b, a))


def draw_icon(size: int) -> bytes:
    bg = px(22, 17, 14)
    copper = px(213, 106, 44)
    cream = px(244, 235, 224)
    pixels = bytearray(bg * size * size)

    def setp(x: int, y: int, color: bytes) -> None:
        if 0 <= x < size and 0 <= y < size:
            i = (y * size + x) * 4
            pixels[i : i + 4] = color

    margin = size // 8
    radius = size // 6
    for y in range(margin, size - margin):
        for x in range(margin, size - margin):
            dx = min(x - margin, size - margin - 1 - x)
            dy = min(y - margin, size - margin - 1 - y)
            if dx < 0 or dy < 0:
                continue
            if (dx < radius and dy < radius) and ((radius - dx) ** 2 + (radius - dy) ** 2 > radius * radius):
                continue
            setp(x, y, copper)

    # Block letter M
    left = size * 28 // 100
    right = size * 72 // 100
    top = size * 30 // 100
    bottom = size * 72 // 100
    thick = max(3, size // 10)
    mid = (left + right) // 2
    peak = top + (bottom - top) // 3
    for y in range(top, bottom):
        for x in range(left, left + thick):
            setp(x, y, cream)
        for x in range(right - thick, right):
            setp(x, y, cream)
        t = (y - top) / max(1, peak - top)
        if y <= peak:
            x1 = int(left + (mid - left) * t)
            x2 = int(right - (right - mid) * t)
            for x in range(x1, min(x1 + thick, size)):
                setp(x, y, cream)
            for x in range(max(0, x2 - thick), x2):
                setp(x, y, cream)
    return bytes(pixels)


def png_to_ico(png: bytes) -> bytes:
    header = struct.pack("<HHH", 0, 1, 1)
    entry = struct.pack("<BBBBHHII", 0, 0, 0, 0, 1, 32, len(png), 6 + 16)
    return header + entry + png


def main() -> None:
    out = Path("build")
    out.mkdir(exist_ok=True)
    png256 = write_png(256, 256, draw_icon(256))
    png32 = write_png(32, 32, draw_icon(32))
    (out / "icon.png").write_bytes(png256)
    (out / "icon.ico").write_bytes(png_to_ico(png256))
    (out / "icon-32.png").write_bytes(png32)
    print("wrote build/icon.ico")


if __name__ == "__main__":
    main()
