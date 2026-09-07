#!/usr/bin/env python3
"""
Generate MindZone character art.

IMPORTANT: these are PLACEHOLDER figures. They are original, carry no likeness
of any real person, and are shaped to satisfy the athlete studio's pixel
detectors (see public/js/athlete-studio.js) so the wardrobe system keeps
working. They are not final art — see docs/character-art-spec.md for the
constraints any replacement must meet.

Outputs:
    public/images/characters/<id>.jpg              330x440 headshot
    public/images/characters/bodies/body-<id>.png  640x1020 RGBA full body

Run:  python3 scripts/generate-character-art.py
"""

import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_BODIES = os.path.join(ROOT, "public/images/characters/bodies")
OUT_HEADS = os.path.join(ROOT, "public/images/characters")

BODY_W, BODY_H = 640, 1020
HEAD_W, HEAD_H = 330, 440
SS = 3  # supersample factor for smooth edges

# Must match SKINS in public/js/athlete-studio.js. Every value below passes
# isSkinPixel(): warm (r-b >= 8), chroma >= 10, and above the alpha floor.
SKIN = {
    "fair":  (243, 210, 194),
    "light": (224, 172, 134),
    "tan":   (198, 134,  66),
    "brown": (141,  85,  36),
    "deep":  (92,   51,  23),
    "rich":  (59,   34,  20),
}

# The studio reads the base layer to find what it may cover. Keep the tank
# low-chroma mid-grey (isTankPixel: chroma < 48, 40 < luma < 195) and the
# shorts dark (isBaseShorts: luma < 95, chroma < 42).
TANK = (150, 150, 150)
SHORTS = (38, 38, 40)
SHOE = (244, 244, 246)
HAIR_BY_SKIN = {
    "fair":  (78, 58, 42),
    "light": (62, 44, 32),
    "tan":   (48, 34, 26),
    "brown": (36, 26, 20),
    "deep":  (28, 20, 16),
    "rich":  (24, 18, 14),
}

# id -> (shoulder half-width, hip half-width, height scale, head half-width)
BUILDS = {
    "lean":     (86, 66, 1.00, 46),
    "tall":     (90, 68, 1.06, 45),
    "compact":  (92, 76, 0.94, 48),
    "athletic": (98, 76, 1.00, 47),
    "heavy":    (112, 96, 0.98, 50),
    "wiry":     (82, 64, 0.98, 45),
}

CHARACTERS = [
    ("amara", "deep",  "lean"),
    ("theo",  "fair",  "tall"),
    ("rafa",  "tan",   "compact"),
    ("kofi",  "rich",  "athletic"),
    ("nora",  "light", "tall"),
    ("elena", "tan",   "compact"),
    ("malik", "brown", "athletic"),
    ("sione", "tan",   "heavy"),
    ("yuki",  "light", "wiry"),
    ("priya", "brown", "lean"),
]


def shade(color, factor):
    return tuple(max(0, min(255, int(c * factor))) for c in color)


