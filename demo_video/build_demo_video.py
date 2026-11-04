import os
import subprocess
import json
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = "/var/www/html/Restorent/demo_video"
SLIDES_DIR = os.path.join(BASE_DIR, "slides")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
OUTPUT_VIDEO = os.path.join(BASE_DIR, "restaurant_rms_client_demo_telugu.mp4")

os.makedirs(CLIPS_DIR, exist_ok=True)

# 8 Core Scenes
scenes = [
    {
        "id": "scene1",
        "image": os.path.join(SLIDES_DIR, "slide1_login.png"),
        "audio": os.path.join(AUDIO_DIR, "scene1.mp3"),
        "title_te": "రాయల్ ఫీస్ట్ రెస్టారెంట్ మేనేజ్‌మెంట్ సిస్టమ్",
        "title_en": "Scene 1: System Overview & Role-Based Access Control (RBAC)",
    },
    {
        "id": "scene2",
        "image": os.path.join(SLIDES_DIR, "slide2_admin_dashboard.png"),
        "audio": os.path.join(AUDIO_DIR, "scene2.mp3"),
        "title_te": "ఎగ్జిక్యూటివ్ కంట్రోల్ టవర్ & లైవ్ రెవెన్యూ టెలిమెట్రీ",
        "title_en": "Scene 2: Admin Executive Dashboard & Real-Time Performance",
    },
    {
        "id": "scene3",
        "image": os.path.join(SLIDES_DIR, "slide3_waiter_pos.png"),
        "audio": os.path.join(AUDIO_DIR, "scene3.mp3"),
        "title_te": "వెయిటర్ ఫ్లోర్ ప్లాన్ & టేబుల్ మేనేజ్‌మెంట్",
        "title_en": "Scene 3: Floor Plan & Live Table Status (Available / Occupied / Billing)",
    },
    {
        "id": "scene4",
        "image": os.path.join(SLIDES_DIR, "slide4_waiter_ordering.png"),
        "audio": os.path.join(AUDIO_DIR, "scene4.mp3"),
        "title_te": "మొబైల్ POS ఆర్డరింగ్ & స్మార్ట్ కార్ట్",
        "title_en": "Scene 4: Digital Menu, Dietary Filters & Instant Order Dispatch",
    },
    {
        "id": "scene5",
        "image": os.path.join(SLIDES_DIR, "slide5_chef_kitchen.png"),
        "audio": os.path.join(AUDIO_DIR, "scene5.mp3"),
        "title_te": "చెఫ్ కిచెన్ డిస్‌ప్లే సిస్టమ్ (KDS) & సోల్డ్ అవుట్ మేనేజ్‌మెంట్",
        "title_en": "Scene 5: Chef Live Cooking Tickets, Preparation Timers & Food Availability",
    },
    {
        "id": "scene6",
        "image": os.path.join(SLIDES_DIR, "slide4_waiter_ordering.png"),
        "audio": os.path.join(AUDIO_DIR, "scene6.mp3"),
        "title_te": "ఫుడ్ సర్వింగ్ & టేబుల్ బిల్లింగ్ రిక్వెస్ట్",
        "title_en": "Scene 6: Waiter Serving Flow & Table Bill Request",
    },
    {
        "id": "scene7",
        "image": os.path.join(SLIDES_DIR, "slide6_manager_billing.png"),
        "audio": os.path.join(AUDIO_DIR, "scene7.mp3"),
        "title_te": "మేనేజర్ బిల్లింగ్ & క్యాషియర్ పేమెంట్ సెటిల్మెంట్",
        "title_en": "Scene 7: Instant Bill Generation, GST Invoicing & Payment Settlement",
    },
    {
        "id": "scene8",
        "image": os.path.join(SLIDES_DIR, "slide8_branding_settings.png"),
        "audio": os.path.join(AUDIO_DIR, "scene8.mp3"),
        "title_te": "డైనమిక్ బ్రాండింగ్, కలర్ థీమ్స్ & మొబైల్ సపోర్ట్",
        "title_en": "Scene 8: 1-Click Luxury Theme Customizer & Multi-Device Zero Latency",
    },
]

