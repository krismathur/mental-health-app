"""
Original replacement art for the images whose provenance could not be
established.

Seven files were real photographs at stock-download dimensions with the
metadata stripped, so there was no way to tell a permissive Unsplash license
from a Google image search. Several also carried third-party marks (Toyota,
Under Armour, Brooks, Derbystar, and a phone home screen full of app icons).
Rather than guess about licensing, they are replaced here with art generated
from scratch.

Everything is drawn with primitives, so nothing is derived from another image.
The shared language is: deep navy ground, one accent per image, soft light
built up with ImageChops.screen, and a geometric sports cue -- a track curve, a
pitch line, a rising arc. Screen is used rather than Image.blend because blend
toward a dark layer darkens the whole frame instead of lighting part of it.

Run: python3 scripts/generate-page-art.py
"""

from PIL import Image, ImageDraw, ImageFilter, ImageChops
import math
import os

NAVY = (11, 24, 43)

ACCENTS = {
    "arena": (56, 132, 232),
    "goal": (34, 168, 132),
    "lifting": (232, 84, 74),
    "mind": (108, 122, 240),
    "signup": (56, 160, 232),
    "questions": (240, 158, 60),
    "plan": (96, 190, 150),
}


def base(size, accent, warm=0.0):
    """Vertical gradient from near-black up to a dim tint of the accent."""
    width, height = size
    image = Image.new("RGB", size, NAVY)
    draw = ImageDraw.Draw(image)

    for y in range(height):
        t = y / float(height - 1)
        # Darker at the top, slightly lifted at the bottom, so text laid over
        # the top of the image keeps its contrast.
        lift = 0.10 + 0.30 * t
        r = int(NAVY[0] + (accent[0] - NAVY[0]) * lift * 0.55 + warm * 26 * t)
        g = int(NAVY[1] + (accent[1] - NAVY[1]) * lift * 0.55 + warm * 14 * t)
        b = int(NAVY[2] + (accent[2] - NAVY[2]) * lift * 0.55)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    return image


def glow(size, spots):
    """Additive light. spots = [(x, y, radius, intensity), ...]"""
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for (x, y, radius, intensity) in spots:
        steps = 26
        for i in range(steps, 0, -1):
            t = i / float(steps)
            r = radius * t
            value = int(255 * intensity * (1 - t) ** 2)
            draw.ellipse([x - r, y - r, x + r, y + r], fill=(value, value, value))

    return layer.filter(ImageFilter.GaussianBlur(radius=max(size) * 0.03))


def tinted(mono, accent, strength=1.0):
    r, g, b = mono.split()
    return Image.merge("RGB", (
        r.point(lambda v: int(v * accent[0] / 255.0 * strength)),
        g.point(lambda v: int(v * accent[1] / 255.0 * strength)),
        b.point(lambda v: int(v * accent[2] / 255.0 * strength)),
    ))


def vignette(image, strength=0.55):
    width, height = image.size
    mask = Image.new("L", (width, height), 0)
    draw = ImageDraw.Draw(mask)
    inset = int(min(width, height) * 0.06)
    draw.ellipse([-inset, -inset, width + inset, height + inset], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(radius=min(width, height) * 0.22))
    dark = Image.new("RGB", (width, height), (0, 0, 0))
    return Image.composite(image, Image.blend(image, dark, strength), mask)


