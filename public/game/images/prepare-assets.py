"""One-time asset prep for The Impossible Mountain.

Cuts the baked-in checkerboard out of the sprites and shrinks everything to
sensible web sizes.

Run from the project root:  python3 public/game/images/prepare-assets.py
"""

import os

from PIL import Image

from prepare_assets_lib import cut_out_background, resize_to_height, resize_to_width, trim

HERE = os.path.dirname(os.path.abspath(__file__))

# Sprites need their checkerboard removed; textures are opaque and only resized.
SPRITES = {
    "climber-red.png": 320,
    "climber-teal.png": 320,
    "climber-orange.png": 320,
    "crystal.png": 128
}

TEXTURES = {
    "rock-tile.png": 256,
    "ice-tile.png": 256,
    "mountain-sky.png": 1280
}


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
