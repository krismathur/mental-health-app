"""
Remove the branded footwear from the Krish mascot art.

The generated mascot wears Air Jordan 1s with a visible Swoosh and Jumpman on
every page he appears on. A mascot in branded shoes is the version of this
problem most likely to read as sponsorship, so the shoes have to go.

Repainting them was the first idea and it looks like what it is: a patch. What
works instead is fading the figure out below the knee. It reads as deliberate
styling rather than damage, it removes the trademark completely rather than
obscuring it, and it costs nothing at the sizes these actually render at.

Run: python3 scripts/clean-mascot-shoes.py
"""

from PIL import Image
import os

# Where the fade starts and ends, as a fraction of image height.
#
# The shoes begin at roughly 0.83 in all four images, so the fade has to reach
# full transparency BEFORE that line, not across it. A first pass ended the
# fade at 0.94 and left the Swoosh legible as a ghost -- a faded trademark is
# still a trademark. Everything at or below FADE_END is cleared outright.
FADE_START = 0.62
FADE_END = 0.80

TARGETS = [
    "public/images/krish.png",
    "public/images/krish-quest-guide.png",
    "public/images/krish-rewards.png",
    "public/images/krish-power-cards.png",
]


def fade_out_bottom(path):
    image = Image.open(path).convert("RGBA")
    width, height = image.size
    alpha = image.getchannel("A")

    start = int(height * FADE_START)
    end = int(height * FADE_END)

    pixels = alpha.load()

    for y in range(start, height):
        if y >= end:
            factor = 0.0
        else:
            factor = 1.0 - (y - start) / float(end - start)

        for x in range(width):
            current = pixels[x, y]
            if current:
                pixels[x, y] = int(current * factor)

    image.putalpha(alpha)
    image.save(path, "PNG", optimize=True)
    return width, height


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    for target in TARGETS:
        size = fade_out_bottom(target)
        kb = os.path.getsize(target) / 1024
        print(f"  faded {target}  {size[0]}x{size[1]}  {kb:.0f}KB")
