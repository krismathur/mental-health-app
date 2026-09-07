#!/usr/bin/env python3
"""
Generate the Comeback Corner card background.

Replaces frustrated-athlete.png, which was a stock photograph of an
identifiable adult with no license on record -- exactly the exposure the
character work removed everywhere else. It was also tonally wrong: a grim
photo of a grown man next to three illustrated cards on an app for 10-18s.

This is original, generated art: a dark field with a rising arc, meant to
read as "the comeback" rather than "the mistake". Palette matches the red
accent already on .fix-box.

Run:  python3 scripts/generate-zone-art.py
"""

import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public/images/zone-comeback.jpg")

W, H = 1536, 1024
SS = 2  # supersample, then downscale for clean curves

BASE_TOP = (18, 8, 10)
BASE_BOTTOM = (5, 4, 6)
RED = (229, 62, 62)
EMBER = (255, 138, 92)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def main():
    w, h = W * SS, H * SS
    img = Image.new("RGB", (w, h), BASE_BOTTOM)
    draw = ImageDraw.Draw(img)

    # vertical base gradient
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=lerp(BASE_TOP, BASE_BOTTOM, y / h))

    # --- soft ember glow low-left ------------------------------------------
    # Light is ADDED, not blended: blending toward a mostly-black glow layer
    # darkens the whole frame instead of lighting part of it.
    glow = Image.new("RGB", (w, h), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    cx, cy = int(w * 0.32), int(h * 0.78)
    for i in range(70, 0, -1):
        t = i / 70.0
        r = int(w * 0.46 * t)
        v = (1 - t) ** 1.7
        gd.ellipse([cx - r, cy - int(r * 0.70), cx + r, cy + int(r * 0.70)],
                   fill=(int(150 * v), int(34 * v), int(40 * v)))
    glow = glow.filter(ImageFilter.GaussianBlur(w // 22))
    img = ImageChops.screen(img, glow)

    # --- the rising arc: the whole point of the image ----------------------
    arc = Image.new("RGB", (w, h), (0, 0, 0))
    ad = ImageDraw.Draw(arc)
    points = []
    for i in range(0, 1001):
        t = i / 1000.0
        x = w * (0.05 + 0.92 * t)
        y = h * (0.88 - 0.56 * (1 - (1 - t) ** 2.2))
        points.append((x, y))

    ad.line(points, fill=(120, 26, 32), width=int(30 * SS), joint="curve")
    ad.line(points, fill=RED, width=int(12 * SS), joint="curve")
    ad.line(points, fill=EMBER, width=int(4 * SS), joint="curve")

    # halo first, then the crisp line on top, both added as light
    img = ImageChops.screen(img, arc.filter(ImageFilter.GaussianBlur(14 * SS)))
    img = ImageChops.screen(img, arc.filter(ImageFilter.GaussianBlur(int(1.5 * SS))))

    # --- sparse rising motion streaks --------------------------------------
    streaks = Image.new("RGB", (w, h), (0, 0, 0))
    sd = ImageDraw.Draw(streaks)
    for i in range(22):
        t = i / 22.0
        x0 = int(w * (-0.05 + 1.15 * t))
        y0 = int(h * (0.24 + 0.78 * ((i * 37) % 100) / 100.0))
        length = int(h * (0.07 + 0.13 * ((i * 53) % 100) / 100.0))
        v = 40 + (i * 29) % 60
        sd.line([(x0, y0), (x0 + int(length * 0.5), y0 - length)],
                fill=(v, int(v * 0.26), int(v * 0.3)), width=max(1, 2 * SS))
    streaks = streaks.filter(ImageFilter.GaussianBlur(4 * SS))
    img = ImageChops.screen(img, streaks)

    # --- vignette so the card's white text stays readable -------------------
    vign = Image.new("L", (w, h), 0)
    vd = ImageDraw.Draw(vign)
    vd.ellipse([-int(w * 0.24), -int(h * 0.34), int(w * 1.24), int(h * 1.26)], fill=255)
    vign = vign.filter(ImageFilter.GaussianBlur(w // 10))
    img = Image.composite(img, Image.new("RGB", (w, h), (6, 3, 4)), vign)

    img = img.resize((W, H), Image.LANCZOS)
    img.save(OUT, quality=86, optimize=True, progressive=True)
    print("wrote %s (%d bytes)" % (OUT, os.path.getsize(OUT)))


if __name__ == "__main__":
    main()
