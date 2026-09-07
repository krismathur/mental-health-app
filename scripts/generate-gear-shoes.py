"""
Original replacement art for the seven wardrobe footwear items.

The shipped shoe assets were product photographs with the background removed:
`gear-shoe-sneakers` was an Air Jordan 4 "White Oreo" and `gear-shoe-highs` an
Air Jordan 6. Sneaker silhouettes are protected as trade dress on top of the
photographer's copyright and the marks on the shoe itself, so this is the one
part of the wardrobe where a recolour or a crop would not have helped.

These are drawn from primitives instead: a flat illustrated pair per item, in
the colour the studio already records for that item in athlete-studio.js, so
the swatches in the picker still match what lands on the character.

The studio crops each gear image to its content and scales it to the width of
the body hull, so what matters is that the pair fills the canvas and sits on a
transparent ground. Exact dimensions do not need to match the old files.

Run: python3 scripts/generate-gear-shoes.py
"""

from PIL import Image, ImageDraw, ImageFilter
import os

W, H = 900, 600
OUT = "public/images/studio/gear"
THUMBS = "public/images/studio/thumbs"
THUMB = 240

# id -> (upper, sole, high-top?, studs?)
# Colours mirror the `color` field on each entry in SHOES in athlete-studio.js.
SHOES = {
    "sneakers": ((244, 244, 244), (255, 255, 255), False, False),
    "highs":    ((34, 34, 34), (240, 240, 240), True, False),
    "cleats":   ((17, 17, 17), (54, 54, 54), False, True),
    "gold":     ((212, 160, 23), (250, 244, 226), False, False),
    "red":      ((196, 18, 47), (248, 248, 248), False, False),
    "runners":  ((232, 232, 232), (168, 178, 190), False, False),
    "baseball": ((238, 238, 238), (60, 60, 60), False, True),
}


def darken(color, amount=0.72):
    return tuple(int(c * amount) for c in color)


def lighten(color, amount=0.35):
    return tuple(int(c + (255 - c) * amount) for c in color)


def draw_shoe(draw, x, y, w, h, upper, sole, high, studs):
    """One shoe in side profile, toe to the right.

    Drawn as a single silhouette rather than a body plus separate toe and
    collar ellipses -- those read as stray circles once the pair is scaled
    down to the 240px picker thumbnail.
    """
    def px(u, v):
        return (x + u * w, y + v * h)

    outline = darken(upper, 0.55)
    collar_top = 0.06 if high else 0.30

    # Heel at the left, ankle opening, instep dipping to the laces, then a
    # long sweep out to a rounded toe.
    body = [
        px(0.10, collar_top + 0.04), px(0.13, collar_top),
        px(0.30, collar_top), px(0.33, collar_top + 0.06),
        px(0.36, 0.34), px(0.46, 0.40), px(0.60, 0.46),
        px(0.76, 0.53), px(0.88, 0.62), px(0.93, 0.72),
        px(0.93, 0.80), px(0.08, 0.80), px(0.06, 0.60),
    ]
    draw.polygon(body, fill=upper, outline=outline)

    # Ankle opening: a shallow arc, not a full ellipse.
    draw.arc([px(0.11, collar_top - 0.03)[0], y + (collar_top - 0.03) * h,
              px(0.33, collar_top - 0.03)[0], y + (collar_top + 0.07) * h],
             start=180, end=360, fill=lighten(upper, 0.30),
             width=max(2, int(h * 0.020)))

    # Midsole and outsole.
    draw.rounded_rectangle(
        [px(0.04, 0.78)[0], y + 0.78 * h, px(0.95, 0.78)[0], y + 0.90 * h],
        radius=int(h * 0.055), fill=sole, outline=darken(sole, 0.78),
    )
    draw.rounded_rectangle(
        [px(0.04, 0.87)[0], y + 0.87 * h, px(0.95, 0.87)[0], y + 0.95 * h],
        radius=int(h * 0.032), fill=darken(sole, 0.80),
    )

    # Laces across the instep, following the silhouette's slope.
    lace = lighten(upper, 0.55) if sum(upper) < 380 else darken(upper, 0.62)
    for i in range(3):
        u = 0.34 + i * 0.09
        v = 0.36 + i * 0.055
        draw.line([px(u, v), px(u + 0.09, v - 0.05)],
                  fill=lace, width=max(2, int(h * 0.016)))

    if studs:
        for i in range(4):
            cx, cy = px(0.16 + i * 0.21, 0.95)
            r = h * 0.024
            draw.ellipse([cx - r, cy - r * 0.5, cx + r, cy + r * 1.5], fill=darken(sole, 0.62))


def build(upper, sole, high, studs):
    # Drawn at 3x and downsampled, which is the cheapest way to get clean edges
    # out of PIL's non-antialiased polygon fills.
    scale = 3
    image = Image.new("RGBA", (W * scale, H * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    shoe_w, shoe_h = W * scale * 0.46, H * scale * 0.86
    top = H * scale * 0.07

    # Back shoe first so the front one overlaps it.
    draw_shoe(draw, W * scale * 0.50, top, shoe_w, shoe_h, darken(upper, 0.86),
              darken(sole, 0.90), high, studs)
    draw_shoe(draw, W * scale * 0.02, top + H * scale * 0.04, shoe_w, shoe_h,
              upper, sole, high, studs)

    image = image.resize((W, H), Image.LANCZOS)

    # A soft contact shadow so the pair does not float on the character.
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.ellipse([W * 0.04, H * 0.90, W * 0.96, H * 0.99], fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=9))

    return Image.alpha_composite(shadow, image)


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)

    for name, (upper, sole, high, studs) in SHOES.items():
        image = build(upper, sole, high, studs)

        # Trim to content, matching how the previous assets were stored.
        image = image.crop(image.getbbox())

        path = os.path.join(OUT, f"gear-shoe-{name}.png")
        image.save(path, "PNG", optimize=True)

        thumb = image.copy()
        thumb.thumbnail((THUMB, THUMB), Image.LANCZOS)
        canvas = Image.new("RGBA", (THUMB, THUMB), (0, 0, 0, 0))
        canvas.paste(thumb, ((THUMB - thumb.width) // 2, (THUMB - thumb.height) // 2), thumb)
        canvas.save(os.path.join(THUMBS, f"gear-shoe-{name}.png"), "PNG", optimize=True)

        print(f"  gear-shoe-{name:10} {image.size[0]}x{image.size[1]}  "
              f"{os.path.getsize(path) / 1024:.0f}KB")
