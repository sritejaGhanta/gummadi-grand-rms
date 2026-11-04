import asyncio
import edge_tts
import os

scenes = [
    {
        "id": "scene1",
        "title": "గుమ్మడి గ్రాండ్ రెస్టారెంట్ ఏలూరు | System Overview & Login",
        "text": "నమస్కారం! గుమ్మడి గ్రాండ్ రెస్టారెంట్ ఏలూరు పూర్తి డిజిటల్ మేనేజ్‌మెంట్ సిస్టమ్ లైవ్ డెమో వీడియోకి స్వాగతం. ఇది డైనింగ్ ఫ్లోర్స్, కిచెన్ ఆర్డర్స్, బిల్లింగ్ మరియు స్టాఫ్ ఆపరేషన్స్‌ను ఒకే చోట అనుసంధానించే అత్యాధునిక లోకల్ నెట్‌వర్క్ ఎంటర్‌ప్రైజ్ సాఫ్ట్‌వేర్.",
        "shots": [
            {"id": "1a", "duration_ratio": 0.45, "title_te": "గుమ్మడి గ్రాండ్ రెస్టారెంట్ ఏలూరు • లైవ్ డెమో", "title_en": "Gummadi Grand Restaurant Eluru • Enterprise Intranet System"},
            {"id": "1b", "duration_ratio": 0.55, "title_te": "సురక్షిత లాగిన్ & రోల్-బేస్డ్ యాక్సెస్ కంట్రోల్ (RBAC)", "title_en": "Secure Multi-Role Login (Admin, Manager, Waiter, Chef)"}
        ]
    },
    {
        "id": "scene2",
        "title": "అడ్మిన్ ఎగ్జిక్యూటివ్ కంట్రోల్ టవర్ | Real-time Revenue & Telemetry",
        "text": "అడ్మిన్ ఎగ్జిక్యూటివ్ డ్యాష్‌బోర్డ్‌లో గుమ్మడి గ్రాండ్ రెస్టారెంట్ నేటి మొత్తం రాబడి, ఆర్డర్ల సంఖ్య, చెఫ్ మరియు సర్వీస్ స్టాఫ్ పెర్ఫార్మెన్స్ లైవ్‌గా కనిపిస్తాయి. రియల్-టైమ్ టెలిమెట్రీ ద్వారా రెస్టారెంట్ పనితీరును క్షణక్షణం పర్యవేక్షించవచ్చు.",
        "shots": [
            {"id": "2a", "duration_ratio": 0.50, "title_te": "అడ్మిన్ డ్యాష్‌బోర్డ్ • లైవ్ రెవెన్యూ & ఆర్డర్స్ టెలిమెట్రీ", "title_en": "Admin Executive Dashboard • Today's Revenue & Live Orders"},
            {"id": "2b", "duration_ratio": 0.50, "title_te": "డైనింగ్ ఆక్యుపెన్సీ & స్టాఫ్ ఆపరేషన్స్ పెర్ఫార్మెన్స్", "title_en": "Dining Floor Telemetry & Real-Time Staff Tracking"}
        ]
    },
    {
        "id": "scene3",
        "title": "ఫ్లోర్ ప్లాన్ & టేబుల్ మేనేజ్‌మెంట్ | Waiter Floor & Tables",
        "text": "వెయిటర్ లాగిన్ అవ్వగానే రెస్టారెంట్ ఫ్లోర్ ప్లాన్ మరియు టేబుల్స్ స్పష్టంగా కనిపిస్తాయి. ఏ టేబుల్ ఖాళీగా ఉంది, ఏ టేబుల్ ఆక్యుపై అయిందో లేదా బిల్లింగ్‌లో ఉందో కలర్ కోడింగ్ ద్వారా సులభంగా తెలుసుకోవచ్చు.",
        "shots": [
            {"id": "3a", "duration_ratio": 0.50, "title_te": "ఇంటరాక్టివ్ ఫ్లోర్ ప్లాన్ & టేబుల్ లేఅవుట్", "title_en": "Interactive Restaurant Floor Plan & Seating Capacity"},
            {"id": "3b", "duration_ratio": 0.50, "title_te": "కలర్ కోడింగ్ టేబుల్ స్టేటస్ (ఖాళీ / ఆక్యుపైడ్ / బిల్లింగ్)", "title_en": "Live Table Status: Available (Green) • Occupied (Red) • Billing (Amber)"}
        ]
    },
    {
        "id": "scene4",
        "title": "మొబైల్ POS ఆర్డరింగ్ & స్మార్ట్ కార్ట్ | Digital Menu & Order Taking",
        "text": "కస్టమర్ దగ్గర ఆర్డర్ తీసుకునేటప్పుడు వెజ్ మరియు నాన్-వెజ్ ఫిల్టర్స్, స్పెషల్ ఇన్స్ట్రక్షన్స్ జతచేసి క్షణాల్లో ఆర్డర్ సబ్మిట్ చేయవచ్చు. ఆర్డర్ ప్లేస్ చేయగానే టేబుల్ ఆటోమేటిక్‌గా ఆక్యుపైడ్ అవుతుంది.",
        "shots": [
            {"id": "4a", "duration_ratio": 0.45, "title_te": "డిజిటల్ మెనూ కాటలాగ్ & వెజ్ / నాన్-వెజ్ ఫిల్టర్స్", "title_en": "Digital Menu Catalog with Live Search & Category Tabs"},
            {"id": "4b", "duration_ratio": 0.55, "title_te": "స్మార్ట్ కార్ట్ • స్పెషల్ కుకింగ్ నోట్స్ & KOT ఆర్డర్ డిస్పాచ్", "title_en": "Smart Cart with Cooking Instructions & Instant Kitchen Dispatch"}
        ]
    },
    {
        "id": "scene5",
        "title": "చెఫ్ కిచెన్ డిస్‌ప్లే సిస్టమ్ (KDS) | Kitchen Orders & Item Availability",
        "text": "కిచెన్‌లో చెఫ్ కోసం ప్రత్యేకమైన KDS స్క్రీన్ ఉంటుంది. ఆర్డర్ రాగానే బీప్ సౌండ్‌తో టికెట్ డిస్ప్లే అవుతుంది. చెఫ్ ఆర్డర్‌ను అంగీకరించి, వంట పూర్తవగానే రెడీ టు సర్వ్ అని మార్చవచ్చు. అయిపోయిన ఐటమ్‌లను సోల్డ్ అవుట్ చేయవచ్చు.",
        "shots": [
            {"id": "5a", "duration_ratio": 0.35, "title_te": "చెఫ్ కిచెన్ డిస్‌ప్లే (KDS) • రియల్-టైమ్ ఆర్డర్ టికెట్లు", "title_en": "Chef Kitchen Display System (KDS) • Live Cooking Tickets & Timers"},
            {"id": "5b", "duration_ratio": 0.35, "title_te": "వంట స్టేటస్: ప్రిపరేషన్ నుండి 'రెడీ టు సర్వ్' మార్పు", "title_en": "Order Status Flow: In Preparation (Blue) to Ready to Serve (Green)"},
            {"id": "5c", "duration_ratio": 0.30, "title_te": "లైవ్ ఐటమ్ అవైలబిలిటీ & సోల్డ్ అవుట్ మేనేజ్‌మెంట్", "title_en": "1-Click Food Item Availability & Sold Out Switch"}
        ]
    },
    {
        "id": "scene6",
        "title": "ఫుడ్ సర్వింగ్ & బిల్ రిక్వెస్ట్ | Waiter Delivery & Bill Request",
        "text": "వంట సిద్ధమవగానే వెయిటర్‌కు ఇన్స్టంట్ అలర్ట్ వస్తుంది. ఆహారాన్ని టేబుల్‌పై సర్వ్ చేసి, డైనింగ్ ముగియగానే వెయిటర్ ఒక్క ట్యాప్‌తో బిల్లును రిక్వెస్ట్ చేస్తారు. ఇది నేరుగా మేనేజర్ స్క్రీన్‌కు చేరుతుంది.",
        "shots": [
            {"id": "6a", "duration_ratio": 0.45, "title_te": "వెయిటర్ అలర్ట్ • 'ఫుడ్ రెడీ టు సర్వ్' డెలివరీ", "title_en": "Instant Waiter Notification: Table Food Ready to Serve"},
            {"id": "6b", "duration_ratio": 0.55, "title_te": "ఒక్క ట్యాప్‌తో టేబుల్ బిల్ రిక్వెస్ట్ & స్టేటస్ అప్‌డేట్", "title_en": "1-Tap Table Bill Request Routing to Cashier & Manager"}
        ]
    },
    {
        "id": "scene7",
        "title": "మేనేజర్ బిల్లింగ్ & క్యాషియర్ పేమెంట్ | Bill Generation & Payment",
        "text": "మేనేజర్ బిల్లింగ్ విభాగంలో రిక్వెస్ట్ రాగానే అలర్ట్ వస్తుంది. మేనేజర్ ఒక్క క్లిక్‌తో జీఎస్టీ మరియు గుమ్మడి గ్రాండ్ బ్రాండింగ్‌తో కూడిన అధికారిక బిల్లును ప్రింట్ చేయవచ్చు. యూపీఐ క్యూఆర్ కోడ్, క్యాష్ లేదా కార్డ్ ద్వారా పేమెంట్ సెటిల్ చేయవచ్చు.",
        "shots": [
            {"id": "7a", "duration_ratio": 0.35, "title_te": "మేనేజర్ లైవ్ బిల్లింగ్ డ్యాష్‌బోర్డ్ • బిల్ రిక్వెస్ట్స్ అలర్ట్", "title_en": "Manager Billing Dashboard with Priority Bill Request Queue"},
            {"id": "7b", "duration_ratio": 0.35, "title_te": "గుమ్మడి గ్రాండ్ అధికారిక GST టాక్స్ ఇన్వాయిస్", "title_en": "Official Itemized GST Tax Invoice with Dynamic UPI QR Code"},
            {"id": "7c", "duration_ratio": 0.30, "title_te": "డిజిటల్ పేమెంట్ సెటిల్మెంట్ (UPI / క్యాష్ / కార్డ్)", "title_en": "Instant Payment Settlement & Table Auto-Free Flow"}
        ]
    },
    {
        "id": "scene8",
        "title": "డైనమిక్ బ్రాండింగ్ & మొబైల్ సపోర్ట్ | Live Customization & Zero Latency",
        "text": "ఈ సిస్టమ్‌లో రెస్టారెంట్ పేరు, లోగో మరియు కలర్ థీమ్‌లను లైవ్‌గా మార్చుకోవచ్చు. ఈ సాఫ్ట్‌వేర్ వెబ్ మరియు ఆండ్రాయిడ్ మొబైల్ యాప్‌లలో ఇంటర్నెట్ లేకపోయినా లోకల్ వైఫై ద్వారా జీరో లేటెన్సీతో అద్భుతంగా పనిచేస్తుంది. ధన్యవాదాలు!",
        "shots": [
            {"id": "8a", "duration_ratio": 0.35, "title_te": "అడ్మిన్ డైనమిక్ బ్రాండింగ్ • లోగో & కలర్ థీమ్ కస్టమైజర్", "title_en": "Dynamic Branding Suite: Logo, Favicon & Luxury Color Palette"},
            {"id": "8b", "duration_ratio": 0.35, "title_te": "1-క్లిక్‌తో అప్లికేషన్ అంతటా లైవ్ థీమ్ మార్పు", "title_en": "Instant Theme Color Reflection Across POS & KDS"},
            {"id": "8c", "duration_ratio": 0.30, "title_te": "ఆల్-ఇన్-వన్ క్రాస్ ప్లాట్‌ఫామ్ • వెబ్ & ఆండ్రాయిడ్ మొబైల్ యాప్", "title_en": "Unified Multi-Device Support: Web POS + Android Native APK"}
        ]
    }
]

output_dir = "/var/www/html/Restorent/demo_video/audio"
os.makedirs(output_dir, exist_ok=True)

async def main():
    voice = "te-IN-MohanNeural"
    for s in scenes:
        audio_file = os.path.join(output_dir, f"{s['id']}.mp3")
        print(f"Generating audio for {s['id']}...")
        communicate = edge_tts.Communicate(s['text'], voice)
        await communicate.save(audio_file)
        print(f"✓ Saved {audio_file}")

if __name__ == "__main__":
    asyncio.run(main())