def track_curve(size, accent):
    """Sweeping lanes, the way a track bends away from the camera."""
    width, height = size
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for lane in range(7):
        offset = lane * height * 0.085
        points = []
        for i in range(0, width + 12, 12):
            t = i / float(width)
            y = height * 0.94 - offset - math.sin(t * 1.5) * height * 0.30
            points.append((i, y))
        draw.line(points, fill=(150, 150, 150), width=max(2, height // 300))

    layer = layer.filter(ImageFilter.GaussianBlur(radius=1.4))
    return tinted(layer, accent, 0.9)


def pitch_lines(size, accent):
    """A goal box in perspective."""
    width, height = size
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)
    thickness = max(2, height // 260)

    horizon = height * 0.62
    draw.line([(0, horizon), (width, horizon)], fill=(130, 130, 130), width=thickness)

    box_w, box_h = width * 0.44, height * 0.26
    left = width * 0.5 - box_w / 2
    draw.line([(left, height), (left + box_w * 0.16, horizon)], fill=(130, 130, 130), width=thickness)
    draw.line([(left + box_w, height), (left + box_w * 0.84, horizon)], fill=(130, 130, 130), width=thickness)
    draw.line([(left + box_w * 0.16, horizon), (left + box_w * 0.84, horizon)], fill=(130, 130, 130), width=thickness)
    draw.line([(left + box_w * 0.06, horizon + box_h), (left + box_w * 0.94, horizon + box_h)],
              fill=(110, 110, 110), width=thickness)

    layer = layer.filter(ImageFilter.GaussianBlur(radius=1.2))
    return tinted(layer, accent, 0.85)


def rising_arc(size, accent, sweep=0.62):
    """The comeback curve: a line that climbs left to right."""
    width, height = size
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)

    points = []
    for i in range(0, width + 8, 8):
        t = i / float(width)
        y = height * (0.88 - sweep * (t ** 1.7))
        points.append((i, y))

    draw.line(points, fill=(230, 230, 230), width=max(3, height // 130))
    layer = layer.filter(ImageFilter.GaussianBlur(radius=max(size) * 0.006))
    return tinted(layer, accent, 1.0)


def beams(size, accent, count=5):
    """Stadium light shafts angled down from above."""
    width, height = size
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)

    for i in range(count):
        x = width * (0.10 + 0.20 * i)
        top = width * 0.05
        draw.polygon(
            [(x, -height * 0.1), (x + top, -height * 0.1), (x + top * 3.2, height), (x - top * 1.4, height)],
            fill=(48, 48, 48),
        )

    layer = layer.filter(ImageFilter.GaussianBlur(radius=max(size) * 0.02))
    return tinted(layer, accent, 0.8)


def build(name, size, accent, elements, spots, warm=0.0, card=False):
    image = base(size, accent, warm)
    strength = 1.35 if card else 0.85
    image = ImageChops.screen(image, tinted(glow(size, spots), accent, strength))

    for element in elements:
        image = ImageChops.screen(image, element)

    # A card is seen at 52px in the onboarding header. The vignette that gives
    # a full-bleed background depth just turns a thumbnail into a brown smudge,
    # so cards get a light one and a stronger accent instead.
    return vignette(image, 0.22 if card else 0.55)


def mark(size, accent, kind):
    """A single bold motif, legible when the card is scaled to a thumbnail."""
    width, height = size
    layer = Image.new("RGB", size, (0, 0, 0))
    draw = ImageDraw.Draw(layer)
    cx, cy = width * 0.5, height * 0.48
    unit = min(width, height)
    stroke = max(4, int(unit * 0.035))

    if kind == "target":
        for ring in (0.34, 0.22, 0.10):
            r = unit * ring
            draw.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(235, 235, 235), width=stroke)
    elif kind == "spark":
        r = unit * 0.30
        for i in range(8):
            angle = i * math.pi / 4
            draw.line([(cx + math.cos(angle) * r * 0.42, cy + math.sin(angle) * r * 0.42),
                       (cx + math.cos(angle) * r, cy + math.sin(angle) * r)],
                      fill=(235, 235, 235), width=stroke)
        draw.ellipse([cx - r * 0.30, cy - r * 0.30, cx + r * 0.30, cy + r * 0.30],
                     outline=(235, 235, 235), width=stroke)
    elif kind == "steps":
        step_w = unit * 0.17
        for i in range(3):
            x = cx - step_w * 1.5 + i * step_w
            h = unit * (0.12 + 0.11 * i)
            draw.rectangle([x, cy + unit * 0.20 - h, x + step_w * 0.72, cy + unit * 0.20],
                           outline=(235, 235, 235), width=stroke)
    elif kind == "chevron":
        r = unit * 0.26
        for k in (0, 1):
            off = k * unit * 0.16
            draw.line([(cx - r, cy + r * 0.5 - off), (cx, cy - r * 0.5 - off), (cx + r, cy + r * 0.5 - off)],
                      fill=(235, 235, 235), width=stroke, joint="curve")

    layer = layer.filter(ImageFilter.GaussianBlur(radius=unit * 0.004))
    return tinted(layer, (255, 255, 255), 0.82)


def save(image, path, quality=86):
    image.save(path, "JPEG", quality=quality, optimize=True, progressive=True)
    return os.path.getsize(path) / 1024


if __name__ == "__main__":
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(root)
    out = "public/images"

    big = (1600, 1067)
    card = (600, 400)

    jobs = []

    # --- page backgrounds ---
    a = ACCENTS["arena"]
    jobs.append(("bg-auth-arena.jpg", build(
        "arena", big, a,
        [beams(big, a, 5), track_curve(big, a)],
        [(big[0] * 0.5, big[1] * 0.18, big[1] * 0.85, 0.55)],
    )))

    a = ACCENTS["goal"]
    jobs.append(("bg-home-goal.jpg", build(
        "goal", big, a,
        [pitch_lines(big, a)],
        [(big[0] * 0.5, big[1] * 0.55, big[1] * 0.95, 0.42),
         (big[0] * 0.16, big[1] * 0.20, big[1] * 0.40, 0.30)],
    )))

    a = ACCENTS["lifting"]
    jobs.append(("bg-welcome-lifting.jpg", build(
        "lifting", big, a,
        [rising_arc(big, a, 0.58)],
        [(big[0] * 0.72, big[1] * 0.66, big[1] * 0.90, 0.50),
         (big[0] * 0.22, big[1] * 0.30, big[1] * 0.45, 0.26)],
        warm=0.5,
    )))

    # --- onboarding background, replacing the Wimbledon render ---
    a = ACCENTS["signup"]
    jobs.append(("onboarding-court.jpg", build(
        "court", big, a,
        [beams(big, a, 4), pitch_lines(big, a)],
        [(big[0] * 0.5, big[1] * 0.30, big[1] * 1.0, 0.48)],
    )))

    # --- 600x400 cards ---
    a = ACCENTS["mind"]
    jobs.append(("card-mind.jpg", build(
        "mind", card, a, [rising_arc(card, a, 0.5), mark(card, a, "spark")],
        [(card[0] * 0.5, card[1] * 0.45, card[1] * 1.10, 0.62)], card=True,
    )))

    a = ACCENTS["signup"]
    jobs.append(("step-signup.jpg", build(
        "signup", card, a, [mark(card, a, "chevron")],
        [(card[0] * 0.5, card[1] * 0.40, card[1] * 1.05, 0.62)], card=True,
    )))

    a = ACCENTS["questions"]
    jobs.append(("step-questions.jpg", build(
        "questions", card, a, [mark(card, a, "target")],
        [(card[0] * 0.5, card[1] * 0.45, card[1] * 1.05, 0.60)], warm=0.3, card=True,
    )))

    a = ACCENTS["plan"]
    jobs.append(("step-plan.jpg", build(
        "plan", card, a, [rising_arc(card, a, 0.6), mark(card, a, "steps")],
        [(card[0] * 0.5, card[1] * 0.45, card[1] * 1.05, 0.60)], card=True,
    )))

    for filename, image in jobs:
        kb = save(image, os.path.join(out, filename))
        print(f"  {filename:28} {image.size[0]}x{image.size[1]}  {kb:.0f}KB")
