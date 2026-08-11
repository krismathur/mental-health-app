"""One-time asset prep for The Impossible Mountain.

The image generator bakes a grey checkerboard into the "transparent" sprites, so
this flood fills that pattern away from the borders, trims the sprite to its
content, and shrinks everything to sensible web sizes.

Run from the project root:  python3 public/game/images/prepare-assets.py
"""

import os
from collections import deque

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))

# Sprites need their checkerboard removed; textures are opaque and only resized.
SPRITES = {
    "climber-red.png": 320,
    "climber-teal.png": 320,
    "climber-orange.png": 320,
    "crystal.png": 128,
}

TEXTURES = {
    "rock-tile.png": 256,
    "ice-tile.png": 256,
    "mountain-sky.png": 1280,
}

# The checkerboard is light grey on white, so anything brighter than this and
# close to neutral grey counts as background.
BRIGHTNESS_FLOOR = 195
NEUTRAL_TOLERANCE = 18


def is_background(pixel):
    r, g, b = pixel[:3]
    if min(r, g, b) < BRIGHTNESS_FLOOR:
        return False
    # Checkerboard squares are neutral; coloured art is not.
    return max(r, g, b) - min(r, g, b) <= NEUTRAL_TOLERANCE


def cut_out_background(image):
    image = image.convert("RGBA")
    width, height = image.size
    pixels = image.load()

    transparent = bytearray(width * height)
    queue = deque()

    def visit(x, y):
        if 0 <= x < width and 0 <= y < height:
            index = y * width + x
            if not transparent[index] and is_background(pixels[x, y]):
                transparent[index] = 1
                queue.append((x, y))

    for x in range(width):
        visit(x, 0)
        visit(x, height - 1)
    for y in range(height):
        visit(0, y)
        visit(width - 1, y)

    while queue:
        x, y = queue.popleft()
        visit(x + 1, y)
        visit(x - 1, y)
        visit(x, y + 1)
        visit(x, y - 1)

    for y in range(height):
        row = y * width
        for x in range(width):
            if transparent[row + x]:
                pixels[x, y] = (0, 0, 0, 0)

    return image


def trim(image):
    box = image.getbbox()
    return image.crop(box) if box else image


def resize_to_height(image, target):
    scale = target / image.height
    return image.resize(
        (max(1, round(image.width * scale)), target),
        Image.LANCZOS,
    )


def resize_to_width(image, target):
    scale = target / image.width
    return image.resize(
        (target, max(1, round(image.height * scale))),
        Image.LANCZOS,
    )


def main():
    for name, target_height in SPRITES.items():
        path = os.path.join(HERE, name)
        image = Image.open(path)
        before = image.size
        image = resize_to_height(trim(cut_out_background(image)), target_height)
        image.save(path, optimize=True)
        print(f"{name}: {before} -> {image.size} cut out, {os.path.getsize(path) // 1024} KB")

    for name, target_width in TEXTURES.items():
        path = os.path.join(HERE, name)
        image = Image.open(path).convert("RGB")
        before = image.size
        image = resize_to_width(image, target_width)
        image.save(path, optimize=True)
        print(f"{name}: {before} -> {image.size} resized, {os.path.getsize(path) // 1024} KB")


if __name__ == "__main__":
    main()
