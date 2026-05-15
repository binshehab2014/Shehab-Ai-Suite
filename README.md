# 🤖 Shehab AI Suite

> مجموعة أدوات الذكاء الاصطناعي المتكاملة — مبنية بـ HTML/CSS/JS خالص مع Groq & Gemini APIs

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![AI](https://img.shields.io/badge/AI-Groq%20%7C%20Gemini-purple)

---

## ✨ الأدوات المتاحة

| الأداة | الوصف | المحرك |
|--------|-------|--------|
| 🔍 **Researcher** | باحث ذكي يجيب بتفصيل | Groq (Llama 3.3) |
| 📖 **StoryBrand SB7** | تحليل الرسالة التسويقية | Groq (Llama 3.3) |
| 🎬 **Script Studio** | كتابة سكريبتات سينمائية | Groq (Llama 3.3) |
| 🖼️ **Thumbnailer** | أفكار صور مصغرة لـ YouTube | Groq (Llama 3.3) |
| 🎨 **Image Studio** | توليد صور احترافية | Gemini 2.0 Flash |
| 🔊 **Speech Studio** | تحويل النص لصوت | Gemini 2.5 Flash TTS |

---

## 🚀 التشغيل السريع

### متطلبات
- مفتاح [Groq API](https://console.groq.com) (مجاني)
- مفتاح [Gemini API](https://aistudio.google.com) (مجاني)
- [Deno](https://deno.land) لتشغيل الـ Backend

### الخطوات

```bash
# 1. استنسخ المشروع
git clone https://github.com/YOUR_USERNAME/shehab-ai-suite.git
cd shehab-ai-suite

# 2. أضف مفاتيح API
cp .env.example .env
# عدّل .env وأضف مفاتيحك

# 3. شغّل الـ Backend
deno run --allow-net --allow-env functions/geminiProxy.ts

# 4. افتح index.html في المتصفح أو على أي server
```

---

## 🏗️ هيكل المشروع

```
shehab-ai-suite/
├── index.html              # التطبيق الكامل (Single Page App)
├── functions/
│   └── geminiProxy.ts      # Backend API (Deno)
├── .env.example            # مثال على متغيرات البيئة
├── .gitignore
└── README.md
```

---

## ⚙️ متغيرات البيئة

```env
GEMINI_API_KEY=AIza...      # من aistudio.google.com
GROQ_API_KEY=gsk_...        # من console.groq.com
```

---

## 🌐 النشر على Vercel / Netlify

1. ارفع المشروع على GitHub
2. اربطه بـ Vercel أو Netlify
3. أضف متغيرات البيئة في لوحة التحكم
4. انشر! 🎉

---

## 🛠️ التقنيات المستخدمة

- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Deno (TypeScript)
- **AI:** Groq API (Llama 3.3 70B) + Google Gemini API
- **Design:** Mobile-First, RTL Support, Dark Theme

---

## 📄 الرخصة

MIT License — حر الاستخدام والتطوير
