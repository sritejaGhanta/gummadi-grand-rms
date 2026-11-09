import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'en' | 'te' | 'hi';

export interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Top Bar & Branding
    'app.title': 'AharPOS',
    'app.tagline': 'Enterprise Multi-Tenant Restaurant Cloud & LAN System',
    'app.lan_live': 'LAN Live',
    'app.offline': 'Offline',
    'app.notifications': 'Live Alerts',
    'app.no_notifications': 'No recent notifications',
    'app.logout': 'Sign Out',
    'app.language': 'Language',

    // Super Admin Dashboard
    'sa.title': 'Super Admin Dashboard',
    'sa.subtitle': 'Manage all client restaurants, staff accounts, and subscription tiers.',
    'sa.btn_add_restaurant': '+ Add Restaurant',
    'sa.stat_restaurants': 'Total Restaurants',
    'sa.stat_restaurants_sub': 'Active • Trial',
    'sa.stat_staff': 'Staff Accounts',
    'sa.stat_staff_sub': 'Managers • Chefs • Waiters',
    'sa.stat_revenue': 'Monthly Revenue',
    'sa.stat_revenue_sub': 'Total Orders',
    'sa.stat_system': 'System Status',
    'sa.stat_system_sub': 'Server & DB Healthy',
    'sa.status_online': 'Online (100% OK)',
    'sa.search_placeholder': 'Search restaurants, city, plan...',
    'sa.refresh': 'Refresh',

    // Empty state
    'sa.empty_title': 'No Restaurants Registered',
    'sa.empty_desc': 'You have not added any client restaurants yet. Add your first restaurant in 1 minute with name, city, and owner details.',
    'sa.btn_add_first': '+ Add First Restaurant',

    // Table Columns
    'sa.col_restaurant': 'Restaurant & Outlets',
    'sa.col_plan': 'Plan & Validity',
    'sa.col_contact': 'Contact & Location',
    'sa.col_staff': 'Staff & Activity',
    'sa.col_status': 'Status',
    'sa.col_actions': 'Actions',

    // Table Actions
    'sa.act_open': 'Open 1-Click',
    'sa.act_features': 'Features',
    'sa.act_edit': 'Edit',
    'sa.act_renew': 'Renew',
    'sa.act_staff': 'Staff',
    'sa.act_suspend': 'Suspend',
    'sa.act_activate': 'Activate',

    // Tabs
    'sa.tab_restaurants': 'Restaurants',
    'sa.tab_staff': 'Staff & Users',
    'sa.tab_permissions': 'Permissions',
    'sa.tab_revenue': 'Revenue & Reports',
    'sa.tab_invoices': 'Tax Invoices',
    'sa.tab_notices': 'Notice Board',
    'sa.tab_health': 'Server Health',
    'sa.tab_plans': 'Plans',
    'sa.tab_website': 'Website Editor',
    'sa.tab_leads': 'Leads & Inquiries',

    // Sidebar Groups
    'nav.grp_restaurants_staff': 'Restaurants & Staff',
    'nav.grp_billing_plans': 'Billing & Plans',
    'nav.grp_system_health': 'System & Health',
    'nav.grp_website_leads': 'Website & Leads',

    // Sidebar Items
    'nav.restaurants': 'Restaurants',
    'nav.staff_logins': 'Staff & Logins',
    'nav.permissions': 'Permissions Matrix',
    'nav.income_reports': 'Income & Reports',
    'nav.tax_invoices': 'Tax Invoices',
    'nav.plans': 'Subscription Plans',
    'nav.notice_board': 'Notice Board',
    'nav.server_status': 'Server Status',
    'nav.website_editor': 'Website Editor',
    'nav.leads_inquiries': 'Leads & Inquiries',

    // Restaurant User Nav
    'nav.control_room': 'Restaurant Control Room',
    'nav.admin_overview': 'Admin Overview',
    'nav.manager_billing': 'Manager Billing & Cashier',
    'nav.staff_pos': 'Staff Order POS',
    'nav.kitchen_kds': 'Kitchen Screen (Live KDS)',
    'nav.inventory_stock': 'Inventory & Stock',
    'nav.day_close': 'Day-End Close (EOD)',
    'nav.customers_crm': 'Customer Loyalty CRM',
    'nav.chef_history': 'Chef Cooking History',
    'nav.staff_attendance': 'Staff Attendance',
    'nav.staff_performance': 'Staff Daily Performance',
    'nav.menu_pricing': 'Menu & Pricing',
    'nav.floors_tables': 'Floors & Tables',
    'nav.users_telemetry': 'Users & Logins',
    'nav.roles_perms': 'Roles & Permissions',
    'nav.system_logs': 'System Audit Logs',
    'nav.settings_branding': 'Settings & Branding',

    // Login Page
    'login.title': 'Intranet Staff Login',
    'login.subtitle': 'Sign in to access your restaurant station',
    'login.username': 'Username',
    'login.password': 'Password',
    'login.btn_submit': 'Sign In to Restaurant System',
    'login.superadmin_quick': 'Super Admin Master Login',
    'login.superadmin_sub': 'superadmin / superadmin123 (SaaS Multi-Tenant HQ)',
    'login.one_click': '1-Click Sign In ➔',
    'login.staff_notice': 'Restaurant Owners & Staff Login:',
    'login.staff_notice_desc': 'Use the credentials provided when your restaurant was onboarded via the Super Admin Dashboard.',
  },

  te: {
    // Top Bar & Branding
    'app.title': 'ఆహార్ POS',
    'app.tagline': 'మల్టీ-టెనెంట్ రెస్టారెంట్ క్లౌడ్ & లోకల్ నెట్‌వర్క్ సిస్టమ్',
    'app.lan_live': 'LAN లైవ్',
    'app.offline': 'ఆఫ్‌లైన్',
    'app.notifications': 'లైవ్ అలర్ట్స్',
    'app.no_notifications': 'నోటిఫికేషన్లు లేవు',
    'app.logout': 'లాగౌట్',
    'app.language': 'భాష (Language)',

    // Super Admin Dashboard
    'sa.title': 'సూపర్ అడ్మిన్ కంట్రోల్',
    'sa.subtitle': 'అన్ని క్లయింట్ రెస్టారెంట్లు, సిబ్బంది ఖాతాలు మరియు ప్లాన్ల నిర్వహణ.',
    'sa.btn_add_restaurant': '+ కొత్త రెస్టారెంట్‌ను చేర్చండి',
    'sa.stat_restaurants': 'మొత్తం రెస్టారెంట్లు',
    'sa.stat_restaurants_sub': 'యాక్టివ్ • ట్రయల్',
    'sa.stat_staff': 'సిబ్బంది ఖాతాలు',
    'sa.stat_staff_sub': 'మేనేజర్లు • చెఫ్‌లు • వెయిటర్లు',
    'sa.stat_revenue': 'నెలవారీ ఆదాయం',
    'sa.stat_revenue_sub': 'మొత్తం ఆర్డర్లు',
    'sa.stat_system': 'సిస్టమ్ స్థితి',
    'sa.stat_system_sub': 'సర్వర్ & డేటాబేస్ పర్ఫెక్ట్',
    'sa.status_online': 'ఆన్‌లైన్ (100% OK)',
    'sa.search_placeholder': 'రెస్టారెంట్, నగరం లేదా ప్లాన్ వెతకండి...',
    'sa.refresh': 'రిఫ్రెష్',

    // Empty state
    'sa.empty_title': 'ఇంకా ఏ రెస్టారెంట్ రిజిస్టర్ కాలేదు',
    'sa.empty_desc': 'మీ మొదటి రెస్టారెంట్‌ను కేవలం 1 నిమిషంలో సులభంగా యాడ్ చేయండి. పేరు, నగరము మరియు ఓనర్ వివరాలు నమోదు చేయగానే రెడీ అవుతుంది!',
    'sa.btn_add_first': '+ మొదటి రెస్టారెంట్‌ను చేర్చండి',

    // Table Columns
    'sa.col_restaurant': 'రెస్టారెంట్ & బ్రాంచ్',
    'sa.col_plan': 'ప్లాన్ & గడువు',
    'sa.col_contact': 'చిరునామా & ఫోన్',
    'sa.col_staff': 'సిబ్బంది',
    'sa.col_status': 'స్టేటస్',
    'sa.col_actions': 'ఆప్షన్లు',

    // Table Actions
    'sa.act_open': 'ఓపెన్ 1-క్లిక్',
    'sa.act_features': 'ఫీచర్లు',
    'sa.act_edit': 'ఎడిట్',
    'sa.act_renew': 'రీచార్జ్',
    'sa.act_staff': 'సిబ్బంది',
    'sa.act_suspend': 'తాత్కాలికంగా ఆపు',
    'sa.act_activate': 'ప్రారంభించు',

    // Tabs
    'sa.tab_restaurants': 'రెస్టారెంట్లు',
    'sa.tab_staff': 'సిబ్బంది & యూజర్లు',
    'sa.tab_permissions': 'పర్మిషన్లు',
    'sa.tab_revenue': 'ఆదాయం & రిపోర్ట్స్',
    'sa.tab_invoices': 'జీఎస్టీ బిల్లులు',
    'sa.tab_notices': 'నోటీస్ బోర్డ్',
    'sa.tab_health': 'సర్వర్ హెల్త్',
    'sa.tab_plans': 'ప్లాన్లు',
    'sa.tab_website': 'వెబ్‌సైట్ ఎడిటర్',
    'sa.tab_leads': 'ఎంక్వైరీలు',

    // Sidebar Groups
    'nav.grp_restaurants_staff': 'రెస్టారెంట్లు & సిబ్బంది',
    'nav.grp_billing_plans': 'ఆదాయం & ప్లాన్లు',
    'nav.grp_system_health': 'సిస్టమ్ & సర్వర్',
    'nav.grp_website_leads': 'వెబ్‌సైట్ & ఎంక్వైరీలు',

    // Sidebar Items
    'nav.restaurants': 'రెస్టారెంట్ల లిస్ట్',
    'nav.staff_logins': 'సిబ్బంది ఖాతాలు',
    'nav.permissions': 'పర్మిషన్ల మ్యాట్రిక్స్',
    'nav.income_reports': 'ఆదాయం & రిపోర్ట్స్',
    'nav.tax_invoices': 'జీఎస్టీ బిల్లులు',
    'nav.plans': 'సబ్‌స్క్రిప్షన్ ప్లాన్లు',
    'nav.notice_board': 'నోటీస్ బోర్డ్',
    'nav.server_status': 'సర్వర్ స్టేటస్',
    'nav.website_editor': 'వెబ్‌సైట్ ఎడిటర్',
    'nav.leads_inquiries': 'ఎంక్వైరీలు & లీడ్స్',

    // Restaurant User Nav
    'nav.control_room': 'రెస్టారెంట్ కంట్రోల్ రూమ్',
    'nav.admin_overview': 'అడ్మిన్ ఓవర్‌వ్యూ',
    'nav.manager_billing': 'మేనేజర్ బిల్లింగ్ & క్యాషియర్',
    'nav.staff_pos': 'స్టాఫ్ ఆర్డర్ POS (టేబుల్స్)',
    'nav.kitchen_kds': 'వంటగది స్క్రీన్ (KDS లైవ్)',
    'nav.inventory_stock': 'సరుకుల ఇన్వెంటరీ & స్టాక్',
    'nav.day_close': 'రోజు ముగింపు లెక్కింపు (EOD)',
    'nav.customers_crm': 'కస్టమర్ల లాయల్టీ CRM',
    'nav.chef_history': 'వండిన ఆర్డర్ల హిస్టరీ',
    'nav.staff_attendance': 'సిబ్బంది హాజరు & షిఫ్ట్‌లు',
    'nav.staff_performance': 'సిబ్బంది రోజువారీ పనితీరు',
    'nav.menu_pricing': 'మెనూ వస్తువులు & ధరలు',
    'nav.floors_tables': 'ఫ్లోర్లు & టేబుల్స్',
    'nav.users_telemetry': 'యూజర్లు & లాగిన్స్',
    'nav.roles_perms': 'హోదాలు & పర్మిషన్లు',
    'nav.system_logs': 'సిస్టమ్ ఆడిట్ లాగ్స్',
    'nav.settings_branding': 'సెట్టింగ్స్ & బ్రాండింగ్',

    // Login Page
    'login.title': 'సిబ్బంది లాగిన్',
    'login.subtitle': 'మీ రెస్టారెంట్ విభాగంలోకి ప్రవేశించండి',
    'login.username': 'యూజర్‌నేమ్',
    'login.password': 'పాస్‌వర్డ్',
    'login.btn_submit': 'సిస్టమ్‌లోకి లాగిన్ అవ్వండి',
    'login.superadmin_quick': 'సూపర్ అడ్మిన్ మాస్టర్ లాగిన్',
    'login.superadmin_sub': 'superadmin / superadmin123 (SaaS హెడ్‌క్వార్టర్స్)',
    'login.one_click': '1-క్లిక్ సైన్ ఇన్ ➔',
    'login.staff_notice': 'రెస్టారెంట్ ఓనర్లు & సిబ్బంది లాగిన్:',
    'login.staff_notice_desc': 'సూపర్ అడ్మిన్ ఇచ్చిన యూజర్‌నేమ్ మరియు పాస్‌వర్డ్‌తో లాగిన్ చేయండి.',
  },

  hi: {
    // Top Bar & Branding
    'app.title': 'आहार POS',
    'app.tagline': 'एंटरप्राइज मल्टी-टेनेंट रेस्टोरेंट क्लाउड एवं लैन सिस्टम',
    'app.lan_live': 'LAN लाइव',
    'app.offline': 'ऑफलाइन',
    'app.notifications': 'लाइव अलर्ट',
    'app.no_notifications': 'कोई सूचना नहीं',
    'app.logout': 'लॉग आउट',
    'app.language': 'भाषा (Language)',

    // Super Admin Dashboard
    'sa.title': 'सुपर एडमिन डैशबोर्ड',
    'sa.subtitle': 'सभी रेस्टोरेंट, स्टाफ और सब्सक्रिप्शन प्लान का प्रबंधन करें।',
    'sa.btn_add_restaurant': '+ नया रेस्टोरेंट जोड़ें',
    'sa.stat_restaurants': 'कुल रेस्टोरेंट',
    'sa.stat_restaurants_sub': 'सक्रिय • ट्रायल',
    'sa.stat_staff': 'स्टाफ खाते',
    'sa.stat_staff_sub': 'मैनेजर • शेफ • वेटर',
    'sa.stat_revenue': 'मासिक आय',
    'sa.stat_revenue_sub': 'कुल ऑर्डर',
    'sa.stat_system': 'सिस्टम स्थिति',
    'sa.stat_system_sub': 'सर्वर और डेटाबेस सामान्य',
    'sa.status_online': 'ऑनलाइन (100% सही)',
    'sa.search_placeholder': 'रेस्टोरेंट, शहर या प्लान खोजें...',
    'sa.refresh': 'रिफ्रेश',

    // Empty state
    'sa.empty_title': 'अभी कोई रेस्टोरेंट पंजीकृत नहीं है',
    'sa.empty_desc': 'अपना पहला रेस्टोरेंट केवल 1 मिनट में आसानी से जोड़ें। नाम, शहर और मालिक का विवरण देते ही सॉफ्टवेयर तैयार हो जाएगा।',
    'sa.btn_add_first': '+ पहला रेस्टोरेंट जोड़ें',

    // Table Columns
    'sa.col_restaurant': 'रेस्टोरेंट एवं आउटलेट',
    'sa.col_plan': 'प्लान और वैधता',
    'sa.col_contact': 'संपर्क एवं स्थान',
    'sa.col_staff': 'स्टाफ',
    'sa.col_status': 'स्थिति',
    'sa.col_actions': 'कार्रवाई',

    // Table Actions
    'sa.act_open': '1-क्लिक खोलें',
    'sa.act_features': 'फीचर्स',
    'sa.act_edit': 'बदलें',
    'sa.act_renew': 'नवीनीकरण',
    'sa.act_staff': 'स्टाफ',
    'sa.act_suspend': 'निलंबित करें',
    'sa.act_activate': 'सक्रिय करें',

    // Tabs
    'sa.tab_restaurants': 'रेस्टोरेंट',
    'sa.tab_staff': 'स्टाफ और उपयोगकर्ता',
    'sa.tab_permissions': 'अनुमतियाँ',
    'sa.tab_revenue': 'आय एवं रिपोर्ट्स',
    'sa.tab_invoices': 'जीएसटी बिल',
    'sa.tab_notices': 'सूचना पट्ट',
    'sa.tab_health': 'सर्वर स्थिति',
    'sa.tab_plans': 'प्लान',
    'sa.tab_website': 'वेबसाइट संपादक',
    'sa.tab_leads': 'पूछताछ',

    // Sidebar Groups
    'nav.grp_restaurants_staff': 'रेस्टोरेंट और स्टाफ',
    'nav.grp_billing_plans': 'बिलिंग और प्लान',
    'nav.grp_system_health': 'सिस्टम एवं स्वास्थ्य',
    'nav.grp_website_leads': 'वेबसाइट और लीड्स',

    // Sidebar Items
    'nav.restaurants': 'रेस्टोरेंट सूची',
    'nav.staff_logins': 'स्टाफ लॉगिन',
    'nav.permissions': 'अनुमति मैट्रिक्स',
    'nav.income_reports': 'आय और रिपोर्ट',
    'nav.tax_invoices': 'टैक्स इनवॉइस',
    'nav.plans': 'सब्सक्रिप्शन प्लान',
    'nav.notice_board': 'नोटिस बोर्ड',
    'nav.server_status': 'सर्वर स्थिति',
    'nav.website_editor': 'वेबसाइट संपादक',
    'nav.leads_inquiries': 'लीड्स और पूछताछ',

    // Restaurant User Nav
    'nav.control_room': 'रेस्टोरेंट कंट्रोल रूम',
    'nav.admin_overview': 'एडमिन अवलोकन',
    'nav.manager_billing': 'मैनेजर बिलिंग एवं कैशियर',
    'nav.staff_pos': 'वेटर ऑर्डर POS (टेबल)',
    'nav.kitchen_kds': 'किचन स्क्रीन (KDS लाइव)',
    'nav.inventory_stock': 'इन्वेंट्री और स्टॉक',
    'nav.day_close': 'दिन का समापन (EOD)',
    'nav.customers_crm': 'ग्राहक लॉयल्टी CRM',
    'nav.chef_history': 'पकाए गए ऑर्डर का इतिहास',
    'nav.staff_attendance': 'स्टाफ उपस्थिति एवं शिफ्ट',
    'nav.staff_performance': 'स्टाफ दैनिक प्रदर्शन',
    'nav.menu_pricing': 'मेनू और मूल्य निर्धारण',
    'nav.floors_tables': 'फ्लोर और टेबल',
    'nav.users_telemetry': 'उपयोगकर्ता और लॉगिन',
    'nav.roles_perms': 'भूमिकाएँ और अनुमतियाँ',
    'nav.system_logs': 'सिस्टम ऑडिट लॉग',
    'nav.settings_branding': 'सेटिंग्स और ब्रांडिंग',

    // Login Page
    'login.title': 'स्टाफ लॉगिन',
    'login.subtitle': 'अपने रेस्टोरेंट स्टेशन में प्रवेश करें',
    'login.username': 'यूज़रनेम',
    'login.password': 'पासवर्ड',
    'login.btn_submit': 'सिस्टम में साइन इन करें',
    'login.superadmin_quick': 'सुपर एडमिन मास्टर लॉगिन',
    'login.superadmin_sub': 'superadmin / superadmin123 (SaaS क्लाउड मुख्यालय)',
    'login.one_click': '1-क्लिक साइन इन ➔',
    'login.staff_notice': 'रेस्टोरेंट मालिक और स्टाफ लॉगिन:',
    'login.staff_notice_desc': 'सुपर एडमिन द्वारा दिए गए क्रेडेंशियल्स का उपयोग करें।',
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('preferred_language');
      if (saved === 'te' || saved === 'hi' || saved === 'en') {
        return saved;
      }
    } catch (e) {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('preferred_language', lang);
    } catch (e) {
      // ignore
    }
  };

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English dictionary
    if (translations.en[key]) {
      return translations.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
