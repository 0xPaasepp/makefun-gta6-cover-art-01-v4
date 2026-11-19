#!/usr/bin/env python3
"""Velvet Heat — generate the 9 sample photos for GTA 6 cover art (v4).

Every sample is drawn programmatically with PIL: gradient skies, sun,
silhouettes, palm trees and a simple stylised subject. No copied pixels,
no external assets. Run: python3 tools/generate-samples.py
Outputs 9 JPEGs into app/samples/ (720x900 portrait, quality 88).
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "app", "samples")
W, H = 720, 900


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def sky(draw, top, mid, bot):
    for y in range(H):
        t = y / H
        c = lerp(top, mid, t) if t < 0.55 else lerp(mid, bot, (t - 0.55) / 0.45)
        draw.line([(0, y), (W, y)], fill=c)


def sun(draw, cx, cy, r, colour, glow):
    for i in range(6, 0, -1):
        rr = r + i * 26
        draw.ellipse([cx - rr, cy - rr, cx + rr, cy + rr], fill=glow)
    draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)


def skyline(draw, base, colour, seed, hmin=90, hmax=320):
    rnd = random.Random(seed)
    x = -10
    while x < W + 10:
        bw = rnd.randint(46, 110)
        bh = rnd.randint(hmin, hmax)
        draw.rectangle([x, base - bh, x + bw, base], fill=colour)
        for wy in range(base - bh + 14, base - 12, 26):
            for wx in range(x + 8, x + bw - 10, 18):
                if rnd.random() < 0.4:
                    draw.rectangle([wx, wy, wx + 7, wy + 10],
                                   fill=(255, 214, 120) if rnd.random() < 0.7 else (120, 240, 255))
        x += bw + rnd.randint(2, 14)


def palm(draw, x, y, s, colour, lean=0.0):
    # trunk
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((x + lean * t * t * 60 * s + math.sin(t * 2.2) * 8 * s,
                    y - t * 190 * s))
    draw.line(pts, fill=colour, width=max(6, int(12 * s)))
    tx, ty = pts[-1]
    for k in range(7):
        ang = math.pi * (0.08 + 0.14 * k) + (0.15 if k % 2 else -0.1)
        ex = tx + math.cos(ang) * 95 * s
        ey = ty + abs(math.sin(ang)) * 55 * s - 18 * s
        mx = tx + math.cos(ang) * 48 * s
        my = ty + abs(math.sin(ang)) * 30 * s + 26 * s
        draw.line([(tx, ty), (mx, my), (ex, ey)], fill=colour, width=max(4, int(7 * s)))


def person(draw, cx, base, s, skin, shirt, pants, hair):
    # legs
    draw.rectangle([cx - 26 * s, base - 150 * s, cx - 4 * s, base], fill=pants)
    draw.rectangle([cx + 4 * s, base - 150 * s, cx + 26 * s, base], fill=pants)
    # torso
    draw.rounded_rectangle([cx - 42 * s, base - 300 * s, cx + 42 * s, base - 140 * s],
                           radius=18 * s, fill=shirt)
    # arms
    draw.line([(cx - 40 * s, base - 285 * s), (cx - 62 * s, base - 170 * s)],
              fill=shirt, width=int(20 * s))
    draw.line([(cx + 40 * s, base - 285 * s), (cx + 62 * s, base - 170 * s)],
              fill=shirt, width=int(20 * s))
    # head
    draw.ellipse([cx - 34 * s, base - 372 * s, cx + 34 * s, base - 300 * s], fill=skin)
    draw.pieslice([cx - 36 * s, base - 380 * s, cx + 36 * s, base - 322 * s], 180, 360, fill=hair)
    # sunglasses
    draw.rounded_rectangle([cx - 30 * s, base - 348 * s, cx - 4 * s, base - 330 * s],
                           radius=6 * s, fill=(20, 20, 30))
    draw.rounded_rectangle([cx + 4 * s, base - 348 * s, cx + 30 * s, base - 330 * s],
                           radius=6 * s, fill=(20, 20, 30))


def base_img():
    return Image.new("RGB", (W, H)), None


def finish(img, name):
    img = img.filter(ImageFilter.GaussianBlur(0.4))
    img.save(os.path.join(OUT, name), quality=88)
    print("wrote", name)


def boombox():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (38, 12, 64), (214, 44, 120), (255, 140, 66))
    sun(d, 360, 300, 110, (255, 236, 170), (255, 120, 90))
    skyline(d, 760, (24, 8, 44), 11)
    # street
    d.rectangle([0, 760, W, H], fill=(16, 10, 30))
    # boombox on shoulder of a figure
    person(d, 360, 830, 1.15, (214, 164, 120), (250, 250, 244), (30, 30, 60), (24, 16, 12))
    d.rounded_rectangle([300, 420, 420, 520], radius=14, fill=(28, 28, 40))
    d.ellipse([322, 442, 372, 492], fill=(200, 200, 210))
    d.ellipse([388, 442, 408, 462], fill=(200, 200, 210))
    d.ellipse([388, 468, 408, 488], fill=(200, 200, 210))
    d.rectangle([300, 470, 420, 486], fill=(255, 90, 160))
    palm(d, 90, 780, 1.0, (12, 8, 26), lean=-0.4)
    palm(d, 640, 780, 0.85, (12, 8, 26), lean=0.4)
    finish(img, "boombox.jpg")


def jetski():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (10, 40, 90), (255, 110, 90), (255, 190, 110))
    sun(d, 500, 260, 95, (255, 244, 190), (255, 140, 80))
    # sea
    for y in range(560, H):
        t = (y - 560) / (H - 560)
        d.line([(0, y), (W, y)], fill=lerp((255, 130, 80), (16, 40, 90), t))
    for i in range(14):
        y = 580 + i * 22
        d.arc([40 + (i % 3) * 30, y, 300 + (i % 3) * 60, y + 16], 200, 340, fill=(255, 220, 180), width=3)
    # jetski + rider
    d.rounded_rectangle([210, 640, 520, 700], radius=26, fill=(255, 45, 120))
    d.rounded_rectangle([300, 600, 430, 650], radius=18, fill=(20, 20, 40))
    person(d, 380, 640, 0.8, (200, 150, 108), (255, 255, 255), (24, 24, 50), (20, 14, 10))
    d.arc([150, 690, 580, 760], 180, 360, fill=(255, 255, 255), width=6)
    finish(img, "jetski.jpg")


def rooftop():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (20, 8, 60), (150, 30, 110), (255, 120, 60))
    sun(d, 200, 330, 90, (255, 240, 180), (255, 110, 80))
    skyline(d, 700, (18, 6, 36), 23, 120, 380)
    d.rectangle([0, 700, W, H], fill=(22, 10, 34))
    person(d, 380, 800, 1.2, (222, 172, 128), (20, 20, 34), (60, 40, 80), (16, 10, 8))
    d.line([(330, 700), (300, 620)], fill=(255, 200, 120), width=4)
    d.line([(430, 700), (470, 615)], fill=(255, 200, 120), width=4)
    finish(img, "rooftop.jpg")


def convertible():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (255, 150, 80), (255, 110, 140), (90, 20, 90))
    sun(d, 360, 240, 100, (255, 250, 200), (255, 150, 100))
    skyline(d, 640, (40, 10, 60), 31, 80, 200)
    d.rectangle([0, 640, W, H], fill=(30, 12, 40))
    # road
    d.polygon([(0, 900), (W, 900), (560, 640), (160, 640)], fill=(24, 24, 36))
    d.line([(360, 900), (360, 640)], fill=(255, 220, 120), width=6)
    # car body
    d.rounded_rectangle([120, 700, 600, 800], radius=30, fill=(214, 20, 60))
    d.rounded_rectangle([180, 640, 480, 710], radius=24, fill=(160, 10, 44))
    d.ellipse([170, 770, 250, 850], fill=(16, 16, 22))
    d.ellipse([470, 770, 550, 850], fill=(16, 16, 22))
    d.ellipse([185, 785, 235, 835], fill=(120, 120, 130))
    d.ellipse([485, 785, 535, 835], fill=(120, 120, 130))
    person(d, 330, 680, 0.85, (214, 164, 120), (255, 255, 255), (30, 30, 60), (24, 16, 12))
    palm(d, 80, 660, 0.9, (20, 8, 30), lean=-0.3)
    palm(d, 650, 660, 0.9, (20, 8, 30), lean=0.3)
    finish(img, "convertible.jpg")


def skate():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (60, 20, 90), (255, 90, 130), (255, 170, 90))
    sun(d, 520, 280, 85, (255, 244, 190), (255, 130, 90))
    skyline(d, 720, (26, 10, 46), 47, 90, 260)
    d.rectangle([0, 720, W, H], fill=(40, 20, 50))
    # ramp
    d.polygon([(80, 900), (640, 900), (640, 760), (80, 820)], fill=(90, 50, 90))
    person(d, 360, 780, 1.0, (206, 158, 112), (255, 200, 60), (30, 40, 70), (30, 20, 14))
    d.rounded_rectangle([280, 800, 440, 818], radius=8, fill=(20, 20, 30))
    d.ellipse([300, 816, 318, 834], fill=(240, 240, 240))
    d.ellipse([402, 816, 420, 834], fill=(240, 240, 240))
    finish(img, "skate.jpg")


def palmroad():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (255, 170, 90), (255, 120, 110), (120, 30, 100))
    sun(d, 360, 300, 120, (255, 248, 200), (255, 160, 90))
    d.rectangle([0, 620, W, H], fill=(26, 14, 40))
    d.polygon([(300, 900), (420, 900), (380, 620), (340, 620)], fill=(20, 20, 30))
    for i in range(6):
        y = 640 + i * 42
        wdt = 6 + i * 3
        d.rectangle([360 - wdt // 2, y, 360 + wdt // 2, y + 16], fill=(255, 220, 120))
    for side, lean in ((-1, -0.5), (1, 0.5)):
        for i, (px, py, s) in enumerate([(150, 700, 1.1), (90, 560, 0.8), (580, 700, 1.1), (640, 560, 0.8)]):
            palm(d, px, py, s, (14, 8, 28), lean=lean if px < 360 else -lean)
    finish(img, "palmroad.jpg")


def neonstreet():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (8, 6, 30), (60, 10, 80), (20, 6, 40))
    # neon signs
    for i, (x, col, txt) in enumerate([(60, (255, 45, 150), "VICE"), (430, (0, 240, 255), "NEON"),
                                       (220, (255, 200, 40), "HEAT")]):
        y = 120 + i * 150
        d.rounded_rectangle([x, y, x + 230, y + 90], radius=10, outline=col, width=5)
        d.rounded_rectangle([x + 8, y + 8, x + 222, y + 82], radius=8, outline=col, width=2)
    skyline(d, 700, (10, 4, 22), 59, 140, 340)
    d.rectangle([0, 700, W, H], fill=(12, 8, 24))
    d.polygon([(280, 900), (440, 900), (390, 700), (330, 700)], fill=(30, 16, 44))
    person(d, 360, 820, 1.1, (214, 164, 120), (0, 220, 220), (20, 20, 40), (10, 8, 8))
    finish(img, "neonstreet.jpg")


def marina():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (255, 140, 100), (255, 90, 130), (70, 20, 90))
    sun(d, 180, 260, 90, (255, 246, 200), (255, 140, 90))
    for y in range(600, H):
        t = (y - 600) / (H - 600)
        d.line([(0, y), (W, y)], fill=lerp((255, 120, 100), (20, 30, 70), t))
    # yachts
    for bx, bs in [(120, 1.0), (420, 0.8)]:
        d.polygon([(bx, 640), (bx + 220 * bs, 640), (bx + 190 * bs, 690), (bx + 30 * bs, 690)], fill=(245, 245, 250))
        d.rectangle([bx + 60 * bs, 580, bx + 150 * bs, 640], fill=(230, 230, 240))
        d.line([(bx + 105 * bs, 580), (bx + 105 * bs, 500)], fill=(200, 200, 210), width=5)
    d.rectangle([0, 700, W, 740], fill=(60, 40, 30))
    person(d, 360, 760, 0.9, (222, 172, 128), (255, 255, 255), (40, 40, 70), (24, 16, 12))
    finish(img, "marina.jpg")


def portrait():
    img, _ = base_img()
    d = ImageDraw.Draw(img)
    sky(d, (30, 10, 70), (220, 50, 130), (255, 150, 70))
    sun(d, 540, 220, 110, (255, 240, 180), (255, 120, 90))
    skyline(d, 640, (22, 8, 40), 71, 80, 220)
    d.rectangle([0, 640, W, H], fill=(18, 10, 30))
    # Figure centred vertically: the face sits near the photo's middle
    # (y ~400 of 900) so cover-fit in a wide hero panel still shows it.
    # Head spans base-372*s .. base-300*s: s=1.2, base=800 -> y 354..440.
    person(d, 360, 800, 1.2, (222, 172, 128), (214, 20, 80), (24, 24, 50), (18, 12, 10))
    # gold chain + earring
    d.arc([315, 450, 405, 520], 20, 160, fill=(255, 210, 90), width=6)
    d.ellipse([398, 420, 408, 432], fill=(255, 210, 90))
    palm(d, 90, 700, 0.9, (12, 8, 26), lean=-0.4)
    palm(d, 640, 700, 0.9, (12, 8, 26), lean=0.4)
    finish(img, "portrait.jpg")


def main():
    os.makedirs(OUT, exist_ok=True)
    for fn in (boombox, jetski, rooftop, convertible, skate, palmroad,
               neonstreet, marina, portrait):
        fn()
    print("done: 9 samples in", OUT)


if __name__ == "__main__":
    main()
