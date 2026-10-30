"""Builds PillSaathi's launcher icons from the square artwork in docs/icon/app-icon.png.

    python3 docs/icon/make_launcher_icon.py docs/icon/app-icon.png android/app/src/main/res [preview.png]

The adaptive icon (Android 8+) is one full-bleed 108dp layer: the picture's sky continued past its
rounded square, with the pill and heart inside the 66dp safe circle so a launcher's circle,
squircle or rounded square shows them whole. Android 7 gets the 72dp a launcher would show, as a
rounded square and a circle. The numbers below are measured on this picture: new artwork needs its
rounded square (L, T, R, B, RAD) and its artwork's centre and radius (CX, CY, ART) measured again.
Needs Pillow."""
import sys, os, math
from PIL import Image, ImageDraw, ImageFilter

src, out = sys.argv[1], sys.argv[2]
preview_path = sys.argv[3] if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()

# The rounded square drawn in the picture, and the artwork's centre and radius (measured).
L, T, R, B, RAD = 18, 20, 1234, 1210, 350
CX, CY, ART = 654, 635, 480          # 480 = the artwork's 467 px plus a margin
DP = ART / 33.0                      # the artwork's radius is 33dp, the safe zone's
CANVAS = round(108 * DP)

# Sky behind the square: each row's colour from just inside the square's left and right edges
# (worked out from its corners, so the shadow under it isn't taken for sky).
def inset(y):
    dy = max(T + RAD - y, y - (B - RAD), 0)
    return RAD - math.sqrt(max(RAD * RAD - dy * dy, 0))
rows = {}
for y in range(T + 40, B - 40):
    l, r = L + inset(y), R - inset(y)
    cols = [px[round(x), y] for x in [l + 20 + k for k in range(45)] + [r - 65 + k for k in range(45)]]
    rows[y] = tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))
top, bottom = min(rows), max(rows)
x0, y0 = CX - CANVAS / 2, CY - CANVAS / 2
canvas = Image.new('RGB', (CANVAS, CANVAS))
d = ImageDraw.Draw(canvas)
for j in range(CANVAS):
    y = min(max(round(y0 + j), top), bottom)
    d.line([(0, j), (CANVAS, j)], fill=rows[y])

# The picture's square on top, its rounded edge pulled in a little and softened.
mask = Image.new('L', (W, H), 0)
ImageDraw.Draw(mask).rounded_rectangle([L + 8, T + 8, R - 8, B - 8], radius=RAD - 8, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(5))
canvas.paste(im, (round(-x0), round(-y0)), mask)


def mipmaps(name, img, base):
    for dens, scale in (('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)):
        size = round(base * scale)
        folder = os.path.join(out, 'mipmap-' + dens)
        os.makedirs(folder, exist_ok=True)
        img.resize((size, size), Image.LANCZOS).save(os.path.join(folder, name + '.png'), optimize=True)

mipmaps('ic_launcher_background', canvas, 108)

# Legacy icons (Android 7): the 72dp a launcher would show, as a rounded square and a circle.
inner = round(72 * DP)
off = (CANVAS - inner) // 2
face = canvas.crop((off, off, off + inner, off + inner)).convert('RGBA')
def masked(shape):
    big = inner * 4
    m = Image.new('L', (big, big), 0)
    dd = ImageDraw.Draw(m)
    if shape == 'round':
        dd.ellipse([0, 0, big - 1, big - 1], fill=255)
    else:
        dd.rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 0.22), fill=255)
    f = face.copy()
    f.putalpha(m.resize((inner, inner), Image.LANCZOS))
    return f
mipmaps('ic_launcher', masked('square'), 48)
mipmaps('ic_launcher_round', masked('round'), 48)

# Previews: the layer as a circle (Pixel), a squircle (MIUI) and a rounded square (Samsung).
if preview_path:
    def preview(shape, size=256):
        big = size * 4
        m = Image.new('L', (big, big), 0)
        dd = ImageDraw.Draw(m)
        if shape == 'circle':
            dd.ellipse([0, 0, big - 1, big - 1], fill=255)
        elif shape == 'rounded':
            dd.rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 0.2), fill=255)
        else:
            n = 4.0
            pts = []
            for k in range(720):
                t = 2 * math.pi * k / 720
                c, s = math.cos(t), math.sin(t)
                pts.append((big / 2 + big / 2 * math.copysign(abs(c) ** (2 / n), c),
                            big / 2 + big / 2 * math.copysign(abs(s) ** (2 / n), s)))
            dd.polygon(pts, fill=255)
        f = face.resize((size, size), Image.LANCZOS)
        f.putalpha(m.resize((size, size), Image.LANCZOS))
        return f
    sheet = Image.new('RGBA', (256 * 4 + 50, 256 + 20), (40, 44, 52, 255))
    sheet.paste(canvas.resize((256, 256), Image.LANCZOS), (10, 10))
    for i, shape in enumerate(('circle', 'squircle', 'rounded')):
        p = preview(shape)
        sheet.paste(p, (10 + (i + 1) * 266, 10), p)
    sheet.save(preview_path)
