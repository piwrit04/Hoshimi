"""
生成「星笺」的占位图标（PNG + 多尺寸 ICO）。

这是一个**一次性占位**。等真正的 LOGO 设计出来，直接替换
`electron/build/icon.png` 和 `electron/build/icon.ico` 即可，本脚本可以删掉。
留着它的价值是：颜色、字号、圆角这些参数有据可查，改一改就能重出。

设计取值：
  底色 = theme.css 里**深色主题**的 --brand-hex      #7eb3ff
  字色 = theme.css 里**深色主题**的 --on-brand-hex   #0f0f11
  这和侧栏字标、主按钮的 bg-primary / text-primary-foreground 是同一对颜色，
  所以图标和界面是一个色系。
  （浅色主题那对是 #ee7093 / #ffffff，想换成粉底白字就改下面两行。）

⚠️ 已知代价：16×16 和 24×24 下汉字必然糊成一个色块 —— 这是"拿汉字当图标"的
   固有代价，不是脚本写错了。真做 LOGO 时小尺寸建议换成简单星形几何图形，
   大尺寸才用完整字形。Pillow 的 ICO 是等比缩放，这里没做分尺寸差异化处理。

依赖：Python 3 + Pillow（DSH 自带运行时的路径见 AGENTS.md）
用法：python scripts/make-placeholder-icon.py
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "electron" / "build"

BG = (126, 179, 255)   # #7eb3ff  深色主题 --brand-hex
FG = (15, 15, 17)      # #0f0f11  深色主题 --on-brand-hex

CHAR = "星"
CANVAS = 512
RADIUS_RATIO = 0.22    # 圆角半径占边长比；原 favicon 的 rx=8/32 = 0.25
GLYPH_RATIO = 0.62     # 字形高度占画布比

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",   # 微软雅黑 Bold
    r"C:\Windows\Fonts\msyh.ttc",
    r"C:\Windows\Fonts\simhei.ttf",
    r"C:\Windows\Fonts\Dengb.ttf",
]

ICO_SIZES = [(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]


def pick_font(size):
    for candidate in FONT_CANDIDATES:
        if Path(candidate).exists():
            return ImageFont.truetype(candidate, size)
    raise SystemExit("no CJK font found; edit FONT_CANDIDATES")


def build():
    img = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, CANVAS - 1, CANVAS - 1],
        radius=int(CANVAS * RADIUS_RATIO),
        fill=BG,
    )

    font = pick_font(int(CANVAS * GLYPH_RATIO))
    # 按字形实际外框居中 —— anchor="mm" 对 CJK 的垂直光学中心不准，会偏上
    left, top, right, bottom = draw.textbbox((0, 0), CHAR, font=font)
    draw.text(
        ((CANVAS - (right - left)) / 2 - left, (CANVAS - (bottom - top)) / 2 - top),
        CHAR,
        font=font,
        fill=FG,
    )
    return img


def size_strip(img):
    """把所有 ICO 尺寸横排成一张对照图，用来直观看小尺寸下字形糊成什么样。"""
    pad = 16
    sizes = [s[0] for s in ICO_SIZES]
    width = sum(sizes) + pad * (len(sizes) + 1)
    height = max(sizes) + pad * 2
    strip = Image.new("RGBA", (width, height), (24, 24, 27, 255))
    x = pad
    for size in sizes:
        thumb = img.resize((size, size), Image.LANCZOS)
        strip.paste(thumb, (x, (height - size) // 2), thumb)
        x += size + pad
    out = ROOT / ".build-tmp" / "logo-sizes.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    strip.save(out)
    print(f"[ok] {out}")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = build()

    png = OUT_DIR / "icon.png"
    img.save(png)
    print(f"[ok] {png}  {CANVAS}x{CANVAS}")

    ico = OUT_DIR / "icon.ico"
    img.save(ico, sizes=ICO_SIZES)
    print(f"[ok] {ico}  {len(ICO_SIZES)} sizes: {ICO_SIZES[0][0]}~{ICO_SIZES[-1][0]}")

    # 一份给设计参考的预览图（放临时目录，不进版本库）
    preview = ROOT / ".build-tmp" / "logo-preview.png"
    preview.parent.mkdir(parents=True, exist_ok=True)
    img.save(preview)
    print(f"[ok] {preview}")

    size_strip(img)


if __name__ == "__main__":
    main()