def draw_body(skin_key, build_key):
    """Draw one full-body figure on transparent background."""
    skin = SKIN[skin_key]
    hair = HAIR_BY_SKIN[skin_key]
    sh_w, hip_w, scale, head_w = BUILDS[build_key]

    img = Image.new("RGBA", (BODY_W * SS, BODY_H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = BODY_W // 2

    def box(x0, y0, x1, y1, fill):
        d.rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill)

    def ellipse(x0, y0, x1, y1, fill):
        d.ellipse([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill)

    # Vertical layout, scaled about the hip so feet stay near the baseline.
    head_top = int(120 * (2 - scale))
    head_bot = head_top + int(150 * scale)
    shoulder = head_bot + int(46 * scale)
    waist = shoulder + int(250 * scale)
    hip = waist + int(60 * scale)
    knee = hip + int(150 * scale)
    ankle = knee + int(180 * scale)
    foot = min(BODY_H - 12, ankle + 46)

    # --- head -------------------------------------------------------------
    ellipse(cx - head_w, head_top, cx + head_w, head_bot, skin)
    # hair cap, kept clear of the face so faceCenter() finds skin
    d.pieslice(
        [(cx - head_w) * SS, head_top * SS, (cx + head_w) * SS, (head_bot - 34) * SS],
        180, 360, fill=hair,
    )
    # brow/eye hints give the face detector interior contrast
    eye_y = head_top + int(88 * scale)
    eye_dx = int(head_w * 0.42)
    eye_r = max(3, int(head_w * 0.10))
    for sx in (-eye_dx, eye_dx):
        ellipse(cx + sx - eye_r, eye_y - eye_r, cx + sx + eye_r, eye_y + eye_r, shade(hair, 0.8))

    # --- neck -------------------------------------------------------------
    neck_w = int(head_w * 0.52)
    box(cx - neck_w, head_bot - 16, cx + neck_w, shoulder + 6, shade(skin, 0.9))

    # --- arms (skin, outside the tank) ------------------------------------
    arm_w = int(sh_w * 0.30)
    for side in (-1, 1):
        ax = cx + side * (sh_w - arm_w // 2)
        ellipse(ax - arm_w, shoulder - 6, ax + arm_w, shoulder + 60, skin)
        box(ax - arm_w + 4, shoulder + 20, ax + arm_w - 4, waist + 40, skin)
        ellipse(ax - arm_w + 4, waist + 16, ax + arm_w - 4, waist + 62, skin)

    # --- torso in the grey tank -------------------------------------------
    d.polygon(
        [
            ((cx - sh_w) * SS, shoulder * SS),
            ((cx + sh_w) * SS, shoulder * SS),
            ((cx + hip_w) * SS, waist * SS),
            ((cx - hip_w) * SS, waist * SS),
        ],
        fill=TANK,
    )
    # shoulder/neck skin above the tank line
    ellipse(cx - neck_w - 6, shoulder - 22, cx + neck_w + 6, shoulder + 18, skin)

    # --- shorts -----------------------------------------------------------
    d.polygon(
        [
            ((cx - hip_w) * SS, waist * SS),
            ((cx + hip_w) * SS, waist * SS),
            ((cx + hip_w - 4) * SS, hip * SS),
            ((cx - hip_w + 4) * SS, hip * SS),
        ],
        fill=SHORTS,
    )
    leg_gap = max(6, hip_w // 8)
    for side in (-1, 1):
        lx = cx + side * (hip_w // 2)
        lw = hip_w // 2 - leg_gap // 2
        box(lx - lw, hip - 4, lx + lw, hip + int(80 * scale), SHORTS)

    # --- legs -------------------------------------------------------------
    thigh_w = int(hip_w * 0.44)
    calf_w = int(thigh_w * 0.72)
    short_bot = hip + int(80 * scale)
    for side in (-1, 1):
        lx = cx + side * (hip_w // 2)
        d.polygon(
            [
                ((lx - thigh_w) * SS, short_bot * SS),
                ((lx + thigh_w) * SS, short_bot * SS),
                ((lx + calf_w) * SS, ankle * SS),
                ((lx - calf_w) * SS, ankle * SS),
            ],
            fill=skin,
        )
        ellipse(lx - thigh_w, knee - 18, lx + thigh_w, knee + 18, shade(skin, 1.03))

    # --- shoes ------------------------------------------------------------
    for side in (-1, 1):
        lx = cx + side * (hip_w // 2)
        ellipse(lx - calf_w - 10, ankle - 12, lx + calf_w + 14, foot, SHOE)

    return img.resize((BODY_W, BODY_H), Image.LANCZOS)


def draw_head(skin_key, build_key):
    """Head-and-shoulders crop on an opaque card background."""
    skin = SKIN[skin_key]
    hair = HAIR_BY_SKIN[skin_key]
    _, _, scale, head_w = BUILDS[build_key]

    img = Image.new("RGB", (HEAD_W * SS, HEAD_H * SS), (26, 32, 44))
    d = ImageDraw.Draw(img)
    cx = HEAD_W // 2
    hw = int(head_w * 1.7)
    top = 70
    bot = top + int(hw * 2.35)

    def ellipse(x0, y0, x1, y1, fill):
        d.ellipse([x0 * SS, y0 * SS, x1 * SS, y1 * SS], fill=fill)

    # shoulders
    d.ellipse(
        [(cx - hw * 2) * SS, (bot - 20) * SS, (cx + hw * 2) * SS, (HEAD_H + hw) * SS],
        fill=TANK,
    )
    neck_w = int(hw * 0.5)
    d.rectangle(
        [(cx - neck_w) * SS, (bot - 60) * SS, (cx + neck_w) * SS, (bot + 60) * SS],
        fill=shade(skin, 0.9),
    )

    ellipse(cx - hw, top, cx + hw, bot, skin)
    d.pieslice(
        [(cx - hw) * SS, top * SS, (cx + hw) * SS, (bot - 58) * SS],
        180, 360, fill=hair,
    )

    eye_y = top + int((bot - top) * 0.52)
    eye_dx = int(hw * 0.40)
    eye_r = max(5, int(hw * 0.11))
    for sx in (-eye_dx, eye_dx):
        ellipse(cx + sx - eye_r, eye_y - eye_r, cx + sx + eye_r, eye_y + eye_r, shade(hair, 0.75))

    return img.resize((HEAD_W, HEAD_H), Image.LANCZOS)


def main():
    os.makedirs(OUT_BODIES, exist_ok=True)
    os.makedirs(OUT_HEADS, exist_ok=True)

    for cid, skin_key, build_key in CHARACTERS:
        body = draw_body(skin_key, build_key)
        body.save(os.path.join(OUT_BODIES, "body-%s.png" % cid), optimize=True)

        head = draw_head(skin_key, build_key)
        head.save(os.path.join(OUT_HEADS, "%s.jpg" % cid), quality=88, optimize=True)

        print("wrote %s (%s / %s)" % (cid, skin_key, build_key))

    print("\n%d characters generated." % len(CHARACTERS))


if __name__ == "__main__":
    main()
