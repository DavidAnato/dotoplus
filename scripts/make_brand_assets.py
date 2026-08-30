"""Génère icônes / splash fond blanc + marge (Doto+ et DotoHub)."""
from pathlib import Path
from PIL import Image

WHITE = (255, 255, 255, 255)
TRANSPARENT = (0, 0, 0, 0)


def strip_dark(im: Image.Image, thresh: int = 28) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            if r <= thresh and g <= thresh and b <= thresh:
                px[x, y] = (0, 0, 0, 0)
    return im


def crop_alpha(im: Image.Image, pad: int = 2) -> Image.Image:
    bbox = im.getbbox()
    if not bbox:
        return im
    l, t, r, b = bbox
    l = max(0, l - pad)
    t = max(0, t - pad)
    r = min(im.width, r + pad)
    b = min(im.height, b + pad)
    return im.crop((l, t, r, b))


def fit_on_canvas(fg: Image.Image, size: int, fill, occupancy: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), fill)
    fw, fh = fg.size
    max_side = int(size * occupancy)
    scale = min(max_side / fw, max_side / fh)
    nw, nh = max(1, int(fw * scale)), max(1, int(fh * scale))
    resized = fg.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def splash_wordmark(fg: Image.Image, width: int, height: int, occupancy: float) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), TRANSPARENT)
    fw, fh = fg.size
    max_w = int(width * occupancy)
    max_h = int(height * occupancy)
    scale = min(max_w / fw, max_h / fh)
    nw, nh = max(1, int(fw * scale)), max(1, int(fh * scale))
    resized = fg.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (width - nw) // 2
    y = (height - nh) // 2
    canvas.alpha_composite(resized, (x, y))
    return canvas


def to_mono(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    px = im.load()
    w, h = im.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a < 16:
                px[x, y] = (0, 0, 0, 0)
            else:
                px[x, y] = (30, 55, 85, a)
    return im


def main() -> None:
    root = Path(r"F:\WORK\DOTO+")
    plus = root / "dotoplus" / "assets"
    hub = root / "dotohub-mobile" / "assets"

    mark_plus = crop_alpha(strip_dark(Image.open(plus / "logo-mark.png")))
    word_plus = crop_alpha(strip_dark(Image.open(plus / "logo-doto.png")))
    mark_hub = crop_alpha(strip_dark(Image.open(hub / "logo-mark.png")))
    word_hub = crop_alpha(strip_dark(Image.open(hub / "logo-dotohub.png")))

    icon_plus = fit_on_canvas(mark_plus, 1024, WHITE, 0.48)
    icon_hub = fit_on_canvas(mark_hub, 1024, WHITE, 0.48)
    icon_plus.save(plus / "icon.png", "PNG")
    icon_hub.save(hub / "icon.png", "PNG")

    Image.new("RGBA", (1024, 1024), WHITE).save(plus / "android-icon-background.png", "PNG")
    Image.new("RGBA", (1024, 1024), WHITE).save(hub / "android-icon-background.png", "PNG")

    fg_plus = fit_on_canvas(mark_plus, 1024, TRANSPARENT, 0.46)
    fg_hub = fit_on_canvas(mark_hub, 1024, TRANSPARENT, 0.46)
    fg_plus.save(plus / "android-icon-foreground.png", "PNG")
    fg_hub.save(hub / "android-icon-foreground.png", "PNG")

    to_mono(fg_plus).save(plus / "android-icon-monochrome.png", "PNG")
    to_mono(fg_hub).save(hub / "android-icon-monochrome.png", "PNG")

    icon_plus.resize((192, 192), Image.Resampling.LANCZOS).save(plus / "favicon.png", "PNG")
    icon_hub.resize((192, 192), Image.Resampling.LANCZOS).save(hub / "favicon.png", "PNG")

    splash_wordmark(word_plus, 1284, 1284, 0.42).save(plus / "splash-icon.png", "PNG")
    splash_wordmark(word_hub, 1284, 1284, 0.46).save(hub / "splash-icon.png", "PNG")

    splash_wordmark(word_plus, 800, 240, 0.86).save(plus / "logo-splash.png", "PNG")
    splash_wordmark(word_hub, 900, 240, 0.88).save(hub / "logo-splash.png", "PNG")

    print("plus mark", mark_plus.size, "word", word_plus.size)
    print("hub mark", mark_hub.size, "word", word_hub.size)
    print("OK")


if __name__ == "__main__":
    main()
