import os
import subprocess
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = "/var/www/html/Restorent/demo_video"
SHOTS_DIR = os.path.join(BASE_DIR, "shots")
AUDIO_DIR = os.path.join(BASE_DIR, "audio")
CLIPS_DIR = os.path.join(BASE_DIR, "clips")
OUTPUT_VIDEO = os.path.join(BASE_DIR, "restaurant_rms_client_demo_telugu.mp4")
WEB_VIDEO = "/var/www/html/Restorent/restaurant_rms_client_demo_telugu.mp4"

os.makedirs(CLIPS_DIR, exist_ok=True)

# 8 Scenes with exact sub-shots matching the Telugu narration
scenes_data = [
    {
        "id": "scene1",
        "audio": os.path.join(AUDIO_DIR, "scene1.mp3"),
        "shots": [
            {
                "id": "shot_1a",
                "image": os.path.join(SHOTS_DIR, "shot_1a.png"),
                "duration": 8.5,
                "title_te": "గుమ్మడి గ్రాండ్ రెస్టారెంట్ ఏలూరు • లైవ్ డెమో",
                "title_en": "Gummadi Grand Restaurant Eluru • Enterprise Intranet System",
            },
            {
                "id": "shot_1b",
                "image": os.path.join(SHOTS_DIR, "shot_1b.png"),
                "duration": 10.5,
                "title_te": "సురక్షిత లాగిన్ & రోల్-బేస్డ్ యాక్సెస్ కంట్రోల్ (RBAC)",
                "title_en": "Secure Multi-Role Login (Admin, Manager, Waiter, Chef)",
            },
        ],
    },
    {
        "id": "scene2",
        "audio": os.path.join(AUDIO_DIR, "scene2.mp3"),
        "shots": [
            {
                "id": "shot_2a",
                "image": os.path.join(SHOTS_DIR, "shot_2a.png"),
                "duration": 8.0,
                "title_te": "అడ్మిన్ డ్యాష్‌బోర్డ్ • లైవ్ రెవెన్యూ & ఆర్డర్స్ టెలిమెట్రీ",
                "title_en": "Admin Executive Dashboard • Today's Revenue & Live Orders",
            },
            {
                "id": "shot_2b",
                "image": os.path.join(SHOTS_DIR, "shot_2b.png"),
                "duration": 8.5,
                "title_te": "డైనింగ్ ఆక్యుపెన్సీ & స్టాఫ్ ఆపరేషన్స్ పెర్ఫార్మెన్స్",
                "title_en": "Dining Floor Telemetry & Real-Time Staff Tracking",
            },
        ],
    },
    {
        "id": "scene3",
        "audio": os.path.join(AUDIO_DIR, "scene3.mp3"),
        "shots": [
            {
                "id": "shot_3a",
                "image": os.path.join(SHOTS_DIR, "shot_3a.png"),
                "duration": 7.0,
                "title_te": "ఇంటరాక్టివ్ ఫ్లోర్ ప్లాన్ & టేబుల్ లేఅవుట్",
                "title_en": "Interactive Restaurant Floor Plan & Seating Capacity",
            },
            {
                "id": "shot_3b",
                "image": os.path.join(SHOTS_DIR, "shot_3b.png"),
                "duration": 7.5,
                "title_te": "కలర్ కోడింగ్ టేబుల్ స్టేటస్ (ఖాళీ / ఆక్యుపైడ్ / బిల్లింగ్)",
                "title_en": "Live Table Status: Available (Green) • Occupied (Red) • Billing (Amber)",
            },
        ],
    },
    {
        "id": "scene4",
        "audio": os.path.join(AUDIO_DIR, "scene4.mp3"),
        "shots": [
            {
                "id": "shot_4a",
                "image": os.path.join(SHOTS_DIR, "shot_4a.png"),
                "duration": 6.8,
                "title_te": "డిజిటల్ మెనూ కాటలాగ్ & వెజ్ / నాన్-వెజ్ ఫిల్టర్స్",
                "title_en": "Digital Menu Catalog with Live Search & Category Tabs",
            },
            {
                "id": "shot_4b",
                "image": os.path.join(SHOTS_DIR, "shot_4b.png"),
                "duration": 8.0,
                "title_te": "స్మార్ట్ కార్ట్ • స్పెషల్ కుకింగ్ నోట్స్ & KOT ఆర్డర్ డిస్పాచ్",
                "title_en": "Smart Cart with Cooking Instructions & Instant Kitchen Dispatch",
            },
        ],
    },
    {
        "id": "scene5",
        "audio": os.path.join(AUDIO_DIR, "scene5.mp3"),
        "shots": [
            {
                "id": "shot_5a",
                "image": os.path.join(SHOTS_DIR, "shot_5a.png"),
                "duration": 6.0,
                "title_te": "చెఫ్ కిచెన్ డిస్‌ప్లే (KDS) • రియల్-టైమ్ ఆర్డర్ టికెట్లు",
                "title_en": "Chef Kitchen Display System (KDS) • Live Cooking Tickets & Timers",
            },
            {
                "id": "shot_5b",
                "image": os.path.join(SHOTS_DIR, "shot_5b.png"),
                "duration": 6.0,
                "title_te": "వంట స్టేటస్: ప్రిపరేషన్ నుండి 'రెడీ టు సర్వ్' మార్పు",
                "title_en": "Order Status Flow: In Preparation (Blue) to Ready to Serve (Green)",
            },
            {
                "id": "shot_5c",
                "image": os.path.join(SHOTS_DIR, "shot_5c.png"),
                "duration": 6.0,
                "title_te": "లైవ్ ఐటమ్ అవైలబిలిటీ & సోల్డ్ అవుట్ మేనేజ్‌మెంట్",
                "title_en": "1-Click Food Item Availability & Sold Out Switch",
            },
        ],
    },
    {
        "id": "scene6",
        "audio": os.path.join(AUDIO_DIR, "scene6.mp3"),
        "shots": [
            {
                "id": "shot_6a",
                "image": os.path.join(SHOTS_DIR, "shot_6a.png"),
                "duration": 7.0,
                "title_te": "వెయిటర్ అలర్ట్ • 'ఫుడ్ రెడీ టు సర్వ్' డెలివరీ",
                "title_en": "Instant Waiter Notification: Table Food Ready to Serve",
            },
            {
                "id": "shot_6b",
                "image": os.path.join(SHOTS_DIR, "shot_6b.png"),
                "duration": 8.2,
                "title_te": "ఒక్క ట్యాప్‌తో టేబుల్ బిల్ రిక్వెస్ట్ & స్టేటస్ అప్‌డేట్",
                "title_en": "1-Tap Table Bill Request Routing to Cashier & Manager",
            },
        ],
    },
    {
        "id": "scene7",
        "audio": os.path.join(AUDIO_DIR, "scene7.mp3"),
        "shots": [
            {
                "id": "shot_7a",
                "image": os.path.join(SHOTS_DIR, "shot_7a.png"),
                "duration": 5.5,
                "title_te": "మేనేజర్ లైవ్ బిల్లింగ్ డ్యాష్‌బోర్డ్ • బిల్ రిక్వెస్ట్స్ అలర్ట్",
                "title_en": "Manager Billing Dashboard with Priority Bill Request Queue",
            },
            {
                "id": "shot_7b",
                "image": os.path.join(SHOTS_DIR, "shot_7b.png"),
                "duration": 6.0,
                "title_te": "గుమ్మడి గ్రాండ్ అధికారిక GST టాక్స్ ఇన్వాయిస్",
                "title_en": "Official Itemized GST Tax Invoice with Dynamic UPI QR Code",
            },
            {
                "id": "shot_7c",
                "image": os.path.join(SHOTS_DIR, "shot_7c.png"),
                "duration": 6.0,
                "title_te": "డిజిటల్ పేమెంట్ సెటిల్మెంట్ (UPI / క్యాష్ / కార్డ్)",
                "title_en": "Instant Payment Settlement & Table Auto-Free Flow",
            },
        ],
    },
    {
        "id": "scene8",
        "audio": os.path.join(AUDIO_DIR, "scene8.mp3"),
        "shots": [
            {
                "id": "shot_8a",
                "image": os.path.join(SHOTS_DIR, "shot_8a.png"),
                "duration": 5.5,
                "title_te": "అడ్మిన్ డైనమిక్ బ్రాండింగ్ • లోగో & కలర్ థీమ్ కస్టమైజర్",
                "title_en": "Dynamic Branding Suite: Logo, Favicon & Luxury Color Palette",
            },
            {
                "id": "shot_8b",
                "image": os.path.join(SHOTS_DIR, "shot_8b.png"),
                "duration": 6.0,
                "title_te": "1-క్లిక్‌తో అప్లికేషన్ అంతటా లైవ్ థీమ్ మార్పు",
                "title_en": "Instant Theme Color Reflection Across POS & KDS",
            },
            {
                "id": "shot_8c",
                "image": os.path.join(SHOTS_DIR, "shot_8c.png"),
                "duration": 6.2,
                "title_te": "ఆల్-ఇన్-వన్ క్రాస్ ప్లాట్‌ఫామ్ • వెబ్ & ఆండ్రాయిడ్ మొబైల్ యాప్",
                "title_en": "Unified Multi-Device Support: Web POS + Android Native APK",
            },
        ],
    },
]

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
    draw.text((36, 15), "🍽️  GUMMADI GRAND RESTAURANT ELURU  •  ENTERPRISE INTRANET SYSTEM", fill=(245, 158, 11, 255), font=font_watermark)
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
        "ffprobe", "-v", "error", "-show_entries",
        "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, text=True, check=True)
    return float(res.stdout.strip())