font_telugu = ImageFont.truetype("/usr/share/fonts/truetype/fonts-telu-extra/Pothana2000.ttf", 36)
font_sub = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
font_watermark = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)

def create_banner_frame(image_path, title_te, title_en, out_path):
    im = Image.open(image_path).convert("RGBA")
    im = im.resize((1920, 1080), Image.ANTIALIAS)

    overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)

    # Top Header Bar
    draw.rectangle([(0, 0), (1920, 54)], fill=(15, 23, 42, 235))
    draw.line([(0, 54), (1920, 54)], fill=(245, 158, 11, 180), width=2)
    draw.text((36, 15), "🍽️  ROYAL FEAST PALACE RMS  •  ENTERPRISE INTRANET SYSTEM", fill=(245, 158, 11, 255), font=font_watermark)
    draw.text((1580, 15), "LAN ZERO-LATENCY DEMO", fill=(52, 211, 153, 255), font=font_watermark)

    # Bottom Lower-Third Banner
    draw.rectangle([(0, 946), (1920, 1080)], fill=(9, 13, 24, 245))
    draw.line([(0, 946), (1920, 946)], fill=(245, 158, 11, 255), width=4)

    draw.text((40, 958), title_te, fill=(255, 255, 255, 255), font=font_telugu)
    draw.text((42, 1022), title_en, fill=(148, 163, 184, 255), font=font_sub)

    final = Image.alpha_composite(im, overlay).convert("RGB")
    final.save(out_path, quality=95)

def get_audio_duration(audio_path):
    cmd = [
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

def main():
    print("=======================================================")
    print("🎬 BUILDING TELUGU CLIENT DEMO VIDEO")
    print("=======================================================")

    clip_paths = []
    
    for idx, s in enumerate(scenes):
        frame_path = os.path.join(CLIPS_DIR, f"{s['id']}_frame.jpg")
        clip_path = os.path.join(CLIPS_DIR, f"{s['id']}.mp4")
        
        print(f"\n[Scene {idx+1}/{len(scenes)}] Processing {s['id']}...")
        create_banner_frame(s["image"], s["title_te"], s["title_en"], frame_path)
        
        duration = get_audio_duration(s["audio"])
        # Add 0.5s padding at end for natural breathing room
        total_duration = round(duration + 0.5, 2)
        print(f"   Audio Duration: {duration:.2f}s (Clip Total: {total_duration:.2f}s)")
        
        # Build individual clip with ffmpeg
        # Zoompan for subtle motion + audio
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1", "-i", frame_path,
            "-i", s["audio"],
            "-c:v", "libx264", "-tune", "stillimage",
            "-c:a", "aac", "-b:a", "192k",
            "-pix_fmt", "yuv420p",
            "-t", str(total_duration),
            "-r", "30",
            "-vf", "scale=1920:1080",
            clip_path
        ]
        subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"✓ Rendered {clip_path}")
        clip_paths.append(clip_path)

    # Concat list file
    concat_txt = os.path.join(CLIPS_DIR, "concat.txt")
    with open(concat_txt, "w") as f:
        for c in clip_paths:
            f.write(f"file '{c}'\n")

    print("\nMerging all scenes into Master MP4...")
    concat_cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", concat_txt,
        "-c", "copy",
        OUTPUT_VIDEO
    ]
    subprocess.run(concat_cmd, check=True)

    # Also copy to root web directory for immediate download/playback
    web_dest = "/var/www/html/Restorent/restaurant_rms_client_demo_telugu.mp4"
    subprocess.run(["cp", OUTPUT_VIDEO, web_dest], check=True)

    file_size_mb = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
    print("=======================================================")
    print(f"🎉 MASTER DEMO VIDEO GENERATED SUCCESSFULLY!")
    print(f"   File: {OUTPUT_VIDEO}")
    print(f"   Size: {file_size_mb:.2f} MB")
    print(f"   Web Accessible: /var/www/html/Restorent/restaurant_rms_client_demo_telugu.mp4")
    print("=======================================================")

if __name__ == "__main__":
    main()

