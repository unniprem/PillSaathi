"""Builds the app's other two icons from the square artwork in docs/icon/app-icon.png.

    python3 docs/icon/make_in_app_icons.py docs/icon/app-icon.png . [preview.png]

The login page's logo (src/assets/app-icon.png) is the 72dp a launcher shows of the launcher
icon, as a rounded square. The notification icon (res/drawable-*/ic_notification.png) is the
heart, pill and sparks in white on clear, as Android draws every notification's small icon in one
colour. The pill's white half can't be told from the sky by colour, so the whole capsule is drawn
from its blue half (a capsule is symmetric), with a gap around it and a line where its halves
meet. The numbers below are measured on this picture, as in make_launcher_icon.py. Needs Pillow."""
import sys, os, math
from PIL import Image, ImageDraw, ImageFilter, ImageChops

src, root = sys.argv[1], sys.argv[2]
preview_path = sys.argv[3] if len(sys.argv) > 3 else None
im = Image.open(src).convert('RGB')
W, H = im.size
px = im.load()

# The artwork's centre and radius, as in make_launcher_icon.py.
CX, CY, ART = 654, 635, 480
DP = ART / 33.0

# The login logo: the launcher's 72dp, its corners rounded as the login page's card (24 of 76).
LOGO = 304                           # 76dp at 4x
side = 72 * DP
face = im.crop((round(CX - side / 2), round(CY - side / 2),
                round(CX + side / 2), round(CY + side / 2))).resize((LOGO, LOGO), Image.LANCZOS)
big = LOGO * 4
corners = Image.new('L', (big, big), 0)
ImageDraw.Draw(corners).rounded_rectangle([0, 0, big - 1, big - 1], radius=round(big * 24 / 76), fill=255)
face = face.convert('RGBA')
face.putalpha(corners.resize((LOGO, LOGO), Image.LANCZOS))
logo_path = os.path.join(root, 'src', 'assets', 'app-icon.png')
os.makedirs(os.path.dirname(logo_path), exist_ok=True)
face.save(logo_path, optimize=True)

# The notification icon. Blue: the heart, the pill's blue half and the sparks (the sky is paler).
blue = Image.new('L', (W, H), 0)
b = blue.load()
for y in range(H):
    for x in range(W):
        R, G, B = px[x, y]
        if R < 100 and B > R + 80:
            b[x, y] = 255

# The capsule (measured): its axis at 47.9 degrees, half of it 327.7 px long from the blue tip to
# the line where the halves meet, 163 px in radius.
A_DEG, HALF, RADIUS, TIP, OFFSET = 47.9, 327.7, 163, 569.8, -127.86
GAP, SEAM = 40, 26                   # clear around the pill, and across it where the halves meet
a = math.radians(A_DEG)
u, v = (math.cos(a), math.sin(a)), (-math.sin(a), math.cos(a))
def on_axis(t, off=0):
    return (t * u[0] + (OFFSET + off) * v[0], t * u[1] + (OFFSET + off) * v[1])
end1, end2 = on_axis(TIP + RADIUS), on_axis(TIP + 2 * HALF - RADIUS)
def capsule(radius):
    m = Image.new('L', (W, H), 0)
    d = ImageDraw.Draw(m)
    d.line([end1, end2], fill=255, width=2 * radius)
    for c in (end1, end2):
        d.ellipse([c[0] - radius, c[1] - radius, c[0] + radius, c[1] + radius], fill=255)
    return m
pill = capsule(RADIUS)

# The heart is the blue that isn't the pill, cut back to leave GAP clear around the pill (about
# 3px at 96px), so the two read apart at a status bar's size.
heart = ImageChops.subtract(blue, pill)
for k in range(2):                   # drops the specks the cut leaves along the pill's edge
    heart = heart.filter(ImageFilter.MinFilter(3))
for k in range(2):
    heart = heart.filter(ImageFilter.MaxFilter(3))
shape = ImageChops.lighter(ImageChops.subtract(heart, capsule(RADIUS + GAP)), pill)
seam = TIP + HALF
ImageDraw.Draw(shape).line([on_axis(seam, -RADIUS - 5), on_axis(seam, RADIUS + 5)], fill=0, width=SEAM)

# Square around the shape with 1dp of 24 on each side, then one PNG per density.
l, t, r, btm = shape.getbbox()
size = max(r - l, btm - t) * 24 / 22
cx, cy = (l + r) / 2, (t + btm) / 2
box = (round(cx - size / 2), round(cy - size / 2), round(cx + size / 2), round(cy + size / 2))
alpha = shape.crop(box)
for dens, scale in (('mdpi', 1), ('hdpi', 1.5), ('xhdpi', 2), ('xxhdpi', 3), ('xxxhdpi', 4)):
    n = round(24 * scale)
    icon = Image.new('RGBA', (n, n), (255, 255, 255, 0))
    icon.putalpha(alpha.resize((n, n), Image.LANCZOS))
    folder = os.path.join(root, 'android', 'app', 'src', 'main', 'res', 'drawable-' + dens)
    os.makedirs(folder, exist_ok=True)
    icon.save(os.path.join(folder, 'ic_notification.png'), optimize=True)

# Preview: the logo, then the notification icon at 96, 72 and 48px on a dark status bar.
if preview_path:
    sheet = Image.new('RGBA', (LOGO + 3 * 96 + 80, LOGO + 20), (40, 44, 52, 255))
    sheet.paste(face, (10, 10), face)
    x = LOGO + 30
    for n in (96, 72, 48):
        icon = Image.new('RGBA', (n, n), (255, 255, 255, 0))
        icon.putalpha(alpha.resize((n, n), Image.LANCZOS))
        sheet.paste(icon, (x, 10), icon)
        x += n + 16
    sheet.save(preview_path)