print("=======================================================")
print("🎬 BUILDING GUMMADI GRAND TELUGU DEMO VIDEO (DYNAMIC SHOTS)")
print("=======================================================")

scene_clip_files = []

for idx, scene in enumerate(scenes_data, 1):
    scene_id = scene["id"]
    audio_path = scene["audio"]
    audio_dur = get_audio_duration(audio_path)
    print(f"\n[Scene {idx}/8] Processing {scene_id} (Audio: {audio_dur:.2f}s)...")

    # Render each sub-shot video clip
    sub_clips = []
    total_shots_duration = sum(s["duration"] for s in scene["shots"])
    # scale factor to match audio duration exactly (+0.3s buffer)
    target_dur = audio_dur + 0.3
    scale = target_dur / total_shots_duration

    for s_idx, shot in enumerate(scene["shots"]):
        shot_id = shot["id"]
        shot_img = shot["image"]
        shot_dur = shot["duration"] * scale
        frame_jpg = os.path.join(CLIPS_DIR, f"{shot_id}_frame.jpg")
        shot_mp4 = os.path.join(CLIPS_DIR, f"{shot_id}.mp4")

        # 1. Create banner frame
        create_banner_frame(shot_img, shot["title_te"], shot["title_en"], frame_jpg)

        # 2. Render silent sub-shot clip
        cmd_shot = [
            "ffmpeg", "-y", "-loop", "1", "-i", frame_jpg,
            "-t", f"{shot_dur:.3f}",
            "-c:v", "libx264", "-tune", "stillimage",
            "-pix_fmt", "yuv420p", "-r", "30",
            shot_mp4
        ]
        subprocess.run(cmd_shot, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        sub_clips.append(shot_mp4)
        print(f"   ✓ Sub-Shot {shot_id}: {shot_dur:.2f}s - {shot['title_en']}")

    # Concat sub-shots for this scene
    scene_concat_txt = os.path.join(CLIPS_DIR, f"{scene_id}_concat.txt")
    with open(scene_concat_txt, "w") as f:
        for sc in sub_clips:
            f.write(f"file '{sc}'\n")

    # Merge sub-shots with scene audio
    scene_merged_mp4 = os.path.join(CLIPS_DIR, f"{scene_id}_merged.mp4")
    cmd_merge = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", scene_concat_txt,
        "-i", audio_path,
        "-c:v", "copy",
        "-c:a", "aac", "-b:a", "192k",
        "-shortest",
        scene_merged_mp4
    ]
    subprocess.run(cmd_merge, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    scene_clip_files.append(scene_merged_mp4)
    print(f"✓ Scene {idx} Completed: {scene_merged_mp4}")

# Finally, merge all 8 scenes into Master Video
print("\nMerging all 8 scenes into Master Video...")
master_concat_txt = os.path.join(CLIPS_DIR, "master_concat.txt")
with open(master_concat_txt, "w") as f:
    for sm in scene_clip_files:
        f.write(f"file '{sm}'\n")

cmd_final = [
    "ffmpeg", "-y",
    "-f", "concat", "-safe", "0", "-i", master_concat_txt,
    "-c:v", "copy",
    "-c:a", "copy",
    OUTPUT_VIDEO
]
subprocess.run(cmd_final, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

# Copy to web accessible root
subprocess.run(["cp", "-f", OUTPUT_VIDEO, WEB_VIDEO], check=True)

size_mb = os.path.getsize(OUTPUT_VIDEO) / (1024 * 1024)
print("=======================================================")
print("🎉 MASTER DEMO VIDEO GENERATED SUCCESSFULLY!")
print(f"   File: {OUTPUT_VIDEO}")
print(f"   Size: {size_mb:.2f} MB")
print(f"   Web Accessible: {WEB_VIDEO}")
print("=======================================================")

