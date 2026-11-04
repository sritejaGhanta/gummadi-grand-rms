from PIL import Image, ImageDraw, ImageFont
import os

font_telugu = ImageFont.truetype("/usr/share/fonts/truetype/fonts-telu-extra/Pothana2000.ttf", 38)
font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 24)
font_watermark = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)

im = Image.open("/var/www/html/Restorent/demo_video/slides/slide1_login.png").convert("RGBA")
# Ensure 1920x1080
im = im.resize((1920, 1080), Image.ANTIALIAS)

overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
draw = ImageDraw.Draw(overlay)

# Top Bar Watermark
draw.rectangle([(0, 0), (1920, 56)], fill=(15, 23, 42, 230))
draw.text((36, 14), "🍽️  ROYAL FEAST PALACE RMS  •  ENTERPRISE INTRANET SYSTEM", fill=(245, 158, 11, 255), font=font_watermark)
draw.text((1560, 14), "LAN ZERO-LATENCY DEMO", fill=(52, 211, 153, 255), font=font_watermark)

# Bottom Lower-Third Banner
draw.rectangle([(0, 940), (1920, 1080)], fill=(10, 15, 30, 240))
draw.line([(0, 940), (1920, 940)], fill=(245, 158, 11, 255), width=4)

draw.text((40, 955), "రాయల్ ఫీస్ట్ రెస్టారెంట్ మేనేజ్‌మెంట్ సిస్టమ్", fill=(255, 255, 255, 255), font=font_telugu)
draw.text((42, 1018), "Scene 1: System Overview & Role-Based Access Control", fill=(148, 163, 184, 255), font=font_sub)

final = Image.alpha_composite(im, overlay).convert("RGB")
final.save("/var/www/html/Restorent/demo_video/slides/test_banner_1.jpg", quality=95)
print("Saved test banner!")

