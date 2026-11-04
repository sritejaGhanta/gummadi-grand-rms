from PIL import Image, ImageDraw, ImageFont
import os

font_telugu = ImageFont.truetype("/usr/share/fonts/truetype/fonts-telu-extra/Pothana2000.ttf", 36)
font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
font_watermark = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)

def create_banner_frame(image_path, title_te, title_en, out_path):
    im = Image.open(image_path).convert("RGBA")
    if im.size != (1920, 1080):
        im = im.resize((1920, 1080), Image.ANTIALIAS)

    overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Top Header Bar
    draw.rectangle([(0, 0), (1920, 54)], fill=(15, 23, 42, 235))
    draw.line([(0, 54), (1920, 54)], fill=(245, 158, 11, 180), width=2)
    draw.text((36, 15), "🍽️  GUMMADI GRAND RESTAURANT ELURU  •  ENTERPRISE INTRANET", fill=(245, 158, 11, 255), font=font_watermark)
    draw.text((1580, 15), "LAN ZERO-LATENCY DEMO", fill=(52, 211, 153, 255), font=font_watermark)

    # Bottom Lower-Third Banner
    draw.rectangle([(0, 946), (1920, 1080)], fill=(9, 13, 24, 245))
    draw.line([(0, 946), (1920, 946)], fill=(245, 158, 11, 255), width=4)

    draw.text((40, 958), title_te, fill=(255, 255, 255, 255), font=font_telugu)
    draw.text((42, 1022), title_en, fill=(148, 163, 184, 255), font=font_sub)

    final = Image.alpha_composite(im, overlay).convert("RGB")
    final.save(out_path, quality=95)
    print(f"Frame saved to {out_path}")

create_banner_frame(
    "/var/www/html/Restorent/demo_video/shots/shot_1a.png",
    "గుమ్మడి గ్రాండ్ రెస్టారెంట్ ఏలూరు • లైవ్ డెమో",
    "Gummadi Grand Restaurant Eluru • Enterprise Intranet System",
    "/var/www/html/Restorent/demo_video/test_gummadi_banner.jpg"
)

