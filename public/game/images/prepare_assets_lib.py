"""Shared sprite-prep helpers for the MindZone games.

The image generator bakes a grey checkerboard into "transparent" sprites, so
these helpers flood fill that pattern away from the borders and trim the result
down to the artwork.
"""

from collections import deque

from PIL import Image

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
    """Makes the border-connected background transparent, leaving art intact."""
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
    return image.resize((max(1, round(image.width * scale)), target), Image.LANCZOS)


def resize_to_width(image, target):
    scale = target / image.width
    return image.resize((target, max(1, round(image.height * scale))), Image.LANCZOS)
